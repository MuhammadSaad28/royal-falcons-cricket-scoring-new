// import { useState, useEffect } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
// import { db } from '../firebase';
// import { useAuth } from '../context/AuthContext';
// import Loading from '../components/Loading';
// import { Play, Calendar, Users, ChartBar as BarChart3, Settings } from 'lucide-react';
// import ScoreCard from './ScoreCard';

// export default function MatchDetail() {
//   const { id } = useParams();
//   const [match, setMatch] = useState(null);
//   const [teams, setTeams] = useState({});
//   const [liveData, setLiveData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [players, setPlayers] = useState({});
//   const { currentUser } = useAuth();

//   useEffect(() => {
//     fetchMatchData();
//   }, [id]);

//   const fetchMatchData = async () => {
//     try {
//       // Fetch match
//       const matchDoc = await getDoc(doc(db, 'matches', id));
//       if (!matchDoc.exists()) {
//         return;
//       }

//       const matchData = { id: matchDoc.id, ...matchDoc.data() };
//       setMatch(matchData);

//       // Fetch teams
//       const team1Doc = await getDoc(doc(db, 'teams', matchData.team1));
//       const team2Doc = await getDoc(doc(db, 'teams', matchData.team2));
      
//       setTeams({
//         [matchData.team1]: team1Doc.exists() ? { id: team1Doc.id, ...team1Doc.data() } : null,
//         [matchData.team2]: team2Doc.exists() ? { id: team2Doc.id, ...team2Doc.data() } : null
//       });

//       // Fetch live scoring data if match is live
//       if (matchData.status === 'live') {
//         const liveQuery = query(
//           collection(db, 'liveScoring'),
//           where('matchId', '==', id)
//         );
//         const liveSnapshot = await getDocs(liveQuery);
//         if (!liveSnapshot.empty) {
//           setLiveData(liveSnapshot.docs[0].data());
//         }
//       }
//     } catch (error) {
//       console.error('Error fetching match data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusBadge = (status) => {
//     const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
//     switch (status) {
//       case 'live':
//         return `${baseClasses} bg-red-100 text-red-800`;
//       case 'upcoming':
//         return `${baseClasses} bg-blue-100 text-blue-800`;
//       case 'completed':
//         return `${baseClasses} bg-green-100 text-green-800`;
//       default:
//         return `${baseClasses} bg-gray-100 text-gray-800`;
//     }
//   };

//   const canManageMatch = currentUser && match && 
//     (teams[match.team1]?.createdBy === currentUser.uid || 
//      teams[match.team2]?.createdBy === currentUser.uid);

//   if (loading) {
//     return <Loading message="Loading match details..." />;
//   }

//   if (!match) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Not Found</h2>
//           <p className="text-gray-600 mb-4">The match you're looking for doesn't exist.</p>
//           <Link to="/matches" className="text-cricket-600 hover:text-cricket-700 font-medium">
//             ← Back to Matches
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   const team1 = teams[match.team1];
//   const team2 = teams[match.team2];

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
//           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
//             <div className="flex items-center space-x-4 mb-4 lg:mb-0">
//               <span className={getStatusBadge(match.status)}>
//                 {match.status.toUpperCase()}
//               </span>
//               {match.status === 'live' && (
//                 <div className="flex items-center text-red-600">
//                   <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
//                   <span className="text-sm font-medium">LIVE</span>
//                 </div>
//               )}
//             </div>
            
//             <div className="flex flex-col sm:flex-row gap-2">
//               <Link
//                 to={`/overlay/${match.id}`}
//                 target="_blank"
//                 className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
//               >
//                 <BarChart3 className="w-4 h-4 mr-2" />
//                 Overlay View
//               </Link>
              
//               {canManageMatch && (
//                 <Link
//                   to={`/match/${match.id}/score`}
//                   className="bg-cricket-600 hover:bg-cricket-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
//                 >
//                   <Play className="w-4 h-4 mr-2" />
//                   {match.status === 'upcoming' ? 'Start Match' : 'Continue Scoring'}
//                 </Link>
//               )}
              
//               {canManageMatch && (
//                 <Link
//                   to={`/match/${match.id}/settings`}
//                   className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
//                 >
//                   <Settings className="w-4 h-4 mr-2" />
//                   Settings
//                 </Link>
//               )}
//             </div>
//           </div>

//           {/* Match Info */}
//           <div className="grid md:grid-cols-3 gap-6">
//             {/* TEAM 1 Panel */}
// <div className="text-center">
//   <div className="bg-cricket-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
//     <span className="text-cricket-700 font-bold text-xl">
//       {team1?.name?.charAt(0) || 'T1'}
//     </span>
//   </div>
//   <h3 className="text-xl font-bold text-gray-900">{team1?.name || 'Team 1'}</h3>

//   {liveData && (
//     <div className="mt-2">
//       <p className="text-2xl font-bold">
//         {liveData?.runs || 0}/{liveData?.batting?.filter(b => b.out).length || 0}
//       </p>
//       <p className="text-sm text-gray-600">({liveData?.overs || 0} overs)</p>
//     </div>
//   )}
// </div>


//             <div className="text-center flex flex-col justify-center">
//               <div className="text-gray-500 text-lg font-medium mb-2">VS</div>
//               <div className="space-y-1 text-sm text-gray-600">
//                 <p className="flex items-center justify-center">
//                   <Calendar className="w-4 h-4 mr-1" />
//                   {new Date(match.createdAt?.seconds * 1000).toLocaleDateString()}
//                 </p>
//                 <p className="flex items-center justify-center">
//                   <Users className="w-4 h-4 mr-1" />
//                   {match.overs} overs
//                 </p>
//               </div>
//               {match.toss && (
//                 <div className="mt-3 text-sm text-gray-600">
//                   <p className="font-medium">Toss:</p>
//                   <p>{teams[match.toss.winner]?.name} chose to {match.toss.decision}</p>
//                 </div>
//               )}
//             </div>

//             {/* TEAM 2 Panel */}
// <div className="text-center">
//   <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
//     <span className="text-blue-700 font-bold text-xl">
//       {team2?.name?.charAt(0) || 'T2'}
//     </span>
//   </div>
//   <h3 className="text-xl font-bold text-gray-900">{team2?.name || 'Team 2'}</h3>

//   {liveData && (
//     <div className="mt-2">
//       <p className="text-2xl font-bold">
//         {/* Runs conceded can be shown from bowling summary */}
//         {liveData?.bowling?.reduce((acc, b) => acc + (b.runsConceded || 0), 0)}/{liveData?.bowling?.reduce((acc, b) => acc + (b.wickets?.length || 0), 0)}
//       </p>
//       <p className="text-sm text-gray-600">({liveData?.overs || 0} overs)</p>
//     </div>
//   )}
// </div>

//           </div>
//         </div>

//         {/* Scorecard */}
//         <div className="bg-white rounded-lg shadow-sm p-6">
//           <h2 className="text-xl font-bold text-gray-900 mb-4">Scorecard</h2>
          
//           {match.status === 'upcoming' ? (
//             <div className="text-center py-12">
//               <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">Match Not Started</h3>
//               <p className="text-gray-600 mb-4">The match hasn't started yet.</p>
//               {canManageMatch && (
//                 <Link
//                   to={`/match/${match.id}/score`}
//                   className="bg-cricket-600 hover:bg-cricket-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
//                 >
//                   Start Match
//                 </Link>
//               )}
//             </div>
//           ) : (
//             <ScoreCard 
//               match={match}
//               liveData={liveData}
//               teams={teams}
//               players={players}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { Play, Calendar, Users, BarChart3, Settings, TrendingUp } from 'lucide-react';
import ScoreCard from './ScoreCard';

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [players, setPlayers] = useState({});
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!id) return;
    
    const fetchMatchData = async () => {
      try {
        const matchDoc = await getDoc(doc(db, 'matches', id));
        if (!matchDoc.exists()) {
          setLoading(false);
          return;
        }

        const matchData = { id: matchDoc.id, ...matchDoc.data() };
        setMatch(matchData);

        // Fetch teams
        const [team1Doc, team2Doc] = await Promise.all([
          getDoc(doc(db, 'teams', matchData.team1)),
          getDoc(doc(db, 'teams', matchData.team2))
        ]);

        const teamsData = {
          [matchData.team1]: team1Doc.exists() ? { id: team1Doc.id, ...team1Doc.data() } : null,
          [matchData.team2]: team2Doc.exists() ? { id: team2Doc.id, ...team2Doc.data() } : null
        };
        setTeams(teamsData);

        // Fetch all players
        const allPlayers = {};
        for (const teamId of [matchData.team1, matchData.team2]) {
          const teamPlayers = teamsData[teamId]?.players || [];
          for (const playerId of teamPlayers) {
            const playerDoc = await getDoc(doc(db, 'players', playerId));
            if (playerDoc.exists()) {
              allPlayers[playerId] = { id: playerDoc.id, ...playerDoc.data() };
            }
          }
        }
        setPlayers(allPlayers);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching match data:', error);
        setLoading(false);
      }
    };

    fetchMatchData();

    // Real-time listener for live scoring
    const unsubscribe = onSnapshot(
      doc(db, 'liveScoring', id),
      (docSnap) => {
        if (docSnap.exists()) {
          setLiveData(docSnap.data());
        }
      },
      (error) => {
        console.error('Error listening to live data:', error);
      }
    );

    return () => unsubscribe();
  }, [id]);

  const canManageMatch = currentUser && match && 
    (teams[match.team1]?.createdBy === currentUser.uid || 
     teams[match.team2]?.createdBy === currentUser.uid);

  if (loading) {
    return <Loading message="Loading match details..." />;
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Not Found</h2>
          <p className="text-gray-600 mb-4">The match you're looking for doesn't exist.</p>
          <Link to="/matches" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const team1 = teams[match.team1];
  const team2 = teams[match.team2];
  
  // Get current innings data
  const currentInnings = liveData?.innings?.[liveData.innings.length - 1];
  const previousInnings = liveData?.innings?.length > 1 ? liveData.innings[0] : null;
  
  const battingTeamId = currentInnings?.teamId;
  const isBattingTeam1 = battingTeamId === match.team1;

  // Calculate run rate
  const currentRunRate = currentInnings?.overs > 0 
    ? (currentInnings.runs / currentInnings.overs).toFixed(2) 
    : '0.00';

  // Calculate target info for 2nd innings
  let targetInfo = null;
  if (previousInnings) {
    const target = previousInnings.runs + 1;
    const required = target - currentInnings.runs;
    const ballsRemaining = (match.overs * 6) - (currentInnings.totalBalls || 0);
    const requiredRunRate = ballsRemaining > 0 ? ((required / ballsRemaining) * 6).toFixed(2) : '0.00';
    
    targetInfo = {
      target,
      required: required > 0 ? required : 0,
      balls: ballsRemaining > 0 ? ballsRemaining : 0,
      rrr: requiredRunRate
    };
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Match Header Card */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden mb-6 border border-gray-700">
          {/* Status Bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                match.status === 'live' 
                  ? 'bg-red-500 text-white' 
                  : match.status === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-gray-900'
              }`}>
                {match.status.toUpperCase()}
              </div>
              {match.status === 'live' && (
                <div className="flex items-center text-white">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-bold tracking-wider">LIVE NOW</span>
                </div>
              )}
              <div className="text-white text-sm font-semibold">
                T{match.overs} Match
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link
                to={`/overlay/${match.id}`}
                target="_blank"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 flex items-center shadow-lg"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Overlay
              </Link>
              
              {canManageMatch && (
                <>
                  <Link
                    to={`/match/${match.id}/score`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 flex items-center shadow-lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {match.status === 'upcoming' ? 'Start' : 'Score'}
                  </Link>
                  <Link
                    to={`/match/${match.id}/settings`}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 flex items-center shadow-lg"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Match Score Display */}
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              
              {/* Team 1 */}
              <div className={`text-center ${isBattingTeam1 ? 'order-1' : 'order-1'}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isBattingTeam1 ? 'bg-gradient-to-br from-green-500 to-green-600 ring-4 ring-green-400/50' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                } shadow-xl`}>
                  <span className="text-white font-black text-3xl">
                    {team1?.name?.charAt(0) || 'T'}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">{team1?.name || 'Team 1'}</h3>
                
                {liveData && isBattingTeam1 && currentInnings && (
                  <div className="mt-4 bg-gradient-to-r from-green-600/20 to-transparent rounded-xl p-4 border border-green-500/30">
                    <div className="text-5xl font-black text-white mb-1">
                      {currentInnings.runs}
                      <span className="text-3xl text-yellow-400">/{currentInnings.wickets}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">
                      ({currentInnings.overs?.toFixed(1)} overs)
                    </div>
                    <div className="mt-2 text-yellow-400 text-xs font-bold">
                      RR: {currentRunRate}
                    </div>
                  </div>
                )}
                
                {previousInnings && !isBattingTeam1 && (
                  <div className="mt-4 bg-gray-700/50 rounded-xl p-4">
                    <div className="text-3xl font-black text-gray-300 mb-1">
                      {previousInnings.runs}
                      <span className="text-2xl text-gray-400">/{previousInnings.wickets}</span>
                    </div>
                    <div className="text-gray-400 text-sm">
                      ({previousInnings.overs?.toFixed(1)} overs)
                    </div>
                  </div>
                )}
              </div>

              {/* Center Info */}
              <div className="text-center order-2">
                <div className="text-gray-400 text-2xl font-black mb-4">VS</div>
                
                {match.toss && (
                  <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
                    <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
                      Toss
                    </div>
                    <div className="text-white text-sm font-semibold">
                      {teams[match.toss.winner]?.name}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      chose to {match.toss.decision}
                    </div>
                  </div>
                )}

                {targetInfo && (
                  <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-xl p-4 border border-red-500/30">
                    <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                      Target
                    </div>
                    <div className="text-white text-3xl font-black mb-1">
                      {targetInfo.required}
                    </div>
                    <div className="text-gray-300 text-xs">
                      from {targetInfo.balls} balls
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="text-yellow-400 text-xs font-bold">
                        RRR: {targetInfo.rrr}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(match.createdAt?.seconds * 1000).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {match.overs} overs
                  </div>
                </div>
              </div>

              {/* Team 2 */}
              <div className={`text-center ${!isBattingTeam1 ? 'order-3' : 'order-3'}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  !isBattingTeam1 && liveData ? 'bg-gradient-to-br from-green-500 to-green-600 ring-4 ring-green-400/50' : 'bg-gradient-to-br from-red-500 to-red-600'
                } shadow-xl`}>
                  <span className="text-white font-black text-3xl">
                    {team2?.name?.charAt(0) || 'T'}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">{team2?.name || 'Team 2'}</h3>
                
                {liveData && !isBattingTeam1 && currentInnings && (
                  <div className="mt-4 bg-gradient-to-r from-green-600/20 to-transparent rounded-xl p-4 border border-green-500/30">
                    <div className="text-5xl font-black text-white mb-1">
                      {currentInnings.runs}
                      <span className="text-3xl text-yellow-400">/{currentInnings.wickets}</span>
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">
                      ({currentInnings.overs?.toFixed(1)} overs)
                    </div>
                    <div className="mt-2 text-yellow-400 text-xs font-bold">
                      RR: {currentRunRate}
                    </div>
                  </div>
                )}
                
                {previousInnings && isBattingTeam1 && (
                  <div className="mt-4 bg-gray-700/50 rounded-xl p-4">
                    <div className="text-3xl font-black text-gray-300 mb-1">
                      {previousInnings.runs}
                      <span className="text-2xl text-gray-400">/{previousInnings.wickets}</span>
                    </div>
                    <div className="text-gray-400 text-sm">
                      ({previousInnings.overs?.toFixed(1)} overs)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scorecard */}
        {match.status === 'upcoming' ? (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-12 text-center border border-gray-700">
            <Calendar className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-white mb-3">Match Not Started</h3>
            <p className="text-gray-400 mb-6">The match hasn't started yet.</p>
            {canManageMatch && (
              <Link
                to={`/match/${match.id}/score`}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 inline-flex items-center shadow-xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Match
              </Link>
            )}
          </div>
        ) : (
          <ScoreCard 
            match={match}
            liveData={liveData}
            teams={teams}
            players={players}
          />
        )}
      </div>
    </div>
  );
}