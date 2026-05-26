# SOURCES.md - Data Origin Research

## 1. SAP (Fuel & Procurement)
- **Reality:** Uses specific T-codes (e.g., ME21N) and Material Documents. 
- **Sample Pattern:** I implemented a shape using `MBLNR` (Material Document Number) and `WERKS` (Plant Code).
- **Complexity:** Plant codes mean nothing without a lookup table. For the prototype, I justify the source as a "Standardized OData JSON Export" where the field names are already mapped to friendly labels.

## 2. Utility Portals
- **Reality:** Platforms like Green Button or individual utility portals (ConEd, PG&E) export CSVs.
- **Sample Pattern:** Includes `account_id`, `usage_kwh`, and `billing_period`. 
- **Complexity:** Bills often cross calendar months. I decided to handle this by mapping the emissions to the `period_end` date.

## 3. Corporate Travel (Concur/Navan)
- **Reality:** SAP Concur provides an "Employee Spend" API. 
- **Sample Pattern:** Categorizes travel (AIR, HOTEL, CAR) with distance and date.
- **Complexity:** Different classes (Economic vs Business) have 2-4x higher emission factors. My model is a simplified "Short vs Long Haul" model based on distance.
