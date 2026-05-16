from datetime import date
from rest_framework import serializers
from .models import RiskCategory, MatrixCell, Risk, RiskAssessment, RiskControl, RiskTreatment, RiskHistory, RATING_ORDER


class MatrixCellSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatrixCell
        fields = ['id', 'likelihood', 'consequence', 'rating']


class RiskCategorySerializer(serializers.ModelSerializer):
    active_risk_count = serializers.SerializerMethodField()
    outside_appetite_count = serializers.SerializerMethodField()

    class Meta:
        model = RiskCategory
        fields = [
            'id', 'name', 'description', 'appetite', 'appetite_rationale',
            'updated_at', 'active_risk_count', 'outside_appetite_count',
        ]
        read_only_fields = ['updated_at']

    def get_active_risk_count(self, obj):
        return obj.risks.filter(status='active').count()

    def get_outside_appetite_count(self, obj):
        return obj.risks.filter(
            status='active',
            assessments__is_current=True,
            assessments__within_appetite=False,
        ).distinct().count()


class RiskAssessmentSummarySerializer(serializers.ModelSerializer):
    assessed_by_email = serializers.CharField(source='assessed_by.email', read_only=True)

    class Meta:
        model = RiskAssessment
        fields = [
            'id',
            'inherent_likelihood', 'inherent_consequence', 'inherent_rating',
            'residual_likelihood', 'residual_consequence', 'residual_rating',
            'target_likelihood', 'target_consequence', 'target_rating',
            'within_appetite', 'confidence', 'rationale',
            'assessed_by', 'assessed_by_email', 'assessed_at', 'is_current', 'matrix_version_note',
        ]


class RiskAssessmentCreateSerializer(serializers.Serializer):
    inherent_likelihood = serializers.IntegerField(min_value=1, max_value=5)
    inherent_consequence = serializers.IntegerField(min_value=1, max_value=5)
    residual_likelihood = serializers.IntegerField(min_value=1, max_value=5)
    residual_consequence = serializers.IntegerField(min_value=1, max_value=5)
    target_likelihood = serializers.IntegerField(min_value=1, max_value=5)
    target_consequence = serializers.IntegerField(min_value=1, max_value=5)
    confidence = serializers.ChoiceField(choices=['high', 'medium', 'low'])
    rationale = serializers.CharField(min_length=50)


def _computed_status(obj):
    if obj.status in ('not_started', 'in_progress') and obj.due_date and obj.due_date < date.today():
        return 'overdue'
    return obj.status


class TreatmentSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source='owner.email', read_only=True, default=None)
    status = serializers.SerializerMethodField()
    risk_title = serializers.CharField(source='risk.title', read_only=True)
    risk_category = serializers.CharField(source='risk.category.name', read_only=True)
    residual_rating = serializers.SerializerMethodField()

    class Meta:
        model = RiskTreatment
        fields = [
            'id', 'risk', 'risk_title', 'risk_category',
            'title', 'description', 'owner', 'owner_email', 'due_date',
            'status', 'expected_residual_rating', 'linked_control',
            'completion_notes', 'created_at', 'updated_at', 'residual_rating',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_status(self, obj):
        return _computed_status(obj)

    def get_residual_rating(self, obj):
        assessment = obj.risk.assessments.filter(is_current=True).first()
        return assessment.residual_rating if assessment else None


class TreatmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskTreatment
        fields = [
            'title', 'description', 'owner', 'due_date',
            'status', 'expected_residual_rating', 'linked_control', 'completion_notes',
        ]


class RiskControlSerializer(serializers.ModelSerializer):
    control_name = serializers.CharField(source='control.name', read_only=True)
    control_type = serializers.CharField(source='control.control_type', read_only=True)
    control_status = serializers.CharField(source='control.status', read_only=True)
    control_description = serializers.CharField(source='control.description', read_only=True)
    added_by_email = serializers.CharField(source='added_by.email', read_only=True, default=None)

    class Meta:
        model = RiskControl
        fields = [
            'id', 'risk', 'control', 'control_name', 'control_type',
            'control_status', 'control_description',
            'control_role', 'effectiveness', 'linkage_notes',
            'added_by', 'added_by_email', 'added_at',
        ]
        read_only_fields = ['added_at', 'added_by', 'added_by_email']


class RiskListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_appetite = serializers.CharField(source='category.appetite', read_only=True)
    owner_name = serializers.CharField(source='owner.name', read_only=True, default=None)
    project_name = serializers.CharField(source='project.name', read_only=True, default=None)
    current_assessment = serializers.SerializerMethodField()
    treatment_count = serializers.SerializerMethodField()
    overdue_treatment_count = serializers.SerializerMethodField()
    control_count = serializers.SerializerMethodField()

    class Meta:
        model = Risk
        fields = [
            'id', 'title', 'description', 'category', 'category_name', 'category_appetite',
            'risk_type', 'project', 'project_name',
            'source_type', 'owner', 'owner_name', 'status', 'velocity',
            'assessment_stale', 'notes', 'created_at', 'updated_at', 'last_change_source',
            'current_assessment', 'treatment_count', 'overdue_treatment_count', 'control_count',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_current_assessment(self, obj):
        assessment = obj.assessments.filter(is_current=True).first()
        if assessment:
            return RiskAssessmentSummarySerializer(assessment).data
        return None

    def get_treatment_count(self, obj):
        return obj.treatments.count()

    def get_overdue_treatment_count(self, obj):
        today = date.today()
        return obj.treatments.filter(
            status__in=['not_started', 'in_progress'],
            due_date__lt=today,
        ).count()

    def get_control_count(self, obj):
        return obj.risk_controls.count()


class RiskDetailSerializer(RiskListSerializer):
    linked_obligations = serializers.SerializerMethodField()
    controls = serializers.SerializerMethodField()
    treatments = serializers.SerializerMethodField()

    class Meta(RiskListSerializer.Meta):
        fields = RiskListSerializer.Meta.fields + ['linked_obligations', 'controls', 'treatments']

    def get_linked_obligations(self, obj):
        return list(obj.linked_obligations.values('id', 'reference', 'source__name', 'risk_rating', 'status'))

    def get_controls(self, obj):
        return RiskControlSerializer(
            obj.risk_controls.select_related('control', 'added_by'), many=True
        ).data

    def get_treatments(self, obj):
        return TreatmentSerializer(
            obj.treatments.select_related('owner', 'linked_control', 'risk__category'),
            many=True,
        ).data


def _obligation_queryset():
    from apps.risk.models import Obligation
    return Obligation.objects.all()


def _project_queryset():
    from apps.project.models import Project
    return Project.objects.all()


_REQUIRES_PROJECT = ('execution', 'delivered')


class RiskCreateSerializer(serializers.ModelSerializer):
    linked_obligations = serializers.PrimaryKeyRelatedField(
        many=True, queryset=_obligation_queryset(), required=False,
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=_project_queryset(), allow_null=True, required=False,
    )

    class Meta:
        model = Risk
        fields = [
            'title', 'description', 'category', 'source_type', 'owner',
            'risk_type', 'project', 'velocity', 'linked_obligations', 'notes',
        ]

    def validate(self, data):
        risk_type = data.get('risk_type', 'bau')
        project = data.get('project')
        if risk_type in _REQUIRES_PROJECT and project is None:
            raise serializers.ValidationError(
                {'project': 'A project must be linked for Execution and Delivered risks.'}
            )
        return data


class RiskPatchSerializer(serializers.ModelSerializer):
    linked_obligations = serializers.PrimaryKeyRelatedField(
        many=True, queryset=_obligation_queryset(), required=False,
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=_project_queryset(), allow_null=True, required=False,
    )

    class Meta:
        model = Risk
        fields = [
            'title', 'description', 'category', 'source_type', 'owner',
            'risk_type', 'project', 'velocity', 'status', 'linked_obligations', 'notes',
        ]

    def validate(self, data):
        risk_type = data.get('risk_type') or (self.instance.risk_type if self.instance else 'bau')
        if 'project' in data:
            project = data['project']
        else:
            project = self.instance.project if self.instance else None
        if risk_type in _REQUIRES_PROJECT and project is None:
            raise serializers.ValidationError(
                {'project': 'A project must be linked for Execution and Delivered risks.'}
            )
        return data
