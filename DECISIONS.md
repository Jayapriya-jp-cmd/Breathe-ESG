# DECISIONS.md — Architecture & Product Decisions

## Overview

This prototype focuses on solving the operational challenge of ESG onboarding: ingesting inconsistent enterprise sustainability data, normalizing it into a consistent reporting structure, and enabling analyst review before audit publication.

The implementation intentionally prioritizes:
- auditability
- lineage tracking
- realistic ingestion workflows
- analyst review operations

over advanced emissions science or deep ERP integrations.

---

# 1. SAP Integration Strategy

## Decision
Chosen ingestion format: Structured OData-style JSON export.

## Rationale

SAP ecosystems support multiple integration methods:
- IDocs
- BAPIs
- flat-file exports
- OData APIs

For this prototype, I selected an OData-style JSON structure because modern ESG onboarding workflows increasingly rely on API-mediated exports rather than direct ERP access.

This approach allowed the system to:
- preserve structured source lineage
- support immediate validation
- simplify normalization logic
- avoid introducing SAP authentication complexity within a 4-day prototype window

The implementation intentionally simulates a "prepared enterprise export" rather than raw SAP internals.

---

# 2. Raw Data Preservation

## Decision
Store raw ingestion payloads before normalization.

## Rationale

Every uploaded source file or JSON payload is stored in an IngestionRecord before processing.

This design supports:
- audit traceability
- reproducibility
- future reprocessing
- analyst explainability

A key requirement in ESG systems is proving how a final emissions value was derived from its original operational source.

The platform therefore preserves:
- original uploaded payload
- source metadata
- ingestion timestamps
- normalization lineage

---

# 3. Normalization Standard

## Decision
Standardize all processed records into kgCO2e.

## Rationale

Source systems expose inconsistent operational units:
- liters
- kWh
- kilometers
- hotel nights

The normalization pipeline converts all activities into a unified reporting metric: kgCO2e.

Example mappings:
- Diesel fuel → Scope 1
- Electricity usage → Scope 2
- Corporate travel → Scope 3

Emission factors used in the prototype are intentionally simplified and intended only for demonstration purposes.

Example prototype factors:
- Diesel: 2.68 kgCO2e/L
- Electricity: 0.45 kgCO2e/kWh
- Air travel: distance-based factor model

The architecture stores the conversion factor used per record to preserve audit explainability.

---

# 4. Human-in-the-Loop Review Workflow

## Decision
All records enter the platform as PENDING.

## Rationale

The assignment explicitly requires analyst review before audit publication.

To support this:
- uploaded records are never auto-approved
- analysts must explicitly review records
- suspicious rows can be flagged
- approved rows can later be published and locked

Workflow states:
- PENDING
- FLAGGED
- FAILED
- APPROVED
- LOCKED

This design reflects real ESG governance workflows where operational data requires human validation before disclosure.

---

# 5. Multi-Tenancy Architecture

## Decision
Implement row-level organization isolation.

## Rationale

The platform uses a shared PostgreSQL database with organization-level filtering.

Every:
- ingestion record
- normalized record
- audit log

is linked to an organization_id.

This approach:
- simplifies deployment
- reduces operational complexity
- mirrors common SaaS ESG architectures
- prevents cross-tenant data exposure

Querysets are filtered using the authenticated user's organization context.

---

# 6. Publishing & Audit Locking

## Decision
Approved records become immutable after publishing.

## Rationale

Once records are published to the audit ledger:
- status changes to LOCKED
- edits are disabled
- deletions are prevented
- audit logs are generated

This mechanism simulates ESG reporting controls required for audit defensibility.

---

# 7. Deployment Choice

## Decision
Frontend and backend both deployed on Vercel.

## Rationale

The platform uses Vercel for both frontend and backend deployment to simplify deployment management and accelerate iteration during the prototype phase.

The React frontend benefits from:
- global CDN delivery
- automatic builds
- preview deployments
- optimized static asset delivery

The Django backend is deployed as serverless API functions with environment-based configuration for:
- REST API hosting
- secure environment variables
- scalable request handling
- simplified CI/CD integration

This deployment strategy allowed rapid development, fast iteration, and easy deployment within the assignment timeline while still providing a publicly accessible production environment as required by the assignment.

The architecture intentionally prioritizes:
- deployment simplicity
- fast onboarding
- developer productivity
- demonstration readiness

over infrastructure customization or distributed cloud orchestration.
