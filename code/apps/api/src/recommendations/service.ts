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
    return {
      recommendations: generateStructuredRecommendations({
        organizationId: input.organizationId,
        gaps: input.gaps,
        providerRecommendations: input.providerRecommendations
      })
    };
  }
}
