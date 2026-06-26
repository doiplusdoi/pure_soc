import type { Nis2CountryPackDefinition } from "@puresoc/country-packs-core";
import type { ReportBranding } from "@puresoc/reports";
import type { ApiServices } from "../../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../../http";
import { requireOrganizationRole } from "../../rbac";
import {
  findNis2CountryPackDefinition,
  nis2CountryOnboardingScreens
} from "./onboarding-service";

export const getOrganizationNis2OnboardingRoute = async (
  organizationId: string,
  countryCode: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });
  const countryPack = findNis2CountryPackDefinition(countryCode);
  const state = await services.nis2Onboarding.getReadinessState({
    countryCode: countryPack.countryCode,
    organizationId
  });

  return {
    statusCode: 200,
    body: {
      ...state,
      countryPack: toCountryPackResponse(countryPack),
      legalActivation: {
        status: countryPack.status === "active" ? "active" : "review_required",
        productionActivated: countryPack.status === "active",
        reason:
          countryPack.status === "active"
            ? "Country pack is available for production readiness workflows."
            : "Country pack logic remains demo/legal-review gated; output is for internal readiness only."
      },
      screens: nis2CountryOnboardingScreens
    }
  };
};

export const saveOrganizationNis2OnboardingRoute = async (
  organizationId: string,
  countryCode: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager"]
  });
  const countryPack = findNis2CountryPackDefinition(countryCode);
  const progress = await services.nis2Onboarding.saveOnboardingProgress({
    actorUserId,
    organizationId,
    countryCode: countryPack.countryCode,
    onboardingProgressId: optionalString(body.onboardingProgressId),
    assessmentId: optionalString(body.assessmentId),
    answers: optionalRecord(body.answers) ?? {},
    completedScreens: optionalStringArray(body.completedScreens),
    currentScreen: optionalString(body.currentScreen),
    status: optionalString(body.status)
  });

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "nis2_onboarding_progress",
    targetId: progress.id,
    action: "nis2.onboarding.saved",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      countryCode: progress.countryCode,
      completedScreenCount: progress.completedScreens.length,
      currentScreen: progress.currentScreen,
      missingRequiredFieldCount: progress.missingRequiredFields.length,
      sourceVersion: progress.sourceVersion,
      status: progress.status
    }
  });

  return {
    statusCode: 200,
    body: {
      progress
    }
  };
};

export const classifyOrganizationNis2OnboardingRoute = async (
  organizationId: string,
  countryCode: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });
  const countryPack = findNis2CountryPackDefinition(countryCode);
  const result = await services.nis2Onboarding.classifyLatestOnboarding({
    actorUserId,
    countryCode: countryPack.countryCode,
    organizationId
  });

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "nis2_classification_run",
    targetId: result.classificationRun.id,
    action: "nis2.classification.created",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      countryCode: countryPack.countryCode,
      confidence: result.classification.confidence,
      legalReviewRequired: result.classification.legalReviewRequired,
      result: result.classification.result,
      sourceVersion: result.classificationRun.sourceVersion
    }
  });

  return {
    statusCode: 201,
    body: result
  };
};

export const buildOrganizationNis2OnboardingReportRoute = async (
  organizationId: string,
  countryCode: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "auditor"]
  });
  const prepared = await services.nis2Onboarding.prepareInitialReportAnalysis({
    actorUserId,
    countryCode,
    organizationId
  });
  const report = await services.reports.buildInternalReadinessReport({
    organizationId,
    actorUserId,
    assessmentId: prepared.assessmentId,
    versionContext: prepared.versionContext,
    reportBranding: await loadReportBranding(organizationId, actorUserId, services),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  if (prepared.classificationRunCreated) {
    await services.auditWriter.write({
      actorUserId,
      organizationId,
      targetType: "nis2_classification_run",
      targetId: prepared.classificationRun.id,
      action: "nis2.classification.created",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      afterJson: {
        countryCode: prepared.classificationRun.countryCode,
        confidence: prepared.classificationRun.confidence,
        legalReviewRequired: prepared.classificationRun.legalReviewRequired,
        result: prepared.classificationRun.result,
        sourceVersion: prepared.classificationRun.sourceVersion
      }
    });
  }

  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "generated_report",
    targetId: report.report.id,
    action: "nis2.onboarding.report.generated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      assessmentId: prepared.assessmentId,
      countryCode: prepared.progress.countryCode,
      reportVersion: 1,
      triggerType: "onboarding_completed"
    }
  });

  return {
    statusCode: 201,
    body: {
      ...report,
      assessmentId: prepared.assessmentId,
      classificationRun: prepared.classificationRun,
      progress: prepared.progress
    }
  };
};

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

const loadReportBranding = async (
  organizationId: string,
  actorUserId: string,
  services: ApiServices
): Promise<ReportBranding | undefined> => {
  const organization = (await services.identityRepository.listOrganizationsForUser(actorUserId)).find(
    (row) => row.organization.id === organizationId
  )?.organization;

  return organization
    ? {
        organizationName: organization.name,
        legalName: organization.legalName ?? null,
        logoDataUrl: organization.logoDataUrl ?? null
      }
    : undefined;
};

const toCountryPackResponse = (pack: Nis2CountryPackDefinition) => ({
  countryCode: pack.countryCode,
  displayName: pack.displayName,
  packVersion: pack.packVersion,
  effectiveDate: pack.effectiveDate,
  status: pack.status,
  extendsBasePackVersion: pack.extendsBasePackVersion,
  supportedUiLanguages: pack.supportedUiLanguages,
  authorityGuidance: pack.authorityGuidance,
  officialSources: pack.officialSources,
  nationalTerminology: pack.nationalTerminology,
  registrationGuidance: pack.registrationGuidance,
  sectorRules: pack.sectorRules,
  sizeThresholds: pack.sizeThresholds,
  specialInclusionRules: pack.specialInclusionRules,
  dynamicQuestions: pack.dynamicQuestions,
  classificationRules: pack.classificationRules.map((rule) => ({
    id: rule.id,
    version: rule.version,
    outcome: rule.outcome,
    plainLanguage: rule.plainLanguage,
    confidence: rule.confidence,
    legalReviewRequired: rule.legalReviewRequired,
    sourceIds: rule.sourceIds
  })),
  reportLanguage: pack.reportLanguage,
  disclaimers: pack.disclaimers
});

const optionalRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const optionalStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : undefined;
