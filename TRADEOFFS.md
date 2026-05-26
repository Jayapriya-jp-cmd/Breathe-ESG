# TRADEOFFS.md — Deliberately Deferred Features

## Overview

Given the assignment's 4-day implementation window, the prototype intentionally prioritizes:
- ingestion architecture
- auditability
- normalization workflows
- analyst review operations

over deep integrations and advanced emissions science.

The following capabilities were intentionally deferred.

---

# 1. Automated PDF OCR for Utility Bills

## Deferred Capability
Direct extraction from scanned utility invoices.

## Current Implementation
Structured CSV/JSON ingestion.

## Why Deferred

Real invoice ingestion requires:
- OCR pipelines
- layout parsing
- document classification
- confidence scoring

This would significantly increase project complexity and distract from the assignment's core objective:
normalization and review workflows.

The prototype therefore assumes the utility provider already exposes structured exports.

---

# 2. Real-Time SAP Connectivity

## Deferred Capability
Direct SAP authentication and live ERP integration.

## Current Implementation
Simulated OData-style JSON exports.

## Why Deferred

Live SAP integration introduces:
- authentication complexity
- environment provisioning
- connector maintenance
- enterprise network constraints

The prototype instead focuses on:
- realistic payload handling
- normalization
- lineage tracking

rather than ERP infrastructure concerns.

---

# 3. Advanced Air Travel Modeling

## Deferred Capability
Airport geolocation and cabin-class-adjusted emissions modeling.

## Current Implementation
Distance-based prototype emission factors.

## Why Deferred

Production-grade flight emissions require:
- airport geospatial databases
- Haversine distance calculations
- radiative forcing adjustments
- cabin-class multipliers

For the prototype:
- distance_km is assumed to exist upstream
- a simplified short-haul vs long-haul model is used

This keeps the implementation focused on ingestion architecture rather than emissions methodology depth.

---

# 4. Real-Time Emission Factor Management

## Deferred Capability
Dynamic factor versioning and regional factor registries.

## Current Implementation
Static prototype emission factors stored per record.

## Why Deferred

Enterprise ESG systems often maintain:
- region-specific factors
- reporting-year versioning
- supplier-specific calculations

The prototype intentionally uses fixed demonstrational factors to simplify validation and review workflows.

---

# 5. Distributed Processing Pipeline

## Deferred Capability
Asynchronous ingestion queues and distributed workers.

## Current Implementation
Synchronous processing during upload.

## Why Deferred

Large-scale ESG systems commonly use:
- Celery
- Kafka
- event pipelines

to process millions of records.

For the prototype, synchronous ingestion keeps the architecture easier to explain and review within the assignment constraints.
