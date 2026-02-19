import React, { useState, useEffect, useRef } from 'react';
import Token from './Token';
import Dice from './Dice';
import { getBoardCoordinates } from '../utils/boardUtils';
import { PATH_COORDINATES, HOME_PATHS } from '../constants/boardData';
import { SAFE_SPOTS as SAFE_SPOTS_INDICES } from '../constants/gameConstants';
import { PLAYER_ORDER, GAME_MODES } from '../constants/gameConstants';

const LudoBoard = ({ gameState, onTokenClick, currentPlayer, isTeamMode, gameMode, playerData, diceProps, validTokens = [] }) => {
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
                if (prev && curr.stepsMoved > prev.stepsMoved) {
                    movingTokens.push({
                        color,
                        id: curr.id,
                        from: prev.stepsMoved,
                        to: curr.stepsMoved,
                        current: prev.stepsMoved
                    });
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
        const { stepsMoved } = token;

        if (stepsMoved === -1) {
            return { location: 'HOME' };
        } else if (stepsMoved === 56) {
            return { location: 'GOAL' };
        } else {
            const isLocked = gameMode === GAME_MODES.MASTER && !playerData[color]?.hasCaptured;
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
                boardTokens.push({ ...token, color, r: style.r, c: style.c, isValid });
            }
        });
    });

    // Sort boardTokens for Z-Index / Click Priority
    // 1. Inactive Players (Bottom)
    // 2. Active Player Invalid
    // 3. Active Player Valid (Top)
    boardTokens.sort((a, b) => {
        const scoreA = (a.color === currentPlayer ? 10 : 0) + (a.isValid ? 20 : 0);
        const scoreB = (b.color === currentPlayer ? 10 : 0) + (b.isValid ? 20 : 0);
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
                        <div key={`spot-${color}-${id}`} className="token-spot">
                            {tokenAtHome && (
                                <Token
                                    color={color}
                                    onClick={() => onTokenClick(color, id)}
                                    isValid={isValid}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderExternalTray = (playerColor) => {
        const isActive = currentPlayer === playerColor;
        if (!isActive) return null;

        const isTop = playerColor === 'green' || playerColor === 'yellow';
        const trayClass = isTop ? 'top-tray-area' : 'bottom-tray-area';

        return (
            <div className={`external-tray-container ${trayClass} active-${playerColor} ${isActive ? 'active' : ''}`}>

                {diceProps.canRoll && (
                    <Dice
                        value={diceProps.queue.length > 0 ? diceProps.queue[diceProps.queue.length - 1].value : 0}
                        onRoll={diceProps.onRoll}
                        rolling={diceProps.rolling}
                        disabled={!diceProps.canRoll}
                        size={48}
                    />
                )}

                {diceProps.queue.length > 0 && (
                    <div className="stacked-rolls-container">
                        {diceProps.queue.map(d => (
                            <div
                                key={d.id}
                                className={`stacked-roll-item color-gray ${diceProps.selectedId === d.id ? 'selected' : ''} ${diceProps.canRoll ? 'disabled' : ''}`}
                                onClick={() => diceProps.onSelect(d.id)}
                            >
                                <Dice value={d.value} size={32} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="ludo-board-wrapper">
            <div className="ludo-board">
                {/* External Trays */}
                {renderExternalTray(currentPlayer)}

                {/* Render Houses */}
                {renderHomeBase('green', 'home-green')}
                {renderHomeBase('yellow', 'home-yellow')}
                {renderHomeBase('red', 'home-red')}
                {renderHomeBase('blue', 'home-blue')}

                {/* Center */}
                <div className="center-home">
                    <div className="quad-green"></div>
                    <div className="quad-yellow"></div>
                    <div className="quad-red"></div>
                    <div className="quad-blue"></div>
                    <div className="center-circle">
                        <div className="center-dot"></div>
                    </div>
                    {/* Goal Tokens - could render here in future */}
                </div>

                {/* Render ALL Main Path Cells (0-51) */}
                {PATH_COORDINATES.map((coords, idx) => {
                    const isSafe = SAFE_SPOTS_INDICES.includes(idx);
                    let safeColor = null;
                    if (isSafe) {
                        if (idx <= 8) safeColor = 'var(--color-green)';
                        else if (idx <= 21) safeColor = 'var(--color-yellow)';
                        else if (idx <= 34) safeColor = 'var(--color-blue)';
                        else safeColor = 'var(--color-red)';
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
                            {showBarrier && <div className="barrier-icon">🔒</div>}
                        </div>
                    );
                })}
                {/* Yellow */}
                {HOME_PATHS.yellow.map((coords, i) => {
                    const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['yellow']?.hasCaptured;
                    return (
                        <div key={`hp-y-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-yellow)' }}>
                            {showBarrier && <div className="barrier-icon">🔒</div>}
                        </div>
                    );
                })}
                {/* Blue */}
                {HOME_PATHS.blue.map((coords, i) => {
                    const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['blue']?.hasCaptured;
                    return (
                        <div key={`hp-b-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-blue)' }}>
                            {showBarrier && <div className="barrier-icon">🔒</div>}
                        </div>
                    );
                })}
                {/* Red */}
                {HOME_PATHS.red.map((coords, i) => {
                    const showBarrier = i === 0 && gameMode === GAME_MODES.MASTER && !playerData['red']?.hasCaptured;
                    return (
                        <div key={`hp-r-${i}`} className={`cell home-safe-cell ${showBarrier ? 'home-barrier' : ''}`} style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, backgroundColor: 'var(--color-red)' }}>
                            {showBarrier && <div className="barrier-icon">🔒</div>}
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
                                transform: `scale(${scale}) translate(${offsetX}%, ${offsetY}%)`,
                                pointerEvents: 'auto'
                            }}>
                                <Token
                                    color={t.color}
                                    onClick={() => onTokenClick(t.color, t.id)}
                                    animate={isCurrent}
                                    isValid={t.isValid}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LudoBoard;
