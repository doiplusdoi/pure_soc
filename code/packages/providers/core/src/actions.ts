export interface ValidateActionInput {
  organizationId: string;
  providerConnectionId: string;
  actionRunId: string;
  actionKey: string;
  parameters?: Record<string, unknown>;
}

export interface ProviderActionValidationResult {
  status: "passed" | "failed";
  checkedAt: string;
  checks: Array<{
    code: string;
    status: "passed" | "failed" | "warning";
    message: string;
  }>;
  diff?: {
    summary: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}

export interface ApplyActionInput {
  organizationId: string;
  providerConnectionId: string;
  actionRunId: string;
  actionKey: string;
  approvedBy: string;
  approvedAt: string;
  preStateEvidenceId: string;
  parameters?: Record<string, unknown>;
}

export interface ProviderActionExecutionResult {
  status: "applied" | "failed";
  executedAt: string;
  postState?: Record<string, unknown>;
  error?: Record<string, unknown>;
}

export interface VerifyActionInput {
  organizationId: string;
  providerConnectionId: string;
  actionRunId: string;
  actionKey: string;
  postStateEvidenceId?: string;
}

export interface ProviderActionVerificationResult {
  status: "passed" | "failed" | "manual_required";
  verifiedAt: string;
  checks: Array<{
    code: string;
    status: "passed" | "failed" | "warning";
    message: string;
  }>;
}

export interface EvidenceCollectionInput {
  organizationId: string;
  providerConnectionId: string;
  actionRunId: string;
  actionKey: string;
  snapshotPhase: "pre_state" | "post_state";
}

export interface ProviderActionEvidenceArtifact {
  title: string;
  description?: string;
  sourceType: "action_pre_state" | "action_post_state";
  mimeType: string;
  body: Uint8Array | string;
  contentHashSha256?: string;
}
