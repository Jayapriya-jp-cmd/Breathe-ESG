import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from data_engine.models import NormalizedRecord, Organization, IngestionRecord
from django.contrib.auth.models import User

print("Total Users:", User.objects.count())
for u in User.objects.all():
    has_member = hasattr(u, 'membership')
    org = u.membership.organization.name if has_member else 'None'
    print(f"User: {u.username}, Superuser: {u.is_superuser}, Member of: {org}")

print("Total Records:", NormalizedRecord.objects.count())
for r in NormalizedRecord.objects.all():
    print(f"Record {r.id}: {r.category} {r.status} {r.is_locked} Org: {r.organization.name}")

