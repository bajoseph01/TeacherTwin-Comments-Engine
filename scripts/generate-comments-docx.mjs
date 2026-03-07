import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { GoogleGenAI, Type } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';
const encoder = new TextEncoder();

const usage = `
Usage:
  npm run generate:docx -- --persona "<path-to-profile.json>" --teacher "<teacher name>" --subject "<subject>" [--outdir "<output-folder>"] [--model "<model>"] "<marksheet-file-1>" "<marksheet-file-2>" ...
  npm run generate:docx -- --comments-json "<path-to-comments.json>" --teacher "<teacher name>" --subject "<subject>" [--outdir "<output-folder>"]

Examples:
  npm run generate:docx -- --persona "Saved Profiles/teacher_profile.json" --teacher "Teacher Name" --subject "English" "C:\\marks\\Term1.pdf"
  npm run generate:docx -- --comments-json "exports\\offline-comments.json" --teacher "Teacher Name" --subject "Subject"
`;

const parseArgs = (argv) => {
  const options = {};
  const files = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).trim();
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      files.push(arg);
    }
  }

  return { options, files };
};

const loadEnvFile = async () => {
  const envPath = path.resolve('.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    const env = {};
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = value;
    });
    return env;
  } catch {
    return {};
  }
};

const sanitizeFilenamePart = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Unknown';
  return trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_');
};

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.csv') return 'text/csv';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.doc') return 'application/msword';
  return 'application/octet-stream';
};

const parseJsonResponse = (rawText) => {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return [];

  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(withoutFence);
};

const ensureParentAlertInComment = (comment, riskAreas) => {
  const text = String(comment || '').trim();
  if (!riskAreas || riskAreas.length === 0) return text;

  const hasAlert = /parent alert|immediate support|priority|urgent|risk area|below pass|at risk/i.test(text);
  if (hasAlert) return text;

  const areaSummary = riskAreas.join('; ');
  const alert = `Formal parent alert: Immediate support is required in ${areaSummary}. These risk areas should be addressed with parents as a priority.`;
  return text ? `${text} ${alert}` : alert;
};

const makeCrcTable = () => {
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

const crc32 = (data) => {
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
};

const writeUint16 = (view, offset, value) => {
  view.setUint16(offset, value & 0xffff, true);
};

const writeUint32 = (view, offset, value) => {
  view.setUint32(offset, value >>> 0, true);
};

const concatBytes = (chunks) => {
  const total = chunks.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
};

const zipStore = (entries) => {
  const localParts = [];
  const centralParts = [];
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

const buildParagraphXml = (text, opts = {}) => {
  const boldTag = opts.bold ? '<w:b/>' : '';
  const spacingTag = Number.isFinite(opts.spacingAfter)
    ? `<w:pPr><w:spacing w:after="${opts.spacingAfter}"/></w:pPr>`
    : '';
  const sizeTag = Number.isFinite(opts.fontSizeHalfPt)
    ? `<w:sz w:val="${opts.fontSizeHalfPt}"/>`
    : '';

  return `<w:p>${spacingTag}<w:r><w:rPr>${boldTag}${sizeTag}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
};

const buildDocumentXml = (title, students) => {
  const content = [
    buildParagraphXml(title, { bold: true, spacingAfter: 320, fontSizeHalfPt: 32 }),
    ...students.flatMap((student) => [
      buildParagraphXml(normalizeText(student.name), { bold: true, spacingAfter: 120, fontSizeHalfPt: 28 }),
      buildParagraphXml(normalizeText(student.generatedComment), { spacingAfter: 240, fontSizeHalfPt: 24 }),
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

const generateComments = async ({ apiKey, model, persona, files }) => {
  const ai = new GoogleGenAI({ apiKey });

  const parts = [];
  for (const file of files) {
    const buffer = await fs.readFile(file);
    parts.push({
      inlineData: {
        mimeType: getMimeType(file),
        data: buffer.toString('base64'),
      },
    });
  }

  const prompt = `
Analyze these ${files.length} marksheet file(s). Identify each learner row and generate one report comment per learner.

Apply this teacher persona strictly:
Tone: ${persona.tone || ''}
Vocabulary: ${(persona.vocabulary || []).join(', ')}
Structure: ${persona.structure || ''}
Formatting: ${persona.formatting || ''}
Raw samples for context:
${persona.rawSamples || '(none)'}

Risk and parent-alert requirement:
- If any available mark is below 50%, flag as below pass mark.
- If any available mark is between 50% and 55% inclusive, flag as close to pass threshold.
- For flagged learners, include a formal and decisive parent-directed warning in the comment while keeping teacher tone professional.

Output only JSON array:
[
  {
    "name": "Learner Name",
    "comment": "Single polished paragraph",
    "riskAreas": ["Maths (49%) - below pass mark"],
    "parentAlertRequired": true
  }
]
`;

  parts.push({ text: prompt });

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        comment: { type: Type.STRING },
        riskAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        parentAlertRequired: { type: Type.BOOLEAN },
      },
      required: ['name', 'comment', 'riskAreas', 'parentAlertRequired'],
    },
  };

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const raw = parseJsonResponse(response.text || '[]');
  if (!Array.isArray(raw)) return [];

  return raw.map((item, index) => {
    const name = String(item?.name || `Learner ${index + 1}`).trim();
    const riskAreas = Array.isArray(item?.riskAreas)
      ? item.riskAreas.filter((x) => typeof x === 'string')
      : [];

    const generatedComment = ensureParentAlertInComment(item?.comment || '', riskAreas);
    return {
      name,
      generatedComment,
      riskAreas,
      parentAlertRequired: riskAreas.length > 0 || Boolean(item?.parentAlertRequired),
    };
  });
};

const createDocx = async ({ students, teacherName, subjectName, outputPath, exportDate }) => {
  const title = `${subjectName} Report Comments | ${teacherName} | Export ${exportDate}`;
  const documentXml = buildDocumentXml(title, students);
  const bytes = zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(RELS_XML) },
    { name: 'word/document.xml', data: encoder.encode(documentXml) },
  ]);
  await fs.writeFile(outputPath, Buffer.from(bytes));
};

const main = async () => {
  const { options, files } = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage);
    process.exit(0);
  }

  const personaPath = options.persona;
  const commentsJsonPath = options['comments-json'];
  const teacherName = options.teacher || 'Teacher Name';
  const subjectName = options.subject || 'Subject';
  const outdir = options.outdir || 'exports';
  const model = options.model || DEFAULT_MODEL;

  if ((!personaPath || files.length === 0) && !commentsJsonPath) {
    console.error('Missing required arguments.');
    console.error(usage);
    process.exit(1);
  }

  let students;
  if (commentsJsonPath) {
    const commentsRaw = await fs.readFile(path.resolve(commentsJsonPath), 'utf8');
    students = JSON.parse(commentsRaw);
  } else {
    const envFile = await loadEnvFile();
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || envFile.GEMINI_API_KEY || envFile.API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key. Set GEMINI_API_KEY (or API_KEY) in .env.local or environment variables.');
      process.exit(1);
    }

    const personaRaw = await fs.readFile(path.resolve(personaPath), 'utf8');
    const persona = JSON.parse(personaRaw);

    students = await generateComments({
      apiKey,
      model,
      persona,
      files: files.map((f) => path.resolve(f)),
    });
  }

  if (students.length === 0) {
    console.error('No learner comments were generated from the provided files.');
    process.exit(1);
  }

  const exportDate = new Date().toISOString().slice(0, 10);
  await fs.mkdir(path.resolve(outdir), { recursive: true });
  const outputName = `${exportDate}_${sanitizeFilenamePart(subjectName)}_${sanitizeFilenamePart(teacherName)}_Report_Comments.docx`;
  const outputPath = path.resolve(outdir, outputName);

  await createDocx({
    students,
    teacherName,
    subjectName,
    outputPath,
    exportDate,
  });

  const jsonOutputPath = outputPath.replace(/\.docx$/i, '.json');
  await fs.writeFile(jsonOutputPath, `${JSON.stringify(students, null, 2)}\n`, 'utf8');

  console.log(`Generated comments for ${students.length} learner(s).`);
  console.log(`DOCX: ${outputPath}`);
  console.log(`JSON: ${jsonOutputPath}`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
