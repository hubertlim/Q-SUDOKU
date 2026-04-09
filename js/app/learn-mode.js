import { Learn } from '../../learn.js'
import { Sudoku } from '../../sudoku.js'

const STAR_FILLED = '\u2605'
const STAR_EMPTY = '\u2606'

export function attachLearnMode(app) {
  const { elements, state } = app

  app.learn = Learn

  function techniqueLabel(technique) {
    switch (technique) {
      case 'naked-single':
        return 'Naked single'
      case 'hidden-single':
        return 'Hidden single'
      case 'box-single':
        return 'Box scan'
      default:
        return 'Next forced move'
    }
  }

  function supportIndex(level) {
    return Learn.SUPPORT_LEVELS.indexOf(Learn.clampSupport(level))
  }

  function getSupportProfile() {
    const support = Learn.clampSupport(state.learnSupportLevel)
    return {
      support,
      showAllCandidates: support === 'modelled',
      showSelectedCandidates: support === 'guided',
      autoHighlight: support === 'modelled' || state.learnHintStep >= 2
    }
  }

  function getCurrentTargets() {
    if (!state.currentChallenge || !state.puzzle) return []
    return Learn.findTargets(state.puzzle, state.currentChallenge.focus)
  }

  function getPrimaryTarget() {
    return getCurrentTargets()[0] || null
  }

  function clearLearnPresentation() {
    app.ui.cells.forEach((cell) => {
      cell.classList.remove('guide-cell', 'pencil-marks')
      const row = Number(cell.dataset.r)
      const col = Number(cell.dataset.c)
      if (!state.given?.[row]?.[col] && !state.puzzle?.[row]?.[col]) {
        cell.textContent = ''
      }
    })
  }

  function highlightTarget(target) {
    if (!target) return
    app.getCell(target.r, target.c).classList.add('guide-cell')
  }

  function updateProgressText() {
    if (!state.currentChallenge) return ''
    return `${state.currentChallenge.title} ${state.learnCompletedSteps}/${state.learnGoalSteps}`
  }

  function applySupportIncrease() {
    const current = supportIndex(state.learnSupportLevel)
    if (current >= Learn.SUPPORT_LEVELS.length - 1) return false
    app.setLearnSupport(Learn.SUPPORT_LEVELS[current + 1], { silent: true })
    app.showMessage(
      `Support increased to ${Learn.getSupportLabel(state.learnSupportLevel)} so the next move is easier to read.`,
      false
    )
    return true
  }

  function applySupportDecrease() {
    const current = supportIndex(state.learnSupportLevel)
    if (current <= 0) return false
    app.setLearnSupport(Learn.SUPPORT_LEVELS[current - 1], { silent: true })
    app.showMessage(
      `Support reduced to ${Learn.getSupportLabel(state.learnSupportLevel)}. Try finding the next move more independently.`,
      false
    )
    return true
  }

  function noteStruggle() {
    state.learnRecentStruggles += 1
    state.learnRecentSuccesses = 0
    if (state.learnRecentStruggles >= 2) {
      state.learnRecentStruggles = 0
      applySupportIncrease()
    }
  }

  function noteSuccess(withoutHints) {
    state.learnRecentStruggles = 0
    if (!withoutHints) {
      state.learnRecentSuccesses = 0
      return
    }
    state.learnRecentSuccesses += 1
    if (state.learnRecentSuccesses >= 2) {
      state.learnRecentSuccesses = 0
      applySupportDecrease()
    }
  }

  function setBoardFromRound(round) {
    state.puzzle = round.puzzle.map((row) => [...row])
    state.solution = round.solution.map((row) => [...row])
    state.given = round.puzzle.map((row) => row.map((value) => value !== 0))
    state.selected = null
    state.learnHintStep = 0
  }

  function loadNextRound(showCoachMessage = true) {
    if (!state.currentChallenge) return

    const round = Learn.getSessionBoard(state.currentChallenge.id)
    setBoardFromRound(round)
    app.renderBoard()
    app.updateHintButton()
    app.updateLearnUI()
    app.syncChallengeBar()
    app.saveSession()

    if (showCoachMessage) {
      app.showMessage(
        `Find a ${techniqueLabel(getPrimaryTarget()?.technique)} on this board.`,
        false
      )
    }
  }

  function completeLearnStep(message) {
    state.learnCompletedSteps += 1
    app.syncChallengeBar()
    app.saveSession()

    if (state.learnCompletedSteps >= state.learnGoalSteps) {
      app.endChallenge()
      return
    }

    setTimeout(() => {
      loadNextRound(false)
      app.showMessage(message, false)
    }, 260)
  }

  app.setLearnSupport = (level, options = {}) => {
    const nextLevel = Learn.clampSupport(level)
    state.learnSupportLevel = nextLevel

    if (supportIndex(nextLevel) > supportIndex(state.learnSupportUsed)) {
      state.learnSupportUsed = nextLevel
    }

    app.syncChallengeBar()
    if (state.isLearnMode) app.renderLearnOverlays()
    if (!options.silent) {
      app.showMessage(`Support set to ${Learn.getSupportLabel(nextLevel)}.`, false)
    }
    app.saveSession()
  }

  app.cycleLearnSupport = () => {
    const current = supportIndex(state.learnSupportLevel)
    const next = Learn.SUPPORT_LEVELS[(current + 1) % Learn.SUPPORT_LEVELS.length]
    app.setLearnSupport(next)
  }

  app.syncChallengeBar = () => {
    if (!state.currentChallenge) {
      elements.challengeBar.classList.remove('visible')
      return
    }

    elements.challengeBar.classList.add('visible')
    elements.challengeInfo.textContent = updateProgressText()
    elements.challengeSupportButton.textContent = Learn.getSupportLabel(state.learnSupportLevel)
    elements.challengeTipButton.textContent = 'Coach'
    elements.challengeSupportButton.onclick = app.cycleLearnSupport
    elements.challengeTipButton.onclick = app.useLearnHint
  }

  app.openLearnOverlay = () => {
    elements.learnOverlay.hidden = false
    elements.learnLesson.hidden = true
    elements.learnComplete.hidden = true
    elements.learnStages.style.display = ''
    elements.learnStages.innerHTML = ''
    elements.learnStarsTotal.textContent =
      `Stars ${Learn.getTotalStars()} / ${Learn.LESSONS.length * 3}`

    const progress = Learn.getProgress()
    const stageNames = {
      1: 'Stage 1 - Foundations',
      2: 'Stage 2 - Scan Better',
      3: 'Stage 3 - Fluency'
    }

    let currentStage = 0
    Learn.LESSONS.forEach((lesson) => {
      if (lesson.stage !== currentStage) {
        currentStage = lesson.stage

        const label = document.createElement('div')
        label.className = 'learn-stage-label'
        label.textContent = stageNames[lesson.stage]
        elements.learnStages.appendChild(label)

        const grid = document.createElement('div')
        grid.className = 'learn-grid'
        grid.dataset.stage = lesson.stage
        elements.learnStages.appendChild(grid)
      }

      const grid = elements.learnStages.querySelector(`.learn-grid[data-stage="${lesson.stage}"]`)
      const card = document.createElement('div')
      const unlocked = Learn.isUnlocked(lesson.id)
      const stars = progress[lesson.id] || 0

      card.className = 'challenge-card'
      if (!unlocked) card.classList.add('locked')
      if (stars > 0) card.classList.add('completed')
      card.innerHTML = `
        <div class="ch-num">${lesson.id}</div>
        <div class="ch-title">${lesson.title}</div>
        <div class="ch-stars">${STAR_FILLED.repeat(stars)}${STAR_EMPTY.repeat(3 - stars)}</div>
      `

      if (unlocked) {
        card.addEventListener('click', () => app.showLesson(lesson.id))
      }

      grid.appendChild(card)
    })
  }

  app.showLesson = (id) => {
    const lesson = Learn.getLessonMeta(id)
    if (!lesson) return

    elements.learnStages.style.display = 'none'
    elements.learnLesson.hidden = false
    elements.lessonBadge.textContent = `Lesson ${lesson.id} | ${lesson.roundsRequired} move session`
    elements.lessonTitle.textContent = lesson.title
    elements.lessonDesc.textContent = lesson.desc
    elements.lessonWhy.textContent = lesson.why
    elements.lessonLook.textContent = lesson.lookFor
    elements.lessonPractice.textContent = lesson.practice
    elements.lessonSupport.textContent = Learn.getSupportLabel(lesson.defaultSupport)
    elements.lessonTip.textContent = `Coach cue: ${lesson.tip}`
    elements.lessonStart.onclick = () => app.startChallenge(id)
    elements.lessonBack.onclick = () => {
      elements.learnLesson.hidden = true
      elements.learnStages.style.display = ''
    }
  }

  app.startChallenge = (id) => {
    const lesson = Learn.getLessonMeta(id)
    if (!lesson) return

    elements.learnOverlay.hidden = true
    elements.challengeDone.hidden = true

    state.currentChallenge = lesson
    state.currentChallengeId = lesson.id
    state.isLearnMode = true
    state.difficulty = 'learn'
    state.seconds = 0
    state.checks = 0
    state.hints = 0
    state.maxHints = 99
    state.streak = 0
    state.learnMistakes = 0
    state.learnSupportLevel = lesson.defaultSupport
    state.learnSupportUsed = lesson.defaultSupport
    state.learnCompletedSteps = 0
    state.learnGoalSteps = lesson.roundsRequired
    state.learnRecentSuccesses = 0
    state.learnRecentStruggles = 0
    state.paused = false
    state.solved = false
    state.activeNum = 0

    elements.boardEl.classList.remove('won')
    elements.messageEl.textContent = ''
    elements.messageEl.className = ''
    elements.pauseOverlay.hidden = true
    elements.btnPause.textContent = app.PAUSE_ICON
    elements.btnPause.classList.remove('paused')
    app.setActiveNum(0)
    app.syncDifficultyButtons?.()
    loadNextRound(false)
    app.startTimer()
    app.showMessage(`Find the next ${lesson.title.toLowerCase()} move.`, false)
  }

  app.endChallenge = () => {
    if (!state.currentChallenge) return

    const stars = Learn.calcStars({
      supportLevel: state.learnSupportUsed,
      usedHints: state.hints,
      mistakes: state.learnMistakes
    })

    Learn.saveProgress(state.currentChallenge.id, stars)
    app.lastCompletedId = state.currentChallenge.id
    const title = state.currentChallenge.title
    state.isLearnMode = false
    state.solved = true
    state.currentChallenge = null
    state.currentChallengeId = null
    app.stopTimer()
    app.updateLearnUI()

    app.showMessage(
      `${STAR_FILLED.repeat(stars)} ${title} session complete.`,
      false
    )
    elements.challengeBar.classList.remove('visible')
    elements.challengeDone.hidden = false

    const nextId = app.lastCompletedId + 1
    const hasNext = nextId <= Learn.LESSONS.length && Learn.isUnlocked(nextId)
    elements.doneNext.hidden = !hasNext
    localStorage.removeItem(app.SAVE_KEY)
  }

  app.goToNextChallenge = () => {
    if (!app.lastCompletedId) return
    const nextId = app.lastCompletedId + 1
    if (nextId > Learn.LESSONS.length) return

    elements.challengeDone.hidden = true
    app.startChallenge(nextId)
  }

  app.goToChallengeList = () => {
    elements.challengeDone.hidden = true
    app.openLearnOverlay()
  }

  app.renderLearnOverlays = () => {
    if (!state.currentChallenge) return

    app.updateStreakDisplay()
    clearLearnPresentation()

    const profile = getSupportProfile()
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (state.puzzle[r][c] !== 0 || state.given[r][c]) continue

        const cell = app.getCell(r, c)
        const candidates = Sudoku.getCandidates(state.puzzle, r, c)
        const isSelected = state.selected && state.selected.r === r && state.selected.c === c

        if (profile.showAllCandidates || (profile.showSelectedCandidates && isSelected)) {
          cell.classList.add('pencil-marks')
          cell.textContent = candidates.join(' ')
        }
      }
    }

    if (profile.autoHighlight) {
      highlightTarget(getPrimaryTarget())
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
    const targets = getCurrentTargets()
    const target = targets.find((move) => move.r === r && move.c === c && move.value === num)
    const correctButOffFocus = state.solution[r][c] === num

    if (!target) {
      state.learnMistakes += 1
      state.streak = 0
      noteStruggle()

      const cell = app.getCell(r, c)
      cell.classList.add('wrong-flash')
      setTimeout(() => cell.classList.remove('wrong-flash'), 500)

      if (correctButOffFocus) {
        app.showMessage('Correct Sudoku value, but not the target technique for this drill.', true)
      } else {
        app.showMessage('Not quite. Re-read the board and look for a forced move.', true)
      }
      app.updateStreakDisplay()
      app.saveSession()
      return true
    }

    state.puzzle[r][c] = num
    state.streak += 1

    const cell = app.getCell(r, c)
    cell.classList.remove('pencil-marks', 'guide-cell')
    cell.textContent = num
    cell.classList.add('correct-pop')
    setTimeout(() => cell.classList.remove('correct-pop'), 300)

    const solvedWithoutHints = state.learnHintStep === 0
    noteSuccess(solvedWithoutHints)
    state.learnHintStep = 0
    app.updateStreakDisplay()
    app.updateNumpadCounts()
    app.updateScoreDisplay()
    app.saveSession()
    completeLearnStep(`Nice. That was a ${techniqueLabel(target.technique).toLowerCase()}.`)
    return true
  }

  app.useLearnHint = () => {
    if (!state.currentChallenge) return

    const target = getPrimaryTarget()
    if (!target) {
      loadNextRound()
      return
    }

    state.hints += 1
    noteStruggle()

    if (state.learnHintStep === 0) {
      state.learnHintStep = 1
      app.showMessage(`Coach: ${state.currentChallenge.lookFor}`, false)
    } else if (state.learnHintStep === 1) {
      state.learnHintStep = 2
      app.renderLearnOverlays()
      app.showMessage(`Coach: ${Learn.getUnitCue(target)}`, false)
    } else if (state.learnHintStep === 2) {
      state.learnHintStep = 3
      app.renderLearnOverlays()
      app.showMessage(`Coach: ${Learn.describeMove(target)}`, false)
    } else {
      state.learnHintStep = 0
      state.puzzle[target.r][target.c] = target.value
      completeLearnStep(`Coach reveal: ${target.value} at R${target.r + 1}C${target.c + 1}.`)
    }

    app.updateHintButton()
    app.saveSession()
  }
}
