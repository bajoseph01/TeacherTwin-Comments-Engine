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

1. Create Gem A: `TeacherTwin Style Extractor`.
2. Use `docs/templates/GEM_STYLE_EXTRACTOR_PROMPT.md` for Gem A instructions.
3. Create Gem B: `TeacherTwin Comment Writer`.
4. Use `docs/templates/GEM_COMMENT_WRITER_PROMPT.md` for Gem B instructions.
5. Save and share both Gems with approved teachers.
6. Add one owner and one backup owner.

## Teacher run process (Gem path)

1. In Gem A, upload:
- Current term marksheet
- Previous term marksheet (if available)
- Teacher style samples (required for first setup)

2. In Gem A, generate a `STYLE_PROFILE_JSON`.

3. In Gem B, upload:
- Current term marksheet
- Previous term marksheet (if available)
- The `STYLE_PROFILE_JSON` from Gem A

4. In Gem B, generate one comment per learner in the requested format.

5. Review:
- Check names and pronouns
- Check claims match source data
- Edit ambiguous cases manually

6. Export:
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
