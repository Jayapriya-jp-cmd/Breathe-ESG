# SOURCES.md — Real-World Data Research

## Overview

The assignment required researching realistic enterprise sustainability data formats rather than using artificial toy schemas.

This prototype therefore implements simplified but realistic subsets of:
- SAP operational exports
- utility portal consumption data
- corporate travel platform records

The goal was not full ERP fidelity, but realistic ingestion behavior.

---

# 1. SAP Fuel & Procurement Data

## Real-World Research

SAP environments commonly expose operational data through:
- IDocs
- BAPIs
- flat-file exports
- OData services

Fuel and procurement workflows frequently reference:
- Material Document Numbers (MBLNR)
- Plant Codes (WERKS)
- Quantity fields
- Operational units

## Prototype Implementation

The prototype simulates a structured OData JSON export containing:
- material document IDs
- fuel quantities
- operational units
- posting dates

Example fields:
- MBLNR
- WERKS
- FUEL_TYPE
- QUANTITY
- UNIT

## Known Real-World Complexity

Real SAP exports are difficult because:
- plant codes require lookup tables
- field names vary by implementation
- units are inconsistent
- localization introduces multilingual headers

For the prototype, I intentionally assumed a partially standardized export layer to focus on normalization and review workflows.

---

# 2. Utility Electricity Data

## Real-World Research

Facilities teams commonly obtain electricity data through:
- utility CSV exports
- Green Button exports
- billing portals
- manually maintained spreadsheets

Common fields:
- account_id
- usage_kwh
- billing_period
- meter_id

## Prototype Implementation

The prototype handles CSV-style electricity records containing:
- meter usage
- billing periods
- energy units

## Known Real-World Complexity

Utility billing periods rarely align perfectly with calendar months.

For simplicity, emissions are attributed to:
- billing_period_end

rather than prorating across months.

The prototype intentionally avoids:
- tariff complexity
- demand charges
- interval-level energy modeling

---

# 3. Corporate Travel Data

## Real-World Research

Corporate travel systems such as:
- SAP Concur
- Navan

commonly expose:
- employee travel records
- booking metadata
- transportation categories

## Prototype Implementation

The prototype supports:
- AIR
- HOTEL
- GROUND

travel categories.

Flights use:
- distance-based emissions logic

Hotels use:
- night-based emissions assumptions

## Known Real-World Complexity

Actual travel emissions modeling is significantly more complex due to:
- cabin class differences
- radiative forcing
- regional hotel intensity
- airport geolocation logic

For the prototype:
- airport geolocation was intentionally omitted
- distance_km is assumed to be provided by the upstream travel source

This allowed the implementation to focus on:
- ingestion architecture
- normalization workflows
- analyst review experience
