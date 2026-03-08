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

const splitSentences = (text) =>
  String(text || '')
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((item) => item.trim())
    .filter(Boolean) || [];

const classifySentenceRole = (sentence, index) => {
  const value = String(sentence || '').trim().toLowerCase();
  if (!value) return 'other';
  if (/^i am (very )?(pleased|proud)/.test(value)) return 'reflection';
  if (/^(keep up|keep working|well done|continue to work|keep going)/.test(value)) return 'encouragement';
  if (
    /^(to improve|to improve further|to keep improving|to continue improving|to do even better|with more focus|his main next step|her main next step|their main next step|he would benefit|she would benefit|they would benefit|he needs|she needs|they need|he should|she should|they should)/.test(value)
  ) {
    return 'development';
  }
  if (
    /overall result|overall performance|results show|classwork results show|produced a .*overall|working from a very strong|across the assessments|across the different sections|classwork shows that|these strengths have helped|several of the term's concepts are secure/.test(value)
  ) {
    return 'consolidation';
  }
  return index === 0 ? 'opening' : 'support';
};

const detectStructureWarnings = (rows) => {
  if (!Array.isArray(rows) || rows.length < 4) return [];

  const warnings = [];
  const commentMeta = rows.map((row) => {
    const comment = collectComment(row);
    const sentences = splitSentences(comment);
    const roles = sentences.map((sentence, index) => classifySentenceRole(sentence, index));
    return { name: row?.name || '', sentences, roles };
  });

  const countMap = (items) => {
    const counts = new Map();
    items.forEach((item) => {
      if (item === null || item === undefined || item === '') return;
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    return counts;
  };

  const findDominant = (counts) => {
    let winner = null;
    counts.forEach((count, value) => {
      if (!winner || count > winner.count) {
        winner = { value, count };
      }
    });
    return winner;
  };

  const sentenceCounts = countMap(commentMeta.map((item) => item.sentences.length));
  const dominantSentenceCount = findDominant(sentenceCounts);
  if (dominantSentenceCount && dominantSentenceCount.count / commentMeta.length >= 0.7) {
    warnings.push(
      `${dominantSentenceCount.count}/${commentMeta.length} comments use ${dominantSentenceCount.value} sentences. Mix shorter and longer shapes across the batch.`,
    );
  }

  const developmentPositions = countMap(
    commentMeta
      .map((item) => {
        const index = item.roles.indexOf('development');
        return index >= 0 ? index + 1 : null;
      })
      .filter((value) => value !== null),
  );
  const dominantDevelopmentPosition = findDominant(developmentPositions);
  if (
    dominantDevelopmentPosition
    && dominantDevelopmentPosition.count / commentMeta.length >= 0.65
  ) {
    warnings.push(
      `${dominantDevelopmentPosition.count}/${commentMeta.length} comments place the development point in sentence ${dominantDevelopmentPosition.value}. Move the next-step sentence earlier or later in part of the batch.`,
    );
  }

  const closingPatterns = countMap(
    commentMeta.map((item) => {
      const last = item.roles.at(-1) || 'none';
      const penultimate = item.roles.at(-2) || 'none';
      return `${penultimate} > ${last}`;
    }),
  );
  const dominantClosingPattern = findDominant(closingPatterns);
  if (dominantClosingPattern && dominantClosingPattern.count / commentMeta.length >= 0.7) {
    warnings.push(
      `${dominantClosingPattern.count}/${commentMeta.length} comments end with the same closing pattern (${dominantClosingPattern.value}). Vary encouragement-only, reflection-only, and combined closes.`,
    );
  }

  const reflectionCount = commentMeta.filter((item) => item.roles.includes('reflection')).length;
  if (reflectionCount / commentMeta.length >= 0.8) {
    warnings.push(
      `${reflectionCount}/${commentMeta.length} comments include a teacher-reflection sentence. Drop or vary that final reflection more often.`,
    );
  }

  return warnings;
};

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

  detectStructureWarnings(comments).forEach((warning) => {
    findings.warnings.push(`Style diversity: ${warning}`);
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
