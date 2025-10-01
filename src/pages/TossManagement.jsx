import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Coins } from 'lucide-react';

export default function TossManagement({ match, teams, onTossComplete }) {
  const [selectedWinner, setSelectedWinner] = useState('');
  const [selectedDecision, setSelectedDecision] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTossSubmit = async () => {
    if (!selectedWinner || !selectedDecision) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        toss: {
          winner: selectedWinner,
          decision: selectedDecision
        },
        status: 'live'
      });

      if (onTossComplete) {
        onTossComplete(selectedWinner, selectedDecision);
      }
    } catch (error) {
      console.error('Error updating toss:', error);
    } finally {
      setLoading(false);
    }
  };

  const team1 = teams[match.team1];
  const team2 = teams[match.team2];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <div className="text-center mb-6">
          <div className="bg-gold-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-gold-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Toss Time!</h2>
          <p className="text-gray-600">
            {team1?.name} vs {team2?.name}
          </p>
        </div>

        <div className="space-y-6">
          {/* Toss Winner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Who won the toss?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedWinner(match.team1)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedWinner === match.team1
                    ? 'border-cricket-500 bg-cricket-50 text-cricket-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{team1?.name}</div>
              </button>
              <button
                onClick={() => setSelectedWinner(match.team2)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedWinner === match.team2
                    ? 'border-cricket-500 bg-cricket-50 text-cricket-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{team2?.name}</div>
              </button>
            </div>
          </div>

          {/* Toss Decision */}
          {selectedWinner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What did {teams[selectedWinner]?.name} choose?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedDecision('bat')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedDecision === 'bat'
                      ? 'border-cricket-500 bg-cricket-50 text-cricket-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Bat First</div>
                </button>
                <button
                  onClick={() => setSelectedDecision('bowl')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedDecision === 'bowl'
                      ? 'border-cricket-500 bg-cricket-50 text-cricket-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Bowl First</div>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/matches')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTossSubmit}
              disabled={!selectedWinner || !selectedDecision || loading}
              className="flex-1 bg-cricket-600 hover:bg-cricket-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting Match...' : 'Start Match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}