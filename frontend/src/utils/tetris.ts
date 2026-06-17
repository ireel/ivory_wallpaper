export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface Coord {
  x: number;
  y: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  deadline?: string | null;
  shape?: TetrominoType;
  placedCoords?: Coord[];
}

export const TETROMINO_SHAPES: Record<TetrominoType, Coord[]> = {
  I: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  O: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  T: [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  S: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
  ],
  Z: [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  J: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  L: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00f0f0', // Neon Cyan
  O: '#f0f000', // Neon Yellow
  T: '#a000f0', // Neon Purple
  S: '#00f000', // Neon Green
  Z: '#f00000', // Neon Red
  J: '#0000f0', // Neon Blue
  L: '#f0a000', // Neon Orange
};

export const BOARD_COLS = 10;
export const BOARD_ROWS = 15;

/**
 * Deterministically generates a Tetromino type based on todo text and deadline
 */
export function getDeterministicShape(text: string, deadline?: string | null): TetrominoType {
  const shapes: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const seedString = text + (deadline || '');
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % shapes.length;
  return shapes[index];
}

/**
 * Simulates dropping a Tetromino shape onto the board and finds the lowest valid position.
 * Returns the absolute coordinates for the placed shape.
 */
export function calculatePlacement(
  shapeType: TetrominoType,
  existingCoords: Coord[]
): Coord[] {
  const shape = TETROMINO_SHAPES[shapeType];
  const occupied = new Set<string>(existingCoords.map(c => `${c.x},${c.y}`));

  // Determine shape bounding dimensions
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  shape.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  let bestPlacement: Coord[] = [];
  let bestLowestY = -999; // We want the lowest possible visual coordinate, which corresponds to the highest row index (Y)

  // Try placing the shape at each column starting point
  // The column range where the shape fits horizontally:
  // Since shape points are relative to 0, if minX is -1 and maxX is 1, the shape spans from col + minX to col + maxX.
  // We need: 0 <= col + minX and col + maxX < BOARD_COLS
  // So: -minX <= col < BOARD_COLS - maxX
  const startCol = -minX;
  const endCol = BOARD_COLS - maxX;

  for (let col = startCol; col < endCol; col++) {
    // Drop the shape from the top (row = -minY) down
    let lastValidRow = -minY;

    for (let row = -minY; row < BOARD_ROWS - maxY; row++) {
      // Check collision at this row
      let hasCollision = false;
      for (const p of shape) {
        const targetX = col + p.x;
        const targetY = row + p.y;
        if (targetY >= BOARD_ROWS || occupied.has(`${targetX},${targetY}`)) {
          hasCollision = true;
          break;
        }
      }

      if (hasCollision) {
        break;
      }
      lastValidRow = row;
    }

    // Map relative coordinates to absolute for this valid row
    const placement = shape.map(p => ({
      x: col + p.x,
      y: lastValidRow + p.y
    }));

    // Evaluate the "depth" of this placement. We want the one where the lowest block is closest to the bottom (row = BOARD_ROWS - 1)
    let maxPlacedY = -999;
    placement.forEach(p => {
      if (p.y > maxPlacedY) maxPlacedY = p.y;
    });

    if (maxPlacedY > bestLowestY) {
      bestLowestY = maxPlacedY;
      bestPlacement = placement;
    }
  }

  // If no placement was found (board full or weird errors), just place it at the top center
  if (bestPlacement.length === 0) {
    const centerCol = Math.floor(BOARD_COLS / 2);
    bestPlacement = shape.map(p => ({
      x: Math.max(0, Math.min(BOARD_COLS - 1, centerCol + p.x)),
      y: Math.max(0, Math.min(BOARD_ROWS - 1, p.y))
    }));
  }

  return bestPlacement;
}

/**
 * Re-runs gravity on all active blocks.
 * If some blocks are completed and removed, this shifts all remaining blocks down if there's empty space below them.
 */
export function applyGravity(todos: TodoItem[]): TodoItem[] {
  const activeTodos = todos.filter(t => !t.completed && t.placedCoords && t.placedCoords.length > 0);
  const completedOrNoCoords = todos.filter(t => t.completed || !t.placedCoords || t.placedCoords.length === 0);

  // We will run a simplified gravity pass:
  // Sort active todos by their lowest block's Y coordinate descending (bottom-most blocks first),
  // so we process blocks from the bottom up.
  const getLowestY = (t: TodoItem) => {
    if (!t.placedCoords) return 0;
    return Math.max(...t.placedCoords.map(c => c.y));
  };

  const sortedActive = [...activeTodos].sort((a, b) => getLowestY(b) - getLowestY(a));
  
  // Set of occupied grid coordinates
  const occupied = new Set<string>();

  const updatedActive = sortedActive.map(todo => {
    if (!todo.placedCoords || !todo.shape) return todo;

    // Remove current todo's coordinates from occupied for calculation
    // We want to see how far down this block can fall.
    // The relative shape positions are what define the block. We find the current absolute anchor:
    // Let's use the first block coordinate as anchor: anchor = todo.placedCoords[0]
    // The offsets are dx = coord.x - anchor.x, dy = coord.y - anchor.y
    const anchor = todo.placedCoords[0];
    const offsets = todo.placedCoords.map(c => ({ dx: c.x - anchor.x, dy: c.y - anchor.y }));

    let currentAnchorX = anchor.x;
    let currentAnchorY = anchor.y;
    let lastValidAnchorY = currentAnchorY;

    // Drop anchor Y
    for (let y = currentAnchorY; y < BOARD_ROWS; y++) {
      let collided = false;
      for (const off of offsets) {
        const targetX = currentAnchorX + off.dx;
        const targetY = y + off.dy;
        if (targetY >= BOARD_ROWS || occupied.has(`${targetX},${targetY}`)) {
          collided = true;
          break;
        }
      }
      if (collided) {
        break;
      }
      lastValidAnchorY = y;
    }

    // Place it and add to occupied
    const finalCoords = offsets.map(off => {
      const x = currentAnchorX + off.dx;
      const y = lastValidAnchorY + off.dy;
      occupied.add(`${x},${y}`);
      return { x, y };
    });

    return {
      ...todo,
      placedCoords: finalCoords
    };
  });

  // Combine back in original order if possible, or just concat
  // Let's map by ID to keep the original list order
  const updatedMap = new Map<string, TodoItem>();
  updatedActive.forEach(t => updatedMap.set(t.id, t));
  completedOrNoCoords.forEach(t => updatedMap.set(t.id, t));

  return todos.map(t => updatedMap.get(t.id) || t);
}
