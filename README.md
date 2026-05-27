# ESG Data Bridge

Enterprise ESG Data Ingestion, Normalization & Audit Workflow Platform

An enterprise-style ESG (Environmental, Social, Governance) platform built using Django REST Framework and React to simulate how modern sustainability software ingests messy operational data from enterprise systems, normalizes emissions records, and enables analyst-driven audit workflows.

---

## Project Overview

Organizations store sustainability-related operational data across multiple disconnected systems such as:
- SAP ERP exports
- Utility billing portals
- Corporate travel platforms
- Internal spreadsheets

This project focuses on solving the operational ESG onboarding challenge:

> ingesting inconsistent enterprise data, transforming it into standardized ESG records, and enabling audit-ready analyst review workflows.

The platform is intentionally designed around:
- data lineage
- auditability
- normalization
- review workflows
- enterprise SaaS architecture

rather than advanced carbon accounting science.

---

# Core Features

## Raw Data Ingestion

Supports ingestion from multiple enterprise-style sources:

### SAP Fuel & Procurement
- Simulated OData/JSON exports
- Material document structures
- Fuel consumption records

### Utility Electricity Data
- CSV-style utility exports
- Meter usage records
- Billing period handling

### Corporate Travel
- Concur/Navan-style travel records
- Flight, hotel, and transport categories

Supported upload formats:
- CSV
- JSON
- Manual JSON paste

---

## Raw Payload Preservation

Every uploaded source is stored before processing.

This enables:
- audit traceability
- reproducibility
- source lineage tracking
- normalization explainability

---

## Normalization Engine

The system converts inconsistent operational units into standardized ESG reporting values.

Examples:
- Diesel fuel → Scope 1
- Electricity usage → Scope 2
- Business travel → Scope 3

All emissions are normalized into:
- kgCO2e

---

## Validation Engine

Automatic validation checks:
- negative quantities
- missing units
- invalid dates
- suspicious outliers
- duplicate uploads

Record states:
- PENDING
- FLAGGED
- FAILED
- APPROVED
- LOCKED

---

## Analyst Review Workflow

Analysts can:
- inspect raw uploaded payloads
- compare raw vs normalized records
- review emission calculations
- approve/reject records
- flag suspicious entries
- publish records for audit

---

## Audit Publishing

Approved records can be published into an immutable audit state.

Published records:
- become LOCKED
- cannot be edited
- cannot be deleted
- generate audit logs

This simulates enterprise ESG audit compliance workflows.

---

# Architecture

```text
Raw Source Data
       ↓
IngestionRecord
       ↓
Normalization Services
       ↓
NormalizedRecord
       ↓
Review Queue
       ↓
Audit Publication
```

---

# Tech Stack

## Frontend
- React
- TypeScript
- Tailwind CSS
- Axios
- Recharts

## Backend
- Django
- Django REST Framework
- PostgreSQL

## Deployment
- Vercel (Frontend + Backend)

---

# Multi-Tenancy

The platform implements organization-level tenant isolation.

Each:
- user
- ingestion record
- normalized record
- audit log

belongs to an organization.

This prevents cross-tenant visibility and simulates enterprise SaaS ESG systems.

---

# ESG Scope Classification

| Scope | Description | Example |
|---|---|---|
| Scope 1 | Direct operational emissions | Fuel consumption |
| Scope 2 | Purchased energy emissions | Electricity usage |
| Scope 3 | Indirect value-chain emissions | Corporate travel |

---

# Example Source Payloads

## SAP Example

```json
{
  "MBLNR": "500001",
  "FUEL_TYPE": "Diesel",
  "QUANTITY": 500,
  "UNIT": "L"
}
```

---

## Utility Example

```json
{
  "meter_id": "MTR001",
  "usage_kwh": 4500,
  "billing_period": "2026-05"
}
```

---

## Travel Example

```json
{
  "category": "AIR",
  "distance_km": 2500
}
```

---

# Prototype Emission Factors

| Activity | Emission Factor |
|---|---|
| Diesel | 2.68 kgCO2e/L |
| Electricity | 0.45 kgCO2e/kWh |
| Flight Travel | Distance-based model |

> Note: Emission factors are simplified prototype assumptions and not production-grade methodologies.

---

# Folder Structure

```text
backend/
├── organizations/
├── ingestion/
├── normalization/
├── audits/
├── analytics/
└── api/

frontend/
├── components/
├── pages/
├── services/
├── hooks/
└── store/
```

---

# Local Development Setup

## 1. Clone Repository

```bash
git clone <your-repository-url>

cd esg-data-bridge
```

---

# Backend Setup

## 2. Create Virtual Environment

```bash
python -m venv venv
```

## 3. Activate Environment

### Windows

```bash
venv\Scripts\activate
```

### macOS/Linux

```bash
source venv/bin/activate
```

---

## 4. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

## 5. Configure Environment Variables

Create `.env` inside backend directory:

```env
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=your_database_url
```

---

## 6. Run Migrations

```bash
python manage.py migrate
```

---

## 7. Start Backend Server

```bash
python manage.py runserver
```

Backend runs on:
```text
http://127.0.0.1:8000
```

---

# Frontend Setup

## 8. Install Frontend Dependencies

```bash
cd frontend

npm install
```

---

## 9. Configure Frontend Environment Variables

Create `.env`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 10. Start Frontend

```bash
npm run dev
```

Frontend runs on:
```text
http://localhost:5173
```

---

# Key Functionalities

## Raw Ingest
Upload:
- CSV files
- JSON files
- Manual JSON payloads

The platform:
1. stores raw payload
2. validates records
3. normalizes emissions
4. creates review queue entries

---

## Review Queue
Analysts can:
- inspect records
- approve/reject entries
- view lineage
- compare raw vs normalized values

---

## Publish to Audit
Publishing:
- locks approved records
- prevents future edits
- generates audit logs

---

# Design Principles

This project intentionally prioritizes:
- auditability
- data lineage
- enterprise ingestion workflows
- analyst review operations
- realistic ESG onboarding patterns

over:
- flashy UI
- deep ERP integrations
- advanced emissions science

---

# Tradeoffs

The following were intentionally deferred:
- PDF OCR parsing
- live SAP authentication
- asynchronous distributed ingestion
- airport geolocation systems
- dynamic emission factor registries

These tradeoffs were made to focus on the assignment’s core objective:
building a realistic ESG ingestion and audit workflow platform within a constrained timeline.

---

# Future Improvements

Potential future enhancements:
- OCR utility bill ingestion
- real-time SAP connectors
- async processing queues
- AI anomaly detection
- factor versioning
- supplier-specific calculations
- geospatial flight calculations

---

# Assignment Goals

This project was designed to demonstrate:
- enterprise ingestion architecture
- ESG normalization workflows
- audit-ready system design
- multi-tenant SaaS architecture
- analyst usability
- engineering tradeoff reasoning

---

# Author

Jayapriya R

Cybersecurity Engineering Student  
Focused on Security, Cloud, and Enterprise Systems
