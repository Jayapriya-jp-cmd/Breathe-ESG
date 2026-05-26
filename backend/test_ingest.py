import os
import django
import sys
import traceback
from django.core.files.uploadedfile import SimpleUploadedFile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from data_engine.ingestion_service import RawIngestionService
from data_engine.models import Organization, OrganizationMember

User = get_user_model()
user_exists = User.objects.filter(is_superuser=True).first()
if not user_exists:
    user_exists = User.objects.create_superuser('admin', 'admin@example.com', 'admin')

# ensure user has membership
if not hasattr(user_exists, 'membership'):
    org, _ = Organization.objects.get_or_create(name='Test Org')
    OrganizationMember.objects.create(user=user_exists, organization=org)

with open('sample_sap.csv', 'rb') as f:
    file_content = f.read()

file_obj = SimpleUploadedFile('sample_sap.csv', file_content, content_type='text/csv')

try:
    master, count = RawIngestionService.process_file_upload(user_exists, 'SAP', file_obj)
    print(f"Success! Master: {master}, Count: {count}")
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
