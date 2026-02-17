import React, { useState } from 'react';
import { GAME_MODES } from '../constants/gameConstants';

const StartScreen = ({ onStart }) => {
    const [isTeamMode, setIsTeamMode] = useState(false);

    return (
        <div className="start-screen" style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '2rem', textShadow: '0 0 10px #4285f4' }}>LUDO MASTER</h1>

            <div style={{ display: 'flex', gap: '20px' }}>
                <button
                    onClick={() => onStart(GAME_MODES.CLASSIC)}
                    style={{
                        padding: '20px 40px',
                        fontSize: '1.5rem',
                        background: '#34a853',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.target.style.transform = 'scale(1)'}
                >
                    CLASSIC
                    <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Standard Rules</div>
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => onStart(GAME_MODES.MASTER, isTeamMode)}
                        style={{
                            padding: '20px 40px',
                            fontSize: '1.5rem',
                            background: '#ea4335',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={e => e.target.style.transform = 'scale(1)'}
                    >
                        MASTER
                        <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Must Capture to Win</div>
                    </button>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={isTeamMode}
                            onChange={(e) => setIsTeamMode(e.target.checked)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        Enable Team Mode
                    </label>
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
