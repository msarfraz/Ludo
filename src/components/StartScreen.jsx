import React, { useState } from 'react';
import { GAME_MODES } from '../constants/gameConstants';

const StartScreen = ({ onStart }) => {
    const [isTeamMode, setIsTeamMode] = useState(false);

    return (
        <div className="start-screen">
            <h1 className="start-title">LUDO MASTER</h1>

            <div className="mode-buttons-container">
                <button
                    className="mode-btn classic"
                    onClick={() => onStart(GAME_MODES.CLASSIC)}
                >
                    CLASSIC
                    <div className="btn-subtitle">Standard Rules</div>
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <button
                        className="mode-btn master"
                        onClick={() => onStart(GAME_MODES.MASTER, isTeamMode)}
                    >
                        MASTER
                        <div className="btn-subtitle">Must Capture to Win</div>
                    </button>

                    <label className="team-mode-toggle">
                        <input
                            type="checkbox"
                            checked={isTeamMode}
                            onChange={(e) => setIsTeamMode(e.target.checked)}
                        />
                        Enable Team Mode
                    </label>
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
