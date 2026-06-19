import { AuthError } from "@puresoc/auth-core";
import type { ComplianceGap } from "@puresoc/compliance-core";
import {
  generateRecommendationSnapshot,
  type RecommendationContextInput,
  type ProviderRecommendationLike
} from "@puresoc/recommendations";

export interface RecommendationApiServiceInput {
  organizationId: string;
  gaps: ComplianceGap[];
  providerRecommendations?: ProviderRecommendationLike[];
  context?: RecommendationContextInput;
  generatedAt?: string;
}

export class RecommendationApiService {
  generate(input: RecommendationApiServiceInput) {
    const mismatchedGap = input.gaps.find((gap) => gap.organizationId !== input.organizationId);

    if (mismatchedGap) {
      throw new AuthError("invalid_request", "Recommendation gaps must belong to the requested organization.", 400);
    }

    return generateRecommendationSnapshot({
      organizationId: input.organizationId,
      gaps: input.gaps,
      providerRecommendations: input.providerRecommendations,
      context: input.context,
      generatedAt: input.generatedAt
    });
  }
}
