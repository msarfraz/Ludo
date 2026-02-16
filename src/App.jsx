import React, { useState } from 'react';
import LudoBoard from './components/LudoBoard';
import StartScreen from './components/StartScreen';
import { useLudoGame } from './logic/gameEngine';
import { PLAYER_ORDER, GAME_MODES } from './constants/gameConstants';
import './index.css';

function App() {
  const [gameMode, setGameMode] = useState(null);

  return (
    <div className="app-root">
      {!gameMode ? (
        <StartScreen onStart={setGameMode} />
      ) : (
        <GameInstance mode={gameMode} onExit={() => setGameMode(null)} />
      )}
    </div>
  );
}

const GameInstance = ({ mode, onExit }) => {
  const {
    gameState,
    currentPlayerColor,
    rollDice,
    diceQueue,
    selectedDiceId,
    selectDice,
    rolling,
    canRoll,
    moveToken,
    playerData,
    validTokenIds
  } = useLudoGame(mode);

  const handleTokenClick = (color, id) => {
    if (color !== currentPlayerColor) return;
    moveToken(id);
  };

  return (
    <div className="game-container">
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '600px', justifyContent: 'space-between', color: 'white', padding: '0 10px' }}>
        <button onClick={onExit} style={{ background: 'transparent', border: '1px solid #666', color: '#999', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
          &larr; Exit
        </button>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>
          Ludo {mode === GAME_MODES.MASTER ? <span style={{ color: '#ea4335' }}>MASTER</span> : <span style={{ color: '#34a853' }}>CLASSIC</span>}
        </h1>
        <div style={{ fontSize: '0.8rem', textAlign: 'right', width: '150px' }}>
          {mode === GAME_MODES.MASTER && (
            playerData[currentPlayerColor]?.hasCaptured
              ? <span style={{ color: '#34a853' }}>Unlocked Home Entry</span>
              : <span style={{ color: '#ea4335' }}>Must Capture First</span>
          )}
        </div>
      </div>

      <LudoBoard
        gameState={gameState}
        onTokenClick={handleTokenClick}
        currentPlayer={currentPlayerColor}
        diceProps={{
          value: 0, // Legacy support
          queue: diceQueue,
          selectedId: selectedDiceId,
          onSelect: selectDice,
          onRoll: rollDice,
          canRoll: canRoll,
          rolling: rolling
        }}
        validTokens={validTokenIds}
      />

      {/* Instructions / Feedback */}
      {!canRoll && diceQueue.length === 0 && (
        // Should not happen?
        null
      )}
      {!canRoll && diceQueue.length > 0 && !selectedDiceId && (
        <div style={{ color: '#ddd', marginTop: '10px' }}>
          Select a dice to move
        </div>
      )}
      {!canRoll && diceQueue.length > 0 && selectedDiceId && (
        <div style={{ color: '#ddd', marginTop: '10px' }}>
          Select a token to move with {diceQueue.find(d => d.id === selectedDiceId)?.value}
        </div>
      )}
    </div>
  );
};

export default App;
