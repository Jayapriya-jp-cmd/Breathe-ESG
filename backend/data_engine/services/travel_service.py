from decimal import Decimal
from django.utils import timezone
import datetime

EMISSION_FACTORS = {
    'FLIGHT_SHORT': Decimal('0.15'), # kgCO2e per km (< 3700 km)
    'FLIGHT_LONG': Decimal('0.12'),  # kgCO2e per km (>= 3700 km)
    'HOTEL_STAY': Decimal('21.0'),   # kgCO2e per night
}

class TravelNormalizationService:
    @staticmethod
    def normalize(row):
        """
        Normalizes a single Travel row.
        Example row (Flight):
        {
            "type": "flight",
            "distance_km": 1500,
            "date": "2026-05-20"
        }
        Example row (Hotel):
        {
            "type": "hotel",
            "nights": 4,
            "date": "2026-05-21"
        }
        """
        travel_type = str(row.get('type') or row.get('travel_type') or '').strip().upper()
        raw_qty = 0
        unit = ''
        factor = Decimal('0')

        if travel_type == 'FLIGHT':
            raw_qty = row.get('distance_km') or row.get('distance') or row.get('quantity') or 0
            unit = 'km'
            try:
                quantity = Decimal(str(raw_qty))
            except (ValueError, TypeError):
                quantity = Decimal('0')
            
            if quantity < 3700:
                factor = EMISSION_FACTORS['FLIGHT_SHORT']
            else:
                factor = EMISSION_FACTORS['FLIGHT_LONG']
        elif travel_type == 'HOTEL':
            raw_qty = row.get('nights') or row.get('quantity') or 0
            unit = 'nights'
            try:
                quantity = Decimal(str(raw_qty))
            except (ValueError, TypeError):
                quantity = Decimal('0')
            
            factor = EMISSION_FACTORS['HOTEL_STAY']
        else:
            # Fallback for generic travel / transport spend
            raw_qty = row.get('quantity') or row.get('amount') or 0
            unit = 'spend'
            try:
                quantity = Decimal(str(raw_qty))
            except (ValueError, TypeError):
                quantity = Decimal('0')
            factor = Decimal('0.20') # general transport factor

        kg_co2e = quantity * factor

        # Parse activity date
        raw_date = row.get('date') or row.get('activity_date')
        activity_date = timezone.now().date()
        if raw_date:
            try:
                if isinstance(raw_date, str):
                    activity_date = datetime.datetime.strptime(raw_date.split('T')[0], '%Y-%m-%d').date()
                elif isinstance(raw_date, (datetime.date, datetime.datetime)):
                    activity_date = raw_date
            except ValueError:
                pass

        return {
            'category': 'TRAVEL',
            'activity_type': f"TRAVEL: {travel_type or 'OTHER'}",
            'scope': 'SCOPE_3',
            'activity_date': activity_date,
            'raw_value': quantity,
            'normalized_value': quantity,
            'unit': unit,
            'emission_factor': factor,
            'kg_co2e': kg_co2e
        }
