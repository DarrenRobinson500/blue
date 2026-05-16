from rest_framework import serializers
from .models import ObligationSource, Obligation, Control, ObligationControl, ObligationHistory


class ObligationSourceSerializer(serializers.ModelSerializer):
    obligation_count = serializers.SerializerMethodField()

    class Meta:
        model = ObligationSource
        fields = [
            'id', 'name', 'source_type', 'issuing_body', 'reference_url',
            'effective_date', 'superseded_by', 'created_at', 'updated_at',
            'obligation_count',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_obligation_count(self, obj):
        return obj.obligations.count()


class ControlSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Control
        fields = ['id', 'name', 'control_type', 'frequency', 'status', 'owner', 'evidence_description']


class ObligationListSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True)
    control_count = serializers.SerializerMethodField()

    class Meta:
        model = Obligation
        fields = [
            'id', 'source', 'source_name', 'reference', 'verbatim_text',
            'interpretation', 'owner', 'implementation_notes',
            'risk_rating', 'status', 'review_due', 'created_at', 'updated_at',
            'control_count',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_control_count(self, obj):
        return obj.controls.count()


class ObligationDetailSerializer(ObligationListSerializer):
    controls = ControlSummarySerializer(many=True, read_only=True)

    class Meta(ObligationListSerializer.Meta):
        fields = ObligationListSerializer.Meta.fields + ['controls']


class ObligationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Obligation
        fields = [
            'source', 'reference', 'verbatim_text', 'interpretation',
            'owner', 'implementation_notes', 'risk_rating', 'status', 'review_due',
        ]


class ObligationPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Obligation
        fields = [
            'source', 'reference', 'interpretation', 'owner',
            'implementation_notes', 'risk_rating', 'status', 'review_due',
        ]


class ControlDetailSerializer(serializers.ModelSerializer):
    linked_obligations = serializers.SerializerMethodField()

    class Meta:
        model = Control
        fields = [
            'id', 'name', 'description', 'control_type', 'frequency',
            'owner', 'evidence_description', 'status', 'created_at', 'updated_at',
            'linked_obligations',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_linked_obligations(self, obj):
        return obj.obligations.values('id', 'reference', 'source__name', 'risk_rating', 'status')


class ObligationHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.CharField(source='changed_by.email', read_only=True, default=None)

    class Meta:
        model = ObligationHistory
        fields = ['id', 'changed_by', 'changed_by_email', 'changed_at', 'snapshot', 'change_summary']
