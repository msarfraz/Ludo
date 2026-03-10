import React, { useState } from 'react';
import { GAME_MODES } from '../constants/gameConstants';

const StartScreen = ({ onStart }) => {
    const [isTeamMode, setIsTeamMode] = useState(false);
    const [playerCount, setPlayerCount] = useState(4);

    const handleTeamToggle = (checked) => {
        setIsTeamMode(checked);
        if (checked) {
            setPlayerCount(4);
        }
    };

    const playerHints = {
        2: ['green', 'blue'],
        3: ['green', 'yellow', 'blue'],
        4: ['green', 'yellow', 'blue', 'red']
    };

    return (
        <div className="start-screen">
            <h1 className="start-title">LUDO MASTER</h1>

            <div className="setup-container">
                <div className="player-selection-section">
                    <h3 className="section-label">CHOOSE PLAYERS</h3>
                    <div className="player-count-buttons">
                        {[2, 3, 4].map(count => (
                            <button
                                key={count}
                                className={`count-btn ${playerCount === count ? 'active' : ''} ${isTeamMode && count !== 4 ? 'disabled' : ''}`}
                                onClick={() => !isTeamMode && setPlayerCount(count)}
                            >
                                <div className="count-number">{count}</div>
                                <div className="player-color-hints">
                                    {playerHints[count].map(color => (
                                        <div key={color} className={`color-dot ${color}`}></div>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="global-settings-section">
                    <label className="team-mode-toggle premium-toggle">
                        <input
                            type="checkbox"
                            checked={isTeamMode}
                            onChange={(e) => handleTeamToggle(e.target.checked)}
                        />
                        <div className="toggle-control"></div>
                        <span className="toggle-text">Enable Team Mode (4 Players Only)</span>
                    </label>
                </div>

                <div className="mode-selection-section">
                    <h3 className="section-label">SELECT GAME MODE</h3>
                    <div className="mode-buttons-container binary-layout">
                        <button
                            className="mode-btn uniform-btn classic"
                            onClick={() => onStart(GAME_MODES.CLASSIC, isTeamMode, playerCount)}
                        >
                            <span className="mode-name">CLASSIC</span>
                            <div className="btn-subtitle">Standard Rules</div>
                        </button>

                        <button
                            className="mode-btn uniform-btn master"
                            onClick={() => onStart(GAME_MODES.MASTER, isTeamMode, playerCount)}
                        >
                            <span className="mode-name">MASTER</span>
                            <div className="btn-subtitle">Must Capture to Win</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
