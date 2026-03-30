/**
 * Q-SUDOKU Engine
 * 
 * Solver: Backtracking + constraint propagation with bitmask optimization.
 *   - Each row, col, box tracks used digits as a 9-bit mask.
 *   - Candidate lookup is O(1) via bitwise AND.
 *   - MRV heuristic: always branch on the cell with fewest candidates.
 *
 * Generator: Fill grid via randomized backtracking, then remove clues
 *   symmetrically while verifying unique solution (solution count ≤ 1).
 */
const Sudoku = (() => {
  const N = 9;
  const ALL = 0x1FF; // bits 0..8 = digits 1..9

  // Which 3x3 box does (r,c) belong to?
  const boxIdx = (r, c) => (Math.floor(r / 3) * 3 + Math.floor(c / 3));

  // Count set bits (popcount)
  const popcount = (x) => {
    let c = 0;
    while (x) { c++; x &= x - 1; }
    return c;
  };

  // Lowest set bit position (0-indexed) → digit = pos + 1
  const lowestBit = (x) => {
    let pos = 0;
    while (!((x >> pos) & 1)) pos++;
    return pos;
  };

  // Iterate set bits, yielding digit values (1-9)
  function* iterBits(mask) {
    let m = mask;
    while (m) {
      const bit = m & (-m);       // isolate lowest set bit
      yield lowestBit(bit) + 1;   // digit
      m ^= bit;                   // clear it
    }
  }

  // ── Solver with bitmask + MRV ──────────────────────────────────

  function solve(board) {
    const grid = board.map(r => [...r]);
    const rowMask = new Array(N).fill(0);
    const colMask = new Array(N).fill(0);
    const boxMask = new Array(N).fill(0);

    // Initialize masks from given clues
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = grid[r][c];
        if (v) {
          const bit = 1 << (v - 1);
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[boxIdx(r, c)] |= bit;
        }
      }
    }

    function candidates(r, c) {
      return ALL & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)]);
    }

    function bt() {
      // MRV: find empty cell with fewest candidates
      let minCount = 10, bestR = -1, bestC = -1, bestCand = 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c] === 0) {
            const cand = candidates(r, c);
            const cnt = popcount(cand);
            if (cnt === 0) return false; // dead end
            if (cnt < minCount) {
              minCount = cnt;
              bestR = r; bestC = c; bestCand = cand;
              if (cnt === 1) break; // can't do better
            }
          }
        }
        if (minCount === 1) break;
      }
      if (bestR === -1) return true; // all filled → solved

      for (const d of iterBits(bestCand)) {
        const bit = 1 << (d - 1);
        grid[bestR][bestC] = d;
        rowMask[bestR] |= bit;
        colMask[bestC] |= bit;
        boxMask[boxIdx(bestR, bestC)] |= bit;

        if (bt()) return true;

        grid[bestR][bestC] = 0;
        rowMask[bestR] ^= bit;
        colMask[bestC] ^= bit;
        boxMask[boxIdx(bestR, bestC)] ^= bit;
      }
      return false;
    }

    return bt() ? grid : null;
  }

  // ── Solution counter (stops at 2 to check uniqueness) ─────────

  function countSolutions(board, limit = 2) {
    const grid = board.map(r => [...r]);
    const rowMask = new Array(N).fill(0);
    const colMask = new Array(N).fill(0);
    const boxMask = new Array(N).fill(0);

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = grid[r][c];
        if (v) {
          const bit = 1 << (v - 1);
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[boxIdx(r, c)] |= bit;
        }
      }
    }

    let count = 0;

    function bt() {
      let minCount = 10, bestR = -1, bestC = -1, bestCand = 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c] === 0) {
            const cand = ALL & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)]);
            const cnt = popcount(cand);
            if (cnt === 0) return;
            if (cnt < minCount) {
              minCount = cnt;
              bestR = r; bestC = c; bestCand = cand;
              if (cnt === 1) break;
            }
          }
        }
        if (minCount === 1) break;
      }
      if (bestR === -1) { count++; return; }

      for (const d of iterBits(bestCand)) {
        if (count >= limit) return;
        const bit = 1 << (d - 1);
        grid[bestR][bestC] = d;
        rowMask[bestR] |= bit;
        colMask[bestC] |= bit;
        boxMask[boxIdx(bestR, bestC)] |= bit;

        bt();

        grid[bestR][bestC] = 0;
        rowMask[bestR] ^= bit;
        colMask[bestC] ^= bit;
        boxMask[boxIdx(bestR, bestC)] ^= bit;
      }
    }

    bt();
    return count;
  }

  // ── Generator ──────────────────────────────────────────────────

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateFull() {
    const grid = Array.from({ length: N }, () => new Array(N).fill(0));
    const rowMask = new Array(N).fill(0);
    const colMask = new Array(N).fill(0);
    const boxMask = new Array(N).fill(0);

    function bt(pos) {
      if (pos === 81) return true;
      const r = Math.floor(pos / 9), c = pos % 9;
      const cand = ALL & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)]);
      const digits = [...iterBits(cand)];
      shuffle(digits);

      for (const d of digits) {
        const bit = 1 << (d - 1);
        grid[r][c] = d;
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[boxIdx(r, c)] |= bit;

        if (bt(pos + 1)) return true;

        grid[r][c] = 0;
        rowMask[r] ^= bit;
        colMask[c] ^= bit;
        boxMask[boxIdx(r, c)] ^= bit;
      }
      return false;
    }

    bt(0);
    return grid;
  }

  const CLUES = { easy: 38, medium: 30, hard: 24 };

  function generate(difficulty = 'easy') {
    const solution = generateFull();
    const puzzle = solution.map(r => [...r]);
    const target = 81 - (CLUES[difficulty] || 38);

    // Build list of all positions, shuffled
    const positions = shuffle(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    );

    let removed = 0;
    for (const [r, c] of positions) {
      if (removed >= target) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      if (countSolutions(puzzle) !== 1) {
        puzzle[r][c] = backup; // restore — removing breaks uniqueness
      } else {
        removed++;
      }
    }

    return { puzzle, solution };
  }

  // ── Validation ─────────────────────────────────────────────────

  function getErrors(board) {
    const errors = new Set();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = board[r][c];
        if (!v) continue;
        // Check row
        for (let c2 = 0; c2 < N; c2++) {
          if (c2 !== c && board[r][c2] === v) {
            errors.add(r * 9 + c);
            errors.add(r * 9 + c2);
          }
        }
        // Check col
        for (let r2 = 0; r2 < N; r2++) {
          if (r2 !== r && board[r2][c] === v) {
            errors.add(r * 9 + c);
            errors.add(r2 * 9 + c);
          }
        }
        // Check box
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const r2 = br + dr, c2 = bc + dc;
            if ((r2 !== r || c2 !== c) && board[r2][c2] === v) {
              errors.add(r * 9 + c);
              errors.add(r2 * 9 + c2);
            }
          }
        }
      }
    }
    return errors;
  }

  return { solve, generate, getErrors };
})();
