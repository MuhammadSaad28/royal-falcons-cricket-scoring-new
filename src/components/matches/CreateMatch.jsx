import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MapPin, Users, Clock, Trophy, CircleAlert as AlertCircle, Plus } from 'lucide-react';

const CreateMatch = () => {
  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    venue: '',
    overs: 20,
    scheduledTime: '',
    matchType: 'T20'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const matchTypes = [
    { value: 'T20', label: 'T20 (20 overs)', overs: 20 },
    { value: 'ODI', label: 'ODI (50 overs)', overs: 50 },
    { value: 'T10', label: 'T10 (10 overs)', overs: 10 },
    { value: 'T5', label: 'T5 (5 overs)', overs: 5 },
    { value: 'Custom', label: 'Custom', overs: 20 }
  ];

  // Fetch user's teams
  useEffect(() => {
    const fetchUserTeams = async () => {
      if (!currentUser) return;
      
      try {
        setLoadingTeams(true);
        const teamsQuery = query(
          collection(db, 'teams'),
          where('createdBy', '==', currentUser.uid)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const userTeams = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeams(userTeams);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError('Failed to load teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchUserTeams();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-update overs when match type changes
      if (name === 'matchType') {
        const selectedType = matchTypes.find(type => type.value === value);
        if (selectedType && value !== 'Custom') {
          updated.overs = selectedType.overs;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.teamA || !formData.teamB || !formData.venue || !formData.scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.teamA === formData.teamB) {
      setError('Team A and Team B cannot be the same');
      return;
    }

    if (formData.overs < 1 || formData.overs > 50) {
      setError('Overs must be between 1 and 50');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // Find team details
      const teamAData = teams.find(team => team.id === formData.teamA);
      const teamBData = teams.find(team => team.id === formData.teamB);

      const matchData = {
        // Basic match info
        teamAId: formData.teamA,
        teamBId: formData.teamB,
        teamAName: teamAData?.name || 'Team A',
        teamBName: teamBData?.name || 'Team B',
        venue: formData.venue,
        overs: parseInt(formData.overs),
        matchType: formData.matchType,
        scheduledTime: new Date(formData.scheduledTime),
        
        // Match status
        status: 'upcoming', // upcoming, toss, live, completed
        currentInnings: 1, // 1 for first innings, 2 for second innings
        
        // Toss details (will be set when match starts)
        toss: {
          completed: false,
          winner: null,
          decision: null // 'bat' or 'bowl'
        },
        
        // Current match state
        currentScore: {
          teamA: { runs: 0, wickets: 0, overs: 0, balls: 0 },
          teamB: { runs: 0, wickets: 0, overs: 0, balls: 0 }
        },
        
        // Current players on field
        currentBatsmen: {
          striker: null,
          nonStriker: null
        },
        currentBowler: null,
        
        // Match progression
        ballByBall: [], // Detailed ball-by-ball data
        wickets: [], // Wicket details
        partnerships: [], // Partnership details
        overs: [], // Over-by-over summary
        
        // Player statistics for this match
        playerStats: {
          teamA: {},
          teamB: {}
        },
        
        // Team statistics for this match
        teamStats: {
          teamA: {
            runs: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            extras: {
              byes: 0,
              legByes: 0,
              wides: 0,
              noBalls: 0,
              penalties: 0
            },
            boundaries: { fours: 0, sixes: 0 },
            runRate: 0
          },
          teamB: {
            runs: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            extras: {
              byes: 0,
              legByes: 0,
              wides: 0,
              noBalls: 0,
              penalties: 0
            },
            boundaries: { fours: 0, sixes: 0 },
            runRate: 0
          }
        },
        
        // Match result
        result: null,
        winningTeam: null,
        winMargin: null,
        
        // Metadata
        createdBy: currentUser.uid,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      const docRef = await addDoc(collection(db, 'matches'), matchData);
      navigate(`/match/${docRef.id}/setup`); // Go to match setup page first
    } catch (error) {
      console.error('Error creating match:', error);
      setError('Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || '';
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Trophy className="h-6 w-6 text-cricket-green mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Create New Match</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/create-team')}
            className="flex items-center px-4 py-2 bg-cricket-green text-white rounded-md hover:bg-cricket-green/90 transition-colors text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {loadingTeams ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cricket-green mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading teams...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="h-4 w-4 inline mr-1" />
                  Team A *
                </label>
                {teams.length > 0 ? (
                  <div>
                    <select
                      name="teamA"
                      value={formData.teamA}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">Select Team A</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.totalPlayers} players)
                        </option>
                      ))}
                    </select>
                    {formData.teamA && (
                      <p className="mt-1 text-sm text-gray-600">
                        Selected: {getSelectedTeamName(formData.teamA)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-md">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No teams found</p>
                    <button
                      type="button"
                      onClick={() => navigate('/create-team')}
                      className="mt-2 text-cricket-green hover:text-cricket-green/80 text-sm font-medium"
                    >
                      Create your first team
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="h-4 w-4 inline mr-1" />
                  Team B *
                </label>
                {teams.length > 0 ? (
                  <div>
                    <select
                      name="teamB"
                      value={formData.teamB}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">Select Team B</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.totalPlayers} players)
                        </option>
                      ))}
                    </select>
                    {formData.teamB && (
                      <p className="mt-1 text-sm text-gray-600">
                        Selected: {getSelectedTeamName(formData.teamB)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-md">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No teams found</p>
                    <button
                      type="button"
                      onClick={() => navigate('/create-team')}
                      className="mt-2 text-cricket-green hover:text-cricket-green/80 text-sm font-medium"
                    >
                      Create your first team
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Venue *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                className="input-field"
                placeholder="Match venue"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Trophy className="h-4 w-4 inline mr-1" />
                  Match Type
                </label>
                <select
                  name="matchType"
                  value={formData.matchType}
                  onChange={handleChange}
                  className="input-field"
                >
                  {matchTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Overs per Team
                </label>
                <input
                  type="number"
                  name="overs"
                  min="1"
                  max="50"
                  value={formData.overs}
                  onChange={handleChange}
                  className="input-field"
                  disabled={formData.matchType !== 'Custom'}
                />
                {formData.matchType !== 'Custom' && (
                  <p className="mt-1 text-sm text-gray-500">
                    Auto-set based on match type
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Match Setup Process</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>1. Create match with teams and basic details</p>
                <p>2. Set up playing XI and conduct toss before starting</p>
                <p>3. Begin live scoring with detailed ball-by-ball tracking</p>
                <p>4. Individual player statistics will be automatically tracked</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || teams.length < 2}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateMatch;
                   