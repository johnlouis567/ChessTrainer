import { PieceColor, PieceType } from '../types/chess';
import {
  ChessPiece, Pawn, Knight, Bishop, Rook, Queen, King,
} from './pieces';
import type { Position, BoardGrid, MoveContext } from './pieces';

export const GameStatus = {
  Active:    'active',
  Check:     'check',
  Checkmate: 'checkmate',
  Stalemate: 'stalemate',
} as const;
export type GameStatus = typeof GameStatus[keyof typeof GameStatus];

export class Game {
  board: BoardGrid;
  currentTurn: PieceColor;
  enPassantTarget: Position | null;
  status: GameStatus;
  pendingPromotion: Position | null;

  constructor() {
    this.board = this.buildInitialBoard();
    this.currentTurn = PieceColor.White;
    this.enPassantTarget = null;
    this.status = GameStatus.Active;
    this.pendingPromotion = null;
  }

  private buildInitialBoard(): BoardGrid {
    const board: BoardGrid = Array.from({ length: 8 }, () => Array(8).fill(null));

    const backRank = (color: PieceColor): ChessPiece[] => [
      new Rook(color), new Knight(color), new Bishop(color), new Queen(color),
      new King(color), new Bishop(color), new Knight(color), new Rook(color),
    ];

    backRank(PieceColor.Black).forEach((p, c) => { board[0][c] = p; });
    backRank(PieceColor.White).forEach((p, c) => { board[7][c] = p; });

    for (let c = 0; c < 8; c++) {
      board[1][c] = new Pawn(PieceColor.Black);
      board[6][c] = new Pawn(PieceColor.White);
    }

    return board;
  }

  private ctx(): MoveContext {
    return { enPassantTarget: this.enPassantTarget };
  }

  getLegalMoves(pos: Position): Position[] {
    const piece = this.board[pos.row][pos.col];
    if (!piece || piece.color !== this.currentTurn) return [];

    const candidates = [
      ...piece.candidateMoves(pos, this.board, this.ctx()),
      ...(piece instanceof King ? this.castlingMoves(pos, piece) : []),
    ];

    return candidates.filter(to => !this.leavesKingInCheck(pos, to));
  }

  private castlingMoves(pos: Position, king: King): Position[] {
    const moves: Position[] = [];
    if (king.hasMoved || this.isInCheck(this.currentTurn)) return moves;

    const row = this.currentTurn === PieceColor.White ? 7 : 0;
    if (pos.row !== row || pos.col !== 4) return moves;

    const kRook = this.board[row][7];
    if (
      kRook instanceof Rook && !kRook.hasMoved &&
      this.board[row][5] === null && this.board[row][6] === null &&
      !this.squareAttacked({ row, col: 5 }, this.currentTurn) &&
      !this.squareAttacked({ row, col: 6 }, this.currentTurn)
    ) {
      moves.push({ row, col: 6 });
    }

    const qRook = this.board[row][0];
    if (
      qRook instanceof Rook && !qRook.hasMoved &&
      this.board[row][1] === null && this.board[row][2] === null && this.board[row][3] === null &&
      !this.squareAttacked({ row, col: 3 }, this.currentTurn) &&
      !this.squareAttacked({ row, col: 2 }, this.currentTurn)
    ) {
      moves.push({ row, col: 2 });
    }

    return moves;
  }

  private leavesKingInCheck(from: Position, to: Position): boolean {
    const sim = this.simulate(from, to);
    return this.kingInCheckOnBoard(sim, this.currentTurn);
  }

  private simulate(from: Position, to: Position): BoardGrid {
    const b = this.board.map(r => [...r]);
    const piece = b[from.row][from.col];
    b[to.row][to.col] = piece;
    b[from.row][from.col] = null;

    // Remove en-passant captured pawn
    if (
      piece instanceof Pawn &&
      this.enPassantTarget &&
      to.row === this.enPassantTarget.row &&
      to.col === this.enPassantTarget.col
    ) {
      b[from.row][to.col] = null;
    }

    return b;
  }

  isInCheck(color: PieceColor): boolean {
    return this.kingInCheckOnBoard(this.board, color);
  }

  private kingInCheckOnBoard(board: BoardGrid, color: PieceColor): boolean {
    const king = this.findKing(board, color);
    return king !== null && this.squareAttackedOnBoard(board, king, color);
  }

  private squareAttacked(pos: Position, friendlyColor: PieceColor): boolean {
    return this.squareAttackedOnBoard(this.board, pos, friendlyColor);
  }

  private squareAttackedOnBoard(board: BoardGrid, pos: Position, friendlyColor: PieceColor): boolean {
    const enemy = friendlyColor === PieceColor.White ? PieceColor.Black : PieceColor.White;
    const ctx: MoveContext = { enPassantTarget: null };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== enemy) continue;
        const attacks = piece.candidateMoves({ row: r, col: c }, board, ctx);
        if (attacks.some(m => m.row === pos.row && m.col === pos.col)) return true;
      }
    }
    return false;
  }

  private findKing(board: BoardGrid, color: PieceColor): Position | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p instanceof King && p.color === color) return { row: r, col: c };
      }
    }
    return null;
  }

  makeMove(from: Position, to: Position): boolean {
    const piece = this.board[from.row][from.col];
    if (!piece) return false;

    const legal = this.getLegalMoves(from);
    if (!legal.some(m => m.row === to.row && m.col === to.col)) return false;

    // En passant capture
    if (
      piece instanceof Pawn &&
      this.enPassantTarget &&
      to.row === this.enPassantTarget.row &&
      to.col === this.enPassantTarget.col
    ) {
      this.board[from.row][to.col] = null;
    }

    // Update en passant target for next turn
    this.enPassantTarget = null;
    if (piece instanceof Pawn && Math.abs(to.row - from.row) === 2) {
      this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
    }

    // Castling: move the rook
    if (piece instanceof King && !piece.hasMoved) {
      const row = piece.color === PieceColor.White ? 7 : 0;
      if (to.col === 6) {
        const rook = this.board[row][7]!;
        rook.hasMoved = true;
        this.board[row][5] = rook;
        this.board[row][7] = null;
      } else if (to.col === 2) {
        const rook = this.board[row][0]!;
        rook.hasMoved = true;
        this.board[row][3] = rook;
        this.board[row][0] = null;
      }
    }

    piece.hasMoved = true;
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    // Pawn promotion — pause and wait for player choice
    if (piece instanceof Pawn && (to.row === 0 || to.row === 7)) {
      this.pendingPromotion = to;
      return true;
    }

    this.currentTurn = this.currentTurn === PieceColor.White ? PieceColor.Black : PieceColor.White;
    this.updateStatus();

    return true;
  }

  promote(type: PieceType): void {
    const pos = this.pendingPromotion;
    if (!pos) return;

    const color = this.board[pos.row][pos.col]!.color;
    const promoted: ChessPiece = (() => {
      switch (type) {
        case PieceType.Queen:  return new Queen(color, true);
        case PieceType.Rook:   return new Rook(color, true);
        case PieceType.Bishop: return new Bishop(color, true);
        case PieceType.Knight: return new Knight(color, true);
        default:               return new Queen(color, true);
      }
    })();

    this.board[pos.row][pos.col] = promoted;
    this.pendingPromotion = null;
    this.currentTurn = this.currentTurn === PieceColor.White ? PieceColor.Black : PieceColor.White;
    this.updateStatus();
  }

  private updateStatus(): void {
    const inCheck = this.isInCheck(this.currentTurn);
    const hasMove = this.anyLegalMove(this.currentTurn);

    if (!hasMove) {
      this.status = inCheck ? GameStatus.Checkmate : GameStatus.Stalemate;
    } else {
      this.status = inCheck ? GameStatus.Check : GameStatus.Active;
    }
  }

  private anyLegalMove(color: PieceColor): boolean {
    const savedTurn = this.currentTurn;
    this.currentTurn = color;
    let found = false;

    outer: for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== color) continue;
        const pos = { row: r, col: c };
        const moves = [
          ...piece.candidateMoves(pos, this.board, this.ctx()),
          ...(piece instanceof King ? this.castlingMoves(pos, piece) : []),
        ];
        if (moves.some(to => !this.leavesKingInCheck(pos, to))) {
          found = true;
          break outer;
        }
      }
    }

    this.currentTurn = savedTurn;
    return found;
  }

  get winner(): PieceColor | null {
    if (this.status !== GameStatus.Checkmate) return null;
    return this.currentTurn === PieceColor.White ? PieceColor.Black : PieceColor.White;
  }

  // Returns a fresh game without mutating this one
  static fresh(): Game {
    return new Game();
  }

  // Type helper used in UI
  getPieceType(pos: Position): PieceType | null {
    return this.board[pos.row][pos.col]?.type ?? null;
  }
}
