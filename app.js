(() => {
  const boardEl = document.getElementById('board');
  const messageEl = document.getElementById('message');
  const timerEl = document.getElementById('timer');
  const numBtns = document.querySelectorAll('.num-btn');
  const themeDots = document.querySelectorAll('.theme-dot');

  let puzzle, solution, selected = null, timerInterval, seconds = 0;
  let difficulty = 'easy';
  let cells = [];
  let activeNum = 0;

  // ── Theme ──────────────────────────────────────────────────────

  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('q-sudoku-theme', name);
    themeDots.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === name);
    });
  }

  function initTheme() {
    const saved = localStorage.getItem('q-sudoku-theme') || 'midnight';
    setTheme(saved);
  }

  themeDots.forEach(dot => {
    dot.addEventListener('click', () => setTheme(dot.dataset.theme));
  });

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

        if (v) {
          cell.textContent = v;
          cell.classList.add('given');
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
  }

  function getCell(r, c) { return cells[r * 9 + c]; }

  // ── Cell interaction ───────────────────────────────────────────

  function onCellClick(r, c) {
    selectCell(r, c);
    if (activeNum > 0 && !getCell(r, c).classList.contains('given')) {
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
    if (!selected) return;
    const { r, c } = selected;
    const cell = getCell(r, c);
    if (cell.classList.contains('given')) return;

    puzzle[r][c] = num;
    cell.textContent = num || '';
    cell.classList.add('pop');
    setTimeout(() => cell.classList.remove('pop'), 150);

    selectCell(r, c);
    updateNumpadCounts();
    checkWin();
  }

  function handleCellKey(e) {
    if (!selected) return;
    const { r, c } = selected;
    let handled = true;

    if (e.key >= '1' && e.key <= '9') {
      placeNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      placeNumber(0);
    } else if (e.key === 'ArrowUp' && r > 0) selectCell(r - 1, c);
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
        const v = puzzle[r][c];
        if (v) counts[v]++;
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
    if (activeNum === num) {
      activeNum = 0;
    } else {
      activeNum = num;
    }
    numBtns.forEach(btn => {
      btn.classList.toggle('active-num', parseInt(btn.dataset.num) === activeNum && activeNum > 0);
    });
  }

  // ── Timer ──────────────────────────────────────────────────────

  function startTimer() {
    stopTimer();
    seconds = 0;
    updateTimer();
    timerInterval = setInterval(() => { seconds++; updateTimer(); }, 1000);
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
    activeNum = 0;
    numBtns.forEach(btn => btn.classList.remove('active-num'));
    const result = Sudoku.generate(difficulty);
    puzzle = result.puzzle;
    solution = result.solution;
    selected = null;
    renderBoard();
    startTimer();
  }

  function checkBoard() {
    const errors = Sudoku.getErrors(puzzle);
    clearHighlights();
    if (errors.size === 0) {
      const empty = puzzle.flat().some(v => v === 0);
      if (empty) {
        showMessage('No errors so far, keep going.', false);
      } else {
        showMessage('Perfect. You solved it.', false);
      }
    } else {
      errors.forEach(i => cells[i].classList.add('error'));
      showMessage('Some conflicts found.', true);
    }
  }

  function solveBoard() {
    puzzle = solution.map(r => [...r]);
    renderBoard();
    stopTimer();
    showMessage('Solved.', false);
  }

  function checkWin() {
    const empty = puzzle.flat().some(v => v === 0);
    if (empty) return;
    const errors = Sudoku.getErrors(puzzle);
    if (errors.size === 0) {
      stopTimer();
      boardEl.classList.add('won');
      showMessage(`Solved in ${timerEl.textContent}`, false);
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
      if (num === 0) {
        placeNumber(0);
        return;
      }
      setActiveNum(num);
      if (selected && activeNum > 0) {
        const cell = getCell(selected.r, selected.c);
        if (!cell.classList.contains('given')) {
          placeNumber(activeNum);
        }
      }
    });
  });

  document.getElementById('btn-new').addEventListener('click', newGame);
  document.getElementById('btn-check').addEventListener('click', checkBoard);
  document.getElementById('btn-solve').addEventListener('click', solveBoard);

  // Keyboard input when board is focused
  boardEl.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
      placeNumber(parseInt(e.key));
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      placeNumber(0);
      e.preventDefault();
    }
  });

  window.addEventListener('beforeunload', stopTimer);

  // ── Init ───────────────────────────────────────────────────────
  initTheme();
  newGame();
})();
