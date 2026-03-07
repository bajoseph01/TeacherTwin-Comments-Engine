import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const usage = `
Usage:
  npm run profile:deep -- --teacher "Teacher Name" --profile "teacher_slug" [--outdir "workspace\\profiles"] [--source-dir "C:\\path\\to\\folder"]
  npm run profile:deep -- --teacher "Teacher Name" --profile "teacher_slug" [--outdir "workspace\\profiles"] "<sample-file-1>" "<sample-file-2>" ...
  npm run profile:deep -- --check-tools

What it does:
  - builds a deep report-comment persona pack from real prose samples
  - extracts PDF text with pdftotext first, OCR fallback via pdftoppm + tesseract
  - extracts legacy .xls/.xlsx workbooks via Excel COM in read-only mode on Windows
  - treats existing persona JSON files as weak-reference inputs only
  - writes a minimal app persona JSON plus comprehensive analysis, corpus, phrase bank, and review markdown
`;

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']);
const SUPPORTED_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.pdf',
  '.docx',
  '.doc',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
  '.xls',
  '.xlsx',
]);

const MAX_RAW_SAMPLES_CHARS = 40000;
const MAX_EXCEL_ROWS = 500;
const MAX_EXCEL_COLS = 120;
const MIN_COMMENT_LENGTH = 40;
const EXACT_DUPLICATE_SIMILARITY = 0.999;
const NEAR_DUPLICATE_SIMILARITY = 0.9;

const STOPWORDS = new Set([
  'a', 'about', 'above', 'across', 'after', 'again', 'against', 'all', 'almost', 'also', 'am', 'an', 'and',
  'any', 'are', 'around', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'done', 'down', 'during', 'each', 'either',
  'enough', 'even', 'every', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'however', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'itself', 'just', 'many', 'may', 'me', 'more', 'most', 'much', 'must', 'my', 'myself',
  'name', 'needs', 'next', 'no', 'nor', 'not', 'now', 'of', 'off', 'often', 'on', 'once', 'one', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'percent', 'same', 'she', 'should', 'since', 'so',
  'some', 'still', 'student', 'students', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'use', 'very', 'was', 'we', 'well', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'will', 'with',
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
]);

const PRAISE_KEYWORDS = [
  'proud', 'pleased', 'outstanding', 'excellent', 'exceptional', 'strong', 'good', 'commendable', 'amazing',
  'diligent', 'confident', 'mature', 'improved', 'dominant', 'success', 'consistent', 'solid', 'gifted',
  'blossomed', 'growth', 'wonderful', 'sterling', 'inspired',
];

const CORRECTIVE_KEYWORDS = [
  'needs', 'must', 'urge', 'warning', 'warned', 'improve', 'attention', 'careless', 'carelessness', 'focus',
  'motivation', 'organization', 'organised', 'organized', 'anxiety', 'serious', 'support', 'distraction',
  'distracted', 'attitude', 'promptness', 'presentation', 'rest', 'study', 'practice', 'practising', 'practicing',
];

const ASPIRATIONAL_KEYWORDS = [
  'potential', 'capable', 'reach', 'target', '70%', '75%', '80%', 'journey', 'grow', 'growth', 'next year',
  'grade', 'college', 'future', 'rise', 'challenge', 'momentum',
];

const STUDY_HABIT_KEYWORDS = [
  'study', 'notes', 'skills', 'extra', 'vocabulary', 'reading', 'practising', 'practicing', 'homework',
  'organization', 'organised', 'organized', 'support', 'structure', 'consolidation', 'habits', 'effort',
];

const CLOSER_PATTERNS = [
  /well done/gi,
  /thank you/gi,
  /all the best/gi,
  /good luck/gi,
  /see you next year/gi,
  /i look forward/gi,
  /i am excited/gi,
  /very proud/gi,
  /keep (?:going|growing)/gi,
  /uitmuntende prestasie/gi,
];

const ADDRESS_PATTERNS = [
  /young man/gi,
  /young lady/gi,
  /champ/gi,
  /jong dame/gi,
  /young gentleman/gi,
];

const TRANSITION_PATTERNS = [
  /\balthough\b/gi,
  /\bhowever\b/gi,
  /\bbut\b/gi,
  /\bwhile\b/gi,
  /\beven though\b/gi,
  /\bunfortunately\b/gi,
  /\bsadly\b/gi,
  /\boverall\b/gi,
];

const PATTERN_FAMILIES = [
  {
    id: 'improvement_arc',
    label: 'Improvement Arc',
    tests: [/\bimprov/gi, /\bturnaround\b/gi, /\bgrow(?:n|th)?\b/gi, /\bblossom/gi, /\bpositive trend\b/gi, /\bmost improved\b/gi],
  },
  {
    id: 'high_achiever',
    label: 'High Achiever',
    tests: [/\boutstanding\b/gi, /\bdominant\b/gi, /\bexcellent\b/gi, /\bhighest calibre\b/gi, /\bexceptional\b/gi, /\bgifted\b/gi],
  },
  {
    id: 'underachiever_with_potential',
    label: 'Underachiever With Potential',
    tests: [/\bpotential\b/gi, /\bfraction of (?:his|her|their) potential\b/gi, /\bunderachiev/gi, /\bmore in the tank\b/gi, /\bcapable of\b/gi, /\bif (?:he|she|they) wants? to\b/gi],
  },
  {
    id: 'attitude_support',
    label: 'Attitude And Support',
    tests: [/\battitude\b/gi, /\bstudy skills\b/gi, /\bsupport\b/gi, /\bwork ethic\b/gi, /\bmaturity\b/gi, /\borganized\b/gi, /\borganised\b/gi],
  },
  {
    id: 'final_term_next_year',
    label: 'Final Term / Next Year Transition',
    tests: [/\bnext year\b/gi, /\bgrade [567]\b/gi, /\bnew year\b/gi, /\bholiday/gi, /\bcollege afrikaans\b/gi, /\bjourney\b/gi],
  },
];

const CONTAMINATION_TERMS = [
  'titshalakazi',
  'isixhosa',
  'energy',
  'scientific processes',
  'garageband',
  '3d printing',
  'minecraft',
  'epic',
  'emojis',
  'changes of state',
];

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
  powershell: [
    env.POWERSHELL_PATH,
    path.join(process.env.SystemRoot || 'C:\\WINDOWS', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    'powershell.exe',
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

const slugify = (value) => {
  const basic = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return basic || 'teacher_profile';
};

const resolveManagedDir = ({ explicitDir, env, specificKey, fallbackSubdir, legacyDefault }) => {
  if (explicitDir) return path.resolve(explicitDir);
  if (env[specificKey]) return path.resolve(env[specificKey]);
  if (env.TEACHERTWIN_LOCAL_ROOT) return path.resolve(env.TEACHERTWIN_LOCAL_ROOT, fallbackSubdir);
  return path.resolve(legacyDefault);
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
    maxBuffer: 100 * 1024 * 1024,
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

const normalizeWhitespace = (value) =>
  String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

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
    runTool(tools.tar, ['-xf', docxPath, '-C', tempDir]);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: '', method: null, warnings: [`DOCX extraction skipped: ${message}`] };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const extractDocText = (docPath, tools) => {
  if (tools.antiword) {
    try {
      const result = runTool(tools.antiword, [docPath]);
      const text = normalizeWhitespace(result.stdout || '');
      return { text, method: text ? 'antiword' : null, warnings: text ? [] : ['antiword returned no usable text'] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { text: '', method: null, warnings: [`antiword failed: ${message}`] };
    }
  }

  if (tools.catdoc) {
    try {
      const result = runTool(tools.catdoc, [docPath]);
      const text = normalizeWhitespace(result.stdout || '');
      return { text, method: text ? 'catdoc' : null, warnings: text ? [] : ['catdoc returned no usable text'] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { text: '', method: null, warnings: [`catdoc failed: ${message}`] };
    }
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
    runTool(tools.pdftoppm, ['-png', '-r', '300', pdfPath, prefix]);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: '', method: null, warnings: [`OCR extraction failed: ${message}`] };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const escapePowerShellSingleQuoted = (value) => String(value || '').replace(/'/g, "''");

const runPowerShellJson = async (scriptContent, tools) => {
  if (!tools.powershell) {
    throw new Error('PowerShell not found; Excel COM extraction is unavailable.');
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'teacher-twin-ps-'));
  const scriptPath = path.join(tempDir, 'extract.ps1');

  try {
    await fs.writeFile(scriptPath, scriptContent, 'utf8');
    const result = runTool(tools.powershell, [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
    ]);
    return JSON.parse(String(result.stdout || '').trim() || 'null');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const extractWorkbookWithExcelCom = async (filePath, tools) => {
  if (process.platform !== 'win32') {
    return { workbook: null, warnings: ['Excel COM extraction is only available on Windows'] };
  }

  const resolved = path.resolve(filePath);
  const psScript = `
$ErrorActionPreference = 'Stop'
function Release-ComObjectSafe([object]$obj) {
  if ($null -ne $obj) {
    [void][System.Runtime.Interopservices.Marshal]::ReleaseComObject($obj)
  }
}

$excel = $null
$workbook = $null
$usedRange = $null
$sheet = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open('${escapePowerShellSingleQuoted(resolved)}', $null, $true)
  $sheets = New-Object System.Collections.ArrayList

  foreach ($sheet in $workbook.Worksheets) {
    $usedRange = $sheet.UsedRange
    $rowCount = [Math]::Min([int]$usedRange.Rows.Count, ${MAX_EXCEL_ROWS})
    $columnCount = [Math]::Min([int]$usedRange.Columns.Count, ${MAX_EXCEL_COLS})
    $rows = New-Object System.Collections.ArrayList

    for ($r = 1; $r -le $rowCount; $r++) {
      $row = New-Object System.Collections.ArrayList
      for ($c = 1; $c -le $columnCount; $c++) {
        [void]$row.Add([string]$sheet.Cells.Item($r, $c).Text)
      }
      [void]$rows.Add($row.ToArray())
    }

    [void]$sheets.Add([pscustomobject]@{
      name = [string]$sheet.Name
      rowCount = [int]$usedRange.Rows.Count
      columnCount = [int]$usedRange.Columns.Count
      rows = $rows.ToArray()
    })

    Release-ComObjectSafe $usedRange
    $usedRange = $null
    Release-ComObjectSafe $sheet
    $sheet = $null
  }

  $payload = [pscustomobject]@{
    workbookName = [string]$workbook.Name
    sheets = $sheets.ToArray()
  }

  $payload | ConvertTo-Json -Depth 8 -Compress
}
finally {
  if ($null -ne $workbook) { $workbook.Close($false) }
  if ($null -ne $excel) { $excel.Quit() }
  Release-ComObjectSafe $usedRange
  Release-ComObjectSafe $sheet
  Release-ComObjectSafe $workbook
  Release-ComObjectSafe $excel
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
`;

  try {
    const workbook = await runPowerShellJson(psScript, tools);
    return { workbook, warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { workbook: null, warnings: [`Excel COM extraction failed: ${message}`] };
  }
};

const splitSampleBlocks = (combinedText) =>
  normalizeWhitespace(combinedText)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length >= MIN_COMMENT_LENGTH);

const sentenceCount = (text) => {
  const matches = String(text || '').match(/[.!?]+/g);
  return matches ? matches.length : 1;
};

const sentenceSplit = (text) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];

const normalizeNameKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeHeader = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseNumeric = (value) => {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractTermHint = (filePath) => {
  const source = filePath.replace(/\\/g, ' ');
  const termMatch = source.match(/\b(?:term|t)\s*[_-]?([1-4])\b/i);
  const yearMatch = source.match(/\b(20\d{2})\b/);
  const parts = [];
  if (termMatch) parts.push(`Term ${termMatch[1]}`);
  if (yearMatch) parts.push(yearMatch[1]);
  return parts.join(' ').trim() || null;
};

const cleanCommentText = (value) =>
  normalizeWhitespace(
    String(value || '')
      .replace(/^subject comment:\s*/i, '')
      .replace(/^b\.?\s*joseph\s*-\s*/i, '')
      .replace(/^b\.?\s*joseph\s*--\s*/i, '')
      .replace(/^b\.?\s*joseph\s*\u2013\s*/i, '')
      .replace(/^-\s*/, ''),
  );

const buildLearnerName = ({ firstNames, surname }) =>
  normalizeWhitespace([String(firstNames || '').trim(), String(surname || '').trim()].filter(Boolean).join(' '));

const longestCellValue = (row) =>
  (Array.isArray(row) ? row : [])
    .map((cell) => normalizeWhitespace(cell))
    .sort((a, b) => b.length - a.length)[0] || '';

const parseLearnerNameFromNameCell = (value) => {
  const cleaned = normalizeWhitespace(String(value || '').replace(/->.*$/, ''));
  if (!cleaned) return null;

  const surnameFirstMatch = cleaned.match(/^([^,]+),\s*(.+)$/);
  if (surnameFirstMatch) {
    return buildLearnerName({
      firstNames: surnameFirstMatch[2],
      surname: surnameFirstMatch[1],
    });
  }

  return cleaned;
};

const extractClassFromText = (value) => {
  const normalized = normalizeWhitespace(value);
  const arrowMatch = normalized.match(/->\s*([0-9]{1,2}[A-Z])\b/i);
  if (arrowMatch) return arrowMatch[1].toUpperCase();

  const classMatch = normalized.match(/\bclass[:\s]+([0-9]{1,2}[A-Z])\b/i);
  if (classMatch) return classMatch[1].toUpperCase();

  return null;
};

const inferGradeFromText = (value) => {
  const normalized = normalizeWhitespace(value);
  const explicitMatch = normalized.match(/\b(?:grade|gr)\s*([0-9]{1,2})\b/i);
  if (explicitMatch) return `Grade ${explicitMatch[1]}`;

  const classMatch = normalized.match(/\b([0-9]{1,2})[A-Z]\b/);
  if (classMatch) return `Grade ${classMatch[1]}`;

  return null;
};

const inferGradeFromFilePath = (filePath) => inferGradeFromText(String(filePath || '').replace(/[_\\/-]+/g, ' '));

const inferSubjectFromFilePath = (filePath) => {
  const normalized = String(filePath || '').toLowerCase();

  if (/\bisixhosa\b|\bxhosa\b/.test(normalized)) return 'isiXhosa';
  if (/\bafrikaans\b|\bafr\b/.test(normalized)) return 'Afrikaans';
  if (/\benglish\b|\beng\b/.test(normalized)) return 'English';
  if (/\bmathematics\b|\bmaths\b|\bmath\b/.test(normalized)) return 'Mathematics';
  if (/\bnatural sciences\b|\bscience\b/.test(normalized)) return 'Natural Sciences';
  if (/\bhistory\b/.test(normalized)) return 'History';
  if (/\bgeography\b/.test(normalized)) return 'Geography';

  return null;
};

const extractLearnerContextFromWorkbookRow = ({
  row,
  nameIndex,
  firstNamesIndex,
  surnameIndex,
  classIndex,
  gradeIndex,
}) => {
  const learnerName = buildLearnerName({
    firstNames: firstNamesIndex === -1 ? '' : row[firstNamesIndex],
    surname: surnameIndex === -1 ? '' : row[surnameIndex],
  }) || parseLearnerNameFromNameCell(nameIndex === -1 ? '' : row[nameIndex]);

  const rawNameCell = nameIndex === -1 ? '' : row[nameIndex];
  const className = String(classIndex === -1 ? '' : row[classIndex]).trim() || extractClassFromText(rawNameCell);
  const grade = String(gradeIndex === -1 ? '' : row[gradeIndex]).trim() || inferGradeFromText(className || rawNameCell);

  return {
    learnerName,
    className: className || null,
    grade: grade || null,
  };
};

const generalizeCommentText = (text, learnerName) => {
  let output = String(text || '');
  const parts = String(learnerName || '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .sort((a, b) => b.length - a.length);

  for (const part of parts) {
    const pattern = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\\\]/g, '\\$&')}\\b`, 'gi');
    output = output.replace(pattern, '<learner>');
  }

  return normalizeWhitespace(output);
};

const findHeaderRowIndex = (rows, target) => {
  for (let index = 0; index < rows.length; index += 1) {
    const normalizedCells = rows[index].map((cell) => normalizeHeader(cell));
    if (normalizedCells.includes(target)) return index;
  }
  return -1;
};

const buildColumnMap = (headerRow) => {
  const map = new Map();
  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (normalized) map.set(normalized, index);
  });
  return map;
};

const lookupHeaderIndex = (columnMap, aliases) => {
  for (const alias of aliases) {
    if (columnMap.has(alias)) return columnMap.get(alias);
  }
  return -1;
};

const readMetadataFromSheetRows = (rows) => {
  const metadata = {
    grade: null,
    subject: null,
    staff: null,
  };

  for (const row of rows.slice(0, 8)) {
    const joined = normalizeWhitespace(row.join(' '));
    if (!metadata.grade) {
      const gradeMatch = joined.match(/grade[:\s]+(.+)/i);
      if (gradeMatch) metadata.grade = normalizeWhitespace(gradeMatch[1]);
    }
    if (!metadata.subject) {
      const subjectMatch = joined.match(/subject[:\s]+(.+)/i);
      if (subjectMatch) metadata.subject = normalizeWhitespace(subjectMatch[1]);
    }
    if (!metadata.staff) {
      const staffMatch = joined.match(/staff[:\s]+(.+)/i);
      if (staffMatch) metadata.staff = normalizeWhitespace(staffMatch[1]);
    }
  }

  return metadata;
};

const extractWorkbookComments = ({ filePath, workbook, extractionMethod }) => {
  const sourceMeta = {
    path: path.resolve(filePath),
    extension: path.extname(filePath).toLowerCase(),
    sourceType: 'excel-workbook',
    extractionMethod,
    workbookName: workbook?.workbookName || path.basename(filePath),
    contextOnly: false,
    warnings: [],
    sheets: [],
  };

  if (!workbook || !Array.isArray(workbook.sheets)) {
    sourceMeta.contextOnly = true;
    sourceMeta.warnings.push('Workbook contained no readable worksheets');
    return { corpusRows: [], sourceMeta };
  }

  const inferredWorkbookGrade = inferGradeFromFilePath(filePath);
  const inferredWorkbookSubject = inferSubjectFromFilePath(filePath);
  const contextByName = new Map();
  for (const sheet of workbook.sheets) {
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const headerIndex = findHeaderRowIndex(rows, 'surname');
    if (headerIndex === -1) continue;
    const columnMap = buildColumnMap(rows[headerIndex]);
    const nameIndex = lookupHeaderIndex(columnMap, ['name', 'learner']);
    const surnameIndex = lookupHeaderIndex(columnMap, ['surname']);
    const firstNamesIndex = lookupHeaderIndex(columnMap, ['first names', 'first name', 'firstnames', 'preferred name', 'preferredname']);
    const classIndex = lookupHeaderIndex(columnMap, ['class']);
    const gradeIndex = lookupHeaderIndex(columnMap, ['grade']);
    if (nameIndex === -1 && (surnameIndex === -1 || firstNamesIndex === -1)) continue;

    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const learner = extractLearnerContextFromWorkbookRow({
        row,
        nameIndex,
        firstNamesIndex,
        surnameIndex,
        classIndex,
        gradeIndex,
      });
      if (!learner.learnerName) continue;
      contextByName.set(normalizeNameKey(learner.learnerName), {
        className: learner.className,
        grade: learner.grade,
      });
    }
  }

  const termHint = extractTermHint(filePath);
  const corpusRows = [];
  let extractedCommentCount = 0;

  for (const sheet of workbook.sheets) {
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const metadata = readMetadataFromSheetRows(rows);
    const headerIndex = findHeaderRowIndex(rows, 'comment');
    const learnerHeaderIndex = findHeaderRowIndex(rows, 'surname');
    const sheetSummary = {
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      role: 'context-only',
      extractedComments: 0,
    };

    if (headerIndex === -1) {
      sourceMeta.sheets.push(sheetSummary);
      continue;
    }

    const columnMap = buildColumnMap(rows[headerIndex]);
    const commentIndex = lookupHeaderIndex(columnMap, ['comment', 'subject comment', 'comments']);
    const surnameIndex = lookupHeaderIndex(columnMap, ['surname']);
    const firstNamesIndex = lookupHeaderIndex(columnMap, ['first names', 'first name', 'firstnames', 'preferred name', 'preferredname']);
    const gradeIndex = lookupHeaderIndex(columnMap, ['grade']);
    const classIndex = lookupHeaderIndex(columnMap, ['class']);

    if (commentIndex === -1 || surnameIndex === -1 || firstNamesIndex === -1) {
      if (learnerHeaderIndex === -1) {
        sourceMeta.sheets.push(sheetSummary);
        continue;
      }

      const learnerColumnMap = buildColumnMap(rows[learnerHeaderIndex]);
      const nameIndex = lookupHeaderIndex(learnerColumnMap, ['name', 'learner']);
      const learnerSurnameIndex = lookupHeaderIndex(learnerColumnMap, ['surname']);
      const learnerFirstNamesIndex = lookupHeaderIndex(learnerColumnMap, ['first names', 'first name', 'firstnames', 'preferred name', 'preferredname']);
      const learnerClassIndex = lookupHeaderIndex(learnerColumnMap, ['class']);
      const learnerGradeIndex = lookupHeaderIndex(learnerColumnMap, ['grade']);

      if (nameIndex === -1 && (learnerSurnameIndex === -1 || learnerFirstNamesIndex === -1)) {
        sourceMeta.sheets.push(sheetSummary);
        continue;
      }

      for (let rowIndex = learnerHeaderIndex + 1; rowIndex < rows.length - 1; rowIndex += 1) {
        const learnerRow = rows[rowIndex];
        const learner = extractLearnerContextFromWorkbookRow({
          row: learnerRow,
          nameIndex,
          firstNamesIndex: learnerFirstNamesIndex,
          surnameIndex: learnerSurnameIndex,
          classIndex: learnerClassIndex,
          gradeIndex: learnerGradeIndex,
        });
        if (!learner.learnerName) continue;

        const commentText = cleanCommentText(longestCellValue(rows[rowIndex + 1]));
        if (commentText.length < MIN_COMMENT_LENGTH) continue;

        const context = contextByName.get(normalizeNameKey(learner.learnerName)) || {};
        corpusRows.push({
          id: `src-${corpusRows.length + 1}`,
          source_file: path.resolve(filePath),
          source_type: 'excel-comment-sheet',
          sheet_name: sheet.name,
          grade: learner.grade || context.grade || metadata.grade || inferredWorkbookGrade || null,
          subject: metadata.subject || inferredWorkbookSubject,
          learner_name: learner.learnerName,
          class_name: learner.className || context.className || null,
          term_hint: termHint,
          comment_text: commentText,
          generalized_text: generalizeCommentText(commentText, learner.learnerName),
          source_weight: 1,
          voice_eligible: true,
          extraction_method: `${extractionMethod}+alternating-export`,
        });
        extractedCommentCount += 1;
        sheetSummary.extractedComments += 1;
        sheetSummary.role = 'comment-sheet';
        rowIndex += 1;
      }

      sourceMeta.sheets.push(sheetSummary);
      continue;
    }

    sheetSummary.role = 'comment-sheet';

    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const commentText = cleanCommentText(row[commentIndex]);
      const learnerName = buildLearnerName({
        firstNames: row[firstNamesIndex],
        surname: row[surnameIndex],
      });
      if (!learnerName || commentText.length < MIN_COMMENT_LENGTH) continue;

      const context = contextByName.get(normalizeNameKey(learnerName)) || {};
      corpusRows.push({
        id: `src-${corpusRows.length + 1}`,
        source_file: path.resolve(filePath),
        source_type: 'excel-comment-sheet',
        sheet_name: sheet.name,
        grade: String(row[gradeIndex] || '').trim() || context.grade || metadata.grade || inferredWorkbookGrade || null,
        subject: metadata.subject || inferredWorkbookSubject,
        learner_name: learnerName,
        class_name: String(row[classIndex] || '').trim() || context.className || null,
        term_hint: termHint,
        comment_text: commentText,
        generalized_text: generalizeCommentText(commentText, learnerName),
        source_weight: 1,
        voice_eligible: true,
        extraction_method: extractionMethod,
      });
      extractedCommentCount += 1;
      sheetSummary.extractedComments += 1;
    }

    sourceMeta.sheets.push(sheetSummary);
  }

  sourceMeta.contextOnly = extractedCommentCount === 0;
  if (sourceMeta.contextOnly) {
    sourceMeta.warnings.push('Workbook contained no comment-bearing sheets; treated as context-only');
  }

  return { corpusRows, sourceMeta };
};

const extractPdfComments = ({ filePath, text, extractionMethod, warnings = [] }) => {
  const sourceMeta = {
    path: path.resolve(filePath),
    extension: path.extname(filePath).toLowerCase(),
    sourceType: 'pdf',
    extractionMethod,
    contextOnly: false,
    warnings: [...warnings],
    extractedComments: 0,
  };

  if (!text) {
    sourceMeta.contextOnly = true;
    sourceMeta.warnings.push('PDF text extraction returned no usable text');
    return { corpusRows: [], sourceMeta };
  }

  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const corpusRows = [];
  const termHint = extractTermHint(filePath);
  let currentGrade = null;
  let currentSubject = null;
  let currentStaff = null;
  let currentLearner = null;
  let collectingComment = false;
  let commentBuffer = [];

  const flushComment = () => {
    if (!currentLearner || commentBuffer.length === 0) {
      commentBuffer = [];
      collectingComment = false;
      return;
    }

    const commentText = cleanCommentText(commentBuffer.join(' '));
    if (commentText.length >= MIN_COMMENT_LENGTH) {
      corpusRows.push({
        id: `src-${corpusRows.length + 1}`,
        source_file: path.resolve(filePath),
        source_type: 'pdf-comment-sheet',
        sheet_name: null,
        grade: currentGrade,
        subject: currentSubject,
        learner_name: currentLearner,
        class_name: null,
        term_hint: termHint,
        comment_text: commentText,
        generalized_text: generalizeCommentText(commentText, currentLearner),
        source_weight: 1,
        voice_eligible: true,
        extraction_method: extractionMethod,
      });
      sourceMeta.extractedComments += 1;
    }

    commentBuffer = [];
    collectingComment = false;
  };

  for (const line of lines) {
    if (/^grade:/i.test(line)) {
      flushComment();
      currentGrade = normalizeWhitespace(line.replace(/^grade:\s*/i, ''));
      continue;
    }
    if (/^subject:/i.test(line)) {
      flushComment();
      currentSubject = normalizeWhitespace(line.replace(/^subject:\s*/i, ''));
      continue;
    }
    if (/^staff:/i.test(line)) {
      flushComment();
      currentStaff = normalizeWhitespace(line.replace(/^staff:\s*/i, ''));
      continue;
    }
    if (/^learner:/i.test(line)) {
      flushComment();
      const learnerRaw = normalizeWhitespace(line.replace(/^learner:\s*/i, '').replace(/\(\d+\)\s*$/, ''));
      const learnerMatch = learnerRaw.match(/^([^,]+),\s*(.+)$/);
      currentLearner = learnerMatch
        ? buildLearnerName({ firstNames: learnerMatch[2], surname: learnerMatch[1] })
        : learnerRaw;
      continue;
    }
    if (/^subject comment:/i.test(line)) {
      collectingComment = true;
      commentBuffer.push(line);
      continue;
    }
    if (/^comment checking sheet$/i.test(line)) {
      flushComment();
      continue;
    }
    if (collectingComment) {
      commentBuffer.push(line);
    }
  }

  flushComment();

  if (currentStaff && !/b\.?\s*joseph/i.test(currentStaff)) {
    sourceMeta.warnings.push(`PDF staff header did not match B. Joseph: ${currentStaff}`);
  }

  sourceMeta.contextOnly = corpusRows.length === 0;
  if (sourceMeta.contextOnly) {
    sourceMeta.warnings.push('PDF contained no parsable learner comment sections');
  }

  return { corpusRows, sourceMeta };
};

const extractJsonReference = async (filePath) => {
  const rawText = await fs.readFile(path.resolve(filePath), 'utf8');
  const parsed = JSON.parse(rawText);

  const vocabulary = Array.isArray(parsed?.vocabulary) ? parsed.vocabulary.map((item) => String(item).trim()).filter(Boolean) : [];
  const rawSamples = String(parsed?.rawSamples || parsed?.draftProfile?.rawSamples || '').trim();
  const noteParts = [
    parsed?.tone ? `Tone: ${parsed.tone}` : '',
    parsed?.structure ? `Structure: ${parsed.structure}` : '',
    parsed?.formatting ? `Formatting: ${parsed.formatting}` : '',
  ].filter(Boolean);

  return {
    path: path.resolve(filePath),
    extension: '.json',
    sourceType: 'json-reference',
    extractionMethod: 'json-reference-read',
    voiceEligible: false,
    vocabulary,
    rawSamples,
    notes: noteParts,
  };
};

const extractGenericTextSource = async (filePath, tools) => {
  const resolvedPath = path.resolve(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    return {
      text: normalizeWhitespace(await fs.readFile(resolvedPath, 'utf8')),
      method: 'direct-read',
      warnings: [],
    };
  }

  if (ext === '.docx') return extractDocxText(resolvedPath, tools);
  if (ext === '.doc') return extractDocText(resolvedPath, tools);
  if (IMAGE_EXTENSIONS.has(ext)) return extractImageTextWithTesseract(resolvedPath, tools);

  return {
    text: '',
    method: null,
    warnings: [`Unsupported generic text source: ${ext}`],
  };
};

const corpusRowsFromGenericText = ({ filePath, text, extractionMethod, warnings = [] }) => {
  const blocks = splitSampleBlocks(text);
  const termHint = extractTermHint(filePath);
  const sourceMeta = {
    path: path.resolve(filePath),
    extension: path.extname(filePath).toLowerCase(),
    sourceType: 'generic-text',
    extractionMethod,
    contextOnly: blocks.length === 0,
    warnings: [...warnings],
    extractedComments: blocks.length,
  };

  return {
    corpusRows: blocks.map((block, index) => ({
      id: `src-${index + 1}`,
      source_file: path.resolve(filePath),
      source_type: 'generic-prose',
      sheet_name: null,
      grade: null,
      subject: null,
      learner_name: `Generic Sample ${index + 1}`,
      class_name: null,
      term_hint: termHint,
      comment_text: block,
      generalized_text: block.toLowerCase(),
      source_weight: 1,
      voice_eligible: true,
      extraction_method: extractionMethod,
    })),
    sourceMeta,
  };
};

const extractSourceArtifacts = async (filePath, tools) => {
  const resolvedPath = path.resolve(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      corpusRows: [],
      sourceMeta: {
        path: resolvedPath,
        extension: ext,
        sourceType: 'unsupported',
        extractionMethod: 'unsupported',
        contextOnly: true,
        warnings: [`Unsupported file type: ${ext || '(none)'}`],
      },
      referenceInput: null,
    };
  }

  if (ext === '.json') {
    const referenceInput = await extractJsonReference(resolvedPath);
    return {
      corpusRows: [],
      sourceMeta: {
        path: resolvedPath,
        extension: ext,
        sourceType: 'json-reference',
        extractionMethod: 'json-reference-read',
        contextOnly: true,
        warnings: [],
      },
      referenceInput,
    };
  }

  if (ext === '.pdf') {
    const direct = extractPdfText(resolvedPath, tools);
    let text = direct.text;
    let extractionMethod = direct.method || 'pdf-unreadable';
    const allWarnings = [...direct.warnings];
    if (!text) {
      const ocr = await extractPdfTextWithOcr(resolvedPath, tools);
      text = ocr.text;
      extractionMethod = ocr.method || extractionMethod;
      allWarnings.push(...ocr.warnings);
    }
    const parsed = extractPdfComments({ filePath: resolvedPath, text, extractionMethod, warnings: allWarnings });
    return {
      corpusRows: parsed.corpusRows,
      sourceMeta: parsed.sourceMeta,
      referenceInput: null,
    };
  }

  if (ext === '.xls' || ext === '.xlsx') {
    const extracted = await extractWorkbookWithExcelCom(resolvedPath, tools);
    const parsed = extractWorkbookComments({
      filePath: resolvedPath,
      workbook: extracted.workbook,
      extractionMethod: extracted.workbook ? 'excel-com-readonly' : 'excel-com-unreadable',
    });
    parsed.sourceMeta.warnings.push(...extracted.warnings);
    return {
      corpusRows: parsed.corpusRows,
      sourceMeta: parsed.sourceMeta,
      referenceInput: null,
    };
  }

  const generic = await extractGenericTextSource(resolvedPath, tools);
  const parsed = corpusRowsFromGenericText({
    filePath: resolvedPath,
    text: generic.text,
    extractionMethod: generic.method || 'generic-unreadable',
    warnings: generic.warnings,
  });
  return {
    corpusRows: parsed.corpusRows,
    sourceMeta: parsed.sourceMeta,
    referenceInput: null,
  };
};

const wordTokens = (text) => String(text || '').toLowerCase().match(/[a-z0-9%][a-z0-9%'-]*/g) || [];

const phraseTokens = (text) =>
  wordTokens(text).filter((token) => token !== '<learner>' && token.length > 1);

const buildJaccardSimilarity = (aTokens, bTokens) => {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const annotateDeduplication = (rows) => {
  const annotated = rows.map((row, index) => ({
    ...row,
    id: `corpus-${index + 1}`,
    dedupe: {
      canonicalId: null,
      status: 'unique',
      similarity: 1,
    },
  }));

  for (let i = 0; i < annotated.length; i += 1) {
    if (annotated[i].dedupe.status !== 'unique') continue;
    const canonicalTokens = phraseTokens(annotated[i].generalized_text);
    annotated[i].dedupe.canonicalId = annotated[i].id;

    for (let j = i + 1; j < annotated.length; j += 1) {
      const similarity = buildJaccardSimilarity(canonicalTokens, phraseTokens(annotated[j].generalized_text));
      if (similarity >= EXACT_DUPLICATE_SIMILARITY) {
        annotated[j].dedupe = {
          canonicalId: annotated[i].id,
          status: 'exact-duplicate',
          similarity,
        };
      } else if (similarity >= NEAR_DUPLICATE_SIMILARITY && annotated[j].dedupe.status === 'unique') {
        annotated[j].dedupe = {
          canonicalId: annotated[i].id,
          status: 'near-duplicate',
          similarity,
        };
      }
    }
  }

  return annotated;
};

const categorizeSentence = (sentence, isLastSentence) => {
  const lower = sentence.toLowerCase();
  if (isLastSentence && /well done|thank you|all the best|good luck|see you next year|look forward|excited|very proud|uitmuntende prestasie/.test(lower)) {
    return 'closer';
  }
  if (/must|needs to|urge|recommend|continue|seek extra|should|work on|warned|start attending|persist/.test(lower)) {
    return 'directive';
  }
  if (/although|however|unfortunately|sadly|but|struggle|careless|anxiety|attention|motivation|distract|below-par|underachiev|potential/.test(lower)) {
    return 'concern';
  }
  if (/proud|pleased|excellent|outstanding|dominant|gifted|consistent|solid|diligent|confident|mature|blossom|improv|successful/.test(lower)) {
    return 'praise';
  }
  return 'evidence';
};

const segmentComment = (comment) => {
  const sentences = sentenceSplit(comment.comment_text);
  const segments = {
    opener: sentences[0] || '',
    praise_evidence: [],
    concern: [],
    directive: [],
    closer: '',
  };

  sentences.forEach((sentence, index) => {
    if (index === 0) return;
    const category = categorizeSentence(sentence, index === sentences.length - 1);
    if (category === 'closer') {
      segments.closer = sentence;
      return;
    }
    if (category === 'directive') {
      segments.directive.push(sentence);
      return;
    }
    if (category === 'concern') {
      segments.concern.push(sentence);
      return;
    }
    segments.praise_evidence.push(sentence);
  });

  if (!segments.closer && sentences.length > 1) {
    const last = sentences[sentences.length - 1];
    if (last !== segments.opener) {
      segments.closer = last;
      const removeFrom = ['praise_evidence', 'concern', 'directive'];
      removeFrom.forEach((key) => {
        const index = segments[key].lastIndexOf(last);
        if (index >= 0) segments[key].splice(index, 1);
      });
    }
  }

  return segments;
};

const countRegexMatches = (text, patterns) =>
  patterns.reduce((total, pattern) => total + ((String(text || '').match(pattern) || []).length), 0);

const collectFrequentNgrams = (texts, { minWords = 2, maxWords = 5, minCount = 2 } = {}) => {
  const counts = new Map();

  texts.forEach((text) => {
    const tokens = phraseTokens(text);
    const local = new Set();
    for (let size = minWords; size <= maxWords; size += 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const ngram = tokens.slice(index, index + size).join(' ');
        if (!ngram || local.has(ngram)) continue;
        if (ngram.split(' ').every((token) => STOPWORDS.has(token))) continue;
        local.add(ngram);
      }
    }
    for (const ngram of local) {
      counts.set(ngram, (counts.get(ngram) || 0) + 1);
    }
  });

  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => (b.count - a.count) || (b.phrase.split(' ').length - a.phrase.split(' ').length) || a.phrase.localeCompare(b.phrase));
};

const topPhrasesByKeywords = (phrases, keywords, limit = 12) =>
  phrases
    .filter((entry) => keywords.some((keyword) => entry.phrase.includes(keyword)))
    .slice(0, limit);

const collectPatternCounts = (comments) => PATTERN_FAMILIES.map((family) => {
  const matches = comments
    .filter((comment) => family.tests.some((pattern) => pattern.test(comment.generalized_text)))
    .map((comment) => ({
      corpusId: comment.id,
      learner: comment.learner_name,
      excerpt: comment.comment_text.slice(0, 180),
    }));

  family.tests.forEach((pattern) => { pattern.lastIndex = 0; });

  return {
    id: family.id,
    label: family.label,
    count: matches.length,
    examples: matches.slice(0, 5),
  };
});

const collectAddressTerms = (texts) => {
  const joined = texts.join('\n');
  const counts = new Map();
  ADDRESS_PATTERNS.forEach((pattern) => {
    const matches = joined.match(pattern) || [];
    matches.forEach((match) => counts.set(match.toLowerCase(), (counts.get(match.toLowerCase()) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));
};

const collectTransitionTerms = (texts) => {
  const joined = texts.join('\n');
  const counts = new Map();
  TRANSITION_PATTERNS.forEach((pattern) => {
    const matches = joined.match(pattern) || [];
    matches.forEach((match) => counts.set(match.toLowerCase(), (counts.get(match.toLowerCase()) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));
};

const collectRecurringOpeners = (comments) => {
  const openers = comments.map((comment) => segmentComment(comment).opener.toLowerCase());
  return collectFrequentNgrams(openers, { minWords: 2, maxWords: 6, minCount: 2 }).slice(0, 12);
};

const collectRecurringClosers = (comments) => {
  const closers = comments
    .map((comment) => segmentComment(comment).closer.toLowerCase())
    .filter(Boolean);
  return collectFrequentNgrams(closers, { minWords: 2, maxWords: 6, minCount: 2 }).slice(0, 12);
};

const collectVocabularyBank = (comments) => {
  const frequencies = new Map();
  comments.forEach((comment) => {
    const tokens = wordTokens(comment.generalized_text);
    const seen = new Set();
    tokens.forEach((token) => {
      if (STOPWORDS.has(token) || token.length < 4 || seen.has(token)) return;
      seen.add(token);
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });
  });

  return [...frequencies.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, 40)
    .map(([word]) => word);
};

const collectReferenceContamination = (referenceInputs, canonicalComments) => {
  const realText = canonicalComments.map((item) => item.generalized_text.toLowerCase()).join('\n');
  const refTerms = new Set();

  referenceInputs.forEach((ref) => {
    ref.vocabulary.forEach((item) => refTerms.add(String(item).toLowerCase()));
    String(ref.rawSamples || '')
      .toLowerCase()
      .split(/[^a-z0-9%'-]+/)
      .filter((token) => token.length >= 4)
      .forEach((token) => refTerms.add(token));
  });

  return [...refTerms]
    .filter((term) => CONTAMINATION_TERMS.some((seed) => term.includes(seed)))
    .filter((term) => !realText.includes(term))
    .slice(0, 20);
};

const buildSuspectOutliers = (comments) =>
  comments
    .filter((comment) => countRegexMatches(comment.comment_text, CLOSER_PATTERNS) === 0 && sentenceCount(comment.comment_text) <= 2)
    .slice(0, 10)
    .map((comment) => ({
      corpusId: comment.id,
      learner: comment.learner_name,
      note: 'Shorter than the dominant corpus shape and lacks a strong closing signature.',
      excerpt: comment.comment_text.slice(0, 180),
    }));

const buildGradeBandNotes = (comments) => {
  const groups = new Map();
  comments.forEach((comment) => {
    const key = comment.grade || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(comment);
  });

  return [...groups.entries()].map(([grade, items]) => ({
    grade,
    commentCount: items.length,
    notes: [
      `Average sentence count: ${Math.round((items.reduce((sum, item) => sum + sentenceCount(item.comment_text), 0) / items.length) * 10) / 10}`,
      countRegexMatches(items.map((item) => item.comment_text).join('\n'), [/\bnext year\b/gi]) > 0
        ? 'Future-oriented progression language appears frequently.'
        : 'Future-oriented progression language is less frequent in this band.',
    ],
  }));
};

const buildToneDescriptor = (comments, groupedPhrases) => {
  const joined = comments.map((item) => item.comment_text).join('\n');
  const descriptors = [];

  if (countRegexMatches(joined, [/\bproud\b/gi, /\bpleased\b/gi, /\bexcited\b/gi, /\bwell done\b/gi]) >= 8) {
    descriptors.push('highly encouraging');
  }
  if (countRegexMatches(joined, [/\bpotential\b/gi, /\bcapable\b/gi, /\bchallenge\b/gi, /\bnext year\b/gi]) >= 6) {
    descriptors.push('aspirational');
  }
  if (countRegexMatches(joined, [/\bmust\b/gi, /\bneeds? to\b/gi, /\burg(?:e|ed)\b/gi, /\bwarn(?:ed|ing)\b/gi]) >= 6) {
    descriptors.push('direct about effort and habits');
  }
  if (groupedPhrases.address_terms.length > 0) {
    descriptors.push('personal');
  }
  if (countRegexMatches(joined, [/\bmaturity\b/gi, /\battitude\b/gi, /\bwork ethic\b/gi, /\bsupport\b/gi]) >= 6) {
    descriptors.push('observant');
  }
  if (countRegexMatches(joined, [/\bnext year\b/gi, /\bgrade [567]\b/gi, /\bjourney\b/gi]) >= 6) {
    descriptors.push('future-oriented');
  }

  return descriptors.join(', ') || 'encouraging, observant, future-oriented';
};

const buildStructureDescriptor = (comments) => {
  const avgSentences = Math.round((comments.reduce((sum, item) => sum + sentenceCount(item.comment_text), 0) / comments.length) * 10) / 10;
  return `Usually ${avgSentences} sentences in one paragraph; opens with an overall performance or growth judgment; often includes evidence about attitude, maturity, effort, or aggregate movement; frequently adds a concrete improvement target or study habit; usually closes with encouragement, gratitude, or a next-year transition.`;
};

const buildFormattingDescriptor = (comments) => {
  const joined = comments.map((item) => item.comment_text).join('\n');
  const notes = [];
  notes.push('Uses South African/British English spelling and classroom phrasing.');
  if (/%/.test(joined)) {
    notes.push('Comfortably references percentages, average bands, and stretch targets when motivating learners.');
  }
  if ((joined.match(/!/g) || []).length >= 10) {
    notes.push('Uses exclamation marks for emphasis and praise more than the lightweight persona builder assumes.');
  }
  if (/young man|young lady|jong dame/i.test(joined)) {
    notes.push('Frequently uses direct address terms such as "young man", "young lady", or Afrikaans praise closers.');
  }
  if (/B\.?\s*JOSEPH\s*-/i.test(joined)) {
    notes.push('Source files often prefix comments with "B. JOSEPH -", but the writing voice itself is paragraph-first and teacher-personal.');
  }
  return notes.join(' ');
};

const truncateRawSamples = (comments) => {
  const selected = [];
  let currentLength = 0;

  for (const comment of comments) {
    const next = comment.comment_text.trim();
    const nextLength = currentLength + next.length + 2;
    if (nextLength > MAX_RAW_SAMPLES_CHARS) break;
    selected.push(next);
    currentLength = nextLength;
  }

  return selected.join('\n\n');
};

const buildPhraseBank = (canonicalComments, referenceInputs) => {
  const generalizedTexts = canonicalComments.map((comment) => comment.generalized_text.toLowerCase());
  const frequentPhrases = collectFrequentNgrams(generalizedTexts, { minWords: 2, maxWords: 5, minCount: 2 });
  const openings = collectRecurringOpeners(canonicalComments);
  const closings = collectRecurringClosers(canonicalComments);
  const groupedPhrases = {
    praise_language: topPhrasesByKeywords(frequentPhrases, PRAISE_KEYWORDS),
    corrective_language: topPhrasesByKeywords(frequentPhrases, CORRECTIVE_KEYWORDS),
    aspirational_language: topPhrasesByKeywords(frequentPhrases, ASPIRATIONAL_KEYWORDS),
    study_habit_language: topPhrasesByKeywords(frequentPhrases, STUDY_HABIT_KEYWORDS),
    motivational_closers: closings,
    address_terms: collectAddressTerms(generalizedTexts),
    transition_forms: collectTransitionTerms(generalizedTexts),
    recurring_openings: openings,
  };

  return {
    generatedAt: new Date().toISOString(),
    groupedPhrases,
    signatureSayings: frequentPhrases.slice(0, 25),
    contaminationBlockers: collectReferenceContamination(referenceInputs, canonicalComments),
  };
};

const buildComprehensiveAnalysis = ({ teacherName, profileSlug, sourceFiles, referenceInputs, corpusRows, tools }) => {
  const annotatedCorpus = annotateDeduplication(corpusRows);
  const canonicalComments = annotatedCorpus.filter((row) => row.dedupe.status === 'unique');
  const phraseBank = buildPhraseBank(canonicalComments, referenceInputs);
  const patternFamilies = collectPatternCounts(canonicalComments);
  const groupedPhrases = phraseBank.groupedPhrases;
  const guardrails = [
    'Treat real prose from comment-bearing spreadsheets and PDFs as the source of truth.',
    'Do not import tone, sayings, or subject habits from generic persona JSONs unless corroborated by the real corpus.',
    'Preserve B. Joseph\'s willingness to mention percentage targets and next-year goals where supported by evidence.',
    'Retain direct address terms and future-oriented motivation, but do not fabricate support/homework narratives not evidenced in the source corpus.',
  ];

  const antiPatterns = [
    'Do not import isiXhosa-specific or feminine-teacher phrasing unless it is directly evidenced in B. Joseph source comments.',
    'Do not flatten the voice into generic warm-teacher prose that removes stretch targets, discipline, or growth-challenge framing.',
    'Do not erase references to study skills, extra Afrikaans, aggregate movement, or next-year progression; these are part of the authentic voice.',
  ];

  const contaminationBlockers = phraseBank.contaminationBlockers;
  if (contaminationBlockers.length > 0) {
    antiPatterns.push(`Block uncorroborated reference-only terms: ${contaminationBlockers.join(', ')}`);
  }

  const minimalProfile = {
    tone: buildToneDescriptor(canonicalComments, groupedPhrases),
    vocabulary: collectVocabularyBank(canonicalComments),
    structure: buildStructureDescriptor(canonicalComments),
    formatting: buildFormattingDescriptor(canonicalComments),
    isReady: false,
    reviewStatus: 'pending-human-review',
    rawSamples: truncateRawSamples(canonicalComments),
  };

  const exclamationCount = canonicalComments.reduce((sum, row) => sum + ((row.comment_text.match(/!/g) || []).length), 0);
  const percentMentionCount = canonicalComments.reduce((sum, row) => sum + (((row.comment_text.match(/%/g) || []).length > 0) ? 1 : 0), 0);

  return {
    minimalProfile,
    comprehensive: {
      teacherName,
      profileSlug,
      createdAt: new Date().toISOString(),
      mode: 'deep-profile-ingest',
      reviewStatus: 'pending-human-review',
      tools,
      sourceSummary: {
        inputFileCount: sourceFiles.length,
        realCommentSourceCount: sourceFiles.filter((item) => !item.contextOnly && item.sourceType !== 'json-reference').length,
        referenceInputCount: referenceInputs.length,
        voiceEligibleCommentCount: corpusRows.length,
        canonicalCommentCount: canonicalComments.length,
        exactDuplicateCount: annotatedCorpus.filter((row) => row.dedupe.status === 'exact-duplicate').length,
        nearDuplicateCount: annotatedCorpus.filter((row) => row.dedupe.status === 'near-duplicate').length,
      },
      sourceFiles,
      referenceInputs: referenceInputs.map((item) => ({
        path: item.path,
        vocabularyCount: item.vocabulary.length,
        rawSamplesLength: item.rawSamples.length,
        notes: item.notes,
      })),
      corpusStats: {
        averageSentenceCount: Math.round((canonicalComments.reduce((sum, row) => sum + sentenceCount(row.comment_text), 0) / canonicalComments.length) * 10) / 10,
        averageWordCount: Math.round((canonicalComments.reduce((sum, row) => sum + wordTokens(row.comment_text).length, 0) / canonicalComments.length) * 10) / 10,
        exclamationCount,
        commentsMentioningPercentages: percentMentionCount,
      },
      rhetoricalPatternInventory: {
        recurringOpenings: groupedPhrases.recurring_openings,
        recurringClosings: groupedPhrases.motivational_closers,
        segmentedExamples: canonicalComments.slice(0, 8).map((comment) => ({
          corpusId: comment.id,
          learner: comment.learner_name,
          segments: segmentComment(comment),
        })),
      },
      groupedVocabularyBanks: groupedPhrases,
      patternFamilies,
      signatureSayings: phraseBank.signatureSayings,
      gradeBandNotes: buildGradeBandNotes(canonicalComments),
      suspectOutliers: buildSuspectOutliers(canonicalComments),
      guardrails,
      antiPatterns,
      contaminationWarnings: contaminationBlockers,
      evidenceExamples: canonicalComments.slice(0, 12).map((comment) => ({
        corpusId: comment.id,
        learner: comment.learner_name,
        excerpt: comment.comment_text.slice(0, 220),
      })),
      draftProfile: minimalProfile,
      warnings: sourceFiles.flatMap((item) => item.warnings.map((warning) => `${path.basename(item.path)}: ${warning}`)),
    },
    annotatedCorpus,
    phraseBank,
  };
};

const renderReviewMarkdown = ({ teacherName, comprehensive, phraseBank }) => {
  const strongestPhrases = phraseBank.signatureSayings.slice(0, 12)
    .map((entry) => `- \`${entry.phrase}\` (${entry.count})`)
    .join('\n');

  const openings = comprehensive.rhetoricalPatternInventory.recurringOpenings.slice(0, 8)
    .map((entry) => `- \`${entry.phrase}\` (${entry.count})`)
    .join('\n');

  const closings = comprehensive.rhetoricalPatternInventory.recurringClosings.slice(0, 8)
    .map((entry) => `- \`${entry.phrase}\` (${entry.count})`)
    .join('\n');

  const praise = comprehensive.groupedVocabularyBanks.praise_language.slice(0, 10)
    .map((entry) => `- \`${entry.phrase}\` (${entry.count})`)
    .join('\n');

  const corrective = comprehensive.groupedVocabularyBanks.corrective_language.slice(0, 10)
    .map((entry) => `- \`${entry.phrase}\` (${entry.count})`)
    .join('\n');

  const stretch = comprehensive.groupedVocabularyBanks.aspirational_language.slice(0, 10)
    .map((entry) => `- \`${entry.phrase}\` (${entry.count})`)
    .join('\n');

  const patternFamilies = comprehensive.patternFamilies
    .map((family) => `- ${family.label}: ${family.count}`)
    .join('\n');

  const outliers = comprehensive.suspectOutliers.length === 0
    ? '- None flagged.'
    : comprehensive.suspectOutliers
      .map((entry) => `- ${entry.learner}: ${entry.note}`)
      .join('\n');

  const contaminationWarnings = comprehensive.contaminationWarnings.length === 0
    ? '- No uncorroborated contamination blockers surfaced from the low-weight JSON references.'
    : comprehensive.contaminationWarnings.map((entry) => `- Block unless corroborated by real corpus: \`${entry}\``).join('\n');

  return `# ${teacherName} Deep Persona Review

## Summary

- Review status: ${comprehensive.reviewStatus}
- Voice-eligible comments extracted: ${comprehensive.sourceSummary.voiceEligibleCommentCount}
- Canonical comments after dedupe: ${comprehensive.sourceSummary.canonicalCommentCount}
- Exact duplicates: ${comprehensive.sourceSummary.exactDuplicateCount}
- Near-duplicates: ${comprehensive.sourceSummary.nearDuplicateCount}

## Strongest Recurring Phrases

${strongestPhrases || '- None detected.'}

## Recurring Openings

${openings || '- None detected.'}

## Recurring Closings

${closings || '- None detected.'}

## Praise Language

${praise || '- None detected.'}

## Corrective / Directional Language

${corrective || '- None detected.'}

## Aspirational / Stretch Language

${stretch || '- None detected.'}

## Pattern Families

${patternFamilies || '- None detected.'}

## Suspect / Outlier Phrases

${outliers}

## Contamination Warnings

${contaminationWarnings}

## Final Approval Checklist

- The tone reads recognizably like B. Joseph rather than a generic teacher voice.
- The profile preserves stretch targets, study-habit advice, and next-year progression language.
- Address terms and closings feel authentic and not overused.
- No isiXhosa/feminine-persona or unrelated subject bleed remains unless directly evidenced.
- The minimal persona can remain \`isReady: false\` until this review is accepted.
`;
};

const main = async () => {
  const { options, files } = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage);
    process.exit(0);
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
    powershell: await resolveTool('powershell', toolLocations),
  };

  if (checkToolsOnly) {
    console.log('Tool Resolution');
    console.log(`pdftotext: ${tools.pdftotext || 'NOT FOUND'}`);
    console.log(`pdftoppm: ${tools.pdftoppm || 'NOT FOUND'}`);
    console.log(`tesseract: ${tools.tesseract || 'NOT FOUND'}`);
    console.log(`antiword: ${tools.antiword || 'NOT FOUND'}`);
    console.log(`catdoc: ${tools.catdoc || 'NOT FOUND'}`);
    console.log(`tar: ${tools.tar || 'NOT FOUND'}`);
    console.log(`powershell: ${tools.powershell || 'NOT FOUND'}`);
    if (!teacherName && !sourceDir && files.length === 0) return;
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

  const sourceMetas = [];
  const referenceInputs = [];
  const corpusRows = [];

  for (const filePath of sourceFiles) {
    const extracted = await extractSourceArtifacts(filePath, tools);
    sourceMetas.push(extracted.sourceMeta);
    if (extracted.referenceInput) referenceInputs.push(extracted.referenceInput);
    if (extracted.corpusRows.length > 0) {
      extracted.corpusRows.forEach((row) => {
        corpusRows.push({ ...row, id: `row-${corpusRows.length + 1}` });
      });
    }
  }

  if (corpusRows.length === 0) {
    console.error('No real prose comments were extracted from the provided source files.');
    process.exit(1);
  }

  const analysis = buildComprehensiveAnalysis({
    teacherName,
    profileSlug,
    sourceFiles: sourceMetas,
    referenceInputs,
    corpusRows,
    tools,
  });

  await fs.mkdir(outdir, { recursive: true });

  const minimalProfilePath = path.join(outdir, `${profileSlug}.json`);
  const comprehensiveProfilePath = path.join(outdir, `${profileSlug}_comprehensive.json`);
  const phraseBankPath = path.join(outdir, `${profileSlug}_phrase_bank.json`);
  const corpusPath = path.join(outdir, `${profileSlug}_corpus.json`);
  const reviewPath = path.join(outdir, `${profileSlug}_review.md`);

  await fs.writeFile(minimalProfilePath, `${JSON.stringify(analysis.minimalProfile, null, 2)}\n`, 'utf8');
  await fs.writeFile(comprehensiveProfilePath, `${JSON.stringify(analysis.comprehensive, null, 2)}\n`, 'utf8');
  await fs.writeFile(phraseBankPath, `${JSON.stringify(analysis.phraseBank, null, 2)}\n`, 'utf8');
  await fs.writeFile(corpusPath, `${JSON.stringify(analysis.annotatedCorpus, null, 2)}\n`, 'utf8');
  await fs.writeFile(reviewPath, `${renderReviewMarkdown({
    teacherName,
    comprehensive: analysis.comprehensive,
    phraseBank: analysis.phraseBank,
  })}\n`, 'utf8');

  console.log(`Created deep teacher profile for ${teacherName}.`);
  console.log(`Profile JSON: ${minimalProfilePath}`);
  console.log(`Comprehensive JSON: ${comprehensiveProfilePath}`);
  console.log(`Phrase Bank JSON: ${phraseBankPath}`);
  console.log(`Corpus JSON: ${corpusPath}`);
  console.log(`Review Markdown: ${reviewPath}`);

  if (analysis.comprehensive.warnings.length > 0) {
    console.log(`Warnings: ${analysis.comprehensive.warnings.length}`);
    analysis.comprehensive.warnings.forEach((warning) => console.log(`- ${warning}`));
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
