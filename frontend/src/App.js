import React, { useState, useEffect, useRef } from 'react';
import join from "./join.jpg";
import kill from "./kill.webp";
import dead from "./dead.gif";

const App = () => {
  const [ws, setWs] = useState(null);
  const [userCursors, setUserCursors] = useState({});
  const [userId, setUserId] = useState(null);
  const [killed, setWasKilled] = useState(false);
  const [scores, setScores] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const cursorPosition = useRef({ x: 0, y: 0 });

  const handleJoin = () => {
    const socket = new WebSocket('wss://cursors-1.onrender.com:443');

    socket.onopen = () => {
      console.log('Connected to WebSocket');
      const id = `user_${Date.now()}`;
      setUserId(id);
      setIsConnected(true);
      setWasKilled(false);
      socket.send(JSON.stringify({ type: 'user-joined', userId: id }));
    };

    socket.onclose = () => {
      console.log('Dionnected to WebSocket');
      setWasKilled(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'user-joined') {
        setScores(data.score);
      }

      if (data.type === 'cursor') {
        setUserCursors((prevCursors) => ({
          ...prevCursors,
          [data.userId]: { position: data.position, color: data.color },
        }));
      }

      if (data.type === 'user-disconnected') {
        setUserCursors((prevCursors) => {
          const newCursors = { ...prevCursors };
          delete newCursors[data.userId];
          return newCursors;
        });

        console.log(`User ${data.userId} disconnected`);
        console.log(`User ${userId} disconnected`);
        if (data.userId === userId) {
          setWasKilled(true);
        }
      }

      if (data.type === 'score-update') {
        setScores((prevScores) => ({
          ...prevScores,
          [data.color]: data.score,
        }));
      }
    };

    setWs(socket);
  };



  const handleCursorClick = (clickedUserId) => {
    if (ws && userId && clickedUserId !== userId) {
      console.log(`Clicked on ${clickedUserId}, checking for collision...`);
      ws.send(
          JSON.stringify({
            type: 'check-collision',
            userId,
            targetUserId: clickedUserId,
          })
      );
    }
  };

  useEffect(() => {

    if (isConnected) {
      const handleMouseMove = (event) => {
        cursorPosition.current = { x: event.clientX, y: event.clientY };
        if (ws && userId) {
          ws.send(
              JSON.stringify({
                type: 'cursor',
                userId,
                position: cursorPosition.current,
              })
          );
        }
      };
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [ws, userId, isConnected]);

  return (
      <div>
        {!isConnected ? (
            <button
                onClick={handleJoin}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  margin: '20px',
                }}
            >
              Join Game
            </button>
        ) : (
            <div style={{position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#f0f0f0'}}>
              {Object.keys(userCursors).map((id) => {
                const {position, color} = userCursors[id];
                return (
                    <div
                        key={id}
                        onClick={() => handleCursorClick(id)}
                        style={{
                          position: 'absolute',
                          top: position.y,
                          left: position.x,
                          width: 50,
                          height: 50,
                          backgroundColor: color,
                          borderRadius: '50%',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                        }}
                    />
                );
              })}
            </div>
        )}

        {isConnected && (
            <div style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: '#fff',
              padding: '10px',
              borderRadius: '5px'
            }}>
              <h3>Score</h3>
              {Object.keys(scores).map((id) => (
                  <p key={id} style={{
                    backgroundColor: id,
                    color: 'white',
                    textAlign: 'center',
                  }}>
                    {scores[id]}
                  </p>
              ))}
            </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 750,
          backgroundColor: '#fff',
          padding: '10px',
          borderRadius: '5px'
        }}>
          {!isConnected && !killed && (
              <img src={kill} alt="fggg" style={{width: 150, height: 150}}/>
          )}
          {killed && (
              <img src={dead} alt="asd" style={{width: 150, height: 150}}/>
          )}
          {isConnected && !killed && (
              <img src={join} alt="sdgf" style={{width: 150, height: 150}}/>
          )}


        </div>
      </div>
  );
};

export default App;
