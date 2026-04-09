export function attachBoardUI(app) {
  const { elements, state, ui } = app

  const handlers = {
    onCellClick: () => {},
    onCellKey: () => {}
  }

  app.setCellHandlers = (nextHandlers) => {
    Object.assign(handlers, nextHandlers)
  }

  app.getCell = (r, c) => ui.cells[r * app.getBoardSize() + c]

  app.renderBoard = () => {
    if (!state.puzzle || !state.given) return

    elements.boardEl.innerHTML = ''
    elements.boardEl.className = ''
    ui.cells = []

    const size = app.getBoardSize()
    const maxNum = app.getMaxNum()

    elements.gameEl.classList.toggle('game-mini', size === 4)
    if (size === 4) elements.boardEl.classList.add('board-4')

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const cell = document.createElement('div')
        const value = state.puzzle[r][c]

        cell.className = 'cell'
        cell.dataset.r = r
        cell.dataset.c = c
        cell.setAttribute('role', 'gridcell')
        cell.setAttribute('tabindex', '0')
        cell.setAttribute(
          'aria-label',
          `Row ${r + 1}, Column ${c + 1}${value ? `, value ${value}` : ', empty'}`
        )

        if (state.given[r][c]) {
          cell.textContent = value
          cell.classList.add('given')
        } else {
          cell.classList.add('input')
          if (value) {
            cell.textContent = value
          }
        }

        cell.addEventListener('click', () => handlers.onCellClick(r, c))
        cell.addEventListener('keydown', (event) => handlers.onCellKey(event))

        elements.boardEl.appendChild(cell)
        ui.cells.push(cell)
      }
    }

    elements.numBtns.forEach((btn) => {
      const num = Number(btn.dataset.num)
      if (num === 0) return
      btn.style.display = num > maxNum ? 'none' : ''
    })

    app.updateNumpadCounts()
    app.updateScoreDisplay()
    if (state.isLearnMode && typeof app.renderLearnOverlays === 'function') {
      app.renderLearnOverlays()
    }
  }

  app.clearHighlights = () => {
    ui.cells.forEach((cell) => {
      const hadCandidates = cell.classList.contains('candidates')
      cell.classList.remove('selected', 'highlight', 'same-num', 'error', 'candidates')
      if (hadCandidates) {
        const row = Number(cell.dataset.r)
        const col = Number(cell.dataset.c)
        cell.textContent = state.puzzle[row][col] || ''
      }
    })
  }

  app.selectCell = (r, c) => {
    app.clearHighlights()

    const size = app.getBoardSize()
    const boxSize = app.getBoxSize()
    const cell = app.getCell(r, c)

    state.selected = { r, c }
    cell.classList.add('selected')
    cell.focus()

    for (let index = 0; index < size; index += 1) {
      if (index !== c) app.getCell(r, index).classList.add('highlight')
      if (index !== r) app.getCell(index, c).classList.add('highlight')
    }

    const boxRow = Math.floor(r / boxSize) * boxSize
    const boxCol = Math.floor(c / boxSize) * boxSize
    for (let dr = 0; dr < boxSize; dr += 1) {
      for (let dc = 0; dc < boxSize; dc += 1) {
        const rr = boxRow + dr
        const cc = boxCol + dc
        if (rr !== r || cc !== c) {
          app.getCell(rr, cc).classList.add('highlight')
        }
      }
    }

    const value = state.puzzle[r][c]
    if (!value) return

    for (let index = 0; index < size * size; index += 1) {
      const rr = Math.floor(index / size)
      const cc = index % size
      if (state.puzzle[rr][cc] === value && (rr !== r || cc !== c)) {
        ui.cells[index].classList.add('same-num')
      }
    }
  }

  app.updateNumpadCounts = () => {
    if (!state.puzzle) return

    const size = app.getBoardSize()
    const counts = new Array(10).fill(0)

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (state.puzzle[r][c]) counts[state.puzzle[r][c]] += 1
      }
    }

    elements.numBtns.forEach((btn) => {
      const num = Number(btn.dataset.num)
      if (num === 0) return

      const remaining = size - counts[num]
      let badge = btn.querySelector('.count')
      if (!badge) {
        badge = document.createElement('span')
        badge.className = 'count'
        btn.appendChild(badge)
      }

      badge.textContent = remaining > 0 ? remaining : ''
      btn.classList.toggle('completed', remaining <= 0)
    })
  }

  app.setActiveNum = (num) => {
    state.activeNum = state.activeNum === num ? 0 : num
    elements.numBtns.forEach((btn) => {
      btn.classList.toggle(
        'active-num',
        Number(btn.dataset.num) === state.activeNum && state.activeNum > 0
      )
    })
  }
}
