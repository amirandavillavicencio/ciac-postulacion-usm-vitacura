export type ExcelPrimitive = string | number | boolean;

export type ExcelCell = {
  value: ExcelPrimitive;
  style?: number;
};

export type ExcelSheet = {
  name: string;
  columns?: number[];
  rows: ExcelCell[][];
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let name = "";
  let current = index;

  while (current > 0) {
    const rem = (current - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function buildSheetXml(sheet: ExcelSheet) {
  const maxCols = Math.max(1, ...sheet.rows.map((row) => row.length));
  const maxRows = Math.max(1, sheet.rows.length);
  const dimension = `A1:${columnName(maxCols)}${maxRows}`;

  const colsXml = sheet.columns?.length
    ? `<cols>${sheet.columns
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
        )
        .join("")}</cols>`
    : "";

  const rowsXml = sheet.rows
    .map((row, rowIndex) => {
      const cellsXml = row
        .map((cell, colIndex) => {
          const ref = `${columnName(colIndex + 1)}${rowIndex + 1}`;
          const styleAttr = cell.style !== undefined ? ` s="${cell.style}"` : "";

          if (typeof cell.value === "number") {
            return `<c r="${ref}"${styleAttr}><v>${cell.value}</v></c>`;
          }

          if (typeof cell.value === "boolean") {
            return `<c r="${ref}" t="b"${styleAttr}><v>${cell.value ? 1 : 0}</v></c>`;
          }

          return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXml(cell.value)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function buildWorkbookXml(sheets: ExcelSheet[]) {
  const sheetEntries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEntries}</sheets>
</workbook>`;
}

function buildWorkbookRelsXml(sheetCount: number) {
  const sheetRels = Array.from({ length: sheetCount }, (_, index) => {
    return `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  {{sheets}}
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

type ZipFile = { path: string; data: Uint8Array };

let crcTable: Uint32Array | null = null;

function getCrcTable() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c >>> 0;
  }

  return crcTable;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  const table = getCrcTable();
  for (let i = 0; i < data.length; i += 1) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function toDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11);
  const dosDate = date.getDate() | ((date.getMonth() + 1) << 5) | ((year - 1980) << 9);

  return { dosDate, dosTime };
}

function createZip(files: ZipFile[]) {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  const now = toDosDateTime(new Date());

  for (const file of files) {
    const pathBytes = encoder.encode(file.path);
    const data = file.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + pathBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, now.dosTime, true);
    localView.setUint16(12, now.dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, pathBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(pathBytes, 30);

    localChunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + pathBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, now.dosTime, true);
    centralView.setUint16(14, now.dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, pathBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(pathBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = concatUint8Arrays(centralChunks);
  const centralSize = centralDirectory.length;
  const centralOffset = offset;

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([...localChunks, centralDirectory, end]);
}

export function sanitizeSheetName(name: string) {
  const cleaned = name
    .replace(/[\\/*?:\[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Postulante";
  return cleaned.slice(0, 31);
}

export function createXlsxBuffer(sheets: ExcelSheet[]) {
  const encoder = new TextEncoder();
  const files: ZipFile[] = [
    { path: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES_XML.replace("{{sheets}}", sheets.map((_, index) => `<Override PartName=\"/xl/worksheets/sheet${index + 1}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>`).join(""))) },
    { path: "_rels/.rels", data: encoder.encode(ROOT_RELS_XML) },
    { path: "xl/workbook.xml", data: encoder.encode(buildWorkbookXml(sheets)) },
    { path: "xl/_rels/workbook.xml.rels", data: encoder.encode(buildWorkbookRelsXml(sheets.length)) },
    { path: "xl/styles.xml", data: encoder.encode(STYLES_XML) }
  ];

  for (let index = 0; index < sheets.length; index += 1) {
    files.push({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: encoder.encode(buildSheetXml(sheets[index]))
    });
  }

  return createZip(files);
}
