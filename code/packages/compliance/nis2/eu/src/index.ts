import type { RegulatorySourceRecord } from "@puresoc/regulatory-sources";

export interface RegulatoryFrameworkSeed {
  key: "nis2";
  name: string;
  jurisdictionScope: "EU";
  providerNeutral: boolean;
  countrySpecificLogicAllowed: false;
}

export interface RegulatoryFrameworkVersionSeed {
  frameworkKey: "nis2";
  versionLabel: string;
  legalInstrument: "Directive (EU) 2022/2555";
  sourceRecordIds: string[];
  status: "active";
}

export interface LegalReferenceSeed {
  sourceRecordId: string;
  article: string;
  paragraph?: string;
}

export interface Article21ControlSeed {
  code: string;
  title: string;
  controlGroup: string;
  implementationType: "technical" | "process" | "hybrid";
  applicability: "all";
  legalReference: LegalReferenceSeed[];
  providerMappings: [];
  evidenceRequired: [];
  manualChecklistTemplateIds: [];
}

export interface Article23IncidentWorkflowStepSeed {
  key: string;
  title: string;
  defaultTiming?: string;
  countryOverrideAllowed: true;
  legalReference: LegalReferenceSeed[];
}

export const nis2DirectiveSourceRecord: RegulatorySourceRecord = {
  id: "eu-nis2-directive-2022-2555",
  frameworkKey: "nis2",
  jurisdiction: "EU",
  sourceType: "directive",
  title: "Directive (EU) 2022/2555",
  url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng",
  publicationDate: "2022-12-27",
  lastCheckedAt: "2026-04-28T00:00:00.000Z",
  versionLabel: "OJ L 333, 27.12.2022",
  trustLevel: "primary",
  status: "active",
  activationStatus: "active",
  notes: "Primary EU baseline legal source for NIS2 framework and Article 21/23 shells."
};

export const nis2CommissionPolicySourceRecord: RegulatorySourceRecord = {
  id: "eu-commission-nis2-policy-page",
  frameworkKey: "nis2",
  jurisdiction: "EU",
  sourceType: "official_commission_country_page",
  title: "European Commission NIS2 policy page",
  url: "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive",
  lastCheckedAt: "2026-04-28T00:00:00.000Z",
  trustLevel: "primary",
  status: "active",
  activationStatus: "active",
  notes: "EU policy source anchor. Operational control logic remains tied to legal source records."
};

export const nis2EuFramework: RegulatoryFrameworkSeed = {
  key: "nis2",
  name: "EU NIS2",
  jurisdictionScope: "EU",
  providerNeutral: true,
  countrySpecificLogicAllowed: false
};

export const nis2EuFrameworkVersion: RegulatoryFrameworkVersionSeed = {
  frameworkKey: "nis2",
  versionLabel: "Directive (EU) 2022/2555",
  legalInstrument: "Directive (EU) 2022/2555",
  sourceRecordIds: [nis2DirectiveSourceRecord.id, nis2CommissionPolicySourceRecord.id],
  status: "active"
};

export const nis2EuControlGroups = [
  { code: "NIS2-EU-GOV", title: "Governance, management accountability, training" },
  { code: "NIS2-EU-RISK", title: "Risk analysis and information system security policies" },
  { code: "NIS2-EU-INC", title: "Incident handling and reporting" },
  { code: "NIS2-EU-BCP", title: "Business continuity, backup, disaster recovery, crisis management" },
  { code: "NIS2-EU-SUPPLY", title: "Supply chain security" },
  { code: "NIS2-EU-SDLC", title: "Security in acquisition, development, maintenance, vulnerability handling/disclosure" },
  { code: "NIS2-EU-ASSESS", title: "Effectiveness assessment and control testing" },
  { code: "NIS2-EU-HYGIENE", title: "Basic cyber hygiene and cybersecurity training" },
  { code: "NIS2-EU-CRYPTO", title: "Cryptography and encryption" },
  { code: "NIS2-EU-IAM", title: "Human resources security, access control, asset management" },
  { code: "NIS2-EU-MFA", title: "MFA, continuous authentication, secured communications" },
  { code: "NIS2-EU-LOG", title: "Logging, monitoring, alerting" },
  { code: "NIS2-EU-DATA", title: "Data protection, retention, DLP, information handling" },
  { code: "NIS2-EU-NET", title: "Network and system security" },
  { code: "NIS2-EU-DOC", title: "Documentation, evidence, auditability" }
] as const;

export const nis2Article21Controls: Article21ControlSeed[] = [
  article21Control("NIS2-EU-RISK-001", "Risk analysis and information system security policies", "NIS2-EU-RISK", "process", "2(a)"),
  article21Control("NIS2-EU-INC-001", "Incident handling", "NIS2-EU-INC", "hybrid", "2(b)"),
  article21Control(
    "NIS2-EU-BCP-001",
    "Business continuity, backup management, disaster recovery, and crisis management",
    "NIS2-EU-BCP",
    "process",
    "2(c)"
  ),
  article21Control("NIS2-EU-SUPPLY-001", "Supply chain security", "NIS2-EU-SUPPLY", "hybrid", "2(d)"),
  article21Control("NIS2-EU-SDLC-001", "Secure acquisition, development, maintenance, and vulnerability handling", "NIS2-EU-SDLC", "hybrid", "2(e)"),
  article21Control("NIS2-EU-ASSESS-001", "Effectiveness assessment of cybersecurity risk-management measures", "NIS2-EU-ASSESS", "process", "2(f)"),
  article21Control("NIS2-EU-HYGIENE-001", "Basic cyber hygiene practices and cybersecurity training", "NIS2-EU-HYGIENE", "process", "2(g)"),
  article21Control("NIS2-EU-CRYPTO-001", "Cryptography and encryption policies and procedures", "NIS2-EU-CRYPTO", "hybrid", "2(h)"),
  article21Control("NIS2-EU-IAM-001", "Human resources security, access control policies, and asset management", "NIS2-EU-IAM", "hybrid", "2(i)"),
  article21Control("NIS2-EU-MFA-001", "Multi-factor authentication and secure communications where appropriate", "NIS2-EU-MFA", "technical", "2(j)")
];

export const nis2Article23IncidentWorkflow = {
  article: "23",
  countryOverridesRequired: true,
  steps: [
    incidentWorkflowStep("incident_detected", "Incident detected"),
    incidentWorkflowStep("significance_assessment", "Significance assessment"),
    incidentWorkflowStep("country_reporting_route_selected", "Country reporting route selected"),
    incidentWorkflowStep(
      "early_warning_due",
      "Early warning due",
      "without undue delay and in any event within 24 hours of becoming aware"
    ),
    incidentWorkflowStep(
      "incident_notification_due",
      "Incident notification due",
      "without undue delay and in any event within 72 hours of becoming aware"
    ),
    incidentWorkflowStep("intermediate_report_if_requested", "Intermediate report if requested", "upon request of CSIRT or competent authority"),
    incidentWorkflowStep("final_report_due", "Final report due", "no later than one month after the incident notification"),
    incidentWorkflowStep("recipient_customer_notification_if_required", "Recipient/customer notification if required"),
    incidentWorkflowStep("evidence_package_closed", "Evidence package closed")
  ]
} as const;

export const nis2EuSeed = {
  framework: nis2EuFramework,
  frameworkVersion: nis2EuFrameworkVersion,
  sourceRecords: [nis2DirectiveSourceRecord, nis2CommissionPolicySourceRecord],
  controlGroups: nis2EuControlGroups,
  article21Controls: nis2Article21Controls,
  article23IncidentWorkflow: nis2Article23IncidentWorkflow
} as const;

function article21Control(
  code: string,
  title: string,
  controlGroup: string,
  implementationType: Article21ControlSeed["implementationType"],
  paragraph: string
): Article21ControlSeed {
  return {
    code,
    title,
    controlGroup,
    implementationType,
    applicability: "all",
    legalReference: [
      {
        sourceRecordId: nis2DirectiveSourceRecord.id,
        article: "21",
        paragraph
      }
    ],
    providerMappings: [],
    evidenceRequired: [],
    manualChecklistTemplateIds: []
  };
}

function incidentWorkflowStep(
  key: string,
  title: string,
  defaultTiming?: string
): Article23IncidentWorkflowStepSeed {
  return {
    key,
    title,
    defaultTiming,
    countryOverrideAllowed: true,
    legalReference: [
      {
        sourceRecordId: nis2DirectiveSourceRecord.id,
        article: "23"
      }
    ]
  };
}
