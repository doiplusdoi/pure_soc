export const productV1OpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "PureSOC Product API",
    version: "1.0.0",
    description:
      "Versioned PureSOC product API contract. Existing /api/* facade routes remain compatibility aliases while /api/v1 stabilizes."
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/me": { get: { summary: "Return the authenticated user and active organization context." } },
    "/organizations": {
      get: { summary: "List organizations visible to the authenticated user with v1 pagination." },
      post: { summary: "Create a customer organization." }
    },
    "/organizations/{organizationId}/setup": { get: { summary: "Read persisted setup state." } },
    "/organizations/{organizationId}/setup/{step}": { put: { summary: "Autosave one setup step." } },
    "/organizations/{organizationId}/setup/launch": { post: { summary: "Evaluate setup launch readiness." } },
    "/organizations/{organizationId}/business-services": {
      get: { summary: "List business services." },
      post: { summary: "Create a business service." }
    },
    "/organizations/{organizationId}/responsibilities": {
      get: { summary: "List people and responsibility assignments." },
      post: { summary: "Create a person/responsibility assignment." }
    },
    "/organizations/{organizationId}/suppliers": {
      get: { summary: "List suppliers." },
      post: { summary: "Create a supplier." }
    },
    "/partners/{partnerId}/customer-invitations": {
      post: { summary: "Create a customer relationship invitation." }
    },
    "/organization-relationships/{relationshipId}/accept": {
      post: { summary: "Customer accepts an invited partner relationship." }
    },
    "/organization-relationships/{relationshipId}/suspend": {
      post: { summary: "Suspend an active partner relationship." }
    },
    "/organization-relationships/{relationshipId}/request-termination": {
      post: { summary: "Request partner relationship termination." }
    },
    "/organization-relationships/{relationshipId}/terminate": {
      post: { summary: "Terminate a partner relationship and revoke future access." }
    },
    "/partners/{partnerId}/assignments": {
      get: { summary: "List partner assignments." },
      post: { summary: "Assign a partner user or team to a customer relationship." }
    },
    "/support-sessions": {
      get: { summary: "List customer-visible support sessions." },
      post: { summary: "Start an exceptional support session." }
    },
    "/support-sessions/{supportSessionId}/end": { post: { summary: "End a support session." } },
    "/country-packs": { get: { summary: "List review-gated country-pack metadata." } },
    "/country-packs/{countryCode}": { get: { summary: "Read a country-pack contract." } },
    "/organizations/{organizationId}/compliance/classification/run": {
      post: { summary: "Run normalized NIS2 classification for the organization." }
    },
    "/organizations/{organizationId}/connectors/microsoft365/sync-runs": {
      post: { summary: "Create an async Microsoft 365 sync operation." }
    },
    "/organizations/{organizationId}/connectors/microsoft365/disconnect": {
      post: { summary: "Safely disconnect Microsoft 365, deleting secrets and preserving history." }
    },
    "/organizations/{organizationId}/provider-capabilities": {
      get: { summary: "List normalized provider capability states." }
    },
    "/organizations/{organizationId}/internal-events": {
      get: { summary: "List Product V1 internal events and outbox status." }
    },
    "/organizations/{organizationId}/internal-events/{eventId}/publish-result": {
      post: { summary: "Record an internal event publisher result without calling external infrastructure." }
    },
    "/organizations/{organizationId}/assets": {
      get: { summary: "List product assets." },
      post: { summary: "Create a product asset." }
    },
    "/organizations/{organizationId}/findings": {
      get: { summary: "List product findings." },
      post: { summary: "Create a product finding." }
    },
    "/organizations/{organizationId}/findings/{findingId}": {
      patch: { summary: "Update finding lifecycle status and owner." }
    },
    "/organizations/{organizationId}/remediation-plans": {
      get: { summary: "List remediation plans." },
      post: { summary: "Create a remediation plan." }
    },
    "/organizations/{organizationId}/remediation-plans/{remediationPlanId}": {
      patch: { summary: "Update remediation plan lifecycle status and owner." }
    },
    "/organizations/{organizationId}/tasks": {
      get: { summary: "List tasks." },
      post: { summary: "Create a task." }
    },
    "/organizations/{organizationId}/tasks/{taskId}": { patch: { summary: "Update task status, priority, owner, or due date." } },
    "/organizations/{organizationId}/incidents": {
      get: { summary: "List incidents." },
      post: { summary: "Declare an incident and reporting clock." }
    },
    "/organizations/{organizationId}/incidents/{incidentId}": { patch: { summary: "Update incident lifecycle status." } },
    "/organizations/{organizationId}/risks": {
      get: { summary: "List risks." },
      post: { summary: "Create a risk." }
    },
    "/organizations/{organizationId}/risks/{riskId}": { patch: { summary: "Update risk state, treatment, scoring, or owner." } },
    "/organizations/{organizationId}/policies": {
      get: { summary: "List policies." },
      post: { summary: "Create a policy document." }
    },
    "/organizations/{organizationId}/policies/{policyId}": { patch: { summary: "Update policy document lifecycle status." } },
    "/organizations/{organizationId}/supplier-reviews": {
      get: { summary: "List supplier reviews with evidence and risk links." },
      post: { summary: "Schedule a supplier review." }
    },
    "/organizations/{organizationId}/supplier-reviews/{supplierReviewId}": {
      patch: { summary: "Update supplier review status, outcome, evidence, and risk links." }
    },
    "/organizations/{organizationId}/policy-reviews": {
      get: { summary: "List policy reviews." },
      post: { summary: "Schedule a policy review." }
    },
    "/organizations/{organizationId}/policy-reviews/{policyReviewId}": {
      patch: { summary: "Update policy review status and completion metadata." }
    },
    "/organizations/{organizationId}/policy-acknowledgements": {
      get: { summary: "List policy acknowledgements." },
      post: { summary: "Create a policy acknowledgement assignment." }
    },
    "/organizations/{organizationId}/policy-acknowledgements/{policyAcknowledgementId}": {
      patch: { summary: "Update policy acknowledgement status." }
    },
    "/organizations/{organizationId}/governance-activities": {
      get: { summary: "List governance activities." },
      post: { summary: "Create a governance activity." }
    },
    "/organizations/{organizationId}/governance-activities/{governanceActivityId}": {
      patch: { summary: "Update governance activity status and links." }
    },
    "/organizations/{organizationId}/governance-calendar-events": {
      get: { summary: "List governance calendar events." },
      post: { summary: "Create a governance calendar event." }
    },
    "/organizations/{organizationId}/governance-calendar-events/{governanceCalendarEventId}": {
      patch: { summary: "Update governance calendar event status." }
    },
    "/organizations/{organizationId}/attestations": {
      get: { summary: "List attestations." },
      post: { summary: "Open an attestation workflow." }
    },
    "/organizations/{organizationId}/attestations/{attestationId}": {
      patch: { summary: "Update attestation status, submitter, and evidence links." }
    },
    "/organizations/{organizationId}/training-records": {
      get: { summary: "List training records." },
      post: { summary: "Assign a training record." }
    },
    "/organizations/{organizationId}/training-records/{trainingRecordId}": {
      patch: { summary: "Update training record status and evidence links." }
    },
    "/organizations/{organizationId}/retention-policies": {
      get: { summary: "List retention policies." },
      post: { summary: "Create a retention policy for file objects." }
    },
    "/organizations/{organizationId}/file-objects": {
      get: { summary: "List uploaded/generated file metadata with scan, retention, and encryption state." },
      post: { summary: "Create a provider-neutral file object metadata record." }
    },
    "/organizations/{organizationId}/file-objects/{fileObjectId}/legal-hold": {
      post: { summary: "Apply or release legal hold on a file object." }
    },
    "/organizations/{organizationId}/file-objects/{fileObjectId}": {
      delete: { summary: "Tombstone an eligible file object or return the retention blocking reason." }
    },
    "/report-templates": { get: { summary: "List supported immutable report snapshot templates." } },
    "/organizations/{organizationId}/report-snapshots": {
      get: { summary: "List immutable report snapshots." },
      post: { summary: "Create an immutable JSON or deterministic PDF report snapshot operation." }
    },
    "/organizations/{organizationId}/report-snapshots/{reportSnapshotId}/download": {
      get: { summary: "Download an immutable report snapshot artifact and verify its checksum." }
    },
    "/operations/{operationId}": { get: { summary: "Read an async operation resource." } }
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "details", "requestId", "fieldErrors"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
              requestId: { type: "string" },
              correlationId: { type: "string" },
              fieldErrors: { type: "array", items: { type: "object" } }
            }
          }
        }
      },
      Page: {
        type: "object",
        required: ["nextCursor", "limit"],
        properties: {
          nextCursor: { type: ["string", "null"] },
          limit: { type: "integer", minimum: 1, maximum: 100 }
        }
      },
      Operation: {
        type: "object",
        required: ["operationId", "status", "links"],
        properties: {
          operationId: { type: "string" },
          status: { enum: ["queued", "running", "succeeded", "failed", "canceled", "expired"] },
          links: { type: "object" }
        }
      }
    }
  }
} as const;
