import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Overlay() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [players, setPlayers] = useState({});
  const [liveData, setLiveData] = useState(null);
  const [scorecardView, setScorecardView] = useState("none"); // 'none', 'team1_batting', 'team1_bowling', 'team2_batting', 'team2_bowling', 'summary'

  useEffect(() => {
    // Make body transparent
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.backgroundColor = "transparent";

    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  // Add CSS for transitions
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .animate-fade-out {
      animation: fadeOut 0.3s ease-out;
    }
  `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchMatch = async () => {
      try {
        const matchDoc = await getDoc(doc(db, "matches", id));
        if (!matchDoc.exists()) return;

        const matchData = { id: matchDoc.id, ...matchDoc.data() };
        setMatch(matchData);

        // Fetch teams
        const [team1Doc, team2Doc] = await Promise.all([
          getDoc(doc(db, "teams", matchData.team1)),
          getDoc(doc(db, "teams", matchData.team2)),
        ]);

        const teamsData = {
          [matchData.team1]: team1Doc.exists()
            ? { id: team1Doc.id, ...team1Doc.data() }
            : null,
          [matchData.team2]: team2Doc.exists()
            ? { id: team2Doc.id, ...team2Doc.data() }
            : null,
        };
        setTeams(teamsData);

        // Fetch all players from both teams
        const allPlayers = {};
        for (const teamId of [matchData.team1, matchData.team2]) {
          const teamPlayers = teamsData[teamId]?.players || [];
          for (const playerId of teamPlayers) {
            const playerDoc = await getDoc(doc(db, "players", playerId));
            if (playerDoc.exists()) {
              allPlayers[playerId] = { id: playerDoc.id, ...playerDoc.data() };
            }
          }
        }
        setPlayers(allPlayers);
      } catch (error) {
        console.error("Error fetching match:", error);
      }
    };

    fetchMatch();

    // Listen for live scoring updates
    const unsubscribe = onSnapshot(
      doc(db, "liveScoring", id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setLiveData(data);
          if (data.overlayType) {
            setScorecardView(data.overlayType);
          }
        }
      },
      (error) => {
        console.error("Error listening to live updates:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    if (liveData?.overlayType) {
      setScorecardView(liveData?.overlayType);
    }
  }, [liveData]);

  if (!match || !liveData) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }


  const currentInnings = liveData.innings[liveData.innings.length - 1];
  const previousInnings =
    liveData.innings.length > 1 ? liveData.innings[0] : null;

  const battingTeamId = currentInnings.teamId;
  const bowlingTeamId =
    battingTeamId === match.team1 ? match.team2 : match.team1;

  const battingTeam = teams[battingTeamId];
  const bowlingTeam = teams[bowlingTeamId];

  // Get current batsmen
  const striker = currentInnings.battersOnCrease?.[0];
  const nonStriker = currentInnings.battersOnCrease?.[1];

  const strikerStats = currentInnings.batting?.find(
    (b) => b.playerId === striker
  );
  const nonStrikerStats = currentInnings.batting?.find(
    (b) => b.playerId === nonStriker
  );

  // Get current bowler
  const currentBowler = currentInnings.currentBowler;
  const bowlerStats = currentInnings.bowling?.find(
    (b) => b.playerId === currentBowler
  );

  // Calculate strike rates and economy
  const getStrikeRate = (runs, balls) =>
    balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";

  const getEconomy = (runs, overs) => {
    if (!overs || overs <= 0) return "0.00";
    const fullOvers = Math.floor(overs);
    const ballsPart = Math.round((overs % 1) * 10);
    const totalBalls = fullOvers * 6 + ballsPart;
    const actualOvers = totalBalls / 6;
    return actualOvers > 0 ? (runs / actualOvers).toFixed(2) : "0.00";
  };

  const totalBalls = currentInnings.totalBalls || 0;
  const currentRunRate =
    totalBalls > 0
      ? (currentInnings.runs / (totalBalls / 6)).toFixed(2)
      : "0.00";

  // Calculate target info (for 2nd innings)
  let targetInfo = null;
  if (previousInnings) {
    const target = previousInnings.runs + 1;
    const required = target - currentInnings.runs;
    const ballsRemaining = match.overs * 6 - (currentInnings.totalBalls || 0);
    const requiredRunRate =
      ballsRemaining > 0
        ? ((required / ballsRemaining) * 6).toFixed(2)
        : "0.00";

    targetInfo = {
      target,
      required: required > 0 ? required : 0,
      balls: ballsRemaining > 0 ? ballsRemaining : 0,
      rrr: requiredRunRate,
    };
  }

  const matchFinished =
    targetInfo &&
    (currentInnings.runs >= targetInfo.target ||
      currentInnings.wickets >= match?.totalPlayersPerTeam ||
      (currentInnings.totalBalls || 0) >= match.overs * 6);

  const requiredRunRate =
    targetInfo && targetInfo.balls > 0
      ? ((targetInfo.required / targetInfo.balls) * 6).toFixed(2)
      : "0.00";

  // Helper functions for scorecards
  const calculateStrikeRate = (runs, balls) => {
    if (balls === 0) return "0.0";
    return ((runs / balls) * 100).toFixed(1);
  };

  const getInningsData = (inningsIndex) => {
    if (!liveData.innings[inningsIndex]) return null;
    const innings = liveData.innings[inningsIndex];
    const battingTeamId = innings.teamId;
    const bowlingTeamId =
      battingTeamId === match.team1 ? match.team2 : match.team1;

    return {
      innings,
      battingTeam: teams[battingTeamId],
      bowlingTeam: teams[bowlingTeamId],
      battingTeamId,
      bowlingTeamId,
    };
  };

  const renderBattingScorecard = (inningsIndex) => {
    const data = getInningsData(inningsIndex);
    if (!data) return null;

    const { innings, battingTeam, bowlingTeam } = data;
    const totalBalls = innings?.totalBalls || 0;
    const oversFraction = totalBalls / 6;
    const currentRunRate =
      oversFraction > 0 ? (innings.runs / oversFraction).toFixed(2) : "0.00";
    const totalExtras = Object.values(innings.extraRuns || {}).reduce(
      (a, b) => a + b,
      0
    );

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br pointer-events-auto animate-fade-in">
        {/* TV-Style Batting Scorecard */}
        <div className="w-full h-full flex flex-col p-8">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-2 rounded-t-xl flex items-center justify-between">
            <div className="flex items-baseline gap-6">
              <h2 className="text-white text-4xl font-black">
                {battingTeam?.name}
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-red-100 text-2xl">
                  vs {bowlingTeam?.name}
                </span>
                {/* <span className="text-white text-5xl font-black">{innings.runs}</span>
              <span className="text-yellow-300 text-3xl font-bold">/{innings.wickets}</span>
              <span className="text-blue-100 text-2xl ml-2">({innings.overs?.toFixed(1)})</span> */}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-blue-200 text-sm">RUN RATE</div>
                <div className="text-white text-3xl font-black">
                  {currentRunRate}
                </div>
              </div>
              <div className="bg-blue-500 px-4 py-2 rounded">
                <div className="text-blue-100 text-xs uppercase">
                  {inningsIndex === 0 ? "1st" : "2nd"} Innings
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm rounded-b-xl overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="bg-slate-800/80 px-8 py-2 border-b-2 border-blue-500">
              <div className="grid grid-cols-12 gap-4 text-gray-300 text-sm font-bold uppercase">
                <div className="col-span-5">Batsman</div>
                <div className="text-center">R</div>
                <div className="text-center">B</div>
                <div className="text-center">4s</div>
                <div className="text-center">6s</div>
                <div className="text-center">SR</div>
                <div className="col-span-2">Dismissal</div>
              </div>
            </div>

            {/* Batsmen List */}
            <div className="flex-1 overflow-hidden px-8 py-4">
              <div className="space-y-1">
                {innings.batting
                  ?.slice(0, liveData?.totalPlayersPerTeam || 12)
                  .map((batsman, index) => {
                    const player = players[batsman.playerId];
                    const isOnCrease = innings.battersOnCrease?.includes(
                      batsman.playerId
                    );

                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-12 gap-4 items-center px-4 rounded ${
                          isOnCrease
                            ? "bg-green-500/20 border-l-4 border-green-400"
                            : "bg-slate-800/30"
                        }`}
                      >
                        <div className="col-span-5 flex items-center gap-2">
                          {isOnCrease && (
                            <span className="text-green-400 text-md">●</span>
                          )}
                          <span className="text-white font-bold text-md">
                            {player?.name || "Unknown"}
                          </span>
                          {isOnCrease && (
                            <span className="text-green-400 text-sm">*</span>
                          )}
                        </div>
                        <div className="text-center text-white font-bold text-md">
                          {batsman.runsScored}
                        </div>
                        <div className="text-center text-gray-300 text-md">
                          {batsman.ballsFaced}
                        </div>
                        <div className="text-center text-blue-400 font-bold text-md">
                          {batsman.fours || 0}
                        </div>
                        <div className="text-center text-purple-400 font-bold text-md">
                          {batsman.sixes || 0}
                        </div>
                        <div className="text-center text-yellow-400 font-bold text-md">
                          {calculateStrikeRate(
                            batsman.runsScored,
                            batsman.ballsFaced
                          )}
                        </div>
                        <div className="col-span-2 text-red-400 text-sm">
                          {batsman.out ? (
                            <span>
                              {batsman.outType}
                              {batsman.outBy &&
                                ` b ${players[batsman.outBy]?.name
                                  ?.split(" ")
                                  .pop()}`}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer Stats */}
            <div className="bg-slate-800/80 px-8 py-1 border-t-2 border-blue-500">
              <div className="flex justify-between items-center">
                <div className="flex gap-8 text-lg">
                  <span className="text-gray-300">
                    Extras:{" "}
                    <span className="text-white font-bold">{totalExtras}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      (wd {innings.extraRuns?.wides || 0}, nb{" "}
                      {innings.extraRuns?.noBalls || 0}, b{" "}
                      {innings.extraRuns?.byes || 0}, lb{" "}
                      {innings.extraRuns?.legByes || 0})
                    </span>
                  </span>
                </div>
                <div className="text-white text-2xl font-black">
                  TOTAL: {innings.runs}/{innings.wickets} (
                  {innings.overs?.toFixed(1)} ov)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBowlingScorecard = (inningsIndex) => {
    const data = getInningsData(inningsIndex);
    if (!data) return null;

    const { innings, battingTeam, bowlingTeam } = data;
    const totalExtras = Object.values(innings.extraRuns || {}).reduce(
      (a, b) => a + b,
      0
    );

    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-auto animate-fade-in">
        {/* TV-Style Bowling Scorecard */}
        <div className="w-full h-full flex flex-col p-8">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 px-8 py-2 rounded-t-xl flex items-center justify-between">
            <div className="flex items-baseline gap-6">
              <h2 className="text-white text-4xl font-black">
                {bowlingTeam?.name}
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-red-100 text-2xl">
                  vs {battingTeam?.name}
                </span>
                {/* <span className="text-white text-3xl font-bold ml-4">{innings.runs}/{innings.wickets}</span> */}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-red-200 text-sm">OVERS</div>
                <div className="text-white text-3xl font-black">
                  {innings.overs?.toFixed(1)}
                </div>
              </div>
              <div className="bg-red-500 px-4 py-2 rounded">
                <div className="text-red-100 text-xs uppercase">
                  {inningsIndex === 0 ? "1st" : "2nd"} Innings
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm rounded-b-xl overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="bg-slate-800/80 px-8 py-2 border-b-2 border-red-500">
              <div className="grid grid-cols-9 gap-4 text-gray-300 text-sm font-bold uppercase">
                <div className="col-span-4">Bowler</div>
                <div className="text-center">O</div>
                <div className="text-center">M</div>
                <div className="text-center">R</div>
                <div className="text-center">W</div>
                <div className="text-center">Econ</div>
              </div>
            </div>

            {/* Bowlers List */}
            <div className="flex-1 overflow-hidden px-8 py-4">
              <div className="space-y-1">
                {innings.bowling?.map((bowler, index) => {
                  const player = players[bowler.playerId];
                  const isCurrentBowler =
                    innings.currentBowler === bowler.playerId;

                  return (
                    <div
                      key={index}
                      className={`grid grid-cols-9 gap-4 items-center px-4 rounded ${
                        isCurrentBowler
                          ? "bg-red-500/20 border-l-4 border-red-400"
                          : "bg-slate-800/30"
                      }`}
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        {isCurrentBowler && (
                          <span className="text-red-400 text-md">●</span>
                        )}
                        <span className="text-white font-bold text-md">
                          {player?.name || "Unknown"}
                        </span>
                      </div>
                      <div className="text-center text-white font-bold text-md">
                        {bowler.oversBowled?.toFixed(1) || "0.0"}
                      </div>
                      <div className="text-center text-gray-400 text-md">0</div>
                      <div className="text-center text-yellow-400 font-bold text-md">
                        {bowler.runsConceded || 0}
                      </div>
                      <div className="text-center text-red-400 font-bold text-md">
                        {bowler.wickets?.length || 0}
                      </div>
                      <div className="text-center text-orange-400 font-bold text-md">
                        {getEconomy(bowler.runsConceded, bowler.oversBowled)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Footer */}
            <div className="bg-slate-800/80 px-8 py-1 border-t-2 border-red-500">
              {/* Extras */}
              <div className="flex justify-between items-center">
                <div className="flex gap-8 text-lg">
                  <span className="text-gray-300">
                    Extras:{" "}
                    <span className="text-white font-bold">{totalExtras}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      (wd {innings.extraRuns?.wides || 0}, nb{" "}
                      {innings.extraRuns?.noBalls || 0}, b{" "}
                      {innings.extraRuns?.byes || 0}, lb{" "}
                      {innings.extraRuns?.legByes || 0})
                    </span>
                  </span>
                </div>
                <div className="text-white text-2xl font-black">
                  TOTAL: {innings.runs}/{innings.wickets} (
                  {innings.overs?.toFixed(1)} ov)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMatchSummary = () => {
    const innings1 = liveData.innings[0];
    const innings2 = liveData.innings[1];

    const team1Id = innings1.teamId;
    const team2Id = team1Id === match.team1 ? match.team2 : match.team1;

    const team1Data = teams[team1Id];
    const team2Data = teams[team2Id];

    // Determine match result
    let matchResult = "";
    if (innings2) {
      const target = innings1.runs + 1;
      if (innings2.runs >= target) {
        const margin = `${
          match.totalPlayersPerTeam - innings2.wickets
        } wickets`;
        matchResult = `${team2Data?.name} won by ${margin}`;
      } else if (
        innings2.wickets >= match.totalPlayersPerTeam ||
        (innings2.totalBalls || 0) >= match.overs * 6
      ) {
        const margin = `${target - innings2.runs - 1} runs`;
        matchResult = `${team1Data?.name} won by ${margin}`;
      }
    }

    // Get Team 1 top performers
    const team1Batsmen =
      innings1.batting
        ?.filter((b) => b.runsScored > 0)
        .sort((a, b) => b.runsScored - a.runsScored)
        .slice(0, 3) || [];
    const team1Bowlers =
      innings2?.bowling
        ?.filter((b) => b.oversBowled > 0)
        .sort(
          (a, b) =>
            (b.wickets?.length || 0) - (a.wickets?.length || 0) ||
            (a.runsConceded || 999) - (b.runsConceded || 999)
        )
        .slice(0, 3) || [];

    // Get Team 2 top performers
    const team2Batsmen =
      innings2?.batting
        ?.filter((b) => b.runsScored > 0)
        .sort((a, b) => b.runsScored - a.runsScored)
        .slice(0, 3) || [];
    const team2Bowlers =
      innings1.bowling
        ?.filter((b) => b.oversBowled > 0)
        .sort(
          (a, b) =>
            (b.wickets?.length || 0) - (a.wickets?.length || 0) ||
            (a.runsConceded || 999) - (b.runsConceded || 999)
        )
        .slice(0, 3) || [];

    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-auto p-6 animate-fade-in">
        <div className="w-full h-full flex flex-col gap-2">
          {/* Match Result Header */}
          {/* <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 px-6 py-2 rounded-xl text-center">
          <div className="text-emerald-200 text-xs font-bold uppercase">Match Summary • T{match.overs}</div>
          {matchResult && (
            <div className="text-yellow-300 text-xl font-black">{matchResult}</div>
          )}
        </div> */}

          {/* Team A Section */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-1.5 rounded-t-xl flex items-center justify-between">
              <h3 className="text-white text-2xl font-black">
                {team1Data?.name}
              </h3>
              <div className="text-white text-lg font-bold">
                {innings1.runs}/{innings1.wickets} ({innings1.overs?.toFixed(1)}
                )
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 bg-black/40 rounded-b-xl px-2 min-h-0 overflow-hidden">
              {/* Grid 1 - Team A Batsmen */}
              <div className="bg-slate-800/60 rounded-lg p-2 overflow-hidden flex flex-col min-h-0">
                <h4 className="text-blue-300 text-sm font-bold mb-1.5 border-b border-blue-500 pb-1">
                  TOP BATSMEN
                </h4>
                <div className="space-y-1 flex-1">
                  {team1Batsmen.map((batsman, idx) => {
                    const player = players[batsman.playerId];
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-700/50 rounded px-2 py-0.5"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-white font-bold text-xs truncate">
                            {player?.name || "Unknown"}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {batsman.ballsFaced}b • {batsman.fours || 0}x4 •{" "}
                            {batsman.sixes || 0}x6
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-white text-lg font-black">
                            {batsman.runsScored}
                          </div>
                          <div className="text-yellow-400 text-xs">
                            SR:{" "}
                            {calculateStrikeRate(
                              batsman.runsScored,
                              batsman.ballsFaced
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid 2 - Team A Bowlers */}
              <div className="bg-slate-800/60 rounded-lg p-2 overflow-hidden flex flex-col min-h-0">
                <h4 className="text-blue-300 text-sm font-bold mb-1.5 border-b border-blue-500 pb-1">
                  TOP BOWLERS
                </h4>
                <div className="space-y-1 overflow-y-auto flex-1">
                  {team1Bowlers.map((bowler, idx) => {
                    const player = players[bowler.playerId];
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-700/50 rounded px-2 py-0.5"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-white font-bold text-xs truncate">
                            {player?.name || "Unknown"}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Econ:{" "}
                            {getEconomy(
                              bowler.runsConceded,
                              bowler.oversBowled
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex flex-row items-end gap-2">
                            <div className="text-red-400 text-lg font-black">
                              {bowler.wickets?.length || 0}/
                              {bowler.runsConceded || 0}
                            </div>
                            <div className="text-yellow-400 text-sm">
                              ({bowler.oversBowled?.toFixed(1) || "0.0"})
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Team B Section */}
          {innings2 && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-1.5 rounded-t-xl flex items-center justify-between">
                <h3 className="text-white text-2xl font-black">
                  {team2Data?.name}
                </h3>
                <div className="text-white text-lg font-bold">
                  {innings2.runs}/{innings2.wickets} (
                  {innings2.overs?.toFixed(1)})
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2 bg-black/40 rounded-b-xl px-2 min-h-0 overflow-hidden">
                {/* Grid 3 - Team B Batsmen */}
                <div className="bg-slate-800/60 rounded-lg p-2 overflow-hidden flex flex-col min-h-0">
                  <h4 className="text-red-300 text-sm font-bold mb-1.5 border-b border-red-500 pb-1">
                    TOP BATSMEN
                  </h4>
                  <div className="space-y-1 flex-1">
                    {team2Batsmen.map((batsman, idx) => {
                      const player = players[batsman.playerId];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-700/50 rounded px-2 py-0.5"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-white font-bold text-xs truncate">
                              {player?.name || "Unknown"}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {batsman.ballsFaced}b • {batsman.fours || 0}x4 •{" "}
                              {batsman.sixes || 0}x6
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-white text-lg font-black">
                              {batsman.runsScored}
                            </div>
                            <div className="text-yellow-400 text-xs">
                              SR:{" "}
                              {calculateStrikeRate(
                                batsman.runsScored,
                                batsman.ballsFaced
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grid 4 - Team B Bowlers */}
                <div className="bg-slate-800/60 rounded-lg p-2 overflow-hidden flex flex-col min-h-0">
                  <h4 className="text-red-300 text-sm font-bold mb-1.5 border-red-500 pb-1">
                    TOP BOWLERS
                  </h4>
                  <div className="space-y-1 overflow-y-auto flex-1">
                    {team2Bowlers.map((bowler, idx) => {
                      const player = players[bowler.playerId];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-700/50 rounded px-2 py-1"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-white font-bold text-xs truncate">
                              {player?.name || "Unknown"}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Econ:{" "}
                              {getEconomy(
                                bowler.runsConceded,
                                bowler.oversBowled
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex flex-row items-end gap-2">
                              <div className="text-red-400 text-lg font-black">
                                {bowler.wickets?.length || 0}/
                                {bowler.runsConceded || 0}
                              </div>
                              <div className="text-yellow-400 text-sm">
                                ({bowler.oversBowled?.toFixed(1) || "0.0"})
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {matchResult && (
         <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 px-6 py-2 rounded-xl text-center">
            <div className="text-yellow-300 text-xl font-black">{matchResult}</div>
        </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Render scorecard views */}
      {scorecardView === "team1_batting" && renderBattingScorecard(0)}
      {scorecardView === "team1_bowling" && renderBowlingScorecard(0)}
      {scorecardView === "team2_batting" &&
        liveData.innings.length > 1 &&
        renderBattingScorecard(1)}
      {scorecardView === "team2_bowling" &&
        liveData.innings.length > 1 &&
        renderBowlingScorecard(1)}
      {scorecardView === "summary" && renderMatchSummary()}

      {/* Bottom Score Bar - Hide when showing scorecards */}
      {scorecardView === "none" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto animate-fade-in">
          <div className="bg-black/90 border-t-4 border-emerald-500 shadow-lg">
            {/* Top row - Teams & Score */}
            <div className="px-6 py-3 flex items-center justify-between max-w-screen-2xl mx-auto">
              {/* Left - Batting Team */}
              <div className="flex items-center space-x-4 flex-1">
                <div className="bg-emerald-600 px-3 py-1 rounded-md shadow">
                  <span className="text-white font-bold uppercase text-sm">
                    {battingTeam?.name || "Batting"}
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
                    ({currentInnings.overs?.toFixed(1) || "0.0"})
                  </span>
                </div>
                {match.status === "live" && (
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-semibold text-sm">
                      LIVE
                    </span>
                  </div>
                )}
              </div>

              {/* Center - Match Info */}
              <div className="flex flex-col items-center flex-1 text-center">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
                  {liveData.innings.length === 1
                    ? "1st Innings"
                    : "2nd Innings"}{" "}
                  • T{match.overs}
                </span>
                {!matchFinished && (
                  <div className="flex items-baseline space-x-3">
                    <span className="text-yellow-400 font-black text-lg">
                      CRR: {currentRunRate}
                    </span>
                    {previousInnings && targetInfo && (
                      <span className="text-yellow-400 font-black text-lg">
                        RRR: {requiredRunRate}
                      </span>
                    )}
                  </div>
                )}
                {matchFinished && (
                  <div className="flex flex-col items-center text-white text-xl">
                    <span className="text-green-400 font-semibold">
                      {currentInnings.runs >= targetInfo.target
                        ? battingTeam?.name
                        : bowlingTeam?.name}{" "}
                      won by{" "}
                      {currentInnings.runs >= targetInfo.target
                        ? match.totalPlayersPerTeam - currentInnings.wickets - 1
                        : targetInfo.required}{" "}
                      {currentInnings.runs >= targetInfo.target
                        ? "wicket"
                        : "runs"}
                    </span>
                  </div>
                )}
              </div>

              {/* Right - Bowling Team */}
              <div className="flex items-center justify-end space-x-4 flex-1">
                {previousInnings && (
                  <span className="text-red-400 text-xl">
                    Target {previousInnings.runs + 1}
                  </span>
                )}
                <span className="text-gray-300">
                  Extras: {currentInnings.extraRuns?.wides || 0} wd,{" "}
                  {currentInnings.extraRuns?.noBalls || 0} nb,{" "}
                  {currentInnings.extraRuns?.byes || 0} b,{" "}
                  {currentInnings.extraRuns?.legByes || 0} lb
                </span>
                <div className="bg-blue-600 px-3 py-1 rounded-md shadow">
                  <span className="text-white font-bold uppercase text-sm">
                    {bowlingTeam?.name || "Bowling"}
                  </span>
                </div>
              </div>
            </div>

            {!matchFinished && (
              <div className="bg-slate-800 px-6 py-2 border-t border-slate-700">
                <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
                  {/* Left - Batters */}
                  <div className="flex flex-col space-y-1 text-white text-lg">
                    {strikerStats && (
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-400 font-semibold">
                          {players[striker]?.name || "Striker"} *
                        </span>
                        <span>
                          {strikerStats.runsScored} ({strikerStats.ballsFaced})
                        </span>
                        <span className="text-amber-400 text-sm">
                          SR:{" "}
                          {getStrikeRate(
                            strikerStats.runsScored,
                            strikerStats.ballsFaced
                          )}
                        </span>
                      </div>
                    )}
                    {nonStrikerStats && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-300 font-semibold">
                          {players[nonStriker]?.name || "Non-Striker"}
                        </span>
                        <span>
                          {nonStrikerStats.runsScored} (
                          {nonStrikerStats.ballsFaced})
                        </span>
                        <span className="text-amber-400 text-sm">
                          SR:{" "}
                          {getStrikeRate(
                            nonStrikerStats.runsScored,
                            nonStrikerStats.ballsFaced
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center - Target Info */}
                  {matchFinished && (
                    <div className="flex flex-col items-center text-white text-xl">
                      <span className="text-green-400 font-semibold">
                        {currentInnings.runs >= targetInfo.target
                          ? battingTeam?.name
                          : bowlingTeam?.name}{" "}
                        won by{" "}
                        {currentInnings.runs >= targetInfo.target
                          ? match.totalPlayersPerTeam -
                            currentInnings.wickets -
                            1
                          : targetInfo.required}{" "}
                        {currentInnings.runs >= targetInfo.target
                          ? "wicket"
                          : "runs"}
                      </span>
                    </div>
                  )}

                  {targetInfo && !matchFinished && (
                    <div className="flex flex-col items-center text-white text-xl">
                      <span className="text-yellow-400 font-semibold">
                        Need {targetInfo.required} runs in {targetInfo.balls}{" "}
                        balls
                      </span>
                    </div>
                  )}

                  {/* Right - Bowler */}
                  {currentBowler && bowlerStats && (
                    <div className="text-right text-white text-lg">
                      <div className="flex flex-row gap-4 items-end">
                        <div className="font-mono">
                          {bowlerStats.oversBowled?.toFixed(1) || "0.0"}-
                          {bowlerStats.runsConceded || 0}-
                          {bowlerStats.wickets?.length || 0}
                        </div>
                        <div className="font-semibold">
                          {players[currentBowler]?.name}
                        </div>
                      </div>
                      <div className="text-red-400 text-xs">
                        Econ{" "}
                        {getEconomy(
                          bowlerStats.runsConceded,
                          bowlerStats.oversBowled
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
