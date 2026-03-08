# Chat Handoff

Last updated: 2026-03-08
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
5. Risk handling has been tightened so learners below `55%` can receive explicit parent-facing concern language.
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

## Latest Successful Example

Source marksheet:

- `4W Maths- Melony Willemse_2026_Term 1.pdf`

Outputs created:

- `exports/mel_4w_maths_term1_2026_pdftotext.txt`
- `exports/mel_4w_maths_term1_2026_marks_structured.json`
- `exports/mel_4w_maths_term1_2026_comments.json`
- `exports/mel_4w_maths_term1_2026_verify_report.json`
- `exports/mel_4w_maths_term1_2026_v2_codex_packet.json`
- `exports/mel_4w_maths_term1_2026_v2_codex_prompt.md`
- `exports/mel_4w_maths_term1_2026_v2_comments_template.json`
- `exports/mel_4w_maths_term1_2026_v3_codex_packet.json`
- `exports/mel_4w_maths_term1_2026_v3_codex_prompt.md`
- `exports/mel_4w_maths_term1_2026_v3_comments_template.json`
- `exports/mel_4w_maths_term1_2026_v4_codex_packet.json`
- `exports/mel_4w_maths_term1_2026_v4_codex_prompt.md`
- `exports/mel_4w_maths_term1_2026_v4_comments_template.json`
- `exports/2026-03-08_Mathematics_Melony_Willemse_Report_Comments_4W_Term1_2026_rewrite.docx`
- `exports/2026-03-08_Mathematics_Melony_Willemse_Report_Comments_4W_Term1_2026_rewrite.json`
- `exports/2026-03-08_Mathematics_Melony_Willemse_Report_Comments_4W_Term1_2026_address_fix.docx`
- `exports/2026-03-08_Mathematics_Melony_Willemse_Report_Comments_4W_Term1_2026_address_fix.json`
- `exports/2026-03-08_Mathematics_Melony_Willemse_Report_Comments_4W_Term1_2026_structure_diversity.docx`
- `exports/2026-03-08_Mathematics_Melony_Willemse_Report_Comments_4W_Term1_2026_structure_diversity.json`

Important limitation of that run:

- This PDF was text-readable via `pdftotext`, so OCR was not needed for this batch.
- Some learners had blank TimesTables columns on the marksheet; those blank cells were left omitted from the structured marks and were not referenced in the generated comments.
- The first Mel Maths draft was too repetitive, so the batch was rewritten with opener-family variation, evidence-first phrasing, and explicit Grade 4 rounding framing for weaker `Review 2` performance.
- A follow-up pass corrected clunky addressee switches in closings such as direct learner address followed by third-person reflection; the future prompt context now carries a closing address-consistency rule.
- A later pass reduced obvious batch rhythm by varying sentence count, moving development sentences around the paragraph, and using mixed closing types instead of ending almost every row with encouragement plus reflection.
- Verification for the current Mel maths batch passes with zero errors and zero warnings even after the style-diversity checks were added.

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
npm run verify:comments -- --comments-json "exports\<batch>.json" --report-json "exports\<batch>_verify_report.json"
```

Initialize recommended local workspace layout:

```powershell
npm run workspace:init
```

Offline `.docx` export from prepared comments JSON:

```powershell
npm run generate:docx -- --comments-json "exports\<prepared_comments>.json" --teacher "Teacher Name" --subject "Subject" --outdir "exports"
```

## Git / Working Tree State

At the time this file was written, the worktree was dirty with local modifications and new files. Do not assume everything is committed.

Before doing git operations in a new chat:

1. Run `git status --short`
2. Read changed files before editing
3. Do not revert unrelated user changes

## Current Priorities

1. Pivot to B. Joseph report comments next using the local deep-profile pack in `workspace/profiles`.
2. Keep the workflow chat-first and local; do not default to Gemini/API use.
3. Reuse the existing JSON -> verify -> DOCX path for B. Joseph once the marksheet is supplied.
4. Carry forward the new structure-diversity rules so B. Joseph comments do not fall into obvious batch patterning.
5. Continue verifying comments against structured marks before export.
6. Preserve local ignored data and existing profile assets.

## Good Next Tasks

1. Add a dedicated OCR-to-structured-table parser for report sheets
2. Add a review screen for comments flagged below `55%`
3. Support subject-specific templates per teacher
4. Add a save/load workflow for teacher profiles directly in the app
5. Add a dedicated UI-assisted review path for offline-generated teacher profiles
6. Commit and push the current working state once reviewed

## Start-Here Prompt For A New Chat

Paste this into a new chat:

```text
Read docs/CHAT_HANDOFF.md first, then inspect the referenced files before making changes.
This repo is at d:\2026_Coding\TeacherTwin-Comments-Engine.
Preserve the current working tree.
My next task is: prepare B. Joseph comments using the full local deep-profile pack in workspace/profiles, staying chat-first and local, and reuse the existing JSON -> verify -> DOCX workflow once I provide the marksheet.
```

## Maintenance Rule

When substantial work is completed in any future session, update this file before ending the turn.

Minimum updates required:

1. Change the date
2. Update Current Product State if workflow changes
3. Add any new key files
4. Add latest successful outputs if relevant
5. Update known blockers or constraints
