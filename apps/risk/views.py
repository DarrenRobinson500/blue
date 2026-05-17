from datetime import date, timedelta
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import ObligationSource, Obligation, Control, ObligationControl, ObligationHistory
from .serialisers import (
    ObligationSourceSerializer,
    ObligationListSerializer,
    ObligationDetailSerializer,
    ObligationCreateSerializer,
    ObligationPatchSerializer,
    ControlDetailSerializer,
    ObligationHistorySerializer,
)


def _obligation_snapshot(obligation):
    return {
        'id': obligation.id,
        'source_id': obligation.source_id,
        'reference': obligation.reference,
        'verbatim_text': obligation.verbatim_text,
        'interpretation': obligation.interpretation,
        'owner': obligation.owner,
        'implementation_notes': obligation.implementation_notes,
        'risk_rating': obligation.risk_rating,
        'status': obligation.status,
        'review_due': str(obligation.review_due) if obligation.review_due else None,
        'updated_at': obligation.updated_at.isoformat(),
    }


class StatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        threshold = today + timedelta(days=30)
        due_for_review = Obligation.objects.filter(
            status='active',
        ).filter(
            Q(review_due__lte=threshold) | Q(review_due__isnull=False, review_due__lt=today)
        ).count()
        # Simpler: just due <= threshold (covers overdue + within 30 days)
        due_for_review = Obligation.objects.filter(
            status='active',
            review_due__isnull=False,
            review_due__lte=threshold,
        ).count()

        total = Obligation.objects.count()
        critical_high = Obligation.objects.filter(risk_rating__in=['critical', 'high']).count()
        controls_mapped = Obligation.objects.filter(controls__isnull=False).distinct().count()
        controls_operating = Control.objects.filter(status='operating').count()

        return Response({
            'total_obligations': total,
            'critical_and_high': critical_high,
            'controls_mapped': controls_mapped,
            'controls_operating': controls_operating,
            'due_for_review': due_for_review,
        })


class ObligationSourceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ObligationSource.objects.all()
        return Response(ObligationSourceSerializer(qs, many=True).data)

    def post(self, request):
        ser = ObligationSourceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class ObligationSourceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return ObligationSource.objects.get(pk=pk)
        except ObligationSource.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ObligationSourceSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        ser = ObligationSourceSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class ObligationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Obligation.objects.select_related('source').prefetch_related('controls')
        source = request.query_params.get('source')
        owner = request.query_params.get('owner')
        risk_rating = request.query_params.get('risk_rating')
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        if source:
            qs = qs.filter(source_id=source)
        if owner:
            qs = qs.filter(owner__iexact=owner)
        if risk_rating:
            qs = qs.filter(risk_rating=risk_rating)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(reference__icontains=search) |
                Q(verbatim_text__icontains=search) |
                Q(interpretation__icontains=search) |
                Q(owner__icontains=search)
            )
        return Response(ObligationListSerializer(qs, many=True).data)

    def post(self, request):
        ser = ObligationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obligation = ser.save()
        return Response(ObligationDetailSerializer(obligation).data, status=status.HTTP_201_CREATED)


class ObligationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Obligation.objects.select_related('source').prefetch_related('controls').get(pk=pk)
        except Obligation.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ObligationDetailSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)

        snapshot = _obligation_snapshot(obj)
        patched_fields = [k for k in request.data if k in ObligationPatchSerializer.Meta.fields]
        change_summary = request.data.pop('change_summary', '') or f'Updated: {", ".join(patched_fields)}'

        ObligationHistory.objects.create(
            obligation=obj,
            changed_by=request.user,
            snapshot=snapshot,
            change_summary=change_summary,
        )

        ser = ObligationPatchSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()

        obj.refresh_from_db()
        return Response(ObligationDetailSerializer(obj).data)


class ObligationHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            obligation = Obligation.objects.get(pk=pk)
        except Obligation.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        history = obligation.history.select_related('changed_by').all()
        return Response(ObligationHistorySerializer(history, many=True).data)


class ControlListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Control.objects.prefetch_related('obligations')
        return Response(ControlDetailSerializer(qs, many=True).data)

    def post(self, request):
        ser = ControlDetailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        control = ser.save()
        return Response(ControlDetailSerializer(control).data, status=status.HTTP_201_CREATED)


class ControlDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Control.objects.prefetch_related('obligations').get(pk=pk)
        except Control.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ControlDetailSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        ser = ControlDetailSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ControlDetailSerializer(obj).data)


class ObligationControlLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            obligation = Obligation.objects.get(pk=pk)
        except Obligation.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        control_id = request.data.get('control_id')
        if not control_id:
            return Response({'error': 'control_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            control = Control.objects.get(pk=control_id)
        except Control.DoesNotExist:
            return Response({'error': 'Control not found'}, status=status.HTTP_404_NOT_FOUND)
        _, created = ObligationControl.objects.get_or_create(
            obligation=obligation, control=control,
            defaults={'linked_by': request.user},
        )
        return Response({'linked': True, 'created': created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ObligationControlUnlinkView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, control_id):
        deleted, _ = ObligationControl.objects.filter(
            obligation_id=pk, control_id=control_id
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
