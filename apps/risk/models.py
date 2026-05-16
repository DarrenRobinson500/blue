from django.db import models
from django.conf import settings


class ObligationSource(models.Model):
    class SourceType(models.TextChoices):
        LEGISLATION = 'legislation', 'Legislation'
        PRUDENTIAL_STANDARD = 'prudential_standard', 'Prudential Standard'
        ASIC_INSTRUMENT = 'asic_instrument', 'ASIC Instrument'
        LIFE_CODE = 'life_code', 'Life Code of Practice'
        INTERNAL_POLICY = 'internal_policy', 'Internal Policy'

    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=30, choices=SourceType.choices)
    issuing_body = models.CharField(max_length=255)
    reference_url = models.URLField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    superseded_by = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='supersedes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_obligation_source'
        ordering = ['name']

    def __str__(self):
        return self.name


class Obligation(models.Model):
    class RiskRating(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        UNDER_REVIEW = 'under_review', 'Under Review'
        NOT_APPLICABLE = 'not_applicable', 'Not Applicable'
        SUPERSEDED = 'superseded', 'Superseded'

    class ChangeSource(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        AUTOMATED_FEED = 'automated_feed', 'Automated Feed'
        PENDING_REVIEW = 'pending_review', 'Pending Review'

    source = models.ForeignKey(ObligationSource, on_delete=models.PROTECT, related_name='obligations')
    reference = models.CharField(max_length=100)
    verbatim_text = models.TextField()
    interpretation = models.TextField()
    owner = models.CharField(max_length=255, null=True, blank=True)
    implementation_notes = models.TextField(blank=True)
    risk_rating = models.CharField(max_length=20, choices=RiskRating.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    review_due = models.DateField(null=True, blank=True)
    last_change_source = models.CharField(
        max_length=20, choices=ChangeSource.choices, default=ChangeSource.MANUAL
    )
    pending_update = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_obligation'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference} — {self.source.name}'


class Control(models.Model):
    class ControlType(models.TextChoices):
        PREVENTIVE = 'preventive', 'Preventive'
        DETECTIVE = 'detective', 'Detective'
        CORRECTIVE = 'corrective', 'Corrective'

    class Frequency(models.TextChoices):
        CONTINUOUS = 'continuous', 'Continuous'
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        ANNUAL = 'annual', 'Annual'
        AD_HOC = 'ad_hoc', 'Ad Hoc'

    class Status(models.TextChoices):
        OPERATING = 'operating', 'Operating'
        NOT_OPERATING = 'not_operating', 'Not Operating'
        NOT_TESTED = 'not_tested', 'Not Tested'
        RETIRED = 'retired', 'Retired'

    name = models.CharField(max_length=255)
    description = models.TextField()
    control_type = models.CharField(max_length=20, choices=ControlType.choices)
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    owner = models.CharField(max_length=255, null=True, blank=True)
    evidence_description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPERATING)
    obligations = models.ManyToManyField(Obligation, through='ObligationControl', related_name='controls')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_control'
        ordering = ['name']

    def __str__(self):
        return self.name


class ObligationControl(models.Model):
    obligation = models.ForeignKey(Obligation, on_delete=models.CASCADE, related_name='obligation_controls')
    control = models.ForeignKey(Control, on_delete=models.CASCADE, related_name='obligation_controls')
    linked_at = models.DateTimeField(auto_now_add=True)
    linked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = 'risk_obligation_control'
        unique_together = [('obligation', 'control')]

    def __str__(self):
        return f'{self.obligation.reference} ↔ {self.control.name}'


class ObligationHistory(models.Model):
    obligation = models.ForeignKey(Obligation, on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    snapshot = models.JSONField()
    change_summary = models.TextField(blank=True)

    class Meta:
        db_table = 'risk_obligation_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f'History for {self.obligation.reference} at {self.changed_at}'
