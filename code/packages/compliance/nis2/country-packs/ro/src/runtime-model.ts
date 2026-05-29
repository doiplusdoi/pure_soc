import { readFileSync } from "node:fs";
import type { RoNis2SourceReference } from "./classification.service";

interface GeneratedServiceCatalogCategory {
  code: string;
  label: string;
  sourceMapId: string;
}

interface GeneratedServiceCatalogSector {
  categoryCode: string;
  code: string;
  label: string;
  sourceMapId: string;
}

interface GeneratedServiceCatalogSubsector {
  code: string;
  label: string;
  sectorCode: string;
  sourceMapId: string;
}

interface GeneratedServiceCatalogOption {
  code: string;
  label: string;
  sectorCode?: string;
  sourceMapId: string;
  subsectorCode?: string;
}

interface GeneratedNotificationDraftMapping {
  key: string;
  label?: string;
  sourceMapId: string;
  sourceReferences?: RoNis2SourceReference[];
  targetCell: string;
}

interface GeneratedRoNis2Seed {
  notificationDraftMapping: GeneratedNotificationDraftMapping[];
  serviceCatalog: {
    categories: GeneratedServiceCatalogCategory[];
    options: GeneratedServiceCatalogOption[];
    sectors: GeneratedServiceCatalogSector[];
    subsectors: GeneratedServiceCatalogSubsector[];
  };
}

export interface RoNis2ServiceCatalogOption {
  categoryCode?: string;
  categoryLabel?: string;
  code: string;
  label: string;
  sectorCode?: string;
  sectorLabel?: string;
  subsectorCode?: string;
  subsectorLabel?: string;
}

export interface RoNis2ServiceCatalogGroup {
  categoryCode?: string;
  categoryLabel: string;
  options: RoNis2ServiceCatalogOption[];
  sectorCode?: string;
  sectorLabel: string;
}

export interface RoNis2NotificationMapping {
  key: string;
  label: string;
  labelMessageKey: string;
  sourceMapId: string;
  sourceReferences: readonly RoNis2SourceReference[];
  targetCell: string;
}

const generatedSeed = JSON.parse(
  readFileSync(
    new URL("../../../../../../data/regulatory/countries/ro/ro-nis2.seed.generated.json", import.meta.url),
    "utf8"
  )
) as GeneratedRoNis2Seed;
const categoriesByCode = new Map(generatedSeed.serviceCatalog.categories.map((category) => [category.code, category]));
const sectorsByCode = new Map(generatedSeed.serviceCatalog.sectors.map((sector) => [sector.code, sector]));
const subsectorsByCode = new Map(generatedSeed.serviceCatalog.subsectors.map((subsector) => [subsector.code, subsector]));

export const roNis2ServiceCatalogOptions: readonly RoNis2ServiceCatalogOption[] = generatedSeed.serviceCatalog.options.map(
  (option) => {
    const sector = option.sectorCode ? sectorsByCode.get(option.sectorCode) : undefined;
    const subsector = option.subsectorCode ? subsectorsByCode.get(option.subsectorCode) : undefined;
    const category = sector ? categoriesByCode.get(sector.categoryCode) : undefined;

    return {
      categoryCode: category?.code,
      categoryLabel: category ? cleanServiceCatalogLabel(category.label) : undefined,
      code: option.code,
      label: cleanServiceCatalogLabel(option.label),
      sectorCode: option.sectorCode,
      sectorLabel: sector ? cleanServiceCatalogLabel(sector.label) : undefined,
      subsectorCode: option.subsectorCode,
      subsectorLabel: subsector ? cleanServiceCatalogLabel(subsector.label) : undefined
    };
  }
);

export const roNis2ServiceCatalogGroups: readonly RoNis2ServiceCatalogGroup[] = [
  ...Array.from(
    roNis2ServiceCatalogOptions.reduce((groups, option) => {
      const key = [option.categoryCode ?? "none", option.sectorCode ?? "none"].join(":");
      const existing =
        groups.get(key) ??
        ({
          categoryCode: option.categoryCode,
          categoryLabel: option.categoryLabel ?? "No listed sector",
          options: [],
          sectorCode: option.sectorCode,
          sectorLabel: option.sectorLabel ?? "No listed service category"
        } satisfies RoNis2ServiceCatalogGroup);
      existing.options.push(option);
      groups.set(key, existing);
      return groups;
    }, new Map<string, RoNis2ServiceCatalogGroup>())
  ).map(([, group]) => group)
].map((group) => ({
  ...group,
  options: [...group.options].sort((left, right) => left.label.localeCompare(right.label))
}));

export const roNis2NotificationMappings: readonly RoNis2NotificationMapping[] =
  generatedSeed.notificationDraftMapping.map((mapping) => ({
    key: mapping.key,
    label: mapping.label && mapping.label.trim().length > 0 ? mapping.label.trim().replace(/:$/, "") : humanizeMappingKey(mapping.key),
    labelMessageKey: `country_pack.ro.nis2.notification.${mapping.key}.label`,
    sourceMapId: mapping.sourceMapId,
    sourceReferences:
      mapping.sourceReferences && mapping.sourceReferences.length > 0
        ? mapping.sourceReferences
        : [{ cell: mapping.targetCell, sheet: "Notification form" }],
    targetCell: mapping.targetCell
  }));

function cleanServiceCatalogLabel(label: string): string {
  return label.replace("Digital Infrstructure", "Digital infrastructure");
}

function humanizeMappingKey(key: string): string {
  return key.replace(/^notification_/, "Notification ").replaceAll("_", " ").toUpperCase();
}
