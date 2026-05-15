'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type CellState = {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

type Difficulty = 'easy' | 'medium' | 'hard' | 'custom'

const DIFFICULTIES = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
}

const NUM_COLORS: Record<number, string> = {
  1: 'text-blue-700',
  2: 'text-green-700',
  3: 'text-red-600',
  4: 'text-blue-900',
  5: 'text-red-900',
  6: 'text-teal-600',
  7: 'text-purple-700',
  8: 'text-gray-700',
}

function createEmptyBoard(rows: number, cols: number): CellState[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  )
}

function placeMines(board: CellState[][], rows: number, cols: number, mines: number, safeR: number, safeC: number): CellState[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })))
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (newBoard[r][c].isMine) continue
    // Evitar colocar mina en la celda segura y sus vecinas
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue
    newBoard[r][c].isMine = true
    placed++
  }
  // Calcular minas adyacentes
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newBoard[r][c].isMine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) count++
        }
      }
      newBoard[r][c].adjacentMines = count
    }
  }
  return newBoard
}

function revealCells(board: CellState[][], rows: number, cols: number, startR: number, startC: number): CellState[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })))
  const stack: [number, number][] = [[startR, startC]]
  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue
    const cell = newBoard[r][c]
    if (cell.isRevealed || cell.isFlagged) continue
    cell.isRevealed = true
    if (cell.adjacentMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          stack.push([r + dr, c + dc])
        }
      }
    }
  }
  return newBoard
}

function checkWin(board: CellState[][], rows: number, cols: number, mines: number): boolean {
  let revealed = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isRevealed) revealed++
    }
  }
  return revealed === rows * cols - mines
}

function revealAllMines(board: CellState[][], rows: number, cols: number): CellState[][] {
  return board.map(row =>
    row.map(cell => (cell.isMine ? { ...cell, isRevealed: true } : { ...cell }))
  )
}

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [customRows, setCustomRows] = useState(10)
  const [customCols, setCustomCols] = useState(10)
  const [customMines, setCustomMines] = useState(15)

  const getConfig = useCallback(() => {
    if (difficulty === 'custom') return { rows: customRows, cols: customCols, mines: customMines }
    return DIFFICULTIES[difficulty]
  }, [difficulty, customRows, customCols, customMines])

  const [board, setBoard] = useState<CellState[][]>(() => createEmptyBoard(DIFFICULTIES.easy.rows, DIFFICULTIES.easy.cols))
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [minesLeft, setMinesLeft] = useState(DIFFICULTIES.easy.mines)
  const [time, setTime] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const configRef = useRef(getConfig())

  useEffect(() => { configRef.current = getConfig() }, [getConfig])

  // Timer
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameStatus])

  const initGame = useCallback(() => {
    const { rows, cols, mines } = getConfig()
    setBoard(createEmptyBoard(rows, cols))
    setGameStatus('idle')
    setMinesLeft(mines)
    setTime(0)
  }, [getConfig])

  // Reiniciar cuando cambia dificultad
  useEffect(() => { initGame() }, [difficulty, initGame])

  const handleLeftClick = useCallback((r: number, c: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return
    setBoard(prev => {
      const cell = prev[r][c]
      if (cell.isRevealed || cell.isFlagged) return prev

      const { rows, cols, mines } = configRef.current
      let currentBoard = prev

      // Primer clic: colocar minas
      if (gameStatus === 'idle') {
        currentBoard = placeMines(prev, rows, cols, mines, r, c)
        setGameStatus('playing')
      }

      // Revelar
      const updated = revealCells(currentBoard, rows, cols, r, c)

      if (updated[r][c].isMine) {
        const lost = revealAllMines(updated, rows, cols)
        setGameStatus('lost')
        return lost
      }

      if (checkWin(updated, rows, cols, mines)) {
        setGameStatus('won')
      }

      return updated
    })
  }, [gameStatus])

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'idle') return
    setBoard(prev => {
      const cell = prev[r][c]
      if (cell.isRevealed) return prev
      const newBoard = prev.map(row => row.map(c2 => ({ ...c2 })))
      newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged
      setMinesLeft(m => newBoard[r][c].isFlagged ? m - 1 : m + 1)
      return newBoard
    })
  }, [gameStatus])

  const { rows, cols } = getConfig()

  const faceEmoji = gameStatus === 'won' ? '😎' : gameStatus === 'lost' ? '😵' : '🙂'

  const clampCustomMines = (r: number, c: number, m: number) => Math.min(m, Math.max(1, Math.floor(r * c * 0.85)))

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 tracking-wide">💣 Buscaminas</h1>

      {/* Selector de dificultad */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        {(['easy', 'medium', 'hard', 'custom'] as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-4 py-2 rounded font-semibold border-2 transition-colors ${
              difficulty === d
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-gray-100 text-gray-700 border-gray-400 hover:bg-gray-200'
            }`}
          >
            {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Medio' : d === 'hard' ? 'Difícil' : 'Personalizado'}
          </button>
        ))}
      </div>

      {/* Config personalizada */}
      {difficulty === 'custom' && (
        <div className="mb-4 flex flex-wrap gap-3 items-center justify-center bg-gray-100 p-3 rounded border border-gray-400">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            Filas:
            <input
              type="number" min={5} max={30} value={customRows}
              onChange={e => {
                const r = Math.max(5, Math.min(30, parseInt(e.target.value) || 5))
                setCustomRows(r)
                setCustomMines(m => clampCustomMines(r, customCols, m))
              }}
              className="w-16 border border-gray-400 rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            Columnas:
            <input
              type="number" min={5} max={50} value={customCols}
              onChange={e => {
                const c = Math.max(5, Math.min(50, parseInt(e.target.value) || 5))
                setCustomCols(c)
                setCustomMines(m => clampCustomMines(customRows, c, m))
              }}
              className="w-16 border border-gray-400 rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            Minas:
            <input
              type="number" min={1} max={clampCustomMines(customRows, customCols, 9999)} value={customMines}
              onChange={e => {
                const m = Math.max(1, Math.min(clampCustomMines(customRows, customCols, 9999), parseInt(e.target.value) || 1))
                setCustomMines(m)
              }}
              className="w-16 border border-gray-400 rounded px-2 py-1 text-sm"
            />
          </label>
          <button
            onClick={initGame}
            className="px-3 py-1 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 text-sm"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Panel de información */}
      <div className="mb-4 flex items-center gap-6 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-inner">
        <div className="flex items-center gap-2 text-lg font-bold w-20">
          <span>🚩</span>
          <span className="tabular-nums">{String(Math.max(0, minesLeft)).padStart(3, '0')}</span>
        </div>
        <button
          onClick={initGame}
          className="text-2xl hover:scale-110 transition-transform active:scale-95 focus:outline-none"
          title="Nueva partida"
        >
          {faceEmoji}
        </button>
        <div className="flex items-center gap-2 text-lg font-bold w-20 justify-end">
          <span>⏱</span>
          <span className="tabular-nums">{String(Math.min(time, 999)).padStart(3, '0')}</span>
        </div>
      </div>

      {/* Estado victoria/derrota */}
      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div className={`mb-4 px-6 py-3 rounded-lg text-white font-bold text-xl shadow ${
          gameStatus === 'won' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {gameStatus === 'won' ? '🎉 ¡Ganaste! ¡Enhorabuena!' : '💥 ¡Pisaste una mina! Game over'}
        </div>
      )}

      {/* Tablero */}
      <div
        className="border-4 border-gray-500 rounded shadow-xl bg-gray-400 p-1 overflow-auto max-w-full"
        onContextMenu={e => e.preventDefault()}
      >
        <div
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <Cell
                key={`${r}-${c}`}
                cell={cell}
                onClick={() => handleLeftClick(r, c)}
                onRightClick={e => handleRightClick(e, r, c)}
                gameOver={gameStatus === 'lost'}
              />
            ))
          )}
        </div>
      </div>

      <p className="mt-4 text-gray-600 text-sm">Clic izquierdo: revelar · Clic derecho: bandera</p>
    </div>
  )
}

function Cell({
  cell,
  onClick,
  onRightClick,
  gameOver,
}: {
  cell: CellState
  onClick: () => void
  onRightClick: (e: React.MouseEvent) => void
  gameOver: boolean
}) {
  const getContent = () => {
    if (cell.isFlagged && !cell.isRevealed) return '🚩'
    if (!cell.isRevealed) return ''
    if (cell.isMine) return '💣'
    if (cell.adjacentMines === 0) return ''
    return cell.adjacentMines
  }

  const isMineExploded = cell.isMine && cell.isRevealed && gameOver

  const baseClasses = 'w-7 h-7 flex items-center justify-center text-xs font-bold border select-none cursor-pointer'

  let stateClasses = ''
  if (!cell.isRevealed) {
    stateClasses = 'bg-gray-300 border-t-gray-100 border-l-gray-100 border-b-gray-500 border-r-gray-500 border-2 hover:bg-gray-250 active:bg-gray-400'
  } else if (isMineExploded) {
    stateClasses = 'bg-red-500 border-gray-500 border'
  } else if (cell.isMine) {
    stateClasses = 'bg-gray-300 border-gray-500 border'
  } else {
    stateClasses = 'bg-gray-200 border-gray-400 border'
  }

  const numColor = (!cell.isMine && cell.isRevealed && cell.adjacentMines > 0)
    ? (NUM_COLORS[cell.adjacentMines] ?? 'text-gray-800')
    : ''

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${numColor}`}
      onClick={onClick}
      onContextMenu={onRightClick}
      role="button"
      aria-label={`celda ${cell.isRevealed ? 'revelada' : 'oculta'}`}
    >
      {getContent()}
    </div>
  )
}
