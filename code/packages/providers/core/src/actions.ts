import { redactProviderSecrets } from "./redaction";

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
  parameters?: Record<string, unknown>;
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

export type ProviderActionExecutorMode = "disabled" | "fake";

export interface ProviderActionExecutor {
  providerKey: string;
  executionMode: ProviderActionExecutorMode;
  validateAction(input: ValidateActionInput): Promise<ProviderActionValidationResult>;
  applyAction(input: ApplyActionInput): Promise<ProviderActionExecutionResult>;
  verifyAction(input: VerifyActionInput): Promise<ProviderActionVerificationResult>;
  collectActionEvidence(input: EvidenceCollectionInput): Promise<ProviderActionEvidenceArtifact[]>;
}

export type ProviderActionExecutionErrorCode =
  | "provider_action_executor_disabled"
  | "provider_action_unsupported"
  | "provider_action_validation_failed"
  | "provider_action_apply_failed"
  | "provider_action_verification_failed";

export class ProviderActionExecutionError extends Error {
  readonly code: ProviderActionExecutionErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ProviderActionExecutionErrorCode,
    message: string,
    options: { retryable?: boolean; details?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = "ProviderActionExecutionError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = redactProviderSecrets(options.details ?? {}) as Record<string, unknown>;
  }
}

export const createDisabledProviderActionExecutor = (
  providerKey: string,
  reason = "Provider action execution is disabled for this provider."
): ProviderActionExecutor => {
  const reject = async (): Promise<never> => {
    throw new ProviderActionExecutionError("provider_action_executor_disabled", reason, {
      retryable: false,
      details: {
        providerKey,
        executionMode: "disabled"
      }
    });
  };

  return {
    providerKey,
    executionMode: "disabled",
    validateAction: reject,
    applyAction: reject,
    verifyAction: reject,
    collectActionEvidence: reject
  };
};
