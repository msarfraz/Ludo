import React, { useState, useEffect, useRef } from 'react';
import Token from './Token';
import Dice from './Dice';
import { getBoardCoordinates } from '../utils/boardUtils';
import { PATH_COORDINATES, HOME_PATHS } from '../constants/boardData';
import { SAFE_SPOTS as SAFE_SPOTS_INDICES } from '../constants/gameConstants';
import { PLAYER_ORDER, GAME_MODES } from '../constants/gameConstants';

const LudoBoard = ({
    gameState,
    onTokenClick,
    currentPlayer,
    isTeamMode,
    gameMode,
    playerData,
    diceProps,
    validTokens = [],
    capturableTokens = [],
    activeMoveSelection = null,
    onSelectMove,
    onCancelMove
}) => {
    // ... logic ...
    const isTeammateColor = (color) => {
        if (!isTeamMode) return false;
        const currIdx = PLAYER_ORDER.indexOf(currentPlayer);
        const colorIdx = PLAYER_ORDER.indexOf(color);
        return Math.abs(currIdx - colorIdx) === 2;
    };

    // Visual State for Animation
    const [visualState, setVisualState] = useState(gameState);
    const animationRef = useRef(null);
    // ... skip animation useEffect for now ...


    // Sync Visual State with Logical State (with Animation)
    useEffect(() => {
        // Find tokens that have moved FORWARD (not reset to home)
        const movingTokens = [];
        PLAYER_ORDER.forEach(color => {
            const currentTokens = gameState[color];
            const prevTokens = visualState[color];

            currentTokens.forEach(curr => {
                const prev = prevTokens.find(p => p.id === curr.id);
                if (prev) {
                    const wrappedAround = prev.stepsMoved > 45 && curr.stepsMoved >= 0 && curr.stepsMoved < 15;
                    if (curr.stepsMoved > prev.stepsMoved || wrappedAround) {
                        movingTokens.push({
                            color,
                            id: curr.id,
                            from: prev.stepsMoved,
                            to: wrappedAround ? curr.stepsMoved + 52 : curr.stepsMoved,
                            current: prev.stepsMoved
                        });
                    }
                }
            });
        });

        if (movingTokens.length > 0) {
            // Animate
            let activeMovers = [...movingTokens];

            const animateStep = () => {
                let hasChanges = false;
                let finished = true;

                // Update movers
                activeMovers = activeMovers.map(mover => {
                    if (mover.current < mover.to) {
                        hasChanges = true;
                        finished = false;
                        return { ...mover, current: mover.current + 1 };
                    }
                    return mover;
                });

                if (hasChanges) {
                    setVisualState(prev => {
                        const newState = { ...prev };
                        activeMovers.forEach(mover => {
                            newState[mover.color] = newState[mover.color].map(t =>
                                t.id === mover.id ? { ...t, stepsMoved: mover.current } : t
                            );
                        });
                        return newState;
                    });

                    // Continue animation loop
                    animationRef.current = setTimeout(animateStep, 200); // 200ms per step
                } else {
                    // All reached target, ensure exact sync
                    setVisualState(gameState);
                }
            };

            animateStep();
        } else {
            // No forward movement (e.g. valid immediate sync or reset/capture)
            // For captures (X -> -1), we sync immediately for now
            setVisualState(gameState);
        }

        return () => {
            if (animationRef.current) clearTimeout(animationRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState]); // We rely on gameState changes to trigger this.

    // Helper to get style for a token

    const getTokenStyle = (color, token) => {
        let r, c;
        const isLocked = gameMode === GAME_MODES.MASTER && !playerData[color]?.hasCaptured;
        // Apply modulo 52 for animation frames that wrap around
        const stepsMoved = isLocked && token.stepsMoved > 50 ? token.stepsMoved % 52 : token.stepsMoved;

        if (stepsMoved === -1) {
            return { location: 'HOME' };
        } else if (stepsMoved === 56) {
            // Map to central triangles (1-indexed grid)
            // Green: West, Yellow: North, Blue: East, Red: South
            if (color === 'green') return { location: 'BOARD', r: 8, c: 7 };
            if (color === 'yellow') return { location: 'BOARD', r: 7, c: 8 };
            if (color === 'blue') return { location: 'BOARD', r: 8, c: 9 };
            if (color === 'red') return { location: 'BOARD', r: 9, c: 8 };
            return { location: 'GOAL' };
        } else {
            const coords = getBoardCoordinates(color, stepsMoved, isLocked);
            if (coords) {
                return { location: 'BOARD', r: coords[0] + 1, c: coords[1] + 1 }; // 1-indexed grid
            }
        }
        return { location: 'UNKNOWN' };
    };

    // Group tokens by cell to handle overlaps (Render based on VISUAL STATE)
    const boardTokens = [];
    PLAYER_ORDER.forEach(color => {
        // Use visualState for rendering
        visualState[color].forEach(token => {
            const style = getTokenStyle(color, token);
            if (style.location === 'BOARD') {
                const isValid = validTokens.includes(`${color}-${token.id}`);
                const isCapturable = capturableTokens.includes(`${color}-${token.id}`);
                boardTokens.push({ ...token, color, r: style.r, c: style.c, isValid, isCapturable });
            }
        });
    });

    // Sort boardTokens for Z-Index / Click Priority
    // 1. Inactive Players (Bottom)
    // 2. Active Player Invalid
    // 3. Active Player Valid (Top)
    boardTokens.sort((a, b) => {
        const scoreA = (a.color === currentPlayer ? 10 : 0) + (a.isValid ? 20 : 0) + (a.isCapturable ? 15 : 0);
        const scoreB = (b.color === currentPlayer ? 10 : 0) + (b.isValid ? 20 : 0) + (b.isCapturable ? 15 : 0);
        return scoreA - scoreB;
    });

    // Render Grid Cells for safe spots
    const safeSpotCells = SAFE_SPOTS_INDICES.map(idx => {
        const coords = PATH_COORDINATES[idx];
        return coords ? { r: coords[0] + 1, c: coords[1] + 1 } : null;
    }).filter(Boolean);

    const renderHomeBase = (color, cssClass) => {
        const isCurrent = currentPlayer === color;
        const isTeam = isTeammateColor(color);

        return (
            <div className={`home-base ${cssClass} ${isCurrent ? 'active-turn' : ''} ${isTeam ? 'teammate-turn' : ''}`}>
                {/* Render Home Token Sockets (Always 4) */}
                {[0, 1, 2, 3].map(id => {
                    const tokenAtHome = visualState[color].find(t => t.id === id && t.stepsMoved === -1);
                    const isValid = tokenAtHome ? validTokens.includes(`${color}-${id}`) : false;

                    return (
                        <div
                            key={`spot-${color}-${id}`}
                            className="home-quad"
                            style={{
                                zIndex: (activeMoveSelection?.tokenId === id && activeMoveSelection?.color === color) ? 9999 : 1
                            }}
                        >
                            {tokenAtHome && (
                                <Token
                                    color={color}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTokenClick(color, id);
                                    }}
                                    isValid={isValid}
                                    moveOptions={activeMoveSelection?.tokenId === id && activeMoveSelection?.color === color ? activeMoveSelection.options : null}
                                    onSelectMove={onSelectMove}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDiceTray = (playerColor) => {
        const isActive = currentPlayer === playerColor;
        const isLegacy = !isActive && diceProps.prevTurnData?.color === playerColor;

        const currentRolls = isActive ? (diceProps?.queue || []) : (isLegacy ? (diceProps.prevTurnData.queue || []) : []);

        // Logical separation: show legacy value if it's NOT the current turn but we just finished
        let mainDiceValue = 0;
        if (isActive) {
            mainDiceValue = (!diceProps.rolling && diceProps.value !== 6) ? diceProps.value : 0;
        } else if (isLegacy) {
            mainDiceValue = diceProps.prevTurnData.value !== 6 ? diceProps.prevTurnData.value : 0;
        }

        // All rolled dice shown in tray since main dice displays star
        const trayDice = currentRolls;

        return (
            <div className={`tray-player-container active-${playerColor} ${isActive ? 'active' : ''}`}>
                <div className="dice-container-inner">
                    <Dice
                        value={mainDiceValue}
                        onRoll={isActive ? diceProps.onRoll : undefined}
                        rolling={isActive ? diceProps.rolling : false}
                        disabled={!isActive || !diceProps.canRoll}
                        isActive={isActive}
                        size={44}
                    />

                    {(isActive || isLegacy) && trayDice.length > 0 && (
                        <div className="stacked-rolls-container">
                            {trayDice.map(d => (
                                <div
                                    key={d.id}
                                    className={`stacked-roll-item color-gray ${diceProps.selectedId === d.id ? 'selected' : ''} ${diceProps.canRoll ? 'disabled' : ''}`}
                                    onClick={() => isActive ? diceProps.onSelect(d.id) : null}
                                >
                                    <Dice value={d.value} size={30} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!isActive && (
                        <div style={{ opacity: 0.5, fontWeight: 'bold', color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {playerColor}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="game-container" onClick={() => onCancelMove && onCancelMove()}>
            {/* Top Tray Section */}
            <div className="tray-section">
                <div className="tray-content-wrapper">
                    {renderDiceTray('green')}
                    {renderDiceTray('yellow')}
                </div>
            </div>

            {/* Board Section */}
            <div className="board-section">
                <div className="ludo-board-wrapper">
                    <div className="ludo-board">
                        {/* Render Houses */}
                        {renderHomeBase('green', 'home-green')}
                        {renderHomeBase('yellow', 'home-yellow')}
                        {renderHomeBase('red', 'home-red')}
                        {renderHomeBase('blue', 'home-blue')}

                        {/* Center Home - Triangular Layout */}
                        <div className="center-home">
                            <div className="triangle-top"></div>
                            <div className="triangle-right"></div>
                            <div className="triangle-bottom"></div>
                            <div className="triangle-left"></div>
                            <div className="center-seal">
                                <div className="seal-inner"></div>
                            </div>
                        </div>

                        {/* Render ALL Main Path Cells (0-51) */}
                        {PATH_COORDINATES.map((coords, idx) => {
                            const isSafe = SAFE_SPOTS_INDICES.includes(idx);
                            let safeColor = null;
                            if (isSafe) {
                                // Use house colors only for starting points
                                if (idx === 0) safeColor = 'var(--color-green)';
                                else if (idx === 13) safeColor = 'var(--color-yellow)';
                                else if (idx === 26) safeColor = 'var(--color-blue)';
                                else if (idx === 39) safeColor = 'var(--color-red)';
                                else safeColor = '#ddd'; // Neutral safe spots
                            }

                            return (
                                <div
                                    key={`path-${idx}`}
                                    className={`cell ${isSafe ? 'safe-spot' : ''}`}
                                    style={{
                                        gridRow: coords[0] + 1,
                                        gridColumn: coords[1] + 1,
                                        backgroundColor: safeColor || 'transparent'
                                    }}
                                >
                                    {/* Content like stars handles via CSS class */}
                                </div>
                            );
                        })}

                        {/* Render Home Paths with Borders */}
                        {/* Green */}
                        {HOME_PATHS.green.map((coords, i) => {
                            const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['green']?.hasCaptured;
                            return (
                                <div key={`hp-g-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-green)' }}>
                                    {showBarrier && <div className="caution-barrier barrier-green"></div>}
                                </div>
                            );
                        })}
                        {/* Yellow */}
                        {HOME_PATHS.yellow.map((coords, i) => {
                            const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['yellow']?.hasCaptured;
                            return (
                                <div key={`hp-y-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-yellow)' }}>
                                    {showBarrier && <div className="caution-barrier barrier-yellow"></div>}
                                </div>
                            );
                        })}
                        {/* Blue */}
                        {HOME_PATHS.blue.map((coords, i) => {
                            const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['blue']?.hasCaptured;
                            return (
                                <div key={`hp-b-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-blue)' }}>
                                    {showBarrier && <div className="caution-barrier barrier-blue"></div>}
                                </div>
                            );
                        })}
                        {/* Red */}
                        {HOME_PATHS.red.map((coords, i) => {
                            const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['red']?.hasCaptured;
                            return (
                                <div key={`hp-r-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-red)' }}>
                                    {showBarrier && <div className="caution-barrier barrier-red"></div>}
                                </div>
                            );
                        })}


                        {/* Render Active Tokens on Board */}
                        {boardTokens.map((t, i) => {
                            const isCurrent = t.color === currentPlayer;
                            const overlaps = boardTokens.filter(ot => ot.r === t.r && ot.c === t.c);
                            const offsetIdx = overlaps.findIndex(ot => ot.color === t.color && ot.id === t.id);
                            const scale = overlaps.length > 1 ? 0.7 : 1;
                            const offsetX = overlaps.length > 1 ? (offsetIdx % 2) * 20 - 10 : 0;
                            const offsetY = overlaps.length > 1 ? Math.floor(offsetIdx / 2) * 20 - 10 : 0;

                            return (
                                <div
                                    key={`${t.color}-${t.id}`}
                                    style={{
                                        gridRow: t.r,
                                        gridColumn: t.c,
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        transition: 'grid-row 0.4s ease-out, grid-column 0.4s ease-out' // Smooth board movement
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        transform: `scale(${scale}) translate(${offsetX}%, ${offsetY}%)`,
                                        pointerEvents: 'auto',
                                        zIndex: (activeMoveSelection?.tokenId === t.id && activeMoveSelection?.color === t.color) ? 9999 : 1
                                    }}>
                                        <Token
                                            color={t.color}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTokenClick(t.color, t.id);
                                            }}
                                            animate={isCurrent}
                                            isValid={t.isValid}
                                            isCapturable={t.isCapturable}
                                            moveOptions={activeMoveSelection?.tokenId === t.id && activeMoveSelection?.color === t.color ? activeMoveSelection.options : null}
                                            onSelectMove={onSelectMove}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Tray Section */}
            <div className="tray-section">
                <div className="tray-content-wrapper">
                    {renderDiceTray('red')}
                    {renderDiceTray('blue')}
                </div>
            </div>
        </div >
    );
};

export default LudoBoard;
