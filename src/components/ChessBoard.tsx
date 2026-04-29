import { useRef, useState, useCallback } from 'react';
import { PieceType } from '../types/chess';
import type { PieceColor } from '../types/chess';
import { Game, GameStatus } from '../engine/Game';
import { ChessBoardFactory } from '../engine/ChessBoardFactory';
import type { Position } from '../engine/pieces';
import { playSelect, playMove, playCapture } from '../audio/sounds';
import './ChessBoard.css';

const SQUARE_SIZE = 72; // must match .board__square dimensions in CSS

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

export const BoardMode = {
  Play:     'play',
  Practice: 'practice',
} as const;
export type BoardMode = typeof BoardMode[keyof typeof BoardMode];

interface ChessBoardProps {
  mode?: BoardMode;
  onBack?: () => void;
}

interface AnimMove { from: Position; to: Position }
interface AnimInfo { moves: AnimMove[]; key: number }

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

export function ChessBoard({ mode = BoardMode.Play, onBack }: ChessBoardProps) {
  const [numMoves, setNumMoves] = useState(40);

  const createGame = () => mode === BoardMode.Practice ? ChessBoardFactory.generate(numMoves) : new Game();

  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = createGame();
  const game = gameRef.current;

  const [, forceUpdate] = useState(0);
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [animInfo, setAnimInfo] = useState<AnimInfo | null>(null);

  const rerender = useCallback(() => forceUpdate(n => n + 1), []);

  const handleSquareClick = (pos: Position) => {
    if (game.status === GameStatus.Checkmate || game.status === GameStatus.Stalemate) return;
    if (game.pendingPromotion) return;

    const piece = game.board[pos.row][pos.col];

    if (selected) {
      const isLegal = legalMoves.some(m => m.row === pos.row && m.col === pos.col);

      if (isLegal) {
        const movingPiece = game.board[selected.row][selected.col];
        const targetPiece = game.board[pos.row][pos.col];

        // En passant: pawn moves diagonally to an empty square
        const isEnPassant =
          movingPiece?.type === PieceType.Pawn &&
          pos.col !== selected.col &&
          targetPiece === null;
        const isCaptureMoveType = targetPiece !== null || isEnPassant;

        // Build animation moves (king + rook for castling)
        const animMoves: AnimMove[] = [{ from: selected, to: pos }];
        if (movingPiece?.type === PieceType.King && Math.abs(pos.col - selected.col) === 2) {
          const row = pos.row;
          animMoves.push(
            pos.col === 6
              ? { from: { row, col: 7 }, to: { row, col: 5 } }
              : { from: { row, col: 0 }, to: { row, col: 3 } },
          );
        }

        game.makeMove(selected, pos);
        isCaptureMoveType ? playCapture() : playMove();
        setAnimInfo({ moves: animMoves, key: Date.now() });
        setSelected(null);
        setLegalMoves([]);
        rerender();
        return;
      }

      // Re-select a different friendly piece
      if (piece && piece.color === game.currentTurn) {
        playSelect();
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
      playSelect();
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
    gameRef.current = createGame();
    setSelected(null);
    setLegalMoves([]);
    setAnimInfo(null);
    rerender();
  };

  const statusText = () => {
    if (game.pendingPromotion) return 'Choose a piece to promote to';
    switch (game.status) {
      case GameStatus.Checkmate: return `Checkmate — ${game.winner === 'white' ? 'White' : 'Black'} wins!`;
      case GameStatus.Stalemate: return 'Stalemate — draw!';
      case GameStatus.Check:     return `${game.currentTurn === 'white' ? 'White' : 'Black'} is in check!`;
      default:                   return `${game.currentTurn === 'white' ? 'White' : 'Black'} to move`;
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
                const isLight  = (rowIndex + colIndex) % 2 === 0;
                const piece    = game.board[rowIndex][colIndex];
                const pos      = { row: rowIndex, col: colIndex };
                const isSel    = selected?.row === rowIndex && selected?.col === colIndex;
                const isLegal  = legalMoves.some(m => m.row === rowIndex && m.col === colIndex);
                const isCap    = isLegal && piece !== null;

                // Animation: find if this square has a piece that just arrived
                const animMove = animInfo?.moves.find(
                  m => m.to.row === rowIndex && m.to.col === colIndex,
                );
                const dx = animMove ? (animMove.from.col - colIndex) * SQUARE_SIZE : 0;
                const dy = animMove ? (animMove.from.row - rowIndex) * SQUARE_SIZE : 0;

                return (
                  <div
                    key={file}
                    className={[
                      'board__square',
                      `board__square--${isLight ? 'light' : 'dark'}`,
                      isSel  ? 'board__square--selected' : '',
                      isLegal ? 'board__square--legal'   : '',
                      isCap  ? 'board__square--capture'  : '',
                    ].filter(Boolean).join(' ')}
                    role="gridcell"
                    aria-label={`${file}${rank}`}
                    onClick={() => handleSquareClick(pos)}
                  >
                    {piece && (
                      <span
                        // Changing key forces React to remount the element, resetting the animation
                        key={animMove ? `moving-${animInfo!.key}-${colIndex}-${rowIndex}` : 'still'}
                        className={`piece piece--${piece.color}${animMove ? ' piece--moving' : ''}`}
                        style={animMove ? ({
                          '--slide-dx': `${dx}px`,
                          '--slide-dy': `${dy}px`,
                        } as React.CSSProperties) : undefined}
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

      <div className="board-actions">
        {onBack && <button className="btn-back" onClick={onBack}>← Back</button>}
        <button className="btn-reset" onClick={handleReset}>
          {mode === BoardMode.Practice ? 'New Position' : 'New Game'}
        </button>
      </div>
      {mode === BoardMode.Practice && (
        <div className="practice-config">
          <label className="practice-config__label">Moves simulated</label>
          <input
            type="number"
            min={1}
            max={160}
            value={numMoves}
            onChange={e => setNumMoves(Math.min(160, Math.max(1, Number(e.target.value))))}
            className="practice-config__input"
          />
        </div>
      )}
    </div>
  );
}
