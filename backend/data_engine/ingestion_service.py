import csv
import json
import io
from decimal import Decimal
from django.core.files.base import ContentFile
from data_engine.models import IngestionRecord, NormalizedRecord
from data_engine.services.emission_service import IngestionValidationEngine

class RawIngestionService:
    @staticmethod
    def process_file_upload(user, source_type, file_obj):
        """
        Processes a file upload (CSV or JSON), creates an IngestionRecord,
        and triggers validation and normalization.
        """
        filename = file_obj.name
        content = file_obj.read()
        
        # 1. Parse content
        data_rows = []
        if filename.endswith('.csv'):
            decoded_content = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded_content))
            data_rows = [dict(r) for r in reader]
        elif filename.endswith('.json'):
            decoded_content = content.decode('utf-8')
            data_rows = json.loads(decoded_content)
            if not isinstance(data_rows, list):
                data_rows = [data_rows]
        else:
            raise ValueError("Unsupported file format. Please upload a .csv or .json file.")

        return RawIngestionService.process_raw_payload(
            user=user,
            source_type=source_type,
            raw_payload=data_rows,
            filename=filename,
            file_obj=file_obj
        )

    @staticmethod
    def process_raw_payload(user, source_type, raw_payload, filename=None, file_obj=None, is_demo=False):
        """
        Processes a raw payload (a list of dictionaries), which can come from
        file upload, manual JSON paste, or seeding.
        """
        org = user.membership.organization
        
        # 1. Create the Master Ingestion Record
        ingest_master = IngestionRecord.objects.create(
            organization=org,
            source_type=source_type,
            file=file_obj,
            original_filename=filename or f"manual_paste_{timezone_now_str()}.json",
            raw_json_summary=raw_payload[:5], # Store first 5 for preview
            raw_payload=raw_payload,
            ingested_by=user,
            status='PENDING',
            is_demo=is_demo
        )

        success_count = 0
        flagged_count = 0
        failed_count = 0
        
        # 2. Iterate and process each row
        for row in raw_payload:
            norm_res, status, warnings, errors = IngestionValidationEngine.validate_and_normalize(org, source_type, row)
            
            # Combine warnings and errors into a string
            suspicious_reason = ""
            if errors:
                suspicious_reason += "Errors: " + "; ".join(errors)
            if warnings:
                if suspicious_reason:
                    suspicious_reason += " | "
                suspicious_reason += "Warnings: " + "; ".join(warnings)
                
            if status == 'FAILED':
                failed_count += 1
                # Create a minimal record so analysts can see the failure in the Review Queue
                NormalizedRecord.objects.create(
                    ingestion_record=ingest_master,
                    organization=org,
                    category='FUEL' if source_type == 'SAP' else ('ELECTRICITY' if source_type == 'UTILITY' else 'TRAVEL'),
                    activity_type=str(row.get('material_text') or row.get('account_id') or row.get('type') or 'FAILED RECORD'),
                    scope='SCOPE_1' if source_type == 'SAP' else ('SCOPE_2' if source_type == 'UTILITY' else 'SCOPE_3'),
                    activity_date=timezone_now_date(),
                    original_value=Decimal(str(row.get('quantity') or row.get('usage_kwh') or row.get('distance_km') or 0)),
                    original_unit=str(row.get('uom') or row.get('unit') or ''),
                    raw_value=Decimal(str(row.get('quantity') or row.get('usage_kwh') or row.get('distance_km') or 0)),
                    normalized_value=Decimal('0'),
                    unit=str(row.get('uom') or row.get('unit') or ''),
                    normalized_value_kgco2e=Decimal('0'),
                    conversion_factor=Decimal('0'),
                    kg_co2e=Decimal('0'),
                    emission_factor=Decimal('0'),
                    status='FAILED',
                    suspicious_reason=suspicious_reason or "Normalization validation failed.",
                    is_demo=is_demo
                )
            else:
                if status == 'FLAGGED':
                    flagged_count += 1
                else:
                    success_count += 1
                
                # Create standard NormalizedRecord
                NormalizedRecord.objects.create(
                    ingestion_record=ingest_master,
                    organization=org,
                    category=norm_res['category'],
                    activity_type=norm_res['activity_type'],
                    scope=norm_res['scope'],
                    activity_date=norm_res['activity_date'],
                    
                    original_value=norm_res['raw_value'],
                    original_unit=norm_res['unit'],
                    raw_value=norm_res['raw_value'],
                    normalized_value=norm_res['normalized_value'],
                    unit=norm_res['unit'],
                    
                    normalized_value_kgco2e=norm_res['kg_co2e'],
                    conversion_factor=norm_res['emission_factor'],
                    kg_co2e=norm_res['kg_co2e'],
                    emission_factor=norm_res['emission_factor'],
                    
                    status=status,
                    flags=warnings + errors,
                    suspicious_reason=suspicious_reason if suspicious_reason else None,
                    is_demo=is_demo
                )

        # 3. Update master ingestion record status
        if failed_count == len(raw_payload) and len(raw_payload) > 0:
            ingest_master.status = 'FAILED'
        else:
            ingest_master.status = 'COMPLETED'
        ingest_master.save()

        summary = {
            'processed': len(raw_payload),
            'success': success_count,
            'flagged': flagged_count,
            'failed': failed_count
        }
        
        return ingest_master, summary

def timezone_now_date():
    from django.utils import timezone
    return timezone.now().date()

def timezone_now_str():
    from django.utils import timezone
    return timezone.now().strftime("%Y%m%d_%H%M%S")
