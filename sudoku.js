/**
 * Q-SUDOKU engine
 *
 * Solver: backtracking + bitmask constraints + MRV heuristic
 * Generator: randomized fill -> clue removal with uniqueness check
 */
export const Sudoku = (() => {
  const N = 9
  const ALL = 0x1FF

  const boxIdx = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3)

  const popcount = (x) => {
    let count = 0
    while (x) {
      count += 1
      x &= x - 1
    }
    return count
  }

  const lowestBit = (x) => {
    let pos = 0
    while (!((x >> pos) & 1)) pos += 1
    return pos
  }

  function* iterBits(mask) {
    let current = mask
    while (current) {
      const bit = current & -current
      yield lowestBit(bit) + 1
      current ^= bit
    }
  }

  function solve(board) {
    const grid = board.map((row) => [...row])
    const rowMask = new Array(N).fill(0)
    const colMask = new Array(N).fill(0)
    const boxMask = new Array(N).fill(0)

    for (let r = 0; r < N; r += 1) {
      for (let c = 0; c < N; c += 1) {
        const value = grid[r][c]
        if (!value) continue

        const bit = 1 << (value - 1)
        rowMask[r] |= bit
        colMask[c] |= bit
        boxMask[boxIdx(r, c)] |= bit
      }
    }

    function candidates(r, c) {
      return ALL & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)])
    }

    function backtrack() {
      let minCount = 10
      let bestRow = -1
      let bestCol = -1
      let bestCandidates = 0

      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          if (grid[r][c] !== 0) continue

          const mask = candidates(r, c)
          const count = popcount(mask)
          if (count === 0) return false

          if (count < minCount) {
            minCount = count
            bestRow = r
            bestCol = c
            bestCandidates = mask
            if (count === 1) break
          }
        }

        if (minCount === 1) break
      }

      if (bestRow === -1) return true

      for (const digit of iterBits(bestCandidates)) {
        const bit = 1 << (digit - 1)
        grid[bestRow][bestCol] = digit
        rowMask[bestRow] |= bit
        colMask[bestCol] |= bit
        boxMask[boxIdx(bestRow, bestCol)] |= bit

        if (backtrack()) return true

        grid[bestRow][bestCol] = 0
        rowMask[bestRow] ^= bit
        colMask[bestCol] ^= bit
        boxMask[boxIdx(bestRow, bestCol)] ^= bit
      }

      return false
    }

    return backtrack() ? grid : null
  }

  function countSolutions(board, limit = 2) {
    const grid = board.map((row) => [...row])
    const rowMask = new Array(N).fill(0)
    const colMask = new Array(N).fill(0)
    const boxMask = new Array(N).fill(0)

    for (let r = 0; r < N; r += 1) {
      for (let c = 0; c < N; c += 1) {
        const value = grid[r][c]
        if (!value) continue

        const bit = 1 << (value - 1)
        rowMask[r] |= bit
        colMask[c] |= bit
        boxMask[boxIdx(r, c)] |= bit
      }
    }

    let count = 0

    function backtrack() {
      let minCount = 10
      let bestRow = -1
      let bestCol = -1
      let bestCandidates = 0

      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          if (grid[r][c] !== 0) continue

          const mask = ALL & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)])
          const candidateCount = popcount(mask)
          if (candidateCount === 0) return

          if (candidateCount < minCount) {
            minCount = candidateCount
            bestRow = r
            bestCol = c
            bestCandidates = mask
            if (candidateCount === 1) break
          }
        }

        if (minCount === 1) break
      }

      if (bestRow === -1) {
        count += 1
        return
      }

      for (const digit of iterBits(bestCandidates)) {
        if (count >= limit) return

        const bit = 1 << (digit - 1)
        grid[bestRow][bestCol] = digit
        rowMask[bestRow] |= bit
        colMask[bestCol] |= bit
        boxMask[boxIdx(bestRow, bestCol)] |= bit

        backtrack()

        grid[bestRow][bestCol] = 0
        rowMask[bestRow] ^= bit
        colMask[bestCol] ^= bit
        boxMask[boxIdx(bestRow, bestCol)] ^= bit
      }
    }

    backtrack()
    return count
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  function generateFull() {
    const grid = Array.from({ length: N }, () => new Array(N).fill(0))
    const rowMask = new Array(N).fill(0)
    const colMask = new Array(N).fill(0)
    const boxMask = new Array(N).fill(0)

    function backtrack(pos) {
      if (pos === N * N) return true

      const r = Math.floor(pos / N)
      const c = pos % N
      const candidates = ALL & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)])
      const digits = [...iterBits(candidates)]
      shuffle(digits)

      for (const digit of digits) {
        const bit = 1 << (digit - 1)
        grid[r][c] = digit
        rowMask[r] |= bit
        colMask[c] |= bit
        boxMask[boxIdx(r, c)] |= bit

        if (backtrack(pos + 1)) return true

        grid[r][c] = 0
        rowMask[r] ^= bit
        colMask[c] ^= bit
        boxMask[boxIdx(r, c)] ^= bit
      }

      return false
    }

    backtrack(0)
    return grid
  }

  const CLUES = { easy: 38, medium: 30, hard: 24 }

  function generate(difficulty = 'easy') {
    const solution = generateFull()
    const puzzle = solution.map((row) => [...row])
    const clueCount = typeof difficulty === 'number' ? difficulty : CLUES[difficulty] || CLUES.easy
    const targetRemovals = N * N - clueCount

    const positions = shuffle(
      Array.from({ length: N * N }, (_, index) => [Math.floor(index / N), index % N])
    )

    let removed = 0
    for (const [r, c] of positions) {
      if (removed >= targetRemovals) break

      const backup = puzzle[r][c]
      puzzle[r][c] = 0

      if (countSolutions(puzzle) !== 1) {
        puzzle[r][c] = backup
      } else {
        removed += 1
      }
    }

    return { puzzle, solution }
  }

  function getErrors(board) {
    const errors = new Set()

    for (let r = 0; r < N; r += 1) {
      for (let c = 0; c < N; c += 1) {
        const value = board[r][c]
        if (!value) continue

        for (let c2 = 0; c2 < N; c2 += 1) {
          if (c2 !== c && board[r][c2] === value) {
            errors.add(r * N + c)
            errors.add(r * N + c2)
          }
        }

        for (let r2 = 0; r2 < N; r2 += 1) {
          if (r2 !== r && board[r2][c] === value) {
            errors.add(r * N + c)
            errors.add(r2 * N + c)
          }
        }

        const boxRow = Math.floor(r / 3) * 3
        const boxCol = Math.floor(c / 3) * 3
        for (let dr = 0; dr < 3; dr += 1) {
          for (let dc = 0; dc < 3; dc += 1) {
            const r2 = boxRow + dr
            const c2 = boxCol + dc
            if ((r2 !== r || c2 !== c) && board[r2][c2] === value) {
              errors.add(r * N + c)
              errors.add(r2 * N + c2)
            }
          }
        }
      }
    }

    return errors
  }

  function getCandidates(board, r, c) {
    if (board[r][c] !== 0) return []

    const used = new Set()
    for (let index = 0; index < N; index += 1) {
      if (board[r][index]) used.add(board[r][index])
      if (board[index][c]) used.add(board[index][c])
    }

    const boxRow = Math.floor(r / 3) * 3
    const boxCol = Math.floor(c / 3) * 3
    for (let dr = 0; dr < 3; dr += 1) {
      for (let dc = 0; dc < 3; dc += 1) {
        const value = board[boxRow + dr][boxCol + dc]
        if (value) used.add(value)
      }
    }

    const candidates = []
    for (let digit = 1; digit <= N; digit += 1) {
      if (!used.has(digit)) candidates.push(digit)
    }
    return candidates
  }

  function getMostConstrainedEmpty(board) {
    let best = null
    let minCandidates = 10

    for (let r = 0; r < N; r += 1) {
      for (let c = 0; c < N; c += 1) {
        if (board[r][c] !== 0) continue

        const candidates = getCandidates(board, r, c)
        if (candidates.length > 0 && candidates.length < minCandidates) {
          minCandidates = candidates.length
          best = { r, c, candidates }
        }
      }
    }

    return best
  }

  return { solve, generate, getErrors, getCandidates, getMostConstrainedEmpty }
})()

export default Sudoku
