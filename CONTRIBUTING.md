# Contributing to Q-SUDOKU

Thanks for contributing to Q-SUDOKU.

## Project Principles

- Vanilla JavaScript only
- No framework or bundler
- Keep the app deployable as a plain static site
- Preserve the current visual identity unless a change clearly improves usability or maintainability
- Prefer focused improvements over large rewrites

## Local Workflow

Use Docker for local serving and verification.

1. Fork the repository and clone your branch.
2. Start the local server with `docker compose up --build`.
3. Open `http://localhost:8080`.
4. Edit the HTML, CSS, and JavaScript directly. There is no build step.

## Code Layout

The main browser app is split into small ES modules:

- `app.js` is the entry point loaded by `index.html`.
- `js/app/bootstrap.js` initializes the app and wires events.
- `js/app/state.js` owns shared state, timer logic, scoring, and persistence.
- `js/app/board-ui.js` renders the board and manages board-focused UI helpers.
- `js/app/learn-mode.js` manages learn mode overlays and challenge progression.
- `js/app/game-controller.js` coordinates gameplay actions.
- `sudoku.js` contains the puzzle engine.
- `learn.js` contains learn mode challenge data and progression helpers.

## Contribution Guidelines

- Keep runtime dependencies at zero.
- Keep the code readable in a static-hosted environment.
- If you add UI behavior, make sure it still works on mobile viewports.
- If you change the module structure, update the documentation in `README.md` and this file.
- Avoid introducing tooling that would make GitHub Pages hosting more complex.

## Pull Requests

1. Create a focused branch from `main`.
2. Make the smallest change that fully solves the problem.
3. Verify the affected flows using Docker.
4. Open a pull request with a clear summary, testing notes, and any follow-up ideas.

## Issues and Ideas

- Report bugs with clear reproduction steps.
- Propose improvements that fit the project's minimal, static-first philosophy.
- Documentation improvements are welcome and appreciated.
