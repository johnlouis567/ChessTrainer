import { useRef, useState, useCallback } from 'react';
import { PieceType } from '../types/chess';
import { Game } from '../engine/Game';
import type { Position } from '../engine/pieces';
import './ChessBoard.css';

const PIECE_SYMBOLS: Record<PieceType, string> = {
  [PieceType.King]:   '♚',
  [PieceType.Queen]:  '♛',
  [PieceType.Rook]:   '♜',
  [PieceType.Bishop]: '♝',
  [PieceType.Knight]: '♞',
  [PieceType.Pawn]:   '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessBoard() {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game();
  const game = gameRef.current;

  const [, forceUpdate] = useState(0);
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);

  const rerender = useCallback(() => forceUpdate(n => n + 1), []);

  const handleSquareClick = (pos: Position) => {
    if (game.status === 'checkmate' || game.status === 'stalemate') return;

    const piece = game.board[pos.row][pos.col];

    if (selected) {
      const isLegal = legalMoves.some(m => m.row === pos.row && m.col === pos.col);

      if (isLegal) {
        game.makeMove(selected, pos);
        setSelected(null);
        setLegalMoves([]);
        rerender();
        return;
      }

      // Re-select a different friendly piece
      if (piece && piece.color === game.currentTurn) {
        const moves = game.getLegalMoves(pos);
        setSelected(pos);
        setLegalMoves(moves);
        return;
      }

      setSelected(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === game.currentTurn) {
      const moves = game.getLegalMoves(pos);
      setSelected(pos);
      setLegalMoves(moves);
    }
  };

  const handleReset = () => {
    gameRef.current = new Game();
    setSelected(null);
    setLegalMoves([]);
    rerender();
  };

  const statusText = () => {
    switch (game.status) {
      case 'checkmate': return `Checkmate — ${game.winner === 'white' ? 'White' : 'Black'} wins!`;
      case 'stalemate': return 'Stalemate — draw!';
      case 'check':     return `${game.currentTurn === 'white' ? 'White' : 'Black'} is in check!`;
      default:          return `${game.currentTurn === 'white' ? 'White' : 'Black'} to move`;
    }
  };

  return (
    <div className="board-wrapper">
      <div className={`board-status board-status--${game.status}`}>{statusText()}</div>
      <div className="board" role="grid" aria-label="Chess board">
        {RANKS.map((rank, rowIndex) => (
          <div key={rank} className="board__row" role="row">
            <span className="board__label board__label--rank">{rank}</span>
            {FILES.map((file, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const piece = game.board[rowIndex][colIndex];
              const pos = { row: rowIndex, col: colIndex };
              const isSel = selected?.row === rowIndex && selected?.col === colIndex;
              const isLegal = legalMoves.some(m => m.row === rowIndex && m.col === colIndex);
              const isCapture = isLegal && piece !== null;

              return (
                <div
                  key={file}
                  className={[
                    'board__square',
                    `board__square--${isLight ? 'light' : 'dark'}`,
                    isSel      ? 'board__square--selected' : '',
                    isLegal    ? 'board__square--legal'    : '',
                    isCapture  ? 'board__square--capture'  : '',
                  ].filter(Boolean).join(' ')}
                  role="gridcell"
                  aria-label={`${file}${rank}`}
                  onClick={() => handleSquareClick(pos)}
                >
                  {piece && (
                    <span
                      className={`piece piece--${piece.color}`}
                      aria-label={`${piece.color} ${piece.type}`}
                    >
                      {PIECE_SYMBOLS[piece.type]}
                    </span>
                  )}
                  {isLegal && !piece && <div className="move-dot" />}
                </div>
              );
            })}
          </div>
        ))}
        <div className="board__row board__row--files">
          <span className="board__label" />
          {FILES.map((file) => (
            <span key={file} className="board__label board__label--file">{file}</span>
          ))}
        </div>
      </div>
      <button className="btn-reset" onClick={handleReset}>New Game</button>
    </div>
  );
}
