import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, where, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Trophy, MapPin, Calendar, Users, Target, CreditCard as Edit3, ExternalLink, Crown } from 'lucide-react';
import Loading from '../common/Loading';

const Scorecard = () => {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState(null);
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scorecard');

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (matchDoc.exists()) {
        const matchData = { id: matchDoc.id, ...matchDoc.data() };
        setMatch(matchData);
        
        // Fetch team players if they exist
        if (matchData.selectedPlayers) {
          await fetchTeamPlayers(matchData);
        }
      }
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async (matchData) => {
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

  const formatMatchTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'PPp');
  };

  const getStatusBadge = (status) => {
    const colors = {
      live: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
      toss: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const canUserScore = () => {
    return currentUser && match && match.createdBy === currentUser.uid;
  };

  const getPlayerName = (playerId, team) => {
    if (!playerId) return 'Unknown Player';
    const players = team === 'teamA' ? teamAPlayers : teamBPlayers;
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
  };

  const getBattingStats = (team) => {
    const players = team === 'teamA' ? teamAPlayers : teamBPlayers;
    const playerStats = match?.playerStats?.[team] || {};
    
    return players
      .map(player => ({
        ...player,
        stats: playerStats[player.id]?.batting || {
          runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, howOut: null
        }
      }))
      .filter(player => player.stats.balls > 0 || player.stats.isOut)
      .sort((a, b) => {
        // Sort by batting order (you might want to add batting position to stats)
        if (a.stats.isOut && !b.stats.isOut) return -1;
        if (!a.stats.isOut && b.stats.isOut) return 1;
        return b.stats.runs - a.stats.runs;
      });
  };

  const getBowlingStats = (team) => {
    const players = team === 'teamA' ? teamAPlayers : teamBPlayers;
    const playerStats = match?.playerStats?.[team] || {};
    
    return players
      .map(player => ({
        ...player,
        stats: playerStats[player.id]?.bowling || {
          overs: 0, runs: 0, wickets: 0, maidens: 0, balls: 0
        }
      }))
      .filter(player => player.stats.balls > 0)
      .sort((a, b) => b.stats.wickets - a.stats.wickets || a.stats.runs - b.stats.runs);
  };

  const calculateStrikeRate = (runs, balls) => {
    return balls > 0 ? ((runs / balls) * 100).toFixed(2) : '0.00';
  };

  const calculateEconomyRate = (runs, balls) => {
    return balls > 0 ? ((runs * 6) / balls).toFixed(2) : '0.00';
  };

  if (loading) return <Loading text="Loading scorecard..." />;
  if (!match) return <div className="text-center py-8">Match not found</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Match Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-cricket-green" />
            <h1 className="text-2xl font-bold text-gray-900">
              {match.teamAName} vs {match.teamBName}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(match.status)}`}>
              {match.status?.toUpperCase()}
            </span>
            {canUserScore() && match.status !== 'completed' && (
              <Link
                to={match.status === 'upcoming' ? `/match/${matchId}/setup` : `/live-scoring/${matchId}`}
                className="btn-primary flex items-center"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {match.status === 'upcoming' ? 'Setup' : 'Score'}
              </Link>
            )}
            <Link
              to={`/overlay/${matchId}`}
              className="btn-secondary flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              OBS
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {match.venue}
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatMatchTime(match.scheduledTime)}
          </div>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-1" />
            {match.overs} overs • {match.matchType}
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Playing XI selected
          </div>
        </div>

        {/* Toss Information */}
        {match.toss?.completed && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Toss:</strong> {
                match.toss.winner === match.teamAId ? match.teamAName : match.teamBName
              } won the toss and chose to {match.toss.decision} first
            </p>
          </div>
        )}
      </div>

      {/* Current Score */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4">Match Score</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-cricket-green bg-opacity-10 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2">{match.teamAName}</h3>
            <div className="text-4xl font-bold text-cricket-green">
              {match.currentScore?.teamA?.runs || 0}
              <span className="text-2xl">/{match.currentScore?.teamA?.wickets || 0}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {match.teamStats?.teamA?.overs?.toFixed(1) || '0.0'} overs
            </div>
            {match.teamStats?.teamA?.extras && Object.values(match.teamStats.teamA.extras).some(v => v > 0) && (
              <div className="text-sm text-gray-600">
                Extras: {Object.values(match.teamStats.teamA.extras).reduce((a, b) => a + b, 0)}
              </div>
            )}
            <div className="text-sm text-gray-600">
              Run Rate: {match.teamStats?.teamA?.runRate?.toFixed(2) || '0.00'}
            </div>
          </div>

          <div className="text-center p-4 bg-cricket-blue bg-opacity-10 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2">{match.teamBName}</h3>
            <div className="text-4xl font-bold text-cricket-blue">
              {match.currentScore?.teamB?.runs || 0}
              <span className="text-2xl">/{match.currentScore?.teamB?.wickets || 0}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {match.teamStats?.teamB?.overs?.toFixed(1) || '0.0'} overs
            </div>
            {match.teamStats?.teamB?.extras && Object.values(match.teamStats.teamB.extras).some(v => v > 0) && (
              <div className="text-sm text-gray-600">
                Extras: {Object.values(match.teamStats.teamB.extras).reduce((a, b) => a + b, 0)}
              </div>
            )}
            <div className="text-sm text-gray-600">
              Run Rate: {match.teamStats?.teamB?.runRate?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {match.status === 'completed' && match.result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <Trophy className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-green-800">{match.result}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'scorecard', label: 'Scorecard' },
              { id: 'commentary', label: 'Commentary' },
              { id: 'statistics', label: 'Statistics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-cricket-green text-cricket-green'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'scorecard' && (
          <div className="space-y-8">
            {/* Team A Batting */}
            <div>
              <h3 className="text-lg font-bold mb-4">{match.teamAName} Batting</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batsman
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dismissal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        R
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        B
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        4s
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        6s
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getBattingStats('teamA').map((player, index) => (
                      <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="font-medium text-gray-900">{player.name}</div>
                            {player.isCaptain && <Crown className="h-3 w-3 text-yellow-600 ml-1" />}
                            {player.isWicketKeeper && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">†</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.stats.isOut ? player.stats.howOut : 'not out'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {player.stats.runs}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.stats.balls}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.stats.fours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.stats.sixes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateStrikeRate(player.stats.runs, player.stats.balls)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Team A Bowling figures */}
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-3">{match.teamBName} Bowling</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bowler
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          O
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          M
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          R
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          W
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Econ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getBowlingStats('teamB').map((player, index) => (
                        <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="font-medium text-gray-900">{player.name}</div>
                              {player.isCaptain && <Crown className="h-3 w-3 text-yellow-600 ml-1" />}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.overs.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.maidens}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.runs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player.stats.wickets}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateEconomyRate(player.stats.runs, player.stats.balls)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Team B Batting (if second innings started) */}
            {match.currentInnings > 1 && (
              <div>
                <h3 className="text-lg font-bold mb-4">{match.teamBName} Batting</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batsman
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dismissal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          R
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          B
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          4s
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          6s
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SR
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getBattingStats('teamB').map((player, index) => (
                        <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="font-medium text-gray-900">{player.name}</div>
                              {player.isCaptain && <Crown className="h-3 w-3 text-yellow-600 ml-1" />}
                              {player.isWicketKeeper && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">†</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.isOut ? player.stats.howOut : 'not out'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player.stats.runs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.balls}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.fours}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.stats.sixes}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateStrikeRate(player.stats.runs, player.stats.balls)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Team B Bowling figures */}
                <div className="mt-6">
                  <h4 className="text-md font-semibold mb-3">{match.teamAName} Bowling</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bowler
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            O
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            M
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            R
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            W
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Econ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getBowlingStats('teamA').map((player, index) => (
                          <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="font-medium text-gray-900">{player.name}</div>
                                {player.isCaptain && <Crown className="h-3 w-3 text-yellow-600 ml-1" />}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {player.stats.overs.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {player.stats.maidens}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {player.stats.runs}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {player.stats.wickets}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {calculateEconomyRate(player.stats.runs, player.stats.balls)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'commentary' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Ball-by-Ball Commentary</h3>
            {match.ballByBall && match.ballByBall.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {match.ballByBall.slice().reverse().map((ball, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-cricket-green">
                          {ball.over}.{ball.ball}
                        </span>
                        <span className="ml-2 text-gray-700">
                          {getPlayerName(ball.batsmanOnStrike, ball.innings === 1 ? 'teamA' : 'teamB')}
                        </span>
                        <span className="ml-2 text-gray-600">
                          to {getPlayerName(ball.bowler, ball.innings === 1 ? 'teamB' : 'teamA')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{ball.runs} runs</span>
                        {ball.extras > 0 && (
                          <span className="ml-2 text-cricket-orange">+{ball.extras}</span>
                        )}
                        {ball.wicket && (
                          <span className="ml-2 text-red-600 font-medium">WICKET</span>
                        )}
                      </div>
                    </div>
                    {ball.commentary && (
                      <p className="mt-2 text-sm text-gray-600">{ball.commentary}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No commentary available yet.</p>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Match Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Match Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Balls Bowled:</span>
                    <span>{match.ballByBall?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Boundaries:</span>
                    <span>
                      {(match.teamStats?.teamA?.boundaries?.fours || 0) + 
                       (match.teamStats?.teamA?.boundaries?.sixes || 0) +
                       (match.teamStats?.teamB?.boundaries?.fours || 0) + 
                       (match.teamStats?.teamB?.boundaries?.sixes || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wickets:</span>
                    <span>
                      {(match.currentScore?.teamA?.wickets || 0) + (match.currentScore?.teamB?.wickets || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Extras:</span>
                    <span>
                      {match.teamStats?.teamA?.extras ? Object.values(match.teamStats.teamA.extras).reduce((a, b) => a + b, 0) : 0}
                      {' + '}
                      {match.teamStats?.teamB?.extras ? Object.values(match.teamStats.teamB.extras).reduce((a, b) => a + b, 0) : 0}
                      {' = '}
                      {(match.teamStats?.teamA?.extras ? Object.values(match.teamStats.teamA.extras).reduce((a, b) => a + b, 0) : 0) +
                       (match.teamStats?.teamB?.extras ? Object.values(match.teamStats.teamB.extras).reduce((a, b) => a + b, 0) : 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">Partnership & Records</h4>
                <div className="space-y-2 text-sm">
                  {match.wickets && match.wickets.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-600 mb-2">Fall of Wickets</h5>
                      <div className="space-y-1">
                        {match.wickets.slice(0, 5).map((wicket, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span>{getPlayerName(wicket.player)} ({wicket.howOut})</span>
                            <span>{wicket.runs}/{index + 1} ({wicket.over}.{wicket.ball})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {match.teamStats?.teamA && match.teamStats?.teamB && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-600 mb-2">Match Progress</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Highest Partnership:</span>
                          <span>Coming Soon</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Best Bowling:</span>
                          <span>
                            {(() => {
                              const allBowlers = [
                                ...getBowlingStats('teamA'),
                                ...getBowlingStats('teamB')
                              ].filter(p => p.stats.wickets > 0);
                              
                              if (allBowlers.length === 0) return 'N/A';
                              
                              const bestBowler = allBowlers.reduce((best, current) => 
                                current.stats.wickets > best.stats.wickets ? current : best
                              );
                              
                              return `${bestBowler.name} ${bestBowler.stats.wickets}/${bestBowler.stats.runs}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Highest Score:</span>
                          <span>
                            {(() => {
                              const allBatsmen = [
                                ...getBattingStats('teamA'),
                                ...getBattingStats('teamB')
                              ];
                              
                              if (allBatsmen.length === 0) return 'N/A';
                              
                              const highestScorer = allBatsmen.reduce((highest, current) => 
                                current.stats.runs > highest.stats.runs ? current : highest
                              );
                              
                              return `${highestScorer.name} ${highestScorer.stats.runs}${highestScorer.stats.isOut ? '' : '*'}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Extras Breakdown */}
            {(match.teamStats?.teamA?.extras || match.teamStats?.teamB?.extras) && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">Extras Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-cricket-green mb-2">{match.teamAName}</h5>
                    <div className="space-y-1 text-sm">
                      {match.teamStats?.teamA?.extras && Object.entries(match.teamStats.teamA.extras).map(([type, count]) => (
                        count > 0 && (
                          <div key={type} className="flex justify-between">
                            <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')}:</span>
                            <span>{count}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-cricket-blue mb-2">{match.teamBName}</h5>
                    <div className="space-y-1 text-sm">
                      {match.teamStats?.teamB?.extras && Object.entries(match.teamStats.teamB.extras).map(([type, count]) => (
                        count > 0 && (
                          <div key={type} className="flex justify-between">
                            <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')}:</span>
                            <span>{count}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scorecard;