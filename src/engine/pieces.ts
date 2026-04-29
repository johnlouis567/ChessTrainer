import { PieceColor, PieceType } from '../types/chess';

export interface Position {
  row: number;
  col: number;
}

export type BoardGrid = (ChessPiece | null)[][];

export interface MoveContext {
  enPassantTarget: Position | null;
}

export abstract class ChessPiece {
  readonly color: PieceColor;
  readonly type: PieceType;
  hasMoved: boolean;

  constructor(color: PieceColor, type: PieceType, hasMoved = false) {
    this.color = color;
    this.type = type;
    this.hasMoved = hasMoved;
  }

  abstract candidateMoves(pos: Position, board: BoardGrid, ctx: MoveContext): Position[];

  protected inBounds(r: number, c: number): boolean {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  protected slide(pos: Position, board: BoardGrid, dirs: [number, number][]): Position[] {
    const moves: Position[] = [];
    for (const [dr, dc] of dirs) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (this.inBounds(r, c)) {
        const occupant = board[r][c];
        if (occupant === null) {
          moves.push({ row: r, col: c });
        } else {
          if (occupant.color !== this.color) moves.push({ row: r, col: c });
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }
}

export class Pawn extends ChessPiece {
  constructor(color: PieceColor, hasMoved = false) {
    super(color, PieceType.Pawn, hasMoved);
  }

  candidateMoves(pos: Position, board: BoardGrid, ctx: MoveContext): Position[] {
    const moves: Position[] = [];
    const dir = this.color === PieceColor.White ? -1 : 1;
    const startRow = this.color === PieceColor.White ? 6 : 1;
    const r1 = pos.row + dir;

    if (this.inBounds(r1, pos.col) && board[r1][pos.col] === null) {
      moves.push({ row: r1, col: pos.col });
      if (pos.row === startRow) {
        const r2 = pos.row + dir * 2;
        if (board[r2][pos.col] === null) moves.push({ row: r2, col: pos.col });
      }
    }

    for (const dc of [-1, 1]) {
      const c = pos.col + dc;
      if (!this.inBounds(r1, c)) continue;
      const target = board[r1][c];
      if (target !== null && target.color !== this.color) {
        moves.push({ row: r1, col: c });
      } else if (
        ctx.enPassantTarget &&
        r1 === ctx.enPassantTarget.row &&
        c === ctx.enPassantTarget.col
      ) {
        moves.push({ row: r1, col: c });
      }
    }

    return moves;
  }
}

export class Knight extends ChessPiece {
  constructor(color: PieceColor, hasMoved = false) {
    super(color, PieceType.Knight, hasMoved);
  }

  candidateMoves(pos: Position, board: BoardGrid, _ctx: MoveContext): Position[] {
    const offsets: [number, number][] = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2],  [1, 2],  [2, -1],  [2, 1],
    ];
    return offsets
      .map(([dr, dc]) => ({ row: pos.row + dr, col: pos.col + dc }))
      .filter(({ row, col }) => {
        if (!this.inBounds(row, col)) return false;
        const occupant = board[row][col];
        return occupant === null || occupant.color !== this.color;
      });
  }
}

export class Bishop extends ChessPiece {
  constructor(color: PieceColor, hasMoved = false) {
    super(color, PieceType.Bishop, hasMoved);
  }

  candidateMoves(pos: Position, board: BoardGrid, _ctx: MoveContext): Position[] {
    return this.slide(pos, board, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  }
}

export class Rook extends ChessPiece {
  constructor(color: PieceColor, hasMoved = false) {
    super(color, PieceType.Rook, hasMoved);
  }

  candidateMoves(pos: Position, board: BoardGrid, _ctx: MoveContext): Position[] {
    return this.slide(pos, board, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
  }
}

export class Queen extends ChessPiece {
  constructor(color: PieceColor, hasMoved = false) {
    super(color, PieceType.Queen, hasMoved);
  }

  candidateMoves(pos: Position, board: BoardGrid, _ctx: MoveContext): Position[] {
    return this.slide(pos, board, [
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [-1, 0],  [1, 0],  [0, -1], [0, 1],
    ]);
  }
}

export class King extends ChessPiece {
  constructor(color: PieceColor, hasMoved = false) {
    super(color, PieceType.King, hasMoved);
  }

  // Castling is handled separately in Game since it requires check detection
  candidateMoves(pos: Position, board: BoardGrid, _ctx: MoveContext): Position[] {
    const moves: Position[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (!this.inBounds(r, c)) continue;
        const occupant = board[r][c];
        if (occupant === null || occupant.color !== this.color) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }
}
