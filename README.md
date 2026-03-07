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
3. [Gem A Prompt: Style Extractor](./docs/templates/GEM_STYLE_EXTRACTOR_PROMPT.md)
4. [Gem B Prompt: Comment Writer](./docs/templates/GEM_COMMENT_WRITER_PROMPT.md)
5. [Gem Instructions Template (Generic)](./docs/templates/GEM_INSTRUCTIONS_TEMPLATE.md)
6. [Release Checklist](./docs/templates/RELEASE_CHECKLIST.md)

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

Output files are created in `exports/`:

1. Modern Word `.docx`
2. Matching `.json` with generated comments

## Deployment

Push to `main` to trigger GitHub Actions deployment to GitHub Pages.
