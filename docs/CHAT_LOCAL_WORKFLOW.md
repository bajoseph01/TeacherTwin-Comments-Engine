# Chat-First Local Workflow (No API Keys)

## Goal

Generate report comments in this Codex chat, verify them locally, and export `.docx` without using Gemini API calls from the codebase.

## Why this path

1. You already have Codex chat access.
2. It avoids API quota issues during reporting deadlines.
3. It keeps all generation and export local to this workspace.

## Standard run order per teacher/subject

1. Build or load teacher profile from local source files.
2. Ingest marksheet source into local text/structured data.
3. Generate comments in chat (Codex writes `exports/<batch>.json`).
4. Run verification script.
5. Export `.docx` from verified JSON.

## Commands

Build offline profile:

```powershell
npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" --source-dir "C:\path\to\teacher-samples"
```

Verify comment batch:

```powershell
npm run verify:comments -- --comments-json "exports\subject_term_comments.json" --report-json "exports\subject_term_verify_report.json"
```

Verify with marks cross-check:

```powershell
npm run verify:comments -- --comments-json "exports\subject_term_comments.json" --marks-json "exports\subject_term_marks_structured.json" --report-json "exports\subject_term_verify_report.json"
```

Export `.docx` (no model call):

```powershell
npm run generate:docx -- --comments-json "exports\subject_term_comments.json" --teacher "Teacher Name" --subject "Subject" --outdir "exports"
```

## Verification policy before export

1. Zero verification errors.
2. All learner names accounted for.
3. Flagged risk learners include explicit parent-facing support language.
4. No comments referencing evidence absent from marks/source files.
5. Manual pass on pronouns and high-risk learners before final DOCX.

## Scope note

`verify:comments` is a consistency and risk-threshold checker. It does not replace teacher professional review; it enforces baseline quality gates before export.
