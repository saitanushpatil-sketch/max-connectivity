import { useState, useEffect, useRef } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const GRAVITY = 0.6;
const JUMP = -8;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 50;
const PIPE_GAP = 150;

export default function FlappyBird({ onExit, onScoreSaved }) {
  const [birdPos, setBirdPos] = useState(300);
  const [birdVel, setBirdVel] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const gameAreaRef = useRef(null);

  const startGame = () => {
    setBirdPos(300);
    setBirdVel(0);
    setPipes([]);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const jump = () => {
    if (gameOver) return;
    if (!isPlaying) startGame();
    setBirdVel(JUMP);
    hapticTap(10);
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let animationFrameId;
    let frameCount = 0;

    const gameLoop = () => {
      frameCount++;
      
      setBirdPos(pos => {
        const newPos = pos + birdVel;
        if (newPos > 600 || newPos < 0) {
          setGameOver(true);
        }
        return newPos;
      });
      setBirdVel(v => v + GRAVITY);

      setPipes(currentPipes => {
        let newPipes = currentPipes.map(p => ({ ...p, x: p.x - PIPE_SPEED }));
        
        if (frameCount % 100 === 0) {
          const topHeight = Math.random() * 200 + 100;
          newPipes.push({ x: 400, topHeight, passed: false });
        }
        
        // Remove off-screen pipes
        newPipes = newPipes.filter(p => p.x > -PIPE_WIDTH);
        
        // Check collisions & score
        newPipes.forEach(p => {
          if (p.x < 100 + 30 && p.x + PIPE_WIDTH > 100) { // Bird is x:100, width:30
            setBirdPos(bPos => {
              if (bPos < p.topHeight || bPos + 30 > p.topHeight + PIPE_GAP) {
                setGameOver(true);
              }
              return bPos;
            });
          }
          if (p.x < 100 && !p.passed) {
            p.passed = true;
            setScore(s => s + 1);
            hapticTap(10);
          }
        });
        
        return newPipes;
      });

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, gameOver, birdVel]);

  useEffect(() => {
    if (gameOver && score > 0) {
      api.post('/games/score', { gameId: 'flappy-bird', score }).then(() => onScoreSaved?.()).catch(() => {});
    }
  }, [gameOver]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]" onMouseDown={jump} onTouchStart={jump}>
      <div className="flex justify-between items-center p-4">
        <span className="font-mono text-[#FFB703]">SCORE: {score}</span>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div ref={gameAreaRef} style={{
          width: 400, height: 600, maxWidth: '100%',
          background: '#12121A', border: '2px solid #252535',
          position: 'relative', overflow: 'hidden'
        }}>
          {!isPlaying && !gameOver ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#FFB703] font-bold font-mono animate-pulse">TAP TO FLY</span>
            </div>
          ) : (
            <>
              {/* Bird */}
              <div style={{
                position: 'absolute', left: 100, top: birdPos,
                width: 30, height: 30, background: '#FFB703',
                borderRadius: '50%', boxShadow: '0 0 10px #FFB703'
              }} />
              
              {/* Pipes */}
              {pipes.map((p, i) => (
                <div key={i}>
                  <div style={{
                    position: 'absolute', left: p.x, top: 0,
                    width: PIPE_WIDTH, height: p.topHeight,
                    background: '#06D6A0', border: '2px solid #04a87c'
                  }} />
                  <div style={{
                    position: 'absolute', left: p.x, top: p.topHeight + PIPE_GAP,
                    width: PIPE_WIDTH, height: 600 - (p.topHeight + PIPE_GAP),
                    background: '#06D6A0', border: '2px solid #04a87c'
                  }} />
                </div>
              ))}
              
              {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10">
                  <span className="text-[#FF006E] font-bold text-2xl font-mono">CRASHED!</span>
                  <span className="text-[#FFB703] font-mono mb-4">SCORE: {score}</span>
                  <button onClick={startGame} className="hud-btn bg-[#FFB703] text-black px-6 py-2 rounded font-bold z-20" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>PLAY AGAIN</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
