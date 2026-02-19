import React from 'react';

const Dice = ({ value, onRoll, disabled, rolling, color = 'red', size = 42 }) => {
    const halfSize = size / 2;

    // Mapping value to rotation degrees
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

    const dotSize = Math.max(2, Math.floor(size / 6));
    const isBigDice = size > 40;

    const renderFace = (val, transform) => {
        const isFaceOne = val === 1 && isBigDice;

        return (
            <div
                className={`dice-face face-${val}`}
                style={{
                    width: size,
                    height: size,
                    transform: transform,
                    padding: Math.max(2, size / 10),
                    display: isFaceOne ? 'flex' : 'grid',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gridTemplateColumns: isFaceOne ? 'none' : 'repeat(3, 1fr)',
                    gridTemplateRows: isFaceOne ? 'none' : 'repeat(3, 1fr)'
                }}
            >
                {isFaceOne ? (
                    <div className="dice-m-character" style={{ fontSize: size * 0.7 }}>M</div>
                ) : (
                    dots[val].map(dotIdx =>
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

    return (
        <div className="dice-3d-wrapper" onClick={onRoll} style={{ width: size, height: size }}>
            <div
                className={`dice-3d ${rolling ? 'rolling' : ''}`}
                style={{
                    transform: rolling ? undefined : rotations[(isBigDice && !rolling) ? 1 : (value || 1)],
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
