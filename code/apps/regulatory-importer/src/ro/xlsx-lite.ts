import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;

interface ZipEntry {
  compressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
  name: string;
}

interface ZipArchive {
  readText(path: string): string;
}

export interface XlsxCell {
  formula?: string;
  ref: string;
  sheetName: string;
  type?: string;
  value: string;
}

export interface XlsxSheet {
  cells: ReadonlyMap<string, XlsxCell>;
  getCell(ref: string): string;
  getFormula(ref: string): string | undefined;
  name: string;
  path: string;
}

export interface XlsxWorkbook {
  getSheet(name: string): XlsxSheet | undefined;
  sheetNames: string[];
  sheets: XlsxSheet[];
}

export const readXlsxWorkbook = (path: string): XlsxWorkbook => {
  const archive = openZipArchive(readFileSync(path));
  const sharedStrings = parseSharedStrings(archive.readText("xl/sharedStrings.xml"));
  const workbookXml = archive.readText("xl/workbook.xml");
  const relationships = parseRelationships(archive.readText("xl/_rels/workbook.xml.rels"));

  const sheets = parseWorkbookSheetEntries(workbookXml, relationships).map((entry) =>
    parseWorksheet(entry.name, entry.path, archive.readText(entry.path), sharedStrings)
  );

  return {
    sheets,
    sheetNames: sheets.map((sheet) => sheet.name),
    getSheet(name: string) {
      return sheets.find((sheet) => sheet.name === name);
    }
  };
};

export const cellColumn = (cellRef: string): string => cellRef.replace(/\d+/g, "");

export const cellRow = (cellRef: string): number => Number(cellRef.replace(/[A-Z]+/gi, ""));

export const columnNumber = (column: string): number =>
  [...column.toUpperCase()].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);

export const compareCellRefs = (left: string, right: string): number => {
  const rowDiff = cellRow(left) - cellRow(right);
  return rowDiff === 0 ? columnNumber(cellColumn(left)) - columnNumber(cellColumn(right)) : rowDiff;
};

export const decodeXml = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&#(\d+);/g, (_match, codePoint: string) => String.fromCodePoint(Number(codePoint)));

const openZipArchive = (buffer: Buffer): ZipArchive => {
  const entries = readZipEntries(buffer);

  return {
    readText(path: string): string {
      const entry = entries.get(path);
      if (!entry) {
        throw new Error(`XLSX archive entry not found: ${path}`);
      }

      return readZipEntry(buffer, entry).toString("utf8");
    }
  };
};

const readZipEntries = (buffer: Buffer): Map<string, ZipEntry> => {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, ZipEntry>();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("Invalid XLSX archive central directory.");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    entries.set(name, {
      compressedSize,
      compressionMethod,
      localHeaderOffset,
      name
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

const findEndOfCentralDirectory = (buffer: Buffer): number => {
  const minimumOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new Error("Invalid XLSX archive: end of central directory was not found.");
};

const readZipEntry = (buffer: Buffer, entry: ZipEntry): Buffer => {
  const offset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(offset) !== LOCAL_FILE_SIGNATURE) {
    throw new Error(`Invalid local file header for XLSX archive entry: ${entry.name}`);
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressed);
  }

  throw new Error(`Unsupported XLSX compression method ${entry.compressionMethod} for ${entry.name}`);
};

const parseSharedStrings = (xml: string): string[] =>
  [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => parseRichText(match[1]));

const parseRelationships = (xml: string): Map<string, string> => {
  const relationships = new Map<string, string>();

  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attributes = parseAttributes(match[1]);
    const id = attributes.get("Id");
    const target = attributes.get("Target");

    if (id && target) {
      relationships.set(id, normalizeWorkbookTarget(target));
    }
  }

  return relationships;
};

const parseWorkbookSheetEntries = (
  xml: string,
  relationships: ReadonlyMap<string, string>
): Array<{ name: string; path: string }> => {
  const sheets: Array<{ name: string; path: string }> = [];

  for (const match of xml.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const attributes = parseAttributes(match[1]);
    const name = attributes.get("name");
    const relationshipId = attributes.get("r:id");
    const path = relationshipId ? relationships.get(relationshipId) : undefined;

    if (name && path) {
      sheets.push({ name, path });
    }
  }

  return sheets;
};

const parseWorksheet = (
  sheetName: string,
  path: string,
  xml: string,
  sharedStrings: readonly string[]
): XlsxSheet => {
  const cells = new Map<string, XlsxCell>();

  for (const match of xml.matchAll(/<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    if (match[1]) {
      continue;
    }

    const attributes = parseAttributes(match[2]);
    const ref = attributes.get("r");
    const type = attributes.get("t");
    const body = match[3];

    if (!ref) {
      continue;
    }

    const formula = firstXmlText(body, "f");
    const value = parseCellValue(body, type, sharedStrings);

    if (value !== "" || formula) {
      cells.set(ref, {
        formula,
        ref,
        sheetName,
        type,
        value
      });
    }
  }

  return {
    cells,
    name: sheetName,
    path,
    getCell(ref: string) {
      return cells.get(ref)?.value ?? "";
    },
    getFormula(ref: string) {
      return cells.get(ref)?.formula;
    }
  };
};

const parseCellValue = (body: string, type: string | undefined, sharedStrings: readonly string[]): string => {
  const inlineString = body.match(/<is>([\s\S]*?)<\/is>/);
  if (inlineString) {
    return parseRichText(inlineString[1]).trim();
  }

  const rawValue = firstXmlText(body, "v");
  if (rawValue === undefined) {
    return "";
  }

  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? rawValue;
  }

  if (type === "b") {
    return rawValue === "1" ? "TRUE" : "FALSE";
  }

  return decodeXml(rawValue).trim();
};

const parseRichText = (xml: string): string => {
  const textRuns = [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));

  if (textRuns.length > 0) {
    return textRuns.join("").trim();
  }

  return decodeXml(xml.replace(/<[^>]+>/g, "")).trim();
};

const firstXmlText = (xml: string, tagName: string): string | undefined => {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? decodeXml(match[1]).trim() : undefined;
};

const parseAttributes = (attributes: string): Map<string, string> => {
  const parsed = new Map<string, string>();

  for (const match of attributes.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    parsed.set(match[1], decodeXml(match[2]));
  }

  return parsed;
};

const normalizeWorkbookTarget = (target: string): string => {
  const withoutLeadingSlash = target.replace(/^\//, "");
  const withWorkbookPrefix = withoutLeadingSlash.startsWith("xl/")
    ? withoutLeadingSlash
    : `xl/${withoutLeadingSlash}`;

  const parts: string[] = [];
  for (const part of withWorkbookPrefix.split("/")) {
    if (part === "." || part === "") {
      continue;
    }

    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  return parts.join("/");
};
