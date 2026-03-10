import { useState, useCallback, useEffect, useRef } from 'react';
import { PLAYERS, PLAYER_ORDER, PIECE_COUNT, GAME_MODES, START_POSITIONS, SAFE_SPOTS } from '../constants/gameConstants';
import { playDiceRollSound, playMoveSound } from '../utils/soundUtils';

const PATH_OFFSETS = {
    [PLAYERS.GREEN]: 0,
    [PLAYERS.YELLOW]: 13,
    [PLAYERS.BLUE]: 26,
    [PLAYERS.RED]: 39
};

export const useLudoGame = (gameMode = GAME_MODES.CLASSIC, isTeamMode = false, playerCount = 4) => {
    // 1. State Hooks
    const [turn, setTurn] = useState(0);
    const [gameWinner, setGameWinner] = useState(null);
    const [gameEnded, setGameEnded] = useState(false);
    const [exitedPlayers, setExitedPlayers] = useState([]);
    const [diceQueue, setDiceQueue] = useState([]);
    const [selectedDiceId, setSelectedDiceId] = useState(null);
    const [rolling, setRolling] = useState(false);
    const [canRoll, setCanRoll] = useState(true);
    const [lastRollValue, setLastRollValue] = useState(0);
    const [prevTurnData, setPrevTurnData] = useState({ color: null, value: 0, queue: [] });
    const [isVoidingTurn, setIsVoidingTurn] = useState(false);
    const [finishOrder, setFinishOrder] = useState([]);

    const [playerData, setPlayerData] = useState(() => {
        const data = {};
        PLAYER_ORDER.forEach(p => {
            data[p] = { hasCaptured: false };
        });
        return data;
    });

    const [gameState, setGameState] = useState(() => {
        const initialState = {};
        PLAYER_ORDER.forEach(color => {
            initialState[color] = Array(PIECE_COUNT).fill(0).map((_, i) => ({
                id: i,
                stepsMoved: (gameMode === GAME_MODES.CLASSIC && i === 0) ? 0 : -1
            }));
        });
        return initialState;
    });

    // 2. Ref Hooks
    const prevTurnTimerRef = useRef(null);
    const pendingAutoMoveRef = useRef(null);

    // Derived State (Regular variables, placed AFTER hooks)
    const currentPlayerColor = PLAYER_ORDER[turn];
    const activePlayers = (isTeamMode ? [0, 1, 2, 3] : (playerCount === 2 ? [0, 2] : (playerCount === 3 ? [0, 1, 2] : [0, 1, 2, 3])))
        .filter(idx => !exitedPlayers.includes(PLAYER_ORDER[idx]));

    // 3. Effects
    useEffect(() => {
        return () => {
            if (prevTurnTimerRef.current) clearTimeout(prevTurnTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (diceQueue.length > 0 && selectedDiceId === null) {
            setSelectedDiceId(diceQueue[0].id);
        }
    }, [diceQueue, selectedDiceId]);

    // Track Finishing Order
    useEffect(() => {
        PLAYER_ORDER.forEach(color => {
            const finishedCount = gameState[color].filter(t => t.stepsMoved >= 56).length;
            if (finishedCount === 4 && !finishOrder.includes(color)) {
                setFinishOrder(prev => [...prev, color]);
            }
        });
    }, [gameState, finishOrder]);

    const isGloballySafe = (index) => {
        return SAFE_SPOTS.includes(index);
    };

    const checkWinCondition = useCallback((currentState) => {
        const finishedCounts = {};
        PLAYER_ORDER.forEach(color => {
            finishedCounts[color] = currentState[color].filter(t => t.stepsMoved >= 56).length;
        });

        if (isTeamMode) {
            // Team 1: 0 & 2, Team 2: 1 & 3
            if (finishedCounts[PLAYER_ORDER[0]] === 4 && finishedCounts[PLAYER_ORDER[2]] === 4) {
                return { type: 'TEAM', colors: [PLAYER_ORDER[0], PLAYER_ORDER[2]], name: 'Green & Blue' };
            }
            if (finishedCounts[PLAYER_ORDER[1]] === 4 && finishedCounts[PLAYER_ORDER[3]] === 4) {
                return { type: 'TEAM', colors: [PLAYER_ORDER[1], PLAYER_ORDER[3]], name: 'Yellow & Red' };
            }
        } else {
            const winners = PLAYER_ORDER.filter(color => finishedCounts[color] === 4);
            const targetWinners = playerCount - 1;
            if (winners.length >= targetWinners) {
                const winnerColor = winners[0];
                return { type: 'PLAYER', color: winnerColor, name: winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1) };
            }
        }
        return null;
    }, [isTeamMode, playerCount]);

    const nextTurn = useCallback((finalValue = 0, finalQueue = []) => {
        if (gameEnded) return;

        // Check if current player just finished all pieces
        const currentState = gameState; // Using current state is tricky in callbacks, but it works for simple check
        const winner = checkWinCondition(currentState);
        if (winner) {
            setGameWinner(winner);
            setGameEnded(true);
            return;
        }

        if (finalQueue.length > 0) {
            setPrevTurnData({ color: PLAYER_ORDER[turn], value: finalValue, queue: finalQueue });
            if (prevTurnTimerRef.current) clearTimeout(prevTurnTimerRef.current);
            prevTurnTimerRef.current = setTimeout(() => {
                setPrevTurnData({ color: null, value: 0, queue: [] });
            }, 1000);
        }

        // Cycle through active players who haven't finished yet
        let nextIdx = turn;
        let found = false;
        for (let i = 1; i <= 4; i++) {
            const potential = (turn + i) % 4;
            // Must be active AND not finished 4 tokens
            if (activePlayers.includes(potential)) {
                if (gameState[PLAYER_ORDER[potential]].filter(t => t.stepsMoved >= 56).length < 4) {
                    nextIdx = potential;
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            // All players either finished or exited
            setGameEnded(true);
            return;
        }

        setTurn(nextIdx);
        setDiceQueue([]);
        setSelectedDiceId(null);
        setCanRoll(true);
        setLastRollValue(0);
    }, [turn, activePlayers, gameState, gameEnded, checkWinCondition]);

    const isValidMove = useCallback((token, diceValue, tokenColor = currentPlayerColor) => {
        if (isVoidingTurn) return false;
        if (token.stepsMoved === -1 && diceValue !== 6) return false;
        const isMasterLocked = gameMode === GAME_MODES.MASTER && !playerData[tokenColor]?.hasCaptured;

        if (!isMasterLocked && token.stepsMoved + diceValue > 56) return false;

        // Double Token Checks
        const currentTokens = gameState[tokenColor];
        // If locked, main path extends to step 51
        const mainPathLimit = isMasterLocked ? 51 : 50;
        const tokensAtSpot = currentTokens.filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved <= mainPathLimit);
        const isDoubled = gameMode === GAME_MODES.MASTER && tokensAtSpot.length >= 2;
        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[tokenColor] + token.stepsMoved) % 52) || (token.stepsMoved > 50 && token.stepsMoved < 56);
        const actuallyMovingPair = isDoubled && !isSafe && (diceValue % 2 === 0);

        if (isDoubled) {
            // Rule: Double tokens can only be separated on safe spots.
            // If not safe, must move as pair. 
            // Pair move requires EVEN dice.
            if (!isSafe) {
                if (diceValue % 2 !== 0) return false; // Odd dice cannot move unsplit pair
            }
        }

        const moveSteps = actuallyMovingPair ? (diceValue / 2) : diceValue;
        if (!isMasterLocked && token.stepsMoved + moveSteps > 56) return false;

        // Blockade Check (Rule: No single token can pass over a double token unless on safe spot)

        // If exiting home (-1 -> 0), we don't traverse. We just spawn. 
        // So no path blocking check needed. 
        if (token.stepsMoved === -1) {
            // House exit always allowed on a 6 regardless of start-cell occupancy (Safe Spot)
            return true;
        }

        // Check moves from current+1 to target
        const startStep = (token.stepsMoved === -1) ? 1 : token.stepsMoved + 1;
        const endStep = (token.stepsMoved === -1) ? 1 : token.stepsMoved + moveSteps;

        for (let step = startStep; step < endStep; step++) {
            // Check if there is a double at this step
            if (step > 51 && !isMasterLocked) continue; // Home stretch usually no blocking

            const offset = PATH_OFFSETS[tokenColor];
            const globalIndex = (offset + step) % 52;
            const isSpotSafe = SAFE_SPOTS.includes(globalIndex);

            if (isSpotSafe) continue; // Doubles on safe spots don't block

            // Check for doubles at globalIndex (ANY Double: Own, Teammate, or Opponent)
            let doubleFound = false;
            PLAYER_ORDER.forEach(pColor => {
                const pOffset = PATH_OFFSETS[pColor];
                const pIsLocked = gameMode === GAME_MODES.MASTER && !playerData[pColor]?.hasCaptured;

                const tokensAtStep = gameState[pColor].filter(t => {
                    if (t.stepsMoved === -1 || t.stepsMoved >= 56) return false;
                    if (!pIsLocked && t.stepsMoved > 51) return false;
                    const tokenGlobalIndex = (pOffset + t.stepsMoved) % 52;
                    return tokenGlobalIndex === globalIndex;
                });

                if (tokensAtStep.length >= 2 && gameMode === GAME_MODES.MASTER) {
                    doubleFound = true;
                }
            });

            if (doubleFound && !actuallyMovingPair) {
                return false;
            }
        }

        // Capture Restriction (Rule: Single token cannot capture an opponent Double)
        // Check landing spot
        const landSteps = token.stepsMoved === -1 ? 0 : token.stepsMoved + moveSteps;
        // Correct landing for lock:
        const actualLandSteps = isMasterLocked && landSteps > 50 ? (landSteps % 52) : landSteps;

        if (actualLandSteps <= 50 || (isMasterLocked && actualLandSteps === 51)) {
            const offset = PATH_OFFSETS[tokenColor];
            const globalLandIndex = (offset + actualLandSteps) % 52;
            if (!isGloballySafe(globalLandIndex)) {
                // Check neighbors
                let opponentDoubleAtLand = false;
                PLAYER_ORDER.forEach(pColor => {
                    const pOffset = PATH_OFFSETS[pColor];
                    const pIsLocked = gameMode === GAME_MODES.MASTER && !playerData[pColor]?.hasCaptured;

                    const oppTokensAtSpot = gameState[pColor].filter(t => {
                        if (t.stepsMoved === -1 || t.stepsMoved >= 56) return false;
                        if (!pIsLocked && t.stepsMoved > 51) return false;
                        const tokenGlobalIndex = (pOffset + t.stepsMoved) % 52;
                        return tokenGlobalIndex === globalLandIndex;
                    });

                    if (oppTokensAtSpot.length >= 2 && gameMode === GAME_MODES.MASTER) {
                        opponentDoubleAtLand = true;
                    }
                });

                if (!actuallyMovingPair && opponentDoubleAtLand) {
                    return false; // Single cannot land on Opponent Double
                }
            }
        }

        // Rule: Single token cannot share place with doubles of same player (No Triples)
        // EXCEPTION: Safe spots and Finish line allow any number of tokens
        const landStepsOwn = token.stepsMoved === -1 ? 0 : token.stepsMoved + moveSteps;
        if (landStepsOwn >= 56) return true;

        const offset = PATH_OFFSETS[tokenColor];
        const globalLandIndex = (offset + landStepsOwn) % 52;
        if (isGloballySafe(globalLandIndex)) return true;

        const ownTokensAtLand = currentTokens.filter(t => t.stepsMoved === landStepsOwn && t.id !== token.id);
        if (ownTokensAtLand.length >= 2 && gameMode === GAME_MODES.MASTER) return false;

        return true;
    }, [gameMode, playerData, gameState, isTeamMode, currentPlayerColor, isGloballySafe]);

    const rollDice = useCallback(() => {
        if (!canRoll) return;
        setCanRoll(false);
        setRolling(true);
        setSelectedDiceId(null);
        playDiceRollSound();
        setLastRollValue(0);

        setTimeout(() => {
            const weightPool = [6, 1, 1, 6, 2, 2, 6, 3, 3, 6, 4, 4, 6, 5, 5, 6];
            const val = weightPool[Math.floor(Math.random() * weightPool.length)];

            setRolling(false);
            setLastRollValue(val);

            if (val === 6) {
                const sixesInTray = diceQueue.filter(d => d.value === 6).length;
                if (sixesInTray === 2) {
                    setIsVoidingTurn(true);
                    const newDice = { id: Date.now() + Math.random(), value: val };
                    setDiceQueue([...diceQueue, newDice]);
                    setCanRoll(false);
                    setTimeout(() => {
                        setDiceQueue([]);
                        setSelectedDiceId(null);
                        setIsVoidingTurn(false);
                        nextTurn();
                    }, 1000);
                    return;
                }
                const newDice = { id: Date.now() + Math.random(), value: val };
                setDiceQueue(prev => [...prev, newDice]);
                setCanRoll(true);
            } else {
                const newDice = { id: Date.now() + Math.random(), value: val };
                setDiceQueue(prev => [...prev, newDice]);
                setCanRoll(false);
            }
        }, 200);
    }, [canRoll, diceQueue, nextTurn]);

    const selectDice = useCallback((id) => {
        if (canRoll) return;
        setSelectedDiceId(id);
    }, [canRoll]);

    const moveToken = useCallback((tokenId, tokenColor = currentPlayerColor, diceId = null) => {
        if (isVoidingTurn) return;
        if (canRoll) return;

        const effectiveDiceId = diceId || selectedDiceId;
        if (!effectiveDiceId) return;

        const diceObj = diceQueue.find(d => d.id === effectiveDiceId);
        if (!diceObj) return;
        const moveValue = diceObj.value;

        const tokens = gameState[tokenColor];
        const token = tokens.find(t => t.id === tokenId);

        if (!isValidMove(token, moveValue, tokenColor)) return;

        if (tokenColor !== currentPlayerColor) {
            if (!isTeamMode) return;
            const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
            const tokenIdx = PLAYER_ORDER.indexOf(tokenColor);
            if (Math.abs(currentIdx - tokenIdx) !== 2) return;
            const anyOwnValid = gameState[currentPlayerColor].some(t => isValidMove(t, moveValue, currentPlayerColor));
            if (anyOwnValid) return;
        }

        const tokensAtSpot = tokens.filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved < 51);
        const isDoubled = gameMode === GAME_MODES.MASTER && tokensAtSpot.length >= 2;
        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[tokenColor] + token.stepsMoved) % 52);

        let actualMoveSteps = moveValue;
        let tokensToMove = [token];

        if (isDoubled) {
            if (isSafe) {
                actualMoveSteps = moveValue;
                tokensToMove = [token];
            } else {
                if (moveValue % 2 === 0) {
                    actualMoveSteps = moveValue / 2;
                    tokensToMove = [tokensAtSpot[0], tokensAtSpot[1]];
                } else {
                    return;
                }
            }
        }

        const isMasterLocked = gameMode === GAME_MODES.MASTER && !playerData[tokenColor]?.hasCaptured;
        let newSteps = (token.stepsMoved === -1) ? 0 : token.stepsMoved + actualMoveSteps;

        if (isMasterLocked && newSteps > 50) {
            newSteps = newSteps % 52;
        }

        let captureOccurred = false;
        let newGameState = { ...gameState };
        let newPlayerData = { ...playerData };

        const goalReached = newSteps === 56;
        if (newSteps <= 50 || (isMasterLocked && newSteps === 51)) {
            const offset = PATH_OFFSETS[tokenColor];
            const globalPathIndex = (offset + newSteps) % 52;

            if (!isGloballySafe(globalPathIndex)) {
                PLAYER_ORDER.forEach(pColor => {
                    if (pColor === tokenColor) return;
                    if (isTeamMode) {
                        const idx1 = PLAYER_ORDER.indexOf(tokenColor);
                        const idx2 = PLAYER_ORDER.indexOf(pColor);
                        if (Math.abs(idx1 - idx2) === 2) return;
                    }

                    const opponentsAtSpot = newGameState[pColor].filter(oppToken => {
                        const isOpponentLocked = gameMode === GAME_MODES.MASTER && !newPlayerData[pColor]?.hasCaptured;
                        const maxStep = isOpponentLocked ? 51 : 50;
                        if (oppToken.stepsMoved === -1 || oppToken.stepsMoved > maxStep) return false;
                        const oppOffset = PATH_OFFSETS[pColor];
                        return ((oppOffset + oppToken.stepsMoved) % 52) === globalPathIndex;
                    });

                    if (opponentsAtSpot.length > 0) {
                        const isAttackerDouble = tokensToMove.length >= 2;
                        const isDefenderDouble = gameMode === GAME_MODES.MASTER && opponentsAtSpot.length >= 2;

                        if (!isAttackerDouble && isDefenderDouble) {
                            captureOccurred = false;
                        } else {
                            captureOccurred = true;
                            newPlayerData[tokenColor] = { hasCaptured: true };
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

        newGameState[tokenColor] = newGameState[tokenColor].map(t => {
            if (tokensToMove.some(tm => tm.id === t.id)) {
                return { ...t, stepsMoved: newSteps };
            }
            return t;
        });

        setGameState(newGameState);
        setPlayerData(newPlayerData);

        const remainingQueue = diceQueue.filter(d => d.id !== effectiveDiceId);
        setDiceQueue(remainingQueue);

        if (remainingQueue.length > 0) {
            setSelectedDiceId(remainingQueue[0].id);
        } else {
            setSelectedDiceId(null);
        }

        if (captureOccurred || goalReached) {
            setCanRoll(true);
        } else if (remainingQueue.length === 0 && !canRoll) {
            setTimeout(() => nextTurn(), 250);
        }
    }, [diceQueue, selectedDiceId, gameState, isValidMove, isTeamMode, currentPlayerColor, gameMode, playerData, nextTurn, isVoidingTurn, canRoll, isGloballySafe]);



    // Check for stuck state (no valid moves)
    useEffect(() => {
        if (!rolling && !canRoll && diceQueue.length > 0 && !isVoidingTurn) {
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
                nextTurn(finalVal, diceQueue);
            }
        }
    }, [diceQueue, rolling, canRoll, gameState, currentPlayerColor, nextTurn, isValidMove, isTeamMode]);

    // Auto-Move Rule: Execute only if exactly one unique logical outcome exists across ALL available dice.
    useEffect(() => {
        if (!rolling && !canRoll && diceQueue.length > 0 && selectedDiceId && pendingAutoMoveRef.current !== selectedDiceId && !isVoidingTurn) {
            // Find ALL valid moves across ALL dice currently in the queue
            const allLogicalMoves = [];

            diceQueue.forEach(dice => {
                const colorsToCheck = [currentPlayerColor];
                if (isTeamMode) {
                    const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                    const teammateIdx = (currentIdx + 2) % 4;
                    colorsToCheck.push(PLAYER_ORDER[teammateIdx]);
                }

                colorsToCheck.forEach(color => {
                    const tokens = gameState[color];
                    tokens.forEach(token => {
                        if (isValidMove(token, dice.value, color)) {
                            // Enforce teammate priority for auto-move calculation
                            if (color !== currentPlayerColor) {
                                const anyOwnValid = gameState[currentPlayerColor].some(t => isValidMove(t, dice.value, currentPlayerColor));
                                if (anyOwnValid) return;
                            }

                            // Calculate logical target position to identify unique outcomes
                            const targetSteps = token.stepsMoved === -1 ? 0 : token.stepsMoved + dice.value;
                            const uniqueKey = `${color}-${token.id}-${targetSteps}`;

                            if (!allLogicalMoves.find(m => m.key === uniqueKey)) {
                                allLogicalMoves.push({
                                    key: uniqueKey,
                                    tokenId: token.id,
                                    color,
                                    diceId: dice.id,
                                    isHome: token.stepsMoved === -1
                                });
                            }
                        }
                    });
                });
            });

            // Auto-move only if there is exactly ONE choice left across the entire turn context
            if (allLogicalMoves.length === 1) {
                const moveTarget = allLogicalMoves[0];

                // INHIBIT: If it's a house exit AND there are other dice in the tray,
                // do NOT auto-move. The player might want to roll again or use the other dice
                // on the token once it's on the board.
                if (moveTarget.isHome && diceQueue.length > 1) {
                    console.log("Inhibiting auto-move for house spawn while multiple dice are in tray.");
                    return;
                }

                console.log("Forced auto-move detected...");

                pendingAutoMoveRef.current = selectedDiceId;

                const timeoutId = setTimeout(() => {
                    moveToken(moveTarget.tokenId, moveTarget.color, moveTarget.diceId);
                    pendingAutoMoveRef.current = null;
                }, 600);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [diceQueue, rolling, canRoll, gameState, currentPlayerColor, selectedDiceId, isValidMove, isTeamMode, moveToken, isVoidingTurn, gameMode]);


    const exitPlayer = useCallback((color) => {
        if (exitedPlayers.includes(color)) return;

        const newExited = [...exitedPlayers, color];
        setExitedPlayers(newExited);

        // Clear tokens from board - move them to -1 (House)
        setGameState(prev => ({
            ...prev,
            [color]: prev[color].map(t => ({ ...t, stepsMoved: -1 }))
        }));

        // Calculate potential remaining players including those who already finished
        const totalActiveIndices = isTeamMode ? [0, 1, 2, 3] : (playerCount === 2 ? [0, 2] : (playerCount === 3 ? [0, 1, 2] : [0, 1, 2, 3]));
        const remainingCount = totalActiveIndices.filter(idx => !newExited.includes(PLAYER_ORDER[idx])).length;

        if (remainingCount <= 1) {
            const winnerIdx = totalActiveIndices.find(idx => !newExited.includes(PLAYER_ORDER[idx]));
            const winnerColor = winnerIdx !== undefined ? PLAYER_ORDER[winnerIdx] : "None";
            setGameWinner({ type: 'PLAYER', color: winnerColor, name: winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1) });
            setGameEnded(true);
            return;
        }

        if (PLAYER_ORDER[turn] === color) {
            // It was their turn, skip it
            nextTurn();
        }
    }, [exitedPlayers, turn, isTeamMode, playerCount, nextTurn]);

    const validTokenIds = [];
    if (diceQueue.length > 0) {
        diceQueue.forEach(dice => {
            const ownTokens = gameState[currentPlayerColor];
            const ownValidMoves = ownTokens.filter(token => isValidMove(token, dice.value, currentPlayerColor));

            // Add own valid tokens
            ownValidMoves.forEach(token => {
                const id = `${currentPlayerColor}-${token.id}`;
                if (!validTokenIds.includes(id)) {
                    validTokenIds.push(id);
                }
            });

            // Add teammate valid tokens ONLY IF own moves are empty (Restore Priority)
            if (isTeamMode && ownValidMoves.length === 0) {
                const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                const teammateIdx = (currentIdx + 2) % 4;
                const teammateColor = PLAYER_ORDER[teammateIdx];
                gameState[teammateColor].forEach(token => {
                    if (isValidMove(token, dice.value, teammateColor)) {
                        const id = `${teammateColor}-${token.id}`;
                        if (!validTokenIds.includes(id)) {
                            validTokenIds.push(id);
                        }
                    }
                });
            }
        });
    }

    const capturableTokenIds = [];
    if (diceQueue.length > 0) {
        diceQueue.forEach(dice => {
            const ownTokens = gameState[currentPlayerColor];
            const ownValidMoves = ownTokens.filter(token => isValidMove(token, dice.value, currentPlayerColor));

            const colorsToCheck = [];
            if (ownValidMoves.length > 0) {
                colorsToCheck.push(currentPlayerColor);
            } else if (isTeamMode) {
                const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                const teammateIdx = (currentIdx + 2) % 4;
                colorsToCheck.push(PLAYER_ORDER[teammateIdx]);
            }

            colorsToCheck.forEach(color => {
                gameState[color].forEach(token => {
                    if (isValidMove(token, dice.value, color)) {
                        // Determine Actual Move Steps (Pair Move Detection)
                        const tokensAtSpot = gameState[color].filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved < 51);
                        const isDoubled = gameMode === GAME_MODES.MASTER && tokensAtSpot.length >= 2;
                        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[color] + token.stepsMoved) % 52);

                        let actualMoveSteps = dice.value;
                        if (isDoubled && !isSafe && dice.value % 2 === 0) {
                            actualMoveSteps = dice.value / 2;
                        }

                        const isMasterLocked = gameMode === GAME_MODES.MASTER && !playerData[color]?.hasCaptured;
                        let newSteps = (token.stepsMoved === -1) ? 0 : token.stepsMoved + actualMoveSteps;
                        if (isMasterLocked && newSteps > 50) newSteps = newSteps % 52;

                        if (newSteps <= 50 || (isMasterLocked && newSteps === 51)) {
                            const offset = PATH_OFFSETS[color];
                            const globalPathIndex = (offset + newSteps) % 52;
                            if (!isGloballySafe(globalPathIndex)) {
                                PLAYER_ORDER.forEach(pColor => {
                                    if (pColor === color) return;
                                    // Skip self and teammate
                                    if (pColor === currentPlayerColor) return;
                                    if (isTeamMode) {
                                        const cIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                                        const pIdx = PLAYER_ORDER.indexOf(pColor);
                                        if (Math.abs(cIdx - pIdx) === 2) return;
                                    }

                                    gameState[pColor].forEach(oppToken => {
                                        const oppLocked = gameMode === GAME_MODES.MASTER && !playerData[pColor]?.hasCaptured;
                                        const maxStep = oppLocked ? 51 : 50;
                                        if (oppToken.stepsMoved === -1 || oppToken.stepsMoved > maxStep) return;

                                        const oppOffset = PATH_OFFSETS[pColor];
                                        if (((oppOffset + oppToken.stepsMoved) % 52) === globalPathIndex) {
                                            const idStr = `${pColor}-${oppToken.id}`;
                                            if (!capturableTokenIds.includes(idStr)) {
                                                capturableTokenIds.push(idStr);
                                            }
                                        }
                                    });
                                });
                            }
                        }
                    }
                });
            });
        });
    }

    const getValidDiceForToken = (tokenId, tokenColor) => {
        if (isVoidingTurn) return [];
        const tokens = gameState[tokenColor];
        const token = tokens.find(t => String(t.id) === String(tokenId));
        if (!token) return [];

        return diceQueue.filter(dice => {
            if (!isValidMove(token, dice.value, tokenColor)) return false;

            // If it's a teammate token, allow it ONLY IF current player has no moves for this dice
            if (tokenColor !== currentPlayerColor) {
                if (!isTeamMode) return false;
                const anyOwnValid = gameState[currentPlayerColor].some(t => isValidMove(t, dice.value, currentPlayerColor));
                if (anyOwnValid) return false;
            }

            return true;
        });
    };

    const getMovesToCaptureTarget = (targetId, targetColor) => {
        const targetTokens = gameState[targetColor];
        const targetToken = targetTokens.find(t => String(t.id) === String(targetId));
        if (!targetToken || targetToken.stepsMoved === -1) return [];

        const targetGlobalPathIndex = (PATH_OFFSETS[targetColor] + targetToken.stepsMoved) % 52;
        const validCaptureMoves = [];

        diceQueue.forEach(dice => {
            // Priority: Only check teammate if current player has no valid moves for this dice
            const ownTokens = gameState[currentPlayerColor];
            const ownValidMoves = ownTokens.filter(t => isValidMove(t, dice.value, currentPlayerColor));

            const colorsToCheck = [];
            if (ownValidMoves.length > 0) {
                colorsToCheck.push(currentPlayerColor);
            } else if (isTeamMode) {
                const currentIdx = PLAYER_ORDER.indexOf(currentPlayerColor);
                const teammateIdx = (currentIdx + 2) % 4;
                colorsToCheck.push(PLAYER_ORDER[teammateIdx]);
            }

            colorsToCheck.forEach(color => {
                gameState[color].forEach(sourceToken => {
                    if (isValidMove(sourceToken, dice.value, color)) {
                        // Determine Actual Move Steps (Pair Move Detection)
                        const tokensAtSpot = gameState[color].filter(t => t.stepsMoved === sourceToken.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved < 51);
                        const isDoubled = tokensAtSpot.length >= 2;
                        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[color] + sourceToken.stepsMoved) % 52);

                        let actualMoveSteps = dice.value;
                        if (isDoubled && !isSafe && dice.value % 2 === 0) {
                            actualMoveSteps = dice.value / 2;
                        }

                        const isMasterLocked = gameMode === GAME_MODES.MASTER && !playerData[color]?.hasCaptured;
                        let newSteps = (sourceToken.stepsMoved === -1) ? 0 : sourceToken.stepsMoved + actualMoveSteps;
                        if (isMasterLocked && newSteps > 50) newSteps = newSteps % 52;

                        if (newSteps <= 50 || (isMasterLocked && newSteps === 51)) {
                            const sourceGlobalPathIndex = (PATH_OFFSETS[color] + newSteps) % 52;
                            if (sourceGlobalPathIndex === targetGlobalPathIndex) {
                                validCaptureMoves.push({
                                    sourceId: sourceToken.id,
                                    sourceColor: color,
                                    diceId: dice.id,
                                    diceValue: dice.value
                                });
                            }
                        }
                    }
                });
            });
        });

        return validCaptureMoves;
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
        getMovesToCaptureTarget,
        gameEnded,
        gameWinner,
        exitPlayer,
        exitedPlayers,
        turn,
        playerData,
        validTokenIds,
        capturableTokenIds,
        finishOrder
    };
};
