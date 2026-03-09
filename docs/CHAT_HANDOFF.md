# Chat Handoff

Last updated: 2026-03-09
Repo root: `d:\2026_Coding\TeacherTwin-Comments-Engine`
Primary user: repo owner
Primary teacher profile currently in use: local teacher profile (gitignored)

## Purpose

Use this file to restart work in a new chat without losing project context.

If you are a new assistant session, read this file first, then inspect the referenced files before making changes.

## Current Product State

This repo now supports four practical workflows, with the local Codex-assisted path treated as the primary operating mode for the repo owner:

1. Web app workflow
2. No-UI terminal workflow for generating report comments and exporting a modern `.docx`
3. Offline teacher-profile ingestion workflow for drafting a new persona JSON from local files
4. Chat-first local workflow where Codex writes comment JSON and local scripts verify/export without model API calls

The app is for teacher comment generation using a teacher persona plus marksheet input.

## Important Current Changes

1. The app export path has been upgraded from legacy HTML-as-`.doc` to a real modern `.docx`.
2. The export title and filename now include:
   - export date
   - subject name
   - teacher name
3. A no-UI script was added so comment generation and `.docx` export can run from terminal without opening the app UI.
4. An offline export path was added so a prepared comments JSON file can be turned into a `.docx` even when Gemini quota is unavailable.
5. Risk handling has been tightened so learners below the active review threshold can receive explicit parent-facing concern language.
6. A local offline profile-ingest script now creates app-compatible teacher persona JSON files from sample folders/files without using Gemini.
7. A local verification script now checks generated comment batches for structure, risk-alert consistency, and optional marks cross-check before DOCX export.
8. Offline profile ingest now supports tool-path preflight (`npm run profile:check-tools`) and loads Poppler/Tesseract path overrides from `.env.local`.
9. Local workspace organization is now supported via `TEACHERTWIN_LOCAL_ROOT`, `TEACHERTWIN_PROFILE_DIR`, and `TEACHERTWIN_EXPORT_DIR`.
10. DOCX export now supports `--batch-label` and collision-safe filenames to avoid overwriting multiple grade batches on the same day.
11. A Codex batch-prep script now packages persona + marks into a chat-ready prompt and template JSON without using any external model API from code.
12. A deep-profile ingest script now supports PDF + Excel COM comment extraction, phrase-bank output, corpus analysis, and a review-gated persona workflow for high-fidelity teacher voice work.
13. Codex batch-prep now supports optional subject-context JSON and includes section-level assessment evidence, anti-repetition guardrails, and subject-specific voice hints in the generated prompt when available.
14. Mel's local comprehensive profile now includes a maths variation bank for evidence-first, less-robotic marks-only drafting.
15. Closing-line drafting for Mel maths batches now includes an address-consistency rule: if the encouragement line addresses the learner directly, the reflection sentence must stay in second person or the full close must remain in third person.
16. Codex batch-prep now includes batch-level structure-diversity guidance by default so future profiles are pushed to vary sentence count, sentence order, and closing style rather than only swapping opener phrases.
17. Local verification now includes style-diversity warnings for dominant sentence count, dominant development position, dominant closing pattern, and overuse of teacher-reflection endings.
18. Codex batch prep and local verification now accept `--review-threshold`, so subject-specific warning bands such as Maths below `60%` can be enforced without changing the default `55%` rule for every batch.
19. The B. Joseph Grade 4 Maths batch has now been completed locally end-to-end using the deep-profile pack, structured marks JSON, a `--review-threshold 60` verification pass, and offline DOCX export.
20. A visible English reference pack for B. Joseph now lives under `exports/bjoseph_Comments/reference/english`, including local copies of the 4S and 4W student-voice JSONs plus the personalisation prompt and usage notes for later English batches.
21. A visible `exports/bjoseph_Comments` folder now acts as the non-gitignored handoff surface for B. Joseph batches, while `workspace/exports` still contains the working copies used during local prep, verify, and export.
22. B. Joseph English 4S and 4W batches have now both been completed locally end-to-end using structured marks JSON, matched student-voice reference context, local verification, and offline DOCX export.
23. The current 4W English batch passed verification, but a later teacher review noted that Selethu's comment should likely be rewritten with stronger warning language because he is below `60%` overall; Oliver and Ibraheem are the main borderline watch cases if that batch is revised again.
24. Repo-visible B. Joseph assets are now organized into `exports/bjoseph_Comments/final`, `exports/bjoseph_Comments/batches`, and `exports/bjoseph_Comments/reference`, while older root-level `exports` clutter and raw extraction intermediates have been relocated into ignored `workspace/reference/` folders.

## Key Files

Core app:

- [App.tsx](d:\2026_Coding\TeacherTwin-Comments-Engine\App.tsx)
- [components/CommentGenerator.tsx](d:\2026_Coding\TeacherTwin-Comments-Engine\components\CommentGenerator.tsx)
- [components/PersonaAnalyzer.tsx](d:\2026_Coding\TeacherTwin-Comments-Engine\components\PersonaAnalyzer.tsx)
- [services/geminiService.ts](d:\2026_Coding\TeacherTwin-Comments-Engine\services\geminiService.ts)
- [types.ts](d:\2026_Coding\TeacherTwin-Comments-Engine\types.ts)
- [utils/errorMessage.ts](d:\2026_Coding\TeacherTwin-Comments-Engine\utils\errorMessage.ts)

New export and script path:

- [utils/docxExport.ts](d:\2026_Coding\TeacherTwin-Comments-Engine\utils\docxExport.ts)
- [scripts/generate-comments-docx.mjs](d:\2026_Coding\TeacherTwin-Comments-Engine\scripts\generate-comments-docx.mjs)
- [scripts/build-offline-profile.mjs](d:\2026_Coding\TeacherTwin-Comments-Engine\scripts\build-offline-profile.mjs)
- [scripts/build-deep-profile.mjs](d:\2026_Coding\TeacherTwin-Comments-Engine\scripts\build-deep-profile.mjs)
- [scripts/verify-comments-batch.mjs](d:\2026_Coding\TeacherTwin-Comments-Engine\scripts\verify-comments-batch.mjs)
- [scripts/prepare-codex-batch.mjs](d:\2026_Coding\TeacherTwin-Comments-Engine\scripts\prepare-codex-batch.mjs)
- [package.json](d:\2026_Coding\TeacherTwin-Comments-Engine\package.json)
- [README.md](d:\2026_Coding\TeacherTwin-Comments-Engine\README.md)
- [docs/OFFLINE_PROFILE_WORKFLOW.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\OFFLINE_PROFILE_WORKFLOW.md)
- [docs/DEEP_PROFILE_WORKFLOW.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\DEEP_PROFILE_WORKFLOW.md)
- [docs/CHAT_LOCAL_WORKFLOW.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\CHAT_LOCAL_WORKFLOW.md)
- [exports/bjoseph_Comments/README.md](d:\2026_Coding\TeacherTwin-Comments-Engine\exports\bjoseph_Comments\README.md)
- `exports/bjoseph_Comments/reference/english/4S_Student_Voice_Reference.json`
- `exports/bjoseph_Comments/reference/english/4W_Student_Voice_Reference.json`
- `exports/bjoseph_Comments/reference/english/BJOSEPH_ENGLISH_PERSONALISATION_PROMPT.md`
- `exports/bjoseph_Comments/reference/english/BJOSEPH_ENGLISH_REFERENCE_NOTES.md`

Gem / documentation path:

- [docs/GEM_WORKFLOW.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\GEM_WORKFLOW.md)
- [docs/templates/GEM_STYLE_EXTRACTOR_PROMPT.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\templates\GEM_STYLE_EXTRACTOR_PROMPT.md)
- [docs/templates/GEM_COMMENT_WRITER_PROMPT.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\templates\GEM_COMMENT_WRITER_PROMPT.md)
- [docs/templates/GEM_INSTRUCTIONS_TEMPLATE.md](d:\2026_Coding\TeacherTwin-Comments-Engine\docs\templates\GEM_INSTRUCTIONS_TEMPLATE.md)

## Current Saved Teacher Profile

Profiles are stored locally and are ignored from git.

Typical local examples:

- `Saved Profiles/<teacher_profile>.json`
- `Saved Profiles/<teacher_profile>_comprehensive.json`
- `Saved Profiles/<teacher_profile>_raw_samples.txt`

Current local deep-profile example prepared for next work:

- `workspace/profiles/b_joseph.json`
- `workspace/profiles/b_joseph_comprehensive.json`
- `workspace/profiles/b_joseph_corpus.json`
- `workspace/profiles/b_joseph_phrase_bank.json`
- `workspace/profiles/b_joseph_review.md`

Current local isiXhosa profile used for the latest Grade 7 batch:

- `Saved Profiles/buli_xhosa.json`
- `Saved Profiles/buli_xhosa_comprehensive.json`

## OCR / Extraction Tooling

These tools are available locally on the user machine:

1. Poppler tools
2. Tesseract OCR

Typical working locations during this session:

- `<user tools>\poppler-25.12.0\Library\bin\pdftotext.exe`
- `<user tools>\poppler-25.12.0\Library\bin\pdftoppm.exe`
- `<local appdata>\Programs\Tesseract-OCR\tesseract.exe`

Important practical note:

- Some PDF marksheets are image-based.
- `pdftotext` may return little or no text.
- For those files, use `pdftoppm` plus `tesseract`.

## Latest Successful Runs

B. Joseph 4S Maths source marksheet:

- `4S Maths- BJoseph_2026_Term 1.pdf`

Visible outputs created:

- `exports/bjoseph_Comments/final/2026-03-08_Mathematics_B._Joseph_Report_Comments_4S_Term1_2026_term1_rewrite.docx`
- `exports/bjoseph_Comments/final/2026-03-08_Mathematics_B._Joseph_Report_Comments_4S_Term1_2026_term1_rewrite.json`
- `exports/bjoseph_Comments/batches/bj_4s_maths_term1_2026/bj_4s_maths_term1_2026_comments.json`
- `exports/bjoseph_Comments/batches/bj_4s_maths_term1_2026/bj_4s_maths_term1_2026_marks_structured.json`
- `exports/bjoseph_Comments/batches/bj_4s_maths_term1_2026/bj_4s_maths_term1_2026_verify_report.json`

B. Joseph 4S English source marksheet:

- `4S English- BJoseph_2026_Term 1.pdf`

Visible outputs created:

- `exports/bjoseph_Comments/final/2026-03-08_English_B._Joseph_Report_Comments_4S_Term1_2026.docx`
- `exports/bjoseph_Comments/final/2026-03-08_English_B._Joseph_Report_Comments_4S_Term1_2026.json`
- `exports/bjoseph_Comments/batches/bj_4s_english_term1_2026/bj_4s_english_term1_2026_comments.json`
- `exports/bjoseph_Comments/batches/bj_4s_english_term1_2026/bj_4s_english_term1_2026_marks_structured.json`
- `exports/bjoseph_Comments/batches/bj_4s_english_term1_2026/bj_4s_english_term1_2026_verify_report.json`

B. Joseph 4W English source marksheet:

- `4W English- BJoseph_2026_Term 1.pdf`

Visible outputs created:

- `exports/bjoseph_Comments/final/2026-03-08_English_B._Joseph_Report_Comments_4W_Term1_2026.docx`
- `exports/bjoseph_Comments/final/2026-03-08_English_B._Joseph_Report_Comments_4W_Term1_2026.json`
- `exports/bjoseph_Comments/batches/bj_4w_english_term1_2026/bj_4w_english_term1_2026_comments.json`
- `exports/bjoseph_Comments/batches/bj_4w_english_term1_2026/bj_4w_english_term1_2026_marks_structured.json`
- `exports/bjoseph_Comments/batches/bj_4w_english_term1_2026/bj_4w_english_term1_2026_verify_report.json`

Beauty Zumani Grade 7 isiXhosa source marksheet:

- `Xhosa Marks_Gr7_Term1_2026.pdf`

Operational outputs created:

- `workspace/reference/xhosa_gr7_term1_2026_pdftotext.txt`
- `workspace/exports/gr7_2026_isiXhosa_term1_marks_structured.json`
- `workspace/exports/gr7_2026_isiXhosa_term1_comments.json`
- `workspace/exports/gr7_2026_isiXhosa_term1_verify_report.json`
- `workspace/exports/2026-03-09_isiXhosa_Beauty_Zumani_Report_Comments_Gr7_Term1_2026.docx`
- `workspace/exports/2026-03-09_isiXhosa_Beauty_Zumani_Report_Comments_Gr7_Term1_2026.json`

Important limitations and notes from these runs:

- This PDF was text-readable via `pdftotext`, so OCR was not needed for this batch.
- The repo still does not have a dedicated marksheet-to-structured parser, so the 4S marks were packaged via a local one-off extraction step into the standard JSON shape.
- The current review threshold for this Maths batch was intentionally raised to `60%`, but the structured `marks` object still uses `Overall` only, so warning language was applied to learners below `60%` overall rather than to every weaker sub-assessment.
- Some learners had an omitted assessment cell in the source table, such as a blank `Review1` or `TimesTable` entry; those blanks were left omitted from `assessmentBreakdown` and were not referenced in the comments.
- A later rewrite pass removed wording that sounded like a follow-up term report rather than a Term 1 report.
- The original visible DOCX under `exports/bjoseph_Comments` was open during the rewrite pass, so the corrected visible DOCX was written with the suffix `_term1_rewrite`.
- Verification for the current B. Joseph Maths batch passes with zero errors and zero warnings.
- Verification for the current 4S English batch passes with zero errors and zero warnings.
- Verification for the current 4W English batch passes with zero errors and zero warnings.
- Verification for the current Grade 7 isiXhosa batch passes with zero errors and zero warnings.
- The 4W student-voice reference file is an array with 23 entries rather than a full 24-learner object map, so one learner had no direct voice-match entry and several matches required careful name normalization.
- The current 4W exported files have not yet been rewritten after the teacher flagged Selethu's warning tone; if further content edits are requested, start there before re-exporting.
- Raw `pdftotext` intermediates for the B. Joseph batches now live in ignored `workspace/reference/bjoseph_raw_extracts`.
- The Grade 7 isiXhosa PDF had a readable text layer, but several learner names were slightly garbled in extraction, so a few obvious first-name spellings were normalized manually in the local output files.

## Gemini / API State

Known issues encountered in this session:

1. Invalid API key at one stage
2. Free-tier quota exhaustion / `429`
3. Local `.env.local` save friction due to permissions in editor

Current practical rule:

- Prefer the local Codex-assisted workflow for the repo owner when avoiding extra model API cost.
- If Gemini quota is available and later needed, the no-UI script with `--persona` still exists.
- If model API use is undesirable or unavailable, prepare/generate comments offline and use `--comments-json` to export `.docx`.

## Commands

Build:

```powershell
npm run build
```

Tool preflight for offline profile ingest:

```powershell
npm run profile:check-tools
```

Prepare Codex operator batch:

```powershell
npm run codex:prepare -- --teacher "Teacher Name" --subject "Subject" --persona "workspace\profiles\<teacher_profile>.json" --marks-json "workspace\exports\<marks_batch>.json" --batch-label "Gr5_Term1_2026"
```

Subject-specific stricter review threshold, for example Maths below `60%`:

```powershell
npm run codex:prepare -- --teacher "Teacher Name" --subject "Mathematics" --persona "workspace\profiles\<teacher_profile>.json" --marks-json "workspace\exports\<marks_batch>.json" --batch-label "Gr5_Term1_2026" --review-threshold 60
```

No-UI generation using Gemini:

```powershell
npm run generate:docx -- --persona "Saved Profiles\<teacher_profile>.json" --teacher "Teacher Name" --subject "Subject" "C:\path\to\marksheet.pdf"
```

Offline teacher-profile ingest:

```powershell
npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" --source-dir "C:\path\to\teacher-samples"
```

Deep review-gated teacher-profile ingest:

```powershell
npm run profile:deep -- --teacher "Teacher Name" --profile "teacher_slug" --outdir "workspace\profiles" "C:\path\to\comments.pdf" "C:\path\to\comments.xls" "C:\path\to\older_persona.json"
```

The deep profile ingest supports both standard `Subject Comments` worksheets and alternating-row exported sheets where the learner row is immediately followed by the comment row.

Local verification gate before export:

```powershell
npm run verify:comments -- --comments-json "workspace\exports\<batch>.json" --report-json "workspace\exports\<batch>_verify_report.json"
```

Local verification gate with stricter review threshold:

```powershell
npm run verify:comments -- --comments-json "workspace\exports\<batch>.json" --marks-json "workspace\exports\<marks_batch>.json" --review-threshold 60 --report-json "workspace\exports\<batch>_verify_report.json"
```

Initialize recommended local workspace layout:

```powershell
npm run workspace:init
```

Offline `.docx` export from prepared comments JSON:

```powershell
npm run generate:docx -- --comments-json "workspace\exports\<prepared_comments>.json" --teacher "Teacher Name" --subject "Subject" --outdir "workspace\exports"
```

## Git / Working Tree State

At the time this file was written, the worktree was dirty with local modifications and new files. Do not assume everything is committed.

Before doing git operations in a new chat:

1. Run `git status --short`
2. Read changed files before editing
3. Do not revert unrelated user changes

Current visible state at handoff:

- Tracked modified files: `.gitignore`, `README.md`, `docs/CHAT_HANDOFF.md`, `docs/CHAT_LOCAL_WORKFLOW.md`, `docs/REPO_ORGANIZATION.md`, `scripts/init-local-workspace.mjs`, `scripts/prepare-codex-batch.mjs`, `scripts/verify-comments-batch.mjs`
- Untracked items: `exports/`
- `workspace/exports` remains the canonical operational output area used during local prep, verify, and export
- `exports/bjoseph_Comments` is now split into `final`, `batches`, and `reference`
- `workspace/reference/legacy_root_exports` preserves the older root-level `exports` clutter locally without leaving it in the repo-facing tree
- `workspace/scratch/repo_cleanup_2026-03-09` contains the moved placeholder `Future-Proofing Plan,txt`

## Current Priorities

1. Review whether the curated `exports/bjoseph_Comments` contents are exactly the set that should remain repo-visible and eventually be committed.
2. Keep the workflow chat-first and local; do not default to Gemini/API use.
3. If comment-content revisions resume, revisit the 4W English warning cases first: Selethu, then Oliver and Ibraheem as borderline review cases.
4. Decide whether any files in `workspace/reference/legacy_root_exports` should be distilled into intentional reusable tracked examples or remain local-only.
5. Preserve local ignored data and existing profile assets unless the user explicitly decides otherwise.
6. Avoid letting new operational batch clutter accumulate again under repo-facing `exports/`.

## Good Next Tasks

1. Review `exports/bjoseph_Comments/final`, `batches`, and `reference` and trim anything still nonessential before commit.
2. Decide whether to add a small publish/copy helper script for promoting selected `workspace/exports` outputs into the curated repo-visible structure.
3. If the 4W English batch is revised, rewrite Selethu first, then review Oliver and Ibraheem as borderline watch cases.
4. Distill only the most useful legacy examples from `workspace/reference/legacy_root_exports` if they materially improve future scripts/docs.
5. Commit and push the reviewed cleanup once the curated visible set is confirmed.

## Start-Here Prompt For A New Chat

Paste this into a new chat:

```text
Read docs/CHAT_HANDOFF.md first, then inspect the referenced files before making changes.
This repo is at d:\2026_Coding\TeacherTwin-Comments-Engine.
Preserve the current working tree.
My next task is: review the cleaned repo layout, confirm what in exports/bjoseph_Comments should stay repo-visible, and if comment-content revisions resume start with the 4W English warning cases (Selethu first).
```

## Maintenance Rule

When substantial work is completed in any future session, update this file before ending the turn.

Minimum updates required:

1. Change the date
2. Update Current Product State if workflow changes
3. Add any new key files
4. Add latest successful outputs if relevant
5. Update known blockers or constraints
