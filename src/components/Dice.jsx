const rotations = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(-90deg) rotateY(0deg)',
    3: 'rotateX(0deg) rotateY(-90deg)',
    4: 'rotateX(0deg) rotateY(90deg)',
    5: 'rotateX(90deg) rotateY(0deg)',
    6: 'rotateX(180deg) rotateY(0deg)',
};

const svgDots = {
    1: [{ cx: 50, cy: 50 }], // Used for small dice in tray
    2: [{ cx: 25, cy: 25 }, { cx: 75, cy: 75 }],
    3: [{ cx: 25, cy: 25 }, { cx: 50, cy: 50 }, { cx: 75, cy: 75 }],
    4: [{ cx: 25, cy: 25 }, { cx: 75, cy: 25 }, { cx: 25, cy: 75 }, { cx: 75, cy: 75 }],
    5: [{ cx: 25, cy: 25 }, { cx: 75, cy: 25 }, { cx: 50, cy: 50 }, { cx: 25, cy: 75 }, { cx: 75, cy: 75 }],
    6: [{ cx: 25, cy: 20 }, { cx: 75, cy: 20 }, { cx: 25, cy: 50 }, { cx: 75, cy: 50 }, { cx: 25, cy: 80 }, { cx: 75, cy: 80 }],
};

const Dice = ({ value, onRoll, disabled, rolling, isActive, color = 'red', size = 42 }) => {
    const halfSize = size / 2;
    const isBigDice = size > 40;

    // Pulse only if it's our turn, we haven't rolled yet, and it's a big dice
    const shouldPulse = isActive && !disabled && !rolling && isBigDice;

    const renderFace = (faceIndex, transform) => {
        // Face 1 on the main dice (big) shows the Star icon always
        const showStar = faceIndex === 1 && isBigDice;

        return (
            <div
                className={`dice-face face-${faceIndex}`}
                style={{
                    width: size,
                    height: size,
                    transform: transform,
                    padding: Math.max(2, size / 10),
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
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
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {(svgDots[faceIndex] || []).map((dot, i) => (
                            <circle
                                key={i}
                                cx={dot.cx}
                                cy={dot.cy}
                                r="12"
                                fill="#333"
                                vectorEffect="non-scaling-stroke"
                                style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }}
                            />
                        ))}
                    </svg>
                )}
            </div>
        );
    };

    const targetValue = value || 0;
    const rotationValue = isBigDice ? 1 : (targetValue === 0 ? 1 : targetValue);

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
