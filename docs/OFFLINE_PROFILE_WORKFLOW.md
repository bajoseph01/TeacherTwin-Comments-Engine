# Offline Teacher Profile Workflow

## Goal

Build a new teacher profile from local files without using Gemini, then review that draft profile before using it in the app or terminal export flow.

If you need a higher-fidelity, review-gated voice pack from real prose comment sheets, use [DEEP_PROFILE_WORKFLOW.md](./DEEP_PROFILE_WORKFLOW.md) instead of this lightweight path.

## What the offline script produces

Run `npm run profile:offline` to create three local files in `Saved Profiles/`:

1. `<profile>.json`
2. `<profile>_comprehensive.json`
3. `<profile>_raw_samples.txt`

The main `<profile>.json` file matches the existing app persona shape and can be:

1. Imported directly into the web app
2. Used with the terminal workflow as the `--persona` file

## Supported source files

1. `.txt`
2. `.md`
3. `.csv`
4. `.json`
5. `.pdf`
6. `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff`

Notes:

1. Text-based files are read directly.
2. PDFs first try `pdftotext`.
3. If PDF text extraction fails, the script tries OCR using `pdftoppm` plus `tesseract`.
4. Images are OCR'd with `tesseract`.

## Commands

Ingest a whole folder:

```powershell
npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" --source-dir "C:\path\to\teacher-samples"
```

Ingest explicit files:

```powershell
npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" "C:\path\to\sample1.txt" "C:\path\to\sample2.pdf"
```

Write output somewhere other than `Saved Profiles/`:

```powershell
npm run profile:offline -- --teacher "Teacher Name" --profile "teacher_name" --outdir "C:\path\to\output" --source-dir "C:\path\to\teacher-samples"
```

Preflight tool discovery:

```powershell
npm run profile:check-tools
```

Optional fixed tool paths in `.env.local`:

```text
PDFTOTEXT_PATH=C:\Users\bjoseph\tools\poppler-25.12.0\Library\bin\pdftotext.exe
PDFTOPPM_PATH=C:\Users\bjoseph\tools\poppler-25.12.0\Library\bin\pdftoppm.exe
TESSERACT_PATH=C:\Users\bjoseph\AppData\Local\Programs\Tesseract-OCR\tesseract.exe
```

## Review workflow

1. Open `<profile>_comprehensive.json` first.
2. Check which files were imported cleanly and which produced warnings.
3. Review the draft `tone`, `vocabulary`, `structure`, and `formatting`.
4. Edit `<profile>.json` if the heuristics need tightening before actual use.
5. Import the final `<profile>.json` into the app or use it in terminal workflows.

## Practical recommendation for a new teacher profile

For best results, stage these kinds of files together:

1. Past report comments
2. Exemplars from different performance bands
3. Subject-specific remarks if the teacher changes tone by subject
4. OCR text exported from scanned legacy reports if originals are image-based

## Current limitation

This is an offline draft builder, not a full style-analysis model replacement. It prepares a usable profile quickly, but the generated fields are heuristic and should be reviewed before production use.
