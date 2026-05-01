# ADR-015: Internal Readiness Scoring Calibration

Status: accepted for M13 provisional implementation

Date: 2026-05-01

## Context

PureSOC reports must describe internal readiness, not legal certification. The M13 catalog expansion needs a score model that is useful for dashboards and plans while staying conservative until product/legal calibration is complete.

## Decision

Use a provisional PureSOC internal-readiness score label everywhere a readiness score is exposed. The current dashboard score is a weighted internal operating metric:

- technical posture: 35%
- process/checklist posture: 25%
- evidence completeness: 25%
- country-pack completeness: 15%

Control status scoring is conservative:

- `passing` and `not_applicable`: 100
- `accepted_risk`: 75
- `partial`: 50
- `needs_evidence`: 35
- `unsupported`: 25
- `failing` and `not_started`: 0

Accepted risk is not treated as an open gap, but it does not receive full readiness credit. Stale evidence does not satisfy an evidence requirement.

## Consequences

The score can support internal prioritization without implying certification. Product/legal still need to approve final weighting, evidence freshness windows, and customer-facing score copy before production activation.
