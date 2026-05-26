# TRADEOFFS.md - Scoped Features

Given the 4-day prototype window, the following items were deliberately deferred:

## 1. Automated PDF OCR for Utility Bills
**Current Implementation:** Structured JSON (simulating portal exports).
**Trade-off:** Reading PDF bills would require a tool like AWS Textract or Document AI. For the prototype, handle the data shape *after* parsing to demonstrate normalization logic.

## 2. Real-time FX Rates for Procurement
**Current Implementation:** Using fixed prices or quantity-based carbon factors.
**Trade-off:** Procurement data often involves currency conversion. I bypassed this to focus on the emissions logic, as calculating Carbon is the core requirement.

## 3. High-Granularity Air Terminal Lookup
**Current Implementation:** Using `distance_km` provided by the source.
**Trade-off:** In a real Concur integration, you get airport codes (JFK, LHR). You'd need a Haversine formula and a database of 40,000 global airports. For the prototype, I assumed the travel platform's API already provides the distance record.
