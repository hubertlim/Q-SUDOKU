import { createAppState } from './state.js'
import { attachBoardUI } from './board-ui.js'
import { attachLearnMode } from './learn-mode.js'
import { attachGameController } from './game-controller.js'

function collectElements() {
  return {
    appEl: document.getElementById('app'),
    bestEls: [...document.querySelectorAll('.best')],
    boardEl: document.getElementById('board'),
    btnCheck: document.getElementById('btn-check'),
    btnHint: document.getElementById('btn-hint'),
    btnNew: document.getElementById('btn-new'),
    btnPause: document.getElementById('btn-pause'),
    btnResume: document.getElementById('btn-resume'),
    btnSolve: document.getElementById('btn-solve'),
    challengeBar: document.getElementById('challenge-bar'),
    challengeDone: document.getElementById('challenge-done'),
    challengeInfo: document.getElementById('ch-bar-info'),
    challengeTipButton: document.getElementById('ch-bar-tip'),
    completeBack: document.getElementById('complete-back'),
    completeMessage: document.getElementById('complete-msg'),
    completeNext: document.getElementById('complete-next'),
    completeStars: document.getElementById('complete-stars'),
    completeTitle: document.getElementById('complete-title'),
    confirmBar: document.getElementById('confirm-bar'),
    confirmNo: document.getElementById('confirm-no'),
    confirmText: document.getElementById('confirm-text'),
    confirmYes: document.getElementById('confirm-yes'),
    diffBtns: [...document.querySelectorAll('.diff-btn')],
    doneList: document.getElementById('done-list'),
    doneNext: document.getElementById('done-next'),
    gameEl: document.getElementById('game'),
    hintCount: document.getElementById('hint-count'),
    learnClose: document.getElementById('learn-close'),
    learnComplete: document.getElementById('learn-complete'),
    learnLesson: document.getElementById('learn-lesson'),
    learnOverlay: document.getElementById('learn-overlay'),
    learnStages: document.getElementById('learn-stages'),
    learnStarsTotal: document.getElementById('learn-stars-total'),
    lessonBack: document.getElementById('lesson-back'),
    lessonBadge: document.getElementById('lesson-badge'),
    lessonDesc: document.getElementById('lesson-desc'),
    lessonStart: document.getElementById('lesson-start'),
    lessonTip: document.getElementById('lesson-tip'),
    lessonTitle: document.getElementById('lesson-title'),
    messageEl: document.getElementById('message'),
    numBtns: [...document.querySelectorAll('.num-btn')],
    pauseOverlay: document.getElementById('pause-overlay'),
    scoreBar: document.getElementById('score-bar'),
    scoreEl: document.getElementById('score-value'),
    streakBar: document.getElementById('streak-bar'),
    streakValue: document.getElementById('streak-value'),
    themeDots: [...document.querySelectorAll('.theme-dot')],
    timerEl: document.getElementById('timer'),
    welcomeContinue: document.getElementById('w-continue'),
    welcomeDiffBtns: [...document.querySelectorAll('.w-diff')],
    welcomeEl: document.getElementById('welcome'),
    welcomeLearn: document.getElementById('w-learn'),
    welcomePlay: document.getElementById('w-play'),
    welcomeStats: document.getElementById('welcome-stats')
  }
}

const elements = collectElements()
const app = createAppState(elements)

attachBoardUI(app)
attachLearnMode(app)
attachGameController(app)

app.syncDifficultyButtons = () => {
  elements.diffBtns.forEach((button) => {
    button.classList.toggle('active', button.dataset.diff === app.state.difficulty)
  })
}

let confirmCallback = null

function hasActiveGame() {
  const { state } = app
  if (state.solved || !state.puzzle) return false
  if (state.isLearnMode) return true

  const size = app.getBoardSize()
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!state.given[r][c] && state.puzzle[r][c] !== 0) return true
    }
  }

  return state.seconds > 5
}

function dismissConfirm() {
  elements.confirmBar.hidden = true
  elements.messageEl.style.display = ''
  confirmCallback = null
}

function confirmAction(message, callback) {
  if (!hasActiveGame()) {
    callback()
    return
  }

  elements.confirmText.textContent = message
  elements.confirmBar.hidden = false
  elements.messageEl.style.display = 'none'
  confirmCallback = callback
}

function showWelcome() {
  app.stopTimer()
  elements.welcomeEl.hidden = false
  elements.welcomeEl.classList.remove('fade-out')
  elements.appEl.hidden = true

  elements.welcomeDiffBtns.forEach((button) => {
    button.classList.toggle('active', button.dataset.diff === app.state.welcomeDifficulty)
  })

  elements.welcomeContinue.hidden = !localStorage.getItem(app.SAVE_KEY)

  const best = JSON.parse(localStorage.getItem(app.BEST_KEY) || '{}')
  const parts = []
  if (best.easy != null) parts.push(`E: ${best.easy}`)
  if (best.medium != null) parts.push(`M: ${best.medium}`)
  if (best.hard != null) parts.push(`H: ${best.hard}`)

  const stars = app.learn.getTotalStars()
  if (stars > 0) parts.push(`Stars ${stars}/${app.learn.CHALLENGES.length * 3}`)
  elements.welcomeStats.textContent = parts.join(' | ')
}

function dismissWelcome(callback) {
  elements.welcomeEl.classList.add('fade-out')
  setTimeout(() => {
    elements.welcomeEl.hidden = true
    elements.appEl.hidden = false
    if (callback) callback()
  }, 400)
}

app.dismissConfirm = dismissConfirm

elements.confirmYes.addEventListener('click', () => {
  const callback = confirmCallback
  dismissConfirm()
  if (callback) callback()
})
elements.confirmNo.addEventListener('click', dismissConfirm)

elements.themeDots.forEach((dot) => {
  dot.addEventListener('click', () => app.setTheme(dot.dataset.theme))
})

elements.diffBtns.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.diff === 'learn') {
      confirmAction('Leave the current game and open Learn mode?', () => app.openLearnOverlay())
      return
    }

    const label = button.dataset.diff[0].toUpperCase() + button.dataset.diff.slice(1)
    const switchDifficulty = () => {
      app.state.difficulty = button.dataset.diff
      app.state.lastStandardDifficulty = button.dataset.diff
      app.syncDifficultyButtons()
      app.newGame()
    }

    if (button.dataset.diff === app.state.difficulty && !app.state.isLearnMode) {
      confirmAction(`Start a new ${label} game?`, switchDifficulty)
      return
    }

    confirmAction(`Switch to ${label}? The current game will be lost.`, switchDifficulty)
  })
})

elements.numBtns.forEach((button) => {
  const num = Number(button.dataset.num)
  button.addEventListener('click', () => {
    if (app.state.paused || app.state.solved) return
    if (num === 0) {
      app.placeNumber(0)
      return
    }

    app.setActiveNum(num)
    if (app.state.selected && !app.state.given[app.state.selected.r][app.state.selected.c]) {
      app.placeNumber(num)
    }
  })
})

elements.btnNew.addEventListener('click', () => confirmAction('Start a new game?', app.newGame))
elements.btnCheck.addEventListener('click', app.checkBoard)
elements.btnHint.addEventListener('click', app.useHint)
elements.btnSolve.addEventListener('click', () => {
  confirmAction('Reveal the solution? No score will be awarded.', app.solveBoard)
})
elements.learnClose.addEventListener('click', () => {
  elements.learnOverlay.hidden = true
})
elements.doneNext.addEventListener('click', app.goToNextChallenge)
elements.doneList.addEventListener('click', app.goToChallengeList)
elements.btnPause.addEventListener('click', app.togglePause)
elements.btnResume.addEventListener('click', app.togglePause)

elements.boardEl.addEventListener('keydown', (event) => {
  if (app.state.paused || app.state.solved) return
  const maxNum = app.getMaxNum()

  if (event.key >= '1' && event.key <= String(maxNum)) {
    app.placeNumber(Number(event.key))
    event.preventDefault()
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    app.placeNumber(0)
    event.preventDefault()
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') app.togglePause()
  if (event.key === 'h' || event.key === 'H') app.useHint()
})

window.addEventListener('beforeunload', () => {
  app.stopTimer()
  app.flushSessionSave()
})

elements.welcomeDiffBtns.forEach((button) => {
  button.addEventListener('click', () => {
    app.state.welcomeDifficulty = button.dataset.diff
    localStorage.setItem('q-sudoku-diff', app.state.welcomeDifficulty)
    elements.welcomeDiffBtns.forEach((pill) => {
      pill.classList.toggle('active', pill === button)
    })
  })
})

elements.welcomePlay.addEventListener('click', () => {
  app.state.difficulty = app.state.welcomeDifficulty
  app.state.lastStandardDifficulty = app.state.welcomeDifficulty
  app.syncDifficultyButtons()
  dismissWelcome(() => app.newGame())
})

elements.welcomeContinue.addEventListener('click', () => {
  if (!app.loadSession()) return
  app.syncDifficultyButtons()
  dismissWelcome(() => app.restoreGame())
})

elements.welcomeLearn.addEventListener('click', () => {
  dismissWelcome(() => {
    app.state.difficulty = app.state.welcomeDifficulty
    app.state.lastStandardDifficulty = app.state.welcomeDifficulty
    app.syncDifficultyButtons()
    app.newGame()
    app.openLearnOverlay()
  })
})

app.setTheme(localStorage.getItem(app.THEME_KEY) || 'midnight')
app.loadBestScores()
showWelcome()
