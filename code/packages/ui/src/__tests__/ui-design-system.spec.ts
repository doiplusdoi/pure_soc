import { describe, expect, it } from "vitest";

import {
  pureSocDesignSystemDecision,
  renderCommandButton,
  renderLegalCaveat,
  renderMeter,
  renderPureSocDesignSystemCss,
  renderSourceChip,
  renderStatusPill
} from "../index";

describe("ui design system primitives", () => {
  it("documents the institutional product UI direction with proposal tokens", () => {
    const css = renderPureSocDesignSystemCss();

    expect(pureSocDesignSystemDecision.register).toBe("product");
    expect(pureSocDesignSystemDecision.primarySurface).toBe("operational_console");
    expect(pureSocDesignSystemDecision.colorStrategy).toBe("institutional_minimalism");
    expect(css).toContain("#003d9b");
    expect(css).toContain("#c3c6d6");
    expect(css).toContain("#ffffff");
    expect(css).toContain("ps-readiness-ring");
    expect(css).toContain("ps-context-panel");
    expect(css).toMatch(/\.ps-panel\s*\{\s*min-width: 0;/);
    expect(css).toMatch(/\.ps-table-wrap\s*\{\s*position: relative;[\s\S]*?max-width: 100%;[\s\S]*?overflow-x: auto;/);
    expect(css).toContain("grid-template-columns: minmax(18rem, 0.9fr) minmax(0, 1.5fr) auto;");
    expect(css).toMatch(/\.ps-tenant-banner__inner \.ps-source-chip\s*\{\s*overflow-wrap: normal;/);
    expect(css).toMatch(/\.ps-tenant-banner__inner \.ps-inline-form\s*\{[\s\S]*?grid-area: action;[\s\S]*?justify-self: end;/);
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.ps-tenant-banner__inner \.ps-inline-form\s*\{[\s\S]*?justify-self: start;/);
    expect(css).not.toContain("#000");
    expect(css).not.toContain("background-clip: text");
    expect(css).not.toContain("letter-spacing: -");
  });

  it("renders accessible primitives with escaped text and visible state classes", () => {
    expect(renderStatusPill({ label: "<review>", tone: "warning" })).toContain("&lt;review&gt;");
    expect(renderSourceChip({ label: "Stored analysis", detail: "dashboard_snapshots" })).toContain(
      "dashboard_snapshots"
    );
    expect(renderMeter({ label: "Evidence completeness", value: 73, source: "stored_analysis" })).toContain(
      'aria-valuenow="73"'
    );
    expect(
      renderCommandButton({
        label: "Review approval",
        ariaLabel: "Review approval request for MFA action",
        tone: "primary"
      })
    ).toContain('aria-label="Review approval request for MFA action"');
  });

  it("keeps legal caveats visually present instead of hiding them in metadata", () => {
    const caveat = renderLegalCaveat("Internal readiness only. not a legal opinion.");

    expect(caveat).toContain("ps-legal-caveat");
    expect(caveat).toContain("Internal readiness only");
    expect(caveat).toContain("not a legal opinion");
  });
});
