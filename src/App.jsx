import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Components
import Navbar from './components/common/Navbar';
import LandingPage from './components/home/LandingPage';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/dashboard/Dashboard';
import CreateMatch from './components/matches/CreateMatch';
import LiveScoring from './components/matches/LiveScoring';
import Scorecard from './components/matches/Scorecard';
import OverlayMode from './components/matches/OverlayMode';
import Profile from './components/profile/Profile';

// Route Protection
import PrivateRoute from './components/common/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Overlay route (no navbar) */}
            <Route path="/overlay/:matchId" element={<OverlayMode />} />
            
            {/* Regular routes (with navbar) */}
            <Route path="/*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/scorecard/:matchId" element={<Scorecard />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/create-match" element={
                    <PrivateRoute>
                      <CreateMatch />
                    </PrivateRoute>
                  } />
                  <Route path="/live-scoring/:matchId" element={
                    <PrivateRoute>
                      <LiveScoring />
                    </PrivateRoute>
                  } />
                  <Route path="/profile" element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  } />
                </Routes>
              </>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;