import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  CircleAlert as AlertCircle,
  Check,
  User,
  Shield,
  Target
} from 'lucide-react';

const CreateTeam = () => {
  const [teamData, setTeamData] = useState({
    name: '',
    description: '',
    homeGround: '',
    coach: ''
  });
  
  const [players, setPlayers] = useState([
    { id: 1, name: '', role: 'batsman', isCaptain: false, isWicketKeeper: false }
  ]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const playerRoles = [
    { value: 'batsman', label: 'Batsman' },
    { value: 'bowler', label: 'Bowler' },
    { value: 'all-rounder', label: 'All Rounder' },
    { value: 'wicket-keeper', label: 'Wicket Keeper' }
  ];

  const handleTeamChange = (e) => {
    const { name, value } = e.target;
    setTeamData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayerChange = (playerId, field, value) => {
    setPlayers(prev => prev.map(player => {
      if (player.id === playerId) {
        let updatedPlayer = { ...player, [field]: value };
        
        // Auto-set wicket keeper if role is wicket-keeper
        if (field === 'role' && value === 'wicket-keeper') {
          updatedPlayer.isWicketKeeper = true;
          // Remove wicket keeper from other players
          setPlayers(prevPlayers => prevPlayers.map(p => 
            p.id !== playerId ? { ...p, isWicketKeeper: false } : p
          ));
        }
        
        // If setting as captain, remove captain from others
        if (field === 'isCaptain' && value === true) {
          setPlayers(prevPlayers => prevPlayers.map(p => 
            p.id !== playerId ? { ...p, isCaptain: false } : p
          ));
        }
        
        // If setting as wicket keeper, remove from others
        if (field === 'isWicketKeeper' && value === true) {
          setPlayers(prevPlayers => prevPlayers.map(p => 
            p.id !== playerId ? { ...p, isWicketKeeper: false } : p
          ));
        }
        
        return updatedPlayer;
      }
      return player;
    }));
  };

  const addPlayer = () => {
    const newId = Math.max(...players.map(p => p.id), 0) + 1;
    setPlayers(prev => [...prev, {
      id: newId,
      name: '',
      role: 'batsman',
      isCaptain: false,
      isWicketKeeper: false
    }]);
  };

  const removePlayer = (playerId) => {
    if (players.length > 1) {
      setPlayers(prev => prev.filter(player => player.id !== playerId));
    }
  };

  const validateForm = () => {
    if (!teamData.name.trim()) {
      setError('Team name is required');
      return false;
    }

    const validPlayers = players.filter(player => player.name.trim());
    if (validPlayers.length < 2) {
      setError('At least 2 players are required');
      return false;
    }

    // Check for duplicate player names
    const playerNames = validPlayers.map(p => p.name.trim().toLowerCase());
    const uniqueNames = [...new Set(playerNames)];
    if (playerNames.length !== uniqueNames.length) {
      setError('Player names must be unique');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setError('');
      setLoading(true);

      const validPlayers = players.filter(player => player.name.trim());
      const captain = validPlayers.find(player => player.isCaptain);
      const wicketKeeper = validPlayers.find(player => player.isWicketKeeper);

      // Use batch write for atomic operations
      const batch = writeBatch(db);
      const playerIds = [];

      // Create players in players collection
      for (const player of validPlayers) {
        const playerRef = doc(collection(db, 'players'));
        const playerData = {
          name: player.name.trim(),
          role: player.role,
          isCaptain: player.isCaptain,
          isWicketKeeper: player.isWicketKeeper,
          createdBy: currentUser.uid,
          createdAt: new Date(),
          
          // Career statistics
          careerStats: {
            matchesPlayed: 0,
            totalRuns: 0,
            totalBalls: 0,
            boundaries: 0, // 4s
            sixes: 0,
            centuries: 0,
            halfCenturies: 0,
            highestScore: 0,
            totalWickets: 0,
            ballsBowled: 0,
            runsConceded: 0,
            catches: 0,
            stumpings: 0,
            runOuts: 0,
            battingAverage: 0,
            bowlingAverage: 0,
            strikeRate: 0,
            economyRate: 0
          },
          
          // Team associations
          teams: [], // Will be updated when player joins teams
          isActive: true
        };
        
        batch.set(playerRef, playerData);
        playerIds.push(playerRef.id);
      }

      // Create team with player references
      const teamRef = doc(collection(db, 'teams'));
      const teamPayload = {
        ...teamData,
        playerIds: playerIds, // Store only player IDs
        captainId: captain ? playerIds[validPlayers.findIndex(p => p.isCaptain)] : null,
        wicketKeeperId: wicketKeeper ? playerIds[validPlayers.findIndex(p => p.isWicketKeeper)] : null,
        totalPlayers: validPlayers.length,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        
        // Team statistics
        teamStats: {
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          matchesDrawn: 0,
          totalRuns: 0,
          totalWickets: 0,
          highestTeamScore: 0,
          lowestTeamScore: null
        },
        
        isActive: true
      };

      batch.set(teamRef, teamPayload);

      // Update players with team association
      playerIds.forEach((playerId, index) => {
        const playerRef = doc(db, 'players', playerId);
        batch.update(playerRef, {
          teams: [{ teamId: teamRef.id, teamName: teamData.name, joinedAt: new Date() }]
        });
      });

      await batch.commit();
      
      setSuccess('Team created successfully!');
      
      // Redirect after short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Users className="h-6 w-6 text-cricket-green mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Create New Team</h1>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Team Details */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Team Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={teamData.name}
                  onChange={handleTeamChange}
                  className="input-field"
                  placeholder="Enter team name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Ground
                </label>
                <input
                  type="text"
                  name="homeGround"
                  value={teamData.homeGround}
                  onChange={handleTeamChange}
                  className="input-field"
                  placeholder="Home ground/venue"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Description
              </label>
              <textarea
                name="description"
                value={teamData.description}
                onChange={handleTeamChange}
                className="input-field"
                rows="3"
                placeholder="Brief description about the team"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coach
              </label>
              <input
                type="text"
                name="coach"
                value={teamData.coach}
                onChange={handleTeamChange}
                className="input-field"
                placeholder="Coach name (optional)"
              />
            </div>
          </div>

          {/* Players Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Players ({players.filter(p => p.name.trim()).length})
              </h2>
              <button
                type="button"
                onClick={addPlayer}
                className="flex items-center px-4 py-2 bg-cricket-green text-white rounded-md hover:bg-cricket-green/90 transition-colors text-sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Player
              </button>
            </div>

            <div className="space-y-4">
              {players.map((player, index) => (
                <div key={player.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <User className="h-4 w-4 inline mr-1" />
                        Player Name *
                      </label>
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => handlePlayerChange(player.id, 'name', e.target.value)}
                        className="input-field text-sm"
                        placeholder={`Player ${index + 1} name`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Target className="h-4 w-4 inline mr-1" />
                        Role
                      </label>
                      <select
                        value={player.role}
                        onChange={(e) => handlePlayerChange(player.id, 'role', e.target.value)}
                        className="input-field text-sm"
                      >
                        {playerRoles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`captain-${player.id}`}
                          checked={player.isCaptain}
                          onChange={(e) => handlePlayerChange(player.id, 'isCaptain', e.target.checked)}
                          className="h-4 w-4 text-cricket-green border-gray-300 rounded focus:ring-cricket-green"
                        />
                        <label htmlFor={`captain-${player.id}`} className="ml-2 text-sm text-gray-700 flex items-center">
                          <Shield className="h-4 w-4 mr-1" />
                          Captain
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`keeper-${player.id}`}
                          checked={player.isWicketKeeper}
                          onChange={(e) => handlePlayerChange(player.id, 'isWicketKeeper', e.target.checked)}
                          className="h-4 w-4 text-cricket-green border-gray-300 rounded focus:ring-cricket-green"
                        />
                        <label htmlFor={`keeper-${player.id}`} className="ml-2 text-sm text-gray-700">
                          W.K
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(player.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p><strong>Tips:</strong></p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>You need at least 2 players to create a team</li>
                <li>Each player will be created in the players database</li>
                <li>Players can be part of multiple teams</li>
                <li>Only one player can be captain and wicket keeper per team</li>
                <li>Individual player statistics will be tracked across all matches</li>
              </ul>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6 disabled:opacity-50 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;