import { readFileSync } from "node:fs";

import type { ReportSourceReference } from "./report.types";

export type Nis2CalibrationReviewStatus = "source_approved" | "requires_product_legal_review";
export type Nis2CalibrationTreatment = "neutral_default" | "weighted";

export interface Nis2ReadinessCalibrationFactor {
  key: string;
  dimension:
    | "proportionality"
    | "entityCriticality"
    | "sizeStructure"
    | "likelihood"
    | "severity"
    | "societalEconomicImpact";
  label: string;
  weight: number | null;
  treatment: Nis2CalibrationTreatment;
  reviewStatus: Nis2CalibrationReviewStatus;
  sourceReferenceIds: string[];
  sourceReferences: ReportSourceReference[];
  rationale: string;
}

export interface Nis2ReadinessScoreSeparationPolicy {
  readinessScore: string;
  evidenceConfidence: string;
  legalApplicability: string;
  sourceReferenceIds: string[];
  rationale: string;
}

export interface Nis2ReadinessCalibration {
  schemaVersion: "puresoc.nis2_readiness_calibration.v1";
  calibrationVersion: string;
  frameworkKey: "nis2";
  status: Nis2CalibrationReviewStatus;
  reviewStatus: Nis2CalibrationReviewStatus;
  lastReviewedAt?: string | null;
  sourceReferences: ReportSourceReference[];
  scoreSeparationPolicy: Nis2ReadinessScoreSeparationPolicy;
  factors: Nis2ReadinessCalibrationFactor[];
}

export interface InternalReadinessCalibrationMetadata {
  calibrationVersion: string;
  reviewStatus: Nis2CalibrationReviewStatus;
  status: Nis2CalibrationReviewStatus;
  sourceReferences: ReportSourceReference[];
  scoreSeparationPolicy: Nis2ReadinessScoreSeparationPolicy;
  factors: Array<{
    key: string;
    dimension: Nis2ReadinessCalibrationFactor["dimension"];
    label: string;
    weight: number | null;
    treatment: Nis2CalibrationTreatment;
    reviewStatus: Nis2CalibrationReviewStatus;
    sourceReferenceIds: string[];
    rationale: string;
  }>;
}

const calibrationDataUrl = new URL(
  "../../../data/regulatory/scoring/nis2-readiness-calibration.v1.json",
  import.meta.url
);

let cachedCalibration: Nis2ReadinessCalibration | null = null;

export const loadNis2ReadinessCalibration = (): Nis2ReadinessCalibration => {
  if (!cachedCalibration) {
    cachedCalibration = validateNis2ReadinessCalibration(
      JSON.parse(readFileSync(calibrationDataUrl, "utf8")) as unknown
    );
  }

  return cachedCalibration;
};

export const loadNis2ReadinessCalibrationMetadata = (): InternalReadinessCalibrationMetadata => {
  const calibration = loadNis2ReadinessCalibration();
  return {
    calibrationVersion: calibration.calibrationVersion,
    reviewStatus: calibration.reviewStatus,
    status: calibration.status,
    sourceReferences: calibration.sourceReferences,
    scoreSeparationPolicy: calibration.scoreSeparationPolicy,
    factors: calibration.factors.map((factor) => ({
      key: factor.key,
      dimension: factor.dimension,
      label: factor.label,
      weight: factor.weight,
      treatment: factor.treatment,
      reviewStatus: factor.reviewStatus,
      sourceReferenceIds: factor.sourceReferenceIds,
      rationale: factor.rationale
    }))
  };
};

export const validateNis2ReadinessCalibration = (value: unknown): Nis2ReadinessCalibration => {
  const calibration = objectField(value, "calibration");
  const schemaVersion = stringField(calibration.schemaVersion, "schemaVersion");
  if (schemaVersion !== "puresoc.nis2_readiness_calibration.v1") {
    throw new Error("NIS2 readiness calibration schemaVersion is invalid.");
  }
  const frameworkKey = stringField(calibration.frameworkKey, "frameworkKey");
  if (frameworkKey !== "nis2") {
    throw new Error("NIS2 readiness calibration frameworkKey must be nis2.");
  }

  const sourceReferences = sourceReferencesField(calibration.sourceReferences, "sourceReferences");
  const scoreSeparationPolicy = scoreSeparationPolicyField(calibration.scoreSeparationPolicy);
  const factors = arrayField(calibration.factors, "factors").map((entry, index) =>
    calibrationFactorField(entry, `factors[${index}]`)
  );
  const dimensions = new Set<Nis2ReadinessCalibrationFactor["dimension"]>(factors.map((factor) => factor.dimension));
  const requiredDimensions = [
    "proportionality",
    "entityCriticality",
    "sizeStructure",
    "likelihood",
    "severity",
    "societalEconomicImpact"
  ] as const;
  for (const requiredDimension of requiredDimensions) {
    if (!dimensions.has(requiredDimension)) {
      throw new Error(`NIS2 readiness calibration missing required dimension: ${requiredDimension}`);
    }
  }

  return {
    schemaVersion: "puresoc.nis2_readiness_calibration.v1",
    calibrationVersion: stringField(calibration.calibrationVersion, "calibrationVersion"),
    frameworkKey: "nis2",
    status: reviewStatusField(calibration.status, "status"),
    reviewStatus: reviewStatusField(calibration.reviewStatus, "reviewStatus"),
    lastReviewedAt: optionalStringOrNullField(calibration.lastReviewedAt, "lastReviewedAt"),
    sourceReferences,
    scoreSeparationPolicy,
    factors
  };
};

const calibrationFactorField = (value: unknown, fieldName: string): Nis2ReadinessCalibrationFactor => {
  const factor = objectField(value, fieldName);
  const sourceReferences = sourceReferencesField(factor.sourceReferences, `${fieldName}.sourceReferences`);
  const sourceReferenceIds = stringArrayField(factor.sourceReferenceIds, `${fieldName}.sourceReferenceIds`);
  const rationale = stringField(factor.rationale, `${fieldName}.rationale`);
  const weight = numericWeightOrNullField(factor.weight, `${fieldName}.weight`);

  if (sourceReferences.length === 0 || sourceReferenceIds.length === 0) {
    throw new Error(`${fieldName} must include source references.`);
  }
  if (rationale.length === 0) {
    throw new Error(`${fieldName} must include a rationale.`);
  }
  if (typeof weight === "number" && (sourceReferences.length === 0 || sourceReferenceIds.length === 0 || rationale.length === 0)) {
    throw new Error(`${fieldName} numeric weight must be source-backed with rationale.`);
  }

  return {
    key: stringField(factor.key, `${fieldName}.key`),
    dimension: dimensionField(factor.dimension, `${fieldName}.dimension`),
    label: stringField(factor.label, `${fieldName}.label`),
    weight,
    treatment: treatmentField(factor.treatment, `${fieldName}.treatment`),
    reviewStatus: reviewStatusField(factor.reviewStatus, `${fieldName}.reviewStatus`),
    sourceReferenceIds,
    sourceReferences,
    rationale
  };
};

const scoreSeparationPolicyField = (value: unknown): Nis2ReadinessScoreSeparationPolicy => {
  const policy = objectField(value, "scoreSeparationPolicy");
  return {
    readinessScore: stringField(policy.readinessScore, "scoreSeparationPolicy.readinessScore"),
    evidenceConfidence: stringField(policy.evidenceConfidence, "scoreSeparationPolicy.evidenceConfidence"),
    legalApplicability: stringField(policy.legalApplicability, "scoreSeparationPolicy.legalApplicability"),
    sourceReferenceIds: stringArrayField(policy.sourceReferenceIds, "scoreSeparationPolicy.sourceReferenceIds"),
    rationale: stringField(policy.rationale, "scoreSeparationPolicy.rationale")
  };
};

const sourceReferencesField = (value: unknown, fieldName: string): ReportSourceReference[] =>
  arrayField(value, fieldName).map((entry, index) => {
    const source = objectField(entry, `${fieldName}[${index}]`);
    return {
      sourceRecordId: stringField(source.sourceRecordId, `${fieldName}[${index}].sourceRecordId`),
      title: optionalStringField(source.title, `${fieldName}[${index}].title`),
      jurisdiction: stringField(source.jurisdiction, `${fieldName}[${index}].jurisdiction`),
      sourceUrl: optionalStringField(source.sourceUrl, `${fieldName}[${index}].sourceUrl`),
      sourceVersion: optionalStringField(source.sourceVersion, `${fieldName}[${index}].sourceVersion`),
      article: optionalStringField(source.article, `${fieldName}[${index}].article`),
      paragraph: optionalStringField(source.paragraph, `${fieldName}[${index}].paragraph`),
      annex: optionalStringField(source.annex, `${fieldName}[${index}].annex`),
      nationalReference: optionalStringField(source.nationalReference, `${fieldName}[${index}].nationalReference`),
      sourceLocation: optionalStringField(source.sourceLocation, `${fieldName}[${index}].sourceLocation`),
      fieldKey: optionalStringField(source.fieldKey, `${fieldName}[${index}].fieldKey`),
      label: optionalStringField(source.label, `${fieldName}[${index}].label`)
    };
  });

const objectField = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`);
  }

  return value as Record<string, unknown>;
};

const arrayField = (value: unknown, fieldName: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  return value;
};

const stringField = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
};

const optionalStringField = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string when provided.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalStringOrNullField = (value: unknown, fieldName: string): string | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }

  return optionalStringField(value, fieldName);
};

const stringArrayField = (value: unknown, fieldName: string): string[] => {
  const entries = arrayField(value, fieldName).map((entry, index) => stringField(entry, `${fieldName}[${index}]`));
  if (entries.length === 0) {
    throw new Error(`${fieldName} must not be empty.`);
  }

  return entries;
};

const numericWeightOrNullField = (value: unknown, fieldName: string): number | null => {
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be null or a non-negative finite number.`);
  }

  return value;
};

const reviewStatusField = (value: unknown, fieldName: string): Nis2CalibrationReviewStatus => {
  if (value === "source_approved" || value === "requires_product_legal_review") {
    return value;
  }

  throw new Error(`${fieldName} must be a supported calibration review status.`);
};

const treatmentField = (value: unknown, fieldName: string): Nis2CalibrationTreatment => {
  if (value === "neutral_default" || value === "weighted") {
    return value;
  }

  throw new Error(`${fieldName} must be a supported calibration treatment.`);
};

const dimensionField = (value: unknown, fieldName: string): Nis2ReadinessCalibrationFactor["dimension"] => {
  if (
    value === "proportionality" ||
    value === "entityCriticality" ||
    value === "sizeStructure" ||
    value === "likelihood" ||
    value === "severity" ||
    value === "societalEconomicImpact"
  ) {
    return value;
  }

  throw new Error(`${fieldName} must be a supported calibration dimension.`);
};
