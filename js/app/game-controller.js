import { Sudoku } from '../../sudoku.js'
import { HINT_LIMITS, HINT_PENALTY } from './state.js'

export function attachGameController(app) {
  const { elements, state } = app

  function resetBoardChrome() {
    elements.messageEl.textContent = ''
    elements.messageEl.className = ''
    elements.boardEl.classList.remove('won')
    elements.pauseOverlay.hidden = true
    elements.btnPause.textContent = app.PAUSE_ICON
    elements.btnPause.classList.remove('paused')
    elements.challengeDone.hidden = true
    elements.challengeBar.classList.remove('visible')
    elements.gameEl.classList.remove('game-mini')

    state.paused = false
    state.solved = false
    state.selected = null
    app.setActiveNum(0)
  }

  function syncLearnRestoreState() {
    if (!state.isLearnMode || !state.currentChallengeId) return
    state.currentChallenge = app.learn.getChallenge(state.currentChallengeId)
    app.syncChallengeBar()
  }

  app.updateHintButton = () => {
    const remaining = state.maxHints - state.hints
    elements.hintCount.textContent = `(${remaining})`
    elements.btnHint.classList.toggle('exhausted', remaining <= 0)
  }

  app.newGame = () => {
    if (state.difficulty === 'learn') {
      state.difficulty = state.lastStandardDifficulty || 'easy'
      app.syncDifficultyButtons?.()
    }

    resetBoardChrome()
    state.checks = 0
    state.seconds = 0
    state.hints = 0
    state.maxHints = HINT_LIMITS[state.difficulty] || HINT_LIMITS.easy
    state.streak = 0
    state.currentChallenge = null
    state.currentChallengeId = null
    state.isLearnMode = false

    const result = Sudoku.generate(state.difficulty)
    state.puzzle = result.puzzle
    state.solution = result.solution
    state.given = result.puzzle.map((row) => row.map((value) => value !== 0))

    app.renderBoard()
    app.startTimer()
    app.updateHintButton()
    app.updateLearnUI()
    app.saveSession()
  }

  app.restoreGame = () => {
    resetBoardChrome()
    syncLearnRestoreState()
    app.renderBoard()
    app.startTimer()
    app.updateHintButton()
    app.updateLearnUI()
    if (state.activeNum > 0) {
      const activeNum = state.activeNum
      state.activeNum = 0
      app.setActiveNum(activeNum)
    }
    app.showMessage('Game restored.', false)
  }

  app.onCellClick = (r, c) => {
    if (state.paused || state.solved) return
    app.dismissConfirm?.()
    app.selectCell(r, c)
  }

  app.placeNumber = (num) => {
    if (!state.selected || state.paused || state.solved) return

    const { r, c } = state.selected
    if (state.given[r][c]) return

    state.puzzle[r][c] = num
    const cell = app.getCell(r, c)
    cell.classList.remove('pencil-marks', 'guide-cell')
    cell.textContent = num || ''
    cell.classList.add('pop')
    setTimeout(() => cell.classList.remove('pop'), 150)

    if (state.isLearnMode && num !== 0) {
      const ok = app.handleLearnPlacement(r, c, num)
      if (!ok) return
      app.updateStreakDisplay()
    }

    app.selectCell(r, c)
    app.updateNumpadCounts()
    app.updateScoreDisplay()
    if (state.isLearnMode) app.renderLearnOverlays()
    app.saveSession()
    app.checkWin()
  }

  app.handleCellKey = (event) => {
    if (!state.selected || state.paused || state.solved) return

    const { r, c } = state.selected
    const size = app.getBoardSize()
    const maxNum = app.getMaxNum()
    let handled = true

    if (event.key >= '1' && event.key <= String(maxNum)) {
      app.placeNumber(Number(event.key))
    } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      app.placeNumber(0)
    } else if (event.key === 'ArrowUp' && r > 0) {
      app.selectCell(r - 1, c)
    } else if (event.key === 'ArrowDown' && r < size - 1) {
      app.selectCell(r + 1, c)
    } else if (event.key === 'ArrowLeft' && c > 0) {
      app.selectCell(r, c - 1)
    } else if (event.key === 'ArrowRight' && c < size - 1) {
      app.selectCell(r, c + 1)
    } else {
      handled = false
    }

    if (handled) event.preventDefault()
  }

  app.useHint = () => {
    if (state.paused || state.solved) return

    if (state.hints >= state.maxHints) {
      app.showMessage('No hints remaining.', true)
      return
    }

    const size = app.getBoardSize()
    let targetRow = -1
    let targetCol = -1

    if (size === 4) {
      let minCandidates = 5
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          if (state.puzzle[r][c] !== 0) continue
          const candidates = app.getMini4Candidates(state.puzzle, r, c)
          if (candidates.length > 0 && candidates.length < minCandidates) {
            minCandidates = candidates.length
            targetRow = r
            targetCol = c
          }
        }
      }
    } else {
      const target = Sudoku.getMostConstrainedEmpty(state.puzzle)
      if (target) {
        targetRow = target.r
        targetCol = target.c
      }
    }

    if (targetRow === -1) return

    const answer = state.solution[targetRow][targetCol]
    state.hints += 1
    state.puzzle[targetRow][targetCol] = answer

    app.clearHighlights()
    app.selectCell(targetRow, targetCol)

    const cell = app.getCell(targetRow, targetCol)
    cell.classList.remove('pencil-marks', 'guide-cell')
    cell.textContent = answer
    cell.classList.add('hint-reveal')
    setTimeout(() => cell.classList.remove('hint-reveal'), 400)

    app.showMessage(
      `Hint: ${answer} at R${targetRow + 1}C${targetCol + 1}. (-${HINT_PENALTY} pts)`,
      false
    )
    app.updateNumpadCounts()
    app.updateHintButton()
    app.updateScoreDisplay()
    if (state.isLearnMode) app.renderLearnOverlays()
    app.saveSession()
    app.checkWin()
  }

  app.checkBoard = () => {
    if (state.paused || state.solved) return

    if (state.currentChallenge && state.currentChallenge.size === 4) {
      app.showMessage('Use the guide cell in learn mode.', false)
      return
    }

    state.checks += 1
    const errors = Sudoku.getErrors(state.puzzle)
    app.clearHighlights()
    app.updateScoreDisplay()
    app.saveSession()

    if (errors.size === 0) {
      const hasEmpty = state.puzzle.flat().some((value) => value === 0)
      app.showMessage(hasEmpty ? 'No errors so far.' : 'Perfect.', false)
      return
    }

    errors.forEach((index) => app.ui.cells[index].classList.add('error'))
    const conflicts = Math.floor(errors.size / 2)
    app.showMessage(`${conflicts} conflict${errors.size > 2 ? 's' : ''} found. (-50 pts)`, true)
  }

  app.solveBoard = () => {
    if (state.paused || state.isLearnMode) return

    state.solved = true
    state.puzzle = state.solution.map((row) => [...row])
    app.renderBoard()
    app.stopTimer()
    elements.scoreEl.textContent = '0'
    localStorage.removeItem(app.SAVE_KEY)
    app.showMessage('Solved. No score awarded.', false)
  }

  app.checkWin = () => {
    if (state.puzzle.flat().some((value) => value === 0)) return

    if (state.currentChallenge && state.currentChallenge.size === 4) {
      const correct = state.puzzle.every((row, r) =>
        row.every((value, c) => value === state.solution[r][c])
      )
      if (!correct) return
    } else {
      const errors = Sudoku.getErrors(state.puzzle)
      if (errors.size > 0) return
    }

    state.solved = true
    app.stopTimer()
    elements.boardEl.classList.add('won')

    if (state.currentChallenge) {
      app.endChallenge()
      return
    }

    const score = app.calcScore()
    app.saveBestScore(score)
    localStorage.removeItem(app.SAVE_KEY)
    app.showMessage(`Solved in ${elements.timerEl.textContent} - Score: ${score}`, false)
  }

  app.setCellHandlers({
    onCellClick: app.onCellClick,
    onCellKey: app.handleCellKey
  })
}
