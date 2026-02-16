export const PLAYERS = {
    GREEN: 'green',
    YELLOW: 'yellow',
    BLUE: 'blue',
    RED: 'red'
};

export const PLAYER_ORDER = [PLAYERS.GREEN, PLAYERS.YELLOW, PLAYERS.BLUE, PLAYERS.RED];

export const GAME_MODES = {
    CLASSIC: 'classic',
    MASTER: 'master'
};

export const PIECE_COUNT = 4;
export const CELL_COUNT = 52;

// Indices on the main path where each player starts (0-indexed pathway)
export const START_POSITIONS = {
    [PLAYERS.GREEN]: 0,
    [PLAYERS.YELLOW]: 13,
    [PLAYERS.BLUE]: 26,
    [PLAYERS.RED]: 39
};

// Safe Spot Indices on the MAIN PATH (0-51)
export const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
