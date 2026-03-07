import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const FAILING_THRESHOLD = 50;
const BORDERLINE_THRESHOLD = 55;

const usage = `
Usage:
  npm run codex:prepare -- --teacher "Teacher Name" --subject "Subject" --persona "<path-to-profile.json>" --marks-json "<path-to-marks.json>" [--batch-label "<label>"] [--outdir "<output-folder>"]

What it does:
  - packages a teacher persona plus structured marks into a Codex-chat-ready batch
  - writes a prompt markdown file for pasting into VS Code chat
  - writes a packet JSON snapshot for later review/audit
  - writes a comments template JSON matching the local verify/export workflow

Expected marks JSON format:
[
  {
    "name": "Learner Name",
    "class": "5A",
    "marks": {
      "Overall": "62%",
      "Spelling": "58%",
      "Writing": "49%"
    }
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

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'batch';

const resolveManagedDir = ({ explicitDir, env, specificKey, fallbackSubdir, legacyDefault }) => {
  if (explicitDir) return path.resolve(explicitDir);
  if (env[specificKey]) return path.resolve(env[specificKey]);
  if (env.TEACHERTWIN_LOCAL_ROOT) return path.resolve(env.TEACHERTWIN_LOCAL_ROOT, fallbackSubdir);
  return path.resolve(legacyDefault);
};

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

const formatMarksSummary = (marks) =>
  Object.entries(marks || {})
    .map(([label, value]) => `${label}: ${value}`)
    .join(' | ');

const buildCommentTemplate = (marksRows) =>
  marksRows.map((row) => {
    const inferredRiskAreas = detectRiskAreasFromMarks(row.marks);
    return {
      name: String(row.name || '').trim(),
      class: String(row.class || '').trim(),
      generatedComment: '',
      riskAreas: inferredRiskAreas,
      parentAlertRequired: inferredRiskAreas.length > 0,
    };
  });

const buildPromptMarkdown = ({ teacherName, subjectName, batchLabel, persona, marksRows }) => {
  const learnerLines = marksRows.map((row, index) => {
    const riskAreas = detectRiskAreasFromMarks(row.marks);
    const riskText = riskAreas.length > 0 ? ` | riskHints: ${riskAreas.join('; ')}` : '';
    const classText = row.class ? ` | class: ${row.class}` : '';
    return `${index + 1}. ${row.name}${classText} | ${formatMarksSummary(row.marks)}${riskText}`;
  });

  return `# Codex Batch Prompt

Use this batch to generate ${subjectName} report comments in the teacher voice below.

## Objective

Write one polished report comment per learner for ${teacherName}.

## Constraints

1. Use only the evidence present in the persona and the marks provided below.
2. Do not invent achievements, concerns, or behavioural claims that are not supported by the marks/persona.
3. Keep each comment to one paragraph.
4. Keep teacher voice consistent across the batch.
5. If a learner has any risk area below 50% or between 50% and 55% inclusive, include explicit parent-facing support language.
6. Return valid JSON only in this structure:

\`\`\`json
[
  {
    "name": "Learner Name",
    "class": "5A",
    "generatedComment": "Single polished paragraph",
    "riskAreas": ["Overall (49%) - below pass mark"],
    "parentAlertRequired": true
  }
]
\`\`\`

## Teacher Persona

- Teacher: ${teacherName}
- Subject: ${subjectName}
- Batch: ${batchLabel}
- Tone: ${persona.tone || ''}
- Vocabulary: ${Array.isArray(persona.vocabulary) ? persona.vocabulary.join(', ') : ''}
- Structure: ${persona.structure || ''}
- Formatting: ${persona.formatting || ''}

## Learner Marks

${learnerLines.join('\n')}
`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    process.exit(0);
  }

  const teacherName = String(options.teacher || '').trim();
  const subjectName = String(options.subject || '').trim();
  const personaPath = String(options.persona || '').trim();
  const marksJsonPath = String(options['marks-json'] || '').trim();

  if (!teacherName || !subjectName || !personaPath || !marksJsonPath) {
    console.error('Missing required arguments.');
    console.error(usage);
    process.exit(1);
  }

  const envFile = await loadEnvFile();
  const env = { ...envFile, ...process.env };
  const outdir = resolveManagedDir({
    explicitDir: options.outdir,
    env,
    specificKey: 'TEACHERTWIN_EXPORT_DIR',
    fallbackSubdir: 'exports',
    legacyDefault: 'exports',
  });

  const persona = JSON.parse(await fs.readFile(path.resolve(personaPath), 'utf8'));
  const marksRows = JSON.parse(await fs.readFile(path.resolve(marksJsonPath), 'utf8'));

  if (!Array.isArray(marksRows) || marksRows.length === 0) {
    console.error('Marks JSON must be a non-empty array.');
    process.exit(1);
  }

  const batchLabel = sanitizeFilenamePart(
    options['batch-label']
      || path.basename(marksJsonPath, path.extname(marksJsonPath))
      || `${subjectName}_${teacherName}`,
  );
  const batchSlug = slugify(batchLabel);
  const commentsTemplate = buildCommentTemplate(marksRows);
  const packet = {
    createdAt: new Date().toISOString(),
    mode: 'codex-operator-batch',
    teacherName,
    subjectName,
    batchLabel,
    personaPath: path.resolve(personaPath),
    marksJsonPath: path.resolve(marksJsonPath),
    persona: {
      tone: persona.tone || '',
      vocabulary: Array.isArray(persona.vocabulary) ? persona.vocabulary : [],
      structure: persona.structure || '',
      formatting: persona.formatting || '',
    },
    learners: marksRows.map((row) => ({
      name: String(row.name || '').trim(),
      class: String(row.class || '').trim(),
      marks: row.marks && typeof row.marks === 'object' ? row.marks : {},
      inferredRiskAreas: detectRiskAreasFromMarks(row.marks),
    })),
  };
  const promptMarkdown = buildPromptMarkdown({
    teacherName,
    subjectName,
    batchLabel,
    persona,
    marksRows,
  });

  await fs.mkdir(outdir, { recursive: true });

  const packetPath = path.join(outdir, `${batchSlug}_codex_packet.json`);
  const promptPath = path.join(outdir, `${batchSlug}_codex_prompt.md`);
  const templatePath = path.join(outdir, `${batchSlug}_comments_template.json`);

  await fs.writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  await fs.writeFile(promptPath, `${promptMarkdown}\n`, 'utf8');
  await fs.writeFile(templatePath, `${JSON.stringify(commentsTemplate, null, 2)}\n`, 'utf8');

  console.log(`Prepared Codex operator batch for ${teacherName}.`);
  console.log(`Packet JSON: ${packetPath}`);
  console.log(`Prompt Markdown: ${promptPath}`);
  console.log(`Comments Template: ${templatePath}`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
