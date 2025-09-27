import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Calendar, Save, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react';

const Profile = () => {
  const { currentUser, userData } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (userData && currentUser) {
      setFormData({
        name: userData.name || currentUser.displayName || '',
        email: currentUser.email || ''
      });
    }
  }, [userData, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: formData.name
      });

      // Update Firestore user document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: formData.name,
        updatedAt: new Date()
      });

      setMessage('Profile updated successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="card">
        <div className="flex items-center mb-6">
          <User className="h-6 w-6 text-cricket-green mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md flex items-center ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              className="input-field bg-gray-100"
              disabled
              title="Email cannot be changed"
            />
            <p className="mt-1 text-sm text-gray-500">
              Email address cannot be changed
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Member since</p>
                <p className="font-medium text-gray-900">
                  {formatDate(userData?.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">User ID</p>
                <p className="font-medium text-gray-900 font-mono text-xs">
                  {currentUser?.uid}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Account type</p>
                <p className="font-medium text-gray-900 capitalize">
                  {userData?.role || 'User'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Email verified</p>
                <p className={`font-medium ${
                  currentUser?.emailVerified ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentUser?.emailVerified ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;