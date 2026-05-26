from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
import uuid

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    last_sync = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class OrganizationMember(models.Model):
    """Links users to organizations for tenant isolation."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='membership')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=50, default='ANALYST')

    def __str__(self):
        return f"{self.user.username} @ {self.organization.name}"

class TenantManager(models.Manager):
    """Custom manager for automatic tenant filtering."""
    def for_user(self, user):
        if user.is_superuser:
            return self.get_queryset()
        try:
            return self.get_queryset().filter(organization=user.membership.organization)
        except (AttributeError, ObjectDoesNotExist):
            return self.get_queryset().none()

class IngestionRecord(models.Model):
    SOURCE_CHOICES = [
        ('SAP', 'SAP ERP'),
        ('UTILITY', 'Utility Portal'),
        ('TRAVEL', 'Corporate Travel'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    
    # Audit Traceability
    file = models.FileField(upload_to='ingestions/%Y/%m/%d/', null=True, blank=True)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    raw_json_summary = models.JSONField(default=dict, blank=True, help_text="Extracted data summary for preview.")
    
    # Core fields requested
    raw_payload = models.JSONField(default=list, blank=True, help_text="Raw payload from upload or paste")
    is_demo = models.BooleanField(default=False)
    
    # Ingestion Status
    status = models.CharField(max_length=20, default='PENDING', choices=[
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    ])
    error_log = models.TextField(blank=True, null=True)
    
    ingested_at = models.DateTimeField(auto_now_add=True)
    ingested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    objects = TenantManager()

    def __str__(self):
        return f"{self.source_type} Ingestion - {self.ingested_at.date()} ({self.status})"

class NormalizedRecord(models.Model):
    CATEGORY_CHOICES = [
        ('FUEL', 'Fuel/Procurement'),
        ('ELECTRICITY', 'Electricity'),
        ('TRAVEL', 'Business Travel'),
    ]
    SCOPE_CHOICES = [
        ('SCOPE_1', 'Scope 1'),
        ('SCOPE_2', 'Scope 2'),
        ('SCOPE_3', 'Scope 3'),
    ]
    REVIEW_STATUS = [
        ('PENDING', 'Pending Review'),
        ('FLAGGED', 'Flagged'),
        ('FAILED', 'Failed'),
        ('APPROVED', 'Approved'),
        ('LOCKED', 'Locked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ingestion_record = models.ForeignKey(IngestionRecord, on_delete=models.CASCADE, related_name='normalized_rows')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    
    # Metadata
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    activity_type = models.CharField(max_length=100, blank=True, default='')
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    activity_date = models.DateField()
    
    # Values (Existing vs Requested Mapping)
    original_value = models.DecimalField(max_digits=20, decimal_places=4)
    original_unit = models.CharField(max_length=50)
    
    raw_value = models.DecimalField(max_digits=20, decimal_places=4, default=0)
    normalized_value = models.DecimalField(max_digits=20, decimal_places=4, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    
    # Normalization results
    normalized_value_kgco2e = models.DecimalField(max_digits=20, decimal_places=4)
    conversion_factor = models.DecimalField(max_digits=10, decimal_places=6)
    
    kg_co2e = models.DecimalField(max_digits=20, decimal_places=4, default=0)
    emission_factor = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    
    # Analyst Review
    status = models.CharField(max_length=10, choices=REVIEW_STATUS, default='PENDING')
    flags = models.JSONField(default=list, blank=True)
    suspicious_reason = models.TextField(blank=True, null=True)
    analyst_notes = models.TextField(blank=True, null=True)
    
    # Review details
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_records')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_records')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Lock indicators
    is_locked = models.BooleanField(default=False)
    locked = models.BooleanField(default=False)
    
    # Demo flag
    is_demo = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = TenantManager()

    def save(self, *args, **kwargs):
        # Synchronize requested names and legacy names for 100% safety
        if self.original_value is not None:
            self.raw_value = self.original_value
        else:
            self.original_value = self.raw_value

        if self.original_unit:
            self.unit = self.original_unit
        else:
            self.original_unit = self.unit

        if self.conversion_factor is not None:
            self.emission_factor = self.conversion_factor
        else:
            self.conversion_factor = self.emission_factor

        if self.normalized_value_kgco2e is not None:
            self.kg_co2e = self.normalized_value_kgco2e
        else:
            self.normalized_value_kgco2e = self.kg_co2e

        if self.is_locked:
            self.locked = True
        else:
            self.is_locked = self.locked

        if self.status == 'APPROVED':
            if not self.approved_at:
                import django.utils.timezone
                self.approved_at = django.utils.timezone.now()
            if not self.reviewed_at:
                self.reviewed_at = self.approved_at

        if self.approved_by:
            self.reviewed_by = self.approved_by
        elif self.reviewed_by:
            self.approved_by = self.reviewed_by

        if self.approved_at:
            self.reviewed_at = self.approved_at
        elif self.reviewed_at:
            self.approved_at = self.reviewed_at

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.activity_type or self.category} Record ({self.status}) - {self.kg_co2e} kgCO2e"

class AuditLog(models.Model):
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50) # e.g. APPROVE, FLAG, REJECT, EDIT, LOCK, DELETE
    previous_state = models.JSONField(null=True)
    new_state = models.JSONField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True)
    
    objects = TenantManager()

    def __str__(self):
        return f"{self.action} on Record {self.record_id} by {self.user.username if self.user else 'System'}"
