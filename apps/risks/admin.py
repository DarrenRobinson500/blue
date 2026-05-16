from django.contrib import admin
from .models import RiskCategory, MatrixCell, Risk, RiskAssessment, RiskControl, RiskTreatment, RiskHistory


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'owner', 'status', 'velocity', 'assessment_stale', 'updated_at']
    list_filter = ['status', 'category', 'source_type', 'assessment_stale', 'owner']
    search_fields = ['title', 'description']


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ['risk', 'residual_rating', 'within_appetite', 'is_current', 'assessed_by', 'assessed_at']
    list_filter = ['residual_rating', 'within_appetite', 'is_current', 'confidence']
    search_fields = ['risk__title', 'rationale']


@admin.register(RiskTreatment)
class RiskTreatmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'risk', 'owner', 'status', 'due_date']
    list_filter = ['status', 'owner']
    search_fields = ['title', 'description', 'risk__title']


@admin.register(MatrixCell)
class MatrixCellAdmin(admin.ModelAdmin):
    list_display = ['likelihood', 'consequence', 'rating']
    list_filter = ['rating']
    ordering = ['likelihood', 'consequence']


admin.site.register(RiskCategory)
admin.site.register(RiskControl)
admin.site.register(RiskHistory)
