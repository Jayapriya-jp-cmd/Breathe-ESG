# MODEL.md - ESG Data Bridge Architecture

The data model is designed to handle the transition from "Messy Source Data" to "Auditable Environmental Records."

## 1. Core Entities

### Organization (Multi-tenancy)
Implicitly used for multi-tenancy. Every ingestion record and normalized row belongs to an `Organization`.

### IngestionRecord (Source of Truth)
Stores the raw payload exactly as it arrived from the source.
- `source_type`: SAP, UTILITY, or TRAVEL.
- `raw_data`: JSON payload.
- `status`: Tracking if ingestion succeeded or failed.
- **Why?** Auditors need to see the "Raw Origin" to verify normalization isn't hallucinating.

### NormalizedRecord (Normalized Data)
The cleaned, unit-consistent record used for ESG reporting.
- `category`: Categorization into Fuel, Electricity, etc.
- `scope`: Mapping to Scope 1, 2, or 3.
- `normalized_value_kgco2e`: The final calculated emissions.
- `conversion_factor`: The specific multiplier used (versioning this is critical).
- `status`: Review status (Pending, Approved, Flagged).
- `flags`: List of automated validation errors.

### AuditLog (Accountability)
Captures every manual edit or approval.
- Stores `previous_state` and `new_state`.
- Links to the `User` who performed the action.

## 2. Normalization Strategy
Instead of a simple CRUD, we use a **Lineage Pattern**. 
1 `IngestionRecord` -> 1+ `NormalizedRecord`.
If a raw record describes multiple activities (e.g., a travel report with flight and hotel), we split it into multiple normalized rows, all referencing the same `IngestionRecord`.

## 3. Scope Mapping
- **Scope 1**: Direct emissions (e.g., Fuel from SAP).
- **Scope 2**: Indirect energy (e.g., Electricity from Utilities).
- **Scope 3**: Indirect value chain (e.g., Business Travel).
