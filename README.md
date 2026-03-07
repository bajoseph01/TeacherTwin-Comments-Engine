<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TeacherTwin Comments Engine

This repo contains two parallel delivery paths for teachers:

1. Web app (GitHub Pages deployment from this repo)
2. Gemini Gem workflow (for teachers using Gemini Pro Edu accounts)

## Workflow docs

1. [Parallel Gem Workflow](./docs/GEM_WORKFLOW.md)
2. [Development Cycle and Branching](./docs/DEV_CYCLE.md)
3. [Chat-First Local Workflow](./docs/CHAT_LOCAL_WORKFLOW.md)
4. [Offline Teacher Profile Workflow](./docs/OFFLINE_PROFILE_WORKFLOW.md)
5. [Repo Organization](./docs/REPO_ORGANIZATION.md)
6. [Gem A Prompt: Style Extractor](./docs/templates/GEM_STYLE_EXTRACTOR_PROMPT.md)
7. [Gem B Prompt: Comment Writer](./docs/templates/GEM_COMMENT_WRITER_PROMPT.md)
8. [Gem Instructions Template (Generic)](./docs/templates/GEM_INSTRUCTIONS_TEMPLATE.md)
9. [Release Checklist](./docs/templates/RELEASE_CHECKLIST.md)

## Recommended Local Workspace

Use an ignored local workspace root for teacher data and generated outputs instead of leaving everything at repo root.

Initialize it with:

`npm run workspace:init`

Recommended `.env.local` addition:

`TEACHERTWIN_LOCAL_ROOT=workspace`

This keeps future local files under:

1. `workspace/incoming`
2. `workspace/profiles`
3. `workspace/exports`
4. `workspace/scratch`

Existing `Saved Profiles/` and `exports/` paths still work.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Generate Comments + DOCX Without Opening the App

Use the terminal pipeline:

`npm run generate:docx -- --persona "Saved Profiles/<profile>.json" --teacher "Teacher Name" --subject "Subject" "<marksheet-file-1>" "<marksheet-file-2>"`

Add `--batch-label` when you want grade- or term-specific filenames:

`npm run generate:docx -- --comments-json "workspace\exports\offline-comments.json" --teacher "Teacher Name" --subject "Subject" --batch-label "Gr5_Term1_2026"`

Output files are created in `exports/`:

1. Modern Word `.docx`
2. Matching `.json` with generated comments

## Build A Teacher Profile Offline

Use the offline ingest script when you want to prepare a new teacher profile from local files without Gemini:

`npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" --source-dir "C:\path\to\teacher-samples"`

This creates:

1. `Saved Profiles/<profile>.json`
2. `Saved Profiles/<profile>_comprehensive.json`
3. `Saved Profiles/<profile>_raw_samples.txt`

Review the generated profile JSON before using it in the app or the terminal comment-generation flow.

To avoid local tool path issues, set these in `.env.local` and run a preflight check:

`npm run profile:check-tools`

## Verify A Comment Batch Locally

Use the verification gate before final export:

`npm run verify:comments -- --comments-json "exports\<batch>.json" --report-json "exports\<batch>_verify_report.json"`

Add `--marks-json` when you have structured marks for stronger risk-threshold cross-checking.

## Deployment

Push to `main` to trigger GitHub Actions deployment to GitHub Pages.
