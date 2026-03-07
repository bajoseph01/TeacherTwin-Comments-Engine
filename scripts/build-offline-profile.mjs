import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const usage = `
Usage:
  npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_slug" [--outdir "Saved Profiles"] [--source-dir "C:\\path\\to\\folder"]
  npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_slug" [--outdir "Saved Profiles"] "<sample-file-1>" "<sample-file-2>" ...
  npm run profile:offline -- --check-tools

What it does:
  - ingests local teacher sample files without Gemini
  - extracts text from TXT/MD/CSV/JSON/DOCX directly
  - attempts PDF text extraction via pdftotext when available
  - falls back to OCR for PDFs/images via pdftoppm + tesseract when available
  - attempts legacy .doc extraction via antiword/catdoc when available
  - writes an app-compatible profile JSON plus a comprehensive review file

Examples:
  npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" --source-dir "C:\\TeacherSamples"
  npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" "C:\\Samples\\comments.txt" "C:\\Samples\\reports.pdf"
`;

const SUPPORTED_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.docx',
  '.doc',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
]);

const DIRECT_TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']);
const JSON_PROFILE_KEYS = ['tone', 'vocabulary', 'structure', 'formatting'];
const MAX_RAW_SAMPLES_CHARS = 40000;
const MAX_VOCABULARY_ITEMS = 12;

const STOPWORDS = new Set([
  'a', 'about', 'above', 'across', 'after', 'again', 'against', 'all', 'almost', 'also', 'am', 'an', 'and',
  'any', 'are', 'around', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'done', 'down', 'during', 'each', 'either',
  'enough', 'even', 'every', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'however', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'itself', 'just', 'learner', 'learners', 'many', 'may', 'me', 'more', 'most', 'much', 'must', 'my', 'myself',
  'name', 'needs', 'next', 'no', 'nor', 'not', 'now', 'of', 'off', 'often', 'on', 'once', 'one', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'percent', 'please', 'progress', 'pupil', 'pupils',
  'really', 'report', 'reports', 'same', 'she', 'should', 'since', 'so', 'some', 'still', 'student', 'students',
  'such', 'term', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'use', 'very', 'was', 'we', 'well',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'will', 'with', 'would', 'you', 'your', 'yours',
  'yourself', 'yourselves',
]);

const buildToolLocations = (env) => ({
  pdftotext: [
    env.PDFTOTEXT_PATH,
    path.join(env.USERPROFILE || '', 'tools', 'poppler-25.12.0', 'Library', 'bin', 'pdftotext.exe'),
    path.join(env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'poppler.poppler_Microsoft.Winget.Source_8wekyb3d8bbwe', 'Library', 'bin', 'pdftotext.exe'),
    path.join(env.USERPROFILE || '', 'poppler-25.12.0', 'Library', 'bin', 'pdftotext.exe'),
    'pdftotext',
  ],
  pdftoppm: [
    env.PDFTOPPM_PATH,
    path.join(env.USERPROFILE || '', 'tools', 'poppler-25.12.0', 'Library', 'bin', 'pdftoppm.exe'),
    path.join(env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'poppler.poppler_Microsoft.Winget.Source_8wekyb3d8bbwe', 'Library', 'bin', 'pdftoppm.exe'),
    path.join(env.USERPROFILE || '', 'poppler-25.12.0', 'Library', 'bin', 'pdftoppm.exe'),
    'pdftoppm',
  ],
  tesseract: [
    env.TESSERACT_PATH,
    path.join(env.LOCALAPPDATA || '', 'Programs', 'Tesseract-OCR', 'tesseract.exe'),
    path.join(env.ProgramFiles || '', 'Tesseract-OCR', 'tesseract.exe'),
    'tesseract',
  ],
  antiword: [
    env.ANTIWORD_PATH,
    'antiword',
  ],
  catdoc: [
    env.CATDOC_PATH,
    'catdoc',
  ],
  tar: [
    env.TAR_PATH,
    'tar.exe',
    'tar',
  ],
});

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

const sanitizeFilenamePart = (value) =>
  String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');

const resolveManagedDir = ({ explicitDir, env, specificKey, fallbackSubdir, legacyDefault }) => {
  if (explicitDir) return path.resolve(explicitDir);
  if (env[specificKey]) return path.resolve(env[specificKey]);
  if (env.TEACHERTWIN_LOCAL_ROOT) return path.resolve(env.TEACHERTWIN_LOCAL_ROOT, fallbackSubdir);
  return path.resolve(legacyDefault);
};

const normalizeWhitespace = (value) => String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const slugify = (value) => {
  const basic = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return basic || 'teacher_profile';
};

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const isCommandAvailable = (commandPath) => {
  if (!commandPath) return false;

  if (commandPath.includes(path.sep) || commandPath.endsWith('.exe')) {
    return spawnSync(commandPath, ['-v'], { stdio: 'ignore', windowsHide: true }).status !== null;
  }

  return spawnSync(commandPath, ['-v'], { stdio: 'ignore', windowsHide: true, shell: false }).status !== null;
};

const resolveTool = async (toolName, toolLocations) => {
  for (const candidate of toolLocations[toolName]) {
    if (!candidate) continue;
    if (candidate.includes(path.sep) || candidate.endsWith('.exe')) {
      if (await pathExists(candidate)) return candidate;
      continue;
    }

    if (isCommandAvailable(candidate)) return candidate;
  }

  return null;
};

const runTool = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 50 * 1024 * 1024,
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim();
    const stdout = String(result.stdout || '').trim();
    throw new Error(stderr || stdout || `${path.basename(command)} exited with code ${result.status}`);
  }

  return result;
};

const listFilesRecursive = async (sourceDir) => {
  const results = [];
  const queue = [path.resolve(sourceDir)];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
};

const readJsonSource = (rawText) => {
  const parsed = JSON.parse(rawText);

  if (parsed && typeof parsed === 'object') {
    if (JSON_PROFILE_KEYS.every((key) => Object.hasOwn(parsed, key))) {
      return normalizeWhitespace([
        `Tone: ${parsed.tone || ''}`,
        `Structure: ${parsed.structure || ''}`,
        `Formatting: ${parsed.formatting || ''}`,
        `Vocabulary: ${Array.isArray(parsed.vocabulary) ? parsed.vocabulary.join(', ') : ''}`,
        parsed.rawSamples || '',
      ].join('\n'));
    }

    if (Array.isArray(parsed.sourceFiles) || parsed.draftProfile) {
      const draftProfile = parsed.draftProfile || {};
      return normalizeWhitespace([
        `Tone: ${draftProfile.tone || ''}`,
        `Structure: ${draftProfile.structure || ''}`,
        `Formatting: ${draftProfile.formatting || ''}`,
        `Vocabulary: ${Array.isArray(draftProfile.vocabulary) ? draftProfile.vocabulary.join(', ') : ''}`,
        draftProfile.rawSamples || parsed.rawSamples || '',
      ].join('\n'));
    }
  }

  return normalizeWhitespace(rawText);
};

const decodeXmlEntities = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const stripWordXml = (xml) => {
  const withBreaks = String(xml || '')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:p[^>]*>/g, '\n');
  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ');
  return normalizeWhitespace(decodeXmlEntities(withoutTags));
};

const extractDocxText = async (docxPath, tools) => {
  if (!tools.tar) {
    return { text: '', method: null, warnings: ['tar not found for DOCX extraction'] };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'teacher-twin-docx-'));
  try {
    try {
      runTool(tools.tar, ['-xf', docxPath, '-C', tempDir]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { text: '', method: null, warnings: [`DOCX extraction skipped: ${message}`] };
    }

    const wordDocumentPath = path.join(tempDir, 'word', 'document.xml');
    if (!(await pathExists(wordDocumentPath))) {
      return { text: '', method: null, warnings: ['DOCX unpacked but word/document.xml was not found'] };
    }

    const xml = await fs.readFile(wordDocumentPath, 'utf8');
    const text = stripWordXml(xml);
    return {
      text,
      method: text ? 'docx-xml' : null,
      warnings: text ? [] : ['DOCX text extraction returned no usable text'],
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const extractDocText = (docPath, tools) => {
  if (tools.antiword) {
    const result = runTool(tools.antiword, [docPath]);
    const text = normalizeWhitespace(result.stdout || '');
    return {
      text,
      method: text ? 'antiword' : null,
      warnings: text ? [] : ['antiword returned no usable text'],
    };
  }

  if (tools.catdoc) {
    const result = runTool(tools.catdoc, [docPath]);
    const text = normalizeWhitespace(result.stdout || '');
    return {
      text,
      method: text ? 'catdoc' : null,
      warnings: text ? [] : ['catdoc returned no usable text'],
    };
  }

  return {
    text: '',
    method: null,
    warnings: ['Legacy .doc extraction unavailable (install antiword/catdoc or convert to .docx/.pdf)'],
  };
};

const extractPdfText = (pdfPath, tools) => {
  if (!tools.pdftotext) {
    return { text: '', method: null, warnings: ['pdftotext not found'] };
  }

  try {
    const result = runTool(tools.pdftotext, ['-layout', '-nopgbrk', pdfPath, '-']);
    const text = normalizeWhitespace(result.stdout || '');
    return {
      text,
      method: text ? 'pdftotext' : null,
      warnings: text ? [] : ['pdftotext returned no usable text'],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: '', method: null, warnings: [`pdftotext failed: ${message}`] };
  }
};

const extractImageTextWithTesseract = (imagePath, tools) => {
  if (!tools.tesseract) {
    return { text: '', method: null, warnings: ['tesseract not found'] };
  }

  try {
    const result = runTool(tools.tesseract, [imagePath, 'stdout']);
    const text = normalizeWhitespace(result.stdout || '');
    return {
      text,
      method: text ? 'tesseract' : null,
      warnings: text ? [] : ['tesseract returned no usable text'],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: '', method: null, warnings: [`tesseract failed: ${message}`] };
  }
};

const extractPdfTextWithOcr = async (pdfPath, tools) => {
  if (!tools.pdftoppm || !tools.tesseract) {
    const missing = [];
    if (!tools.pdftoppm) missing.push('pdftoppm');
    if (!tools.tesseract) missing.push('tesseract');
    return { text: '', method: null, warnings: [`OCR unavailable: missing ${missing.join(' + ')}`] };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'teacher-twin-ocr-'));
  const prefix = path.join(tempDir, 'page');

  try {
    try {
      runTool(tools.pdftoppm, ['-png', '-r', '300', pdfPath, prefix]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { text: '', method: null, warnings: [`pdftoppm failed: ${message}`] };
    }

    const pageFiles = (await fs.readdir(tempDir))
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => path.join(tempDir, name));

    const pageTexts = [];
    for (const pageFile of pageFiles) {
      const pageResult = extractImageTextWithTesseract(pageFile, tools);
      if (pageResult.text) pageTexts.push(pageResult.text);
    }

    const text = normalizeWhitespace(pageTexts.join('\n\n'));
    return {
      text,
      method: text ? 'pdftoppm+tesseract' : null,
      warnings: text ? [] : ['OCR did not recover usable text from PDF'],
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const extractSourceText = async (filePath, tools) => {
  const resolvedPath = path.resolve(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const result = {
    path: resolvedPath,
    extension: ext,
    status: 'imported',
    extractionMethod: 'direct-read',
    characters: 0,
    warnings: [],
    text: '',
  };

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    result.status = 'skipped';
    result.extractionMethod = 'unsupported';
    result.warnings.push(`Unsupported file type: ${ext || '(none)'}`);
    return result;
  }

  if (DIRECT_TEXT_EXTENSIONS.has(ext)) {
    result.text = normalizeWhitespace(await fs.readFile(resolvedPath, 'utf8'));
    result.characters = result.text.length;
    return result;
  }

  if (ext === '.json') {
    const rawText = await fs.readFile(resolvedPath, 'utf8');
    result.text = readJsonSource(rawText);
    result.characters = result.text.length;
    return result;
  }

  if (ext === '.docx') {
    const extracted = await extractDocxText(resolvedPath, tools);
    result.text = extracted.text;
    result.extractionMethod = extracted.method || 'docx-unreadable';
    result.warnings.push(...extracted.warnings);
    result.characters = result.text.length;
    if (!result.text) result.status = 'warning';
    return result;
  }

  if (ext === '.doc') {
    const extracted = extractDocText(resolvedPath, tools);
    result.text = extracted.text;
    result.extractionMethod = extracted.method || 'doc-unreadable';
    result.warnings.push(...extracted.warnings);
    result.characters = result.text.length;
    if (!result.text) result.status = 'warning';
    return result;
  }

  if (ext === '.pdf') {
    const direct = extractPdfText(resolvedPath, tools);
    result.text = direct.text;
    result.extractionMethod = direct.method || 'pdf-unreadable';
    result.warnings.push(...direct.warnings);

    if (!result.text) {
      const ocr = await extractPdfTextWithOcr(resolvedPath, tools);
      result.text = ocr.text;
      result.extractionMethod = ocr.method || result.extractionMethod;
      result.warnings.push(...ocr.warnings);
    }

    result.characters = result.text.length;
    if (!result.text) result.status = 'warning';
    return result;
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    const ocr = extractImageTextWithTesseract(resolvedPath, tools);
    result.text = ocr.text;
    result.extractionMethod = ocr.method || 'image-unreadable';
    result.warnings.push(...ocr.warnings);
    result.characters = result.text.length;
    if (!result.text) result.status = 'warning';
    return result;
  }

  result.status = 'skipped';
  result.extractionMethod = 'unsupported';
  result.warnings.push(`No extraction path configured for ${ext}`);
  return result;
};

const splitSampleBlocks = (combinedText) =>
  normalizeWhitespace(combinedText)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length >= 20);

const sentenceCount = (text) => {
  const matches = String(text || '').match(/[.!?]+/g);
  return matches ? matches.length : 1;
};

const countMatches = (text, expressions) =>
  expressions.reduce((total, expression) => total + ((text.match(expression) || []).length), 0);

const collectVocabulary = (sampleText) => {
  const frequencies = new Map();
  const words = sampleText.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [];

  for (const word of words) {
    if (STOPWORDS.has(word)) continue;
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }

  return [...frequencies.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, MAX_VOCABULARY_ITEMS)
    .map(([word]) => word);
};

const inferTone = (sampleText) => {
  const lower = sampleText.toLowerCase();
  const descriptors = [];

  if (countMatches(lower, [/\bwell done\b/g, /\bpleasing\b/g, /\bexcellent\b/g, /\bcommendable\b/g, /\bproud\b/g, /\bencourag/g]) >= 2) {
    descriptors.push('encouraging');
  }

  if (countMatches(lower, [/\bmust\b/g, /\bneeds to\b/g, /\brequires\b/g, /\bimprove\b/g, /\bconcern\b/g, /\bpriority\b/g]) >= 2) {
    descriptors.push('direct about next steps');
  }

  if (countMatches(lower, [/\bconsistently\b/g, /\bdemonstrates\b/g, /\bshows\b/g, /\bapplies\b/g, /\bmaintains\b/g]) >= 2) {
    descriptors.push('observational');
  }

  if (countMatches(lower, [/\bkind\b/g, /\bpositive\b/g, /\brespectful\b/g, /\bconfident\b/g, /\bmature\b/g]) >= 2) {
    descriptors.push('warm');
  }

  if (countMatches(lower, [/\btherefore\b/g, /\bhowever\b/g, /\bwhilst\b/g, /\bfurther\b/g]) >= 2) {
    descriptors.push('formal');
  }

  if (descriptors.length === 0) {
    descriptors.push('professional', 'constructive');
  }

  return descriptors.join(', ');
};

const inferStructure = (blocks) => {
  const averageSentences = blocks.length === 0
    ? 0
    : Math.round((blocks.reduce((sum, block) => sum + sentenceCount(block), 0) / blocks.length) * 10) / 10;

  const lower = blocks.join('\n').toLowerCase();
  const startsWithPerformance = countMatches(lower, [/\bhas shown\b/g, /\bcontinues to\b/g, /\bis a\b/g, /\bdemonstrates\b/g]) >= 2;
  const hasGuidance = countMatches(lower, [/\bshould\b/g, /\bneeds to\b/g, /\bcan improve\b/g, /\bnext step\b/g, /\bfocus\b/g]) >= 2;
  const hasClosing = countMatches(lower, [/\bwell done\b/g, /\bkeep it up\b/g, /\bcontinue\b/g, /\bproud\b/g]) >= 2;

  const parts = [];
  if (averageSentences > 0) {
    parts.push(`Usually ${averageSentences} sentence${averageSentences === 1 ? '' : 's'} in one paragraph`);
  } else {
    parts.push('Single-paragraph report comment');
  }

  if (startsWithPerformance) {
    parts.push('opens with a performance or attitude summary');
  }

  if (hasGuidance) {
    parts.push('includes a specific improvement target');
  }

  if (hasClosing) {
    parts.push('often closes with encouragement');
  }

  return `${parts.join('; ')}.`;
};

const inferFormatting = (sampleText, blocks) => {
  const notes = [];
  const lower = sampleText.toLowerCase();

  if (/\bcolour\b|\bcentre\b|\bpractise\b|\bfavour\b|\bbehaviour\b/.test(lower)) {
    notes.push('British/South African spelling appears in source samples');
  } else {
    notes.push('Use British/South African spelling by default');
  }

  if ((sampleText.match(/%/g) || []).length > 3) {
    notes.push('Source samples sometimes include percentages');
  } else {
    notes.push('Prefer qualitative language over raw marks unless required');
  }

  if ((sampleText.match(/!/g) || []).length > 2) {
    notes.push('Exclamation marks appear occasionally for encouragement');
  }

  if (blocks.every((block) => !block.trim().startsWith('-') && !block.trim().startsWith('*'))) {
    notes.push('Comments are written as paragraphs, not bullet lists');
  }

  return notes.join('. ') + '.';
};

const truncateRawSamples = (blocks) => {
  const selected = [];
  let currentLength = 0;

  for (const block of blocks) {
    const nextLength = currentLength + block.length + 2;
    if (nextLength > MAX_RAW_SAMPLES_CHARS) break;
    selected.push(block);
    currentLength = nextLength;
  }

  return selected.join('\n\n');
};

const buildDraftProfile = ({ importedTexts, blocks }) => {
  const combinedText = normalizeWhitespace(importedTexts.join('\n\n'));
  const vocabulary = collectVocabulary(combinedText);

  return {
    tone: inferTone(combinedText),
    vocabulary,
    structure: inferStructure(blocks),
    formatting: inferFormatting(combinedText, blocks),
    isReady: true,
    rawSamples: truncateRawSamples(blocks),
  };
};

const main = async () => {
  const { options, files } = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage);
    return;
  }

  const teacherName = String(options.teacher || '').trim();
  const profileSlug = slugify(options.profile || teacherName);
  const sourceDir = options['source-dir'] ? path.resolve(options['source-dir']) : null;
  const checkToolsOnly = Boolean(options['check-tools']);

  const envFile = await loadEnvFile();
  const env = { ...envFile, ...process.env };
  const outdir = resolveManagedDir({
    explicitDir: options.outdir,
    env,
    specificKey: 'TEACHERTWIN_PROFILE_DIR',
    fallbackSubdir: 'profiles',
    legacyDefault: 'Saved Profiles',
  });
  const toolLocations = buildToolLocations(env);

  const tools = {
    pdftotext: await resolveTool('pdftotext', toolLocations),
    pdftoppm: await resolveTool('pdftoppm', toolLocations),
    tesseract: await resolveTool('tesseract', toolLocations),
    antiword: await resolveTool('antiword', toolLocations),
    catdoc: await resolveTool('catdoc', toolLocations),
    tar: await resolveTool('tar', toolLocations),
  };

  if (checkToolsOnly) {
    console.log('Tool Resolution');
    console.log(`pdftotext: ${tools.pdftotext || 'NOT FOUND'}`);
    console.log(`pdftoppm: ${tools.pdftoppm || 'NOT FOUND'}`);
    console.log(`tesseract: ${tools.tesseract || 'NOT FOUND'}`);
    console.log(`antiword: ${tools.antiword || 'NOT FOUND'}`);
    console.log(`catdoc: ${tools.catdoc || 'NOT FOUND'}`);
    console.log(`tar: ${tools.tar || 'NOT FOUND'}`);
    if (!teacherName && !sourceDir && files.length === 0) {
      return;
    }
  }

  if (!teacherName) {
    console.error('Missing required argument: --teacher');
    console.error(usage);
    process.exit(1);
  }

  let sourceFiles = files.map((file) => path.resolve(file));
  if (sourceDir) {
    if (!(await pathExists(sourceDir))) {
      console.error(`Source directory not found: ${sourceDir}`);
      process.exit(1);
    }
    sourceFiles = await listFilesRecursive(sourceDir);
  }

  if (sourceFiles.length === 0) {
    console.error('No input files were provided.');
    console.error(usage);
    process.exit(1);
  }

  const extracted = [];
  for (const filePath of sourceFiles) {
    extracted.push(await extractSourceText(filePath, tools));
  }

  const importedTexts = extracted
    .filter((item) => item.text)
    .map((item) => item.text);

  const blocks = splitSampleBlocks(importedTexts.join('\n\n'));
  if (blocks.length === 0) {
    console.error('No usable text could be extracted from the provided files.');
    process.exit(1);
  }

  const draftProfile = buildDraftProfile({ importedTexts, blocks });
  const warnings = extracted.flatMap((item) => item.warnings.map((warning) => `${path.basename(item.path)}: ${warning}`));
  const createdAt = new Date().toISOString();

  const comprehensiveProfile = {
    teacherName,
    profileSlug,
    createdAt,
    mode: 'offline-profile-ingest',
    tools,
    sourceSummary: {
      inputFileCount: sourceFiles.length,
      importedFileCount: extracted.filter((item) => item.text).length,
      warningFileCount: extracted.filter((item) => item.status === 'warning').length,
      skippedFileCount: extracted.filter((item) => item.status === 'skipped').length,
      sampleBlockCount: blocks.length,
      extractedCharacterCount: importedTexts.reduce((sum, text) => sum + text.length, 0),
    },
    sourceFiles: extracted.map((item) => ({
      path: item.path,
      extension: item.extension,
      status: item.status,
      extractionMethod: item.extractionMethod,
      characters: item.characters,
      warnings: item.warnings,
    })),
    draftProfile,
    warnings,
  };

  await fs.mkdir(outdir, { recursive: true });

  const minimalProfilePath = path.join(outdir, `${profileSlug}.json`);
  const comprehensiveProfilePath = path.join(outdir, `${profileSlug}_comprehensive.json`);
  const rawSamplesPath = path.join(outdir, `${profileSlug}_raw_samples.txt`);

  await fs.writeFile(minimalProfilePath, `${JSON.stringify(draftProfile, null, 2)}\n`, 'utf8');
  await fs.writeFile(comprehensiveProfilePath, `${JSON.stringify(comprehensiveProfile, null, 2)}\n`, 'utf8');
  await fs.writeFile(rawSamplesPath, `${draftProfile.rawSamples}\n`, 'utf8');

  console.log(`Created offline teacher profile for ${teacherName}.`);
  console.log(`Profile JSON: ${minimalProfilePath}`);
  console.log(`Comprehensive JSON: ${comprehensiveProfilePath}`);
  console.log(`Raw samples: ${rawSamplesPath}`);

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
