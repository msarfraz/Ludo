const rotations = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(-90deg) rotateY(0deg)',
    3: 'rotateX(0deg) rotateY(-90deg)',
    4: 'rotateX(0deg) rotateY(90deg)',
    5: 'rotateX(90deg) rotateY(0deg)',
    6: 'rotateX(180deg) rotateY(0deg)',
};

const dots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
};

const Dice = ({ value, onRoll, disabled, rolling, isActive, color = 'red', size = 42 }) => {
    const halfSize = size / 2;
    const dotSize = Math.max(2, Math.floor(size / 6));
    const isBigDice = size > 40;

    // Pulse only if it's our turn, we haven't rolled yet, and it's a big dice
    const shouldPulse = isActive && !disabled && !rolling && isBigDice;

    const renderFace = (faceIndex, transform) => {
        // Face 1 on the main dice (big) shows the Star icon only when idle/reset (value 0)
        const showStar = faceIndex === 1 && isBigDice && targetValue === 0;

        return (
            <div
                className={`dice-face face-${faceIndex}`}
                style={{
                    width: size,
                    height: size,
                    transform: transform,
                    padding: Math.max(2, size / 10),
                    display: showStar ? 'flex' : 'grid',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gridTemplateColumns: showStar ? 'none' : 'repeat(3, 1fr)',
                    gridTemplateRows: showStar ? 'none' : 'repeat(3, 1fr)'
                }}
            >
                {showStar ? (
                    <div className="dice-star-icon" style={{ width: size * 0.7, height: size * 0.7 }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                            <defs>
                                <filter id="diceStar3D" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                                    <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
                                    <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1" specularExponent="20" lightingColor="#fff" result="specOut">
                                        <fePointLight x="-50" y="-100" z="200" />
                                    </feSpecularLighting>
                                    <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
                                    <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litGraphic" />
                                    <feMerge>
                                        <feMergeNode in="offsetBlur" />
                                        <feMergeNode in="litGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <path
                                d="M50 5L61.23 39.57H97.55L68.16 60.95L79.39 95.53L50 74.15L20.61 95.53L31.84 60.95L2.45 39.57H38.77L50 5Z"
                                fill="#FFD700"
                                filter="url(#diceStar3D)"
                            />
                        </svg>
                    </div>
                ) : (
                    dots[faceIndex].map(dotIdx =>
                        <div
                            key={dotIdx}
                            className={`dice-dot dot-${dotIdx}`}
                            style={{ width: dotSize, height: dotSize }}
                        ></div>
                    )
                )}
            </div>
        );
    };

    const targetValue = value || 0;
    const rotationValue = targetValue === 0 ? 1 : targetValue;

    return (
        <div
            className={`dice-3d-wrapper ${shouldPulse ? 'pulse-active' : ''}`}
            onClick={(!disabled && !rolling) ? onRoll : undefined}
            style={{ width: size, height: size }}
        >
            <div
                className={`dice-3d ${rolling ? 'rolling' : ''}`}
                style={{
                    transform: rolling ? undefined : rotations[rotationValue],
                    width: size,
                    height: size
                }}
            >
                {renderFace(1, `rotateY(0deg) translateZ(${halfSize}px)`)}
                {renderFace(6, `rotateX(180deg) translateZ(${halfSize}px)`)}
                {renderFace(3, `rotateY(90deg) translateZ(${halfSize}px)`)}
                {renderFace(4, `rotateY(-90deg) translateZ(${halfSize}px)`)}
                {renderFace(2, `rotateX(90deg) translateZ(${halfSize}px)`)}
                {renderFace(5, `rotateX(-90deg) translateZ(${halfSize}px)`)}
            </div>
        </div>
    );
};

export default Dice;
