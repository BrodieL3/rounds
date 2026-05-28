# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `brodiel3/rounds`. Use the `gh` CLI for all operations.

## Repository

Because this repo may not have a git remote configured, pass `-R brodiel3/rounds` to `gh` commands.

## Conventions

- **Create an issue**: `gh issue create -R brodiel3/rounds --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> -R brodiel3/rounds --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list -R brodiel3/rounds --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> -R brodiel3/rounds --body "..."`
- **Apply / remove labels**: `gh issue edit <number> -R brodiel3/rounds --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> -R brodiel3/rounds --comment "..."`

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `brodiel3/rounds`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> -R brodiel3/rounds --comments`.
