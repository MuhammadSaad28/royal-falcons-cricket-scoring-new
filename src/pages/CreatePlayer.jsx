import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, arrayUnion, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User, Plus, X } from 'lucide-react';

export default function CreatePlayer() {
  const [players, setPlayers] = useState([{ name: '' }, { name: '' }]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserTeams();
  }, [currentUser]);

  const fetchUserTeams = async () => {
    try {
      const teamsQuery = query(
        collection(db, 'teams'),
        where('createdBy', '==', currentUser.uid)
      );
      const snapshot = await getDocs(teamsQuery);
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const addPlayerField = () => {
    setPlayers([...players, { name: '' }]);
  };

  const removePlayerField = (index) => {
    if (players.length > 1) {
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
    }
  };

  const updatePlayerName = (index, name) => {
    const newPlayers = [...players];
    newPlayers[index].name = name;
    setPlayers(newPlayers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty player names
    const validPlayers = players.filter(player => player.name.trim() !== '');

    if (validPlayers.length === 0) {
      setError('Please enter at least one player name');
      return;
    }

    if (!selectedTeam) {
      setError('Please select a team');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create all players in batch
      const playerPromises = validPlayers.map(player =>
        addDoc(collection(db, 'players'), {
          name: player.name.trim(),
          teamId: selectedTeam,
          createdBy: currentUser.uid,
          totalRunsScored: 0,
          totalMatches: 0,
          totalInnings: 0,
          totalBallsFaced: 0,
          totalRunsGiven: 0,
          totalOversBowled: 0,
          totalWickets: 0,
          totalSixesHit: 0,
          totalFoursHit: 0,
          totalSixesConceded: 0,
          totalFoursConceded: 0,
          createdAt: new Date()
        })
      );

      const playerRefs = await Promise.all(playerPromises);
      const playerIds = playerRefs.map(ref => ref.id);

      // Update team document with all player IDs at once
      const teamRef = doc(db, "teams", selectedTeam);
      await updateDoc(teamRef, {
        players: arrayUnion(...playerIds)
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating players:', error);
      setError('Failed to create players. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Teams Found</h2>
            <p className="text-gray-600 mb-6">You need to create a team first before adding players.</p>
            <button
              onClick={() => navigate('/teams/create')}
              className="bg-cricket-600 hover:bg-cricket-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              Create Team
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Players</h1>
              <p className="text-gray-600">Add multiple players to your team at once</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-2">
                Select Team *
              </label>
              <select
                id="team"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Names *
              </label>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Player ${index + 1} name`}
                    />
                    {players.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayerField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove player"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addPlayerField}
                className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Player
              </button>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding Players...' : `Add ${players.filter(p => p.name.trim()).length || 'Players'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}