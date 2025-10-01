import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Settings, Save } from 'lucide-react';

export default function MatchSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState(null);
  const [settings, setSettings] = useState({
    overs: 20,
    maximumOversPerPlayer: 4,
    totalPlayersPerTeam: 11,
    powerplayOvers: 6,
    drsReviews: 2
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', id));
      if (matchDoc.exists()) {
        const matchData = { id: matchDoc.id, ...matchDoc.data() };
        setMatch(matchData);
        setSettings({
          overs: matchData.overs || 20,
          maximumOversPerPlayer: matchData.maximumOversPerPlayer || 4,
          totalPlayersPerTeam: matchData.totalPlayersPerTeam || 11,
          powerplayOvers: matchData.powerplayOvers || 6,
          drsReviews: matchData.drsReviews || 2
        });
      }
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'matches', id), settings);
      navigate(`/match/${id}`);
    } catch (error) {
      console.error('Error updating match settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading match settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center mb-6">
            <div className="bg-cricket-100 p-3 rounded-full mr-4">
              <Settings className="w-6 h-6 text-cricket-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Match Settings</h1>
              <p className="text-gray-600">Configure match parameters</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overs per Innings
                </label>
                <select
                  value={settings.overs}
                  onChange={(e) => handleChange('overs', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                >
                  <option value={5}>5 Overs</option>
                  <option value={10}>10 Overs</option>
                  <option value={15}>15 Overs</option>
                  <option value={20}>20 Overs (T20)</option>
                  <option value={50}>50 Overs (ODI)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Overs per Bowler
                </label>
                <input
                  type="number"
                  value={settings.maximumOversPerPlayer}
                  onChange={(e) => handleChange('maximumOversPerPlayer', e.target.value)}
                  min="1"
                  max={Math.floor(settings.overs / 5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Players per Team
                </label>
                <input
                  type="number"
                  value={settings.totalPlayersPerTeam}
                  onChange={(e) => handleChange('totalPlayersPerTeam', e.target.value)}
                  min="6"
                  max="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Powerplay Overs
                </label>
                <input
                  type="number"
                  value={settings.powerplayOvers}
                  onChange={(e) => handleChange('powerplayOvers', e.target.value)}
                  min="0"
                  max={Math.floor(settings.overs / 2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DRS Reviews per Team
                </label>
                <input
                  type="number"
                  value={settings.drsReviews}
                  onChange={(e) => handleChange('drsReviews', e.target.value)}
                  min="0"
                  max="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-cricket-500 focus:border-cricket-500"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/match/${id}`)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-cricket-600 hover:bg-cricket-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}