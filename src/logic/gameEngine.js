import { useState, useCallback, useEffect, useRef } from 'react';
import { PLAYERS, PLAYER_ORDER, PIECE_COUNT, GAME_MODES, START_POSITIONS, SAFE_SPOTS } from '../constants/gameConstants';
import { playDiceRollSound, playMoveSound } from '../utils/soundUtils';

const PATH_OFFSETS = {
    [PLAYERS.GREEN]: 0,
    [PLAYERS.YELLOW]: 13,
    [PLAYERS.BLUE]: 26,
    [PLAYERS.RED]: 39
};

export const useLudoGame = (gameMode = GAME_MODES.CLASSIC, isTeamMode = false) => {
    const [turn, setTurn] = useState(0);
    const [diceQueue, setDiceQueue] = useState([]); // Array of { id, value }
    const [selectedDiceId, setSelectedDiceId] = useState(null);
    const [rolling, setRolling] = useState(false);
    const [canRoll, setCanRoll] = useState(true);
    const [lastRollValue, setLastRollValue] = useState(0);
    const [prevTurnData, setPrevTurnData] = useState({ color: null, value: 0 });
    const prevTurnTimerRef = useRef(null);
    const [consecutiveSixes, setConsecutiveSixes] = useState(0);
    const pendingAutoMoveRef = useRef(null);

    // Final cleanup on unmount
    useEffect(() => {
        return () => {
            if (prevTurnTimerRef.current) clearTimeout(prevTurnTimerRef.current);
        };
    }, []);

    const [playerData, setPlayerData] = useState(() => {
        const data = {};
        PLAYER_ORDER.forEach(p => {
            data[p] = {
                hasCaptured: false
            };
        });
        return data;
    });

    const [gameState, setGameState] = useState(() => {
        const initialState = {};
        PLAYER_ORDER.forEach(color => {
            initialState[color] = Array(PIECE_COUNT).fill(0).map((_, i) => ({
                id: i,
                stepsMoved: -1
            }));
        });
        return initialState;
    });

    // Auto-select first dice if nothing selected and queue has items
    useEffect(() => {
        if (diceQueue.length > 0 && selectedDiceId === null) {
            setSelectedDiceId(diceQueue[0].id);
        }
    }, [diceQueue, selectedDiceId]);

    const currentPlayerColor = PLAYER_ORDER[turn];

    const isValidMove = useCallback((token, diceValue, tokenColor = currentPlayerColor) => {
        if (token.stepsMoved === -1 && diceValue !== 6) return false;
        const isMasterLocked = gameMode === GAME_MODES.MASTER && !playerData[tokenColor]?.hasCaptured;

        if (!isMasterLocked && token.stepsMoved + diceValue > 56) return false;

        // Double Token Checks
        const currentTokens = gameState[tokenColor];
        // If locked, main path extends to step 51
        const mainPathLimit = isMasterLocked ? 51 : 50;
        const tokensAtSpot = currentTokens.filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved <= mainPathLimit);
        const isDoubled = tokensAtSpot.length >= 2;
        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[tokenColor] + token.stepsMoved) % 52);

        if (isDoubled) {
            // Rule: Double tokens can only be separated on safe spots.
            // If not safe, must move as pair. 
            // Pair move requires EVEN dice.
            if (!isSafe) {
                if (diceValue % 2 !== 0) return false; // Odd dice cannot move unsplit pair
                // Even dice moves pair half steps
                if (token.stepsMoved + (diceValue / 2) > 56) return false;
            } else {
                // Safe spot: Can move as pair (if even) or single (if odd or even)
                // If dice is even, we intuitively prioritize pair move, but single is also valid logic-wise.
                // But for "can I move at all?", valid is valid.
                // We'll return true if either is possible.
                // Single move check:
                if (token.stepsMoved + diceValue <= 56) return true;
                // Pair move check:
                if (diceValue % 2 === 0 && token.stepsMoved + (diceValue / 2) <= 56) return true;
                return false;
            }
        }

        // Blockade Check (Rule: No single token can pass over a double token unless on safe spot)

        // If exiting home (-1 -> 0), we don't traverse. We just spawn. 
        // So no path blocking check needed. 
        if (token.stepsMoved === -1) {
            // We are spawning at 0. 
            // Rule: Single token cannot capture opponent Double.
            // Check if 0 has opponent Double.
            const offset = PATH_OFFSETS[tokenColor];
            const startGlobal = offset % 52;

            let blockedByOpponentDouble = false;
            PLAYER_ORDER.forEach(pColor => {
                if (pColor === tokenColor) return;

                // Team Mode: Is pColor a teammate?
                let isTeammate = false;
                if (isTeamMode) {
                    const idx1 = PLAYER_ORDER.indexOf(tokenColor);
                    const idx2 = PLAYER_ORDER.indexOf(pColor);
                    if (Math.abs(idx1 - idx2) === 2) isTeammate = true;
                }

                // Usually teammates don't block? Let's assume Teammate Double is safe to cross/land/spawn?
                // User requirement just said "share dice". 
                // But blockade rule says "Opponent Double". Teammate is not opponent.
                if (isTeammate) return;

                const pOffset = PATH_OFFSETS[pColor];
                const pRelative = (startGlobal - pOffset + 52) % 52;
                const oppTokens = gameState[pColor].filter(t => t.stepsMoved === pRelative);
                if (oppTokens.length >= 2) {
                    blockedByOpponentDouble = true;
                }
            });

            if (blockedByOpponentDouble) {
                return false;
            }
            return true;
        }

        // Check moves from current+1 to target
        const startStep = token.stepsMoved + 1;
        const endStep = token.stepsMoved + diceValue;

        for (let step = startStep; step < endStep; step++) {
            // Check if there is a double at this step
            if (step > 50 && !isMasterLocked) continue; // Home stretch usually no blocking

            const offset = PATH_OFFSETS[tokenColor];
            const globalIndex = (offset + step) % 52;
            const isSpotSafe = SAFE_SPOTS.includes(globalIndex);

            if (isSpotSafe) continue; // Doubles on safe spots don't block

            // Check for doubles at globalIndex (ANY Double: Own or Opponent)
            let doubleFound = false;
            PLAYER_ORDER.forEach(pColor => {
                // Team Mode: Teammate double should NOT block?
                let isTeammate = false;
                if (isTeamMode && pColor !== tokenColor) {
                    const idx1 = PLAYER_ORDER.indexOf(tokenColor);
                    const idx2 = PLAYER_ORDER.indexOf(pColor);
                    if (Math.abs(idx1 - idx2) === 2) isTeammate = true;
                }

                // If isTeammate, skip strict blockade check?
                // But rule is "Opponent Double" blocks. "Pass over opponent double".
                // So Teammate double does not block.
                if (isTeammate) return;

                const pOffset = PATH_OFFSETS[pColor];
                const pRelativeStep = (globalIndex - pOffset + 52) % 52;

                const tokensAtStep = gameState[pColor].filter(t => {
                    const isOpponentLocked = gameMode === GAME_MODES.MASTER && !playerData[pColor]?.hasCaptured;
                    const maxStep = isOpponentLocked ? 51 : 50;
                    return t.stepsMoved === pRelativeStep && t.stepsMoved <= maxStep;
                });
                if (tokensAtStep.length >= 2) {
                    doubleFound = true; // Found a double
                }
            });

            if (doubleFound) {
                return false;
            }
        }

        // Capture Restriction (Rule: Single token cannot capture an opponent Double)
        // Check landing spot
        const landSteps = token.stepsMoved === -1 ? 0 : token.stepsMoved + diceValue;
        // Correct landing for lock:
        const actualLandSteps = isMasterLocked && landSteps > 50 ? (landSteps % 52) : landSteps;

        if (actualLandSteps <= 50 || (isMasterLocked && actualLandSteps === 51)) {
            const offset = PATH_OFFSETS[tokenColor];
            const globalLandIndex = (offset + actualLandSteps) % 52;
            if (!isGloballySafe(globalLandIndex)) {
                // Check neighbors
                let opponentDoubleAtLand = false;
                PLAYER_ORDER.forEach(pColor => {
                    if (pColor === tokenColor) return;

                    // Team check
                    if (isTeamMode) {
                        const idx1 = PLAYER_ORDER.indexOf(tokenColor);
                        const idx2 = PLAYER_ORDER.indexOf(pColor);
                        if (Math.abs(idx1 - idx2) === 2) return; // Teammate double doesn't count as "Opponent Double" for capture restriction
                    }

                    const pOffset = PATH_OFFSETS[pColor];
                    const pOneStep = (globalLandIndex - pOffset + 52) % 52;
                    const isOpponentLocked = gameMode === GAME_MODES.MASTER && !playerData[pColor]?.hasCaptured;
                    const maxStep = isOpponentLocked ? 51 : 50;
                    const oppTokens = gameState[pColor].filter(t => t.stepsMoved === pOneStep && t.stepsMoved <= maxStep);
                    if (oppTokens.length >= 2) {
                        opponentDoubleAtLand = true;
                    }
                });

                const isMovingPair = isDoubled && (!isSafe || (diceValue % 2 === 0));
                // Note: moveToken has separation logic.
                // If split permitted (Safe Spot), we split -> Single move.
                // If not split permitted (Not safe), we move Pair.
                const actuallyMovingPair = isDoubled && !isSafe && (diceValue % 2 === 0);

                if (!actuallyMovingPair && opponentDoubleAtLand) {
                    return false; // Single cannot land on Opponent Double
                }
            }
        }

        // Rule: Single token cannot share place with doubles of same player (No Triples)
        const landStepsOwn = token.stepsMoved === -1 ? 0 : token.stepsMoved + diceValue;
        const ownTokensAtLand = currentTokens.filter(t => t.stepsMoved === landStepsOwn && t.id !== token.id);

        if (ownTokensAtLand.length >= 2) {
            // Target already has a double. Cannot form Triple.
            return false;
        }

        return true;
    }, [gameMode, playerData, gameState, isTeamMode]);

    const nextTurn = useCallback((finalValue = 0) => {
        if (finalValue > 0) {
            setPrevTurnData({ color: PLAYER_ORDER[turn], value: finalValue });
            if (prevTurnTimerRef.current) clearTimeout(prevTurnTimerRef.current);
            prevTurnTimerRef.current = setTimeout(() => {
                setPrevTurnData({ color: null, value: 0 });
            }, 2000);
        }

        setTurn(prev => (prev + 1) % 4);
        setDiceQueue([]);
        setSelectedDiceId(null);
        setCanRoll(true);
        setLastRollValue(0);
        setConsecutiveSixes(0);
    }, [turn]);

    // Check for stuck state (no valid moves)
    useEffect(() => {
        if (!rolling && !canRoll && diceQueue.length > 0) {
            const currentTokens = gameState[currentPlayerColor];
            const hasAnyValidMove = diceQueue.some(dice => {
                // Check own tokens
                const ownValid = currentTokens.some(token => isValidMove(token, dice.value, currentPlayerColor));
                if (ownValid) return true;

                // Check teammate tokens if Team Mode
                if (isTeamMode) {
                    const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                    const teammateIdx = (currentIdx + 2) % 4;
                    const teammateColor = PLAYER_ORDER[teammateIdx];
                    const teammateTokens = gameState[teammateColor];
                    const teamValid = teammateTokens.some(token => isValidMove(token, dice.value, teammateColor));
                    if (teamValid) return true;
                }
                return false;
            });

            if (!hasAnyValidMove) {
                console.log("No valid moves available. Skipping turn...");
                const finalVal = diceQueue[diceQueue.length - 1].value;
                nextTurn(finalVal);
            }
        }
    }, [diceQueue, rolling, canRoll, gameState, currentPlayerColor, nextTurn, isValidMove, isTeamMode]);

    // Auto-Move Rule: If only one valid move exists, execute it.
    useEffect(() => {
        if (!rolling && !canRoll && diceQueue.length > 0 && selectedDiceId && pendingAutoMoveRef.current !== selectedDiceId) {
            const dice = diceQueue.find(d => d.id === selectedDiceId);
            if (!dice) return;

            const currentTokens = gameState[currentPlayerColor];
            let validMoves = []; // Objects {id, color}

            // Check Own
            currentTokens.forEach(token => {
                if (isValidMove(token, dice.value, currentPlayerColor)) {
                    validMoves.push({ id: token.id, color: currentPlayerColor, steps: token.stepsMoved });
                }
            });

            // Check Teammate ONLY IF own collection is empty
            if (isTeamMode && validMoves.length === 0) {
                const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                const teammateIdx = (currentIdx + 2) % 4;
                const teammateColor = PLAYER_ORDER[teammateIdx];
                gameState[teammateColor].forEach(token => {
                    if (isValidMove(token, dice.value, teammateColor)) {
                        validMoves.push({ id: token.id, color: teammateColor, steps: token.stepsMoved });
                    }
                });
            }

            // Determine uniqueness
            if (validMoves.length === 1) {
                const moveTarget = validMoves[0];
                console.log("Auto-moving single option...");

                pendingAutoMoveRef.current = selectedDiceId;

                const timeoutId = setTimeout(() => {
                    moveToken(moveTarget.id, moveTarget.color);
                    pendingAutoMoveRef.current = null;
                }, 500);
                return () => clearTimeout(timeoutId);
            } else if (validMoves.length > 1) {
                // Check if all valid moves are effectively "the same move" (e.g. splitting any token of a double on a safe spot, or moving pair)
                // Unique by (Color + Source Step).
                const uniqueSteps = new Set(validMoves.map(m => `${m.color}-${m.steps}`));
                if (uniqueSteps.size === 1) {
                    // All valid tokens are at same spot and same color.
                    // Just pick the first one.
                    const moveTarget = validMoves[0];
                    console.log("Auto-moving unique logical option...");

                    pendingAutoMoveRef.current = selectedDiceId;

                    const timeoutId = setTimeout(() => {
                        moveToken(moveTarget.id, moveTarget.color);
                        pendingAutoMoveRef.current = null;
                    }, 500);
                    return () => clearTimeout(timeoutId);
                }
            }
        }
    }, [diceQueue, rolling, canRoll, gameState, currentPlayerColor, selectedDiceId, isValidMove, isTeamMode]);


    const rollDice = () => {
        if (!canRoll) return;
        setCanRoll(false); // Lock immediately to prevent multi-click exploit
        setRolling(true);
        setSelectedDiceId(null); // Clear selection when rolling more
        playDiceRollSound();
        setLastRollValue(0); // Reset display while pulling

        setTimeout(() => {
            // Weighted Dice Logic
            const weightPool = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 6];
            const val = weightPool[Math.floor(Math.random() * weightPool.length)];

            setRolling(false);
            setLastRollValue(val);

            if (val === 6) {
                const newCount = consecutiveSixes + 1;

                // 3 Consecutive Sixes Rule
                if (newCount === 3) {
                    console.log("Three 6s in a row! Turn forfeited.");
                    const newDice = { id: Date.now() + Math.random(), value: val };
                    setDiceQueue(prev => [...prev, newDice]);
                    setConsecutiveSixes(0);
                    setCanRoll(false);

                    setTimeout(() => {
                        setDiceQueue([]); // Clear everything after delay
                        setSelectedDiceId(null);
                        nextTurn();
                    }, 2000); // 2 second delay to show the "triple six"
                    return;
                }

                // Allow stacking 6s
                const newDice = { id: Date.now() + Math.random(), value: val };
                setDiceQueue(prev => [...prev, newDice]);
                setCanRoll(true);
                setConsecutiveSixes(newCount);
            } else {
                // Non-6, stop rolling
                const newDice = { id: Date.now() + Math.random(), value: val };
                setDiceQueue(prev => [...prev, newDice]);
                setCanRoll(false);
                setConsecutiveSixes(0);
            }
        }, 600);
    };

    const selectDice = (id) => {
        // User requirement: disable selection until all rolls are done (canRoll is false)
        if (canRoll) {
            console.log("Finish rolling first!");
            return;
        }
        setSelectedDiceId(id);
    };

    const isGloballySafe = (index) => {
        return SAFE_SPOTS.includes(index);
    };

    const moveToken = (tokenId, tokenColor = currentPlayerColor, diceId = null) => {
        // diceId can be passed manually if choosing from a menu
        const effectiveDiceId = diceId || selectedDiceId;
        if (!effectiveDiceId) return;

        const diceObj = diceQueue.find(d => d.id === effectiveDiceId);
        if (!diceObj) return;
        const moveValue = diceObj.value;

        const tokens = gameState[tokenColor];
        const token = tokens.find(t => t.id === tokenId);

        // Validation - Pass tokenColor
        if (!isValidMove(token, moveValue, tokenColor)) {
            console.log("Invalid move");
            return;
        }

        // Verify Team Permission
        if (tokenColor !== currentPlayerColor) {
            if (!isTeamMode) {
                console.warn("Cannot move opponent token!");
                return;
            }
            const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
            const tokenIdx = PLAYER_ORDER.indexOf(tokenColor);
            if (Math.abs(currentIdx - tokenIdx) !== 2) {
                console.warn("Cannot move non-teammate token!");
                return;
            }

            // PRIORITY CHECK: Current player should not have valid moves for themselves
            const anyOwnValid = gameState[currentPlayerColor].some(t => isValidMove(t, moveValue, currentPlayerColor));
            if (anyOwnValid) {
                console.warn("Requested teammate move, but current player has valid moves for themselves. Ignoring.");
                return;
            }
        }

        // Determine Move Type (Single vs Pair)
        const tokensAtSpot = tokens.filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved < 51);
        const isDoubled = tokensAtSpot.length >= 2;
        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[tokenColor] + token.stepsMoved) % 52);

        let actualMoveSteps = moveValue;
        let tokensToMove = [token];

        if (isDoubled) {
            if (isSafe) {
                // Safe spot allows separation -> Single Move
                actualMoveSteps = moveValue;
                tokensToMove = [token];
            } else {
                // Not safe: MUST move as pair (if even)
                if (moveValue % 2 === 0) {
                    actualMoveSteps = moveValue / 2;
                    tokensToMove = [tokensAtSpot[0], tokensAtSpot[1]];
                } else {
                    return; // Should be blocked by isValidMove
                }
            }
        }

        const isMasterLocked = gameMode === GAME_MODES.MASTER && !playerData[tokenColor]?.hasCaptured;
        let newSteps = (token.stepsMoved === -1) ? 0 : token.stepsMoved + actualMoveSteps;

        if (isMasterLocked && newSteps > 50) {
            newSteps = newSteps % 52; // Wrap around the 52-cell cycle
        }

        // Apply Move
        let captureOccurred = false;
        let newGameState = { ...gameState };
        let newPlayerData = { ...playerData };

        if (newSteps <= 50 || (isMasterLocked && newSteps === 51)) {
            const offset = PATH_OFFSETS[tokenColor];
            const globalPathIndex = (offset + newSteps) % 52;

            if (!isGloballySafe(globalPathIndex)) {
                PLAYER_ORDER.forEach(pColor => {
                    if (pColor === tokenColor) return;

                    // Team Mode: Do not capture teammate?
                    if (isTeamMode) {
                        const idx1 = PLAYER_ORDER.indexOf(tokenColor);
                        const idx2 = PLAYER_ORDER.indexOf(pColor);
                        if (Math.abs(idx1 - idx2) === 2) return; // No friendly fire
                    }

                    // Check opponets at this spot
                    const opponentsAtSpot = newGameState[pColor].filter(oppToken => {
                        const isOpponentLocked = gameMode === GAME_MODES.MASTER && !newPlayerData[pColor]?.hasCaptured;
                        const maxStep = isOpponentLocked ? 51 : 50;
                        if (oppToken.stepsMoved === -1 || oppToken.stepsMoved > maxStep) return false;
                        const oppOffset = PATH_OFFSETS[pColor];
                        return ((oppOffset + oppToken.stepsMoved) % 52) === globalPathIndex;
                    });

                    if (opponentsAtSpot.length > 0) {
                        // Capture!
                        const isAttackerDouble = tokensToMove.length >= 2;
                        const isDefenderDouble = opponentsAtSpot.length >= 2;

                        if (!isAttackerDouble && isDefenderDouble) {
                            console.warn("Illegal capture attempt blocked: Single trying to capture Double.");
                            captureOccurred = false;
                        } else {
                            captureOccurred = true;
                            // Credit the TOKEN OWNER for the capture
                            newPlayerData[tokenColor] = { hasCaptured: true };

                            // Reset opponents
                            newGameState[pColor] = newGameState[pColor].map(oppToken => {
                                if (opponentsAtSpot.some(o => o.id === oppToken.id)) {
                                    return { ...oppToken, stepsMoved: -1 };
                                }
                                return oppToken;
                            });
                        }
                    }
                });
            }
        }

        // Update moved tokens
        newGameState[tokenColor] = newGameState[tokenColor].map(t => {
            if (tokensToMove.some(tm => tm.id === t.id)) {
                return { ...t, stepsMoved: newSteps };
            }
            return t;
        });

        playMoveSound();
        setGameState(newGameState);
        setPlayerData(newPlayerData);

        // Remove used dice
        const remainingQueue = diceQueue.filter(d => d.id !== (diceId || selectedDiceId));
        setDiceQueue(remainingQueue);

        // Auto-select next available
        if (remainingQueue.length > 0) {
            setSelectedDiceId(remainingQueue[0].id);
        } else {
            setSelectedDiceId(null);
        }

        if (captureOccurred) {
            setCanRoll(true);
        } else if (remainingQueue.length === 0 && !canRoll) {
            // Add a short delay before passing turn to let user see the final move/dice result
            // Pass lastRollValue to ensure it stays in the tray during the "Visual Legacy" period
            setTimeout(() => nextTurn(lastRollValue), 1000);
        }
    };

    const validTokenIds = [];
    if (selectedDiceId) {
        const dice = diceQueue.find(d => d.id === selectedDiceId);
        if (dice) {
            // Check Own
            gameState[currentPlayerColor].forEach(token => {
                if (isValidMove(token, dice.value, currentPlayerColor)) {
                    validTokenIds.push(`${currentPlayerColor}-${token.id}`);
                }
            });

            // Check Teammate ONLY IF current player has NO valid moves for this dice
            if (isTeamMode && validTokenIds.length === 0) {
                const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                const teammateIdx = (currentIdx + 2) % 4;
                const teammateColor = PLAYER_ORDER[teammateIdx];
                gameState[teammateColor].forEach(token => {
                    if (isValidMove(token, dice.value, teammateColor)) {
                        validTokenIds.push(`${teammateColor}-${token.id}`);
                    }
                });
            }
        }
    }

    const getValidDiceForToken = (tokenId, tokenColor) => {
        const tokens = gameState[tokenColor];
        const token = tokens.find(t => String(t.id) === String(tokenId));
        if (!token) return [];

        return diceQueue.filter(dice => isValidMove(token, dice.value, tokenColor));
    };

    return {
        gameState,
        currentPlayerColor,
        rollDice,
        diceQueue,
        selectedDiceId,
        selectDice,
        rolling,
        canRoll,
        lastRollValue,
        prevTurnData,
        moveToken,
        getValidDiceForToken,
        turn,
        playerData,
        validTokenIds
    };
};
