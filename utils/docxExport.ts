import { StudentData } from '../types';

export interface ExportMetadata {
  teacherName: string;
  subjectName: string;
  exportDate: Date;
}

interface DocxRow {
  name: string;
  comment: string;
}

const encoder = new TextEncoder();

const sanitizeFilenamePart = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Unknown';
  return trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_');
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const normalizeText = (value: string): string => (value || '').replace(/\s+/g, ' ').trim();

const buildParagraphXml = (text: string, opts?: { bold?: boolean; spacingAfter?: number; fontSizeHalfPt?: number }): string => {
  const boldTag = opts?.bold ? '<w:b/>' : '';
  const spacingTag = typeof opts?.spacingAfter === 'number'
    ? `<w:pPr><w:spacing w:after="${opts.spacingAfter}"/></w:pPr>`
    : '';
  const sizeTag = typeof opts?.fontSizeHalfPt === 'number'
    ? `<w:sz w:val="${opts.fontSizeHalfPt}"/>`
    : '';

  return `<w:p>${spacingTag}<w:r><w:rPr>${boldTag}${sizeTag}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
};

const buildDocumentXml = (title: string, rows: DocxRow[]): string => {
  const content = [
    buildParagraphXml(title, { bold: true, spacingAfter: 320, fontSizeHalfPt: 32 }),
    ...rows.flatMap((row) => [
      buildParagraphXml(normalizeText(row.name), { bold: true, spacingAfter: 120, fontSizeHalfPt: 28 }),
      buildParagraphXml(normalizeText(row.comment), { spacingAfter: 240, fontSizeHalfPt: 24 }),
    ]),
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${content}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
};

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const makeCrcTable = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
};

const CRC_TABLE = makeCrcTable();

const crc32 = (data: Uint8Array): number => {
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
};

const writeUint16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value & 0xffff, true);
};

const writeUint32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value >>> 0, true);
};

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
};

const zipStore = (entries: Array<{ name: string; data: Uint8Array }>): Uint8Array => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);

    localParts.push(localHeader, nameBytes, data);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);

    centralParts.push(centralHeader, nameBytes);

    localOffset += localHeader.length + nameBytes.length + data.length;
  });

  const localBlob = concatBytes(localParts);
  const centralBlob = concatBytes(centralParts);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralBlob.length);
  writeUint32(endView, 16, localBlob.length);
  writeUint16(endView, 20, 0);

  return concatBytes([localBlob, centralBlob, end]);
};

const buildMinimalDocxBytes = (title: string, rows: DocxRow[]): Uint8Array => {
  const documentXml = buildDocumentXml(title, rows);
  return zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(RELS_XML) },
    { name: 'word/document.xml', data: encoder.encode(documentXml) },
  ]);
};

export const buildDocTitle = (metadata: ExportMetadata): string => {
  const date = metadata.exportDate.toISOString().slice(0, 10);
  return `${metadata.subjectName} Report Comments | ${metadata.teacherName} | Export ${date}`;
};

export const buildDocFilename = (metadata: ExportMetadata): string => {
  const date = metadata.exportDate.toISOString().slice(0, 10);
  return `${date}_${sanitizeFilenamePart(metadata.subjectName)}_${sanitizeFilenamePart(metadata.teacherName)}_Report_Comments.docx`;
};

export const exportCommentsToDocx = async (
  students: StudentData[],
  metadata: ExportMetadata
): Promise<void> => {
  const rows = students
    .filter((student) => (student.generatedComment || '').trim().length > 0)
    .map((student) => ({
      name: student.name,
      comment: student.generatedComment || '',
    }));

  if (rows.length === 0) {
    throw new Error('No generated comments available for export.');
  }

  const bytes = buildMinimalDocxBytes(buildDocTitle(metadata), rows);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildDocFilename(metadata);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
