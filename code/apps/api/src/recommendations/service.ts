import { AuthError } from "@puresoc/auth-core";
import type { ComplianceGap } from "@puresoc/compliance-core";
import {
  generateStructuredRecommendations,
  type ProviderRecommendationLike
} from "@puresoc/recommendations";

export interface RecommendationApiServiceInput {
  organizationId: string;
  gaps: ComplianceGap[];
  providerRecommendations?: ProviderRecommendationLike[];
}

export class RecommendationApiService {
  generate(input: RecommendationApiServiceInput) {
    const mismatchedGap = input.gaps.find((gap) => gap.organizationId !== input.organizationId);

    if (mismatchedGap) {
      throw new AuthError("invalid_request", "Recommendation gaps must belong to the requested organization.", 400);
    }

    return {
      recommendations: generateStructuredRecommendations({
        organizationId: input.organizationId,
        gaps: input.gaps,
        providerRecommendations: input.providerRecommendations
      })
    };
  }
}
