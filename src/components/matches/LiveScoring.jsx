import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, getDocs, collection, where, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Play, 
  Target, 
  Users, 
  CircleAlert as AlertCircle,
  Crown,
  Shuffle,
  RotateCcw
} from 'lucide-react';

const LiveScoring = () => {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState(null);
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ball entry state
  const [ballData, setBallData] = useState({
    runs: 0,
    extras: 0,
    extraType: '',
    wicket: false,
    wicketType: '',
    wicketPlayer: '',
    batsmanOnStrike: '',
    bowler: '',
    commentary: ''
  });
  
  // Current match state
  const [currentBatsmen, setCurrentBatsmen] = useState({
    striker: null,
    nonStriker: null
  });
  const [currentBowler, setCurrentBowler] = useState(null);
  const [needToss, setNeedToss] = useState(false);

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  const fetchMatchData = async () => {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (!matchDoc.exists()) {
        setError('Match not found');
        return;
      }

      const matchData = { id: matchDoc.id, ...matchDoc.data() };
      setMatch(matchData);
      
      // Check authorization
      if (matchData.createdBy !== currentUser.uid) {
        setError('You are not authorized to score this match');
        return;
      }

      // Check if toss is needed
      if (!matchData.toss?.completed) {
        setNeedToss(true);
        return;
      }

      // Load team players
      await loadTeamPlayers(matchData);
      
      // Set current batsmen and bowler if available
      if (matchData.currentBatsmen) {
        setCurrentBatsmen(matchData.currentBatsmen);
      }
      if (matchData.currentBowler) {
        setCurrentBowler(matchData.currentBowler);
      }

    } catch (error) {
      console.error('Error fetching match:', error);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

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

  const getCurrentBattingTeam = () => {
    if (!match) return null;
    return match.currentInnings === 1 ? 'teamA' : 'teamB';
  };

  const getCurrentBowlingTeam = () => {
    if (!match) return null;
    return match.currentInnings === 1 ? 'teamB' : 'teamA';
  };

  const getBattingPlayers = () => {
    const currentTeam = getCurrentBattingTeam();
    return currentTeam === 'teamA' ? teamAPlayers : teamBPlayers;
  };

  const getBowlingPlayers = () => {
    const currentTeam = getCurrentBowlingTeam();
    return currentTeam === 'teamA' ? teamAPlayers : teamBPlayers;
  };

  const handleBallSubmit = async (e) => {
    e.preventDefault();
    
    if (!match || match.createdBy !== currentUser.uid) {
      setError('Not authorized to score this match');
      return;
    }

    if (!currentBatsmen.striker || !currentBowler) {
      setError('Please select batsmen and bowler before scoring');
      return;
    }

    try {
      setError('');
      
      const currentTeam = getCurrentBattingTeam();
      const bowlingTeam = getCurrentBowlingTeam();
      
      // Calculate ball number
      const currentOver = Math.floor((match.teamStats[currentTeam].balls || 0) / 6) + 1;
      const ballInOver = ((match.teamStats[currentTeam].balls || 0) % 6) + 1;
      
      const ballEntry = {
        ...ballData,
        timestamp: new Date(),
        over: currentOver,
        ball: ballInOver,
        innings: match.currentInnings,
        batsmanOnStrike: currentBatsmen.striker,
        batsmanOffStrike: currentBatsmen.nonStriker,
        bowler: currentBowler
      };

      // Calculate new scores and stats
      const updatedMatch = { ...match };
      
      // Update team stats
      const totalRuns = parseInt(ballData.runs) + parseInt(ballData.extras);
      updatedMatch.teamStats[currentTeam].runs += totalRuns;
      updatedMatch.currentScore[currentTeam].runs += totalRuns;
      
      // Update extras
      if (ballData.extras > 0) {
        const extraType = ballData.extraType || 'byes';
        updatedMatch.teamStats[currentTeam].extras[extraType] += parseInt(ballData.extras);
      }
      
      // Update boundaries
      if (ballData.runs === 4) {
        updatedMatch.teamStats[currentTeam].boundaries.fours += 1;
      } else if (ballData.runs === 6) {
        updatedMatch.teamStats[currentTeam].boundaries.sixes += 1;
      }
      
      // Update balls (only if not a wide or no-ball)
      if (!ballData.extraType || !['wide', 'no-ball'].includes(ballData.extraType)) {
        updatedMatch.teamStats[currentTeam].balls += 1;
        updatedMatch.teamStats[currentTeam].overs = Math.floor(updatedMatch.teamStats[currentTeam].balls / 6) + 
                                                   (updatedMatch.teamStats[currentTeam].balls % 6) / 10;
      }
      
      // Update wickets
      if (ballData.wicket) {
        updatedMatch.teamStats[currentTeam].wickets += 1;
        updatedMatch.currentScore[currentTeam].wickets += 1;
        
        // Add wicket details
        const wicketDetails = {
          player: ballData.wicketPlayer || currentBatsmen.striker,
          howOut: ballData.wicketType,
          bowler: currentBowler,
          runs: updatedMatch.playerStats[currentTeam][currentBatsmen.striker]?.batting?.runs || 0,
          balls: updatedMatch.playerStats[currentTeam][currentBatsmen.striker]?.batting?.balls || 0,
          over: currentOver,
          ball: ballInOver
        };
        
        updatedMatch.wickets = [...(updatedMatch.wickets || []), wicketDetails];
        
        // Mark player as out
        if (updatedMatch.playerStats[currentTeam][currentBatsmen.striker]) {
          updatedMatch.playerStats[currentTeam][currentBatsmen.striker].batting.isOut = true;
          updatedMatch.playerStats[currentTeam][currentBatsmen.striker].batting.howOut = ballData.wicketType;
        }
      }
      
      // Update player statistics
      if (updatedMatch.playerStats[currentTeam][currentBatsmen.striker]) {
        const playerStats = updatedMatch.playerStats[currentTeam][currentBatsmen.striker].batting;
        playerStats.runs += parseInt(ballData.runs);
        if (!ballData.extraType || !['wide', 'no-ball'].includes(ballData.extraType)) {
          playerStats.balls += 1;
        }
        if (ballData.runs === 4) playerStats.fours += 1;
        if (ballData.runs === 6) playerStats.sixes += 1;
      }
      
      // Update bowler statistics
      if (updatedMatch.playerStats[bowlingTeam][currentBowler]) {
        const bowlerStats = updatedMatch.playerStats[bowlingTeam][currentBowler].bowling;
        bowlerStats.runs += totalRuns;
        if (ballData.wicket) bowlerStats.wickets += 1;
        if (!ballData.extraType || !['wide', 'no-ball'].includes(ballData.extraType)) {
          bowlerStats.balls += 1;
          bowlerStats.overs = Math.floor(bowlerStats.balls / 6) + (bowlerStats.balls % 6) / 10;
        }
      }
      
      // Update run rates
      updatedMatch.teamStats[currentTeam].runRate = updatedMatch.teamStats[currentTeam].balls > 0 
        ? (updatedMatch.teamStats[currentTeam].runs * 6) / updatedMatch.teamStats[currentTeam].balls 
        : 0;

      // Update match document
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        ballByBall: arrayUnion(ballEntry),
        teamStats: updatedMatch.teamStats,
        currentScore: updatedMatch.currentScore,
        playerStats: updatedMatch.playerStats,
        wickets: updatedMatch.wickets,
        status: 'live',
        lastUpdated: new Date()
      });

      // Reset ball data
      setBallData({
        runs: 0,
        extras: 0,
        extraType: '',
        wicket: false,
        wicketType: '',
        wicketPlayer: '',
        batsmanOnStrike: currentBatsmen.striker,
        bowler: currentBowler,
        commentary: ''
      });

      // Refresh match data
      await fetchMatchData();

    } catch (error) {
      console.error('Error updating score:', error);
      setError('Failed to update score. Please try again.');
    }
  };

  const switchBatsmen = () => {
    setCurrentBatsmen({
      striker: currentBatsmen.nonStriker,
      nonStriker: currentBatsmen.striker
    });
  };

  const endMatch = async () => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'completed',
        endedAt: new Date()
      });
      navigate(`/scorecard/${matchId}`);
    } catch (error) {
      console.error('Error ending match:', error);
      setError('Failed to end match');
    }
  };

  const getPlayerName = (playerId, team = null) => {
    if (!playerId) return 'Select Player';
    
    let players = [];
    if (team === 'batting') {
      players = getBattingPlayers();
    } else if (team === 'bowling') {
      players = getBowlingPlayers();
    } else {
      players = [...teamAPlayers, ...teamBPlayers];
    }
    
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
  };

  if (loading) return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  if (needToss) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="card text-center">
          <Shuffle className="h-12 w-12 text-cricket-green mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Toss Required</h2>
          <p className="text-gray-600 mb-6">
            Please complete the toss and team setup before starting live scoring.
          </p>
          <button
            onClick={() => navigate(`/match/${matchId}/setup`)}
            className="btn-primary"
          >
            Go to Match Setup
          </button>
        </div>
      </div>
    );
  }
  if (error) return <div className="text-red-600 text-center">{error}</div>;
  if (!match) return <div className="text-center">Match not found</div>;

  const currentTeam = getCurrentBattingTeam();
  const currentTeamName = currentTeam === 'teamA' ? match.teamAName : match.teamBName;
  const battingPlayers = getBattingPlayers();
  const bowlingPlayers = getBowlingPlayers();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Match Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {match.teamAName} vs {match.teamBName} - Live Scoring
          </h1>
          <div className="flex items-center space-x-2">
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              LIVE - Innings {match.currentInnings}
            </span>
          </div>
        </div>

        {/* Current Score Display */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700">{match.teamAName}</h3>
            <div className="text-3xl font-bold text-cricket-green">
              {match.currentScore?.teamA?.runs || 0}/{match.currentScore?.teamA?.wickets || 0}
            </div>
            <div className="text-sm text-gray-600">
              {match.teamStats?.teamA?.overs?.toFixed(1) || '0.0'} overs
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700">{match.teamBName}</h3>
            <div className="text-3xl font-bold text-cricket-blue">
              {match.currentScore?.teamB?.runs || 0}/{match.currentScore?.teamB?.wickets || 0}
            </div>
            <div className="text-sm text-gray-600">
              {match.teamStats?.teamB?.overs?.toFixed(1) || '0.0'} overs
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          Currently batting: <strong>{currentTeamName}</strong>
        </div>
      </div>

      {/* Current Players Selection */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-cricket-green" />
          Current Players
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Striker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batsman on Strike
            </label>
            <select
              value={currentBatsmen.striker || ''}
              onChange={(e) => setCurrentBatsmen(prev => ({ ...prev, striker: e.target.value }))}
              className="input-field"
            >
              <option value="">Select striker</option>
              {battingPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.isCaptain && '(C)'} {player.isWicketKeeper && '(WK)'}
                </option>
              ))}
            </select>
          </div>

          {/* Non-Striker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Non-Striker
            </label>
            <select
              value={currentBatsmen.nonStriker || ''}
              onChange={(e) => setCurrentBatsmen(prev => ({ ...prev, nonStriker: e.target.value }))}
              className="input-field"
            >
              <option value="">Select non-striker</option>
              {battingPlayers.filter(p => p.id !== currentBatsmen.striker).map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.isCaptain && '(C)'} {player.isWicketKeeper && '(WK)'}
                </option>
              ))}
            </select>
          </div>

          {/* Current Bowler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Bowler
            </label>
            <select
              value={currentBowler || ''}
              onChange={(e) => setCurrentBowler(e.target.value)}
              className="input-field"
            >
              <option value="">Select bowler</option>
              {bowlingPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.isCaptain && '(C)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={switchBatsmen}
            className="btn-secondary flex items-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Switch Strike
          </button>
        </div>
      </div>

      {/* Ball Entry Form */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-cricket-green" />
          Enter Ball Details
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleBallSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Runs</label>
              <select
                value={ballData.runs}
                onChange={(e) => setBallData({ ...ballData, runs: parseInt(e.target.value) })}
                className="input-field"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Extras</label>
              <input
                type="number"
                min="0"
                max="5"
                value={ballData.extras}
                onChange={(e) => setBallData({ ...ballData, extras: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Extra Type</label>
              <select
                value={ballData.extraType}
                onChange={(e) => setBallData({ ...ballData, extraType: e.target.value })}
                className="input-field"
              >
                <option value="">None</option>
                <option value="wide">Wide</option>
                <option value="noBalls">No Ball</option>
                <option value="byes">Bye</option>
                <option value="legByes">Leg Bye</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={ballData.wicket}
                  onChange={(e) => setBallData({ ...ballData, wicket: e.target.checked })}
                  className="h-4 w-4 text-cricket-green focus:ring-cricket-green border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Wicket</span>
              </label>
            </div>
          </div>

          {ballData.wicket && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wicket Type</label>
                <select
                  value={ballData.wicketType}
                  onChange={(e) => setBallData({ ...ballData, wicketType: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select type</option>
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="stumped">Stumped</option>
                  <option value="run-out">Run Out</option>
                  <option value="hit-wicket">Hit Wicket</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Player Out</label>
                <select
                  value={ballData.wicketPlayer}
                  onChange={(e) => setBallData({ ...ballData, wicketPlayer: e.target.value })}
                  className="input-field"
                >
                  <option value="">Auto (striker)</option>
                  <option value={currentBatsmen.striker}>
                    {getPlayerName(currentBatsmen.striker)} (striker)
                  </option>
                  <option value={currentBatsmen.nonStriker}>
                    {getPlayerName(currentBatsmen.nonStriker)} (non-striker)
                  </option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Commentary</label>
            <textarea
              value={ballData.commentary}
              onChange={(e) => setBallData({ ...ballData, commentary: e.target.value })}
              className="input-field"
              rows="2"
              placeholder="Ball commentary (optional)"
            />
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={endMatch}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              End Match
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              Add Ball
            </button>
          </div>
        </form>
      </div>

      {/* Current Match Stats */}
      {currentBatsmen.striker && currentBowler && (
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">Current Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Batsmen</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{getPlayerName(currentBatsmen.striker)} *</span>
                  <span>
                    {match.playerStats?.[currentTeam]?.[currentBatsmen.striker]?.batting?.runs || 0} 
                    ({match.playerStats?.[currentTeam]?.[currentBatsmen.striker]?.batting?.balls || 0})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{getPlayerName(currentBatsmen.nonStriker)}</span>
                  <span>
                    {match.playerStats?.[currentTeam]?.[currentBatsmen.nonStriker]?.batting?.runs || 0} 
                    ({match.playerStats?.[currentTeam]?.[currentBatsmen.nonStriker]?.batting?.balls || 0})
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Bowler</h4>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>{getPlayerName(currentBowler)}</span>
                  <span>
                    {match.playerStats?.[getCurrentBowlingTeam()]?.[currentBowler]?.bowling?.overs?.toFixed(1) || '0.0'}-
                    {match.playerStats?.[getCurrentBowlingTeam()]?.[currentBowler]?.bowling?.runs || 0}-
                    {match.playerStats?.[getCurrentBowlingTeam()]?.[currentBowler]?.bowling?.wickets || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Balls */}
      {match.ballByBall && match.ballByBall.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Recent Balls</h3>
          <div className="space-y-2">
            {match.ballByBall.slice(-10).reverse().map((ball, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">Over {ball.over}.{ball.ball}</span>
                  <span className="ml-2 text-gray-600">{getPlayerName(ball.batsmanOnStrike)}</span>
                  <span className="ml-2 text-gray-600">to {getPlayerName(ball.bowler)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-cricket-green">{ball.runs} runs</span>
                  {ball.extras > 0 && <span className="ml-2 text-cricket-orange">+{ball.extras} extras</span>}
                  {ball.wicket && <span className="ml-2 text-red-600">WICKET</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoring;