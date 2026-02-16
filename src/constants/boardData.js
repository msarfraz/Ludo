// Map logical path index (0-51) to grid coordinates [row, col] (0-14)
// Starting from Green's start position relative area and moving clockwise
// The "Start" cell for Green is typically (6, 1). 
// Let's define the path strictly 0-51.
// 0 would be the cell BEFORE green start? Or is 0 the green start?
// Let's make index 0 = Green Start (6, 1).

export const PATH_COORDINATES = [
    // Green (West) Arm - Top Row
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    // Green -> Yellow Corner (North West)
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    // Turn
    [0, 7],
    // Top Right (Yellow) - Down
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    // Yellow Arm - Top Row
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    // Turn Right side
    [7, 14],
    // Yellow Arm - Bottom Row
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    // Blue Corner (South East) - Down
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    // Turn Bottom
    [14, 7],
    // Blue Corner - Up
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    // Red Arm (West) - Bottom Row
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    // Turn Left side
    [7, 0],
    // Back to Start (almost)
    [6, 0]
];
// Wait, that's manual mapping. Let's verify count.
// 5 + 6 + 1 + 6 + 6 + 1 + 6 + 6 + 1 + 6 + 6 + 1 + 1 = 52?
// Let's count:
// 1. [6,1]...[6,5] (5 cells)  -- Green Straight
// 2. [5,6]...[0,6] (6 cells)  -- Up
// 3. [0,7] (1 cell)           -- Top Center 
// 4. [0,8]...[5,8] (6 cells)  -- Down
// 5. [6,9]...[6,14] (6 cells) -- Right
// 6. [7,14] (1 cell)          -- Right Center
// 7. [8,14]...[8,9] (6 cells) -- Left
// 8. [9,8]...[14,8] (6 cells) -- Down
// 9. [14,7] (1 cell)          -- Bottom Center
// 10. [14,6]...[9,6] (6 cells)-- Up
// 11. [8,5]...[8,0] (6 cells) -- Left
// 12. [7,0] (1 cell)          -- Left Center
// 13. [6,0] (1 cell)          -- Back to just before start ?
// Total = 5 + 6 + 1 + 6 + 6 + 1 + 6 + 6 + 1 + 6 + 6 + 1 + 1 = 52. Correct.

// NOTE: This assumes Green Start is index 0.
// But wait, traditionally [6,1] IS the start for Green.
// So Green enters at Path Index 0.
// Yellow enters at Path Index 13?
// [0-4] = 5 cells.
// [5-10] = 6 cells. 
// [11] = 1 cell.
// Index 13 is [1,8]. Yellow Start is typically [2,8] (safe spot) or [1,8]?
// Standard board: 
// Green Safe: [6,1]
// Yellow Safe: [1,8]
// Blue Safe: [8,13]
// Red Safe: [13,6]
// Let's adjust START_OFFSETS relative to this array.

// HOME PATHS (The final stretch into the center)
export const HOME_PATHS = {
    green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Wait, Green home run is horizontal middle row usually? 
    // Green starts left, goes right. Home run is Row 7, Cols 1-6? 
    // Yes. (7,0) is the turn cell. (7,1)-(7,5) are colored. (7,6) is the final spot/triangle? No triangle is usually center.
    // Let's outline 6 cells leading to center.
    // Green: Row 7, Cols 1,2,3,4,5. Goal is Cell or Triangle.

    yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};
// Note: Coordinate system is Row(y), Col(x). 
// [1,7] is Row 1, Col 7.
