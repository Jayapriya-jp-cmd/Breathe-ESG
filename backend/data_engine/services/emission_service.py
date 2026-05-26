from decimal import Decimal
from django.utils import timezone
import datetime
from data_engine.models import NormalizedRecord
from .sap_service import SAPNormalizationService
from .utility_service import UtilityNormalizationService
from .travel_service import TravelNormalizationService

class IngestionValidationEngine:
    @staticmethod
    def validate_and_normalize(org, source_type, row):
        """
        Normalizes a row and validates it.
        Returns:
            normalized_data (dict)
            status (str) - PENDING, FLAGGED, FAILED
            warnings (list of str)
            errors (list of str)
        """
        errors = []
        warnings = []
        
        # 1. Normalize based on source type
        try:
            if source_type == 'SAP':
                norm = SAPNormalizationService.normalize(row)
            elif source_type == 'UTILITY':
                norm = UtilityNormalizationService.normalize(row)
            elif source_type == 'TRAVEL':
                norm = TravelNormalizationService.normalize(row)
            else:
                raise ValueError(f"Unknown source type: {source_type}")
        except Exception as e:
            return None, 'FAILED', [], [f"Normalization failed: {str(e)}"]

        # 2. Check for missing units or quantity
        qty = norm.get('raw_value', Decimal('0'))
        unit = norm.get('unit', '')
        
        if not unit:
            errors.append("Missing measurement unit.")
            
        # 3. Check for negative quantities
        if qty < 0:
            errors.append("Negative activity quantity detected.")

        # 4. Check for invalid dates (Future dates or before 2000)
        activity_date = norm.get('activity_date')
        if activity_date:
            if activity_date > timezone.now().date():
                errors.append(f"Future activity date: {activity_date}")
            elif activity_date.year < 2000:
                errors.append(f"Activity date too old: {activity_date}")
        else:
            errors.append("Missing activity date.")

        # 5. Check for extremely large values
        if qty > Decimal('10000000'):
            warnings.append(f"Extremely large quantity: {qty:,} {unit}")
        if norm.get('kg_co2e', Decimal('0')) > Decimal('1000000'):
            warnings.append(f"Extremely high emissions: {norm['kg_co2e']:,} kgCO2e")

        # 6. Check for duplicate uploads
        # Check if there is already a NormalizedRecord with the exact same activity_type, activity_date, raw_value, and organization.
        is_duplicate = NormalizedRecord.objects.filter(
            organization=org,
            activity_type=norm.get('activity_type'),
            activity_date=activity_date,
            raw_value=qty,
            unit=unit
        ).exists()
        
        if is_duplicate:
            warnings.append("Potential duplicate record detected. An identical entry already exists.")

        # Determine final status
        if errors:
            status = 'FAILED'
        elif warnings:
            status = 'FLAGGED'
        else:
            status = 'PENDING'

        return norm, status, warnings, errors
