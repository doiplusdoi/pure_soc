import { uniqueSourceReferences } from "./control-catalog";
import type { ComplianceControl, ControlCatalog, ManualChecklistItemState } from "./types";

export interface GenerateManualChecklistInput {
  organizationId: string;
  assessmentId: string;
  controls: readonly ComplianceControl[];
  templates: ControlCatalog["manualChecklistTemplates"];
  ownerUserId?: string;
}

export const generateManualChecklistItems = (input: GenerateManualChecklistInput): ManualChecklistItemState[] => {
  const templateById = new Map(input.templates.map((template) => [template.id, template]));
  const items: ManualChecklistItemState[] = [];

  for (const control of input.controls) {
    for (const templateId of control.manualChecklistTemplateIds) {
      const template = templateById.get(templateId);

      if (!template) {
        continue;
      }

      for (const templateItem of template.items) {
        items.push({
          id: [input.assessmentId, control.id, template.id, templateItem.key].join(":"),
          organizationId: input.organizationId,
          assessmentId: input.assessmentId,
          controlId: control.id,
          templateId: template.id,
          itemKey: templateItem.key,
          title: templateItem.title,
          description: templateItem.description,
          status: "task_generated",
          ownerUserId: input.ownerUserId,
          evidenceArtifactIds: [],
          sourceReferences: uniqueSourceReferences(control.sourceReferences)
        });
      }
    }
  }

  return items;
};
