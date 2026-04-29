import { PieceType } from '../types/chess';
import { Game, GameStatus } from './Game';
import type { Position } from './pieces';

export class ChessBoardFactory {
  static generate(numMoves = 40): Game {
    const game = new Game();

    for (let i = 0; i < numMoves; i++) {
      if (game.status === GameStatus.Checkmate || game.status === GameStatus.Stalemate) break;

      const moves = ChessBoardFactory.allLegalMoves(game);
      if (moves.length === 0) break;

      const { from, to } = moves[Math.floor(Math.random() * moves.length)];
      game.makeMove(from, to);

      if (game.pendingPromotion) {
        game.promote(PieceType.Queen);
      }
    }

    return game;
  }

  static generateMany(count: number, numMoves = 40): Game[] {
    return Array.from({ length: count }, () => ChessBoardFactory.generate(numMoves));
  }

  private static allLegalMoves(game: Game): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = game.board[r][c];
        if (!piece || piece.color !== game.currentTurn) continue;
        const from: Position = { row: r, col: c };
        for (const to of game.getLegalMoves(from)) {
          moves.push({ from, to });
        }
      }
    }
    return moves;
  }
}
