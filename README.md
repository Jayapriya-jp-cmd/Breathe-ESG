# ESG Data Bridge

Enterprise ESG Data Ingestion, Normalization & Audit Workflow Platform

An enterprise-style ESG (Environmental, Social, Governance) platform built using Django REST Framework and React to simulate how modern sustainability software ingests inconsistent operational sustainability data, normalizes emissions records, and enables analyst-driven audit workflows.

---

# Live Demo

## Frontend

[Frontend Deployment](https://breathe-esg-frontend.vercel.app?utm_source=chatgpt.com)

## Backend API

[Backend API Deployment](https://breathe-esg-lovat.vercel.app?utm_source=chatgpt.com)

---

# Project Overview

Organizations typically store sustainability-related operational data across disconnected systems such as:

* SAP ERP exports
* Utility billing platforms
* Corporate travel systems
* Internal spreadsheets

This project focuses on solving the operational ESG onboarding challenge:

> ingesting inconsistent enterprise data, transforming it into standardized ESG records, and enabling audit-ready analyst review workflows.

The platform intentionally prioritizes:

* auditability
* lineage tracking
* normalization pipelines
* analyst review workflows
* enterprise SaaS architecture

rather than advanced carbon accounting methodologies.

---

# Core Features

## Raw Data Ingestion

Supports ingestion from multiple enterprise-style sources:

### SAP Fuel & Procurement

* Simulated OData/JSON exports
* Material document structures
* Fuel consumption records

### Utility Electricity Data

* CSV-style utility exports
* Meter usage records
* Billing period handling

### Corporate Travel

* Concur/Navan-style travel records
* Flight and transportation activity data

Supported upload formats:

* CSV
* JSON
* Manual JSON payloads

---

# Raw Payload Preservation

Every uploaded payload is preserved before normalization.

This supports:

* audit traceability
* reproducibility
* source lineage tracking
* future reprocessing
* analyst explainability

The platform stores:

* original payload
* ingestion timestamps
* source metadata
* normalization lineage

---

# ESG Normalization Engine

The system converts inconsistent operational units into standardized ESG reporting values.

Examples:

* Diesel fuel → Scope 1
* Electricity usage → Scope 2
* Corporate travel → Scope 3

All emissions are normalized into:

```text id="jlwm7p"
kgCO2e
```

Prototype emission factors include:

| Activity    | Prototype Factor     |
| ----------- | -------------------- |
| Diesel      | 2.68 kgCO2e/L        |
| Electricity | 0.45 kgCO2e/kWh      |
| Air Travel  | Distance-based model |

---

# Validation Engine

Automatic validation checks include:

* negative quantities
* invalid dates
* missing units
* suspicious outliers
* duplicate uploads

Record states:

* PENDING
* FLAGGED
* FAILED
* APPROVED
* LOCKED

---

# Analyst Review Workflow

Analysts can:

* inspect raw payloads
* compare raw vs normalized records
* approve/reject submissions
* flag suspicious entries
* publish records for audit

---

# Audit Publishing

Approved records can be published into an immutable audit state.

Published records:

* become LOCKED
* cannot be edited
* cannot be deleted
* generate audit logs

This simulates enterprise ESG audit defensibility workflows.

---

# System Architecture

```text id="jlwm4x"
Raw Enterprise Data
        ↓
IngestionRecord
        ↓
Validation Engine
        ↓
Normalization Pipeline
        ↓
NormalizedRecord
        ↓
Analyst Review Queue
        ↓
Audit Publication
```

---

# Tech Stack

## Frontend

* React
* TypeScript
* Tailwind CSS
* Axios
* Recharts
* Vite

## Backend

* Django
* Django REST Framework
* PostgreSQL
* WhiteNoise

## Database

* Neon PostgreSQL

## Deployment

* Frontend → Vercel
* Backend → Vercel

---

# Multi-Tenancy Architecture

The platform implements organization-level tenant isolation.

Every:

* ingestion record
* normalized record
* audit log
* user

belongs to an organization.

This prevents cross-tenant visibility and simulates enterprise SaaS ESG systems.

---

# ESG Scope Classification

| Scope   | Description                    | Example           |
| ------- | ------------------------------ | ----------------- |
| Scope 1 | Direct operational emissions   | Fuel consumption  |
| Scope 2 | Purchased energy emissions     | Electricity usage |
| Scope 3 | Indirect value-chain emissions | Corporate travel  |

---

# Example Source Payloads

## SAP Example

```json id="jlwm5a"
{
  "MBLNR": "500001",
  "FUEL_TYPE": "Diesel",
  "QUANTITY": 500,
  "UNIT": "L"
}
```

---

## Utility Example

```json id="jlwm2h"
{
  "meter_id": "MTR001",
  "usage_kwh": 4500,
  "billing_period": "2026-05"
}
```

---

## Travel Example

```json id="jlwm9q"
{
  "category": "AIR",
  "distance_km": 2500
}
```

---

# Folder Structure

```text id="jlwm3f"
backend/
├── core/
├── data_engine/
├── portal/
├── requirements.txt
├── manage.py
└── vercel.json

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── config/
├── package.json
└── vite.config.ts
```

---

# Local Development Setup

## Clone Repository

```bash id="jlwm1y"
git clone <repository-url>

cd Breathe-ESG
```

---

# Backend Setup

## Create Virtual Environment

```bash id="jlwm6v"
python -m venv venv
```

---

## Activate Environment

### Windows

```bash id="jlwm4j"
venv\Scripts\activate
```

### macOS/Linux

```bash id="jlwm7z"
source venv/bin/activate
```

---

## Install Backend Dependencies

```bash id="jlwm0y"
cd backend

pip install -r requirements.txt
```

---

## Configure Backend Environment Variables

Create:

```text id="jlwm2x"
backend/.env
```

Add:

```env id="jlwm8q"
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=your_neon_postgresql_url
```

---

## Run Database Migrations

```bash id="jlwm1w"
python manage.py migrate
```

---

## Start Backend Server

```bash id="jlwm9m"
python manage.py runserver
```

Backend runs on:

```text id="jlwm6n"
http://127.0.0.1:8000
```

---

# Frontend Setup

## Install Frontend Dependencies

```bash id="jlwm5h"
cd frontend

npm install
```

---

## Configure Frontend Environment Variables

Create:

```text id="jlwm4r"
frontend/.env
```

Add:

```env id="jlwm3x"
VITE_API_URL=http://127.0.0.1:8000
```

For production:

```env id="jlwm7e"
VITE_API_URL=https://breathe-esg-lovat.vercel.app
```

---

## Start Frontend

```bash id="jlwm5m"
npm run dev
```

Frontend runs on:

```text id="jlwm8w"
http://localhost:5173
```

---

# Deployment Architecture

## Frontend Deployment

The frontend is deployed on [Vercel](https://vercel.com?utm_source=chatgpt.com) using Vite-based static deployment.

Features:

* global CDN delivery
* preview deployments
* optimized static asset hosting
* GitHub CI/CD integration

---

## Backend Deployment

The Django backend is deployed on [Vercel](https://vercel.com?utm_source=chatgpt.com) using Python serverless functions.

Features:

* scalable REST APIs
* secure environment variable handling
* automatic deployments
* production-ready API hosting

---

## Database Deployment

The production database uses [Neon PostgreSQL](https://neon.tech?utm_source=chatgpt.com).

SQLite was initially used for local development but replaced in production because Vercel serverless environments use read-only ephemeral filesystems.

Neon PostgreSQL provides:

* persistent cloud storage
* scalable PostgreSQL infrastructure
* serverless-friendly architecture
* Django ORM compatibility

---

# Key Functionalities

## Raw Data Ingestion

* upload CSV/JSON payloads
* preserve original enterprise records
* validate uploaded data
* normalize emissions records

## Review Queue

* analyst review workflows
* raw vs normalized comparison
* audit explainability
* approval/rejection handling

## Audit Publication

* immutable audit publication
* record locking
* audit trail generation

---

# Design Priorities

The platform intentionally prioritizes:

* auditability
* lineage tracking
* ESG onboarding workflows
* enterprise ingestion architecture
* analyst usability

over:

* advanced emissions science
* live SAP authentication
* deep ERP integrations

---

# Future Improvements

Potential future enhancements include:

* OCR utility bill ingestion
* real-time SAP connectors
* async processing queues
* AI anomaly detection
* supplier-specific calculations
* factor versioning
* geospatial emissions calculations

---

# Assignment Goals

This project was designed to demonstrate:

* enterprise ingestion architecture
* ESG normalization workflows
* audit-ready system design
* multi-tenant SaaS architecture
* analyst usability
* engineering tradeoff reasoning

---

# Author

**Jayapriya R**

Cybersecurity Engineering Student
Focused on Security, Cloud, and Enterprise Systems
