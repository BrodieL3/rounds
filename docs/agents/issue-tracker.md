# Issue tracker: local markdown

Issues and PRDs live as markdown files in `docs/issues/`.

## File format

Each issue is one markdown file: `docs/issues/NNNN-short-slug.md`

```markdown
---
number: 1
title: "Issue title"
labels:
  - bug
  - needs-triage
state: open
created_at: 2026-06-03
---
Issue body (description / PRD / agent brief).

## Comment — 2026-06-03T14:22:00Z
Comment text here.
```

- `number`: auto-incrementing integer. Find the next number by scanning existing files.
- `title`: issue title.
- `labels`: list of label strings. See `triage-labels.md` for canonical labels.
- `state`: `open` or `closed`.
- `created_at`: ISO date string.
- Body: everything before the first `## Comment` is the issue body.
- Comments: appended as `## Comment — <ISO timestamp>` sections.

## Conventions

- **Create an issue**: write a new file to `docs/issues/` with the next available number.
- **Read an issue**: read the markdown file directly.
- **List issues**: read all files in `docs/issues/`, parse YAML frontmatter.
- **Comment on an issue**: append a `## Comment — <timestamp>` section to the file.
- **Apply / remove labels**: edit the `labels` frontmatter list.
- **Close**: set `state: closed` in frontmatter. Optionally append a closing comment.

## When a skill says "publish to the issue tracker"

Create a new markdown file in `docs/issues/`.

## When a skill says "fetch the relevant ticket"

Read the corresponding `docs/issues/NNNN-*.md` file.
