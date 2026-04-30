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
  it("documents the restrained product UI direction with OKLCH tokens", () => {
    const css = renderPureSocDesignSystemCss();

    expect(pureSocDesignSystemDecision.register).toBe("product");
    expect(pureSocDesignSystemDecision.primarySurface).toBe("operational_console");
    expect(pureSocDesignSystemDecision.colorStrategy).toBe("restrained");
    expect(css).toContain("oklch(");
    expect(css).not.toContain("#fff");
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
