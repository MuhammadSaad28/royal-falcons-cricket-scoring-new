import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  limit,
  getDocs,
  where,
  orderBy,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import MatchCard from "../components/MatchCard";
import Loading from "../components/Loading";
import { Play, Users, Trophy, ChartBar as BarChart3 } from "lucide-react";

export default function LandingPage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch recent matches
      const matchesQuery = query(
        collection(db, "matches"),
        orderBy("createdAt", "desc"),
        limit(6)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchesData = matchesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch teams
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsData = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      matchesData.forEach((match) => {
        const unsubscribe = onSnapshot(
          doc(db, "liveScoring", match.id), // yahan har match ki id pass ho rahi
          (docSnap) => {
            if (docSnap.exists()) {
              // Har match ka live data state me store karo
              setLiveData((prev) => ({
                ...prev,
                [match.id]: docSnap.data(),
              }));
            }
          },
          (error) => {
            console.error("Error listening to live updates:", error);
          }
        );
      });

      setMatches(matchesData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const liveMatches = matches.filter((match) => match.status === "live");
  const recentMatches = matches.filter((match) => match.status === "completed");
  const upcomingMatches = matches.filter(
    (match) => match.status === "upcoming"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-50 to-green-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-cricket-800 to-cricket-600 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              World-Class Cricket Scoring
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-cricket-100">
              Experience professional cricket scoring with real-time updates,
              comprehensive statistics, and broadcast-quality overlays.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/matches"
                className="bg-gold-600 hover:bg-gold-500 px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                View Live Matches
              </Link>
              <Link
                to="/signup"
                className="bg-transparent border-2 border-white hover:bg-white hover:text-cricket-800 px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Scoring
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Professional Cricket Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage and score cricket matches like the
              professionals
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-cricket-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-cricket-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Team Management</h3>
              <p className="text-gray-600">
                Create and manage teams, players, and track comprehensive
                statistics
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gold-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gold-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Live Scoring</h3>
              <p className="text-gray-600">
                Real-time scoring with international standards and instant
                updates
              </p>
            </div>
            <div className="text-center">
              <div className="bg-cricket-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-cricket-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Broadcast Overlay</h3>
              <p className="text-gray-600">
                Professional overlays for streaming and broadcast applications
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                Live Matches
              </h2>
              <Link
                to="/matches?filter=live"
                className="text-cricket-600 hover:text-cricket-700 font-medium"
              >
                View All Live →
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveMatches.map((match) => (
                <MatchCard key={match.id} match={match} teams={teams} liveData={liveData[match.id] || null} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Matches */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Recent Matches</h2>
            <Link
              to="/matches"
              className="text-cricket-600 hover:text-cricket-700 font-medium"
            >
              View All Matches →
            </Link>
          </div>

          {loading ? (
            <Loading message="Loading matches..." />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.slice(0, 6).map((match) => (
                <MatchCard key={match.id} match={match} teams={teams} liveData={liveData[match.id] || null} />
              ))}
            </div>
          )}

          {!loading && matches.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Trophy className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No matches yet
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to create and score a match!
              </p>
              <Link
                to="/signup"
                className="bg-cricket-600 hover:bg-cricket-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-cricket-800 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Score Like a Pro?
          </h2>
          <p className="text-xl text-cricket-100 mb-8">
            Join thousands of cricket enthusiasts using our platform for
            professional match management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-gold-600 hover:bg-gold-500 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Create Account
            </Link>
            <Link
              to="/matches"
              className="bg-transparent border-2 border-cricket-300 hover:bg-cricket-700 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Browse Matches
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
