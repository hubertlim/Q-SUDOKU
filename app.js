(() => {
  const boardEl = document.getElementById('board');
  const messageEl = document.getElementById('message');
  const timerEl = document.getElementById('timer');
  const scoreEl = document.getElementById('score-value');
  const pauseOverlay = document.getElementById('pause-overlay');
  const btnPause = document.getElementById('btn-pause');
  const numBtns = document.querySelectorAll('.num-btn');
  const themeDots = document.querySelectorAll('.theme-dot');

  let puzzle, solution, given;
  let selected = null, timerInterval, seconds = 0;
  let difficulty = 'easy', cells = [], activeNum = 0;
  let paused = false, checks = 0, solved = false;

  const SCORE_MULT = { easy: 1000, medium: 2000, hard: 3000 };
  const SAVE_KEY = 'q-sudoku-save';
  const BEST_KEY = 'q-sudoku-best';

  // ── Theme ──────────────────────────────────────────────────────

  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('q-sudoku-theme', name);
    themeDots.forEach(d => d.classList.toggle('active', d.dataset.theme === name));
  }

  themeDots.forEach(d => d.addEventListener('click', () => setTheme(d.dataset.theme)));

  // ── Scoring ────────────────────────────────────────────────────

  function calcScore() {
    const base = SCORE_MULT[difficulty] || 1000;
    const timePenalty = seconds;
    const checkPenalty = checks * 50;
    return Math.max(0, base - timePenalty - checkPenalty);
  }

  function updateScoreDisplay() {
    scoreEl.textContent = calcScore();
  }

  function loadBestScores() {
    const data = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
    ['easy', 'medium', 'hard'].forEach(d => {
      const el = document.querySelector(`.best[data-diff="${d}"]`);
      const prefix = d[0].toUpperCase();
      el.textContent = data[d] != null ? `${prefix}: ${data[d]}` : `${prefix}: —`;
    });
  }

  function saveBestScore(score) {
    const data = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
    if (data[difficulty] == null || score > data[difficulty]) {
      data[difficulty] = score;
      localStorage.setItem(BEST_KEY, JSON.stringify(data));
    }
    loadBestScores();
  }

  // ── Save / Restore ─────────────────────────────────────────────

  function saveSession() {
    if (solved) { localStorage.removeItem(SAVE_KEY); return; }
    const data = {
      puzzle, solution, given, difficulty,
      seconds, checks, activeNum
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  function loadSession() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      puzzle = data.puzzle;
      solution = data.solution;
      given = data.given;
      difficulty = data.difficulty;
      seconds = data.seconds || 0;
      checks = data.checks || 0;
      activeNum = data.activeNum || 0;
      solved = false;

      document.querySelectorAll('.diff-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.diff === difficulty);
      });
      return true;
    } catch { return false; }
  }

  // ── Pause ──────────────────────────────────────────────────────

  function togglePause() {
    if (solved) return;
    paused = !paused;
    if (paused) {
      clearInterval(timerInterval);
      pauseOverlay.hidden = false;
      btnPause.textContent = '▶';
      btnPause.classList.add('paused');
    } else {
      resumeTimer();
      pauseOverlay.hidden = true;
      btnPause.textContent = '⏸';
      btnPause.classList.remove('paused');
    }
  }

  function resumeTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      seconds++;
      updateTimer();
      updateScoreDisplay();
    }, 1000);
  }

  // ── Board rendering ────────────────────────────────────────────

  function renderBoard() {
    boardEl.innerHTML = '';
    cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '0');
        const v = puzzle[r][c];
        cell.setAttribute('aria-label',
          `Row ${r + 1}, Column ${c + 1}${v ? ', value ' + v : ', empty'}`);

        if (given[r][c]) {
          cell.textContent = v;
          cell.classList.add('given');
        } else if (v) {
          cell.textContent = v;
          cell.classList.add('input');
        } else {
          cell.classList.add('input');
        }

        cell.addEventListener('click', () => onCellClick(r, c));
        cell.addEventListener('keydown', handleCellKey);
        boardEl.appendChild(cell);
        cells.push(cell);
      }
    }
    updateNumpadCounts();
    updateScoreDisplay();
  }

  function getCell(r, c) { return cells[r * 9 + c]; }

  // ── Cell interaction ───────────────────────────────────────────

  function onCellClick(r, c) {
    if (paused || solved) return;
    selectCell(r, c);
    if (activeNum > 0 && !given[r][c]) {
      placeNumber(activeNum);
    }
  }

  function selectCell(r, c) {
    clearHighlights();
    selected = { r, c };
    const cell = getCell(r, c);
    cell.classList.add('selected');
    cell.focus();

    for (let i = 0; i < 9; i++) {
      if (i !== c) getCell(r, i).classList.add('highlight');
      if (i !== r) getCell(i, c).classList.add('highlight');
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const rr = br + dr, cc = bc + dc;
        if (rr !== r || cc !== c) getCell(rr, cc).classList.add('highlight');
      }
    }

    const v = puzzle[r][c];
    if (v) {
      for (let i = 0; i < 81; i++) {
        const rr = Math.floor(i / 9), cc = i % 9;
        if (puzzle[rr][cc] === v && (rr !== r || cc !== c)) {
          cells[i].classList.add('same-num');
        }
      }
    }
  }

  function clearHighlights() {
    cells.forEach(c => c.classList.remove('selected', 'highlight', 'same-num', 'error'));
  }

  function placeNumber(num) {
    if (!selected || paused || solved) return;
    const { r, c } = selected;
    if (given[r][c]) return;

    puzzle[r][c] = num;
    const cell = getCell(r, c);
    cell.textContent = num || '';
    cell.classList.add('pop');
    setTimeout(() => cell.classList.remove('pop'), 150);

    selectCell(r, c);
    updateNumpadCounts();
    updateScoreDisplay();
    saveSession();
    checkWin();
  }

  function handleCellKey(e) {
    if (!selected || paused || solved) return;
    const { r, c } = selected;
    let handled = true;

    if (e.key >= '1' && e.key <= '9') placeNumber(parseInt(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') placeNumber(0);
    else if (e.key === 'ArrowUp' && r > 0) selectCell(r - 1, c);
    else if (e.key === 'ArrowDown' && r < 8) selectCell(r + 1, c);
    else if (e.key === 'ArrowLeft' && c > 0) selectCell(r, c - 1);
    else if (e.key === 'ArrowRight' && c < 8) selectCell(r, c + 1);
    else handled = false;

    if (handled) e.preventDefault();
  }

  // ── Numpad state ───────────────────────────────────────────────

  function updateNumpadCounts() {
    const counts = new Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c]) counts[puzzle[r][c]]++;
      }
    }
    numBtns.forEach(btn => {
      const num = parseInt(btn.dataset.num);
      if (num === 0) return;
      const remaining = 9 - counts[num];
      let badge = btn.querySelector('.count');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'count';
        btn.appendChild(badge);
      }
      badge.textContent = remaining;
      btn.classList.toggle('completed', remaining <= 0);
    });
  }

  function setActiveNum(num) {
    activeNum = (activeNum === num) ? 0 : num;
    numBtns.forEach(btn => {
      btn.classList.toggle('active-num', parseInt(btn.dataset.num) === activeNum && activeNum > 0);
    });
  }

  // ── Timer ──────────────────────────────────────────────────────

  function startTimer() {
    clearInterval(timerInterval);
    updateTimer();
    timerInterval = setInterval(() => {
      seconds++;
      updateTimer();
      updateScoreDisplay();
    }, 1000);
  }

  function stopTimer() { clearInterval(timerInterval); }

  function updateTimer() {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  // ── Game logic ─────────────────────────────────────────────────

  function newGame() {
    messageEl.textContent = '';
    messageEl.className = '';
    boardEl.classList.remove('won');
    pauseOverlay.hidden = true;
    paused = false;
    solved = false;
    checks = 0;
    seconds = 0;
    activeNum = 0;
    btnPause.textContent = '⏸';
    btnPause.classList.remove('paused');
    numBtns.forEach(btn => btn.classList.remove('active-num'));

    const result = Sudoku.generate(difficulty);
    puzzle = result.puzzle;
    solution = result.solution;
    given = result.puzzle.map(r => r.map(v => v !== 0));
    selected = null;

    renderBoard();
    startTimer();
    saveSession();
  }

  function restoreGame() {
    messageEl.textContent = '';
    messageEl.className = '';
    boardEl.classList.remove('won');
    pauseOverlay.hidden = true;
    paused = false;
    solved = false;
    btnPause.textContent = '⏸';
    btnPause.classList.remove('paused');
    numBtns.forEach(btn => btn.classList.remove('active-num'));
    selected = null;

    renderBoard();
    startTimer();
    showMessage('Game restored.', false);
  }

  function checkBoard() {
    if (paused || solved) return;
    checks++;
    const errors = Sudoku.getErrors(puzzle);
    clearHighlights();
    updateScoreDisplay();
    saveSession();
    if (errors.size === 0) {
      const empty = puzzle.flat().some(v => v === 0);
      showMessage(empty ? 'No errors so far.' : 'Perfect.', false);
    } else {
      errors.forEach(i => cells[i].classList.add('error'));
      showMessage(`${errors.size / 2} conflict${errors.size > 2 ? 's' : ''} found. (−50 pts)`, true);
    }
  }

  function solveBoard() {
    if (paused) return;
    solved = true;
    puzzle = solution.map(r => [...r]);
    renderBoard();
    stopTimer();
    scoreEl.textContent = '0';
    localStorage.removeItem(SAVE_KEY);
    showMessage('Solved. No score awarded.', false);
  }

  function checkWin() {
    if (puzzle.flat().some(v => v === 0)) return;
    const errors = Sudoku.getErrors(puzzle);
    if (errors.size === 0) {
      solved = true;
      stopTimer();
      boardEl.classList.add('won');
      const score = calcScore();
      saveBestScore(score);
      localStorage.removeItem(SAVE_KEY);
      showMessage(`Solved in ${timerEl.textContent} — Score: ${score}`, false);
    }
  }

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = isError ? 'error' : '';
  }

  // ── Event binding ──────────────────────────────────────────────

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
      newGame();
    });
  });

  numBtns.forEach(btn => {
    const num = parseInt(btn.dataset.num);
    btn.addEventListener('click', () => {
      if (paused || solved) return;
      if (num === 0) { placeNumber(0); return; }
      setActiveNum(num);
      if (selected && activeNum > 0 && !given[selected.r][selected.c]) {
        placeNumber(activeNum);
      }
    });
  });

  document.getElementById('btn-new').addEventListener('click', newGame);
  document.getElementById('btn-check').addEventListener('click', checkBoard);
  document.getElementById('btn-solve').addEventListener('click', solveBoard);
  btnPause.addEventListener('click', togglePause);
  document.getElementById('btn-resume').addEventListener('click', togglePause);

  boardEl.addEventListener('keydown', (e) => {
    if (paused || solved) return;
    if (e.key >= '1' && e.key <= '9') {
      placeNumber(parseInt(e.key));
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      placeNumber(0);
      e.preventDefault();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') togglePause();
  });

  window.addEventListener('beforeunload', () => { stopTimer(); saveSession(); });

  // ── Init ───────────────────────────────────────────────────────
  setTheme(localStorage.getItem('q-sudoku-theme') || 'midnight');
  loadBestScores();

  if (loadSession()) {
    restoreGame();
  } else {
    newGame();
  }
})();
