import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, arrayUnion, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';

export default function CreatePlayer() {
  const [playerName, setPlayerName] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Player name is required');
      return;
    }

    if (!selectedTeam) {
      setError('Please select a team');
      return;
    }

    setLoading(true);
    setError('');

    try {
     const playerRef =  await addDoc(collection(db, 'players'), {
        name: playerName.trim(),
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
      });

      const teamRef = doc(db, "teams", selectedTeam);
await updateDoc(teamRef, {
  players: arrayUnion(playerRef.id)
});

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating player:', error);
      setError('Failed to create player. Please try again.');
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
              <h1 className="text-2xl font-bold text-gray-900">Add New Player</h1>
              <p className="text-gray-600">Add a player to one of your teams</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                Player Name *
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter player name"
                required
              />
            </div>

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
                {loading ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}