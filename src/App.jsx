import React, { useState } from 'react';
import LudoBoard from './components/LudoBoard';
import StartScreen from './components/StartScreen';
import { useLudoGame } from './logic/gameEngine';
import { PLAYER_ORDER, GAME_MODES } from './constants/gameConstants';
import './index.css';

function App() {
  const [gameConfig, setGameConfig] = useState(null);

  const handleStart = (mode, isTeamMode = false) => {
    setGameConfig({ mode, isTeamMode });
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
  const { mode, isTeamMode } = config;
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
    getValidDiceForToken
  } = useLudoGame(mode, isTeamMode);

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

    if (!isCurrent && !isTeammate) return;

    // Check how many dice can actually move this token
    const options = getValidDiceForToken(id, color);

    if (options.length === 0) return;

    if (options.length === 1) {
      // Only one choice - move instantly
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
      activeMoveSelection={activeMoveSelection}
      onSelectMove={handleSelectMove}
      onCancelMove={() => setActiveMoveSelection(null)}
    />
  );
};

export default App;
