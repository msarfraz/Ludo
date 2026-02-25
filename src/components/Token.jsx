import Dice from './Dice';

const Token = ({ color, onClick, animate, isValid, isCapturable, moveOptions, onSelectMove }) => {
    return (
        <div
            className={`token ${color} ${animate ? 'animate-bounce' : ''} ${isValid ? 'highlight-valid' : ''} ${isCapturable ? 'highlight-target' : ''}`}
            onClick={onClick}
        >
            <div className="token-face">
                <div className="token-shine"></div>
                <div className="token-inner"></div>
                <svg viewBox="0 0 100 100" className="token-svg">
                    <path
                        d="M50 5L61.23 39.57H97.55L68.16 60.95L79.39 95.53L50 74.15L20.61 95.53L31.84 60.95L2.45 39.57H38.77L50 5Z"
                        fill="black"
                        opacity="0.4"
                    />
                </svg>
            </div>

            {moveOptions && (
                <div className="move-selection-menu" onClick={(e) => e.stopPropagation()}>
                    {moveOptions.map(opt => (
                        <div
                            key={opt.id}
                            className="move-option-btn-wrapper"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectMove(opt.id);
                            }}
                        >
                            <Dice value={opt.value} size={32} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Token;
