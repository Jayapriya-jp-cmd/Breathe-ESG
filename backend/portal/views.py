from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from data_engine.models import NormalizedRecord, Organization, IngestionRecord, AuditLog, OrganizationMember
from .serializers import NormalizedRecordSerializer, OrganizationSerializer
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
import json

class TenantPermission(permissions.BasePermission):
    """
    Ensure the user is part of the organization they are trying to access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'membership')

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        return obj.organization == request.user.membership.organization

class EnvironmentalDataViewSet(viewsets.ModelViewSet):
    serializer_class = NormalizedRecordSerializer
    permission_classes = [permissions.IsAuthenticated, TenantPermission]

    def get_queryset(self):
        return NormalizedRecord.objects.for_user(self.request.user).order_by('-activity_date')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.membership.organization)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.is_locked or instance.locked:
            raise serializers.ValidationError("Locked records cannot be edited.")
        
        # Save change
        old_status = instance.status
        old_notes = instance.analyst_notes
        old_value = str(instance.original_value)

        record = serializer.save()

        # Log action
        AuditLog.objects.create(
            record=record,
            user=self.request.user,
            organization=record.organization,
            action='EDIT',
            previous_state={
                'status': old_status,
                'analyst_notes': old_notes,
                'raw_value': old_value
            },
            new_state={
                'status': record.status,
                'analyst_notes': record.analyst_notes,
                'raw_value': str(record.original_value)
            },
            comments="Record modified by analyst."
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_locked or instance.locked:
            return Response({'error': 'Locked records cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create an audit entry for audit trails if necessary (usually cascade deletes)
        # We can just allow deletion of unlocked ones
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        record = self.get_object()
        if record.is_locked or record.locked:
            return Response({'error': 'Record is locked for audit.'}, status=status.HTTP_400_BAD_REQUEST)
            
        old_status = record.status
        record.status = 'APPROVED'
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.reviewed_by = request.user
        record.reviewed_at = record.approved_at
        
        notes = request.data.get('notes')
        if notes:
            record.analyst_notes = notes
            
        record.save()
        
        AuditLog.objects.create(
            record=record,
            user=request.user,
            organization=record.organization,
            action='APPROVE',
            previous_state={'status': old_status},
            new_state={'status': 'APPROVED', 'analyst_notes': record.analyst_notes},
            comments="Record approved by analyst."
        )
        
        return Response({
            'status': 'success',
            'message': 'Record successfully approved.',
            'record_id': record.id
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        record = self.get_object()
        if record.is_locked or record.locked:
            return Response({'error': 'Record is locked for audit.'}, status=status.HTTP_400_BAD_REQUEST)
            
        old_status = record.status
        record.status = 'FAILED'
        
        notes = request.data.get('notes')
        if notes:
            record.analyst_notes = notes
            
        record.save()
        
        AuditLog.objects.create(
            record=record,
            user=request.user,
            organization=record.organization,
            action='REJECT',
            previous_state={'status': old_status},
            new_state={'status': 'FAILED', 'analyst_notes': record.analyst_notes},
            comments="Record rejected by analyst."
        )
        
        return Response({
            'status': 'success',
            'message': 'Record successfully rejected.',
            'record_id': record.id
        })

    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        record = self.get_object()
        if record.is_locked or record.locked:
            return Response({'error': 'Record is locked for audit.'}, status=status.HTTP_400_BAD_REQUEST)
            
        old_status = record.status
        reason = request.data.get('reason') or request.data.get('notes') or "Flagged by analyst"
        
        record.status = 'FLAGGED'
        record.suspicious_reason = reason
        
        notes = request.data.get('notes')
        if notes:
            record.analyst_notes = notes
            
        record.save()
        
        AuditLog.objects.create(
            record=record,
            user=request.user,
            organization=record.organization,
            action='FLAG',
            previous_state={'status': old_status, 'suspicious_reason': record.suspicious_reason},
            new_state={'status': 'FLAGGED', 'suspicious_reason': reason},
            comments=f"Record flagged by analyst. Reason: {reason}"
        )
        
        return Response({
            'status': 'success',
            'message': 'Record successfully flagged.',
            'record_id': record.id
        })

    @action(detail=False, methods=['post'], url_path='publish')
    def publish(self, request):
        """Locks all APPROVED records for the tenant's audit."""
        org = request.user.membership.organization
        approved_records = NormalizedRecord.objects.filter(
            organization=org, 
            status='APPROVED', 
            is_locked=False
        )
        count = approved_records.count()
        
        for record in approved_records:
            old_status = record.status
            record.status = 'LOCKED'
            record.is_locked = True
            record.locked = True
            record.save()
            
            AuditLog.objects.create(
                record=record,
                user=request.user,
                organization=org,
                action='PUBLISH_LOCK',
                previous_state={'status': old_status, 'is_locked': False},
                new_state={'status': 'LOCKED', 'is_locked': True},
                comments="Record locked for audit compliance during publishing."
            )
            
        return Response({
            'status': 'success',
            'message': 'Records locked for audit reporting',
            'count': count
        })

    @action(detail=False, methods=['post'], url_path='delete-demo')
    def delete_demo(self, request):
        """One-click purge of all seeded/demo datasets."""
        org = request.user.membership.organization
        # Find all records to delete
        norm_count, _ = NormalizedRecord.objects.filter(organization=org, is_demo=True).delete()
        ingest_count, _ = IngestionRecord.objects.filter(organization=org, is_demo=True).delete()
        
        return Response({
            'status': 'success',
            'message': 'Demo data successfully purged.',
            'normalized_deleted': norm_count,
            'ingestions_deleted': ingest_count
        })

class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Organization.objects.all()
        try:
            return Organization.objects.filter(id=self.request.user.membership.organization.id)
        except (AttributeError, ObjectDoesNotExist):
            return Organization.objects.none()

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        org = self.get_object()
        org.last_sync = timezone.now()
        org.save()
        return Response({'status': 'synced', 'last_sync': org.last_sync})
