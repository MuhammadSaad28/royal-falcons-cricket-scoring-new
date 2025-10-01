import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Check } from 'lucide-react';

export default function PlayerSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [allPlayers, setAllPlayers] = useState({});
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMatchData();
  }, [id]);

  const fetchMatchData = async () => {
    try {
      // Fetch match
      const matchDoc = await getDoc(doc(db, 'matches', id));
      if (!matchDoc.exists()) {
        navigate('/matches');
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

      // Fetch all players for both teams
      const playersQuery = query(
        collection(db, 'players'),
        where('teamId', 'in', [matchData.team1, matchData.team2])
      );
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = {};
      
      playersSnapshot.docs.forEach(doc => {
        const player = { id: doc.id, ...doc.data() };
        playersData[doc.id] = player;
      });

      setAllPlayers(playersData);

      // Initialize selected players
      setSelectedPlayers({
        [matchData.team1]: [],
        [matchData.team2]: []
      });

    } catch (error) {
      console.error('Error fetching match data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (teamId, playerId) => {
    setSelectedPlayers(prev => {
      const teamPlayers = prev[teamId] || [];
      const isSelected = teamPlayers.includes(playerId);
      
      if (isSelected) {
        return {
          ...prev,
          [teamId]: teamPlayers.filter(id => id !== playerId)
        };
      } else if (teamPlayers.length < match.totalPlayersPerTeam) {
        return {
          ...prev,
          [teamId]: [...teamPlayers, playerId]
        };
      }
      return prev;
    });
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'matches', id), {
        selectedPlayers,
        status: 'ready'
      });
      navigate(`/match/${id}/score`);
    } catch (error) {
      console.error('Error saving player selection:', error);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    return Object.values(selectedPlayers).every(
      teamPlayers => teamPlayers.length === match?.totalPlayersPerTeam
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-cricket-100 p-3 rounded-full mr-4">
                <Users className="w-6 h-6 text-cricket-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Select Playing XI</h1>
                <p className="text-gray-600">
                  Choose {match?.totalPlayersPerTeam} players for each team
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveSelection}
              disabled={!canProceed() || saving}
              className="bg-cricket-600 hover:bg-cricket-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Proceed to Toss'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[match?.team1, match?.team2].map(teamId => {
              const team = teams[teamId];
              const teamPlayers = Object.values(allPlayers).filter(p => p.teamId === teamId);
              const selectedCount = selectedPlayers[teamId]?.length || 0;

              return (
                <div key={teamId} className="border rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{team?.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCount === match?.totalPlayersPerTeam
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCount}/{match?.totalPlayersPerTeam} selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {teamPlayers.map(player => {
                      const isSelected = selectedPlayers[teamId]?.includes(player.id);
                      const canSelect = selectedCount < match?.totalPlayersPerTeam || isSelected;

                      return (
                        <button
                          key={player.id}
                          onClick={() => togglePlayerSelection(teamId, player.id)}
                          disabled={!canSelect}
                          className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                            isSelected
                              ? 'border-cricket-500 bg-cricket-50'
                              : canSelect
                              ? 'border-gray-200 hover:border-gray-300'
                              : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{player.name}</p>
                              <p className="text-sm text-gray-600">
                                Matches: {player.totalMatches} | Runs: {player.totalRunsScored}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-cricket-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}