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
3. [Gem Instructions Template](./docs/templates/GEM_INSTRUCTIONS_TEMPLATE.md)
4. [Release Checklist](./docs/templates/RELEASE_CHECKLIST.md)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment

Push to `main` to trigger GitHub Actions deployment to GitHub Pages.
