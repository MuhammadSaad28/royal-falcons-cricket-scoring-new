import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Trophy, MapPin, Calendar, Users, Target, CreditCard as Edit3, ExternalLink } from 'lucide-react';
import Loading from '../common/Loading';

const Scorecard = () => {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scorecard');

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (matchDoc.exists()) {
        setMatch({ id: matchDoc.id, ...matchDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
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
      upcoming: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const canUserScore = () => {
    return currentUser && match && match.createdBy === currentUser.uid;
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
              {match.teamA} vs {match.teamB}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(match.status)}`}>
              {match.status?.toUpperCase()}
            </span>
            {canUserScore() && match.status !== 'completed' && (
              <Link
                to={`/live-scoring/${matchId}`}
                className="btn-primary flex items-center"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Score
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
            {match.overs} overs
          </div>
        </div>

        {match.tossWinner && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Toss:</strong> {match.tossWinner} won the toss and chose to {match.tossDecision}
            </p>
          </div>
        )}
      </div>

      {/* Current Score */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4">Current Score</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-cricket-green bg-opacity-10 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2">{match.teamA}</h3>
            <div className="text-4xl font-bold text-cricket-green">
              {match.currentScore?.teamA || 0}
              <span className="text-2xl">/{match.currentScore?.wicketsA || 0}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {match.stats?.teamA?.overs || '0.0'} overs
            </div>
            {match.stats?.teamA?.extras > 0 && (
              <div className="text-sm text-gray-600">
                Extras: {match.stats.teamA.extras}
              </div>
            )}
          </div>

          <div className="text-center p-4 bg-cricket-blue bg-opacity-10 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2">{match.teamB}</h3>
            <div className="text-4xl font-bold text-cricket-blue">
              {match.currentScore?.teamB || 0}
              <span className="text-2xl">/{match.currentScore?.wicketsB || 0}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {match.stats?.teamB?.overs || '0.0'} overs
            </div>
            {match.stats?.teamB?.extras > 0 && (
              <div className="text-sm text-gray-600">
                Extras: {match.stats.teamB.extras}
              </div>
            )}
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
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Match Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">{match.teamA} Innings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Runs:</span>
                    <span className="font-medium">{match.currentScore?.teamA || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wickets:</span>
                    <span className="font-medium">{match.currentScore?.wicketsA || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overs:</span>
                    <span className="font-medium">{match.stats?.teamA?.overs || '0.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extras:</span>
                    <span className="font-medium">{match.stats?.teamA?.extras || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">{match.teamB} Innings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Runs:</span>
                    <span className="font-medium">{match.currentScore?.teamB || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wickets:</span>
                    <span className="font-medium">{match.currentScore?.wicketsB || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overs:</span>
                    <span className="font-medium">{match.stats?.teamB?.overs || '0.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extras:</span>
                    <span className="font-medium">{match.stats?.teamB?.extras || 0}</span>
                  </div>
                </div>
              </div>
            </div>
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
                        {ball.batsman && (
                          <span className="ml-2 text-gray-700">{ball.batsman}</span>
                        )}
                        {ball.bowler && (
                          <span className="ml-2 text-gray-600">to {ball.bowler}</span>
                        )}
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
                <h4 className="font-medium text-gray-700 mb-3">Partnership & Batting</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Balls Bowled:</span>
                    <span>{match.ballByBall?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Boundaries (4s + 6s):</span>
                    <span>
                      {match.ballByBall?.filter(ball => ball.runs === 4 || ball.runs === 6).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dot Balls:</span>
                    <span>
                      {match.ballByBall?.filter(ball => ball.runs === 0 && !ball.extras).length || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">Bowling Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Wickets:</span>
                    <span>
                      {(match.currentScore?.wicketsA || 0) + (match.currentScore?.wicketsB || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Extras:</span>
                    <span>
                      {(match.stats?.teamA?.extras || 0) + (match.stats?.teamB?.extras || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Run Rate:</span>
                    <span>
                      {match.ballByBall?.length > 0 
                        ? (((match.currentScore?.teamA || 0) + (match.currentScore?.teamB || 0)) / (match.ballByBall.length / 6)).toFixed(2)
                        : '0.00'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scorecard;