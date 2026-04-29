export const PieceColor = {
  White: 'white',
  Black: 'black',
} as const;
export type PieceColor = typeof PieceColor[keyof typeof PieceColor];

export const PieceType = {
  King:   'king',
  Queen:  'queen',
  Rook:   'rook',
  Bishop: 'bishop',
  Knight: 'knight',
  Pawn:   'pawn',
} as const;
export type PieceType = typeof PieceType[keyof typeof PieceType];

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Square = Piece | null;
export type Board = Square[][];
