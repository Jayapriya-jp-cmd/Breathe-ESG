# DECISIONS.md - Design Rationale

## 1. SAP Integration Choice
**Chosen Format:** OData/JSON structure.
**Why:** While SAP supports IDocs (Batch) and Flat Files (CSV), modern ESG platforms are moving towards OData APIs for real-time visibility. I chose to simulate a JSON pull from an OData service because it allows for immediate validation markers.

## 2. Unit Normalization
**Choice:** Standardized on `kgCO2e`.
**Calculation:** Implemented a `NormalizationService` (Adapter pattern) in the backend. 
- **Fuel:** 1L Diesel = 2.68 kgCO2e.
- **Flight:** Used distance breaks (Short vs Long haul) as they have different carbon intensities per km.

## 3. Human-in-the-loop Status
**Choice:** All incoming data starts as `PENDING`.
**Decision:** Nothing goes to the "Audit Ledger" (Approved status) without explicit analyst sign-off. This handles the requirement: "let our analysts review and sign off before it goes to auditors."

## 4. Multi-tenancy
**Choice:** Row-level isolation via `organization_id`. 
**Why:** Essential for an Enterprise SaaS where data privacy is legally mandated.

## 5. Deployment Platform
**Choice:** Render/Railway (TBD by user). 
**Why:** Fast CI/CD, supports Python/Node, and provides managed DBs.
