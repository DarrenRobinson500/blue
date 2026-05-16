from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import (
    RiskCategory, MatrixCell, Risk, RiskAssessment,
    RiskControl, RiskTreatment, RiskHistory, RATING_ORDER,
)
from .serialisers import (
    RiskCategorySerializer, MatrixCellSerializer,
    RiskListSerializer, RiskDetailSerializer, RiskCreateSerializer, RiskPatchSerializer,
    RiskAssessmentSummarySerializer, RiskAssessmentCreateSerializer,
    RiskControlSerializer, TreatmentSerializer, TreatmentWriteSerializer,
)


def _resolve_rating(likelihood, consequence):
    try:
        return MatrixCell.objects.get(likelihood=likelihood, consequence=consequence).rating
    except MatrixCell.DoesNotExist:
        return 'low'


def _risk_snapshot(risk):
    assessment = risk.assessments.filter(is_current=True).first()
    return {
        'title': risk.title,
        'description': risk.description,
        'category': risk.category_id,
        'source_type': risk.source_type,
        'owner': risk.owner_id,
        'status': risk.status,
        'velocity': risk.velocity,
        'assessment_stale': risk.assessment_stale,
        'notes': risk.notes,
        'residual_rating': assessment.residual_rating if assessment else None,
        'within_appetite': assessment.within_appetite if assessment else None,
        'updated_at': str(risk.updated_at),
    }


def _write_history(risk, user, source, summary):
    RiskHistory.objects.create(
        risk=risk,
        snapshot=_risk_snapshot(risk),
        changed_by=user,
        change_source=source,
        change_summary=summary,
    )


class RiskStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        active_qs = Risk.objects.filter(status='active')
        outside_appetite = Risk.objects.filter(
            status='active',
            assessments__is_current=True,
            assessments__within_appetite=False,
        ).distinct().count()
        stale = active_qs.filter(assessment_stale=True).count()
        overdue_treatments = RiskTreatment.objects.filter(
            risk__status='active',
            status__in=['not_started', 'in_progress'],
            due_date__lt=today,
        ).count()
        return Response({
            'active_risks': active_qs.count(),
            'outside_appetite': outside_appetite,
            'stale_assessments': stale,
            'overdue_treatments': overdue_treatments,
            'draft_risks': Risk.objects.filter(status='draft').count(),
            'closed_risks': Risk.objects.filter(status='closed').count(),
        })


class RiskCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = RiskCategory.objects.all()
        return Response(RiskCategorySerializer(qs, many=True).data)


class RiskCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            obj = RiskCategory.objects.get(pk=pk)
        except RiskCategory.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        allowed = {'appetite', 'appetite_rationale', 'description'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        ser = RiskCategorySerializer(obj, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save(updated_by=request.user)
        return Response(RiskCategorySerializer(obj).data)


class MatrixView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MatrixCellSerializer(MatrixCell.objects.all(), many=True).data)

    def put(self, request):
        cells = request.data.get('cells', [])
        if len(cells) != 25:
            return Response({'error': 'Exactly 25 cells required.'}, status=status.HTTP_400_BAD_REQUEST)

        provided = {(int(c['likelihood']), int(c['consequence'])) for c in cells}
        expected = {(l, c) for l in range(1, 6) for c in range(1, 6)}
        if provided != expected:
            return Response(
                {'error': 'Cells must cover all 25 combinations of likelihood 1–5 and consequence 1–5.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_ratings = {'low', 'medium', 'high', 'critical'}
        for c in cells:
            if c.get('rating') not in valid_ratings:
                return Response(
                    {'error': f"Invalid rating '{c.get('rating')}'. Must be one of: low, medium, high, critical."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        new_map = {(int(c['likelihood']), int(c['consequence'])): c['rating'] for c in cells}

        for (l, c), rating in new_map.items():
            MatrixCell.objects.update_or_create(
                likelihood=l, consequence=c, defaults={'rating': rating}
            )

        stale_count = 0
        active_risks = Risk.objects.filter(status='active').prefetch_related('assessments')
        risks_to_mark = []
        for risk in active_risks:
            current = next((a for a in risk.assessments.all() if a.is_current), None)
            if current:
                new_rating = new_map.get((current.residual_likelihood, current.residual_consequence))
                if new_rating and new_rating != current.residual_rating and not risk.assessment_stale:
                    risks_to_mark.append(risk.id)
                    stale_count += 1

        if risks_to_mark:
            Risk.objects.filter(id__in=risks_to_mark).update(
                assessment_stale=True, last_change_source='system_triggered'
            )

        return Response({
            'cells': MatrixCellSerializer(MatrixCell.objects.all(), many=True).data,
            'risks_marked_stale': stale_count,
        })


class RiskListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Risk.objects.select_related('category', 'owner').prefetch_related(
            'assessments', 'treatments', 'risk_controls'
        )
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        else:
            qs = qs.exclude(status='closed')

        if v := request.query_params.get('category'):
            qs = qs.filter(category_id=v)
        if v := request.query_params.get('owner'):
            qs = qs.filter(owner_id=v)
        if v := request.query_params.get('source_type'):
            qs = qs.filter(source_type=v)
        if v := request.query_params.get('within_appetite'):
            within = v == 'true'
            qs = qs.filter(
                assessments__is_current=True, assessments__within_appetite=within
            ).distinct()

        return Response(RiskListSerializer(qs, many=True).data)

    def post(self, request):
        ser = RiskCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obligations = ser.validated_data.pop('linked_obligations', [])
        risk = ser.save(created_by=request.user, status=Risk.Status.DRAFT)
        if obligations:
            risk.linked_obligations.set(obligations)
        return Response(RiskDetailSerializer(risk).data, status=status.HTTP_201_CREATED)


class RiskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Risk.objects.select_related('category', 'owner').prefetch_related(
                'assessments', 'treatments__owner', 'risk_controls__control', 'linked_obligations'
            ).get(pk=pk)
        except Risk.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(RiskDetailSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        _write_history(obj, request.user, 'manual', request.data.get('change_summary', 'Risk updated'))
        ser = RiskPatchSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obligations = ser.validated_data.pop('linked_obligations', None)
        risk = ser.save(updated_by=request.user)
        if obligations is not None:
            risk.linked_obligations.set(obligations)
        return Response(RiskDetailSerializer(self._get(pk)).data)


class RiskActivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            risk = Risk.objects.get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not risk.assessments.filter(is_current=True).exists():
            return Response(
                {'error': 'Risk must have at least one assessment before it can be activated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if risk.status != Risk.Status.DRAFT:
            return Response(
                {'error': f'Only draft risks can be activated. Current status: {risk.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _write_history(risk, request.user, 'manual', 'Risk activated')
        risk.status = Risk.Status.ACTIVE
        risk.updated_by = request.user
        risk.save(update_fields=['status', 'updated_by'])
        return Response(RiskListSerializer(risk).data)


class RiskCloseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            risk = Risk.objects.prefetch_related('assessments').get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        closure_notes = request.data.get('closure_notes', '')
        _write_history(risk, request.user, 'manual', f'Risk closed. {closure_notes}'.strip())
        risk.status = Risk.Status.CLOSED
        risk.notes = (risk.notes + f'\n\nClosure notes: {closure_notes}').strip() if closure_notes else risk.notes
        risk.updated_by = request.user
        risk.save(update_fields=['status', 'notes', 'updated_by'])
        return Response(RiskListSerializer(risk).data)


class RiskAssessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            risk = Risk.objects.select_related('category').prefetch_related('assessments').get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        ser = RiskAssessmentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        _write_history(risk, request.user, 'manual', 'New risk assessment submitted')

        inherent_rating = _resolve_rating(data['inherent_likelihood'], data['inherent_consequence'])
        residual_rating = _resolve_rating(data['residual_likelihood'], data['residual_consequence'])
        target_rating = _resolve_rating(data['target_likelihood'], data['target_consequence'])

        within_appetite = (
            RATING_ORDER.get(residual_rating, 99) <= RATING_ORDER.get(risk.category.appetite, 0)
        )

        matrix_version_note = ''
        if risk.assessment_stale:
            matrix_version_note = (
                'This risk was flagged for reassessment because linked controls or the rating matrix '
                'had changed since the previous assessment was recorded.'
            )

        risk.assessments.filter(is_current=True).update(is_current=False)

        assessment = RiskAssessment.objects.create(
            risk=risk,
            inherent_likelihood=data['inherent_likelihood'],
            inherent_consequence=data['inherent_consequence'],
            inherent_rating=inherent_rating,
            residual_likelihood=data['residual_likelihood'],
            residual_consequence=data['residual_consequence'],
            residual_rating=residual_rating,
            target_likelihood=data['target_likelihood'],
            target_consequence=data['target_consequence'],
            target_rating=target_rating,
            within_appetite=within_appetite,
            confidence=data['confidence'],
            rationale=data['rationale'],
            assessed_by=request.user,
            is_current=True,
            matrix_version_note=matrix_version_note,
        )

        risk.assessment_stale = False
        risk.updated_by = request.user
        risk.save(update_fields=['assessment_stale', 'updated_by'])

        return Response(RiskAssessmentSummarySerializer(assessment).data, status=status.HTTP_201_CREATED)


class RiskAssessmentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            Risk.objects.get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        assessments = RiskAssessment.objects.filter(risk_id=pk).order_by('-assessed_at')
        return Response(RiskAssessmentSummarySerializer(assessments, many=True).data)


class RiskControlsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            Risk.objects.get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        controls = RiskControl.objects.filter(risk_id=pk).select_related('control', 'added_by')
        return Response(RiskControlSerializer(controls, many=True).data)


class RiskLinkControlView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            risk = Risk.objects.get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        control_id = request.data.get('control_id')
        control_role = request.data.get('control_role')
        effectiveness = request.data.get('effectiveness')
        if not all([control_id, control_role, effectiveness]):
            return Response(
                {'error': 'control_id, control_role, and effectiveness are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.risk.models import Control
        try:
            control = Control.objects.get(pk=control_id)
        except Control.DoesNotExist:
            return Response({'error': 'Control not found.'}, status=status.HTTP_400_BAD_REQUEST)
        rc, created = RiskControl.objects.get_or_create(
            risk=risk,
            control=control,
            defaults={
                'control_role': control_role,
                'effectiveness': effectiveness,
                'linkage_notes': request.data.get('linkage_notes', ''),
                'added_by': request.user,
            },
        )
        if not created:
            return Response(
                {'error': 'This control is already linked to this risk.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(RiskControlSerializer(rc).data, status=status.HTTP_201_CREATED)


class RiskUnlinkControlView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        control_id = request.data.get('control_id')
        deleted, _ = RiskControl.objects.filter(risk_id=pk, control_id=control_id).delete()
        if not deleted:
            return Response({'error': 'Link not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RiskTreatmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            Risk.objects.get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        treatments = RiskTreatment.objects.filter(risk_id=pk).select_related(
            'owner', 'linked_control', 'risk__category'
        ).prefetch_related('risk__assessments')
        return Response(TreatmentSerializer(treatments, many=True).data)

    def post(self, request, pk):
        try:
            risk = Risk.objects.get(pk=pk)
        except Risk.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        ser = TreatmentWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        treatment = ser.save(risk=risk, updated_by=request.user)
        t = RiskTreatment.objects.select_related(
            'owner', 'linked_control', 'risk__category'
        ).prefetch_related('risk__assessments').get(pk=treatment.pk)
        return Response(TreatmentSerializer(t).data, status=status.HTTP_201_CREATED)


class TreatmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            treatment = RiskTreatment.objects.select_related(
                'owner', 'linked_control', 'risk__category'
            ).prefetch_related('risk__assessments').get(pk=pk)
        except RiskTreatment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        ser = TreatmentWriteSerializer(treatment, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        t = ser.save(updated_by=request.user)
        t_full = RiskTreatment.objects.select_related(
            'owner', 'linked_control', 'risk__category'
        ).prefetch_related('risk__assessments').get(pk=t.pk)
        return Response(TreatmentSerializer(t_full).data)


class ControlsForLinkView(APIView):
    """Return all controls from the obligations app for use in dropdowns."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.risk.models import Control
        from apps.risk.serialisers import ControlSummarySerializer
        controls = Control.objects.all()
        return Response(ControlSummarySerializer(controls, many=True).data)


class ObligationsForLinkView(APIView):
    """Return all active obligations for use in dropdowns."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.risk.models import Obligation
        qs = Obligation.objects.filter(status='active').values(
            'id', 'reference', 'source__name', 'risk_rating', 'status'
        )
        return Response(list(qs))
