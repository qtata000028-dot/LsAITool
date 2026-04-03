# GitHub Copilot / AI Instructions

This repository has hard rules for AI-assisted development.

## Read First

Before making any non-trivial change, read these files in order:

1. `AGENTS.md`
2. `docs/ai-development-rules.md`
3. `docs/dashboard-architecture-rules.md` for any `Dashboard` or `src/features/dashboard/**` change
4. `docs/frontend-platform-architecture.md` for app shell, route, login, or platform-boundary changes
5. `CONTRIBUTING.md`

## Mandatory Rules

- Keep `src/components/Dashboard.tsx` as a page-level coordinator only.
- Do not move new business logic back into `Dashboard.tsx`.
- Prefer extending an existing feature boundary over creating ad hoc code in page components.
- Reuse the shared `detail-layout-designer` stack for detail layout editing; do not build a second editor.
- If a change affects architecture, collaboration rules, CI, or AI workflows, update the docs and the guard script in the same change.

## Required Validation

- Standard frontend changes: `npm run verify`
- Architecture, docs, scripts, CI, or governance changes: `npm run verify:strict`

## Guardrails

The repository enforces architecture rules with:

- `npm run guard:architecture`

Do not bypass failing guards by weakening lint or type rules unless the repository contract is intentionally being updated.
