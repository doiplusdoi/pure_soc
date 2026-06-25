# Country Packs Plan

The product constitution requires first-class Romania, Poland, and Germany launch jurisdictions with English, Romanian, Polish, and German localization. The current repository has a strong Romania source-mapping foundation and demo Poland/Germany packs, but none of the launch country packs should be treated as legally active production content yet.

## Current Implementation

Current foundations:

- Provider-neutral country-pack core.
- EU-wide country-pack structure.
- Romania NIS2 package under `code/packages/compliance/nis2/country-packs/ro`.
- Romania workbook extraction, source maps, classification logic, notification package primitives, and tests.
- Poland and Germany demo country-pack definitions with official source metadata.
- Generic NIS2 onboarding and classification service for Romania, Poland, and Germany.
- Product facade routes exposing country packs and onboarding/classification flows.

Current constraints:

- Romania legal/product activation is open.
- Poland and Germany packs are demo/review-required and need real legal-source extraction.
- Shared locale support currently covers `en` and `ro`, not `pl` and `de`.
- Current classification outcomes must be normalized to the constitution outcome model.
- Country-pack content and product copy must remain review-gated.

## Target Country-Pack Contract

Each country pack should include:

- Country code and jurisdiction metadata.
- Pack version, status, effective dates, and review status.
- Source documents with citations, extraction metadata, and source maps.
- Localized terminology for English and the local language.
- Sector rules and size thresholds.
- Special designation rules.
- Registration requirements.
- Authority directory and contact metadata.
- Incident reporting thresholds, stages, deadlines, and required fields.
- Control mappings and evidence expectations.
- Report templates and disclaimers.
- Reviewed-by and approved-at metadata.
- Impact analysis from previous pack versions.

## Classification Outcomes

All country packs should produce normalized outcomes:

- `LIKELY_ESSENTIAL_OR_EQUIVALENT`
- `LIKELY_IMPORTANT_OR_EQUIVALENT`
- `LIKELY_OUT_OF_SCOPE`
- `SPECIAL_DESIGNATION_POSSIBLE`
- `INSUFFICIENT_INFORMATION`
- `REQUIRES_PROFESSIONAL_REVIEW`
- `OVERRIDDEN_BY_REVIEW`

Country-specific legal terms can be displayed in localized UI and reports, but the stored product outcome should use the normalized enum.

## Localization Target

Launch locales:

- `en`
- `ro`
- `pl`
- `de`

Localization applies to:

- UI labels and workflow copy.
- Country-pack terminology.
- Classification explanations.
- Evidence requirements.
- Notifications.
- Report templates.
- Legal caveats and professional-review warnings.

Fallback rules must be explicit. Missing localized legal or regulatory copy should not silently display as approved production text.

## Implementation Sequence

1. **Country-pack schema upgrade**
   - Add version, status, effective dates, source review metadata, authority data, incident rules, localized terms, and impact-analysis fields.
   - Keep existing Romania source maps intact.

2. **Outcome normalization**
   - Add the constitution outcome enum.
   - Map existing Romania/generic outcomes to normalized outcomes.
   - Preserve historical classification outputs with country-pack version references.

3. **Locale framework**
   - Extend shared locale support to `en`, `ro`, `pl`, and `de`.
   - Add missing-locale detection tests.
   - Keep unreviewed legal copy visibly draft/review-required.

4. **Romania activation preparation**
   - Convert current workbook-derived data into the upgraded country-pack contract.
   - Add product/legal approval metadata fields.
   - Do not mark active until review is completed outside the codebase.

5. **Poland full pack**
   - Add source ingestion workflow and source maps.
   - Implement classification rules, authority data, registration rules, incident rules, report template, and tests.
   - Keep review-required until approved.

6. **Germany full pack**
   - Add source ingestion workflow and source maps.
   - Implement classification rules, authority data, registration rules, incident rules, report template, and tests.
   - Keep review-required until approved.

7. **Cross-country workflow**
   - Add jurisdiction-specific setup questions only through country-pack data.
   - Add impact analysis when country-pack versions change.
   - Add reports that cite country-pack version and source maps.

8. **Incident reporting support**
   - Encode country-specific reporting clocks and stages.
   - Generate incident package checklists and report exports.
   - Require human review before any regulator-facing submission.

## Guardrails

- Do not hardcode Romania, Poland, or Germany regulatory behavior in generic EU core.
- Do not mark a country pack active without review metadata.
- Do not claim legal advice or certification.
- Do not send DNSC, BSI, Polish authority, or other regulator submissions automatically.
- Do not use unreviewed localized text in production reports without a draft/review label.

