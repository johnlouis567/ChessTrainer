import { PieceColor, PieceType } from '../types/chess';
import { Pawn, Knight, Bishop, Rook, Queen, King } from './pieces';
import type { BoardGrid, Position, MoveContext } from './pieces';

function makePiece(color: PieceColor, type: PieceType) {
  switch (type) {
    case PieceType.Pawn:   return new Pawn(color, true);
    case PieceType.Knight: return new Knight(color, true);
    case PieceType.Bishop: return new Bishop(color, true);
    case PieceType.Rook:   return new Rook(color, true);
    case PieceType.Queen:  return new Queen(color, true);
    case PieceType.King:   return new King(color, true);
  }
}

// candidateMoves for Pawn only includes diagonal squares when an enemy piece is
// there to capture, so it cannot be used to detect pawn control of empty squares.
// This helper uses geometry directly for pawns and candidateMoves for everything else.
function squareAttackedBy(board: BoardGrid, pos: Position, attackerColor: PieceColor): boolean {
  const ctx: MoveContext = { enPassantTarget: null };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== attackerColor) continue;

      if (piece instanceof Pawn) {
        const dir = piece.color === PieceColor.White ? -1 : 1;
        if (r + dir === pos.row && (c - 1 === pos.col || c + 1 === pos.col)) return true;
        continue;
      }

      if (piece.candidateMoves({ row: r, col: c }, board, ctx).some(
        m => m.row === pos.row && m.col === pos.col,
      )) return true;
    }
  }
  return false;
}

export interface ForkResult {
  square: Position;
  targets: Position[];
}

// Returns all empty squares where placing a piece of the given color and type
// would create a fork: it attacks two or more unprotected enemy pieces while
// not itself being attacked by any enemy piece.
//
// "Unprotected" is evaluated by simulating the capture — after our piece takes
// an enemy piece, can the enemy recapture? This correctly handles X-ray
// defenders (e.g. a rook behind the captured piece) and pawn defenders.
export function calculateForks(
  board: BoardGrid,
  color: PieceColor,
  type: PieceType,
): ForkResult[] {
  const enemy = color === PieceColor.White ? PieceColor.Black : PieceColor.White;
  const ctx: MoveContext = { enPassantTarget: null };
  const forks: ForkResult[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] !== null) continue;

      const piece = makePiece(color, type);
      const boardWith = board.map(row => [...row]);
      boardWith[r][c] = piece;

      if (squareAttackedBy(boardWith, { row: r, col: c }, enemy)) continue;

      const attackedEnemies = piece
        .candidateMoves({ row: r, col: c }, boardWith, ctx)
        .filter(sq => boardWith[sq.row][sq.col]?.color === enemy);

      // An enemy piece is unprotected if no enemy can recapture after we take it.
      // Simulate the capture: our piece moves to sq, origin square vacated.
      const unprotected = attackedEnemies.filter(sq => {
        const boardAfterCapture = boardWith.map(row => [...row]);
        boardAfterCapture[sq.row][sq.col] = piece;
        boardAfterCapture[r][c] = null;
        return !squareAttackedBy(boardAfterCapture, sq, enemy);
      });

      if (unprotected.length >= 2) forks.push({ square: { row: r, col: c }, targets: unprotected });
    }
  }

  return forks;
}

// Returns positions of unprotected enemy pieces (king excluded — it cannot be
// simply captured). A piece is unprotected if, after removing it, no remaining
// enemy piece controls its square.
export function calculateUnprotected(board: BoardGrid, color: PieceColor): Position[] {
  const enemy = color === PieceColor.White ? PieceColor.Black : PieceColor.White;
  const result: Position[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== enemy || piece.type === PieceType.King) continue;

      const boardWithout = board.map(row => [...row]);
      boardWithout[r][c] = null;
      if (!squareAttackedBy(boardWithout, { row: r, col: c }, enemy)) {
        result.push({ row: r, col: c });
      }
    }
  }

  return result;
}
