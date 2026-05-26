from rest_framework import serializers
from data_engine.models import NormalizedRecord, Organization, IngestionRecord, AuditLog
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'last_sync', 'created_at']

class IngestionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionRecord
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = AuditLog
        fields = '__all__'

class NormalizedRecordSerializer(serializers.ModelSerializer):
    audit_logs = AuditLogSerializer(many=True, read_only=True)
    ingestion_record = IngestionRecordSerializer(read_only=True)
    
    class Meta:
        model = NormalizedRecord
        fields = '__all__'
