# Release Checklist

Use this checklist before pushing changes to `main`.

## Pre-merge

1. Branch is up to date with `main`.
2. Scope is clear and documented.
3. `npm run build` passes locally.
4. Any workflow change is documented in `docs/`.

## Security

1. No secrets committed to repo.
2. API key restrictions still in place.
3. Model choice matches free-tier strategy.

## Functional test

1. Persona analysis works.
2. Bulk generation works on a small sample.
3. Manual edit/copy/export flow works.

## Deploy verification

1. Push completed to `main`.
2. GitHub Actions deploy is green.
3. Live Pages URL loads and runs one full test.

## Teacher communication

1. Send short release note to staff.
2. Include known limitations and fallback plan.
