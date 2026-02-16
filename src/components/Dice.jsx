import React from 'react';

const Dice = ({ value, onRoll, disabled, rolling }) => {
    const getDots = (val) => {
        // Simple dot layout logic or just use unicode/images.
        // Unicode dice are easy: ⚀ ⚁ ⚂ ⚃ ⚄ ⚅
        const faces = ['?', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return faces[val] || '?';
    };

    return (
        <div className="dice-container" style={{ textAlign: 'center', margin: '10px' }}>
            <button
                onClick={onRoll}
                disabled={disabled || rolling}
                style={{
                    fontSize: '4rem',
                    background: 'white',
                    border: '2px solid #333',
                    borderRadius: '10px',
                    width: '80px',
                    height: '80px',
                    lineHeight: '80px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                }}
            >
                <span className={rolling ? 'animate-spin' : ''} style={{ display: 'block', transition: 'transform 0.5s' }}>
                    {getDots(value)}
                </span>
            </button>
            <style>{`
        .animate-spin {
          animation: spin 0.5s infinite linear;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default Dice;
