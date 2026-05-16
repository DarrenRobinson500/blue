from django.db import models
from django.conf import settings

RATING_ORDER = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}


class RiskCategory(models.Model):
    class Appetite(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    appetite = models.CharField(max_length=20, choices=Appetite.choices)
    appetite_rationale = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='risk_categories_updated'
    )

    class Meta:
        db_table = 'risks_category'
        ordering = ['name']

    def __str__(self):
        return self.name


class MatrixCell(models.Model):
    class Rating(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    likelihood = models.IntegerField()
    consequence = models.IntegerField()
    rating = models.CharField(max_length=10, choices=Rating.choices)

    class Meta:
        db_table = 'risks_matrix_cell'
        unique_together = [('likelihood', 'consequence')]
        ordering = ['likelihood', 'consequence']

    def __str__(self):
        return f'L{self.likelihood}×C{self.consequence} → {self.rating}'


class Risk(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        CLOSED = 'closed', 'Closed'

    class SourceType(models.TextChoices):
        REGULATORY = 'regulatory', 'Regulatory'
        OPERATIONAL = 'operational', 'Operational'
        STRATEGIC = 'strategic', 'Strategic'
        FINANCIAL = 'financial', 'Financial'
        EMERGING = 'emerging', 'Emerging'

    class Velocity(models.TextChoices):
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    class ChangeSource(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        SYSTEM_TRIGGERED = 'system_triggered', 'System Triggered'

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(RiskCategory, on_delete=models.PROTECT, related_name='risks')
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='owned_risks'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    velocity = models.CharField(max_length=10, choices=Velocity.choices, default=Velocity.MEDIUM)
    linked_obligations = models.ManyToManyField('risk.Obligation', blank=True, related_name='linked_risks')
    assessment_stale = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='risks_created'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='risks_updated'
    )
    last_change_source = models.CharField(
        max_length=20, choices=ChangeSource.choices, default=ChangeSource.MANUAL
    )

    class Meta:
        db_table = 'risks_risk'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class RiskAssessment(models.Model):
    class Confidence(models.TextChoices):
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name='assessments')
    inherent_likelihood = models.IntegerField()
    inherent_consequence = models.IntegerField()
    inherent_rating = models.CharField(max_length=10)
    residual_likelihood = models.IntegerField()
    residual_consequence = models.IntegerField()
    residual_rating = models.CharField(max_length=10)
    target_likelihood = models.IntegerField()
    target_consequence = models.IntegerField()
    target_rating = models.CharField(max_length=10)
    within_appetite = models.BooleanField()
    confidence = models.CharField(max_length=10, choices=Confidence.choices)
    rationale = models.TextField()
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='assessments_made'
    )
    assessed_at = models.DateTimeField(auto_now_add=True)
    is_current = models.BooleanField(default=True)
    matrix_version_note = models.TextField(blank=True)

    class Meta:
        db_table = 'risks_assessment'
        ordering = ['-assessed_at']

    def __str__(self):
        return f'Assessment for {self.risk.title}'


class RiskControl(models.Model):
    class ControlRole(models.TextChoices):
        PREVENTIVE = 'preventive', 'Preventive'
        DETECTIVE = 'detective', 'Detective'
        CORRECTIVE = 'corrective', 'Corrective'

    class Effectiveness(models.TextChoices):
        STRONG = 'strong', 'Strong'
        ADEQUATE = 'adequate', 'Adequate'
        WEAK = 'weak', 'Weak'
        UNTESTED = 'untested', 'Untested'

    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name='risk_controls')
    control = models.ForeignKey('risk.Control', on_delete=models.CASCADE, related_name='risk_controls')
    control_role = models.CharField(max_length=20, choices=ControlRole.choices)
    effectiveness = models.CharField(max_length=20, choices=Effectiveness.choices)
    linkage_notes = models.TextField(blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='risk_controls_added'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'risks_risk_control'
        unique_together = [('risk', 'control')]

    def __str__(self):
        return f'{self.risk.title} ↔ {self.control.name}'


class RiskTreatment(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = 'not_started', 'Not Started'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETE = 'complete', 'Complete'
        # overdue is computed, not stored

    class Rating(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name='treatments')
    title = models.CharField(max_length=200)
    description = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='owned_treatments'
    )
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    expected_residual_rating = models.CharField(max_length=10, choices=Rating.choices)
    linked_control = models.ForeignKey(
        'risk.Control', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='treatment_links'
    )
    completion_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='treatments_updated'
    )

    class Meta:
        db_table = 'risks_treatment'
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return self.title


class RiskHistory(models.Model):
    class ChangeSource(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        SYSTEM_TRIGGERED = 'system_triggered', 'System Triggered'

    risk = models.ForeignKey(Risk, on_delete=models.PROTECT, related_name='history')
    snapshot = models.JSONField()
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='risk_history_entries'
    )
    change_source = models.CharField(max_length=20, choices=ChangeSource.choices)
    change_summary = models.TextField(blank=True)

    class Meta:
        db_table = 'risks_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f'History for {self.risk.title} at {self.changed_at}'
