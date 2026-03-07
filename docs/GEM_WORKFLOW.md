# Parallel Gem Workflow

## Goal
Run a no-code Gemini Gem workflow in parallel with the web app so teachers can continue working even if one path is down.

## When to use each path

1. Use the web app when you need:
- Bulk queue editing in one screen
- Copy-all and Word export flow
- Shared operational process for your school team

2. Use the Gem when you need:
- Fast no-code access inside Gemini Pro Edu
- Easy teacher onboarding with chat prompts
- A backup workflow if the web app has issues

## Gemini Gem setup

1. Create a new Gem in Gemini app.
2. Name it `TeacherTwin Report Comments`.
3. Use the template from `docs/templates/GEM_INSTRUCTIONS_TEMPLATE.md`.
4. Save and share it with approved teachers.
5. Add one owner and one backup owner.

## Teacher run process (Gem path)

1. Upload:
- Current term marksheet
- Previous term marksheet (if available)
- Optional teacher style samples

2. Prompt the Gem:
- Ask for one comment per learner
- Enforce UK/South African English
- Ask for plain text output per learner

3. Review:
- Check names and pronouns
- Check claims match source data
- Edit ambiguous cases manually

4. Export:
- Copy responses into school reporting format
- Keep a dated archive in school drive

## Quality controls

1. Never publish without teacher review.
2. If source data is unclear, require neutral language.
3. Avoid adding facts not visible in uploaded records.
4. Use a random spot-check of at least 10 learners per class.

## Governance

1. Keep student data access limited to authorized staff.
2. Rotate shared prompts each term.
3. Review model behavior at start of every reporting cycle.
4. Record any failure cases and update prompts.

## Fallback rule

If Gem output quality drops, switch class generation back to the web app path for that cycle.
