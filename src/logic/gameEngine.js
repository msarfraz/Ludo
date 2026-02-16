import { useState, useCallback, useEffect } from 'react';
import { PLAYERS, PLAYER_ORDER, PIECE_COUNT, GAME_MODES, START_POSITIONS, SAFE_SPOTS } from '../constants/gameConstants';
import { playDiceRollSound, playMoveSound } from '../utils/soundUtils';

const PATH_OFFSETS = {
    [PLAYERS.GREEN]: 0,
    [PLAYERS.YELLOW]: 13,
    [PLAYERS.BLUE]: 26,
    [PLAYERS.RED]: 39
};

export const useLudoGame = (gameMode = GAME_MODES.CLASSIC) => {
    const [turn, setTurn] = useState(0);
    const [diceQueue, setDiceQueue] = useState([]); // Array of { id, value }
    const [selectedDiceId, setSelectedDiceId] = useState(null);
    const [rolling, setRolling] = useState(false);
    const [canRoll, setCanRoll] = useState(true);
    const [consecutiveSixes, setConsecutiveSixes] = useState(0);

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

    // Auto-select first dice if nothing selected
    useEffect(() => {
        if (diceQueue.length > 0 && selectedDiceId === null && !canRoll) {
            setSelectedDiceId(diceQueue[0].id);
        }
    }, [diceQueue, selectedDiceId, canRoll]);

    const currentPlayerColor = PLAYER_ORDER[turn];

    const isValidMove = useCallback((token, diceValue) => {
        if (token.stepsMoved === -1 && diceValue !== 6) return false;
        if (token.stepsMoved + diceValue > 56) return false;

        // Master Mode Check
        if (gameMode === GAME_MODES.MASTER && !playerData[currentPlayerColor].hasCaptured && (token.stepsMoved + diceValue > 50)) {
            return false;
        }

        // Double Token Checks
        const currentTokens = gameState[currentPlayerColor];
        const tokensAtSpot = currentTokens.filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved < 51);
        const isDoubled = tokensAtSpot.length >= 2;
        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[currentPlayerColor] + token.stepsMoved) % 52);

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
        // But we DO need to check if landing spot has a double that we cannot capture (handled below in landing check? No, isValidMove should return false if move is invalid).
        // Wait, isValidMove generally checks "can I initiate this move?". 

        if (token.stepsMoved === -1) {
            // We are spawning at 0. 
            // Rule: Single token cannot capture opponent Double.
            // Check if 0 has opponent Double.
            const offset = PATH_OFFSETS[currentPlayerColor];
            const startGlobal = offset % 52;
            // (offset + 0) % 52

            let blockedByOpponentDouble = false;
            PLAYER_ORDER.forEach(pColor => {
                if (pColor === currentPlayerColor) return;
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
        // Note: stepsMoved is relative to player. We need global path index.
        const startStep = token.stepsMoved + 1;
        const endStep = token.stepsMoved + diceValue;

        for (let step = startStep; step < endStep; step++) {
            // Check if there is a double at this step
            if (step > 50) continue; // Home stretch usually no blocking? or implies safe?
            // "Home path" (51-56) usually safe/private, but let's check global path for main board (0-50).

            const offset = PATH_OFFSETS[currentPlayerColor];
            const globalIndex = (offset + step) % 52;
            const isSpotSafe = SAFE_SPOTS.includes(globalIndex);

            if (isSpotSafe) continue; // Doubles on safe spots don't block

            // Check for doubles at globalIndex (ANY Double: Own or Opponent)
            let doubleFound = false;
            PLAYER_ORDER.forEach(pColor => {
                const pOffset = PATH_OFFSETS[pColor];
                const pRelativeStep = (globalIndex - pOffset + 52) % 52;

                const tokensAtStep = gameState[pColor].filter(t => t.stepsMoved === pRelativeStep && t.stepsMoved <= 50);
                if (tokensAtStep.length >= 2) {
                    doubleFound = true; // Found a double (own or opponent)
                }
            });

            if (doubleFound) {
                // Blocked!
                return false;
            }
        }

        // Capture Restriction (Rule: Single token cannot capture an opponent Double)
        // Check landing spot
        const landSteps = token.stepsMoved === -1 ? 0 : token.stepsMoved + diceValue;
        if (landSteps <= 50) {
            const offset = PATH_OFFSETS[currentPlayerColor];
            const globalLandIndex = (offset + landSteps) % 52;
            if (!isGloballySafe(globalLandIndex)) {
                // Check neighbors
                let opponentDoubleAtLand = false;
                PLAYER_ORDER.forEach(pColor => {
                    if (pColor === currentPlayerColor) return;
                    const pOffset = PATH_OFFSETS[pColor];
                    const pOneStep = (globalLandIndex - pOffset + 52) % 52;
                    const oppTokens = gameState[pColor].filter(t => t.stepsMoved === pOneStep && t.stepsMoved <= 50);
                    if (oppTokens.length >= 2) {
                        opponentDoubleAtLand = true;
                    }
                });

                // If moving a SINGLE token (which we are here, unless it's a pair move logic which is above)
                // This isValidMove is generally for the "unit" move. 
                // If we are moving a pair, this check might fail if we don't distinguish?
                // But pairs CAN capture doubles? User said "single token cannot send doubles".
                // So if isDoubled is true (moving pair), this restriction might not apply? 
                // But wait, isValidMove does not know if we *will* move as pair or single yet, it just checks if "token" can move "diceValue".
                // If "token" is part of a double, and we rolled even, we MIGHT move pair.
                // We should probably allow the move in isValidMove if it's *possible* to be valid (e.g. as pair).
                // But here we are checking if *this specific token* moving *this specific value* is valid.
                // If we move as pair, the "diceValue" passed to isValidMove would be... wait.
                // In moveToken, we call isValidMove(token, moveValue). 
                // If moving pair, actual move is moveValue/2. 
                // We should probably pass the *intended* step count to isValidMove? Or IsValidMove handles the logic?
                // Currently isValidMove takes `diceValue` (the roll). 
                // Code: `if (isDoubled && !isSafe) ... if (token.stepsMoved + (diceValue / 2) > 56)` 
                // So isValidMove KNOWS if it will be a pair move.

                // If it is a pair move (Double on non-safe OR Double on safe + Even roll), then we are moving 2 tokens.
                // The restriction says "single token cannot...". So Pair moving onto Double is OK? 
                // Let's assume yes.
                // So we only block if we are moving a SINGLE token onto an opponent DOUBLE.

                // Am I blocking a Single?
                const isMovingPair = isDoubled && (!isSafe || (diceValue % 2 === 0)); // Heuristic match with moveToken
                // Note: moveToken has `if (isDoubled) { if (isSafe) ... else ... }`
                // Safe spot separation logic means on Safe spot we ALWAYS move Single.
                // So isMovingPair is only true if isDoubled AND !isSafe. 
                // (Because if isSafe, tokensToMove = [token] -> Single).

                // Wait, blindly following my previous change: 
                // "Safe spot: Can move as pair... NO, User requirement: clicking will separate... So default to single move."
                // So if isSafe, we move Single. 
                // So Pair move ONLY happens if !isSafe (and Dice is Even).

                const actuallyMovingPair = isDoubled && !isSafe && (diceValue % 2 === 0);

                if (!actuallyMovingPair && opponentDoubleAtLand) {
                    return false; // Single cannot land on Opponent Double
                }
            }
        }

        // Rule: Single token cannot share place with doubles of same player (No Triples)
        // Check landing spot for OWN tokens
        // If moving pair, they land together (form quad? allowed? Usually max 2. User said "single token cannot share place with doubles")
        // If we move pair, we land on existing tokens?

        const landStepsOwn = token.stepsMoved === -1 ? 0 : token.stepsMoved + diceValue; // Re-calc logic
        const ownTokensAtLand = currentTokens.filter(t => t.stepsMoved === landStepsOwn && t.id !== token.id);

        // If we are moving a Pair, we exclude both moving tokens.
        // Validating "token" (one of them). 
        // If moving pair, currentTokens has 2 tokens at source. 
        // Token A moves to target. Token B moves to target.
        // When updating state, they move. 
        // Here we simulate the move.

        // Simpler check: If target has >= 2 own tokens (Double), we cannot land there.
        // Unless we are moving those tokens (which we are not, we are moving TO there).
        // So just check static count at target.

        if (ownTokensAtLand.length >= 2) {
            // Target already has a double. Cannot form Triple.
            return false;
        }

        return true;
    }, [gameMode, playerData, currentPlayerColor, gameState]);

    const nextTurn = useCallback(() => {
        setTurn(prev => (prev + 1) % 4);
        setDiceQueue([]);
        setSelectedDiceId(null);
        setCanRoll(true);
        setConsecutiveSixes(0);
    }, []);

    // Check for stuck state (no valid moves)
    useEffect(() => {
        if (!rolling && !canRoll && diceQueue.length > 0) {
            const currentTokens = gameState[currentPlayerColor];
            const hasAnyValidMove = diceQueue.some(dice =>
                currentTokens.some(token => isValidMove(token, dice.value))
            );

            if (!hasAnyValidMove) {
                console.log("No valid moves available. Skipping turn...");
                const timer = setTimeout(nextTurn, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [diceQueue, rolling, canRoll, gameState, currentPlayerColor, nextTurn, isValidMove]);

    // Auto-Move Rule: If only one valid move exists, execute it.
    useEffect(() => {
        if (!rolling && !canRoll && diceQueue.length === 1 && !selectedDiceId) {
            const dice = diceQueue[0];
            const currentTokens = gameState[currentPlayerColor];

            // Find all valid moves for this dice
            let validMoves = [];
            currentTokens.forEach(token => {
                if (isValidMove(token, dice.value)) {
                    validMoves.push(token.id);
                }
            });

            // If exactly one token can move, auto-select and move?
            // Wait, we need to trigger moveToken. 
            // But moveToken needs selectedDiceId.
            // And moveToken is an event handler, safer to trigger selection first?
            // Or just direct state manipulation? 
            // Better to effectively "click".

            if (validMoves.length === 1) {
                // Only one token valid.
                // Is there ambiguity about Single vs Pair? 
                // isValidMove returns true if *some* move is possible. 
                // If it's a double, it might be the *only* moving unit (pair or single).
                // So validMoves contains ids. 
                // If I have 2 tokens on same spot (double), both return true? 
                // If I move one, I move the pair (if pair move). 
                // So "valid moves" might correspond to "valid distinct moves"?
                // If validMoves contains 2 IDs but they are the SAME double unit moving as pair, is that 1 move? 
                // If !isSafe, validMoves will contain both IDs (if valid). 
                // If I click either, same result. 
                // So effectively 1 move option. 

                // If I have 1 token at start, roll 6. Only 1 move. 

                // Let's refine "1 valid move".
                // If validMoves.length === 1 -> Definitely auto move.
                // If validMoves.length > 1: Check if they are all part of the same Double Unit that MUST move as pair?

                const uniqueOffests = new Set(validMoves.map(id => {
                    const t = currentTokens.find(ct => ct.id === id);
                    return t.stepsMoved;
                }));

                if (uniqueOffests.size === 1) {
                    // All valid tokens are at same spot.
                    // Are we forced to move as pair? 
                    // If !isSafe, yes. 
                    // If isSafe, we separate. If we separate, does it matter which one? No, they are fungible.
                    // Moving token A vs token B (same color, same spot) is identical game state.
                    // So yes, it is "1 unique move".

                    // Execute!
                    console.log("Auto-moving single option...");
                    const timeoutId = setTimeout(() => {
                        // We need to set selectedDiceId first? moveToken checks it.
                        // But we can't easily sync that in one tick if relying on state.
                        // Actually moveToken takes tokenId. It expects selectedDiceId to be set.
                        // We can force it or modify moveToken. 
                        // Or just sequence it: Select -> Move.

                        setSelectedDiceId(dice.id);
                        // We need another effect or immediate call? 
                        // State update is async. 
                        // But we can just call an internal helper or trust the next render?
                        // "moveToken" depends on "selectedDiceId". 
                        // If we set it here, we can't call moveToken immediately. 
                        // So we wait for next render? 
                        // Or we modify moveToken to accept diceId optionally?

                        // Hack: Select dice now, then trigger move in another effect? 
                        // Or just auto-select (which we already do for 1 dice) and then auto-move?

                        // Existing code:
                        // useEffect(() => { if (diceQueue.length > 0 ... !selectedDiceId ... ) setSelectedDiceId(...) }, ...)
                        // So dice is already selected? 
                        // Check the condition: `!selectedDiceId` in `if`.
                        // If we rely on the existing auto-select, then `selectedDiceId` WILL be set.
                        // So we should check `if (selectedDiceId ...)` here.
                    }, 500);

                    return () => clearTimeout(timeoutId);
                }
            }
        }
    }, [diceQueue, rolling, canRoll, gameState, currentPlayerColor, selectedDiceId, isValidMove]);

    // Auto-Move Execution Step (Splitting to ensure state is ready)
    useEffect(() => {
        if (!rolling && !canRoll && selectedDiceId) {
            const dice = diceQueue.find(d => d.id === selectedDiceId);
            if (!dice) return;

            const currentTokens = gameState[currentPlayerColor];
            let validTokenIds = [];
            currentTokens.forEach(token => {
                if (isValidMove(token, dice.value)) {
                    validTokenIds.push(token.id);
                }
            });

            // Check uniqueness of move
            const uniqueSteps = new Set(validTokenIds.map(id => currentTokens.find(t => t.id === id).stepsMoved));

            if (uniqueSteps.size === 1) {
                // Only one valid SOURCE position. 
                // Since tokens are identical, this is unique move.
                const tokenId = validTokenIds[0];

                // Execute with delay
                const timer = setTimeout(() => {
                    moveToken(tokenId);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedDiceId, rolling, canRoll, gameState, currentPlayerColor, diceQueue, isValidMove]); // Careful with deps, moveToken is stable? No, it changes. Add to deps or exclude. moveToken changes on state change. 
    // If we add moveToken, it might loop? 
    // moveToken updates state -> triggering this effect again? 
    // diceQueue changes -> selectedDiceId changes/clears -> effect stops.
    // So it should be safe.


    const rollDice = () => {
        if (!canRoll) return;
        setRolling(true);
        playDiceRollSound();

        setTimeout(() => {
            // Weighted Dice Logic
            const weightPool = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 6];
            const val = weightPool[Math.floor(Math.random() * weightPool.length)];

            setRolling(false);

            if (val === 6) {
                const newCount = consecutiveSixes + 1;

                // 3 Consecutive Sixes Rule
                if (newCount === 3) {
                    console.log("Three 6s in a row! Turn forfeited.");
                    setDiceQueue([]); // Clear everything
                    setConsecutiveSixes(0);
                    setCanRoll(false);
                    setTimeout(nextTurn, 1000);
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
                // setConsecutiveSixes(0); // We don't reset here because the turn continues for movement. Resets on new turn.
            }
        }, 500);
    };

    const selectDice = (id) => {
        setSelectedDiceId(id);
    };

    const isGloballySafe = (index) => {
        return SAFE_SPOTS.includes(index);
    };

    const moveToken = (tokenId) => {
        if (!selectedDiceId) return;

        const diceObj = diceQueue.find(d => d.id === selectedDiceId);
        if (!diceObj) return;
        const moveValue = diceObj.value;

        const tokens = gameState[currentPlayerColor];
        const token = tokens.find(t => t.id === tokenId);

        // Validation
        if (!isValidMove(token, moveValue)) {
            console.log("Invalid move");
            return;
        }

        // Determine Move Type (Single vs Pair)
        const tokensAtSpot = tokens.filter(t => t.stepsMoved === token.stepsMoved && t.stepsMoved !== -1 && t.stepsMoved < 51);
        const isDoubled = tokensAtSpot.length >= 2;
        const isSafe = SAFE_SPOTS.includes((PATH_OFFSETS[currentPlayerColor] + token.stepsMoved) % 52);

        let actualMoveSteps = moveValue;
        let tokensToMove = [token];

        if (isDoubled) {
            if (isSafe) {
                // Safe spot allows separation. 
                // User requirement: "clicking will separate and move a single token"
                // So default to single move.
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

        const newSteps = (token.stepsMoved === -1) ? 0 : token.stepsMoved + actualMoveSteps;

        // Apply Move
        let captureOccurred = false;
        let newGameState = { ...gameState };
        let newPlayerData = { ...playerData };

        // Process capture logic (only based on the first token moving, as they move to same spot)
        // If moving pair, they land together. 
        // Capture logic needs to be aware of landing spot.

        if (newSteps <= 50) {
            const offset = PATH_OFFSETS[currentPlayerColor];
            const globalPathIndex = (offset + newSteps) % 52;

            if (!isGloballySafe(globalPathIndex)) {
                PLAYER_ORDER.forEach(pColor => {
                    if (pColor === currentPlayerColor) return;
                    // Check opponets at this spot
                    const opponentsAtSpot = newGameState[pColor].filter(oppToken => {
                        if (oppToken.stepsMoved === -1 || oppToken.stepsMoved > 50) return false;
                        const oppOffset = PATH_OFFSETS[pColor];
                        return ((oppOffset + oppToken.stepsMoved) % 52) === globalPathIndex;
                    });

                    if (opponentsAtSpot.length > 0) {
                        // Capture!
                        // Defense in Depth: Check if we are allowed to capture?
                        // If Single vs Double -> NO CAPTURE (Illegal move should have been blocked, but if here, prevent state corruption)

                        // Check if we are moving a pair?
                        // tokensToMove has moving tokens.
                        const isAttackerDouble = tokensToMove.length >= 2;
                        const isDefenderDouble = opponentsAtSpot.length >= 2;

                        if (!isAttackerDouble && isDefenderDouble) {
                            console.warn("Illegal capture attempt blocked: Single trying to capture Double.");
                            // Do NOT capture. Proceed without modifying opponent state.
                            captureOccurred = false;
                        } else {
                            captureOccurred = true;
                            newPlayerData[currentPlayerColor] = { hasCaptured: true };

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
        newGameState[currentPlayerColor] = newGameState[currentPlayerColor].map(t => {
            if (tokensToMove.some(tm => tm.id === t.id)) {
                return { ...t, stepsMoved: newSteps };
            }
            return t;
        });

        playMoveSound();
        setGameState(newGameState);
        setPlayerData(newPlayerData);

        // Remove used dice
        const remainingQueue = diceQueue.filter(d => d.id !== selectedDiceId);
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
            nextTurn();
        }
    };

    // Calculate Valid Moves for Highlighting
    // If we have a selected dice, we highlight tokens valid for THAT dice.
    // If not, we don't highlight? Or we highlight for unique dice? 
    // Current design: User must select dice if multiple. If single, auto-selected. 
    // So selectedDiceId is usually set when it matters.

    const validTokenIds = [];
    if (selectedDiceId) {
        const dice = diceQueue.find(d => d.id === selectedDiceId);
        if (dice) {
            gameState[currentPlayerColor].forEach(token => {
                if (isValidMove(token, dice.value)) {
                    validTokenIds.push(token.id);
                }
            });
        }
    }

    return {
        gameState,
        currentPlayerColor,
        rollDice,
        diceQueue,
        selectedDiceId,
        selectDice,
        rolling,
        canRoll,
        moveToken,
        turn,
        playerData,
        validTokenIds
    };
};
