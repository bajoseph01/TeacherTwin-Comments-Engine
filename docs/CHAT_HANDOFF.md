# Chat Handoff

Last updated: 2026-03-07
Repo root: `d:\2026_Coding\TeacherTwin-Comments-Engine`
Primary user: repo owner
Primary teacher profile currently in use: local teacher profile (gitignored)

## Purpose

Use this file to restart work in a new chat without losing project context.

If you are a new assistant session, read this file first, then inspect the referenced files before making changes.

## Current Product State

This repo now supports two practical workflows:

1. Web app workflow
2. No-UI terminal workflow for generating report comments and exporting a modern `.docx`

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
- [package.json](d:\2026_Coding\TeacherTwin-Comments-Engine\package.json)
- [README.md](d:\2026_Coding\TeacherTwin-Comments-Engine\README.md)

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

- `<local path>\Subject_Term_Marksheet.pdf`

Outputs created:

- `exports/<marksheet>_ocr.txt`
- `exports/<subject>_offline_comments.json`
- `exports/<date>_<subject>_<teacher>_Report_Comments.docx`
- `exports/<date>_<subject>_<teacher>_Report_Comments.json`

Important limitation of that run:

- Comments were generated offline from OCR plus persona style, not from Gemini API, because quota reliability was a constraint.

## Gemini / API State

Known issues encountered in this session:

1. Invalid API key at one stage
2. Free-tier quota exhaustion / `429`
3. Local `.env.local` save friction due to permissions in editor

Current practical rule:

- If Gemini quota is available, use the no-UI script with `--persona` and marksheet files.
- If Gemini quota is not available, generate or curate comments offline and use `--comments-json` to export `.docx`.

## Commands

Build:

```powershell
npm run build
```

No-UI generation using Gemini:

```powershell
npm run generate:docx -- --persona "Saved Profiles\<teacher_profile>.json" --teacher "Teacher Name" --subject "Subject" "C:\path\to\marksheet.pdf"
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

1. Improve confidence and accuracy of marksheet parsing
2. Reduce dependency on Gemini quota during urgent reporting periods
3. Keep teacher persona output consistent and school-appropriate
4. Make the workflow simpler for non-technical teachers

## Good Next Tasks

1. Add a dedicated OCR-to-structured-table parser for report sheets
2. Add a review screen for comments flagged below `55%`
3. Support subject-specific templates per teacher
4. Add a save/load workflow for teacher profiles directly in the app
5. Commit and push the current working state once reviewed

## Start-Here Prompt For A New Chat

Paste this into a new chat:

```text
Read docs/CHAT_HANDOFF.md first, then inspect the referenced files before making changes.
This repo is at d:\2026_Coding\TeacherTwin-Comments-Engine.
Preserve the current working tree.
My next task is: <replace this sentence with the exact task>.
```

## Maintenance Rule

When substantial work is completed in any future session, update this file before ending the turn.

Minimum updates required:

1. Change the date
2. Update Current Product State if workflow changes
3. Add any new key files
4. Add latest successful outputs if relevant
5. Update known blockers or constraints
