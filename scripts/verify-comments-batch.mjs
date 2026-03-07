import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const FAILING_THRESHOLD = 50;
const BORDERLINE_THRESHOLD = 55;

const usage = `
Usage:
  npm run verify:comments -- --comments-json "<path-to-comments.json>" [--marks-json "<path-to-marks.json>"] [--report-json "<path-to-report.json>"]

What it checks:
  - comment batch shape and required fields
  - duplicate learner names
  - parent alert consistency with risk areas
  - optional cross-check against marks JSON for risk veracity

Marks JSON format (array):
[
  {
    "name": "Learner Name",
    "marks": { "Paper 1": "62", "Paper 2": "49" }
  }
]
`;

const parseArgs = (argv) => {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).trim();
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
};

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseNumericMark = (value) => {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const detectRiskAreasFromMarks = (marks) => {
  const riskAreas = [];
  Object.entries(marks || {}).forEach(([label, raw]) => {
    const numeric = parseNumericMark(raw);
    if (numeric === null) return;
    if (numeric < FAILING_THRESHOLD) {
      riskAreas.push(`${label} (${numeric}%) - below pass mark`);
      return;
    }
    if (numeric <= BORDERLINE_THRESHOLD) {
      riskAreas.push(`${label} (${numeric}%) - close to pass threshold`);
    }
  });
  return riskAreas;
};

const hasAlertLanguage = (text) =>
  /parent alert|immediate support|priority|urgent|risk area|below pass|at risk|support required|discussed at home/i.test(String(text || ''));

const collectComment = (row) =>
  String(row?.generatedComment || row?.comment || '')
    .replace(/\s+/g, ' ')
    .trim();

const loadJson = async (filePath) => {
  const raw = await fs.readFile(path.resolve(filePath), 'utf8');
  return JSON.parse(raw);
};

const validateBatchShape = (rows) => {
  const errors = [];
  if (!Array.isArray(rows)) {
    errors.push('Comments JSON must be an array.');
    return errors;
  }

  rows.forEach((row, index) => {
    const name = String(row?.name || '').trim();
    const comment = collectComment(row);
    if (!name) errors.push(`Row ${index + 1}: missing learner name.`);
    if (!comment) errors.push(`Row ${index + 1}: missing generated comment text.`);
  });
  return errors;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options['comments-json']) {
    console.log(usage);
    process.exit(options.help ? 0 : 1);
  }

  const commentsPath = path.resolve(options['comments-json']);
  const marksPath = options['marks-json'] ? path.resolve(options['marks-json']) : null;
  const reportPath = options['report-json'] ? path.resolve(options['report-json']) : null;

  const comments = await loadJson(commentsPath);
  const batchErrors = validateBatchShape(comments);

  const findings = {
    errors: [...batchErrors],
    warnings: [],
    checks: [],
    summary: {},
  };

  if (batchErrors.length > 0) {
    findings.summary = {
      status: 'failed',
      reason: 'invalid-comment-shape',
      errorCount: batchErrors.length,
    };

    if (reportPath) {
      await fs.writeFile(reportPath, `${JSON.stringify(findings, null, 2)}\n`, 'utf8');
    }
    console.error('Verification failed: invalid comments JSON shape.');
    batchErrors.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }

  const nameSet = new Set();
  comments.forEach((row, index) => {
    const normalized = normalizeName(row.name);
    if (nameSet.has(normalized)) {
      findings.warnings.push(`Duplicate learner name detected: "${row.name}" (row ${index + 1}).`);
    } else {
      nameSet.add(normalized);
    }
  });

  comments.forEach((row, index) => {
    const comment = collectComment(row);
    const riskAreas = Array.isArray(row?.riskAreas) ? row.riskAreas.filter((x) => typeof x === 'string' && x.trim()) : [];
    const parentAlertRequired = Boolean(row?.parentAlertRequired) || riskAreas.length > 0;
    const alertPresent = hasAlertLanguage(comment);

    if (parentAlertRequired && !alertPresent) {
      findings.warnings.push(`Row ${index + 1} (${row.name}): risk flag is true but parent-alert wording is weak/missing.`);
    }

    if (!parentAlertRequired && alertPresent) {
      findings.warnings.push(`Row ${index + 1} (${row.name}): alert wording present but risk flag is false.`);
    }

    if (comment.length < 120) {
      findings.warnings.push(`Row ${index + 1} (${row.name}): comment is very short (${comment.length} chars).`);
    }
  });

  if (marksPath) {
    const marksRowsRaw = await loadJson(marksPath);
    if (!Array.isArray(marksRowsRaw)) {
      findings.errors.push('Marks JSON must be an array.');
    } else {
      const marksByName = new Map();
      marksRowsRaw.forEach((row) => {
        const key = normalizeName(row?.name);
        if (!key) return;
        const marks = (row && typeof row === 'object' && row.marks && typeof row.marks === 'object') ? row.marks : {};
        marksByName.set(key, marks);
      });

      comments.forEach((row, index) => {
        const key = normalizeName(row.name);
        const marks = marksByName.get(key);
        if (!marks) {
          findings.warnings.push(`Row ${index + 1} (${row.name}): learner not found in marks JSON.`);
          return;
        }

        const computedRisks = detectRiskAreasFromMarks(marks);
        const hasRiskByMarks = computedRisks.length > 0;
        const comment = collectComment(row);
        const hasAlert = hasAlertLanguage(comment);

        if (hasRiskByMarks && !hasAlert) {
          findings.errors.push(`Row ${index + 1} (${row.name}): marks indicate risk but comment lacks explicit alert language.`);
        }

        if (!hasRiskByMarks && hasAlert) {
          findings.warnings.push(`Row ${index + 1} (${row.name}): alert language present but marks show no threshold risk.`);
        }
      });

      marksRowsRaw.forEach((row) => {
        const key = normalizeName(row?.name);
        if (!key) return;
        if (!nameSet.has(key)) {
          findings.warnings.push(`Marks row "${row.name}" has no matching generated comment.`);
        }
      });
    }
  }

  findings.summary = {
    status: findings.errors.length > 0 ? 'failed' : 'passed',
    commentCount: comments.length,
    errorCount: findings.errors.length,
    warningCount: findings.warnings.length,
    marksCrossCheckEnabled: Boolean(marksPath),
  };

  if (reportPath) {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, `${JSON.stringify(findings, null, 2)}\n`, 'utf8');
  }

  console.log(`Verification status: ${findings.summary.status.toUpperCase()}`);
  console.log(`Comments checked: ${findings.summary.commentCount}`);
  console.log(`Errors: ${findings.summary.errorCount}`);
  console.log(`Warnings: ${findings.summary.warningCount}`);
  console.log(`Marks cross-check: ${findings.summary.marksCrossCheckEnabled ? 'enabled' : 'disabled'}`);

  if (findings.errors.length > 0) {
    findings.errors.forEach((item) => console.log(`ERROR: ${item}`));
    process.exit(1);
  }

  if (findings.warnings.length > 0) {
    findings.warnings.forEach((item) => console.log(`WARN: ${item}`));
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
