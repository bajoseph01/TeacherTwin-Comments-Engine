<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TeacherTwin Comments Engine

This repo now supports two strategic tracks:

1. Local operator workflow for the repo owner using Codex in VS Code plus local scripts
2. Future deployable app workflow for colleagues, still supported in the repo but no longer the primary day-to-day path

## Workflow docs

1. [Parallel Gem Workflow](./docs/GEM_WORKFLOW.md)
2. [Development Cycle and Branching](./docs/DEV_CYCLE.md)
3. [Chat-First Local Workflow](./docs/CHAT_LOCAL_WORKFLOW.md)
4. [Offline Teacher Profile Workflow](./docs/OFFLINE_PROFILE_WORKFLOW.md)
5. [Deep Profile Workflow](./docs/DEEP_PROFILE_WORKFLOW.md)
6. [Repo Organization](./docs/REPO_ORGANIZATION.md)
7. [Gem A Prompt: Style Extractor](./docs/templates/GEM_STYLE_EXTRACTOR_PROMPT.md)
8. [Gem B Prompt: Comment Writer](./docs/templates/GEM_COMMENT_WRITER_PROMPT.md)
9. [Gem Instructions Template (Generic)](./docs/templates/GEM_INSTRUCTIONS_TEMPLATE.md)
10. [Release Checklist](./docs/templates/RELEASE_CHECKLIST.md)

## Primary Working Mode

The primary working mode is now:

1. prepare marks and profile locally
2. generate comments with Codex in VS Code chat
3. verify locally
4. export locally to `.docx`

This path is designed to avoid extra model API spend during reporting periods.

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
4. `workspace/reference`
5. `workspace/scratch`

Use `workspace/exports` for operational batch files and `workspace/reference` for raw extracts, context files, and local legacy examples.

Keep repo-visible handoff snapshots separate under `exports/<teacher>_Comments/`, for example:

1. `exports/bjoseph_Comments/final`
2. `exports/bjoseph_Comments/batches`
3. `exports/bjoseph_Comments/reference`

Existing `Saved Profiles/` and direct `exports/` paths still work for backwards compatibility.

## Run Locally

**Prerequisites:** Node.js

For the local Codex-assisted workflow, no Gemini API key is required.

1. Install dependencies:
   `npm install`
2. If you want to use the web app or Gemini-backed script path, set `GEMINI_API_KEY` in [.env.local](.env.local)
3. Run the app if needed:
   `npm run dev`

## Generate Comments + DOCX Without Opening the App

Use the terminal pipeline:

`npm run generate:docx -- --persona "Saved Profiles/<profile>.json" --teacher "Teacher Name" --subject "Subject" "<marksheet-file-1>" "<marksheet-file-2>"`

Add `--batch-label` when you want grade- or term-specific filenames:

`npm run generate:docx -- --comments-json "workspace\exports\offline-comments.json" --teacher "Teacher Name" --subject "Subject" --batch-label "Gr5_Term1_2026"`

Output files are created in `workspace/exports` when `TEACHERTWIN_LOCAL_ROOT=workspace`; otherwise they fall back to `exports/`.

1. Modern Word `.docx`
2. Matching `.json` with generated comments

Promote only the final or reusable files you intentionally want visible in the repo into `exports/<teacher>_Comments/`.

## Prepare A Codex Chat Batch

Use this when you want the repo to package the marks and teacher profile for a human-in-the-loop Codex session:

`npm run codex:prepare -- --teacher "Teacher Name" --subject "Subject" --persona "workspace\profiles\<profile>.json" --marks-json "workspace\exports\<marks>.json" --batch-label "Gr5_Term1_2026"`

Add `--review-threshold 60` when a subject batch should flag learners below `60%` for stronger warning language and review.

This creates:

1. `*_codex_packet.json`
2. `*_codex_prompt.md`
3. `*_comments_template.json`

The intended flow is:

1. prepare batch
2. generate comments in Codex chat
3. save comment JSON
4. verify
5. export DOCX

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

## Build A Deep Review-Gated Profile

Use the deep profile script when you want a higher-fidelity persona pack from real prose comments:

`npm run profile:deep -- --teacher "Teacher Name" --profile "teacher_slug" --outdir "workspace\profiles" "C:\path\to\comments.pdf" "C:\path\to\comments.xls" "C:\path\to\older_persona.json"`

It supports standard `Subject Comments` sheets as well as exported alternating-row workbooks where a learner row is followed by a prose comment row.

This produces:

1. app-compatible minimal persona JSON
2. comprehensive analysis JSON
3. phrase bank JSON
4. normalized corpus JSON
5. review markdown

The minimal profile stays review-gated with `isReady: false` until the human review step is accepted.

## Verify A Comment Batch Locally

Use the verification gate before final export:

`npm run verify:comments -- --comments-json "workspace\exports\<batch>.json" --report-json "workspace\exports\<batch>_verify_report.json"`

Add `--marks-json` when you have structured marks for stronger risk-threshold cross-checking.

Add `--review-threshold 60` when a batch should treat learners below `60%` as warning cases instead of using the default `55%` review threshold.

## Deployment

Push to `main` to trigger GitHub Actions deployment to GitHub Pages.
