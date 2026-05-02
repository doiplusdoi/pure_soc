import { createDisabledProviderActionExecutor, type ProviderActionExecutor } from "@puresoc/providers-core";

import { microsoft365ProviderKey } from "./permissions";

export const createMicrosoft365DisabledActionExecutor = (): ProviderActionExecutor =>
  createDisabledProviderActionExecutor(
    microsoft365ProviderKey,
    "Microsoft 365 provider write execution is disabled until approved live remediation contracts exist."
  );
