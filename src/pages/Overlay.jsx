import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Overlay() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [players, setPlayers] = useState({});
  const [liveData, setLiveData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchMatch = async () => {
      try {
        const matchDoc = await getDoc(doc(db, 'matches', id));
        if (!matchDoc.exists()) return;

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

        // Fetch all players from both teams
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
      } catch (error) {
        console.error('Error fetching match:', error);
      }
    };

    fetchMatch();

    // Listen for live scoring updates
    const unsubscribe = onSnapshot(
      doc(db, 'liveScoring', id),
      (doc) => {
        if (doc.exists()) {
          setLiveData(doc.data());
        }
      },
      (error) => {
        console.error('Error listening to live updates:', error);
      }
    );

    // Toggle details view every 10 seconds
    const interval = setInterval(() => {
      setShowDetails(prev => !prev);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [id]);

  if (!match || !liveData) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  const currentInnings = liveData.innings[liveData.innings.length - 1];
  const previousInnings = liveData.innings.length > 1 ? liveData.innings[0] : null;
  
  const battingTeamId = currentInnings.teamId;
  const bowlingTeamId = battingTeamId === match.team1 ? match.team2 : match.team1;
  
  const battingTeam = teams[battingTeamId];
  const bowlingTeam = teams[bowlingTeamId];

  // Get current batsmen
  const striker = currentInnings.battersOnCrease?.[0];
  const nonStriker = currentInnings.battersOnCrease?.[1];
  
  const strikerStats = currentInnings.batting?.find(b => b.playerId === striker);
  const nonStrikerStats = currentInnings.batting?.find(b => b.playerId === nonStriker);
  
  // Get current bowler
  const currentBowler = currentInnings.currentBowler;
  const bowlerStats = currentInnings.bowling?.find(b => b.playerId === currentBowler);

  // Calculate strike rates and economy
  const getStrikeRate = (runs, balls) => balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
  const getEconomy = (runs, overs) => overs > 0 ? (runs / overs).toFixed(2) : '0.00';
  
  // Calculate current run rate
  const currentRunRate = currentInnings.overs > 0 
    ? (currentInnings.runs / currentInnings.overs).toFixed(2) 
    : '0.00';

  // Calculate partnership
  const partnership = (strikerStats?.runsScored || 0) + (nonStrikerStats?.runsScored || 0);
  const partnershipBalls = (strikerStats?.ballsFaced || 0) + (nonStrikerStats?.ballsFaced || 0);

  // Calculate target info (for 2nd innings)
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

  // Get last 6 balls (mock - you'll need to implement ball history)
  const lastBalls = ['1', '4', '6', 'W', '0', '2'];

  return (
   <div className="min-h-screen bg-transparent relative overflow-hidden">
 {/* Bottom Score Bar */}
<div className="fixed bottom-0 left-0 right-0 z-50">
  <div className="bg-black/90 border-t-4 border-emerald-500 shadow-lg">
    {/* Top row - Teams & Score */}
    <div className="px-6 py-3 flex items-center justify-between max-w-screen-2xl mx-auto">
      
      {/* Left - Batting Team */}
      <div className="flex items-center space-x-4 flex-1">
        <div className="bg-emerald-600 px-3 py-1 rounded-md shadow">
          <span className="text-white font-bold uppercase text-sm">
            {battingTeam?.name || 'Batting'}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-black text-white">
            {currentInnings.runs}
          </span>
          <span className="text-3xl font-bold text-red-400">
            /{currentInnings.wickets}
          </span>
          <span className="text-lg text-gray-300 ml-2">
            ({currentInnings.overs?.toFixed(1) || '0.0'})
          </span>
        </div>
        {match.status === "live" && (
          <div className="flex items-center space-x-2 ml-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 font-semibold text-sm">LIVE</span>
          </div>
        )}
      </div>

      {/* Center - Match Info */}
      <div className="flex flex-col items-center flex-1 text-center">
        <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
          {liveData.innings.length === 1 ? "1st Innings" : "2nd Innings"} • T{match.overs}
        </span>
        <span className="text-yellow-400 font-black text-lg">
          CRR: {currentRunRate}
        </span>
        {previousInnings && (
          <span className="text-red-400 text-xs mt-1">
            Target {previousInnings.runs + 1}
          </span>
        )}
      </div>

      {/* Right - Bowling Team */}
      <div className="flex items-center justify-end space-x-4 flex-1">
        <div className="bg-blue-600 px-3 py-1 rounded-md shadow">
          <span className="text-white font-bold uppercase text-sm">
            {bowlingTeam?.name || "Bowling"}
          </span>
        </div>
      </div>
    </div>

    {/* Bottom row - Batters & Bowler */}
    <div className="bg-slate-800 px-6 py-2 border-t border-slate-700">
      <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
        
        {/* Left - Batters */}
        <div className="flex flex-col space-y-1 text-white text-sm">
          {strikerStats && (
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-semibold">
                {players[striker]?.name || "Striker"} *
              </span>
              <span>{strikerStats.runsScored} ({strikerStats.ballsFaced})</span>
              <span className="text-amber-400 text-xs">
                SR: {getStrikeRate(strikerStats.runsScored, strikerStats.ballsFaced)}
              </span>
            </div>
          )}
          {nonStrikerStats && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 font-semibold">
                {players[nonStriker]?.name || "Non-Striker"}
              </span>
              <span>{nonStrikerStats.runsScored} ({nonStrikerStats.ballsFaced})</span>
              <span className="text-amber-400 text-xs">
                SR: {getStrikeRate(nonStrikerStats.runsScored, nonStrikerStats.ballsFaced)}
              </span>
            </div>
          )}
        </div>

        {/* Right - Bowler */}
        {currentBowler && bowlerStats && (
          <div className="text-right text-white text-sm">
            <div className="font-semibold">{players[currentBowler]?.name}</div>
            <div className="font-mono">
              {bowlerStats.oversBowled?.toFixed(1) || "0.0"}-
              {bowlerStats.runsConceded || 0}-
              {bowlerStats.wickets?.length || 0}
            </div>
            <div className="text-red-400 text-xs">
              Econ {getEconomy(bowlerStats.runsConceded, bowlerStats.oversBowled)}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
</div>

  );
}