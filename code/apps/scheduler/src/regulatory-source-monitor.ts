import {
  RegulatorySourceMonitorService,
  RegulatorySourceReviewService,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMonitorConfig,
  type RegulatorySourceMonitorRunResult,
  type RegulatorySourceRepository
} from "@puresoc/regulatory-sources";

export const regulatorySourceMonitorJobName = "regulatory.monitorCountrySources";

export interface RunRegulatorySourceMonitorJobInput {
  repository: RegulatorySourceRepository;
  config: RegulatorySourceMonitorConfig;
  metadataClient?: RegulatorySourceMetadataCheckClient;
  now?: () => Date;
  idFactory?: () => string;
}

export const runRegulatorySourceMonitorJob = async (
  input: RunRegulatorySourceMonitorJobInput
): Promise<RegulatorySourceMonitorRunResult> => {
  const reviewService = new RegulatorySourceReviewService({
    repository: input.repository,
    now: input.now,
    idFactory: input.idFactory
  });
  const monitor = new RegulatorySourceMonitorService({
    repository: input.repository,
    reviewService,
    metadataClient: input.metadataClient,
    config: input.config,
    now: input.now,
    idFactory: input.idFactory
  });

  return monitor.runOnce();
};
