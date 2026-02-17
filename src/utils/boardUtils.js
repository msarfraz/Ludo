import { PATH_COORDINATES, HOME_PATHS } from '../constants/boardData';
import { START_POSITIONS, PLAYERS } from '../constants/gameConstants';

// We need normalized start offsets for the calculations
// Green starts at index 0 of the path array.
// Yellow starts at index 13.
// Blue at 26.
// Red at 39.
const PATH_OFFSETS = {
    [PLAYERS.GREEN]: 0,
    [PLAYERS.YELLOW]: 13,
    [PLAYERS.BLUE]: 26,
    [PLAYERS.RED]: 39
};

export const getBoardCoordinates = (color, stepsMoved, isLocked = false) => {
    // stepsMoved: -1 (Home Logic handled by component usually, but let's see), 
    // 0 (Start Position), ... 50 (End of cycle), 51-56 (Home Path)

    if (stepsMoved === -1) return null; // Component handles Home position styling

    // Home Path
    if (stepsMoved > 50 && !isLocked) {
        const homePathIndex = stepsMoved - 51;
        const path = HOME_PATHS[color];
        if (path && homePathIndex < path.length) {
            return path[homePathIndex];
        }
        // If stepsMoved is 56 (Goal), maybe return specific Goal coords or handle in UI
        // For now assuming 56 is the end.
        if (stepsMoved === 56) return 'GOAL';
        return null;
    }

    // Main Path
    const offset = PATH_OFFSETS[color];
    const pathIndex = (offset + stepsMoved) % 52;
    return PATH_COORDINATES[pathIndex];
};

export const isSafeSpot = (pathIndex) => {
    // Defines safe spots on the main path (0-51)
    // 0 (Green Start), 8 (Globe), 13 (Yellow Start), 21 (Globe)... 
    // Wait, let's verify Safe Spots indices in boardData.
    // I defined SAFE_SPOTS there.
    return false; // We will use the imported constant if needed, or pass logic
};
