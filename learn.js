import { Sudoku } from './sudoku.js'

/**
 * Progressive challenge system for Q-SUDOKU.
 * Challenges teach the rules from 4x4 boards through harder 9x9 puzzles.
 */
export const Learn = (() => {
  const SAVE_KEY = 'q-sudoku-learn'

  const CHALLENGES = [
    {
      id: 1,
      stage: 1,
      title: 'The Rules',
      size: 4,
      maxNum: 4,
      desc: 'Each row, column, and 2x2 box must contain the numbers 1-4 exactly once.',
      tip: 'Look at each row. Which number from 1-4 is missing?',
      puzzle: [[1, 2, 0, 4], [3, 0, 1, 2], [0, 1, 4, 3], [4, 3, 2, 0]],
      solution: [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]]
    },
    {
      id: 2,
      stage: 1,
      title: 'Last in Row',
      size: 4,
      maxNum: 4,
      desc: 'When a row has all numbers but one, the missing number is forced.',
      tip: 'Count 1-4 in each row. The missing one belongs in the empty cell.',
      puzzle: [[0, 2, 3, 4], [4, 0, 2, 1], [2, 4, 0, 3], [3, 1, 4, 0]],
      solution: [[1, 2, 3, 4], [4, 3, 2, 1], [2, 4, 1, 3], [3, 1, 4, 2]]
    },
    {
      id: 3,
      stage: 1,
      title: 'Elimination',
      size: 4,
      maxNum: 4,
      desc: 'Check the row, column, and box. Eliminate what is already placed.',
      tip: 'For each empty cell, cross off numbers seen in its row, column, and box.',
      puzzle: [[1, 0, 0, 4], [0, 4, 1, 0], [0, 1, 4, 0], [4, 0, 0, 1]],
      solution: [[1, 3, 2, 4], [2, 4, 1, 3], [3, 1, 4, 2], [4, 2, 3, 1]]
    },
    {
      id: 4,
      stage: 1,
      title: 'Mini Master',
      size: 4,
      maxNum: 4,
      desc: 'A complete 4x4 puzzle using row, column, and box elimination.',
      tip: 'Start with the cell that has the fewest possibilities.',
      puzzle: [[0, 0, 0, 3], [0, 3, 0, 0], [0, 0, 2, 0], [2, 0, 0, 0]],
      solution: [[4, 2, 1, 3], [1, 3, 4, 2], [3, 4, 2, 1], [2, 1, 3, 4]]
    },
    {
      id: 5,
      stage: 2,
      title: 'Naked Single',
      size: 9,
      maxNum: 9,
      desc: 'A naked single is a cell where only one number fits after checking its row, column, and box.',
      tip: 'Look for pencil marks that show only one candidate.',
      clues: 55
    },
    {
      id: 6,
      stage: 2,
      title: 'Hidden Single',
      size: 9,
      maxNum: 9,
      desc: 'A hidden single is the only place a number can go inside a row, column, or box.',
      tip: 'Pick one number and scan for the only legal position in a group.',
      clues: 50
    },
    {
      id: 7,
      stage: 2,
      title: 'Scanning',
      size: 9,
      maxNum: 9,
      desc: 'Cross-hatching uses row and column elimination to place a number inside a box.',
      tip: 'Choose a number that appears often and scan each unfinished box.',
      clues: 45
    },
    {
      id: 8,
      stage: 2,
      title: 'Full Easy',
      size: 9,
      maxNum: 9,
      desc: 'A full easy puzzle combining naked singles, hidden singles, and scanning.',
      tip: 'Start with free singles, then re-scan the affected groups.',
      clues: 38
    },
    {
      id: 9,
      stage: 3,
      title: 'Pairs',
      size: 9,
      maxNum: 9,
      desc: 'A naked pair lets you remove two candidates from other cells in the same row, column, or box.',
      tip: 'Look for two cells that share the exact same two candidates.',
      clues: 34
    },
    {
      id: 10,
      stage: 3,
      title: 'Triples',
      size: 9,
      maxNum: 9,
      desc: 'Three cells can sometimes lock three candidates into a single group.',
      tip: 'Focus on the boxes with the most empty cells.',
      clues: 30
    },
    {
      id: 11,
      stage: 3,
      title: 'Advanced Scan',
      size: 9,
      maxNum: 9,
      desc: 'Combine singles, pairs, and box-line reduction in a steady scan cycle.',
      tip: 'After each placement, re-check the row, column, and box immediately.',
      clues: 27
    },
    {
      id: 12,
      stage: 3,
      title: 'Graduation',
      size: 9,
      maxNum: 9,
      desc: 'A hard puzzle that asks you to trust the full toolkit you learned.',
      tip: 'Stay patient and keep narrowing the board one reliable step at a time.',
      clues: 24
    }
  ]

  function getProgress() {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
  }

  function saveProgress(id, stars) {
    const progress = getProgress()
    if (!progress[id] || stars > progress[id]) {
      progress[id] = stars
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress))
    }
  }

  function isUnlocked(id) {
    if (id === 1) return true
    const progress = getProgress()
    return progress[id - 1] >= 1
  }

  function getChallenge(id) {
    const challenge = CHALLENGES.find((item) => item.id === id)
    if (!challenge) return null
    if (challenge.puzzle) return { ...challenge }

    const result = Sudoku.generate(challenge.clues)
    return { ...challenge, puzzle: result.puzzle, solution: result.solution }
  }

  function calcStars(seconds, usedHints) {
    if (usedHints === 0 && seconds < 120) return 3
    if (usedHints <= 1 && seconds < 300) return 2
    return 1
  }

  function getTotalStars() {
    const progress = getProgress()
    return Object.values(progress).reduce((sum, stars) => sum + stars, 0)
  }

  return {
    CHALLENGES,
    getProgress,
    saveProgress,
    isUnlocked,
    getChallenge,
    calcStars,
    getTotalStars
  }
})()

export default Learn
