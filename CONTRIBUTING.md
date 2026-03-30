# Contributing to Q-SUDOKU

Thanks for taking the time to contribute.

## Ways to help

- **Bug reports** — open an issue using the bug report template
- **Feature ideas** — open an issue using the feature request template
- **Code** — fix a bug or implement a feature (see below)
- **Docs** — improve the README or add comments

## Getting started

1. Fork the repo and clone it
2. Run locally: `docker compose up --build`
3. Open `http://localhost:8080`
4. Make your changes — no build step, just edit HTML/CSS/JS

## Good first issues

Look for issues tagged [`good first issue`](https://github.com/hubertlim/Q-SUDOKU/issues?q=label%3A%22good+first+issue%22). These are small, well-scoped tasks that don't require deep knowledge of the codebase.

## Code guidelines

- No frameworks, no bundlers — vanilla JS only
- Keep it minimal: only add what's needed
- Test in both desktop and mobile viewports
- Match the existing code style (monospace font, CSS variables, IIFE pattern)

## Submitting a PR

1. Create a branch: `git checkout -b fix/your-fix-name`
2. Make your changes
3. Open a PR against `main` with a clear title and description
4. Reference any related issue: `Fixes #123`

## Project structure

```
index.html   — markup
style.css    — all styles (CSS variables for theming)
sudoku.js    — puzzle engine (solver, generator, validator)
learn.js     — challenge system data
app.js       — game logic and UI
```
