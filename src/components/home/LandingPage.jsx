import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Play, Calendar, CircleCheck as CheckCircle, Users, Target, TrendingUp, Clock, MapPin } from 'lucide-react';
import MatchCard from '../matches/MatchCard';
import Loading from '../common/Loading';

const LandingPage = () => {
  const { currentUser } = useAuth();
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      // Fetch live matches
      const liveQuery = query(
        collection(db, 'matches'),
        where('status', '==', 'live'),
        orderBy('createdAt', 'desc'),
        limit(6)
      );
      const liveSnapshot = await getDocs(liveQuery);
      setLiveMatches(liveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch upcoming matches
      const upcomingQuery = query(
        collection(db, 'matches'),
        where('status', '==', 'upcoming'),
        orderBy('scheduledTime', 'asc'),
        limit(6)
      );
      const upcomingSnapshot = await getDocs(upcomingQuery);
      setUpcomingMatches(upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch completed matches
      const completedQuery = query(
        collection(db, 'matches'),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc'),
        limit(6)
      );
      const completedSnapshot = await getDocs(completedQuery);
      setCompletedMatches(completedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const HeroSection = () => (
    <div className="bg-gradient-to-r from-cricket-green to-green-600 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center mb-6">
          <Trophy className="h-16 w-16 mr-4" />
          <h1 className="text-5xl font-bold">Royal Falcons Scoring</h1>
        </div>
        <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
          Professional cricket scoring platform with live updates, comprehensive statistics, 
          and real-time streaming overlays for tournaments and series.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {currentUser ? (
            <>
              <Link to="/dashboard" className="bg-white text-cricket-green px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Go to Dashboard
              </Link>
              <Link to="/create-match" className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-cricket-green transition-colors">
                Create Match
              </Link>
            </>
          ) : (
            <>
              <Link to="/signup" className="bg-white text-cricket-green px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Get Started
              </Link>
              <Link to="/login" className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-cricket-green transition-colors">
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const FeatureSection = () => (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need for Cricket Scoring
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From casual matches to professional tournaments, manage everything with our comprehensive platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="bg-cricket-green bg-opacity-10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-cricket-green" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Live Scoring</h3>
            <p className="text-gray-600">
              Ball-by-ball scoring with real-time updates, commentary, and automatic statistics calculation.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-cricket-blue bg-opacity-10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-cricket-blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Tournament Management</h3>
            <p className="text-gray-600">
              Create and manage tournaments with automatic points tables, fixtures, and comprehensive statistics.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-cricket-orange bg-opacity-10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Play className="h-8 w-8 text-cricket-orange" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">OBS Integration</h3>
            <p className="text-gray-600">
              Stream-ready overlays for live broadcasts with real-time score updates for professional presentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <Loading text="Loading matches..." />;

  return (
    <div>
      <HeroSection />
      <FeatureSection />
      
      {/* Live Matches */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Play className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Live Matches</h2>
            </div>
            {liveMatches.length > 6 && (
              <Link to="/matches?filter=live" className="text-cricket-green hover:text-green-600">
                View all live matches
              </Link>
            )}
          </div>

          {liveMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No live matches</h3>
              <p className="text-gray-600">Check back later for live cricket action!</p>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-cricket-blue mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Upcoming Matches</h2>
            </div>
            {upcomingMatches.length > 6 && (
              <Link to="/matches?filter=upcoming" className="text-cricket-green hover:text-green-600">
                View all upcoming matches
              </Link>
            )}
          </div>

          {upcomingMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming matches</h3>
              <p className="text-gray-600 mb-4">Be the first to schedule a match!</p>
              {currentUser && (
                <Link to="/create-match" className="btn-primary">
                  Create Match
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Recent Results */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-cricket-green mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Recent Results</h2>
            </div>
            {completedMatches.length > 6 && (
              <Link to="/matches?filter=completed" className="text-cricket-green hover:text-green-600">
                View all results
              </Link>
            )}
          </div>

          {completedMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed matches yet</h3>
              <p className="text-gray-600">Match results will appear here once games are finished.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;