import React, { useState, useEffect, useRef } from 'react';
import Token from './Token';
import Dice from './Dice';
import { getBoardCoordinates } from '../utils/boardUtils';
import { PATH_COORDINATES, HOME_PATHS } from '../constants/boardData';
import { SAFE_SPOTS as SAFE_SPOTS_INDICES } from '../constants/gameConstants';
import { PLAYER_ORDER } from '../constants/gameConstants';

const LudoBoard = ({ gameState, onTokenClick, currentPlayer, isTeamMode, diceProps, validTokens = [] }) => {
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
            const coords = getBoardCoordinates(color, stepsMoved);
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
                {isCurrent && (


                    <div className="internal-dice-container" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                        {/* Render Dice Queue or Default Placeholder if empty but canRoll */}
                        {diceProps.queue.length > 0 ? (
                            diceProps.queue.map(d => (
                                <div
                                    key={d.id}
                                    onClick={() => diceProps.onSelect(d.id)}
                                    style={{
                                        transform: diceProps.selectedId === d.id ? 'scale(1.2)' : 'scale(1)',
                                        border: diceProps.selectedId === d.id ? '3px solid #ffeb3b' : 'none',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Dice value={d.value} disabled={false} rolling={false} onRoll={() => { }} />
                                    {/* Note: onRoll is empty because clicking dice selects it. The main roll button handles rolling? WAt. 
                                         Wait, we need a way to ROLL. 
                                         Usually clicking the dice ROLLS it.
                                         If queue is empty, click to roll.
                                         If queue has items, click to select.
                                         But we support stacking. So if 6 is rolled, we might want to click to roll AGAIN.
                                     */}
                                </div>
                            ))
                        ) : (
                            // No dice yet, show placeholder to roll
                            <Dice {...diceProps} />
                        )}

                        {/* If canRoll is true, and we have dice, we render an EXTRA placeholder to allow rolling again? or just a button? 
                            Let's keep it simple: If can roll, always show a "Roll" button or a placeholder dice?
                            Let's append a "Roll" button if canRoll is true and queue > 0.
                         */}
                        {diceProps.canRoll && diceProps.queue.length > 0 && (
                            <div onClick={diceProps.onRoll} style={{ cursor: 'pointer', opacity: 0.8, transform: 'scale(0.8)' }}>
                                <Dice value={0} disabled={false} rolling={diceProps.rolling} />
                            </div>
                        )}
                    </div>
                )}

                {/* Render Home Tokens (Use Visual State) */}
                {visualState[color].map(t => {
                    if (t.stepsMoved !== -1) return null;
                    const isValid = validTokens.includes(`${color}-${t.id}`);
                    return (
                        <div key={t.id} className="token-spot">
                            <Token color={color} onClick={() => onTokenClick(color, t.id)} isValid={isValid} />
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="ludo-board">
            {/* Render Base Structure */}
            {renderHomeBase('green', 'home-green')}
            {renderHomeBase('yellow', 'home-yellow')}
            {renderHomeBase('blue', 'home-blue')}
            {renderHomeBase('red', 'home-red')}

            {/* Center */}
            <div className="center-home">
                <div className="tri-green"></div>
                <div className="tri-yellow"></div>
                <div className="tri-blue"></div>
                <div className="tri-red"></div>
                {/* Goal Tokens - could render here in future */}
            </div>

            {/* Render ALL Main Path Cells (0-51) */}
            {PATH_COORDINATES.map((coords, idx) => {
                const isSafe = SAFE_SPOTS_INDICES.includes(idx);
                // Check if this cell is a safe spot to add the icon class
                // But we want ALL cells to have border, so we render a .cell for each
                return (
                    <div
                        key={`path-${idx}`}
                        className={`cell ${isSafe ? 'safe-spot' : ''}`}
                        style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1 }}
                    >
                        {/* Content like stars handles via CSS class */}
                    </div>
                );
            })}

            {/* Render Home Paths with Borders */}
            {/* Green */}
            {HOME_PATHS.green.map((coords, i) => (
                <div key={`hp-g-${i}`} className="cell" style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, background: 'var(--color-green)' }}></div>
            ))}
            {/* Yellow */}
            {HOME_PATHS.yellow.map((coords, i) => (
                <div key={`hp-y-${i}`} className="cell" style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, background: 'var(--color-yellow)' }}></div>
            ))}
            {/* Blue */}
            {HOME_PATHS.blue.map((coords, i) => (
                <div key={`hp-b-${i}`} className="cell" style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, background: 'var(--color-blue)' }}></div>
            ))}
            {/* Red */}
            {HOME_PATHS.red.map((coords, i) => (
                <div key={`hp-r-${i}`} className="cell" style={{ gridRow: coords[0] + 1, gridColumn: coords[1] + 1, background: 'var(--color-red)' }}></div>
            ))}


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
    );
};

export default LudoBoard;
