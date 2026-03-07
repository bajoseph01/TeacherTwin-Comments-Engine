# Development Cycle and Branching

## Objective
Keep a clean, repeatable workflow so non-programmer and programmer collaborators can maintain the tool across terms.

## Branch strategy

1. `main`
- Production branch
- Auto-deploys to GitHub Pages
- Only tested changes should land here

2. `feat/<topic>`
- Feature development branches
- Example: `feat/export-improvements`

3. `docs/<topic>`
- Documentation-only branches
- Example: `docs/gem-parallel-workflow`

## Standard cycle

1. Create branch from latest `main`.
2. Make focused changes for one objective.
3. Run local checks:
- `npm run build`
4. Commit with clear message.
5. Push branch and open pull request into `main`.
6. Merge only after review and validation.
7. Confirm GitHub Actions deploy success.

## Release cadence

1. Minor updates: as needed during term.
2. Pre-reporting hardening: 2 days before comment deadlines.
3. Post-cycle retrospective: within 1 week after reports close.

## Emergency rollback

1. In GitHub, identify last known-good commit on `main`.
2. Revert the bad commit using a new commit.
3. Push to `main` and allow auto-redeploy.
4. Log the issue and fix plan in docs.

## Teacher-facing change communication

For each release, publish:

1. What changed
2. Why it changed
3. What teachers must do differently
4. Known limitations for this release

## Definition of done

1. Build passes.
2. Live site works after deploy.
3. One real class sample tested.
4. Docs updated if workflow changed.
