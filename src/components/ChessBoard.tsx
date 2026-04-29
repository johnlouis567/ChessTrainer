import type { Board, Piece } from '../types/chess';
import { PieceColor, PieceType } from '../types/chess';
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

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  const backRank: PieceType[] = [
    PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen,
    PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook,
  ];

  backRank.forEach((type, col) => {
    board[0][col] = { type, color: PieceColor.Black };
    board[7][col] = { type, color: PieceColor.White };
  });

  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: PieceType.Pawn, color: PieceColor.Black };
    board[6][col] = { type: PieceType.Pawn, color: PieceColor.White };
  }

  return board;
}

function PieceDisplay({ piece }: { piece: Piece }) {
  const symbol = PIECE_SYMBOLS[piece.type];
  return (
    <span className={`piece piece--${piece.color}`} aria-label={`${piece.color} ${piece.type}`}>
      {symbol}
    </span>
  );
}

const INITIAL_BOARD = createInitialBoard();

export function ChessBoard() {
  return (
    <div className="board-wrapper">
      <div className="board" role="grid" aria-label="Chess board">
        {RANKS.map((rank, rowIndex) => (
          <div key={rank} className="board__row" role="row">
            <span className="board__label board__label--rank">{rank}</span>
            {FILES.map((file, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const piece = INITIAL_BOARD[rowIndex][colIndex];
              return (
                <div
                  key={file}
                  className={`board__square board__square--${isLight ? 'light' : 'dark'}`}
                  role="gridcell"
                  aria-label={`${file}${rank}`}
                >
                  {piece && <PieceDisplay piece={piece} />}
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
    </div>
  );
}
