# Q-SUDOKU

Q-SUDOKU is a zero-dependency Sudoku game built with vanilla JavaScript, plain HTML, and CSS. It is designed to stay fast, static-host friendly, and easy to understand while still offering polished gameplay features such as learn mode, scoring, hints, pause and resume, theme persistence, and session restore.

Live app: https://hubertlim.github.io/Q-SUDOKU/

## Overview

The project focuses on a clean Sudoku experience without frameworks, build tooling, or runtime dependencies. Everything runs directly in the browser and can be hosted as a plain static site, which keeps deployment simple and long-term maintenance approachable.

## Features

- Three standard difficulties with unique puzzle generation
- Learn mode with 12 progressive challenges from 4x4 boards to harder 9x9 puzzles
- Real-time scoring based on time, checks, and hints used
- Hint system that targets constrained cells instead of random reveals
- Pause and resume support
- Theme selection with persistent preference storage
- Session save and restore through `localStorage`
- Responsive layout for desktop and mobile
- Docker workflow for local serving without changing the zero-dependency runtime model

## How It Works

### Puzzle engine

`sudoku.js` contains the core engine. It uses bitmask-based row, column, and box constraints so candidate checks are constant time. The solver combines those bitmasks with an MRV (Minimum Remaining Values) heuristic, always exploring the most constrained empty cell first to keep the search tree small.

### Puzzle generation

Puzzle generation first creates a complete valid grid with randomized backtracking. It then removes clues one at a time and checks whether the puzzle still has exactly one solution. That uniqueness pass keeps generated boards solvable without ambiguity.

### Learn mode

`learn.js` defines a staged curriculum. Early challenges teach basic row, column, and box reasoning on 4x4 grids. Later challenges move into standard 9x9 concepts such as singles, scanning, pairs, and harder full-board play. The app tracks challenge stars in `localStorage` so progression persists across sessions.

## Architecture

Q-SUDOKU now uses browser-native ES modules with no bundler:

- `index.html` provides the static shell, welcome screen, overlays, and UI mount points.
- `app.js` is the tiny browser entry point that loads the module-based app.
- `js/app/state.js` manages shared game state, scoring, timer behavior, theme persistence, best scores, and session persistence.
- `js/app/board-ui.js` handles board rendering, cell focus and highlighting, and numpad counts.
- `js/app/learn-mode.js` owns learn mode overlays, challenge progression, guide cells, and streak updates.
- `js/app/game-controller.js` coordinates gameplay actions such as new game flow, hints, checks, solving, and win detection.
- `js/app/bootstrap.js` wires DOM events and initializes the app.
- `sudoku.js` remains the puzzle engine for solving, generation, validation, and candidate helpers.
- `learn.js` remains the challenge data and progression model.

This split keeps the app static-host friendly while making the responsibilities easier to reason about than the previous single-file UI controller.

## Performance Notes

- Bitmask constraints avoid repeated full-row and full-column scans during solving.
- The MRV heuristic reduces branching by choosing the hardest empty cell first.
- Candidate-based hints reuse existing engine helpers instead of duplicating expensive logic.
- Browser-native modules load directly in modern browsers without a bundling step, preserving a small deployment footprint.
- The app stores only lightweight JSON state in `localStorage`, which keeps save and restore fast.

## Run Locally

Q-SUDOKU should be served through Docker for local development and verification.

```bash
docker compose up --build
```

Then open http://localhost:8080

## Project Structure

```text
.
|-- index.html
|-- style.css
|-- app.js
|-- sudoku.js
|-- learn.js
|-- js/
|   `-- app/
|       |-- bootstrap.js
|       |-- board-ui.js
|       |-- game-controller.js
|       |-- learn-mode.js
|       `-- state.js
|-- Dockerfile
|-- docker-compose.yml
|-- README.md
`-- CONTRIBUTING.md
```

## Contributing

Contributions are welcome as long as they fit the project philosophy:

- Keep the runtime zero-dependency
- Keep GitHub Pages compatibility intact
- Prefer small, high-signal improvements over broad rewrites
- Avoid feature creep and unnecessary visual churn

See `CONTRIBUTING.md` for the expected workflow.

## License

This project is released under the MIT License. See `LICENSE` for details.
