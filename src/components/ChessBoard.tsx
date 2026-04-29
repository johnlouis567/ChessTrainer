import { useRef, useState, useCallback } from 'react';
import { PieceType } from '../types/chess';
import type { PieceColor } from '../types/chess';
import { Game, GameStatus } from '../engine/Game';
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

const PROMOTION_CHOICES: PieceType[] = [
  PieceType.Queen,
  PieceType.Rook,
  PieceType.Bishop,
  PieceType.Knight,
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function PromotionPicker({
  color,
  onChoose,
}: {
  color: PieceColor;
  onChoose: (type: PieceType) => void;
}) {
  return (
    <div className="promotion-overlay">
      <div className="promotion-picker">
        <p className="promotion-picker__label">Choose promotion</p>
        <div className="promotion-picker__choices">
          {PROMOTION_CHOICES.map((type) => (
            <button
              key={type}
              className={`promotion-picker__btn piece--${color}`}
              aria-label={`Promote to ${type}`}
              onClick={() => onChoose(type)}
            >
              {PIECE_SYMBOLS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChessBoard() {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game();
  const game = gameRef.current;

  const [, forceUpdate] = useState(0);
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);

  const rerender = useCallback(() => forceUpdate(n => n + 1), []);

  const handleSquareClick = (pos: Position) => {
    if (game.status === GameStatus.Checkmate || game.status === GameStatus.Stalemate) return;
    if (game.pendingPromotion) return;

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

  const handlePromotion = (type: PieceType) => {
    game.promote(type);
    rerender();
  };

  const handleReset = () => {
    gameRef.current = new Game();
    setSelected(null);
    setLegalMoves([]);
    rerender();
  };

  const statusText = () => {
    if (game.pendingPromotion) return 'Choose a piece to promote to';
    switch (game.status) {
      case GameStatus.Checkmate: return `Checkmate — ${game.winner === 'white' ? 'White' : 'Black'} wins!`;
      case GameStatus.Stalemate: return 'Stalemate — draw!';
      case GameStatus.Check:     return `${game.currentTurn === 'white' ? 'White' : 'Black'} is in check!`;
      default:          return `${game.currentTurn === 'white' ? 'White' : 'Black'} to move`;
    }
  };

  const promotionColor = game.pendingPromotion
    ? game.board[game.pendingPromotion.row][game.pendingPromotion.col]?.color ?? game.currentTurn
    : game.currentTurn;

  return (
    <div className="board-wrapper">
      <div className={`board-status board-status--${game.pendingPromotion ? GameStatus.Active : game.status}`}>
        {statusText()}
      </div>
      <div className="board-container">
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
                      isSel     ? 'board__square--selected' : '',
                      isLegal   ? 'board__square--legal'    : '',
                      isCapture ? 'board__square--capture'  : '',
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

        {game.pendingPromotion && (
          <PromotionPicker color={promotionColor} onChoose={handlePromotion} />
        )}
      </div>

      <button className="btn-reset" onClick={handleReset}>New Game</button>
    </div>
  );
}
