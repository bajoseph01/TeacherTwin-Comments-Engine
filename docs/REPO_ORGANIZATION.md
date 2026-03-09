# Repo Organization

## Goal

Keep committed app code and docs in the repo, and keep teacher data plus generated outputs in one ignored local workspace.

## Recommended Approach

Do not do a broad source-tree refactor while reporting is active.

Instead:

1. Keep the committed code structure stable.
2. Route local operational files into a single ignored workspace root.
3. Use batch-labelled exports so Grade 5, Grade 6, and later batches do not overwrite each other.

## Recommended Local Layout

```text
workspace/
  incoming/
    Buli_Xhosa/
    Melony_Afrikaans/
  profiles/
    buli_xhosa.json
    buli_xhosa_comprehensive.json
  reference/
    legacy_exports/
    raw_extracts/
  exports/
    2026-03-07_isiXhosa_Beauty_Zumani_Report_Comments_Gr5.docx
    2026-03-07_isiXhosa_Beauty_Zumani_Report_Comments_Gr6.docx
  scratch/
```

`workspace/` is ignored by git.

Use `workspace/exports` for active batch files and `workspace/reference` for raw extracts, reusable local context, and archived local examples.

## Curated Repo-Visible Surface

Only keep intentionally curated handoff assets in repo-visible `exports/` folders.

Example:

```text
exports/
  bjoseph_Comments/
    final/
    batches/
      bj_4s_english_term1_2026/
      bj_4w_english_term1_2026/
      bj_4s_maths_term1_2026/
    reference/
      english/
```

Existing `Saved Profiles/` and direct `exports/` paths are still supported for backwards compatibility, but the preferred local operating flow is `workspace/` first and curated `exports/` only when needed.

## Recommended `.env.local`

```text
TEACHERTWIN_LOCAL_ROOT=workspace
```

Optional overrides:

```text
TEACHERTWIN_PROFILE_DIR=workspace/profiles
TEACHERTWIN_EXPORT_DIR=workspace/exports
```

## Commands

Initialize the workspace:

```powershell
npm run workspace:init
```

Generate a grade-specific export without filename collision:

```powershell
npm run generate:docx -- --comments-json "workspace\exports\gr6_2026_isiXhosa_term1_comments.json" --teacher "Beauty Zumani" --subject "isiXhosa" --batch-label "Gr6_Term1_2026"
```

Build a profile into the managed workspace:

```powershell
npm run profile:offline -- --teacher "Beauty Zumani" --profile "buli_xhosa" --outdir "workspace\profiles" --source-dir "workspace\incoming\Buli_Xhosa"
```

## Pre-Commit Rule

Before commit and push:

1. Run `git status --short`.
2. Confirm no local learner data has become tracked.
3. Keep generated `.docx`, extracted text, and teacher profiles inside ignored workspace paths unless you are intentionally promoting a curated handoff snapshot.
4. If something must stay repo-visible, place it under a clearly named curated subfolder such as `exports/<teacher>_Comments/final`, `batches`, or `reference`.
