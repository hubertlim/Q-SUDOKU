# Q-SUDOKU

Minimalistic sudoku SPA with a bitmask-optimized solver and generator.

## Run

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

## Algorithm

- **Solver**: Backtracking + bitmask constraint tracking (row/col/box as 9-bit integers) + MRV heuristic
- **Generator**: Randomized full-grid fill → symmetric clue removal with uniqueness verification
- **Difficulty**: Easy (38 clues), Medium (30), Hard (24)

## License

MIT
