import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Trophy, Wifi, WifiOff } from 'lucide-react';

const OverlayMode = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'matches', matchId),
      (doc) => {
        if (doc.exists()) {
          setMatch({ id: doc.id, ...doc.data() });
          setConnected(true);
        }
      },
      (error) => {
        console.error('Error listening to match updates:', error);
        setConnected(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  if (!match) {
    return null; // Don't show loading for overlay
  }

  const currentBatting = match.currentInning === 1 ? 'teamA' : 'teamB';
  const currentBowling = match.currentInning === 1 ? 'teamB' : 'teamA';
  
  // Dynamic data with fallbacks to static
  const battingTeam = currentBatting === 'teamA' ? match.teamA : match.teamB;
  const bowlingTeam = currentBatting === 'teamA' ? match.teamB : match.teamA;
  
  const currentScore = match.currentScore?.[currentBatting] || 0;
  const currentWickets = match.currentScore?.[`wickets${currentBatting.charAt(currentBatting.length - 1).toUpperCase()}`] || 0;
  const currentOvers = match.stats?.[currentBatting]?.overs || '0.0';
  const currentExtras = match.stats?.[currentBatting]?.extras || 0;
  
  // Current batsmen (dynamic when available, static fallback)
  const striker = match.currentBatsmen?.striker || { name: "M. Babar", runs: 47, balls: 35, fours: 4, sixes: 1, sr: 134.29 };
  const nonStriker = match.currentBatsmen?.nonStriker || { name: "F. Zaman", runs: 23, balls: 18, fours: 2, sixes: 0, sr: 127.78 };
  
  // Current bowler (dynamic when available, static fallback)
  const bowler = match.currentBowler || { name: "S. Afridi", overs: "3.2", maidens: 0, runs: 28, wickets: 1, economy: 8.40 };
  
  // Recent balls
  const recentBalls = match.recentBalls || ['1', '4', '0', 'W', '2', '6'];
  
  // Target info
  const target = match.target;
  const required = target ? (target - currentScore) : null;
  const ballsLeft = match.ballsLeft;
  const requiredRate = required && ballsLeft ? ((required / ballsLeft) * 6).toFixed(2) : null;

  return (
    <div className="overlay-mode fixed bottom-0 left-0 right-0 z-50 font-mono">
      {/* Connection Status - Top Right */}
      <div className="fixed top-4 right-4 z-10">
        {connected ? (
          <Wifi className="h-5 w-5 text-green-400" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-400" />
        )}
      </div>

      {/* Main Scorecard */}
      <div className="bg-gradient-to-r from-black/95 to-gray-900/95 backdrop-blur-md border-t-4 border-red-600">
        <div className="px-6 py-3">
          
          {/* Top Row - Match Info */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-bold text-lg">
                  {match.teamA} vs {match.teamB}
                </span>
              </div>
              {match.status === 'live' && (
                <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                  ● LIVE
                </div>
              )}
              <div className="text-gray-300 text-sm">
                {match.venue} • {match.overs} overs
              </div>
            </div>
            
            {/* Target Info */}
            {target && (
              <div className="text-right">
                <div className="text-white text-sm">
                  Target: <span className="font-bold text-red-400">{target}</span>
                </div>
                {required !== null && (
                  <div className="text-gray-300 text-xs">
                    Need {required} from {ballsLeft} balls • RR: {requiredRate}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Score Row */}
          <div className="grid grid-cols-12 gap-4 items-center mb-3">
            
            {/* Team Score */}
            <div className="col-span-3">
              <div className="bg-blue-900/50 rounded-lg p-3 text-center border border-blue-800">
                <div className="text-white font-bold text-sm mb-1">{battingTeam}</div>
                <div className="text-white text-2xl font-bold">
                  {currentScore}
                  <span className="text-lg text-red-400">/{currentWickets}</span>
                </div>
                <div className="text-gray-300 text-sm">
                  ({currentOvers} ov)
                  {currentExtras > 0 && (
                    <span className="text-orange-400 ml-1">E: {currentExtras}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Current Batsmen */}
            <div className="col-span-4">
              <div className="space-y-2">
                {/* Striker */}
                <div className="bg-green-900/30 rounded border border-green-800 px-3 py-2 flex justify-between items-center">
                  <div>
                    <span className="text-white font-bold">{striker.name}</span>
                    <span className="text-green-400 ml-2 text-xs">●</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      {striker.runs}<span className="text-gray-400 text-sm">({striker.balls})</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      4s:{striker.fours} 6s:{striker.sixes} SR:{striker.sr}
                    </div>
                  </div>
                </div>
                
                {/* Non-Striker */}
                <div className="bg-gray-800/30 rounded border border-gray-700 px-3 py-2 flex justify-between items-center">
                  <div>
                    <span className="text-white font-bold">{nonStriker.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      {nonStriker.runs}<span className="text-gray-400 text-sm">({nonStriker.balls})</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      4s:{nonStriker.fours} 6s:{nonStriker.sixes} SR:{nonStriker.sr}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Bowler */}
            <div className="col-span-3">
              <div className="bg-red-900/30 rounded border border-red-800 px-3 py-2">
                <div className="text-white font-bold text-sm mb-1">{bowler.name}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">{bowler.overs} ov</span>
                  <span className="text-gray-300">M: {bowler.maidens}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white">{bowler.runs}/{bowler.wickets}</span>
                  <span className="text-orange-400">Eco: {bowler.economy}</span>
                </div>
              </div>
            </div>

            {/* Recent Balls */}
            <div className="col-span-2">
              <div className="text-center">
                <div className="text-gray-300 text-xs mb-1">This Over</div>
                <div className="flex justify-center space-x-1">
                  {recentBalls.slice(-6).map((ball, index) => (
                    <div
                      key={index}
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${ball === '4' ? 'bg-green-600 text-white' : 
                          ball === '6' ? 'bg-purple-600 text-white' : 
                          ball === 'W' ? 'bg-red-600 text-white' : 
                          ball === '0' ? 'bg-gray-600 text-white' : 
                          'bg-blue-600 text-white'}
                      `}
                    >
                      {ball}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Additional Info */}
          <div className="flex justify-between items-center text-xs">
            <div className="flex space-x-6 text-gray-300">
              <span>CRR: {((currentScore / (parseFloat(currentOvers) || 1)) * 6).toFixed(2)}</span>
              <span>Bowling: {bowlingTeam}</span>
              {match.matchType && <span>{match.matchType}</span>}
            </div>
            
            {/* Partnership */}
            <div className="text-gray-300">
              Partnership: <span className="text-white font-bold">
                {(striker.runs + nonStriker.runs)} ({striker.balls + nonStriker.balls} balls)
              </span>
            </div>
            
            <div className="text-gray-400">
              Royal Falcons Cricket
            </div>
          </div>

          {/* Match Result Banner (when completed) */}
          {match.status === 'completed' && match.result && (
            <div className="mt-3 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg p-3 text-center">
              <div className="text-black font-bold text-lg">
                🏆 {match.result}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Floating Commentary (Optional) */}
      {match.lastBall?.commentary && (
        <div className="fixed bottom-28 left-6 right-6 bg-black/80 backdrop-blur rounded-lg p-3 border border-gray-700">
          <div className="text-green-400 text-sm font-bold mb-1">
            {match.lastBall.over}.{match.lastBall.ball} | {match.lastBall.runs} runs
          </div>
          <div className="text-white text-sm">
            {match.lastBall.commentary}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayMode;