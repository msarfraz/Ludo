import Dice from './Dice';

const Token = ({ color, onClick, animate, isValid, isCapturable, moveOptions, onSelectMove, isTopEdge, isBottomEdge, isLeftEdge, isRightEdge, parentScale = 1 }) => {
    return (
        <div className="token-wrapper" onClick={onClick}>
            <div className={`token-body ${color} ${animate ? 'animate-bounce' : ''} ${isValid ? 'highlight-valid' : ''} ${isCapturable ? 'highlight-target' : ''}`}>
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
            </div>

            {moveOptions && (
                <div
                    className="dice-menu-scaler"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: `scale(${1 / parentScale})`,
                        pointerEvents: 'none',
                        zIndex: 1000
                    }}
                >
                    <div className={`move-selection-menu 
                        ${isTopEdge ? 'position-bottom' : ''} 
                        ${isBottomEdge ? 'position-top' : ''} 
                        ${isLeftEdge ? 'shift-right' : ''} 
                        ${isRightEdge ? 'shift-left' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ pointerEvents: 'auto' }}
                    >
                        {moveOptions.map(opt => (
                            <div
                                key={opt.id}
                                className="move-option-btn-wrapper"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectMove(opt.id);
                                }}
                            >
                                <Dice value={opt.value} size={35} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Token;
