import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trophy, Users, Target, ChartBar as BarChart3, Calendar, TrendingUp } from 'lucide-react';
import Loading from '../common/Loading';
import MatchCard from '../matches/MatchCard';

const Dashboard = () => {
  const { currentUser, userData } = useAuth();
  const [userMatches, setUserMatches] = useState([]);
  const [userSeries, setUserSeries] = useState([]);
  const [userTournaments, setUserTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    liveMatches: 0,
    completedMatches: 0,
    totalSeries: 0
  });

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      // Fetch user's matches
      const matchesQuery = query(
        collection(db, 'matches'),
        where('createdBy', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matches = matchesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setUserMatches(matches);

      // Fetch user's series
      const seriesQuery = query(
        collection(db, 'series'),
        where('createdBy', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const seriesSnapshot = await getDocs(seriesQuery);
      const series = seriesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setUserSeries(series);

      // Fetch user's tournaments
      const tournamentsQuery = query(
        collection(db, 'tournaments'),
        where('createdBy', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const tournamentsSnapshot = await getDocs(tournamentsQuery);
      const tournaments = tournamentsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setUserTournaments(tournaments);

      // Calculate stats
      setStats({
        totalMatches: matches.length,
        liveMatches: matches.filter(m => m.status === 'live').length,
        completedMatches: matches.filter(m => m.status === 'completed').length,
        totalSeries: series.length
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {userData?.name || currentUser?.displayName}!
        </h1>
        <p className="text-gray-600">
          Manage your cricket matches, series, and tournaments from your dashboard.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-r from-cricket-green to-green-600 text-white">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 mr-3" />
            <div>
              <p className="text-green-100">Total Matches</p>
              <p className="text-2xl font-bold">{stats.totalMatches}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center">
            <Target className="h-8 w-8 mr-3" />
            <div>
              <p className="text-red-100">Live Matches</p>
              <p className="text-2xl font-bold">{stats.liveMatches}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-cricket-blue to-blue-600 text-white">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 mr-3" />
            <div>
              <p className="text-blue-100">Completed</p>
              <p className="text-2xl font-bold">{stats.completedMatches}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-cricket-orange to-orange-600 text-white">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 mr-3" />
            <div>
              <p className="text-orange-100">Series</p>
              <p className="text-2xl font-bold">{stats.totalSeries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/create-match"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-cricket-green hover:bg-green-50 transition-colors group"
          >
            <Plus className="h-6 w-6 text-cricket-green mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-cricket-green">
                Create Match
              </h3>
              <p className="text-sm text-gray-600">Start a new cricket match</p>
            </div>
          </Link>

          <Link
            to="/create-series"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-cricket-blue hover:bg-blue-50 transition-colors group"
          >
            <Trophy className="h-6 w-6 text-cricket-blue mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-cricket-blue">
                Create Series
              </h3>
              <p className="text-sm text-gray-600">Organize a match series</p>
            </div>
          </Link>

          <Link
            to="/create-tournament"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-cricket-orange hover:bg-orange-50 transition-colors group"
          >
            <Users className="h-6 w-6 text-cricket-orange mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-cricket-orange">
                Create Tournament
              </h3>
              <p className="text-sm text-gray-600">Set up a tournament</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Recent Matches</h2>
          <Link to="/create-match" className="btn-primary">
            Create Match
          </Link>
        </div>

        {userMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userMatches.slice(0, 6).map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first cricket match to get started with scoring.
            </p>
            <Link to="/create-match" className="btn-primary">
              Create Your First Match
            </Link>
          </div>
        )}
      </div>

      {/* Series and Tournaments */}
      {(userSeries.length > 0 || userTournaments.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Series */}
          {userSeries.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Series</h2>
                <Link to="/create-series" className="text-cricket-green hover:text-green-600">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {userSeries.slice(0, 3).map(series => (
                  <div key={series.id} className="p-3 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900">{series.name}</h3>
                    <p className="text-sm text-gray-600">
                      {series.matches?.length || 0} matches
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournaments */}
          {userTournaments.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Tournaments</h2>
                <Link to="/create-tournament" className="text-cricket-orange hover:text-orange-600">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {userTournaments.slice(0, 3).map(tournament => (
                  <div key={tournament.id} className="p-3 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900">{tournament.name}</h3>
                    <p className="text-sm text-gray-600">
                      {tournament.teams?.length || 0} teams
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;