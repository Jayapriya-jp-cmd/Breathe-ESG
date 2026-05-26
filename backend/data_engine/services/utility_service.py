from decimal import Decimal
from django.utils import timezone
import datetime

EMISSION_FACTORS = {
    'ELECTRICITY_GRID': Decimal('0.45'), # kgCO2e per kWh
}

class UtilityNormalizationService:
    @staticmethod
    def normalize(row):
        """
        Normalizes a single Utility electricity row.
        Example row:
        {
            "account_id": "UTIL-1002",
            "usage_kwh": 4500,
            "period_end": "2026-05-15",
            "billing_period": "April-May"
        }
        """
        raw_usage = row.get('usage_kwh') or row.get('usage') or row.get('quantity') or 0
        try:
            quantity = Decimal(str(raw_usage))
        except (ValueError, TypeError):
            quantity = Decimal('0')

        factor = EMISSION_FACTORS['ELECTRICITY_GRID']
        kg_co2e = quantity * factor
        
        # Parse activity date from period_end
        raw_date = row.get('period_end') or row.get('date') or row.get('activity_date')
        activity_date = timezone.now().date()
        if raw_date:
            try:
                if isinstance(raw_date, str):
                    activity_date = datetime.datetime.strptime(raw_date.split('T')[0], '%Y-%m-%d').date()
                elif isinstance(raw_date, (datetime.date, datetime.datetime)):
                    activity_date = raw_date
            except ValueError:
                pass

        account_id = row.get('account_id') or "Unknown Account"
        
        return {
            'category': 'ELECTRICITY',
            'activity_type': f"ELECTRICITY: {account_id}",
            'scope': 'SCOPE_2',
            'activity_date': activity_date,
            'raw_value': quantity,
            'normalized_value': quantity,
            'unit': 'kWh',
            'emission_factor': factor,
            'kg_co2e': kg_co2e
        }
