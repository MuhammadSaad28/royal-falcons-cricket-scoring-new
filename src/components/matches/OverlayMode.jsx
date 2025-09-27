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
    return (
      <div className="overlay-mode min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading match data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-mode min-h-screen p-4 font-cricket">
      {/* Connection Status */}
      <div className="fixed top-4 right-4 z-10">
        {connected ? (
          <Wifi className="h-6 w-6 text-green-400" />
        ) : (
          <WifiOff className="h-6 w-6 text-red-400" />
        )}
      </div>

      {/* Main Score Display */}
      <div className="max-w-4xl mx-auto">
        {/* Match Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <Trophy className="h-8 w-8 text-yellow-400 mr-2" />
            <h1 className="text-3xl font-bold text-white">
              {match.teamA} vs {match.teamB}
            </h1>
          </div>
          <div className="text-gray-300">
            {match.venue} • {match.overs} overs
          </div>
          {match.status === 'live' && (
            <div className="mt-2">
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                ● LIVE
              </span>
            </div>
          )}
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Team A */}
          <div className="card text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">{match.teamA}</h2>
            <div className="text-5xl font-bold text-cricket-green mb-2">
              {match.currentScore?.teamA || 0}
              <span className="text-3xl text-gray-300">
                /{match.currentScore?.wicketsA || 0}
              </span>
            </div>
            <div className="text-gray-300">
              {match.stats?.teamA?.overs || '0.0'} overs
            </div>
            {match.stats?.teamA?.extras > 0 && (
              <div className="text-sm text-cricket-orange mt-1">
                Extras: {match.stats.teamA.extras}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="card text-center p-6">
            <h2 className="text-xl font-bold text-white mb-4">{match.teamB}</h2>
            <div className="text-5xl font-bold text-cricket-blue mb-2">
              {match.currentScore?.teamB || 0}
              <span className="text-3xl text-gray-300">
                /{match.currentScore?.wicketsB || 0}
              </span>
            </div>
            <div className="text-gray-300">
              {match.stats?.teamB?.overs || '0.0'} overs
            </div>
            {match.stats?.teamB?.extras > 0 && (
              <div className="text-sm text-cricket-orange mt-1">
                Extras: {match.stats.teamB.extras}
              </div>
            )}
          </div>
        </div>

        {/* Last Ball/Current Status */}
        {match.ballByBall && match.ballByBall.length > 0 && (
          <div className="card p-4 mb-8">
            <h3 className="text-lg font-bold text-white mb-2">Last Ball</h3>
            <div className="flex justify-between items-center">
              <div className="text-white">
                <span className="font-bold text-cricket-green">
                  Over {match.ballByBall[match.ballByBall.length - 1].over}.
                  {match.ballByBall[match.ballByBall.length - 1].ball}
                </span>
                <span className="ml-3">
                  {match.ballByBall[match.ballByBall.length - 1].batsman || 'Batsman'} 
                  to {match.ballByBall[match.ballByBall.length - 1].bowler || 'Bowler'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-cricket-green">
                  {match.ballByBall[match.ballByBall.length - 1].runs} runs
                </span>
                {match.ballByBall[match.ballByBall.length - 1].extras > 0 && (
                  <span className="ml-2 text-cricket-orange">
                    +{match.ballByBall[match.ballByBall.length - 1].extras}
                  </span>
                )}
                {match.ballByBall[match.ballByBall.length - 1].wicket && (
                  <div className="text-red-400 font-bold">WICKET!</div>
                )}
              </div>
            </div>
            {match.ballByBall[match.ballByBall.length - 1].commentary && (
              <div className="mt-2 text-gray-300 text-sm">
                {match.ballByBall[match.ballByBall.length - 1].commentary}
              </div>
            )}
          </div>
        )}

        {/* Match Result */}
        {match.status === 'completed' && match.result && (
          <div className="card p-6 text-center">
            <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Match Result</h2>
            <p className="text-xl text-cricket-green font-bold">{match.result}</p>
          </div>
        )}

        {/* Real-time indicator */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Updates automatically • Royal Falcons Scoring
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverlayMode;