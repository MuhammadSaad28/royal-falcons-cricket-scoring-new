import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Target } from 'lucide-react';

export default function ScoreCard({ match, liveData, teams, players }) {
  const [activeInnings, setActiveInnings] = useState(0);

  if (!liveData || !liveData.innings || liveData.innings.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 text-center border border-gray-700">
        <p className="text-gray-400">No scoring data available yet.</p>
      </div>
    );
  }

  const calculateStrikeRate = (runs, balls) => {
    if (balls === 0) return '0.0';
    return ((runs / balls) * 100).toFixed(1);
  };

  const calculateEconomy = (runs, overs) => {
  if (!overs || overs <= 0) return "0.00";

  // overs = 0.2 means 0 overs 2 balls
  const fullOvers = Math.floor(overs);         // e.g. 0 from 0.2
  const ballsPart = Math.round((overs % 1) * 10); // e.g. 2 from 0.2

  const totalBalls = fullOvers * 6 + ballsPart;
  const actualOvers = totalBalls / 6;

  return actualOvers > 0 ? (runs / actualOvers).toFixed(2) : "0.00";
};

  const innings = liveData.innings[activeInnings];
  const battingTeam = teams[innings.teamId];
  const bowlingTeamId = innings.teamId === match.team1 ? match.team2 : match.team1;
  const bowlingTeam = teams[bowlingTeamId];

//   const currentRunRate = innings.overs > 0 
//     ? (innings.runs / innings.overs).toFixed(2) 
//     : '0.00';

// const currentRunRate = innings?.overs > 0 && innings?.wickets < match.totalPlayersPerTeam - 1 ? (innings.runs / innings.overs).toFixed(2) : innings?.overs > 0 && innings?.wickets >= match.totalPlayersPerTeam - 1 ? (innings.runs / match.overs) : '0.00';
const totalBalls = innings?.totalBalls || 0; // innings ke andar balls ka field hai
const oversFraction = totalBalls / 6; // balls ko overs me convert karo

const currentRunRate =
  oversFraction > 0 && innings?.wickets < match.totalPlayersPerTeam - 1
    ? (innings.runs / oversFraction).toFixed(2)
    : oversFraction > 0 && innings?.wickets >= match.totalPlayersPerTeam - 1
    ? (innings.runs / match.overs).toFixed(2)
    : "0.00";


  const totalExtras = Object.values(innings.extraRuns || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Innings Selector */}
      {liveData.innings.length > 1 && (
        <div className="flex gap-2">
          {liveData.innings.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveInnings(idx)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeInnings === idx
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {idx === 0 ? '1st' : '2nd'} Innings
            </button>
          ))}
        </div>
      )}

      {/* Main Scorecard */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white text-2xl font-black mb-1">
                {battingTeam?.name || 'Batting Team'}
              </h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-white text-5xl font-black">
                  {innings.runs}
                </span>
                <span className="text-yellow-300 text-3xl font-bold">
                  /{innings.wickets}
                </span>
                <span className="text-blue-200 text-xl ml-2">
                  ({innings.overs?.toFixed(1)} ov)
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 mb-2">
                <div className="text-blue-100 text-xs font-bold uppercase tracking-wider">
                  Current RR
                </div>
                <div className="text-white text-2xl font-black">
                  {currentRunRate}
                </div>
              </div>
              <div className="text-blue-100 text-sm">
                vs {bowlingTeam?.name || 'Bowling Team'}
              </div>
            </div>
          </div>
        </div>

        {/* Batting Scorecard */}
        <div className="p-6 bg-gray-800/50">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            <h4 className="text-white font-black text-lg uppercase tracking-wide">
              Batting Performance
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-700">
                  <th className="text-left py-3 px-2">Batsman</th>
                  <th className="text-center py-3 px-2">R</th>
                  <th className="text-center py-3 px-2">B</th>
                  <th className="text-center py-3 px-2">4s</th>
                  <th className="text-center py-3 px-2">6s</th>
                  <th className="text-center py-3 px-2">SR</th>
                </tr>
              </thead>
              <tbody>
                {innings.batting?.map((batsman, index) => {
                  const player = players[batsman.playerId];
                  const isOnCrease = innings.battersOnCrease?.includes(batsman.playerId);
                  const isStriker = innings.battersOnCrease?.[0] === batsman.playerId;
                  
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-700/50 transition-colors ${
                        isOnCrease ? 'bg-green-600/10' : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          {isOnCrease && (
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          )}
                          <div>
                            <div className="flex items-center space-x-1">
                              <span className="text-white font-semibold">
                                {player?.name || 'Unknown'}
                              </span>
                              {isStriker && (
                                <span className="text-green-400 font-black">★</span>
                              )}
                            </div>
                            {!batsman.out && isOnCrease && (
                                <div className="text-green-400 text-xs mt-0.5 font-medium">
                                    Not Out
                                </div>
                 ) }
                            {batsman.out && (
                              <div className="text-red-400 text-xs mt-0.5 font-medium">
                                {batsman.outType}
                                {batsman.outBy && ` b ${players[batsman.outBy]?.name || 'Unknown'}`}
                                {batsman.caughtBy && ` c ${players[batsman.caughtBy]?.name || 'Unknown'}`}
                              </div>
                            )}
                            {!batsman.out && !isOnCrease && batsman.ballsFaced === 0 && (
                              <div className="text-gray-500 text-xs">Did not bat</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-white font-bold text-lg">
                          {batsman.runsScored}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-gray-300 font-medium">
                          {batsman.ballsFaced}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-blue-400 font-bold">
                          {batsman.fours || 0}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-purple-400 font-bold">
                          {batsman.sixes || 0}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-yellow-400 font-bold">
                          {calculateStrikeRate(batsman.runsScored, batsman.ballsFaced)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Extras */}
          {innings.extraRuns && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                <span className="text-gray-400 font-semibold">Extras</span>
                <span className="text-white font-bold text-lg">
                  {totalExtras}
                  <span className="text-gray-400 text-sm ml-2">
                    (wd {innings.extraRuns.wides}, nb {innings.extraRuns.noBalls}, 
                    b {innings.extraRuns.byes}, lb {innings.extraRuns.legByes})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between bg-blue-600/10 rounded-lg p-3 mt-2 border border-blue-500/30">
                <span className="text-blue-400 font-bold uppercase text-sm tracking-wider">
                  Total
                </span>
                <span className="text-white font-black text-2xl">
                  {innings.runs}/{innings.wickets}
                  <span className="text-gray-400 text-base ml-2">
                    ({innings.overs?.toFixed(1)} ov)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bowling Figures */}
        <div className="p-6 bg-gray-900/50 border-t border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1 h-6 bg-red-500 rounded-full"></div>
            <h4 className="text-white font-black text-lg uppercase tracking-wide">
              Bowling Performance
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-700">
                  <th className="text-left py-3 px-2">Bowler</th>
                  <th className="text-center py-3 px-2">O</th>
                  <th className="text-center py-3 px-2">M</th>
                  <th className="text-center py-3 px-2">R</th>
                  <th className="text-center py-3 px-2">W</th>
                  <th className="text-center py-3 px-2">Econ</th>
                </tr>
              </thead>
              <tbody>
                {innings.bowling?.map((bowler, index) => {
                  const player = players[bowler.playerId];
                  const isCurrentBowler = innings.currentBowler === bowler.playerId;
                  
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-700/50 transition-colors ${
                        isCurrentBowler ? 'bg-red-600/10' : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          {isCurrentBowler && (
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          )}
                          <span className="text-white font-semibold">
                            {player?.name || 'Unknown'}
                          </span>
                          {isCurrentBowler && (
                            <span className="text-red-400 font-black">●</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-white font-bold">
                          {bowler.oversBowled?.toFixed(1) || '0.0'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-gray-400 font-medium">
                          0
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-yellow-400 font-bold text-lg">
                          {bowler.runsConceded || 0}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-red-400 font-bold text-lg">
                          {bowler.wickets?.length || 0}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="text-orange-400 font-bold">
                          {calculateEconomy(bowler.runsConceded, bowler.oversBowled)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fall of Wickets */}
        {innings.batting?.filter(b => b.out).length > 0 && (
          <div className="p-6 bg-gray-800/50 border-t border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
              <h4 className="text-white font-black text-lg uppercase tracking-wide">
                Fall of Wickets
              </h4>
            </div>
            <div className="flex flex-wrap gap-3">
              {innings.batting
                ?.filter(b => b.out)
                .map((batsman, idx) => {
                  const player = players[batsman.playerId];
                  // Calculate score at wicket (approximate)
                  const wicketNumber = idx + 1;
                  
                  return (
                    <div 
                      key={idx}
                      className="bg-gray-700/50 rounded-lg px-4 py-2 border border-gray-600"
                    >
                      <div className="text-red-400 text-xs font-bold mb-1">
                        {wicketNumber}-{batsman.runsScored}
                      </div>
                      <div className="text-white text-sm font-semibold">
                        {player?.name || 'Unknown'}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {batsman.runsScored}({batsman.ballsFaced})
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Partnership (if batting) */}
        {/* {innings.battersOnCrease?.length === 2 && (
          <div className="p-6 bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-t border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Current Partnership
                </div>
                <div className="flex items-center space-x-4">
                  {innings.battersOnCrease.map((batterId, idx) => {
                    const batter = innings.batting?.find(b => b.playerId === batterId);
                    const player = players[batterId];
                    return (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-white font-semibold text-sm">
                          {player?.name || 'Unknown'}
                        </span>
                        <span className="text-green-400 font-bold">
                          {batter?.runsScored || 0}({batter?.ballsFaced || 0})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 text-3xl font-black">
                  {innings.batting
                    ?.filter(b => innings.battersOnCrease.includes(b.playerId))
                    .reduce((sum, b) => sum + b.runsScored, 0)}
                </div>
                <div className="text-gray-400 text-sm">
                  ({innings.batting
                    ?.filter(b => innings.battersOnCrease.includes(b.playerId))
                    .reduce((sum, b) => sum + b.ballsFaced, 0)} balls)
                </div>
              </div>
            </div>
          </div>
        )} */}
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Highest Score */}
        {innings.batting && innings.batting.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
            <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
              Highest Score
            </div>
            {(() => {
              const topScorer = [...innings.batting].sort((a, b) => b.runsScored - a.runsScored)[0];
              const player = players[topScorer?.playerId];
              return (
                <div>
                  <div className="text-white text-2xl font-black">
                    {topScorer?.runsScored || 0}
                  </div>
                  <div className="text-purple-300 text-sm font-semibold mt-1">
                    {player?.name || 'Unknown'}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    ({topScorer?.ballsFaced || 0} balls, SR: {calculateStrikeRate(topScorer?.runsScored || 0, topScorer?.ballsFaced || 0)})
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Best Bowling */}
        {innings.bowling && innings.bowling.length > 0 && (
          <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 rounded-xl p-4 border border-red-500/30">
            <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              Best Bowling
            </div>
            {(() => {
              const bestBowler = [...innings.bowling].sort((a, b) => 
                (b.wickets?.length || 0) - (a.wickets?.length || 0) ||
                (a.runsConceded || 999) - (b.runsConceded || 999)
              )[0];
              const player = players[bestBowler?.playerId];
              return (
                <div>
                  <div className="text-white text-2xl font-black">
                    {bestBowler?.wickets?.length || 0}/{bestBowler?.runsConceded || 0}
                  </div>
                  <div className="text-red-300 text-sm font-semibold mt-1">
                    {player?.name || 'Unknown'}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    ({bestBowler?.oversBowled?.toFixed(1) || '0.0'} ov, Econ: {calculateEconomy(bestBowler?.runsConceded || 0, bestBowler?.oversBowled || 0)})
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Run Rate */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 rounded-xl p-4 border border-yellow-500/30">
          <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">
            Run Rate
          </div>
          <div className="text-white text-2xl font-black">
            {currentRunRate}
          </div>
          <div className="text-yellow-300 text-sm font-semibold mt-1">
            per over
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {innings.runs} runs in {innings.overs?.toFixed(1) || '0.0'} overs
          </div>
        </div>
      </div>
    </div>
  );
}