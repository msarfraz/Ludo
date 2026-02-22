import React from 'react';
import './../index.css';

const Token = ({ color, onClick, animate, isValid, isCapturable, moveOptions, onSelectMove }) => {
    return (
        <div
            className={`token ${color} ${animate ? 'animate-bounce' : ''} ${isValid ? 'highlight-valid' : ''} ${isCapturable ? 'highlight-target' : ''}`}
            onClick={onClick}
        >
            <div className="token-face">
                <svg viewBox="0 0 100 100" className="token-svg">
                    <path
                        d="M50 5L61.23 39.57H97.55L68.16 60.95L79.39 95.53L50 74.15L20.61 95.53L31.84 60.95L2.45 39.57H38.77L50 5Z"
                        fill="black"
                        opacity="0.6"
                    />
                </svg>
            </div>

            {moveOptions && (
                <div className="move-selection-menu" onClick={(e) => e.stopPropagation()}>
                    {moveOptions.map(opt => (
                        <button
                            key={opt.id}
                            className="move-option-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectMove(opt.id);
                            }}
                        >
                            {opt.value}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Token;
