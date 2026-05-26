import os
import django
from decimal import Decimal
from django.utils import timezone
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from data_engine.models import Organization, OrganizationMember, IngestionRecord, NormalizedRecord
from data_engine.ingestion_service import RawIngestionService

def seed_logic(org, user):
    """Adds a realistic baseline set of demo data to an organization."""
    if NormalizedRecord.objects.filter(organization=org).count() > 0:
        return

    print(f"Seeding realistic baseline demo data for {org.name}...")
    
    # 1. SAP Carbon Fuel & Procurement Demo (Scope 1 and Scope 3)
    sap_payload = [
        {'MBLNR': 'SAP-DEMO-01', 'material_text': 'DIESEL FUEL FOR FORKLIFTS', 'quantity': 1500, 'uom': 'liters', 'date': '2026-04-10'},
        {'MBLNR': 'SAP-DEMO-02', 'material_text': 'UNLEADED PETROL ROAD TRAVEL', 'quantity': 800, 'uom': 'L', 'date': '2026-04-12'},
        {'MBLNR': 'SAP-DEMO-03', 'material_text': 'STATIONERY OFFICE PROCUREMENT', 'quantity': 12000, 'uom': 'USD', 'date': '2026-04-15'},
        {'MBLNR': 'SAP-DEMO-04', 'material_text': 'NEGATIVE FUEL LEAK ANOMALY', 'quantity': -100, 'uom': 'L', 'date': '2026-04-18'}, # Validation error (Negative)
        {'MBLNR': 'SAP-DEMO-05', 'material_text': 'DIESEL EXTRA BULK TANK', 'quantity': 15000000, 'uom': 'L', 'date': '2026-04-20'}, # Validation warning (Extremely large)
    ]
    RawIngestionService.process_raw_payload(user, 'SAP', sap_payload, filename="sap_demo_records.json", is_demo=True)

    # 2. Utility Electricity Demo (Scope 2)
    util_payload = [
        {'account_id': 'CONED-9921', 'usage_kwh': 8400, 'period_end': '2026-04-30', 'billing_period': 'April 2026'},
        {'account_id': 'PGE-4421', 'usage_kwh': 12500, 'period_end': '2026-04-28', 'billing_period': 'April 2026'},
        {'account_id': 'CONED-9921', 'usage_kwh': 8400, 'period_end': '2026-04-30', 'billing_period': 'April 2026'}, # Duplicate check trigger
    ]
    RawIngestionService.process_raw_payload(user, 'UTILITY', util_payload, filename="utility_demo_records.json", is_demo=True)

    # 3. Travel Concur Demo (Scope 3)
    travel_payload = [
        {'type': 'flight', 'distance_km': 1200, 'date': '2026-04-05'}, # Short-haul flight
        {'type': 'flight', 'distance_km': 6800, 'date': '2026-04-08'}, # Long-haul flight
        {'type': 'hotel', 'nights': 5, 'date': '2026-04-12'}, # Hotel stay
        {'type': 'flight', 'distance_km': -500, 'date': '2026-04-15'}, # Validation error (Negative distance)
        {'type': 'hotel', 'nights': 4, 'date': '2027-04-16'}, # Validation warning (Future Date)
    ]
    RawIngestionService.process_raw_payload(user, 'TRAVEL', travel_payload, filename="travel_demo_records.json", is_demo=True)

    print(f"Successfully seeded {org.name} baseline data.")

def seed_all():
    # Ensure superuser exists
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        print("Superuser created (admin/admin123).")

    # Seed for every existing organization
    orgs = Organization.objects.all()
    for org in orgs:
        member = OrganizationMember.objects.filter(organization=org).first()
        if member:
            seed_logic(org, member.user)

    print("Universal seeding complete.")

if __name__ == '__main__':
    seed_all()
