import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, getDocs, collection, where, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Trophy, Wifi, WifiOff } from 'lucide-react';

const OverlayMode = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'matches', matchId),
      async (doc) => {
        if (doc.exists()) {
          const matchData = { id: doc.id, ...doc.data() };
          setMatch(matchData);
          setConnected(true);
          
          // Load players when match data is available
          if (matchData.selectedPlayers && (teamAPlayers.length === 0 || teamBPlayers.length === 0)) {
            await loadTeamPlayers(matchData);
          }
        }
      },
      (error) => {
        console.error('Error listening to match updates:', error);
        setConnected(false);
      }
    );

    return () => unsubscribe();
  }, [matchId, teamAPlayers.length, teamBPlayers.length]);

  const loadTeamPlayers = async (matchData) => {
    try {
      const selectedPlayerIds = {
        teamA: matchData.selectedPlayers?.teamA || [],
        teamB: matchData.selectedPlayers?.teamB || []
      };

      // Fetch team A players
      if (selectedPlayerIds.teamA.length > 0) {
        const teamAQuery = query(
          collection(db, 'players'),
          where('__name__', 'in', selectedPlayerIds.teamA)
        );
        const teamASnapshot = await getDocs(teamAQuery);
        setTeamAPlayers(teamASnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

      // Fetch team B players
      if (selectedPlayerIds.teamB.length > 0) {
        const teamBQuery = query(
          collection(db, 'players'),
          where('__name__', 'in', selectedPlayerIds.teamB)
        );
        const teamBSnapshot = await getDocs(teamBQuery);
        setTeamBPlayers(teamBSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

    } catch (error) {
      console.error('Error loading team players:', error);
    }
  };

  const getPlayerName = (playerId, team) => {
    if (!playerId) return 'Unknown Player';
    const players = team === 'teamA' ? teamAPlayers : teamBPlayers;
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
  };

  const getCurrentBattingTeam = () => {
    return match?.currentInnings === 1 ? 'teamA' : 'teamB';
  };

  const getCurrentBowlingTeam = () => {
    return match?.currentInnings === 1 ? 'teamB' : 'teamA';
  };

  const getCurrentBatsmen = () => {
    if (!match?.currentBatsmen) {
      return {
        striker: { name: "Select Batsman", runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0 },
        nonStriker: { name: "Select Batsman", runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0 }
      };
    }

    const currentTeam = getCurrentBattingTeam();
    const strikerStats = match.playerStats?.[currentTeam]?.[match.currentBatsmen.striker]?.batting;
    const nonStrikerStats = match.playerStats?.[currentTeam]?.[match.currentBatsmen.nonStriker]?.batting;

    return {
      striker: {
        name: getPlayerName(match.currentBatsmen.striker, currentTeam),
        runs: strikerStats?.runs || 0,
        balls: strikerStats?.balls || 0,
        fours: strikerStats?.fours || 0,
        sixes: strikerStats?.sixes || 0,
        sr: strikerStats?.balls > 0 ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(2) : '0.00'
      },
      nonStriker: {
        name: getPlayerName(match.currentBatsmen.nonStriker, currentTeam),
        runs: nonStrikerStats?.runs || 0,
        balls: nonStrikerStats?.balls || 0,
        fours: nonStrikerStats?.fours || 0,
        sixes: nonStrikerStats?.sixes || 0,
        sr: nonStrikerStats?.balls > 0 ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(2) : '0.00'
      }
    };
  };

  const getCurrentBowler = () => {
    if (!match?.currentBowler) {
      return { name: "Select Bowler", overs: "0.0", maidens: 0, runs: 0, wickets: 0, economy: "0.00" };
    }

    const bowlingTeam = getCurrentBowlingTeam();
    const bowlerStats = match.playerStats?.[bowlingTeam]?.[match.currentBowler]?.bowling;

    return {
      name: getPlayerName(match.currentBowler, bowlingTeam),
      overs: bowlerStats?.overs?.toFixed(1) || "0.0",
      maidens: bowlerStats?.maidens || 0,
      runs: bowlerStats?.runs || 0,
      wickets: bowlerStats?.wickets || 0,
      economy: bowlerStats?.balls > 0 ? (((bowlerStats.runs * 6) / bowlerStats.balls)).toFixed(2) : "0.00"
    };
  };

  const getRecentBalls = () => {
    if (!match?.ballByBall || match.ballByBall.length === 0) {
      return ['0', '0', '0', '0', '0', '0'];
    }

    // Get last 6 balls
    const recentBalls = match.ballByBall.slice(-6);
    const ballsDisplay = recentBalls.map(ball => {
      if (ball.wicket) return 'W';
      if (ball.extras > 0) return `${ball.runs}+${ball.extras}`;
      return ball.runs.toString();
    });

    // Pad with zeros if less than 6 balls
    while (ballsDisplay.length < 6) {
      ballsDisplay.unshift('0');
    }

    return ballsDisplay;
  };

  const calculateTarget = () => {
    if (match?.currentInnings === 1) return null;

    const teamAScore = match?.currentScore?.teamA?.runs || 0;
    return teamAScore + 1;
  };

  const calculateRequired = () => {
    const target = calculateTarget();
    if (!target) return null;

    const currentTeam = getCurrentBattingTeam();
    const currentScore = match?.currentScore?.[currentTeam]?.runs || 0;
    return Math.max(0, target - currentScore);
  };

  const calculateBallsLeft = () => {
    if (!match?.overs) return 0;
    
    const currentTeam = getCurrentBattingTeam();
    const ballsPlayed = match?.teamStats?.[currentTeam]?.balls || 0;
    const totalBalls = match.overs * 6;
    return Math.max(0, totalBalls - ballsPlayed);
  };

  const calculateRequiredRunRate = () => {
    const required = calculateRequired();
    const ballsLeft = calculateBallsLeft();
    
    if (!required || ballsLeft <= 0) return null;
    return ((required / ballsLeft) * 6).toFixed(2);
  };

  if (!match) {
    return null; // Don't show loading for overlay
  }

  const currentTeam = getCurrentBattingTeam();
  const battingTeam = currentTeam === 'teamA' ? match.teamAName : match.teamBName;
  const bowlingTeam = currentTeam === 'teamA' ? match.teamBName : match.teamAName;
  
  const currentScore = match.currentScore?.[currentTeam]?.runs || 0;
  const currentWickets = match.currentScore?.[currentTeam]?.wickets || 0;
  const currentOvers = match.teamStats?.[currentTeam]?.overs?.toFixed(1) || '0.0';
  const currentExtras = match.teamStats?.[currentTeam]?.extras ? 
    Object.values(match.teamStats[currentTeam].extras).reduce((a, b) => a + b, 0) : 0;
  
  const { striker, nonStriker } = getCurrentBatsmen();
  const bowler = getCurrentBowler();
  const recentBalls = getRecentBalls();
  
  const target = calculateTarget();
  const required = calculateRequired();
  const ballsLeft = calculateBallsLeft();
  const requiredRate = calculateRequiredRunRate();

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
                  {match.teamAName} vs {match.teamBName}
                </span>
              </div>
              {match.status === 'live' && (
                <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                  ● LIVE
                </div>
              )}
              <div className="text-gray-300 text-sm">
                {match.venue} • {match.overs} overs • Innings {match.currentInnings}
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
                        ${ball === '4' || ball.includes('4') ? 'bg-green-600 text-white' : 
                          ball === '6' || ball.includes('6') ? 'bg-purple-600 text-white' : 
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
              <span>CRR: {match.teamStats?.[currentTeam]?.runRate?.toFixed(2) || '0.00'}</span>
              <span>Bowling: {bowlingTeam}</span>
              <span>{match.matchType}</span>
            </div>
            
            {/* Partnership */}
            <div className="text-gray-300">
              Partnership: <span className="text-white font-bold">
                {striker.runs + nonStriker.runs} ({striker.balls + nonStriker.balls} balls)
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

          {/* Toss Banner (when toss completed but match not started) */}
          {match.status === 'toss' && match.toss?.completed && (
            <div className="mt-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg p-3 text-center">
              <div className="text-white font-bold">
                Toss: {match.toss.winner === match.teamAId ? match.teamAName : match.teamBName} won and chose to {match.toss.decision} first
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Floating Commentary (Optional) */}
      {match.ballByBall && match.ballByBall.length > 0 && (
        (() => {
          const lastBall = match.ballByBall[match.ballByBall.length - 1];
          return lastBall?.commentary && (
            <div className="fixed bottom-28 left-6 right-6 bg-black/80 backdrop-blur rounded-lg p-3 border border-gray-700">
              <div className="text-green-400 text-sm font-bold mb-1">
                {lastBall.over}.{lastBall.ball} | {lastBall.runs} runs
                {lastBall.extras > 0 && ` +${lastBall.extras} extras`}
                {lastBall.wicket && ' • WICKET'}
              </div>
              <div className="text-white text-sm">
                {lastBall.commentary}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};

export default OverlayMode;