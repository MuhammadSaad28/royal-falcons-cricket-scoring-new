import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Trophy } from 'lucide-react';

export default function CreateMatch() {
  const [matchData, setMatchData] = useState({
    team1: '',
    team2: '',
    overs: 20,
    maximumOversPerPlayer: 4,
    totalPlayersPerTeam: 11
  });
  const [teams, setTeams] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState({});
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
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch players for each team
      const playersQuery = query(
        collection(db, 'players'),
        where('createdBy', '==', currentUser.uid)
      );
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group players by team
      const playersByTeam = {};
      playersData.forEach(player => {
        if (!playersByTeam[player.teamId]) {
          playersByTeam[player.teamId] = [];
        }
        playersByTeam[player.teamId].push(player);
      });

      setTeams(teamsData);
      setTeamPlayers(playersByTeam);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMatchData(prev => ({
      ...prev,
      [name]: name === 'overs' || name === 'maximumOversPerPlayer' || name === 'totalPlayersPerTeam' 
        ? parseInt(value) 
        : value
    }));
  };

  const validateTeams = () => {
    if (!matchData.team1 || !matchData.team2) {
      setError('Please select both teams');
      return false;
    }

    if (matchData.team1 === matchData.team2) {
      setError('Please select different teams');
      return false;
    }

    const team1Players = teamPlayers[matchData.team1] || [];
    const team2Players = teamPlayers[matchData.team2] || [];

    if (team1Players.length < matchData.totalPlayersPerTeam) {
      const team1Name = teams.find(t => t.id === matchData.team1)?.name;
      setError(`${team1Name} needs at least ${matchData.totalPlayersPerTeam} players to start a match`);
      return false;
    }

    if (team2Players.length < matchData.totalPlayersPerTeam) {
      const team2Name = teams.find(t => t.id === matchData.team2)?.name;
      setError(`${team2Name} needs at least ${matchData.totalPlayersPerTeam} players to start a match`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateTeams()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'matches'), {
        ...matchData,
        status: 'upcoming',
        createdAt: new Date()
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating match:', error);
      setError('Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (teams.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Enough Teams</h2>
            <p className="text-gray-600 mb-6">
              You need at least 2 teams to create a match. Create more teams first.
            </p>
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
            <div className="bg-gold-100 p-3 rounded-full mr-4">
              <Trophy className="w-6 h-6 text-gold-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Match</h1>
              <p className="text-gray-600">Set up a match between your teams</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="team1" className="block text-sm font-medium text-gray-700 mb-2">
                  Team 1 *
                </label>
                <select
                  id="team1"
                  name="team1"
                  value={matchData.team1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                  required
                >
                  <option value="">Select Team 1</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({teamPlayers[team.id]?.length || 0} players)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="team2" className="block text-sm font-medium text-gray-700 mb-2">
                  Team 2 *
                </label>
                <select
                  id="team2"
                  name="team2"
                  value={matchData.team2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                  required
                >
                  <option value="">Select Team 2</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({teamPlayers[team.id]?.length || 0} players)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="overs" className="block text-sm font-medium text-gray-700 mb-2">
                  Overs per Innings *
                </label>
                <select
                  id="overs"
                  name="overs"
                  value={matchData.overs}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                >
                  <option value={5}>5 Overs</option>
                  <option value={10}>10 Overs</option>
                  <option value={15}>15 Overs</option>
                  <option value={20}>20 Overs (T20)</option>
                  <option value={50}>50 Overs (ODI)</option>
                </select>
              </div>

              <div>
                <label htmlFor="maximumOversPerPlayer" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Overs per Bowler
                </label>
                <input
                  type="number"
                  id="maximumOversPerPlayer"
                  name="maximumOversPerPlayer"
                  value={matchData.maximumOversPerPlayer}
                  onChange={handleChange}
                  min="1"
                  max={Math.floor(matchData.overs / 5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                />
              </div>

              <div>
                <label htmlFor="totalPlayersPerTeam" className="block text-sm font-medium text-gray-700 mb-2">
                  Players per Team
                </label>
                <input
                  type="number"
                  id="totalPlayersPerTeam"
                  name="totalPlayersPerTeam"
                  value={matchData.totalPlayersPerTeam}
                  onChange={handleChange}
                  min="6"
                  max="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                />
              </div>
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
                className="flex-1 bg-gold-600 hover:bg-gold-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}