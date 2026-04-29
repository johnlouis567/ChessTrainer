# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server with HMR
npm run build    # tsc type-check then Vite production build
npm run lint     # ESLint across all .ts/.tsx files
npm run preview  # serve the production build locally
```

There are no tests.

## Architecture

### Layers

```
src/types/chess.ts          ← shared enums (no logic)
src/engine/pieces.ts        ← OO piece classes
src/engine/Game.ts          ← game state + rule enforcement
src/audio/sounds.ts         ← Web Audio API sound effects
src/components/ChessBoard.tsx + .css   ← React UI
```

### Enum pattern

All enums follow the same const-as-enum pattern used throughout — never plain TypeScript `enum`:

```ts
export const Foo = { A: 'a', B: 'b' } as const;
export type Foo = typeof Foo[keyof typeof Foo];
```

`PieceColor` and `PieceType` live in `src/types/chess.ts`; `GameStatus` lives alongside `Game` in `src/engine/Game.ts`.

### Board coordinate system

`board[row][col]` where `row 0` = rank 8 (black back rank) and `row 7` = rank 1 (white back rank). `col 0` = file a, `col 7` = file h. White pawns move in the `-row` direction, black in the `+row` direction.

### Engine: two-phase move generation

`ChessPiece.candidateMoves()` returns **pseudo-legal** moves — geometrically valid but not filtered for check. `Game.getLegalMoves()` filters these by simulating each move on a shallow board copy (`board.map(r => [...r])`) and rejecting any that leave the active king in check.

Castling is intentionally absent from `King.candidateMoves()` because it requires check detection, which would create a circular dependency between `pieces.ts` and `Game.ts`. It is generated separately in `Game.castlingMoves()` and appended before the legality filter.

### Game state and promotion flow

`Game` is mutable. When a pawn reaches the back rank, `makeMove()` sets `pendingPromotion: Position` and returns **without** switching turns or calling `updateStatus()`. The UI renders a picker overlay; calling `promote(type)` places the chosen piece and then completes the turn normally. Nothing else should call `updateStatus()` or advance `currentTurn` while `pendingPromotion` is set.

### React rendering

`ChessBoard` holds the `Game` instance in a `useRef` (not state) and calls `forceUpdate` (an incrementing `useState` counter) to trigger re-renders after mutations. `animInfo` state tracks `{ moves: AnimMove[], key: number }` for the most recent move. Changing the React `key` prop on a piece `<span>` forces React to unmount and remount it, which restarts the CSS animation; this is the mechanism for per-move slide animations. The `key` must change on every move — `Date.now()` is used for this. `SQUARE_SIZE = 72` in `ChessBoard.tsx` must stay in sync with `.board__square` dimensions in `ChessBoard.css`.

### TypeScript strictness

`tsconfig.app.json` enables `verbatimModuleSyntax`, so type-only imports **must** use `import type`. The engine files already follow this: value imports (`ChessPiece`, `Pawn`, …) and type imports (`Position`, `BoardGrid`, `MoveContext`) are in separate `import` / `import type` statements.
