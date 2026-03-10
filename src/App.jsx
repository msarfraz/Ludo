import React, { useState } from 'react';
import LudoBoard from './components/LudoBoard';
import StartScreen from './components/StartScreen';
import { useLudoGame } from './logic/gameEngine';
import { PLAYER_ORDER, GAME_MODES } from './constants/gameConstants';
import './index.css';

function App() {
  const [gameConfig, setGameConfig] = useState(null);

  const handleStart = (mode, isTeamMode = false, playerCount = 4) => {
    setGameConfig({ mode, isTeamMode, playerCount });
  };

  return (
    <div className="app-root">
      {!gameConfig ? (
        <StartScreen onStart={handleStart} />
      ) : (
        <GameInstance config={gameConfig} onExit={() => setGameConfig(null)} />
      )}
    </div>
  );
}

const GameInstance = ({ config, onExit }) => {
  const { mode, isTeamMode, playerCount } = config;
  const {
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
    playerData,
    validTokenIds,
    capturableTokenIds,
    getValidDiceForToken,
    getMovesToCaptureTarget,
    gameEnded,
    gameWinner,
    exitPlayer,
    exitedPlayers,
    finishOrder
  } = useLudoGame(mode, isTeamMode, playerCount);

  const [activeMoveSelection, setActiveMoveSelection] = useState(null); // { tokenId, color, options }

  const handleTokenClick = (color, id) => {
    // Team Logic:
    // Green (0) & Blue (2)
    // Yellow (1) & Red (3)
    // Indexes in PLAYER_ORDER: ['green', 'yellow', 'blue', 'red']

    const isCurrent = color === currentPlayerColor;
    let isTeammate = false;

    if (isTeamMode) {
      const currentIndex = PLAYER_ORDER.indexOf(currentPlayerColor);
      const clickedIndex = PLAYER_ORDER.indexOf(color);
      // Teams are (0,2) and (1,3). Difference is 2.
      if (Math.abs(currentIndex - clickedIndex) === 2) {
        isTeammate = true;
      }
    }

    if (!isCurrent && !isTeammate) {
      if (capturableTokenIds.includes(`${color}-${id}`)) {
        const captureMoves = getMovesToCaptureTarget(id, color);
        if (captureMoves.length > 0) {
          // If there are multiple ways to capture, we simply use the first one 
          // for the convenience of one-click capture.
          moveToken(captureMoves[0].sourceId, captureMoves[0].sourceColor, captureMoves[0].diceId);
          setActiveMoveSelection(null);
        }
      }
      return;
    }

    // Check how many dice can actually move this token
    const options = getValidDiceForToken(id, color);

    if (options.length === 0) return;

    const token = gameState[color].find(t => String(t.id) === String(id));
    const isHome = token && token.stepsMoved === -1;

    if (options.length === 1 || isHome) {
      // Only one choice or it's a house token (which always consumes a '6') - move instantly
      moveToken(id, color, options[0].id);
      setActiveMoveSelection(null);
    } else {
      // Multiple choices - show selection menu
      setActiveMoveSelection({ tokenId: id, color, options });
    }
  };

  const handleSelectMove = (diceId) => {
    if (activeMoveSelection) {
      moveToken(activeMoveSelection.tokenId, activeMoveSelection.color, diceId);
      setActiveMoveSelection(null);
    }
  };

  return (
    <LudoBoard
      gameState={gameState}
      onTokenClick={handleTokenClick}
      currentPlayer={currentPlayerColor}
      isTeamMode={isTeamMode}
      gameMode={mode}
      playerData={playerData}
      diceProps={{
        value: lastRollValue,
        queue: diceQueue,
        selectedId: selectedDiceId,
        onSelect: selectDice,
        onRoll: rollDice,
        canRoll: canRoll,
        rolling: rolling,
        prevTurnData: prevTurnData
      }}
      validTokens={validTokenIds}
      capturableTokens={capturableTokenIds}
      activeMoveSelection={activeMoveSelection}
      onSelectMove={handleSelectMove}
      onCancelMove={() => setActiveMoveSelection(null)}
      playerCount={playerCount}
      onPlayerExit={exitPlayer}
      exitedPlayers={exitedPlayers}
      finishOrder={finishOrder}
      onExit={onExit}
    >
      {gameEnded && (
        <div className="game-over-overlay">
          <div className="game-over-banner">
            <h2 className="banner-title">GAME END</h2>
            <div className="winner-details">
              <span className="winner-label">WINNER</span>
              <div className="winner-name">
                {gameWinner?.type === 'TEAM' ? (
                  <div className="team-winner-display">
                    <span style={{ color: `var(--color-${gameWinner.colors[0]})` }}>
                      {gameWinner.colors[0].charAt(0).toUpperCase() + gameWinner.colors[0].slice(1)}
                    </span>
                    <span className="team-separator">&</span>
                    <span style={{ color: `var(--color-${gameWinner.colors[1]})` }}>
                      {gameWinner.colors[1].charAt(0).toUpperCase() + gameWinner.colors[1].slice(1)}
                    </span>
                  </div>
                ) : (
                  <span style={{ color: `var(--color-${gameWinner?.color})` }}>
                    {gameWinner?.name}
                  </span>
                )}
              </div>
            </div>
            <button className="back-to-home-btn" onClick={onExit}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </LudoBoard>
  );
};

export default App;
