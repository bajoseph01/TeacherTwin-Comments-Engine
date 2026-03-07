# Deep Profile Workflow

## Goal

Build a high-fidelity report-comment persona from real teacher prose rather than the lightweight heuristic ingest.

This workflow is intended for teachers whose voice is distinctive enough to justify deeper extraction and review.

## When to use it

Use `profile:deep` when you need:

1. a stronger vocabulary and sayings bank
2. evidence-backed recurring openings and closings
3. explicit guardrails against persona contamination
4. a review artifact before marking the persona ready

## Inputs

The deep profile script is designed for:

1. PDF comment sheets
2. `.xls` / `.xlsx` workbooks, including legacy report-comment sheets
3. alternating-row exported workbook sheets where a learner row is followed by a prose comment row
4. existing persona JSONs as weak-reference hints only

Important rules:

1. real prose comments are the source of truth
2. marks-only workbooks are recorded as context-only
3. low-quality or generic persona JSONs do not override real writing samples

## Command

```powershell
npm run profile:deep -- --teacher "Teacher Name" --profile "teacher_slug" --outdir "workspace\profiles" "C:\path\to\comments.pdf" "C:\path\to\comments.xls" "C:\path\to\older_persona.json"
```

## Outputs

The script writes:

1. `<profile>.json`
2. `<profile>_comprehensive.json`
3. `<profile>_phrase_bank.json`
4. `<profile>_corpus.json`
5. `<profile>_review.md`

The minimal persona remains review-gated with `isReady: false` until the human review step is accepted.

## Recommended review sequence

1. inspect `_review.md`
2. inspect contamination warnings and suspect outliers
3. confirm the recurring sayings actually sound like the teacher
4. only then promote the persona to ready for production use
