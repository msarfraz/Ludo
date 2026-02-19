import React from 'react';
import './../index.css';

import marioImg from '../assets/tokens/mario.png';
import luigiImg from '../assets/tokens/luigi.png';
import warioImg from '../assets/tokens/wario.png';
import koopaImg from '../assets/tokens/koopa.png';

const Token = ({ color, onClick, isMobile, animate, isValid }) => {
    const assetMap = {
        red: marioImg,
        green: luigiImg,
        yellow: warioImg,
        blue: koopaImg
    };

    return (
        <div
            className={`token ${color} ${animate ? 'animate-bounce' : ''} ${isValid ? 'highlight-valid' : ''}`}
            onClick={onClick}
        >
            <img
                src={assetMap[color]}
                alt={`${color} token`}
                className="token-character"
            />
            <div className="token-inner"></div>
        </div>
    );
};

export default Token;
