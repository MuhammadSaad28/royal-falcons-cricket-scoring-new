import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { Plus, Users, Trophy, User, CirclePlay as PlayCircle } from 'lucide-react';

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      // Fetch user's teams
      const teamsQuery = query(
        collection(db, 'teams'),
        where('createdBy', '==', currentUser.uid)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch user's players
      const playersQuery = query(
        collection(db, 'players'),
        where('createdBy', '==', currentUser.uid)
      );
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch matches where user's teams are involved
      const teamIds = teamsData.map(team => team.id);
      let matchesData = [];
      
      if (teamIds.length > 0) {
        // Note: This is a simplified query. In production, you might need to query both team1 and team2 separately
        const matchesSnapshot = await getDocs(collection(db, 'matches'));
        matchesData = matchesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(match => 
            teamIds.includes(match.team1?.id) || teamIds.includes(match.team2?.id)
          );
      }

      setTeams(teamsData);
      setPlayers(playersData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading your dashboard..." />;
  }

  const stats = [
    {
      name: 'Teams Created',
      value: teams.length,
      icon: Users,
      color: 'bg-blue-500',
      link: '/teams/create'
    },
    {
      name: 'Players Added',
      value: players.length,
      icon: User,
      color: 'bg-green-500',
      link: '/players/create'
    },
    {
      name: 'Matches Organized',
      value: matches.length,
      icon: Trophy,
      color: 'bg-purple-500',
      link: '/matches/create'
    },
    {
      name: 'Live Matches',
      value: matches.filter(m => m.status === 'live').length,
      icon: PlayCircle,
      color: 'bg-red-500',
      link: '/matches?filter=live'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your teams, players, and matches</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-md p-3`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/teams/create"
                className="flex items-center justify-between p-3 bg-cricket-50 hover:bg-cricket-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-cricket-600 mr-3" />
                  <span className="font-medium">Create Team</span>
                </div>
                <Plus className="w-4 h-4 text-cricket-600" />
              </Link>
              
              <Link
                to="/players/create"
                className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <User className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium">Add Player</span>
                </div>
                <Plus className="w-4 h-4 text-blue-600" />
              </Link>
              
              <Link
                to="/matches/create"
                className="flex items-center justify-between p-3 bg-gold-50 hover:bg-gold-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Trophy className="w-5 h-5 text-gold-600 mr-3" />
                  <span className="font-medium">Create Match</span>
                </div>
                <Plus className="w-4 h-4 text-gold-600" />
              </Link>
            </div>
          </div>

          {/* Recent Teams */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Teams</h3>
            {teams.length > 0 ? (
              <div className="space-y-3">
                {teams.slice(0, 3).map(team => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-sm text-gray-600">
                        {team.players?.length || 0} players
                      </p>
                    </div>
                  </div>
                ))}
                {teams.length > 3 && (
                  <Link to="/teams" className="text-cricket-600 hover:text-cricket-700 text-sm font-medium">
                    View all teams →
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No teams created yet</p>
                <Link
                  to="/teams/create"
                  className="text-cricket-600 hover:text-cricket-700 text-sm font-medium"
                >
                  Create your first team
                </Link>
              </div>
            )}
          </div>

          {/* Recent Matches */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Matches</h3>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.slice(0, 3).map(match => (
                  <div key={match.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        match.status === 'live' 
                          ? 'bg-red-100 text-red-800'
                          : match.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {match.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">Team 1 vs Team 2</p>
                    <p className="text-xs text-gray-600">
                      {new Date(match.createdAt?.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                <Link to="/matches" className="text-cricket-600 hover:text-cricket-700 text-sm font-medium">
                  View all matches →
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No matches yet</p>
                <Link
                  to="/matches/create"
                  className="text-cricket-600 hover:text-cricket-700 text-sm font-medium"
                >
                  Create your first match
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}