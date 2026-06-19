# PureSOC Design Register

Updated: 2026-06-19

PureSOC should feel like a quiet operational console for repeated compliance work. The interface should prioritize scanability, source visibility, route-level actions, and conservative claims over marketing composition.

## Interface Principles

- Start with the usable workflow, not a landing page.
- Use dense but readable operational layouts: side navigation, section headers, tables, meters, status pills, source chips, and clear forms.
- Keep cards for real panels or repeated items. Do not nest cards inside cards.
- Show source and boundary context near the action it affects.
- Prefer explicit disabled states over hidden controls when a role can review but not act.
- Avoid legal overclaiming in UI copy. Do not imply certification, legal approval, or guaranteed NIS2 compliance.
- Avoid one-note color themes. Use warning, success, neutral, accent, and danger tones to encode state.
- Text must fit mobile and desktop containers without overlap.

## Core Route Behaviors

- Dashboard: summary, readiness trend, onboarding entry, Microsoft connector state, gaps/recommendations, evidence/reports, and approval queue.
- Microsoft 365 connector: read-only consent and module health. Write scopes stay visibly disabled.
- Romania onboarding: short saved screens, source-mapped classification, outputs, connector handoff, gap/export path, and legal boundaries.
- Evidence and reports: internal readiness artifacts and vault metadata without exposing storage URIs.
- Notifications/settings: channel configuration and delivery logs with role-gated mutations.
- Partner console: portfolio metrics, customer creation, explicit grants, reason-gated customer entry, and current session state.

## Active Customer Banner

When a partner tenant session is active, every operational route that can show customer data must render the same banner:

- Customer name and partner name.
- Grant level when known.
- Reason and expiry.
- Statement that access is not impersonation and actions are logged with the real user.
- Exit action posting to the partner tenant-session exit route.

The banner is an operational warning, not a modal. It must not block work, but it must remain visible enough that the user cannot confuse customer context with their own workspace.

## Visual System Notes

- Shared CSS lives in `code/packages/ui/src/index.ts`.
- Route renderers live in `code/apps/web/src/operational-console.ts`.
- Route models and shared surfaces live in `code/apps/web/src/app-data.ts`.
- Active customer banner styling belongs in the shared UI package because it appears outside the partner console.
- New UI should use existing PureSOC classes before adding new design primitives.

## Responsive Expectations

- Primary routes must render on mobile without horizontal page overflow.
- Tables can scroll internally when they represent dense data.
- Forms should collapse to one column below tablet widths.
- Sticky or persistent context should not overlap navigation, headers, or form controls.
