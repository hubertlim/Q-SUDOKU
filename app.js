(() => {
  const boardEl = document.getElementById('board');
  const messageEl = document.getElementById('message');
  const timerEl = document.getElementById('timer');

  let puzzle, solution, selected = null, timerInterval, seconds = 0;
  let difficulty = 'easy';
  let cells = [];

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
        cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);

        const v = puzzle[r][c];
        if (v) {
          cell.textContent = v;
          cell.classList.add('given');
        } else {
          cell.classList.add('input');
        }

        cell.addEventListener('click', () => selectCell(r, c));
        cell.addEventListener('keydown', handleCellKey);
        boardEl.appendChild(cell);
        cells.push(cell);
      }
    }
  }

  function getCell(r, c) { return cells[r * 9 + c]; }

  function selectCell(r, c) {
    clearHighlights();
    selected = { r, c };
    const cell = getCell(r, c);
    cell.classList.add('selected');

    // Highlight row, col, box
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

    // Highlight same number
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
    setTimeout(() => cell.classList.remove('pop'), 200);

    // Re-select to update highlights
    selectCell(r, c);
    checkWin();
  }

  function handleCellKey(e) {
    if (!selected) return;
    const { r, c } = selected;

    if (e.key >= '1' && e.key <= '9') {
      placeNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      placeNumber(0);
    } else if (e.key === 'ArrowUp' && r > 0) selectCell(r - 1, c);
    else if (e.key === 'ArrowDown' && r < 8) selectCell(r + 1, c);
    else if (e.key === 'ArrowLeft' && c > 0) selectCell(r, c - 1);
    else if (e.key === 'ArrowRight' && c < 8) selectCell(r, c + 1);

    e.preventDefault();
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

  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => placeNumber(parseInt(btn.dataset.num)));
  });

  document.getElementById('btn-new').addEventListener('click', newGame);
  document.getElementById('btn-check').addEventListener('click', checkBoard);
  document.getElementById('btn-solve').addEventListener('click', solveBoard);

  // Keyboard input anywhere
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') placeNumber(parseInt(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete') placeNumber(0);
  });

  // ── Init ───────────────────────────────────────────────────────
  newGame();
})();
