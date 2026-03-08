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
3. Prepare a Codex batch package from persona + structured marks.
4. Generate comments in chat (Codex writes `exports/<batch>.json`).
5. Run verification script.
6. Export `.docx` from verified JSON.

## Commands

Prepare Codex chat batch:

```powershell
npm run codex:prepare -- --teacher "Teacher Name" --subject "Subject" --persona "workspace\profiles\teacher_name.json" --marks-json "workspace\exports\subject_term_marks_structured.json" --batch-label "Gr5_Term1_2026"
```

Outputs:

1. `*_codex_packet.json`
2. `*_codex_prompt.md`
3. `*_comments_template.json`

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
5. No obvious batch-level rhythm where most comments use the same sentence count, development position, and closing pattern.
6. Manual pass on pronouns, closings, and high-risk learners before final DOCX.

## Scope note

`verify:comments` is a consistency, risk-threshold, and style-diversity checker. It does not replace teacher professional review; it enforces baseline quality gates before export.

## Product split

This workflow is the primary operator mode for the repo owner:

1. Codex chat handles reasoning and comment drafting.
2. Local scripts handle packaging, verification, and export.
3. The deployable app path remains a later product track for colleagues.
