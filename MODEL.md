# MODEL.md — ESG Data Bridge Architecture

## Overview

The platform is designed as a data lineage system rather than a traditional CRUD application.

Its primary responsibility is transforming inconsistent operational sustainability data into auditable ESG reporting records while preserving the relationship between:
- original source payloads
- normalization logic
- analyst review actions
- published audit outputs

The architecture follows a staged ingestion pipeline:

Raw Source → IngestionRecord → NormalizedRecord → Analyst Review → Audit Publication

---

# 1. Organization (Multi-Tenancy)

## Purpose
Provides tenant isolation for enterprise SaaS usage.

## Design

Every user belongs to an Organization.

All platform records are scoped to:
- organization_id
- authenticated user context

This prevents cross-tenant visibility and ensures customer data isolation.

---

# 2. IngestionRecord (Source of Truth Layer)

## Purpose
Stores raw uploaded payloads exactly as received.

## Fields
- source_type
- raw_payload
- uploaded_file
- ingestion_status
- organization_id
- created_at

## Why This Exists

A core ESG requirement is audit traceability.

Auditors must be able to:
- inspect the original operational source
- verify normalization logic
- reproduce calculations

The IngestionRecord therefore acts as the immutable source-of-truth layer.

---

# 3. NormalizedRecord (Reporting Layer)

## Purpose
Represents cleaned and standardized ESG reporting data.

## Fields
- activity_type
- category
- scope
- raw_value
- normalized_value
- unit
- emission_factor
- kg_co2e
- status
- suspicious_reason
- approved_by
- approved_at
- locked

## Why This Exists

Operational source systems expose inconsistent schemas and units.

The normalization layer converts:
- fuel quantities
- electricity usage
- travel distances

into a unified reporting structure.

This allows:
- analytics
- filtering
- approval workflows
- audit publication

---

# 4. AuditLog (Governance Layer)

## Purpose
Tracks every manual action taken by analysts.

## Captures
- approvals
- rejections
- edits
- publishing actions
- lock operations

## Stored Metadata
- previous_state
- new_state
- performed_by
- timestamp

## Why This Exists

Auditability is a critical ESG reporting requirement.

The system therefore maintains a historical chain of analyst decisions and record transitions.

---

# 5. Lineage Architecture

## Design Pattern
1 IngestionRecord → Many NormalizedRecords

## Example

A single travel report may contain:
- flight activity
- hotel stay
- ground transport

These become separate normalized rows while preserving linkage to the original uploaded source.

This design enables:
- granular analytics
- detailed review workflows
- full traceability

---

# 6. Scope Classification

## Scope 1
Direct operational emissions.
Example:
- diesel fuel consumption

## Scope 2
Indirect purchased energy.
Example:
- electricity consumption

## Scope 3
Indirect value-chain emissions.
Example:
- corporate travel

The mapping logic is implemented in the normalization service layer.

---

# 7. Validation Strategy

The platform automatically validates:
- negative quantities
- missing units
- invalid dates
- suspicious outliers
- duplicate uploads

Validation failures generate:
- FAILED status
- FLAGGED status
- analyst review requirements

This supports operational data quality assurance before audit publication.
