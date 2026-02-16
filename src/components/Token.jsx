import React from 'react';
import './../index.css';

const Token = ({ color, onClick, isMobile, animate, isValid }) => {
    return (
        <div
            className={`token ${color} ${animate ? 'animate-bounce' : ''} ${isValid ? 'highlight-valid' : ''}`}
            onClick={onClick}
            style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '80%',
                height: '80%'
            }}
        >
            <div className="token-inner" style={{
                width: '70%',
                height: '70%',
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.2)',
                margin: '15% auto',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent)'
            }}></div>
        </div>
    );
};

export default Token;
