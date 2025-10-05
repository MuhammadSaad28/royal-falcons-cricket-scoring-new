import { Link } from 'react-router-dom';

export default function MatchCard({ match, teams, compact = false, liveData }) {
  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'live':
        return `${baseClasses} bg-red-100 text-red-800 animate-pulse`;
      case 'upcoming':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const team1 = teams.find(t => t.id === match.team1);
  const team2 = teams.find(t => t.id === match.team2);

   const innings1 = liveData?.innings?.find(inn => inn.teamId === match.team1);
  const innings2 = liveData?.innings?.find(inn => inn.teamId === match.team2)



  return (
    <Link to={`/match/${match.id}`}>
      <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-cricket-500 overflow-hidden ${
        compact ? 'p-4' : 'p-6'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className={getStatusBadge(match.status)}>
                {match.status.toUpperCase()}
              </span>
              {match.status === 'live' && (
                <div className="flex items-center text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-1"></div>
                  <span className="text-xs font-medium">LIVE</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-cricket-100 rounded-full flex items-center justify-center">
                    <span className="text-cricket-700 font-bold text-sm">
                      {team1?.name?.charAt(0) || 'T1'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {team1?.name || 'Team 1'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {innings1 ? `${innings1.runs}/${innings1.wickets}` : "-/-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {innings1 ? `(${innings1.overs} overs)` : ""}
                  </p>
                </div>
              </div>

              <div className="text-center text-gray-500 text-sm font-medium">
                vs
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-cricket-100 rounded-full flex items-center justify-center">
                    <span className="text-cricket-700 font-bold text-sm">
                      {team2?.name?.charAt(0) || 'T2'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {team2?.name || 'Team 2'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {innings2 ? `${innings2.runs}/${innings2.wickets}` : "-/-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {innings2 ? `(${innings2.overs} overs)` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* {match.toss && (
              <div className="mt-3 text-sm text-gray-600">
                <p>
                  {teams.find(t => t.id === match.toss.winner?.id)?.name} won the toss and chose to {match.toss.decision}
                </p>
              </div>
            )} */}
            {/* Toss / Match Situation */}
<div className="mt-3 text-sm text-gray-600">
  {(() => {
    if (match.status === "upcoming" && match.toss) {
      // Toss info (before 1st inning or match just started)
      const tossWinner = teams.find(t => t.id === match.toss.winner)?.name;
      return (
        <p>{tossWinner} won the toss and chose to {match.toss.decision}</p>
      );
    }

    if (match.status === "live" && liveData?.innings?.length === 2) {
      // 2nd inning running → show required runs
      const innings1 = liveData.innings[0];
      const innings2 = liveData.innings[1];

      const teamBatting = teams.find(t => t.id === innings2.teamId)?.name;
      const target = innings1.runs + 1;
      const need = target - innings2.runs;

      return (
        <p>{teamBatting} need {need} runs to win</p>
      );
    }

    if (match.status === "completed" && liveData?.innings?.length === 2) {
      // Match completed → show result
      const innings1 = liveData.innings[0];
      const innings2 = liveData.innings[1];

      if (innings1.runs > innings2.runs) {
        const winner = teams.find(t => t.id === innings1.teamId)?.name;
        const margin = innings1.runs - innings2.runs;
        return <p>{winner} won by {margin} runs</p>;
      } else if (innings2.runs > innings1.runs) {
        const winner = teams.find(t => t.id === innings2.teamId)?.name;
        const wktsLeft = 10 - innings2.wickets;
        return <p>{winner} won by {wktsLeft} wickets</p>;
      } else {
        return <p>Match tied</p>;
      }
    }

    return null;
  })()}
</div>


            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {match.overs} overs • {new Date(match.createdAt?.seconds * 1000).toLocaleDateString()}
              </div>
              <div className="text-cricket-600 hover:text-cricket-700 text-sm font-medium">
                View Details →
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}