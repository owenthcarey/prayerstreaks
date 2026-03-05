### Contributing to Prayer Streaks

This repo uses Conventional Commits for all commits. Keep it simple: we do not use scopes.

## Conventional Commits

Use the form:

```
<type>: <subject>

[optional body]

[optional footer(s)]
```

Subject rules:

- Imperative mood, no trailing period, ≤ 72 characters
- UTF‑8 allowed; avoid emoji in the subject

Accepted types:

- `build` – build system or external dependencies (e.g., package.json, tooling)
- `chore` – maintenance (no app behavior change)
- `ci` – continuous integration configuration (workflows, pipelines)
- `docs` – documentation only
- `feat` – user-facing feature or capability
- `fix` – bug fix
- `perf` – performance improvements
- `refactor` – code change that neither fixes a bug nor adds a feature
- `revert` – revert of a previous commit
- `style` – formatting/whitespace (no code behavior)
- `test` – add/adjust tests only

Examples:

```text
feat: add daily prayer check-in action
fix: prevent duplicate check-ins on the same day
docs: add setup notes for local NativeScript development
style: format settings screen labels and spacing
chore: update app config for over-the-air release channels
```

Breaking changes:

- Use `!` after the type or a `BREAKING CHANGE:` footer.

```text
feat!: migrate streak history schema to include prayer type

BREAKING CHANGE: old local data is incompatible and requires migration.
```

## Branching rules

- `main`: default branch.
- Feature branches: `feature/...` from `main`; hotfixes: `hotfix/...` from `main`.

### Branch naming

- Use lowercase kebab-case; no spaces; keep names concise (aim ≤ 40 chars).
- Suggested prefixes (align with Conventional Commit categories):
  - `feature/<scope>-<short-desc>`
  - `fix/<issue-or-bug>-<short-desc>`
  - `chore/<short-desc>`
  - `docs/<short-desc>`
  - `ci/<short-desc>`
  - `refactor/<scope>-<short-desc>`
  - `test/<short-desc>`
  - `perf/<short-desc>`
  - `build/<short-desc>`
  - `release/vX.Y.Z`
  - `hotfix/<short-desc>`

Examples:

```text
feature/reactivity-computed
fix/vdom-keyed-order-123
docs/contributing-guidelines
ci/add-basic-workflow
build/update-black
refactor/component-state-split
test/component-lifecycle
release/v0.0.2
hotfix/dom-event-delegation
```
