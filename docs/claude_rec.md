# PureSOC Implementation Review – Recommendations

Date: 2026-04-30
Reviewer: Claude (analysis only; no code modified)
Scope reviewed: Phase A–H code under [code/](../code/), the gap register in [docs/implementation-gaps.md](implementation-gaps.md), and the architecture inputs in [README.md](../README.md), [AGENTS.md](../AGENTS.md), and [docs/master-plan.md](master-plan.md). The most recent body of code is the Phase H compliance/recommendations slice ([code/packages/compliance/core/](../code/packages/compliance/core/), [code/packages/recommendations/](../code/packages/recommendations/), [code/apps/api/src/compliance/](../code/apps/api/src/compliance/), [code/apps/api/src/recommendations/](../code/apps/api/src/recommendations/)).

This document complements the gap register. Items already tracked there (GAP-006, GAP-009, GAP-012, GAP-020, GAP-021) are referenced rather than restated. New issues are raised as `REC-*`.

---

## 1. Top-level assessment

The architecture and contracts are in good shape:

- ADR coverage is broad (013 ADRs covering monorepo, schema, multitenancy, provider lifecycle, evidence, source activation, OIDC boundaries, etc.).
- The provider-neutral compliance engine cleanly separates evaluation, gap generation, recommendation, readiness plan, and checklist generation across small composable modules ([evaluator.ts](../code/packages/compliance/core/src/evaluator.ts), [gaps.ts](../code/packages/compliance/core/src/gaps.ts), [readiness-plan.ts](../code/packages/compliance/core/src/readiness-plan.ts), [checklist.ts](../code/packages/compliance/core/src/checklist.ts)).
- The Prisma schema in [schema.prisma](../code/packages/database/prisma/schema.prisma) is unusually complete for this stage — full coverage of providers, regulatory sources, country packs, evidence/access logs, billing, RO NIS2, and dashboards.
- Tests are runnable against in-memory adapters and exercise the end-to-end Phase H flow ([compliance-recommendations-readiness-plan-checklist.test.ts](../code/apps/api/src/__tests__/compliance-recommendations-readiness-plan-checklist.test.ts), [compliance-gaps-recommendations-readiness-plan-checklist.spec.ts](../code/packages/compliance/core/src/__tests__/compliance-gaps-recommendations-readiness-plan-checklist.spec.ts)).

The biggest risks today are (a) **a still-unwired Prisma layer** that quietly diverges from the runtime in-memory adapters, (b) **module-boundary erosion** from deep relative imports rather than workspace aliases, and (c) **a few semantic bugs in the compliance evaluator and country-pack warning logic** that would produce false positives once a real catalog and real customer data flow through. None are blockers; all are cheap to fix before the persistence layer (Phase D/I) lands.

---

## 2. High-priority recommendations

### REC-001 (High) – Persisted evaluation outputs are missing; runtime computes-and-discards

The Prisma schema models `ComplianceControlResult`, `ComplianceGap`, `ReadinessPlan`, `ReadinessPlanItem`, `ProviderRecommendation`, and `ChecklistRunItem`, but [ComplianceEvaluationService.evaluateAssessment](../code/apps/api/src/compliance/service.ts#L42) recomputes everything from the static seed and the provider store on every call and returns the result transiently. There is no write path, so:

- Each evaluate call regenerates IDs (`[assessmentId, controlId, jurisdiction].join(":")`), so consumers cannot link future actions or evidence to a stable result.
- Audit, evidence linkage, dashboards, and billing entitlements (which all reference `assessmentId`/`controlResultId`) cannot be wired without storing these.
- The "stored analysis" source promised by [ADR-012](adr/ADR-012-dashboard-aggregation-and-report-data-contracts.md) cannot be honored.

**Recommendation:** Before Phase I, define a `ComplianceResultRepository` interface in `packages/compliance/core` (returning the same TS contracts) and pair it with an in-memory implementation now and a Prisma implementation later. This keeps the slice testable while removing the silent "compute-and-throw-away" behavior. Track alongside [GAP-020](implementation-gaps.md#L219).

### REC-002 (High) – Control IDs are strings in code but UUIDs in the schema

The seed catalog uses logical string IDs like `"nis2.access-control.mfa"` ([seed](../code/data/regulatory/eu/nis2-control-catalog.seed.json#L57)). These IDs flow through `ComplianceControlResult.controlId`, `ComplianceGap.controlId`, `ReadinessPlanItem.controlId`, `ProviderRecommendation.controlId`. But in [schema.prisma](../code/packages/database/prisma/schema.prisma#L1080) every one of those columns is declared `String @db.Uuid`. The first attempt to write a real evaluation through Prisma will fail at the database boundary.

**Recommendation:** Pick one of:
1. Keep logical string IDs (preferred — they are stable across catalog versions and human-readable in audit logs) and change the Prisma columns to `String` with the `control_catalog.code` becoming the canonical reference, OR
2. Introduce a `controlCatalogId` UUID in the catalog loader and map seed string IDs to UUIDs at load time.

Option 1 is simpler and matches the way `ControlCatalog.code` already works. Either way, add a contract test that asserts the in-memory ID format matches the column type before the Prisma adapter lands.

### REC-003 (High) – `countryPackWarningsFromStatus` swallows the `requires_legal_review` state

[evaluator.ts:55-59](../code/packages/compliance/core/src/evaluator.ts#L55-L66):

```ts
if (
  warnings.length === 0 &&
  input.completeness &&
  !["full_pack_ready", "requires_legal_review"].includes(input.completeness)
) {
  warnings.push(...)
}
```

A pack in `requires_legal_review` is precisely the state that **should** raise a warning per [ADR-011](adr/ADR-011-regulatory-source-activation-lifecycle.md) and [GAP-006](implementation-gaps.md#L76); putting it in the negative list silences it. `full_pack_ready` correctly suppresses the warning; `requires_legal_review` should not.

**Recommendation:** Drop `requires_legal_review` from the negation list and add a regression test that asserts a `requires_legal_review` pack produces a country-pack warning even with no `unsupportedFeatures`.

### REC-004 (High) – Evaluator can mark a control `passing` purely from absence of input

[resolveStatus](../code/packages/compliance/core/src/evaluator.ts#L204-L243) returns `"passing"` whenever (a) no findings are open, (b) no missing evidence, (c) no incomplete manual tasks, (d) no country-pack warnings — **provided** the control has either provider mappings or evidence requirements. With `evidenceArtifacts: []`, `missingEvidence` is non-empty (so we fall into `needs_evidence`) — that's fine — but as soon as the caller passes any single matching evidence artifact, `passing` is returned regardless of whether a provider sync ever ran successfully for that mapping. There is no equivalent of `"insufficient_signal"` or `"unscanned"`.

**Recommendation:** Either (a) fold `ProviderCapability.status` into evaluation so a control whose mapped module is `missing_permission` / `unavailable_license` reports `unsupported` instead of `passing`, or (b) require that at least one mapped module has a successful sync run before promoting to `passing`. Otherwise the engine will report posture as good when it is silent. This would be a credibility hit at customer-demo time.

### REC-005 (High) – Untrusted `gaps` array in recommendations route bypasses tenant scoping

[recommendations/routes.ts](../code/apps/api/src/recommendations/routes.ts#L31-L38) accepts `body.gaps` and casts it to `ComplianceGap[]` with no validation, then passes them straight to `services.recommendations.generate({ organizationId, gaps })`. Because each `ComplianceGap` carries its own `organizationId` and `assessmentId` (and these flow through into recommendation IDs and source references), a caller could submit gaps with arbitrary `organizationId`/`assessmentId` strings that don't match the path organization. Today this is in-memory and the tenant guard happens via `requireOrganizationRole` on the path org — but the produced recommendations are still emitted with whatever fields the body declared.

**Recommendation:**
1. Validate the body shape with a typed parser (zod or hand-written guard); reject anything missing required fields.
2. Force `gap.organizationId` to equal the path `organizationId` server-side (or 400 on mismatch).
3. Add an integration test that sends a gap with a wrong `organizationId` and asserts a 400 (not a happy 200 with the wrong org leaked into source references).

### REC-006 (High) – Workspace package names exist but nothing imports them

Every package declares an `@puresoc/*` name and an `exports` field ([compliance-core](../code/packages/compliance/core/package.json), [providers-core](../code/packages/providers/core/package.json), etc.), yet the entire codebase imports through deep relative paths like `"../../../../packages/compliance/core/src/index"` (40+ occurrences across [code/apps/](../code/apps/) and [code/packages/](../code/packages/), see grep above). Concrete consequences:

- TypeScript cannot enforce the package boundary: `compliance/core` reaches into `providers/core/src/index` directly ([evaluator.ts:1](../code/packages/compliance/core/src/evaluator.ts#L1)), which sidesteps `exports`.
- Refactors that move files inside a package break consumers.
- The Prisma client (when added in [GAP-020](implementation-gaps.md#L219)) will sit behind `@puresoc/database`, but everything will still reach into `packages/database/src/...` directly.
- Cross-package circulars become invisible.

**Recommendation:** Add `@puresoc/*` workspace dependencies to each consuming `package.json`, switch the imports project-wide, and add an ESLint `no-restricted-imports` rule banning relative paths that escape the package root. Best done as one mechanical pass before persistence is wired.

### REC-007 (High) – Severity types diverge between schema, providers, and recommendations

Three not-quite-aligned severity types are in flight:

| Layer | Type | Allows `informational`? |
|---|---|---|
| [Prisma `FindingSeverity` enum](../code/packages/database/prisma/schema.prisma#L60) | enum | yes |
| [`compliance/core` `GapSeverity`](../code/packages/compliance/core/src/types.ts#L13) | `Exclude<FindingSeverity,"informational">` | no |
| [`recommendations` `RecommendationSeverity`](../code/packages/recommendations/src/recommendation.types.ts#L3) | `"low"\|"medium"\|"high"\|"critical"` | no |
| [`providers/core` `ProviderRecommendationInput.severity`](../code/packages/providers/core/src/resources.ts#L152) | `Exclude<...,"informational">` | no |

The Prisma `provider_recommendations.severity` is `FindingSeverity`, so the database accepts `informational` for a recommendation that no TS layer can produce. The same is true for `compliance_gaps.severity`. This will surface as a runtime error the first time a row written by an out-of-band script (or a future feature) round-trips through the API.

**Recommendation:** Introduce a single `Severity` type in `@puresoc/shared` and either (a) keep `informational` everywhere and have the engine downgrade-or-suppress, or (b) split the enum into `FindingSeverity` (with informational) and `ActionableSeverity` (without) and use the right one in each Prisma column. Document the decision in an ADR.

---

## 3. Medium-priority recommendations

### REC-008 (Medium) – Silent-cast inputs to `evaluateAssessment` defeat type safety

[compliance/routes.ts:38-39](../code/apps/api/src/compliance/routes.ts#L38-L39) does:

```ts
evidenceArtifacts: Array.isArray(body.evidenceArtifacts) ? (body.evidenceArtifacts as never[]) : undefined,
manualTasks: Array.isArray(body.manualTasks) ? (body.manualTasks as never[]) : undefined,
```

`as never[]` then flows into `EvidenceArtifactState[]` and `ManualChecklistItemState[]` without any field validation. Treat this the same as REC-005: validate or reject. Pair with REC-005 in a single "input-hardening" pass.

### REC-009 (Medium) – Type duplication in readiness-plan and recommendations

[`RecommendationLike`](../code/packages/compliance/core/src/readiness-plan.ts#L4-L17) is a partial copy of [`RecommendationContract`](../code/packages/recommendations/src/recommendation.types.ts#L16-L36) declared inside `compliance/core` to avoid the dependency on `recommendations`. The two structurally agree today but will drift (`RecommendationContract` has `expectedChange`, `blastRadius`, `manualFallback`; `RecommendationLike` does not — so readiness plans cannot surface those even if they are present).

**Recommendation:** Extract a small `@puresoc/shared` type module (or a new `packages/recommendations/contracts` subpath) that both packages import, removing the manual copy. Bonus: it removes `compliance/core`'s ad-hoc cross-package import of `providers/core`'s `ProviderFinding` ([evaluator.ts:1](../code/packages/compliance/core/src/evaluator.ts#L1)) by pulling `ProviderFindingSummary` into shared types.

### REC-010 (Medium) – `ComplianceGap` loses provider finding identity

[gaps.ts:38](../code/packages/compliance/core/src/gaps.ts#L38) maps matched findings into `findings: result.matchedFindings.map((finding) => finding.summary || finding.title)` — a `string[]` of human text. Downstream (readiness plan items, recommendations, evidence linkage), there is no way to navigate back to the original `ProviderFinding.id`. The same applies to `manualTasks: string[]` and `countryPackWarnings: string[]`.

**Recommendation:** Keep ID lists alongside the human strings (`findingIds: string[]`, `manualTaskIds: string[]`). Otherwise evidence-vault back-references and audit drilldowns will not work without re-running the evaluation. Aligns with [ADR-008](adr/ADR-008-evidence-storage-metadata-and-export-model.md)'s evidence-link contract.

### REC-011 (Medium) – Compliance evaluation does not write to the audit log

The service receives an `actorUserId` from the session and an `auditContext(context)` helper is even imported, but [compliance/routes.ts:63](../code/apps/api/src/compliance/routes.ts#L63) returns `Record<string, never>` and nothing is written. [ADR-008](adr/ADR-008-evidence-storage-metadata-and-export-model.md) lists evaluations as auditable events; the recommendations route is also silent. The audit infrastructure (`AuditWriter`, `InMemoryAuditSink`) is already wired into other services (auth, organizations, provider connections), so this is a gap in coverage, not in capability.

**Recommendation:** Audit `compliance.assessment.evaluated` and `compliance.recommendations.generated` with `actorUserId`, `assessmentId`, and a small summary (`controlsEvaluated`, `gapsCount`, `recommendationsCount`). Same change unlocks billing entitlement metering later.

### REC-012 (Medium) – HTTP `202 Accepted` for a synchronous evaluation

[compliance/routes.ts:30](../code/apps/api/src/compliance/routes.ts#L30) returns `statusCode: 202` even though the body of the same response carries the full evaluation result. `202` semantically promises "accepted, processing later" — which would matter the moment evaluation moves into a worker job. Today it is misleading; a client that polls a Location header will not find one.

**Recommendation:** Return `200` for the synchronous form. When the work moves to BullMQ, switch back to `202` with a `runId`/`Location` header and a separate `GET /compliance/assessments/:runId` route.

### REC-013 (Medium) – Manual-checklist generation runs even when `manualTasks` is supplied

[ComplianceEvaluationService.evaluateAssessment](../code/apps/api/src/compliance/service.ts#L50-L67) always calls `generateManualChecklistItems` and passes `input.manualTasks ?? generatedChecklistItems` to the evaluator. When the caller supplies `manualTasks`, the generated `checklistItems` are still computed and returned in the response payload but never used in the evaluation — wasted CPU and a confusing API surface (consumers see two disjoint lists).

**Recommendation:** Compute `generatedChecklistItems` only when `input.manualTasks` is absent, or split the route into "evaluate" and "preview-checklist". Document the precedence in the OpenAPI contract.

### REC-014 (Medium) – Catalog seed has only three controls

[nis2-control-catalog.seed.json](../code/data/regulatory/eu/nis2-control-catalog.seed.json) covers risk policy, MFA, incident handling. This is fine for the Phase H slice, but every test now hard-codes `"nis2.access-control.mfa"`/`"nis2.risk-policy"`, which means catalog expansion will need test-fixture updates everywhere. Already tracked as [GAP-021](implementation-gaps.md#L241), but the recommendation here is **about test architecture**:

**Recommendation:** Replace control-id literals in tests with helpers like `expectControl(catalog, "access-control.mfa")` so the assertions describe intent and survive ID renames. This is cheap to do now, expensive once 50+ controls exist.

### REC-015 (Medium) – Readiness plan target hard-coded to 100%

[readiness-plan.ts:38](../code/packages/compliance/core/src/readiness-plan.ts#L38) sets `targetReadinessPercent: 100`. The product framing is "internal readiness, not certification" — a hard 100% target may not be the right primitive. It also conflicts with future "accepted-risk" controls counting against the score.

**Recommendation:** Make the target configurable per organization (default 100) and document with product/legal what the score actually measures. Cross-references [GAP-021](implementation-gaps.md#L241) calibration work.

### REC-016 (Medium) – `confidence` heuristic collapses to `medium`

[resolveConfidence](../code/packages/compliance/core/src/evaluator.ts#L245-L263) returns `medium` for almost every state except `failing-with-findings` (high) and `country-pack-warning-with-no-findings` (low). A control marked `passing` with strong provider signal vs `passing` with no signal both report `medium`.

**Recommendation:** Either drop `confidence` until product/legal define what it means, or expand it to use `ProviderCapability.status` (proper signal vs `missing_permission` vs `unsupported_api`). Today it is decorative.

### REC-017 (Medium) – Compliance-core's reach into providers-core is a layering violation

[evaluator.ts:1](../code/packages/compliance/core/src/evaluator.ts#L1) imports `ProviderFinding` from `providers/core`. The master plan principle in [AGENTS.md:15](../AGENTS.md#L15) is "the compliance engine is provider-neutral". The current code keeps the *logic* neutral but the *types* leak. A future provider that does not match the `ProviderFinding` shape (e.g. an EDR vendor's webhook) will require shoehorning.

**Recommendation:** Define a neutral `ProviderFindingForCompliance` interface inside `compliance/core` (just the fields the evaluator actually reads — `providerKey`, `moduleKey`, `findingKey`, `severity`, `status`, `evidence`) and adapt provider-core findings to it at the API boundary. The Microsoft/Google connectors then conform their outputs to that interface; the engine stops depending on `providers/core` types entirely.

---

## 4. Lower-priority / housekeeping

### REC-018 (Low) – Dead `auditContext` helper

[compliance/routes.ts:63](../code/apps/api/src/compliance/routes.ts#L63) is dead code that returns an empty object. Remove it as part of REC-011 or sooner.

### REC-019 (Low) – Recommendations route does not accept `providerRecommendations`

[recommendations/routes.ts](../code/apps/api/src/recommendations/routes.ts#L33-L36) only forwards `gaps`, but the underlying `RecommendationApiService.generate` ([service.ts:14-22](../code/apps/api/src/recommendations/service.ts#L14-L22)) supports `providerRecommendations`. A caller that wants to enrich gap-only recommendations with provider-supplied ones cannot. Either expose the field or drop it from the service signature.

### REC-020 (Low) – `parseCountryPack` validates only one field

[compliance/routes.ts:46-61](../code/apps/api/src/compliance/routes.ts#L46-L61) only checks `countryCode` exists. `completeness` is not validated against the enum, `unsupportedFeatures[].featureKey`/`reason` are not enforced. Tighten when input-validation pass happens (REC-005).

### REC-021 (Low) – `dueDateForSeverity` returns a date string but the schema column is `DateTime`

[readiness-plan.ts:113-118](../code/packages/compliance/core/src/readiness-plan.ts#L113-L118) emits `YYYY-MM-DD`; [Prisma `ReadinessPlanItem.dueDate`](../code/packages/database/prisma/schema.prisma#L1143) is `DateTime?`. The Prisma client will accept the string but it conflates date and timestamp semantics. Pick one (date-only is the right semantic for SLA-style due dates) and reflect it in the schema as `Date` via Prisma's `@db.Date` mapping.

### REC-022 (Low) – `RecommendationLike.automationMode` covers four values; `actionTypeForGap` falls back to `process` for non-evidence/non-technical gaps

[readiness-plan.ts:100-110](../code/packages/compliance/core/src/readiness-plan.ts#L100-L110) returns `process` whenever there are no missing evidence and no provider signals. A pure country-pack-warning gap therefore appears as a "process" item even though the recommendation generator typed it as `guided`. Two paths disagree on the same gap.

**Recommendation:** Only one component should pick the action type; have readiness-plan defer to the recommendation when present (already done) and make the fallback `manual` instead of `process` for unmapped/unsupported gaps. Add a unit test for the country-pack-only gap path.

### REC-023 (Low) – `ProviderRecommendationLike.sourceReferences` typed as `Record<string, unknown>[]`

[generator.ts:39](../code/packages/recommendations/src/generator.ts#L39) widens `sourceReferences` to `Record<string, unknown>[]` and reconstructs the typed `SourceReference` via [`sourceReferencesFromUnknown`](../code/packages/recommendations/src/generator.ts#L154-L168). This is a workaround for the upstream `ProviderRecommendation.sourceReferences?: Record<string, unknown>[]` in `providers/core`. Tighten that type once REC-009's shared module exists; the runtime narrowing helper becomes redundant.

### REC-024 (Low) – Test coverage holes around error paths

The Phase H tests assert happy paths. Missing:
- Unauthenticated POST → 401 (currently surfaces via `toJsonResultError` but not asserted).
- Cross-organization compliance evaluation → 403 (covered for member listing, not for compliance/recommendations).
- Empty provider connection (no findings, no evidence) → all controls in `needs_evidence`/`partial`, none in `passing` (relevant to REC-004).
- `requires_legal_review` country pack → warning emitted (relevant to REC-003).

Adding these prevents regressions when REC-004 / REC-003 land.

### REC-025 (Low) – `MEMORY.md`-style runtime registry could replace `createApiServices`

[auth/services.ts](../code/apps/api/src/auth/services.ts) instantiates everything by hand. As the service count grows (compliance, recommendations, billing, evidence, reports, dashboards), this will become a long, order-sensitive list. A small DI primitive (or even an `Awilix`/`tsyringe` container) plus per-test overrides will make `createApiServices({ now, microsoft365: mockClient })` style overrides cleaner than the current option-prop drilling.

Optional — only worth doing if Phase I service count grows.

### REC-026 (Low) – README does not list the Phase H/Phase G additions

[README.md:23-29](../README.md#L23-L29) lists "Phase A workspace skeleton" as the latest state. After Phase H, the read-out is no longer accurate. Update once per phase to keep onboarding signal high; this is doc hygiene, not architecture.

---

## 5. ADR / process gaps observed

- **ADR-014 candidate** – Workspace import policy and module boundary (REC-006).
- **ADR-015 candidate** – Severity enum unification (REC-007).
- **ADR-016 candidate** – Evaluation persistence strategy (REC-001/REC-002).
- **GAP-022 candidate (new)** – Compliance evaluation does not produce audit log entries (REC-011).
- **GAP-023 candidate (new)** – Country-pack `requires_legal_review` warning is suppressed (REC-003).
- **GAP-024 candidate (new)** – Evaluator can return `passing` from absence of provider signal (REC-004).
- **GAP-025 candidate (new)** – Compliance/recommendation routes accept untyped, non-validated bodies (REC-005, REC-008).

---

## 6. Suggested sequencing

Cheap and high-leverage, do before Phase I:
1. REC-003 + test (1-line bug, customer-visible).
2. REC-004 + test (semantic correctness; prevents false-positive readiness scores in demos).
3. REC-005, REC-008, REC-020 (input validation pass).
4. REC-011 (audit coverage; use existing `AuditWriter`).
5. REC-002 + REC-007 (resolve before Prisma is wired so the migration encodes the right types).

Medium effort, do alongside Phase I/D:
6. REC-001 (persistence repository interface).
7. REC-006 (workspace import migration; mechanical refactor).
8. REC-009 + REC-017 (shared types module; remove cross-package leakage).
9. REC-010 (preserve finding/task IDs through the gap chain).

Defer until product/legal calibration:
10. REC-014 + REC-015 + REC-016 (catalog scope, score target, confidence semantics — overlap with [GAP-021](implementation-gaps.md#L241)).

---

## 7. What this review did not check

- Microsoft 365 Graph permission accuracy beyond the documented bundle in [docs/microsoft365-permissions.md](microsoft365-permissions.md) — already tracked in [GAP-007](implementation-gaps.md#L87).
- The Romania workbook importer determinism beyond the existing tests.
- ADRs for content correctness (only for coverage and cross-references).
- Front-end / `apps/web` (out of Phase H scope; [GAP-009](implementation-gaps.md#L109) tracks design-system selection).
- Billing implementation ([GAP-012](implementation-gaps.md#L142), [GAP-017](implementation-gaps.md#L197)).
- Security review — recommend running `/security-review` on the auth and provider-consent surfaces before exposing them publicly.
