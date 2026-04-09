import { Learn } from '../../learn.js'
import { Sudoku } from '../../sudoku.js'

const STAR_FILLED = '\u2605'
const STAR_EMPTY = '\u2606'

export function attachLearnMode(app) {
  const { elements, state } = app

  app.learn = Learn

  function getMini4Candidates(board, r, c) {
    const used = new Set()

    for (let index = 0; index < 4; index += 1) {
      if (board[r][index]) used.add(board[r][index])
      if (board[index][c]) used.add(board[index][c])
    }

    const boxRow = Math.floor(r / 2) * 2
    const boxCol = Math.floor(c / 2) * 2
    for (let dr = 0; dr < 2; dr += 1) {
      for (let dc = 0; dc < 2; dc += 1) {
        const value = board[boxRow + dr][boxCol + dc]
        if (value) used.add(value)
      }
    }

    const candidates = []
    for (let digit = 1; digit <= 4; digit += 1) {
      if (!used.has(digit)) candidates.push(digit)
    }
    return candidates
  }

  app.syncChallengeBar = () => {
    if (!state.currentChallenge) {
      elements.challengeBar.classList.remove('visible')
      return
    }

    elements.challengeBar.classList.add('visible')
    elements.challengeInfo.textContent = `#${state.currentChallenge.id} ${state.currentChallenge.title}`
    elements.challengeTipButton.onclick = () => app.showMessage(`Tip: ${state.currentChallenge.tip}`, false)
  }

  app.openLearnOverlay = () => {
    elements.learnOverlay.hidden = false
    elements.learnLesson.hidden = true
    elements.learnComplete.hidden = true
    elements.learnStages.style.display = ''
    elements.learnStages.innerHTML = ''
    elements.learnStarsTotal.textContent =
      `Stars ${Learn.getTotalStars()} / ${Learn.CHALLENGES.length * 3}`

    const progress = Learn.getProgress()
    const stageNames = {
      1: 'Stage 1 - Mini 4x4',
      2: 'Stage 2 - Easy 9x9',
      3: 'Stage 3 - Advanced'
    }

    let currentStage = 0
    Learn.CHALLENGES.forEach((challenge) => {
      if (challenge.stage !== currentStage) {
        currentStage = challenge.stage

        const label = document.createElement('div')
        label.className = 'learn-stage-label'
        label.textContent = stageNames[challenge.stage]
        elements.learnStages.appendChild(label)

        const grid = document.createElement('div')
        grid.className = 'learn-grid'
        grid.dataset.stage = challenge.stage
        elements.learnStages.appendChild(grid)
      }

      const grid = elements.learnStages.querySelector(`.learn-grid[data-stage="${challenge.stage}"]`)
      const card = document.createElement('div')
      const unlocked = Learn.isUnlocked(challenge.id)
      const stars = progress[challenge.id] || 0

      card.className = 'challenge-card'
      if (!unlocked) card.classList.add('locked')
      if (stars > 0) card.classList.add('completed')
      card.innerHTML = `
        <div class="ch-num">${challenge.id}</div>
        <div class="ch-title">${challenge.title}</div>
        <div class="ch-stars">${STAR_FILLED.repeat(stars)}${STAR_EMPTY.repeat(3 - stars)}</div>
      `

      if (unlocked) {
        card.addEventListener('click', () => app.showLesson(challenge.id))
      }

      grid.appendChild(card)
    })
  }

  app.showLesson = (id) => {
    const challenge = Learn.CHALLENGES.find((item) => item.id === id)
    if (!challenge) return

    elements.learnStages.style.display = 'none'
    elements.learnLesson.hidden = false
    elements.lessonBadge.textContent = `Challenge ${challenge.id} | Stage ${challenge.stage}`
    elements.lessonTitle.textContent = challenge.title
    elements.lessonDesc.textContent = challenge.desc
    elements.lessonTip.textContent = `Tip: ${challenge.tip}`
    elements.lessonStart.onclick = () => app.startChallenge(id)
    elements.lessonBack.onclick = () => {
      elements.learnLesson.hidden = true
      elements.learnStages.style.display = ''
    }
  }

  app.startChallenge = (id) => {
    const challenge = Learn.getChallenge(id)
    if (!challenge) return

    elements.learnOverlay.hidden = true
    elements.challengeDone.hidden = true

    state.currentChallenge = challenge
    state.currentChallengeId = challenge.id
    state.isLearnMode = true
    state.difficulty = 'learn'
    state.selected = null
    state.seconds = 0
    state.checks = 0
    state.hints = 0
    state.maxHints = 99
    state.streak = 0
    state.paused = false
    state.solved = false
    state.activeNum = 0
    state.puzzle = challenge.puzzle.map((row) => [...row])
    state.solution = challenge.solution.map((row) => [...row])
    state.given = challenge.puzzle.map((row) => row.map((value) => value !== 0))

    elements.boardEl.classList.remove('won')
    elements.messageEl.textContent = ''
    elements.messageEl.className = ''
    elements.pauseOverlay.hidden = true
    elements.btnPause.textContent = app.PAUSE_ICON
    elements.btnPause.classList.remove('paused')
    app.setActiveNum(0)
    app.syncChallengeBar()
    app.syncDifficultyButtons?.()
    app.renderBoard()
    app.startTimer()
    app.updateHintButton()
    app.updateLearnUI()
    app.saveSession()
  }

  app.endChallenge = () => {
    if (!state.currentChallenge) return

    const stars = Learn.calcStars(state.seconds, state.hints)
    Learn.saveProgress(state.currentChallenge.id, stars)
    app.lastCompletedId = state.currentChallenge.id
    state.currentChallenge = null
    state.currentChallengeId = null

    app.showMessage(
      `${STAR_FILLED.repeat(stars)} Challenge #${app.lastCompletedId} complete!`,
      false
    )
    elements.challengeBar.classList.remove('visible')
    elements.challengeDone.hidden = false

    const nextId = app.lastCompletedId + 1
    const hasNext = nextId <= Learn.CHALLENGES.length && Learn.isUnlocked(nextId)
    elements.doneNext.hidden = !hasNext
    localStorage.removeItem(app.SAVE_KEY)
  }

  app.goToNextChallenge = () => {
    if (!app.lastCompletedId) return
    const nextId = app.lastCompletedId + 1
    if (nextId > Learn.CHALLENGES.length) return

    elements.challengeDone.hidden = true
    app.startChallenge(nextId)
  }

  app.goToChallengeList = () => {
    elements.challengeDone.hidden = true
    app.openLearnOverlay()
  }

  app.showCompletionInOverlay = (id, stars) => {
    const challenge = Learn.CHALLENGES.find((item) => item.id === id)
    if (!challenge) return

    elements.learnStages.style.display = 'none'
    elements.learnLesson.hidden = true
    elements.learnComplete.hidden = false
    elements.completeStars.textContent = `${STAR_FILLED.repeat(stars)}${STAR_EMPTY.repeat(3 - stars)}`
    elements.completeTitle.textContent = `Challenge #${id}: ${challenge.title}`

    const hasNext = id < Learn.CHALLENGES.length
    elements.completeMessage.textContent = hasNext
      ? 'Ready for the next one?'
      : 'You completed all challenges!'
    elements.completeNext.hidden = !hasNext
    elements.completeNext.onclick = () => {
      elements.learnOverlay.hidden = true
      app.startChallenge(id + 1)
    }
    elements.completeBack.onclick = () => {
      elements.learnComplete.hidden = true
      elements.learnStages.style.display = ''
    }
  }

  app.renderLearnOverlays = () => {
    app.updateStreakDisplay()
    if (!state.currentChallenge) return

    const size = state.currentChallenge.size
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (state.puzzle[r][c] !== 0 || state.given[r][c]) continue

        const candidates = size === 4
          ? getMini4Candidates(state.puzzle, r, c)
          : Sudoku.getCandidates(state.puzzle, r, c)
        const cell = app.getCell(r, c)

        cell.classList.add('pencil-marks')
        cell.textContent = candidates.join(' ')
      }
    }

    app.showGuideCell()
  }

  app.showGuideCell = () => {
    app.ui.cells.forEach((cell) => cell.classList.remove('guide-cell'))
    if (!state.currentChallenge) return

    const size = state.currentChallenge.size
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (state.puzzle[r][c] !== 0) continue

        const candidates = size === 4
          ? getMini4Candidates(state.puzzle, r, c)
          : Sudoku.getCandidates(state.puzzle, r, c)

        if (candidates.length === 1) {
          app.getCell(r, c).classList.add('guide-cell')
          return
        }
      }
    }
  }

  app.updateStreakDisplay = () => {
    elements.streakBar.classList.toggle('visible', state.isLearnMode)
    elements.streakValue.textContent = state.streak
  }

  app.updateLearnUI = () => {
    elements.scoreBar.style.display = state.isLearnMode ? 'none' : ''
    elements.streakBar.classList.toggle('visible', state.isLearnMode)
  }

  app.handleLearnPlacement = (r, c, num) => {
    if (num === 0) return true

    const correctValue = state.solution[r][c]
    if (num === correctValue) {
      state.streak += 1
      const cell = app.getCell(r, c)
      cell.classList.add('correct-pop')
      setTimeout(() => cell.classList.remove('correct-pop'), 500)

      if (state.streak === 5) app.showMessage('Nice streak!', false)
      else if (state.streak === 10) app.showMessage('On fire!', false)
      else if (state.streak === 20) app.showMessage('Unstoppable!', false)

      return true
    }

    state.streak = 0
    const cell = app.getCell(r, c)
    cell.classList.add('wrong-flash')
    app.showMessage('Not quite - try again.', true)
    setTimeout(() => {
      state.puzzle[r][c] = 0
      cell.textContent = ''
      cell.classList.remove('wrong-flash')
      app.renderLearnOverlays()
      app.updateNumpadCounts()
    }, 600)
    return false
  }

  app.getMini4Candidates = getMini4Candidates
}
