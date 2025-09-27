import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MapPin, Users, Clock, Trophy, CircleAlert as AlertCircle } from 'lucide-react';

const CreateMatch = () => {
  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    venue: '',
    overs: 20,
    scheduledTime: '',
    tossWinner: '',
    tossDecision: 'bat'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'overs' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.teamA || !formData.teamB || !formData.venue || !formData.scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.teamA === formData.teamB) {
      setError('Team A and Team B cannot be the same');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const matchData = {
        ...formData,
        scheduledTime: new Date(formData.scheduledTime),
        status: 'upcoming',
        createdBy: currentUser.uid,
        createdAt: new Date(),
        currentScore: {
          teamA: 0,
          teamB: 0,
          wicketsA: 0,
          wicketsB: 0,
          oversA: 0,
          oversB: 0
        },
        ballByBall: [],
        stats: {
          teamA: { runs: 0, wickets: 0, overs: 0, extras: 0 },
          teamB: { runs: 0, wickets: 0, overs: 0, extras: 0 }
        }
      };

      const docRef = await addDoc(collection(db, 'matches'), matchData);
      navigate(`/scorecard/${docRef.id}`);
    } catch (error) {
      console.error('Error creating match:', error);
      setError('Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="card">
        <div className="flex items-center mb-6">
          <Trophy className="h-6 w-6 text-cricket-green mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Create New Match</h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Team A *
              </label>
              <input
                type="text"
                name="teamA"
                value={formData.teamA}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter team name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Team B *
              </label>
              <input
                type="text"
                name="teamB"
                value={formData.teamB}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter team name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Venue *
            </label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              className="input-field"
              placeholder="Match venue"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Overs
              </label>
              <select
                name="overs"
                value={formData.overs}
                onChange={handleChange}
                className="input-field"
              >
                <option value={5}>5 Overs</option>
                <option value={10}>10 Overs</option>
                <option value={20}>20 Overs</option>
                <option value={50}>50 Overs</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Toss Details (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toss Winner
                </label>
                <select
                  name="tossWinner"
                  value={formData.tossWinner}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select toss winner</option>
                  <option value={formData.teamA}>{formData.teamA || 'Team A'}</option>
                  <option value={formData.teamB}>{formData.teamB || 'Team B'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toss Decision
                </label>
                <select
                  name="tossDecision"
                  value={formData.tossDecision}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="bat">Chose to Bat</option>
                  <option value="bowl">Chose to Bowl</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMatch;