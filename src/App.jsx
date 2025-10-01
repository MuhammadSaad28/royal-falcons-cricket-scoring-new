import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import CreateTeam from './pages/CreateTeam';
import CreatePlayer from './pages/CreatePlayer';
import CreateMatch from './pages/CreateMatch';
import Overlay from './pages/Overlay';
import ProtectedRoute from './components/ProtectedRoute';
import LiveScoring from './pages/LiveScoring';
import PlayerSelection from './pages/PlayerSelection';
import MatchSettings from './pages/MatchSettings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Overlay route - no navbar */}
            <Route path="/overlay/:id" element={<Overlay />} />
            
            {/* Regular routes with navbar */}
            <Route path="/*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/match/:id" element={<MatchDetail />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/teams/create" element={
                    <ProtectedRoute>
                      <CreateTeam />
                    </ProtectedRoute>
                  } />
                  <Route path="/players/create" element={
                    <ProtectedRoute>
                      <CreatePlayer />
                    </ProtectedRoute>
                  } />
                  <Route path="/matches/create" element={
                    <ProtectedRoute>
                      <CreateMatch />
                    </ProtectedRoute>
                  } />
                  <Route path="/match/:id/score" element={
                    <ProtectedRoute>
                      <LiveScoring />
                    </ProtectedRoute>
                  } />
                  <Route path="/match/:id/players" element={
                    <ProtectedRoute>
                      <PlayerSelection />
                    </ProtectedRoute>
                  } />
                  <Route path="/match/:id/settings" element={
                    <ProtectedRoute>
                      <MatchSettings />
                    </ProtectedRoute>
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