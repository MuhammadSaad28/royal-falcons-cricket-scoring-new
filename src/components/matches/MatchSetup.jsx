import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, getDocs, collection, where, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, 
  Users, 
  ArrowRight, 
  Shuffle, 
  CircleAlert as AlertCircle,
  Crown,
  Target,
  Clock,
  MapPin
} from 'lucide-react';

const MatchSetup = () => {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState(null);
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Team Selection, 2: Toss, 3: Final Setup
  
  // Team selection state
  const [selectedTeamA, setSelectedTeamA] = useState([]);
  const [selectedTeamB, setSelectedTeamB] = useState([]);
  
  // Toss state
  const [tossData, setTossData] = useState({
    winner: '',
    decision: 'bat',
    completed: false
  });
  
  // Final setup state
  const [finalSetup, setFinalSetup] = useState({
    battingFirst: '',
    bowlingFirst: '',
    ready: false
  });

  useEffect(() => {
    fetchMatchAndPlayers();
  }, [matchId]);

  const fetchMatchAndPlayers = async () => {
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
        setError('You are not authorized to set up this match');
        return;
      }

      // Check if already set up
      if (matchData.status === 'live' || matchData.toss?.completed) {
        navigate(`/live-scoring/${matchId}`);
        return;
      }

      console.log('Match data:', matchData);

      // Fetch players for both teams
      await Promise.all([
        fetchTeamPlayers(matchData.teamAId, 'A'),
        fetchTeamPlayers(matchData.teamBId, 'B')
      ]);

    } catch (error) {
      console.error('Error fetching match:', error);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async (teamId, team) => {
    try {
      // Get team data first
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      console.log(`Team ${team} data:`, teamDoc.data());
      if (!teamDoc.exists()) return;

      const teamData = teamDoc.data();

      const playerIds = teamData.playerIds || [];

       if (playerIds.length === 0) {
      console.log(`No players found for Team ${team}`);
      if (team === 'A') {
        setTeamAPlayers([]);
      } else {
        setTeamBPlayers([]);
      }
      return;
    }
      
     const playersQuery = query(
      collection(db, 'players'),
      where('__name__', 'in', playerIds)
    );

    const playersSnapshot = await getDocs(playersQuery);
    const players = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Team ${team} players:`, players);

    if (team === 'A') {
      setTeamAPlayers(players);
    } else {
      setTeamBPlayers(players);
    }
    } catch (error) {
      console.error(`Error fetching team ${team} players:`, error);
    }
  };

  const handlePlayerSelection = (playerId, team, selected) => {
    const setSelected = team === 'A' ? setSelectedTeamA : setSelectedTeamB;
    const currentSelected = team === 'A' ? selectedTeamA : selectedTeamB;
    
    if (selected && currentSelected.length >= 11) {
      setError('Maximum 11 players can be selected per team');
      return;
    }
    
    setSelected(prev => 
      selected 
        ? [...prev, playerId]
        : prev.filter(id => id !== playerId)
    );
  };

  const conductToss = () => {
    if (!tossData.winner) {
      setError('Please select toss winner');
      return;
    }
    
    setTossData(prev => ({ ...prev, completed: true }));
    setStep(3);
    
    // Set batting/bowling teams based on toss
    const battingTeam = tossData.decision === 'bat' ? tossData.winner : 
                        (tossData.winner === match.teamAId ? match.teamBId : match.teamAId);
    const bowlingTeam = battingTeam === match.teamAId ? match.teamBId : match.teamAId;
    
    setFinalSetup({
      battingFirst: battingTeam,
      bowlingFirst: bowlingTeam,
      ready: true
    });
  };

  const startMatch = async () => {
    try {
      setError('');
      
      if (selectedTeamA.length < 2 || selectedTeamB.length < 2) {
        setError('Each team must have at least 2 players selected');
        return;
      }

      // Initialize player statistics for this match
      const playerStats = {
        teamA: {},
        teamB: {}
      };

      // Create batting stats for team A players
      selectedTeamA.forEach(playerId => {
        playerStats.teamA[playerId] = {
          batting: {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            howOut: null,
            position: null
          },
          bowling: {
            overs: 0,
            runs: 0,
            wickets: 0,
            maidens: 0,
            balls: 0
          },
          fielding: {
            catches: 0,
            stumpings: 0,
            runOuts: 0
          }
        };
      });

      // Create batting stats for team B players
      selectedTeamB.forEach(playerId => {
        playerStats.teamB[playerId] = {
          batting: {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            howOut: null,
            position: null
          },
          bowling: {
            overs: 0,
            runs: 0,
            wickets: 0,
            maidens: 0,
            balls: 0
          },
          fielding: {
            catches: 0,
            stumpings: 0,
            runOuts: 0
          }
        };
      });

      // Update match document
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'toss',
        toss: tossData,
        selectedPlayers: {
          teamA: selectedTeamA,
          teamB: selectedTeamB
        },
        playerStats,
        battingFirst: finalSetup.battingFirst,
        bowlingFirst: finalSetup.bowlingFirst,
        lastUpdated: new Date()
      });

      navigate(`/live-scoring/${matchId}`);
      
    } catch (error) {
      console.error('Error starting match:', error);
      setError('Failed to start match. Please try again.');
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  if (error) return <div className="text-red-600 text-center">{error}</div>;
  if (!match) return <div className="text-center">Match not found</div>;

  const getPlayerName = (playerId, team) => {
    const players = team === 'A' ? teamAPlayers : teamBPlayers;
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown';
  };

  const getTeamName = (teamId) => {
    return teamId === match.teamAId ? match.teamAName : match.teamBName;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Match Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trophy className="h-6 w-6 text-cricket-green mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">
              Match Setup: {match.teamAName} vs {match.teamBName}
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{match.venue}</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>{match.overs} overs</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-cricket-green' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 1 ? 'bg-cricket-green text-white' : 'bg-gray-200'
              }`}>1</div>
              <span className="ml-2">Select Teams</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center ${step >= 2 ? 'text-cricket-green' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 2 ? 'bg-cricket-green text-white' : 'bg-gray-200'
              }`}>2</div>
              <span className="ml-2">Toss</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center ${step >= 3 ? 'text-cricket-green' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 3 ? 'bg-cricket-green text-white' : 'bg-gray-200'
              }`}>3</div>
              <span className="ml-2">Start Match</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Step 1: Team Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Team A Selection */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-cricket-green" />
              {match.teamAName} Playing XI
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Selected: {selectedTeamA.length}/11 players
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teamAPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-gray-600 flex items-center space-x-2">
                      <span>{player.role}</span>
                      {player.isCaptain && <Crown className="h-3 w-3 text-yellow-600" />}
                      {player.isWicketKeeper && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">WK</span>}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTeamA.includes(player.id)}
                    onChange={(e) => handlePlayerSelection(player.id, 'A', e.target.checked)}
                    className="h-4 w-4 text-cricket-green border-gray-300 rounded focus:ring-cricket-green"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Team B Selection */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-cricket-blue" />
              {match.teamBName} Playing XI
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Selected: {selectedTeamB.length}/11 players
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teamBPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-gray-600 flex items-center space-x-2">
                      <span>{player.role}</span>
                      {player.isCaptain && <Crown className="h-3 w-3 text-yellow-600" />}
                      {player.isWicketKeeper && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">WK</span>}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTeamB.includes(player.id)}
                    onChange={(e) => handlePlayerSelection(player.id, 'B', e.target.checked)}
                    className="h-4 w-4 text-cricket-blue border-gray-300 rounded focus:ring-cricket-blue"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Toss */}
      {step === 2 && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Shuffle className="h-5 w-5 mr-2 text-cricket-green" />
            Conduct Toss
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Toss Winner
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTossData(prev => ({ ...prev, winner: match.teamAId }))}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    tossData.winner === match.teamAId 
                      ? 'border-cricket-green bg-cricket-green/10 text-cricket-green' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-bold">{match.teamAName}</div>
                  <div className="text-sm text-gray-600">won the toss</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setTossData(prev => ({ ...prev, winner: match.teamBId }))}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    tossData.winner === match.teamBId 
                      ? 'border-cricket-blue bg-cricket-blue/10 text-cricket-blue' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-bold">{match.teamBName}</div>
                  <div className="text-sm text-gray-600">won the toss</div>
                </button>
              </div>
            </div>
            
            {tossData.winner && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {getTeamName(tossData.winner)} chose to:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTossData(prev => ({ ...prev, decision: 'bat' }))}
                    className={`p-4 rounded-lg border-2 transition-colors flex items-center justify-center ${
                      tossData.decision === 'bat' 
                        ? 'border-cricket-green bg-cricket-green/10 text-cricket-green' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Target className="h-5 w-5 mr-2" />
                    <span>Bat First</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setTossData(prev => ({ ...prev, decision: 'bowl' }))}
                    className={`p-4 rounded-lg border-2 transition-colors flex items-center justify-center ${
                      tossData.decision === 'bowl' 
                        ? 'border-cricket-green bg-cricket-green/10 text-cricket-green' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Target className="h-5 w-5 mr-2" />
                    <span>Bowl First</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Final Setup */}
      {step === 3 && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-6">Match Summary</h2>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-cricket-green mb-2">Batting First</h3>
                <div className="text-lg font-medium">{getTeamName(finalSetup.battingFirst)}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Selected Players: {finalSetup.battingFirst === match.teamAId ? selectedTeamA.length : selectedTeamB.length}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-cricket-blue mb-2">Bowling First</h3>
                <div className="text-lg font-medium">{getTeamName(finalSetup.bowlingFirst)}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Selected Players: {finalSetup.bowlingFirst === match.teamAId ? selectedTeamA.length : selectedTeamB.length}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-700">
                <strong>Toss:</strong> {getTeamName(tossData.winner)} won the toss and chose to {tossData.decision} first
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        <div className="space-x-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={selectedTeamA.length < 2 || selectedTeamB.length < 2}
              className="btn-primary px-6 disabled:opacity-50"
            >
              Continue to Toss
            </button>
          )}
          
          {step === 2 && (
            <button
              onClick={conductToss}
              disabled={!tossData.winner}
              className="btn-primary px-6 disabled:opacity-50"
            >
              Conduct Toss
            </button>
          )}
          
          {step === 3 && (
            <button
              onClick={startMatch}
              className="bg-cricket-green hover:bg-cricket-green/90 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Start Match
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchSetup;