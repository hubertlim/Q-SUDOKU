const PLAY_ICON = '\u25B6'
const PAUSE_ICON = '\u23F8'

export const SCORE_MULT = { easy: 1000, medium: 2000, hard: 3000 }
export const HINT_LIMITS = { easy: 5, medium: 3, hard: 1 }
export const HINT_PENALTY = 100
export const SAVE_KEY = 'q-sudoku-save'
export const BEST_KEY = 'q-sudoku-best'
export const THEME_KEY = 'q-sudoku-theme'

export function createAppState(elements) {
  const state = {
    puzzle: null,
    solution: null,
    given: null,
    selected: null,
    seconds: 0,
    difficulty: 'easy',
    lastStandardDifficulty: localStorage.getItem('q-sudoku-diff') || 'easy',
    activeNum: 0,
    paused: false,
    checks: 0,
    solved: false,
    hints: 0,
    maxHints: HINT_LIMITS.easy,
    streak: 0,
    isLearnMode: false,
    currentChallenge: null,
    currentChallengeId: null,
    welcomeDifficulty: localStorage.getItem('q-sudoku-diff') || 'easy'
  }

  const ui = {
    cells: [],
    timerInterval: null,
    saveTimeout: null
  }

  function getBoardSize() {
    return state.currentChallenge && state.currentChallenge.size === 4 ? 4 : 9
  }

  function getBoxSize() {
    return getBoardSize() === 4 ? 2 : 3
  }

  function getMaxNum() {
    return state.currentChallenge && state.currentChallenge.maxNum
      ? state.currentChallenge.maxNum
      : 9
  }

  function serializeSession() {
    return {
      puzzle: state.puzzle,
      solution: state.solution,
      given: state.given,
      difficulty: state.difficulty,
      seconds: state.seconds,
      checks: state.checks,
      activeNum: state.activeNum,
      hints: state.hints,
      maxHints: state.maxHints,
      streak: state.streak,
      isLearnMode: state.isLearnMode,
      currentChallengeId: state.currentChallengeId
    }
  }

  function saveSession() {
    if (!state.puzzle) return
    if (state.solved) {
      localStorage.removeItem(SAVE_KEY)
      return
    }

    clearTimeout(ui.saveTimeout)
    ui.saveTimeout = setTimeout(() => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSession()))
    }, 300)
  }

  function flushSessionSave() {
    clearTimeout(ui.saveTimeout)
    if (!state.puzzle || state.solved) {
      localStorage.removeItem(SAVE_KEY)
      return
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSession()))
  }

  function loadSession() {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false

    try {
      const data = JSON.parse(raw)
      state.puzzle = data.puzzle
      state.solution = data.solution
      state.given = data.given
      state.difficulty = data.difficulty
      state.seconds = data.seconds || 0
      state.checks = data.checks || 0
      state.activeNum = data.activeNum || 0
      state.hints = data.hints || 0
      state.maxHints = data.maxHints || HINT_LIMITS[data.difficulty] || HINT_LIMITS.easy
      state.streak = data.streak || 0
      state.isLearnMode = data.isLearnMode || false
      state.currentChallengeId = data.currentChallengeId || null
      state.currentChallenge = null
      state.selected = null
      state.paused = false
      state.solved = false

      if (!state.isLearnMode && data.difficulty) {
        state.lastStandardDifficulty = data.difficulty
      }

      return true
    } catch {
      return false
    }
  }

  function calcScore() {
    const base = SCORE_MULT[state.difficulty] || SCORE_MULT.easy
    return Math.max(0, base - state.seconds - state.checks * 50 - state.hints * HINT_PENALTY)
  }

  function updateScoreDisplay() {
    elements.scoreEl.textContent = calcScore()
  }

  function loadBestScores() {
    const data = JSON.parse(localStorage.getItem(BEST_KEY) || '{}')
    elements.bestEls.forEach((el) => {
      const diff = el.dataset.diff
      const prefix = diff[0].toUpperCase()
      el.textContent = data[diff] != null ? `${prefix}: ${data[diff]}` : `${prefix}: -`
    })
  }

  function saveBestScore(score) {
    const data = JSON.parse(localStorage.getItem(BEST_KEY) || '{}')
    if (data[state.difficulty] == null || score > data[state.difficulty]) {
      data[state.difficulty] = score
      localStorage.setItem(BEST_KEY, JSON.stringify(data))
    }
    loadBestScores()
  }

  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name)
    localStorage.setItem(THEME_KEY, name)
    elements.themeDots.forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.theme === name)
    })
  }

  function updateTimer() {
    const minutes = String(Math.floor(state.seconds / 60)).padStart(2, '0')
    const seconds = String(state.seconds % 60).padStart(2, '0')
    elements.timerEl.textContent = `${minutes}:${seconds}`
  }

  function startTimer() {
    clearInterval(ui.timerInterval)
    updateTimer()
    ui.timerInterval = setInterval(() => {
      state.seconds += 1
      updateTimer()
      updateScoreDisplay()
    }, 1000)
  }

  function resumeTimer() {
    clearInterval(ui.timerInterval)
    ui.timerInterval = setInterval(() => {
      state.seconds += 1
      updateTimer()
      updateScoreDisplay()
    }, 1000)
  }

  function stopTimer() {
    clearInterval(ui.timerInterval)
  }

  function togglePause() {
    if (state.solved) return
    state.paused = !state.paused

    if (state.paused) {
      stopTimer()
      elements.pauseOverlay.hidden = false
      elements.btnPause.textContent = PLAY_ICON
      elements.btnPause.classList.add('paused')
      return
    }

    resumeTimer()
    elements.pauseOverlay.hidden = true
    elements.btnPause.textContent = PAUSE_ICON
    elements.btnPause.classList.remove('paused')
  }

  function showMessage(text, isError) {
    elements.messageEl.textContent = text
    elements.messageEl.className = isError ? 'error' : ''
  }

  return {
    elements,
    state,
    ui,
    PLAY_ICON,
    PAUSE_ICON,
    SCORE_MULT,
    HINT_LIMITS,
    HINT_PENALTY,
    SAVE_KEY,
    BEST_KEY,
    THEME_KEY,
    getBoardSize,
    getBoxSize,
    getMaxNum,
    serializeSession,
    saveSession,
    flushSessionSave,
    loadSession,
    calcScore,
    updateScoreDisplay,
    loadBestScores,
    saveBestScore,
    setTheme,
    updateTimer,
    startTimer,
    resumeTimer,
    stopTimer,
    togglePause,
    showMessage
  }
}
