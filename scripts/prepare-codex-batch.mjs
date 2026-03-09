import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const FAILING_THRESHOLD = 50;
const DEFAULT_REVIEW_THRESHOLD = 55;
const DEFAULT_STRUCTURE_DIVERSITY = {
  goals: [
    'Do not let the full batch settle into one repeated sentence rhythm.',
    'Vary the position of strengths, development points, and the final close so the comments do not read like a template run.',
  ],
  shapeFamilies: [
    'Strength-led: strongest assessed section first, then a next step, then a concise close.',
    'Progress-led: progress or growing confidence first, then evidence, then a practical target.',
    'Development-balanced: development area introduced early, then balanced with a credible strength and supportive close.',
    'Consolidated: strength and overall judgment merged into one sentence, followed by a next step and a short ending.',
    'High-attainment: strongest sections first, then one fine-tuning target without overstating concern.',
  ],
  rotationRules: [
    'Mix 3-, 4-, and 5-sentence comments across the batch when natural.',
    'Do not give every learner a separate overall-result sentence.',
    'Move the development point earlier in some comments and later in others.',
    'Use teacher-reflection lines selectively rather than automatically in every comment.',
  ],
  closingRules: [
    'Some comments may end with direct encouragement only.',
    'Some comments may end with a teacher reflection only.',
    'Some comments may combine encouragement and reflection, but not in every row.',
  ],
};

const usage = `
Usage:
  npm run codex:prepare -- --teacher "Teacher Name" --subject "Subject" --persona "<path-to-profile.json>" --marks-json "<path-to-marks.json>" [--context-json "<path-to-context.json>"] [--batch-label "<label>"] [--review-threshold "<percent>"] [--outdir "<output-folder>"]

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
    },
    "summaryScores": {
      "classwork": "74%",
      "tests": "76.6%"
    },
    "assessmentBreakdown": {
      "review_1": {
        "header": "Review 1",
        "topic": "Place value, ordering and comparing numbers",
        "percent": "62.5%"
      }
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

const parseThresholdOption = (value, fallback, label) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    throw new Error(`${label} must be a number between 0 and 100.`);
  }

  return parsed;
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

const loadJson = async (filePath) => {
  const raw = await fs.readFile(path.resolve(filePath), 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
};

const parseNumericMark = (value) => {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const detectRiskAreasFromMarks = (marks, { reviewThreshold = DEFAULT_REVIEW_THRESHOLD } = {}) => {
  const riskAreas = [];
  Object.entries(marks || {}).forEach(([label, raw]) => {
    const numeric = parseNumericMark(raw);
    if (numeric === null) return;
    if (numeric < FAILING_THRESHOLD) {
      riskAreas.push(`${label} (${numeric}%) - below pass mark`);
      return;
    }
    if (numeric < reviewThreshold) {
      riskAreas.push(`${label} (${numeric}%) - below review threshold (${reviewThreshold}%)`);
    }
  });
  return riskAreas;
};

const formatMarksSummary = (marks) =>
  Object.entries(marks || {})
    .map(([label, value]) => `${label}: ${value}`)
    .join(' | ');

const formatSummaryScores = (summaryScores) => {
  if (!summaryScores || typeof summaryScores !== 'object') return '';
  const parts = Object.entries(summaryScores)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([label, value]) => `${label}: ${value}`);
  return parts.join(' | ');
};

const formatAssessmentBreakdown = (assessmentBreakdown) => {
  if (!assessmentBreakdown || typeof assessmentBreakdown !== 'object') return '';
  return Object.values(assessmentBreakdown)
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const header = String(entry.header || '').trim();
      const topic = String(entry.topic || '').trim();
      const percent = String(entry.percent || '').trim();
      const topicText = topic ? ` - ${topic}` : '';
      return `${header}${topicText}: ${percent}`;
    })
    .join(' | ');
};

const inferSubjectKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (/\bmathematics\b|\bmaths\b|\bmath\b/.test(normalized)) return 'maths';
  if (/\benglish\b/.test(normalized)) return 'english';
  if (/\bafrikaans\b/.test(normalized)) return 'afrikaans';
  if (/\bisixhosa\b|\bxhosa\b/.test(normalized)) return 'isixhosa';
  return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
};

const joinNonEmpty = (items, separator = ' | ') =>
  items
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(separator);

const mergeUniqueStrings = (...items) =>
  [...new Set(
    items
      .flatMap((item) => (Array.isArray(item) ? item : []))
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )];

const normalizeTone = (tone) => {
  if (typeof tone === 'string') return tone;
  if (!tone || typeof tone !== 'object') return '';
  return joinNonEmpty([
    Array.isArray(tone.primary) ? tone.primary.join(', ') : '',
    Array.isArray(tone.secondary) ? `secondary: ${tone.secondary.join(', ')}` : '',
    tone.emotional_temperature ? `temperature: ${tone.emotional_temperature}` : '',
    tone.criticism_style ? `criticism: ${tone.criticism_style}` : '',
  ]);
};

const normalizeVocabulary = (persona) => {
  if (Array.isArray(persona?.vocabulary)) return persona.vocabulary;
  const bank = persona?.vocabulary_bank;
  if (!bank || typeof bank !== 'object') return [];
  return [...new Set(
    Object.values(bank)
      .flatMap((entry) => (Array.isArray(entry) ? entry : []))
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )];
};

const normalizeStructure = (persona) => {
  if (typeof persona?.structure === 'string' && persona.structure.trim()) return persona.structure;
  const architecture = persona?.sentence_architecture;
  if (!architecture || typeof architecture !== 'object') return '';
  return joinNonEmpty([
    architecture.opening_pattern ? `Opening: ${architecture.opening_pattern}` : '',
    architecture.middle_pattern ? `Middle: ${architecture.middle_pattern}` : '',
    architecture.development_pattern ? `Development: ${architecture.development_pattern}` : '',
    architecture.closing_pattern ? `Closing: ${architecture.closing_pattern}` : '',
    architecture.typical_length ? `Length: ${architecture.typical_length}` : '',
  ]);
};

const normalizeFormatting = (formatting) => {
  if (typeof formatting === 'string') return formatting;
  if (!formatting || typeof formatting !== 'object') return '';
  return joinNonEmpty([
    formatting.casing ? `Casing: ${formatting.casing}` : '',
    formatting.paragraph_style ? `Paragraphs: ${formatting.paragraph_style}` : '',
    Array.isArray(formatting.punctuation) ? `Punctuation: ${formatting.punctuation.join(', ')}` : '',
    formatting.spelling_standard ? `Spelling: ${formatting.spelling_standard}` : '',
    formatting.mark_usage ? `Marks: ${formatting.mark_usage}` : '',
  ]);
};

const normalizeStructureVariation = ({ persona, subjectPersona, subjectContext }) => {
  const personaVariation = persona?.structure_variation;
  const subjectVariation = subjectPersona?.structure_variation;
  const contextVariation = subjectContext?.structureVariation;

  return {
    goals: mergeUniqueStrings(
      DEFAULT_STRUCTURE_DIVERSITY.goals,
      personaVariation?.goals,
      subjectVariation?.goals,
      contextVariation?.goals,
    ),
    shapeFamilies: mergeUniqueStrings(
      DEFAULT_STRUCTURE_DIVERSITY.shapeFamilies,
      personaVariation?.shapeFamilies,
      subjectVariation?.shapeFamilies,
      contextVariation?.shapeFamilies,
    ),
    rotationRules: mergeUniqueStrings(
      DEFAULT_STRUCTURE_DIVERSITY.rotationRules,
      personaVariation?.rotationRules,
      subjectVariation?.rotationRules,
      contextVariation?.rotationRules,
    ),
    closingRules: mergeUniqueStrings(
      DEFAULT_STRUCTURE_DIVERSITY.closingRules,
      personaVariation?.closingRules,
      subjectVariation?.closingRules,
      contextVariation?.closingRules,
    ),
  };
};

const buildCommentTemplate = (marksRows, { reviewThreshold }) =>
  marksRows.map((row) => {
    const inferredRiskAreas = detectRiskAreasFromMarks(row.marks, { reviewThreshold });
    return {
      name: String(row.name || '').trim(),
      class: String(row.class || '').trim(),
      generatedComment: '',
      riskAreas: inferredRiskAreas,
      parentAlertRequired: inferredRiskAreas.length > 0,
    };
  });

const buildSubjectPersonaMarkdown = (subjectPersona) => {
  if (!subjectPersona || typeof subjectPersona !== 'object') return '';

  const blocks = [];
  if (Array.isArray(subjectPersona.focus_areas) && subjectPersona.focus_areas.length > 0) {
    blocks.push(`- Focus areas: ${subjectPersona.focus_areas.join(', ')}`);
  }
  if (subjectPersona.voice_shift) {
    blocks.push(`- Subject voice shift: ${subjectPersona.voice_shift}`);
  }
  if (subjectPersona.evidence_mode) {
    blocks.push(`- Evidence mode: ${subjectPersona.evidence_mode}`);
  }

  const variationBank = subjectPersona.variation_bank;
  if (variationBank && typeof variationBank === 'object') {
    if (Array.isArray(variationBank.opener_families) && variationBank.opener_families.length > 0) {
      blocks.push('- Opener families:');
      blocks.push(...variationBank.opener_families.map((item) => `  - ${item}`));
    }
    if (Array.isArray(variationBank.closing_families) && variationBank.closing_families.length > 0) {
      blocks.push('- Closing families:');
      blocks.push(...variationBank.closing_families.map((item) => `  - ${item}`));
    }
    if (Array.isArray(variationBank.safe_evidence_first_phrases) && variationBank.safe_evidence_first_phrases.length > 0) {
      blocks.push('- Safe evidence-first phrasing:');
      blocks.push(...variationBank.safe_evidence_first_phrases.map((item) => `  - ${item}`));
    }
    if (variationBank.closing_address_rule) {
      blocks.push(`- Closing address rule: ${variationBank.closing_address_rule}`);
    }
    if (Array.isArray(variationBank.banned_repetitive_skeletons) && variationBank.banned_repetitive_skeletons.length > 0) {
      blocks.push('- Avoid repetitive skeletons:');
      blocks.push(...variationBank.banned_repetitive_skeletons.map((item) => `  - ${item}`));
    }
  }

  if (blocks.length === 0) return '';
  return `## Subject-Specific Teacher Voice\n\n${blocks.join('\n')}`;
};

const buildContextMarkdown = (subjectContext) => {
  if (!subjectContext || typeof subjectContext !== 'object') return '';

  const lines = [];
  const titleBits = [subjectContext.grade, subjectContext.term, subjectContext.subject].filter(Boolean);
  if (titleBits.length > 0) {
    lines.push(`- Context: ${titleBits.join(' ')}`);
  }

  const draftingRules = subjectContext.draftingRules;
  if (draftingRules && typeof draftingRules === 'object') {
    lines.push('- Drafting rules:');
    if (draftingRules.evidenceOnly) lines.push('  - Use only evidence visible in the provided marks/context.');
    if (draftingRules.ignoreBlankAssessments) lines.push('  - Ignore omitted or blank assessment sections completely.');
    if (draftingRules.strengthsToMention) lines.push(`  - ${draftingRules.strengthsToMention}`);
    if (draftingRules.mainDevelopmentArea) lines.push(`  - ${draftingRules.mainDevelopmentArea}`);
    if (draftingRules.closingAddressConsistency) lines.push(`  - ${draftingRules.closingAddressConsistency}`);
    if (Array.isArray(draftingRules.unsupportedClaimsToAvoid) && draftingRules.unsupportedClaimsToAvoid.length > 0) {
      lines.push(`  - Avoid unsupported claims about: ${draftingRules.unsupportedClaimsToAvoid.join(', ')}`);
    }
  }

  const interpretation = subjectContext.assessmentInterpretation;
  if (interpretation && typeof interpretation === 'object') {
    lines.push('- Assessment interpretation:');
    Object.values(interpretation).forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const header = String(entry.header || '').trim();
      const meaning = String(entry.meaning || '').trim();
      const gradeNote = String(entry.gradeNote || '').trim();
      const presenceRule = String(entry.presenceRule || '').trim();
      const extra = [gradeNote, presenceRule].filter(Boolean).join(' ');
      lines.push(`  - ${header}: ${meaning}${extra ? ` ${extra}` : ''}`);
    });
  }

  const review2Guidance = subjectContext.review2Guidance;
  if (review2Guidance && typeof review2Guidance === 'object' && Array.isArray(review2Guidance.framing)) {
    lines.push('- Review 2 wording guidance:');
    review2Guidance.framing.forEach((item) => lines.push(`  - ${item}`));
  }

  if (Array.isArray(subjectContext.thresholdLanguage) && subjectContext.thresholdLanguage.length > 0) {
    lines.push('- Assessment language thresholds:');
    subjectContext.thresholdLanguage.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      lines.push(`  - ${entry.range}: ${(entry.preferredDescriptors || []).join(', ')}`);
    });
  }

  const antiRepetition = subjectContext.antiRepetition;
  if (antiRepetition && typeof antiRepetition === 'object') {
    lines.push('- Anti-repetition controls:');
    if (Array.isArray(antiRepetition.bannedExactOpeners) && antiRepetition.bannedExactOpeners.length > 0) {
      antiRepetition.bannedExactOpeners.forEach((item) => lines.push(`  - Do not use exact opener: ${item}`));
    }
    if (antiRepetition.maxUsesPerOpenerFamily) {
      lines.push(`  - Do not use any opener family more than ${antiRepetition.maxUsesPerOpenerFamily} times in one batch.`);
    }
    if (antiRepetition.adjacentRepeatPolicy) {
      lines.push(`  - ${antiRepetition.adjacentRepeatPolicy}`);
    }
    if (Array.isArray(antiRepetition.openerFamilies) && antiRepetition.openerFamilies.length > 0) {
      lines.push('  - Rotate opener families such as:');
      antiRepetition.openerFamilies.forEach((entry) => lines.push(`    - ${entry.pattern}`));
    }
    if (Array.isArray(antiRepetition.closingFamilies) && antiRepetition.closingFamilies.length > 0) {
      lines.push('  - Rotate closing families such as:');
      antiRepetition.closingFamilies.forEach((entry) => lines.push(`    - ${entry}`));
    }
  }

  if (lines.length === 0) return '';
  return `## Subject Context\n\n${lines.join('\n')}`;
};

const buildStructureVariationMarkdown = (structureVariation) => {
  if (!structureVariation || typeof structureVariation !== 'object') return '';

  const lines = [];

  if (Array.isArray(structureVariation.goals) && structureVariation.goals.length > 0) {
    lines.push('- Goals:');
    structureVariation.goals.forEach((item) => lines.push(`  - ${item}`));
  }

  if (Array.isArray(structureVariation.shapeFamilies) && structureVariation.shapeFamilies.length > 0) {
    lines.push('- Allowed comment shapes:');
    structureVariation.shapeFamilies.forEach((item) => lines.push(`  - ${item}`));
  }

  if (Array.isArray(structureVariation.rotationRules) && structureVariation.rotationRules.length > 0) {
    lines.push('- Rotation rules:');
    structureVariation.rotationRules.forEach((item) => lines.push(`  - ${item}`));
  }

  if (Array.isArray(structureVariation.closingRules) && structureVariation.closingRules.length > 0) {
    lines.push('- Closing variation:');
    structureVariation.closingRules.forEach((item) => lines.push(`  - ${item}`));
  }

  if (lines.length === 0) return '';
  return `## Batch Structure Diversity\n\n${lines.join('\n')}`;
};

const buildLearnerMarkdown = (row, index, { reviewThreshold }) => {
  const riskAreas = detectRiskAreasFromMarks(row.marks, { reviewThreshold });
  const riskText = riskAreas.length > 0 ? `\n   - riskHints: ${riskAreas.join('; ')}` : '';
  const classText = row.class ? ` | class: ${row.class}` : '';
  const summaryScoresText = formatSummaryScores(row.summaryScores);
  const assessmentText = formatAssessmentBreakdown(row.assessmentBreakdown);
  const summaryLine = summaryScoresText ? `\n   - summaryScores: ${summaryScoresText}` : '';
  const assessmentLine = assessmentText ? `\n   - sectionEvidence: ${assessmentText}` : '';
  return `${index + 1}. ${row.name}${classText} | ${formatMarksSummary(row.marks)}${summaryLine}${assessmentLine}${riskText}`;
};

const buildPromptMarkdown = ({
  teacherName,
  subjectName,
  batchLabel,
  persona,
  marksRows,
  subjectPersona,
  subjectContext,
  structureVariation,
  reviewThreshold,
}) => {
  const learnerLines = marksRows.map((row, index) => {
    return buildLearnerMarkdown(row, index, { reviewThreshold });
  });
  const subjectPersonaMarkdown = buildSubjectPersonaMarkdown(subjectPersona);
  const contextMarkdown = buildContextMarkdown(subjectContext);
  const structureVariationMarkdown = buildStructureVariationMarkdown(structureVariation);

  return `# Codex Batch Prompt

Use this batch to generate ${subjectName} report comments in the teacher voice below.

## Objective

Write one polished report comment per learner for ${teacherName}.

## Constraints

1. Use only the evidence present in the persona, the optional subject context, and the learner marks provided below.
2. Do not invent achievements, concerns, or behavioural claims that are not supported by the marks/persona/context.
3. Keep each comment to one paragraph.
4. Keep teacher voice consistent across the batch.
5. Avoid robotic repetition across the batch; vary opener families, sentence count, sentence order, and closing style.
6. Do not lock the whole batch into one repeated shape such as strength -> overall judgment -> next step -> encouragement -> reflection.
7. If section-level evidence is present, name 1 to 2 genuine strengths from the strongest available sections and exactly 1 main development area from the weakest meaningful section.
8. Ignore blank or omitted assessment sections completely.
9. When the subject context flags Review 2 as a Grade 4 rounding skill, frame weaker Review 2 performance as a developmental foundation still being learned.
10. If a learner has any mark below ${FAILING_THRESHOLD}% or any additional review-threshold area below ${reviewThreshold}%, include explicit parent-facing support language.
11. Return valid JSON only in this structure:

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
- Review threshold: below ${reviewThreshold}%
- Tone: ${persona.tone || ''}
- Vocabulary: ${Array.isArray(persona.vocabulary) ? persona.vocabulary.join(', ') : ''}
- Structure: ${persona.structure || ''}
- Formatting: ${persona.formatting || ''}

${subjectPersonaMarkdown ? `${subjectPersonaMarkdown}\n\n` : ''}${contextMarkdown ? `${contextMarkdown}\n\n` : ''}${structureVariationMarkdown ? `${structureVariationMarkdown}\n\n` : ''}## Learner Marks

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
  const contextJsonPath = String(options['context-json'] || '').trim();
  const reviewThreshold = parseThresholdOption(
    options['review-threshold'],
    DEFAULT_REVIEW_THRESHOLD,
    'Review threshold',
  );

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

  const persona = await loadJson(personaPath);
  const marksRows = await loadJson(marksJsonPath);
  const subjectContext = contextJsonPath ? await loadJson(contextJsonPath) : null;
  const subjectKey = inferSubjectKey(subjectName);
  const subjectPersona = persona?.subject_variation?.[subjectKey] || null;
  const structureVariation = normalizeStructureVariation({
    persona,
    subjectPersona,
    subjectContext,
  });
  const normalizedPersona = {
    tone: normalizeTone(persona?.tone),
    vocabulary: normalizeVocabulary(persona),
    structure: normalizeStructure(persona),
    formatting: normalizeFormatting(persona?.formatting),
  };

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
  const commentsTemplate = buildCommentTemplate(marksRows, { reviewThreshold });
  const packet = {
    createdAt: new Date().toISOString(),
    mode: 'codex-operator-batch',
    teacherName,
    subjectName,
    batchLabel,
    personaPath: path.resolve(personaPath),
    marksJsonPath: path.resolve(marksJsonPath),
    contextJsonPath: contextJsonPath ? path.resolve(contextJsonPath) : null,
    thresholds: {
      failingThreshold: FAILING_THRESHOLD,
      reviewThreshold,
    },
    persona: normalizedPersona,
    subjectPersona,
    subjectContext,
    structureVariation,
    learners: marksRows.map((row) => ({
      name: String(row.name || '').trim(),
      class: String(row.class || '').trim(),
      marks: row.marks && typeof row.marks === 'object' ? row.marks : {},
      summaryScores: row.summaryScores && typeof row.summaryScores === 'object' ? row.summaryScores : undefined,
      assessmentBreakdown: row.assessmentBreakdown && typeof row.assessmentBreakdown === 'object' ? row.assessmentBreakdown : undefined,
      inferredRiskAreas: detectRiskAreasFromMarks(row.marks, { reviewThreshold }),
    })),
  };
  const promptMarkdown = buildPromptMarkdown({
    teacherName,
    subjectName,
    batchLabel,
    persona: normalizedPersona,
    marksRows,
    subjectPersona,
    subjectContext,
    structureVariation,
    reviewThreshold,
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
