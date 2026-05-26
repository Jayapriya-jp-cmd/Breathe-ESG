from decimal import Decimal
from django.utils import timezone
import datetime

EMISSION_FACTORS = {
    'FUEL_DIESEL': Decimal('2.68'),
    'FUEL_PETROL': Decimal('2.31'),
    'PROCUREMENT_DEFAULT': Decimal('0.85'), # e.g. kgCO2e per spending unit/kg
}

class SAPNormalizationService:
    @staticmethod
    def normalize(row):
        """
        Normalizes a single SAP row.
        Example row:
        {
            "MBLNR": "SAP-001",
            "material_text": "DIESEL FUEL",
            "quantity": 1200.5,
            "uom": "litres",
            "date": "2026-05-10"
        }
        """
        material_text = str(row.get('material_text', '')).strip().upper()
        raw_qty = row.get('quantity', 0)
        
        try:
            quantity = Decimal(str(raw_qty))
        except (ValueError, TypeError):
            quantity = Decimal('0')

        uom = str(row.get('uom', '')).strip().upper()
        
        # 1. Standardize unit
        normalized_unit = uom
        if uom in ['L', 'LITER', 'LITERS', 'LITRES']:
            normalized_unit = 'L'
        elif uom in ['KG', 'KILOGRAM', 'KILOGRAMS']:
            normalized_unit = 'kg'
        elif uom in ['USD', 'EUR', 'INR', 'CURRENCY', 'SPEND']:
            normalized_unit = 'spend'

        # 2. Scope & Category Mapping
        if 'DIESEL' in material_text:
            category = 'FUEL'
            activity_type = 'DIESEL'
            scope = 'SCOPE_1'
            factor = EMISSION_FACTORS['FUEL_DIESEL']
        elif 'PETROL' in material_text or 'GASOLINE' in material_text:
            category = 'FUEL'
            activity_type = 'PETROL'
            scope = 'SCOPE_1'
            factor = EMISSION_FACTORS['FUEL_PETROL']
        else:
            # Assume it's a general procurement / materials line
            category = 'FUEL' # Map to category choice: 'FUEL' | 'ELECTRICITY' | 'TRAVEL'
            activity_type = f"PROCUREMENT: {material_text[:30]}" if material_text else "PROCUREMENT"
            scope = 'SCOPE_3'
            factor = EMISSION_FACTORS['PROCUREMENT_DEFAULT']
            if normalized_unit == '':
                normalized_unit = 'spend'

        # 3. Normalized value (usually quantity or converted standard volume)
        normalized_value = quantity
        
        # 4. Calculate kgCO2e
        kg_co2e = normalized_value * factor
        
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
            'category': category,
            'activity_type': activity_type,
            'scope': scope,
            'activity_date': activity_date,
            'raw_value': quantity,
            'normalized_value': normalized_value,
            'unit': normalized_unit,
            'emission_factor': factor,
            'kg_co2e': kg_co2e
        }
