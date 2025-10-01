import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="bg-cricket-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-xl">CricketScore Pro</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-cricket-300 transition-colors">
              Home
            </Link>
            <Link to="/matches" className="hover:text-cricket-300 transition-colors">
              Matches
            </Link>
            {currentUser && (
              <Link to="/dashboard" className="hover:text-cricket-300 transition-colors">
                Dashboard
              </Link>
            )}
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  Welcome, {userProfile?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-cricket-700 hover:bg-cricket-600 px-3 py-2 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="hover:text-cricket-300 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-gold-600 hover:bg-gold-500 px-4 py-2 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-cricket-300"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-cricket-700">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md hover:bg-cricket-600"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/matches"
              className="block px-3 py-2 rounded-md hover:bg-cricket-600"
              onClick={() => setIsOpen(false)}
            >
              Matches
            </Link>
            {currentUser && (
              <Link
                to="/dashboard"
                className="block px-3 py-2 rounded-md hover:bg-cricket-600"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
            )}
            {currentUser ? (
              <div className="px-3 py-2">
                <p className="text-sm mb-2">Welcome, {userProfile?.name}</p>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-cricket-600 hover:bg-cricket-500 px-3 py-2 rounded-md transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-2">
                <Link
                  to="/login"
                  className="block bg-cricket-600 hover:bg-cricket-500 px-3 py-2 rounded-md transition-colors text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block bg-gold-600 hover:bg-gold-500 px-3 py-2 rounded-md transition-colors text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}