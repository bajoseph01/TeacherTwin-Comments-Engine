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
  npm run codex:prepare -- --teacher "Teacher Name" --subject "Subject" --persona "<path-to-profile.json>" --marks-json "<path-to-marks.json>" [--context-json "<path-to-context.json>"] [--voice-reference-json "<path-to-voice-reference.json>"] [--batch-label "<label>"] [--review-threshold "<percent>"] [--outdir "<output-folder>"]

What it does:
  - packages a teacher persona plus structured marks into a Codex-chat-ready batch
  - optionally matches learner-safe voice reference data onto the batch
  - writes a prompt markdown file for pasting into VS Code chat
  - writes a packet JSON snapshot for later review/audit
  - writes a comments template JSON matching the local verify/export workflow
  - when voice reference data is supplied, writes reusable canonical, matched, and effective-context JSON snapshots

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

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeWhitespace = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueStrings = (items) =>
  [...new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean),
  )];

const joinLimited = (items, { limit = 0, separator = ', ' } = {}) => {
  const normalized = uniqueStrings(items);
  const sliced = limit > 0 ? normalized.slice(0, limit) : normalized;
  return sliced.join(separator);
};

const firstNameFromDisplay = (value) =>
  normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean)[0] || '';

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value || {}).filter(([, item]) => {
      if (item === null || item === undefined) return false;
      if (Array.isArray(item)) return item.length > 0;
      return normalizeWhitespace(item).length > 0;
    }),
  );

const mergeArraysUnique = (base, extra) => {
  const merged = [];
  const seen = new Set();

  [...(Array.isArray(base) ? base : []), ...(Array.isArray(extra) ? extra : [])].forEach((item) => {
    const key = typeof item === 'string'
      ? normalizeWhitespace(item)
      : JSON.stringify(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(typeof item === 'string' ? normalizeWhitespace(item) : item);
  });

  return merged;
};

const mergeContextObjects = (base, extra) => {
  if (!base && !extra) return null;
  if (!base) return extra;
  if (!extra) return base;

  const result = { ...base };
  Object.entries(extra).forEach(([key, value]) => {
    const current = result[key];

    if (Array.isArray(current) || Array.isArray(value)) {
      result[key] = mergeArraysUnique(current, value);
      return;
    }

    if (
      current
      && typeof current === 'object'
      && !Array.isArray(current)
      && value
      && typeof value === 'object'
      && !Array.isArray(value)
    ) {
      result[key] = mergeContextObjects(current, value);
      return;
    }

    if (
      current === undefined
      || current === null
      || current === ''
      || (Array.isArray(current) && current.length === 0)
    ) {
      result[key] = value;
    }
  });

  return result;
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

const formatTeacherRemark = (row) => {
  const direct = row?.teacherRemark || row?.teacherRemarks || row?.teacherNote || row?.teacherNotes || '';
  const normalized = normalizeWhitespace(direct);
  return normalized || '';
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

const normalizePersonalisationContext = (context) => {
  if (!context || typeof context !== 'object') return null;

  const normalized = compactObject({
    referenceName: context.referenceName || context.reference_name || '',
    confidence: context.confidence || context.name_confidence || '',
    hobbiesInterests: context.hobbiesInterests || context.hobbies_interests || '',
    uniqueDetail: context.uniqueDetail || context.unique_detail || '',
    writingStrengths: context.writingStrengths || context.writing_strengths || '',
    writingNeeds: context.writingNeeds || context.writing_needs || '',
    safeCommentHooks: uniqueStrings(context.safeCommentHooks || context.safe_comment_hooks || []),
    afrReportSeed: context.afrReportSeed || context.afr_report_seed || '',
    privacyNotes: uniqueStrings(context.privacyNotes || context.privacy_notes || []),
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const normalizeExistingReferenceEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;

  const name = normalizeWhitespace(
    entry.name
    || entry.learner_name
    || entry.personalisationContext?.referenceName
    || entry.referenceName
    || '',
  );
  if (!name) return null;

  const personalisationContext = normalizePersonalisationContext(
    entry.personalisationContext
    || {
      referenceName: entry.referenceName || firstNameFromDisplay(name),
      confidence: entry.confidence || entry.name_confidence || '',
      hobbiesInterests: entry.hobbiesInterests || entry.hobbies_interests || '',
      uniqueDetail: entry.uniqueDetail || entry.unique_detail || '',
      writingStrengths: entry.writingStrengths || entry.writing_strengths || '',
      writingNeeds: entry.writingNeeds || entry.writing_needs || '',
      safeCommentHooks: entry.safeCommentHooks || entry.safe_comment_hooks || [],
      afrReportSeed: entry.afrReportSeed || entry.afr_report_seed || entry.comment_seed || '',
      privacyNotes: entry.privacyNotes || entry.privacy_notes || [],
    },
  );

  return {
    name,
    class: normalizeWhitespace(entry.class || ''),
    personalisationContext,
    sourceAudit: entry.sourceAudit && typeof entry.sourceAudit === 'object' ? entry.sourceAudit : undefined,
  };
};

const buildSafeProfilePersonalisation = (profile) => {
  const safeProfile = profile?.safe_profile || {};
  const writingObservations = profile?.writing_observations || {};
  const reportSupport = profile?.report_comment_support || {};

  return normalizePersonalisationContext({
    referenceName: firstNameFromDisplay(profile?.learner_name || profile?.name || ''),
    confidence: profile?.name_confidence || '',
    hobbiesInterests: joinLimited(safeProfile.interests_and_hobbies, { limit: 5 }),
    uniqueDetail: joinLimited(safeProfile.memorable_safe_details, { limit: 2, separator: '; ' }),
    writingStrengths: joinLimited(writingObservations.strengths, { limit: 3, separator: '; ' }),
    writingNeeds: joinLimited(writingObservations.needs, { limit: 3, separator: '; ' }),
    safeCommentHooks: uniqueStrings(reportSupport.safe_comment_hooks),
    afrReportSeed: reportSupport.afr_report_seed || '',
    privacyNotes: uniqueStrings(reportSupport.privacy_notes),
  });
};

const normalizeVoiceReferenceInput = (input) => {
  if (Array.isArray(input)) {
    return {
      sourceType: 'canonical-voice-reference',
      projectName: '',
      classGroup: '',
      taskName: '',
      entries: input.map(normalizeExistingReferenceEntry).filter(Boolean),
    };
  }

  if (input && typeof input === 'object' && Array.isArray(input.profiles)) {
    return {
      sourceType: 'afrikaans-safe-profiles',
      projectName: normalizeWhitespace(input.project_name || ''),
      classGroup: normalizeWhitespace(input.class_group || ''),
      taskName: normalizeWhitespace(input.task_name || ''),
      entries: input.profiles
        .map((profile) => {
          const name = normalizeWhitespace(profile?.learner_name || profile?.name || '');
          if (!name) return null;

          return {
            name,
            class: '',
            personalisationContext: buildSafeProfilePersonalisation(profile),
            sourceAudit: compactObject({
              sourceType: 'afrikaans-safe-profiles',
              projectName: input.project_name || '',
              classGroup: input.class_group || '',
              sourceTask: profile?.source_task || input.task_name || '',
              privacyNotes: uniqueStrings(profile?.report_comment_support?.privacy_notes),
            }),
          };
        })
        .filter(Boolean),
    };
  }

  throw new Error('Voice reference JSON must be an array or an object with a profiles array.');
};

const buildVoiceReferenceLookup = (entries) => {
  const exactName = new Map();
  const aliasName = new Map();
  const firstName = new Map();

  const push = (map, key, entry) => {
    if (!key) return;
    const bucket = map.get(key) || [];
    bucket.push(entry);
    map.set(key, bucket);
  };

  entries.forEach((entry) => {
    push(exactName, normalizeName(entry.name), entry);
    push(aliasName, normalizeName(entry.personalisationContext?.referenceName || ''), entry);
    push(firstName, normalizeName(firstNameFromDisplay(entry.name)), entry);
  });

  return { exactName, aliasName, firstName };
};

const findVoiceReferenceMatch = (row, lookup) => {
  const normalizedLearnerName = normalizeName(row?.name);
  const exactMatches = lookup.exactName.get(normalizedLearnerName) || [];
  if (exactMatches.length === 1) {
    return { entry: exactMatches[0], mode: 'exact-name' };
  }

  const aliasMatches = lookup.aliasName.get(normalizedLearnerName) || [];
  if (aliasMatches.length === 1) {
    return { entry: aliasMatches[0], mode: 'reference-name' };
  }

  const firstNameMatches = lookup.firstName.get(normalizeName(firstNameFromDisplay(row?.name))) || [];
  if (firstNameMatches.length === 1) {
    return { entry: firstNameMatches[0], mode: 'unique-first-name' };
  }
  if (firstNameMatches.length > 1) {
    return { entry: null, mode: 'ambiguous-first-name' };
  }

  return { entry: null, mode: 'no-match' };
};

const applyVoiceReferenceToMarks = (marksRows, voiceReference) => {
  if (!voiceReference) {
    return {
      enrichedRows: marksRows,
      canonicalReference: null,
      matchedRows: null,
      summary: null,
    };
  }

  const lookup = buildVoiceReferenceLookup(voiceReference.entries);
  const unmatchedLearners = [];
  const ambiguousLearners = [];
  const matchedReferenceKeys = new Set();

  const enrichedRows = marksRows.map((row) => {
    const existingContext = normalizePersonalisationContext(row?.personalisationContext);
    const match = existingContext ? { entry: null, mode: 'preexisting' } : findVoiceReferenceMatch(row, lookup);
    const matchedContext = match.entry ? normalizePersonalisationContext(match.entry.personalisationContext) : null;
    const personalisationContext = existingContext || matchedContext;

    if (match.entry) {
      matchedReferenceKeys.add(normalizeName(match.entry.name));
    } else if (!existingContext) {
      if (match.mode === 'ambiguous-first-name') {
        ambiguousLearners.push(String(row?.name || '').trim());
      } else {
        unmatchedLearners.push(String(row?.name || '').trim());
      }
    }

    const sourceAudit = {
      ...(row?.sourceAudit && typeof row.sourceAudit === 'object' ? row.sourceAudit : {}),
    };

    if (voiceReference) {
      sourceAudit.voiceReference = compactObject({
        sourceType: voiceReference.sourceType,
        projectName: voiceReference.projectName,
        taskName: voiceReference.taskName,
        matchedName: match.entry?.name || '',
        matchMode: match.mode,
        confidence: personalisationContext?.confidence || '',
        privacyNotes: personalisationContext?.privacyNotes || [],
      });
    }

    return {
      ...row,
      personalisationContext,
      sourceAudit: Object.keys(sourceAudit).length > 0 ? sourceAudit : undefined,
    };
  });

  const canonicalReference = voiceReference.entries.map((entry) => ({
    name: entry.name,
    class: entry.class || '',
    personalisationContext: normalizePersonalisationContext(entry.personalisationContext),
  }));

  const matchedRows = enrichedRows.map((row) => {
    const base = {
      name: String(row?.name || '').trim(),
      class: String(row?.class || '').trim(),
      personalisationContext: normalizePersonalisationContext(row?.personalisationContext),
    };

    if (row?.sourceAudit?.voiceReference) {
      return {
        ...base,
        sourceAudit: {
          voiceReference: row.sourceAudit.voiceReference,
        },
      };
    }

    return base;
  });

  const unusedReferenceEntries = voiceReference.entries
    .map((entry) => entry.name)
    .filter((name) => !matchedReferenceKeys.has(normalizeName(name)));

  return {
    enrichedRows,
    canonicalReference,
    matchedRows,
    summary: {
      sourceType: voiceReference.sourceType,
      projectName: voiceReference.projectName || '',
      classGroup: voiceReference.classGroup || '',
      taskName: voiceReference.taskName || '',
      providedEntries: voiceReference.entries.length,
      matchedLearners: matchedRows.filter((row) => row.personalisationContext).length,
      unmatchedLearners: uniqueStrings(unmatchedLearners),
      ambiguousLearners: uniqueStrings(ambiguousLearners),
      unusedReferenceEntries: uniqueStrings(unusedReferenceEntries),
    },
  };
};

const buildGeneratedStudentVoiceContext = ({ subjectName, subjectKey, voiceReference }) => {
  if (!voiceReference) return null;

  const hasAfrikaansSeed = voiceReference.entries.some((entry) => entry.personalisationContext?.afrReportSeed);
  const isAfrikaans = subjectKey === 'afrikaans' || hasAfrikaansSeed;

  const context = {
    grade: voiceReference.classGroup || undefined,
    subject: subjectName || undefined,
    studentVoiceRules: {
      referenceSource: voiceReference.projectName || 'Matched student voice reference',
      referenceTask: voiceReference.taskName || '',
      personalisationRule: 'Add at most one clearly safe personal sentence or clause unless the marks and matched writing reference together justify two brief personal touches.',
      confidenceRule: 'For medium-confidence matches, stay with broad interests or writing observations and avoid narrow identifying details.',
      privacyRule: 'Do not mention exact family/home details, even when a local safe profile includes them.',
      preferredEvidence: [
        'interests and hobbies',
        'memorable safe details',
        'writing strengths',
        'writing needs',
      ],
    },
    structureVariation: {
      goals: [
        'Use personal details sparingly so the comment still reads as an academic report first.',
      ],
      shapeFamilies: [
        'Academic-first then one short safe personal line.',
        'Writing-voice line first when the matched reference is especially strong, then marks evidence.',
        'Marks-only shape when the voice match is weak, absent, or medium-confidence.',
      ],
      rotationRules: [
        'Do not force a personal detail into every comment.',
        'Prefer marks-only drafting when the personalisation match is weak or ambiguous.',
      ],
      closingRules: [
        'Keep personalisation subordinate to the academic close rather than replacing it.',
      ],
    },
  };

  if (isAfrikaans) {
    context.draftingRules = {
      evidenceOnly: true,
      ignoreBlankAssessments: true,
      strengthsToMention: 'Keep the academic evidence from the marks primary. When it fits naturally, add one short safe personal touch from the matched Afrikaans writing reference.',
      mainDevelopmentArea: 'Use one main next step only. When a writing need from the matched Afrikaans reference aligns with the marks, it may guide the improvement sentence.',
      unsupportedClaimsToAvoid: [
        'private home details',
        'exact family configurations or names',
        'behaviour or personality claims not shown in the marks or safe writing reference',
        'copying the Afrikaans seed sentence verbatim',
      ],
    };
    context.studentVoiceRules.seedRule = 'Use the Afrikaans seed only as a wording hint in the teacher voice; do not paste it unchanged.';
    context.studentVoiceRules.preferredEvidence = mergeArraysUnique(
      context.studentVoiceRules.preferredEvidence,
      ['afr_report_seed'],
    );
    context.structureVariation.goals = mergeArraysUnique(
      context.structureVariation.goals,
      ['When the matched Afrikaans seed is useful, adapt it naturally rather than pasting it unchanged.'],
    );
  }

  return context;
};

const formatPersonalisationContext = (personalisationContext) => {
  const context = normalizePersonalisationContext(personalisationContext);
  if (!context) return '';

  const lines = [];
  const overviewBits = [];
  if (context.confidence) overviewBits.push(`confidence: ${context.confidence}`);
  if (context.hobbiesInterests) overviewBits.push(`interests: ${context.hobbiesInterests}`);
  if (context.uniqueDetail) overviewBits.push(`safe detail: ${context.uniqueDetail}`);
  if (overviewBits.length > 0) {
    lines.push(`\n   - personalisation: ${overviewBits.join(' | ')}`);
  }

  const writingBits = [];
  if (context.writingStrengths) writingBits.push(`strengths: ${context.writingStrengths}`);
  if (context.writingNeeds) writingBits.push(`needs: ${context.writingNeeds}`);
  if (writingBits.length > 0) {
    lines.push(`\n   - writingReference: ${writingBits.join(' | ')}`);
  }

  if (context.afrReportSeed) {
    lines.push(`\n   - afrSeed: ${context.afrReportSeed}`);
  }

  return lines.join('');
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
  if (subjectContext.studentVoiceRules?.referenceTask) {
    lines.push(`- Writing reference task: ${subjectContext.studentVoiceRules.referenceTask}`);
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

  const studentVoiceRules = subjectContext.studentVoiceRules;
  if (studentVoiceRules && typeof studentVoiceRules === 'object') {
    lines.push('- Student voice personalisation:');
    if (studentVoiceRules.referenceSource) {
      lines.push(`  - Reference source: ${studentVoiceRules.referenceSource}`);
    }
    if (studentVoiceRules.personalisationRule) {
      lines.push(`  - ${studentVoiceRules.personalisationRule}`);
    }
    if (studentVoiceRules.confidenceRule) {
      lines.push(`  - ${studentVoiceRules.confidenceRule}`);
    }
    if (studentVoiceRules.seedRule) {
      lines.push(`  - ${studentVoiceRules.seedRule}`);
    }
    if (studentVoiceRules.privacyRule) {
      lines.push(`  - ${studentVoiceRules.privacyRule}`);
    }
    if (Array.isArray(studentVoiceRules.preferredEvidence) && studentVoiceRules.preferredEvidence.length > 0) {
      lines.push(`  - Prefer evidence such as: ${studentVoiceRules.preferredEvidence.join(', ')}`);
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
  const teacherRemarkText = formatTeacherRemark(row);
  const summaryLine = summaryScoresText ? `\n   - summaryScores: ${summaryScoresText}` : '';
  const assessmentLine = assessmentText ? `\n   - sectionEvidence: ${assessmentText}` : '';
  const teacherRemarkLine = teacherRemarkText ? `\n   - teacherRemark: ${teacherRemarkText}` : '';
  const personalisationText = formatPersonalisationContext(row.personalisationContext);
  return `${index + 1}. ${row.name}${classText} | ${formatMarksSummary(row.marks)}${summaryLine}${assessmentLine}${teacherRemarkLine}${personalisationText}${riskText}`;
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

1. Use only the evidence present in the persona, the optional subject context, and the learner data provided below.
2. Do not invent achievements, concerns, or behavioural claims that are not supported by the learner data, persona, or subject context.
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

${subjectPersonaMarkdown ? `${subjectPersonaMarkdown}\n\n` : ''}${contextMarkdown ? `${contextMarkdown}\n\n` : ''}${structureVariationMarkdown ? `${structureVariationMarkdown}\n\n` : ''}## Learner Data

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
  const voiceReferenceJsonPath = String(options['voice-reference-json'] || '').trim();
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
  if (!Array.isArray(marksRows) || marksRows.length === 0) {
    console.error('Marks JSON must be a non-empty array.');
    process.exit(1);
  }
  const subjectContext = contextJsonPath ? await loadJson(contextJsonPath) : null;
  const subjectKey = inferSubjectKey(subjectName);
  const voiceReferenceInput = voiceReferenceJsonPath ? await loadJson(voiceReferenceJsonPath) : null;
  const voiceReference = voiceReferenceInput ? normalizeVoiceReferenceInput(voiceReferenceInput) : null;
  const voiceReferenceAugmentation = applyVoiceReferenceToMarks(marksRows, voiceReference);
  const effectiveMarksRows = voiceReferenceAugmentation.enrichedRows;
  const generatedStudentVoiceContext = buildGeneratedStudentVoiceContext({
    subjectName,
    subjectKey,
    voiceReference,
  });
  const effectiveSubjectContext = mergeContextObjects(subjectContext, generatedStudentVoiceContext);
  const subjectPersona = persona?.subject_variation?.[subjectKey] || null;
  const structureVariation = normalizeStructureVariation({
    persona,
    subjectPersona,
    subjectContext: effectiveSubjectContext,
  });
  const normalizedPersona = {
    tone: normalizeTone(persona?.tone),
    vocabulary: normalizeVocabulary(persona),
    structure: normalizeStructure(persona),
    formatting: normalizeFormatting(persona?.formatting),
  };

  const batchLabel = sanitizeFilenamePart(
    options['batch-label']
      || path.basename(marksJsonPath, path.extname(marksJsonPath))
      || `${subjectName}_${teacherName}`,
  );
  const batchSlug = slugify(batchLabel);
  const packetPath = path.join(outdir, `${batchSlug}_codex_packet.json`);
  const promptPath = path.join(outdir, `${batchSlug}_codex_prompt.md`);
  const templatePath = path.join(outdir, `${batchSlug}_comments_template.json`);
  const contextSnapshotPath = effectiveSubjectContext ? path.join(outdir, `${batchSlug}_context.json`) : null;
  const voiceReferenceCanonicalPath = voiceReference ? path.join(outdir, `${batchSlug}_voice_reference_canonical.json`) : null;
  const voiceReferenceMatchedPath = voiceReference ? path.join(outdir, `${batchSlug}_voice_reference_matched.json`) : null;
  const commentsTemplate = buildCommentTemplate(effectiveMarksRows, { reviewThreshold });
  const packet = {
    createdAt: new Date().toISOString(),
    mode: 'codex-operator-batch',
    teacherName,
    subjectName,
    batchLabel,
    personaPath: path.resolve(personaPath),
    marksJsonPath: path.resolve(marksJsonPath),
    contextJsonPath: contextJsonPath ? path.resolve(contextJsonPath) : null,
    effectiveContextJsonPath: contextSnapshotPath,
    voiceReferenceJsonPath: voiceReferenceJsonPath ? path.resolve(voiceReferenceJsonPath) : null,
    voiceReferenceCanonicalPath,
    voiceReferenceMatchedPath,
    thresholds: {
      failingThreshold: FAILING_THRESHOLD,
      reviewThreshold,
    },
    persona: normalizedPersona,
    subjectPersona,
    subjectContext: effectiveSubjectContext,
    structureVariation,
    voiceReferenceSummary: voiceReferenceAugmentation.summary,
    learners: effectiveMarksRows.map((row) => ({
      name: String(row.name || '').trim(),
      class: String(row.class || '').trim(),
      marks: row.marks && typeof row.marks === 'object' ? row.marks : {},
      summaryScores: row.summaryScores && typeof row.summaryScores === 'object' ? row.summaryScores : undefined,
      assessmentBreakdown: row.assessmentBreakdown && typeof row.assessmentBreakdown === 'object' ? row.assessmentBreakdown : undefined,
      teacherRemark: formatTeacherRemark(row) || undefined,
      personalisationContext: normalizePersonalisationContext(row.personalisationContext),
      sourceAudit: row.sourceAudit && typeof row.sourceAudit === 'object' ? row.sourceAudit : undefined,
      inferredRiskAreas: detectRiskAreasFromMarks(row.marks, { reviewThreshold }),
    })),
  };
  const promptMarkdown = buildPromptMarkdown({
    teacherName,
    subjectName,
    batchLabel,
    persona: normalizedPersona,
    marksRows: effectiveMarksRows,
    subjectPersona,
    subjectContext: effectiveSubjectContext,
    structureVariation,
    reviewThreshold,
  });

  await fs.mkdir(outdir, { recursive: true });

  await fs.writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  await fs.writeFile(promptPath, `${promptMarkdown}\n`, 'utf8');
  await fs.writeFile(templatePath, `${JSON.stringify(commentsTemplate, null, 2)}\n`, 'utf8');
  if (contextSnapshotPath && effectiveSubjectContext) {
    await fs.writeFile(contextSnapshotPath, `${JSON.stringify(effectiveSubjectContext, null, 2)}\n`, 'utf8');
  }
  if (voiceReferenceCanonicalPath && voiceReferenceAugmentation.canonicalReference) {
    await fs.writeFile(
      voiceReferenceCanonicalPath,
      `${JSON.stringify(voiceReferenceAugmentation.canonicalReference, null, 2)}\n`,
      'utf8',
    );
  }
  if (voiceReferenceMatchedPath && voiceReferenceAugmentation.matchedRows) {
    await fs.writeFile(
      voiceReferenceMatchedPath,
      `${JSON.stringify(voiceReferenceAugmentation.matchedRows, null, 2)}\n`,
      'utf8',
    );
  }

  console.log(`Prepared Codex operator batch for ${teacherName}.`);
  console.log(`Packet JSON: ${packetPath}`);
  console.log(`Prompt Markdown: ${promptPath}`);
  console.log(`Comments Template: ${templatePath}`);
  if (contextSnapshotPath && effectiveSubjectContext) {
    console.log(`Context JSON: ${contextSnapshotPath}`);
  }
  if (voiceReferenceCanonicalPath && voiceReferenceAugmentation.canonicalReference) {
    console.log(`Voice Reference Canonical JSON: ${voiceReferenceCanonicalPath}`);
  }
  if (voiceReferenceMatchedPath && voiceReferenceAugmentation.matchedRows) {
    console.log(`Voice Reference Matched JSON: ${voiceReferenceMatchedPath}`);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
