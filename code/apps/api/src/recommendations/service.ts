import { AuthError } from "../../../../packages/auth/core/src/index";
import type { ComplianceGap } from "../../../../packages/compliance/core/src/index";
import {
  generateStructuredRecommendations,
  type ProviderRecommendationLike
} from "../../../../packages/recommendations/src/index";

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
