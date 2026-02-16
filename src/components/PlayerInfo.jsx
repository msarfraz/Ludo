import React from 'react';

const PlayerInfo = ({ player, isActive }) => {
    return (
        <div style={{
            padding: '10px',
            border: isActive ? `3px solid ${player}` : '1px solid #ccc',
            borderRadius: '8px',
            opacity: isActive ? 1 : 0.6,
            background: '#333',
            color: 'white',
            width: '100px',
            textAlign: 'center',
            margin: '5px',
            transform: isActive ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s'
        }}>
            <div style={{
                width: '30px',
                height: '30px',
                background: player,
                borderRadius: '50%',
                margin: '0 auto 5px'
            }}></div>
            <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{player}</span>
        </div>
    );
};

export default PlayerInfo;
