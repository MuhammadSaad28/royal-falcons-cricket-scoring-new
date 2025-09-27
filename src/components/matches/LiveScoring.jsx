import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Play, Pause, RotateCcw, CircleAlert as AlertCircle, Target, Users } from 'lucide-react';

const LiveScoring = () => {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ballData, setBallData] = useState({
    runs: 0,
    extras: 0,
    extraType: '',
    wicket: false,
    wicketType: '',
    batsman: '',
    bowler: '',
    commentary: ''
  });
  const [currentInnings, setCurrentInnings] = useState(1);

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (matchDoc.exists()) {
        const matchData = { id: matchDoc.id, ...matchDoc.data() };
        setMatch(matchData);
        
        // Check if user is authorized to score this match
        if (matchData.createdBy !== currentUser.uid) {
          setError('You are not authorized to score this match');
        }
      } else {
        setError('Match not found');
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const handleBallSubmit = async (e) => {
    e.preventDefault();
    
    if (!match || match.createdBy !== currentUser.uid) {
      setError('Not authorized to score this match');
      return;
    }

    try {
      setError('');
      
      const ballEntry = {
        ...ballData,
        timestamp: new Date(),
        over: Math.floor(match.ballByBall?.length / 6) + 1,
        ball: (match.ballByBall?.length % 6) + 1,
        innings: currentInnings
      };

      // Calculate updated scores
      const currentTeam = currentInnings === 1 ? 'teamA' : 'teamB';
      const updatedStats = { ...match.stats };
      const updatedCurrentScore = { ...match.currentScore };

      // Update runs
      if (ballData.runs > 0) {
        updatedStats[currentTeam].runs += parseInt(ballData.runs);
        updatedCurrentScore[currentTeam] += parseInt(ballData.runs);
      }

      // Update extras
      if (ballData.extras > 0) {
        updatedStats[currentTeam].extras = (updatedStats[currentTeam].extras || 0) + parseInt(ballData.extras);
        updatedCurrentScore[currentTeam] += parseInt(ballData.extras);
      }

      // Update wickets
      if (ballData.wicket) {
        updatedStats[currentTeam].wickets += 1;
        updatedCurrentScore[`wickets${currentTeam.slice(-1)}`] += 1;
      }

      // Update overs (only if not a wide or no-ball)
      if (!ballData.extraType || !['wide', 'no-ball'].includes(ballData.extraType)) {
        const totalBalls = (match.ballByBall?.length || 0) + 1;
        const overs = Math.floor(totalBalls / 6);
        const balls = totalBalls % 6;
        updatedStats[currentTeam].overs = `${overs}.${balls}`;
        updatedCurrentScore[`overs${currentTeam.slice(-1)}`] = overs + (balls / 10);
      }

      // Update match document
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        ballByBall: arrayUnion(ballEntry),
        stats: updatedStats,
        currentScore: updatedCurrentScore,
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
        batsman: '',
        bowler: '',
        commentary: ''
      });

      // Refresh match data
      fetchMatch();

    } catch (error) {
      console.error('Error updating score:', error);
      setError('Failed to update score. Please try again.');
    }
  };

  const toggleInnings = () => {
    setCurrentInnings(currentInnings === 1 ? 2 : 1);
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

  if (loading) return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  if (error) return <div className="text-red-600 text-center">{error}</div>;
  if (!match) return <div className="text-center">Match not found</div>;

  const currentTeam = currentInnings === 1 ? 'teamA' : 'teamB';
  const currentTeamName = currentInnings === 1 ? match.teamA : match.teamB;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Match Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {match.teamA} vs {match.teamB} - Live Scoring
          </h1>
          <div className="flex items-center space-x-2">
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              LIVE
            </span>
            <button
              onClick={toggleInnings}
              className="btn-secondary"
            >
              Innings {currentInnings}
            </button>
          </div>
        </div>

        {/* Current Score Display */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700">{match.teamA}</h3>
            <div className="text-3xl font-bold text-cricket-green">
              {match.currentScore?.teamA || 0}/{match.currentScore?.wicketsA || 0}
            </div>
            <div className="text-sm text-gray-600">
              {match.stats?.teamA?.overs || '0.0'} overs
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700">{match.teamB}</h3>
            <div className="text-3xl font-bold text-cricket-blue">
              {match.currentScore?.teamB || 0}/{match.currentScore?.wicketsB || 0}
            </div>
            <div className="text-sm text-gray-600">
              {match.stats?.teamB?.overs || '0.0'} overs
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          Currently batting: <strong>{currentTeamName}</strong>
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
                <option value="no-ball">No Ball</option>
                <option value="bye">Bye</option>
                <option value="leg-bye">Leg Bye</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wicket Type</label>
              <select
                value={ballData.wicketType}
                onChange={(e) => setBallData({ ...ballData, wicketType: e.target.value })}
                className="input-field max-w-xs"
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Batsman</label>
              <input
                type="text"
                value={ballData.batsman}
                onChange={(e) => setBallData({ ...ballData, batsman: e.target.value })}
                className="input-field"
                placeholder="Batsman name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bowler</label>
              <input
                type="text"
                value={ballData.bowler}
                onChange={(e) => setBallData({ ...ballData, bowler: e.target.value })}
                className="input-field"
                placeholder="Bowler name"
              />
            </div>
          </div>

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

      {/* Recent Balls */}
      {match.ballByBall && match.ballByBall.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Recent Balls</h3>
          <div className="space-y-2">
            {match.ballByBall.slice(-10).reverse().map((ball, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">Over {ball.over}.{ball.ball}</span>
                  {ball.batsman && <span className="ml-2 text-gray-600">{ball.batsman}</span>}
                  {ball.bowler && <span className="ml-2 text-gray-600">to {ball.bowler}</span>}
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