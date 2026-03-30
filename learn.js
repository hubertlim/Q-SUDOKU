/**
 * Q-SUDOKU Learn — Progressive challenge system
 * 12 challenges teaching sudoku from 4×4 mini grids to full 9×9.
 */
const Learn = (() => {
  const SAVE_KEY = 'q-sudoku-learn';

  const CHALLENGES = [
    // ── Stage 1: 4×4 mini grids ──────────────────────────────────
    {
      id: 1, stage: 1, title: 'The Rules', size: 4, maxNum: 4,
      desc: 'Each row, column, and 2×2 box must have the numbers 1-4 exactly once.',
      tip: 'Look at each row — which number from 1-4 is missing?',
      puzzle:    [[1,2,0,4],[3,0,1,2],[0,1,4,3],[4,3,2,0]],
      solution:  [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]]
    },
    {
      id: 2, stage: 1, title: 'Last in Row', size: 4, maxNum: 4,
      desc: 'When a row has all numbers but one, the missing number is forced.',
      tip: 'Count 1-4 in each row. The missing one goes in the empty cell.',
      puzzle:    [[0,2,3,4],[4,0,2,1],[2,4,0,3],[3,1,4,0]],
      solution:  [[1,2,3,4],[4,3,2,1],[2,4,1,3],[3,1,4,2]]
    },
    {
      id: 3, stage: 1, title: 'Elimination', size: 4, maxNum: 4,
      desc: 'Check the row, column, AND box. Eliminate what\'s already placed.',
      tip: 'For each empty cell, cross off numbers in its row, column, and box. What\'s left?',
      puzzle:    [[1,0,0,4],[0,4,1,0],[0,1,4,0],[4,0,0,1]],
      solution:  [[1,3,2,4],[2,4,1,3],[3,1,4,2],[4,2,3,1]]
    },
    {
      id: 4, stage: 1, title: 'Mini Master', size: 4, maxNum: 4,
      desc: 'A full 4×4 puzzle. Use everything: row, column, and box elimination.',
      tip: 'Start with the cell that has the fewest possibilities.',
      puzzle:    [[0,0,0,3],[0,3,0,0],[0,0,2,0],[2,0,0,0]],
      solution:  [[4,2,1,3],[1,3,4,2],[3,4,2,1],[2,1,3,4]]
    },
    // ── Stage 2: 9×9 easy techniques ────────────────────────────
    {
      id: 5, stage: 2, title: 'Naked Single', size: 9, maxNum: 9,
      desc: 'A naked single is a cell where only one number can go — all others are eliminated by its row, column, or box.',
      tip: 'Look for cells with pencil marks showing just one number. That\'s your answer.',
      clues: 55
    },
    {
      id: 6, stage: 2, title: 'Hidden Single', size: 9, maxNum: 9,
      desc: 'A hidden single is when a number can only go in one cell within a row, column, or box — even if that cell has other candidates.',
      tip: 'Pick a number (e.g. 5). Scan each row — is there only one place it can go?',
      clues: 50
    },
    {
      id: 7, stage: 2, title: 'Scanning', size: 9, maxNum: 9,
      desc: 'Cross-hatching: pick a number and scan rows and columns to find where it must go in each box.',
      tip: 'Choose a number that appears often. For each box missing it, check which cells are blocked by rows/columns.',
      clues: 45
    },
    {
      id: 8, stage: 2, title: 'Full Easy', size: 9, maxNum: 9,
      desc: 'A complete easy puzzle. Combine naked singles, hidden singles, and scanning.',
      tip: 'Always check for naked singles first — they\'re free. Then scan for hidden singles.',
      clues: 38
    },
    // ── Stage 3: 9×9 harder ──────────────────────────────────────
    {
      id: 9, stage: 3, title: 'Pairs', size: 9, maxNum: 9,
      desc: 'A naked pair: two cells in a row/col/box that share the same two candidates. Those numbers can be removed from other cells in that group.',
      tip: 'Look for two cells with identical two-number pencil marks in the same row or box.',
      clues: 34
    },
    {
      id: 10, stage: 3, title: 'Triples', size: 9, maxNum: 9,
      desc: 'Three cells sharing three candidates. Same logic as pairs, but with three numbers.',
      tip: 'This is rare. Focus on boxes where many cells are still empty.',
      clues: 30
    },
    {
      id: 11, stage: 3, title: 'Advanced Scan', size: 9, maxNum: 9,
      desc: 'Combine all techniques. Scan systematically: singles → pairs → box/line reduction.',
      tip: 'After each placement, re-scan the affected row, column, and box for new singles.',
      clues: 27
    },
    {
      id: 12, stage: 3, title: 'Graduation', size: 9, maxNum: 9,
      desc: 'A hard puzzle. You\'ve learned everything — trust the process.',
      tip: 'Patience. Work through singles and pairs. If stuck, look for hidden singles in boxes.',
      clues: 24
    }
  ];

  function getProgress() {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  }

  function saveProgress(id, stars) {
    const p = getProgress();
    if (!p[id] || stars > p[id]) p[id] = stars;
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  }

  function isUnlocked(id) {
    if (id === 1) return true;
    const p = getProgress();
    return p[id - 1] >= 1;
  }

  function getChallenge(id) {
    const ch = CHALLENGES.find(c => c.id === id);
    if (!ch) return null;
    if (ch.puzzle) return { ...ch };
    const result = Sudoku.generate(ch.clues);
    return { ...ch, puzzle: result.puzzle, solution: result.solution };
  }

  function calcStars(seconds, usedHints) {
    if (usedHints === 0 && seconds < 120) return 3;
    if (usedHints <= 1 && seconds < 300) return 2;
    return 1;
  }

  function getTotalStars() {
    const p = getProgress();
    return Object.values(p).reduce((a, b) => a + b, 0);
  }

  return {
    CHALLENGES, getProgress, saveProgress, isUnlocked,
    getChallenge, calcStars, getTotalStars
  };
})();
