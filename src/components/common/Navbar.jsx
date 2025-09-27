import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, User, LogOut, Hop as Home, Plus, Trophy, ChartBar as BarChart3 } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    ...(currentUser ? [
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/create-match', label: 'Create Match', icon: Plus },
    ] : [])
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-cricket-green" />
              <span className="text-xl font-bold text-gray-900">Royal Falcons Scoring</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="nav-link flex items-center space-x-1"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {currentUser ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="nav-link flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="nav-link flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-cricket-green"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block px-3 py-2 text-gray-600 hover:text-cricket-green flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {currentUser ? (
              <>
                <Link
                  to="/profile"
                  className="block px-3 py-2 text-gray-600 hover:text-cricket-green flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-gray-600 hover:text-cricket-green flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 text-gray-600 hover:text-cricket-green"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block px-3 py-2 text-gray-600 hover:text-cricket-green"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;