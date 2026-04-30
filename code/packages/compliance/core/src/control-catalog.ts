import { readFileSync } from "node:fs";

import type {
  ComplianceControl,
  ControlCatalog,
  ControlImplementationType,
  EvidenceRequirement,
  ManualChecklistTemplate,
  ProviderControlMapping,
  SourceReference
} from "./types";

interface ControlCatalogSeed {
  schemaVersion?: string;
  frameworkKey?: "nis2";
  catalogVersion?: string;
  jurisdiction?: string;
  jurisdictionScope?: "EU" | "COUNTRY" | "EU_OVERLAY";
  controls?: RawControlSeed[];
  manualChecklistTemplates?: ManualChecklistTemplate[];
}

interface RawControlSeed {
  id?: string;
  code?: string;
  title?: string;
  description?: string;
  controlGroup?: string;
  implementationType?: ControlImplementationType;
  applicability?: ComplianceControl["applicability"];
  legalReference?: SourceReference[];
  legalReferences?: SourceReference[];
  providerMappings?: Array<Partial<ProviderControlMapping> & { canAutoRemediate?: boolean }>;
  evidenceRequired?: Array<Partial<EvidenceRequirement> & { sourceReferences?: SourceReference[] }>;
  manualChecklistTemplateIds?: string[];
  version?: string;
}

const defaultSeedUrl = new URL("../../../../data/regulatory/eu/nis2-control-catalog.seed.json", import.meta.url);

export const loadDefaultControlCatalog = (): ControlCatalog => {
  const seed = JSON.parse(readFileSync(defaultSeedUrl, "utf8")) as ControlCatalogSeed;
  return loadControlCatalogFromSeed(seed);
};

export const loadControlCatalogFromSeed = (seed: ControlCatalogSeed): ControlCatalog => {
  const catalogVersion = seed.catalogVersion ?? "unversioned";
  const controls = (seed.controls ?? []).map((control) =>
    normalizeControl(control, {
      catalogVersion,
      frameworkKey: seed.frameworkKey ?? "nis2",
      jurisdiction: seed.jurisdiction ?? "EU",
      jurisdictionScope: seed.jurisdictionScope ?? "EU"
    })
  );
  const duplicateIds = controls
    .map((control) => control.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate control ids in control catalog seed: ${[...new Set(duplicateIds)].join(", ")}`);
  }

  return {
    schemaVersion: seed.schemaVersion ?? "0.1.0",
    frameworkKey: seed.frameworkKey ?? "nis2",
    catalogVersion,
    jurisdiction: seed.jurisdiction ?? "EU",
    jurisdictionScope: seed.jurisdictionScope ?? "EU",
    controls,
    manualChecklistTemplates: seed.manualChecklistTemplates ?? []
  };
};

const normalizeControl = (
  control: RawControlSeed,
  defaults: {
    catalogVersion: string;
    frameworkKey: "nis2";
    jurisdiction: string;
    jurisdictionScope: "EU" | "COUNTRY" | "EU_OVERLAY";
  }
): ComplianceControl => {
  if (!control.id || !control.code || !control.title || !control.controlGroup || !control.implementationType) {
    throw new Error(`Control catalog seed is missing a required field for ${control.id ?? control.code ?? "unknown"}.`);
  }

  const legalReferences = normalizeSourceReferences(control.legalReferences ?? control.legalReference ?? []);

  return {
    id: control.id,
    frameworkKey: defaults.frameworkKey,
    jurisdictionScope: defaults.jurisdictionScope,
    jurisdiction: defaults.jurisdiction,
    code: control.code,
    title: control.title,
    description: control.description ?? control.title,
    controlGroup: control.controlGroup,
    legalReferences,
    applicability: control.applicability ?? "all",
    implementationType: control.implementationType,
    evidenceRequired: (control.evidenceRequired ?? []).map((requirement) =>
      normalizeEvidenceRequirement(requirement, legalReferences)
    ),
    providerMappings: (control.providerMappings ?? []).map(normalizeProviderMapping),
    manualChecklistTemplateIds: control.manualChecklistTemplateIds ?? [],
    version: control.version ?? defaults.catalogVersion,
    sourceReferences: legalReferences
  };
};

const normalizeEvidenceRequirement = (
  requirement: Partial<EvidenceRequirement>,
  controlSourceReferences: SourceReference[]
): EvidenceRequirement => {
  if (!requirement.requirementKey || !requirement.title) {
    throw new Error("Evidence requirement is missing requirementKey or title.");
  }

  return {
    requirementKey: requirement.requirementKey,
    title: requirement.title,
    description: requirement.description,
    sourceReferences: normalizeSourceReferences(requirement.sourceReferences ?? controlSourceReferences)
  };
};

const normalizeProviderMapping = (
  mapping: Partial<ProviderControlMapping> & { canAutoRemediate?: boolean }
): ProviderControlMapping => {
  if (!mapping.providerKey || !mapping.moduleKey) {
    throw new Error("Provider control mapping is missing providerKey or moduleKey.");
  }

  return {
    providerKey: mapping.providerKey,
    moduleKey: mapping.moduleKey,
    signalKeys: mapping.signalKeys ?? [],
    recommendationKeys: mapping.recommendationKeys ?? [],
    canAutoEvaluate: mapping.canAutoEvaluate ?? false,
    canAutoRemediate: false,
    licenseRequirements: mapping.licenseRequirements ?? [],
    permissionRequirements: mapping.permissionRequirements ?? []
  };
};

export const normalizeSourceReferences = (sourceReferences: readonly SourceReference[]): SourceReference[] =>
  sourceReferences.map((reference) => ({
    sourceRecordId: reference.sourceRecordId,
    article: reference.article,
    paragraph: reference.paragraph,
    annex: reference.annex,
    nationalReference: reference.nationalReference,
    sourceUrl: reference.sourceUrl,
    sourceVersion: reference.sourceVersion,
    label: reference.label
  }));

export const uniqueSourceReferences = (sourceReferences: readonly SourceReference[]): SourceReference[] => {
  const unique = new Map<string, SourceReference>();

  for (const reference of sourceReferences) {
    unique.set(
      [
        reference.sourceRecordId,
        reference.article ?? "",
        reference.paragraph ?? "",
        reference.annex ?? "",
        reference.nationalReference ?? ""
      ].join(":"),
      reference
    );
  }

  return [...unique.values()];
};
