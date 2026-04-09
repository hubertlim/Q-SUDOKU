import { Sudoku } from './sudoku.js'

/**
 * Dynamic 9x9 learn mode.
 * Lessons are short drills around a single human-solvable next move.
 */
export const Learn = (() => {
  const SAVE_KEY = 'q-sudoku-learn'

  const SUPPORT_LEVELS = ['independent', 'guided', 'modelled']
  const SUPPORT_LABELS = {
    independent: 'Independent',
    guided: 'Guided',
    modelled: 'Modelled'
  }

  const LESSONS = [
    {
      id: 1,
      stage: 1,
      title: 'Read The Grid',
      focus: 'foundation',
      clues: 52,
      roundsRequired: 4,
      defaultSupport: 'modelled',
      desc: 'Learn to spot the next forced move on a real 9x9 board.',
      why: 'Fast improvement comes from reading authentic board states, not simplified mini-Sudoku.',
      lookFor: 'Scan for any cell or unit where one value is forced.',
      practice: 'Solve one next move at a time across several fresh boards.',
      tip: 'Trust the constraints. You are looking for a forced move, not a guess.'
    },
    {
      id: 2,
      stage: 1,
      title: 'Naked Singles',
      focus: 'naked-single',
      clues: 50,
      roundsRequired: 5,
      defaultSupport: 'guided',
      desc: 'Train your eye to find cells that have only one legal candidate.',
      why: 'Naked singles are the fastest reliable entry point in most human solving.',
      lookFor: 'Choose one empty cell and eliminate candidates using its row, column, and box.',
      practice: 'Find the forced cell before asking the coach for help.',
      tip: 'One empty cell, one legal digit. That is your move.'
    },
    {
      id: 3,
      stage: 2,
      title: 'Hidden Singles',
      focus: 'hidden-single',
      clues: 46,
      roundsRequired: 5,
      defaultSupport: 'guided',
      desc: 'Train scanning inside rows and columns to find the only slot for a digit.',
      why: 'Hidden singles develop search, discrimination, and better board coverage.',
      lookFor: 'Pick a digit, then ask where it can still go in one row or column.',
      practice: 'Name the unit first, then place the value.',
      tip: 'Do not hunt every cell. Hunt one digit inside one unit.'
    },
    {
      id: 4,
      stage: 2,
      title: 'Box Scanning',
      focus: 'box-single',
      clues: 44,
      roundsRequired: 5,
      defaultSupport: 'guided',
      desc: 'Use row and column pressure to narrow a box down to one legal cell.',
      why: 'Good Sudoku players move their attention across the whole board, not only within one cell.',
      lookFor: 'Pick a box and track one digit through the lines that block it.',
      practice: 'Use the box as the target and the surrounding rows and columns as evidence.',
      tip: 'Treat the box as the question and the rows and columns as the proof.'
    },
    {
      id: 5,
      stage: 3,
      title: 'Mixed Practice',
      focus: 'mixed',
      clues: 42,
      roundsRequired: 6,
      defaultSupport: 'guided',
      desc: 'Switch between the core techniques the way real play demands.',
      why: 'Improvement comes from choosing the right next move, not from repeating one trick in isolation.',
      lookFor: 'Ask which simple technique is strongest right now.',
      practice: 'Solve a chain of fresh next moves with decreasing support.',
      tip: 'Start with the clearest evidence, then move on.'
    },
    {
      id: 6,
      stage: 3,
      title: 'Review Sprint',
      focus: 'review',
      clues: 40,
      roundsRequired: 8,
      defaultSupport: 'independent',
      desc: 'A short adaptive sprint that revisits core skills with minimal coaching.',
      why: 'Spacing and retrieval help the player retain techniques longer than blocked drills alone.',
      lookFor: 'Find the next logical move quickly, then reset and do it again on a new board.',
      practice: 'Stay calm, stay systematic, and ask for help only when needed.',
      tip: 'The goal is fluency, not speed for its own sake.'
    }
  ]

  const UNIT_CACHE = buildUnits()

  function buildUnits() {
    const rows = []
    const cols = []
    const boxes = []

    for (let index = 0; index < 9; index += 1) {
      rows.push([])
      cols.push([])
      boxes.push([])
    }

    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        rows[r].push({ r, c })
        cols[c].push({ r, c })
        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)].push({ r, c })
      }
    }

    return { rows, cols, boxes }
  }

  function clampSupport(level) {
    return SUPPORT_LEVELS.includes(level) ? level : 'modelled'
  }

  function getSupportLabel(level) {
    return SUPPORT_LABELS[clampSupport(level)]
  }

  function getLessonMeta(id) {
    return LESSONS.find((lesson) => lesson.id === id) || null
  }

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

  function buildCandidateMap(board) {
    const map = new Map()
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (board[r][c] !== 0) continue
        map.set(`${r}:${c}`, Sudoku.getCandidates(board, r, c))
      }
    }
    return map
  }

  function getCandidates(map, r, c) {
    return map.get(`${r}:${c}`) || []
  }

  function findNakedSingles(board, map = buildCandidateMap(board)) {
    const moves = []
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const candidates = getCandidates(map, r, c)
        if (candidates.length === 1) {
          moves.push({
            r,
            c,
            value: candidates[0],
            technique: 'naked-single',
            scope: 'cell'
          })
        }
      }
    }
    return moves
  }

  function findHiddenSingles(board, map = buildCandidateMap(board)) {
    const moves = []
    const scopes = [
      { type: 'row', units: UNIT_CACHE.rows },
      { type: 'column', units: UNIT_CACHE.cols },
      { type: 'box', units: UNIT_CACHE.boxes }
    ]

    scopes.forEach(({ type, units }) => {
      units.forEach((cells, unitIndex) => {
        for (let digit = 1; digit <= 9; digit += 1) {
          const matches = cells.filter(({ r, c }) => getCandidates(map, r, c).includes(digit))
          if (matches.length === 1) {
            const cell = matches[0]
            moves.push({
              r: cell.r,
              c: cell.c,
              value: digit,
              technique: type === 'box' ? 'box-single' : 'hidden-single',
              scope: type,
              unitIndex
            })
          }
        }
      })
    })

    return dedupeMoves(moves)
  }

  function dedupeMoves(moves) {
    const seen = new Map()
    moves.forEach((move) => {
      const key = `${move.r}:${move.c}:${move.value}`
      if (!seen.has(key)) {
        seen.set(key, move)
      }
    })
    return [...seen.values()]
  }

  function findTargets(board, focus) {
    const map = buildCandidateMap(board)
    const nakedSingles = findNakedSingles(board, map)
    const hiddenSingles = findHiddenSingles(board, map)
    const nakedKeys = new Set(nakedSingles.map((move) => `${move.r}:${move.c}:${move.value}`))

    const pureHiddenSingles = hiddenSingles.filter((move) => !nakedKeys.has(`${move.r}:${move.c}:${move.value}`))
    const boxSingles = pureHiddenSingles.filter((move) => move.technique === 'box-single')
    const rowColHiddenSingles = pureHiddenSingles.filter((move) => move.technique === 'hidden-single')

    switch (focus) {
      case 'naked-single':
        return nakedSingles
      case 'hidden-single':
        return rowColHiddenSingles
      case 'box-single':
        return boxSingles
      case 'foundation':
        return dedupeMoves([...nakedSingles, ...pureHiddenSingles])
      case 'mixed':
      case 'review':
        return dedupeMoves([...nakedSingles, ...pureHiddenSingles])
      default:
        return []
    }
  }

  function describeMove(move) {
    if (!move) return null
    if (move.technique === 'naked-single') {
      return `R${move.r + 1}C${move.c + 1} has only one legal candidate.`
    }
    if (move.scope === 'box') {
      return `Digit ${move.value} fits in only one cell of Box ${move.unitIndex + 1}.`
    }
    if (move.scope === 'row') {
      return `Digit ${move.value} has only one legal spot in Row ${move.unitIndex + 1}.`
    }
    if (move.scope === 'column') {
      return `Digit ${move.value} has only one legal spot in Column ${move.unitIndex + 1}.`
    }
    return `R${move.r + 1}C${move.c + 1} is the next forced move.`
  }

  function getUnitCue(move) {
    if (!move) return null
    if (move.scope === 'row') return `Check Row ${move.unitIndex + 1}.`
    if (move.scope === 'column') return `Check Column ${move.unitIndex + 1}.`
    if (move.scope === 'box') return `Check Box ${move.unitIndex + 1}.`
    return `Check cell R${move.r + 1}C${move.c + 1}.`
  }

  function boardMatchesFocus(board, lesson) {
    const targets = findTargets(board, lesson.focus)
    if (targets.length === 0) return false

    if (lesson.focus === 'hidden-single' || lesson.focus === 'box-single') {
      const nakedSingles = findTargets(board, 'naked-single')
      if (nakedSingles.length > 0) return false
    }

    return true
  }

  function generateBoardForLesson(lesson) {
    let fallback = null

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const result = Sudoku.generate(lesson.clues)
      fallback = result
      if (boardMatchesFocus(result.puzzle, lesson)) {
        return {
          puzzle: result.puzzle,
          solution: result.solution,
          targets: findTargets(result.puzzle, lesson.focus)
        }
      }
    }

    return {
      puzzle: fallback.puzzle,
      solution: fallback.solution,
      targets: findTargets(fallback.puzzle, lesson.focus)
    }
  }

  function getSessionBoard(id) {
    const lesson = getLessonMeta(id)
    if (!lesson) return null

    const generated = generateBoardForLesson(lesson)
    return {
      ...lesson,
      puzzle: generated.puzzle,
      solution: generated.solution,
      targets: generated.targets
    }
  }

  function calcStars({ supportLevel = 'modelled', usedHints = 0, mistakes = 0 }) {
    const support = clampSupport(supportLevel)
    if (support === 'independent' && usedHints === 0 && mistakes === 0) return 3
    if ((support === 'independent' || support === 'guided') && usedHints <= 2 && mistakes <= 2) return 2
    return 1
  }

  function getTotalStars() {
    const progress = getProgress()
    return Object.values(progress).reduce((sum, stars) => sum + stars, 0)
  }

  return {
    LESSONS,
    SUPPORT_LEVELS,
    calcStars,
    clampSupport,
    describeMove,
    findTargets,
    getLessonMeta,
    getProgress,
    getSessionBoard,
    getSupportLabel,
    getTotalStars,
    getUnitCue,
    isUnlocked,
    saveProgress
  }
})()

export default Learn
