# Royal Falcons Cricket Scoring Web App

A comprehensive cricket scoring platform built with React.js and Firebase, featuring live scoring, tournament management, and OBS streaming integration.

## Features

### Core Functionality
- **Live Cricket Scoring**: Ball-by-ball scoring with real-time updates
- **Match Management**: Create, manage, and track cricket matches
- **Tournament System**: Organize tournaments with automatic points tables
- **Series Management**: Group matches into series with comprehensive statistics
- **Real-time Updates**: Live scorecard updates using Firebase Firestore
- **OBS Integration**: Stream-ready overlay mode for live broadcasts

### User Features
- **Authentication**: Firebase Auth with email/password and Google Sign-in
- **User Dashboard**: Personalized dashboard with match history and statistics
- **Public Scorecards**: Accessible match scorecards for viewers
- **Mobile Responsive**: Optimized for all screen sizes
- **Professional UI**: Clean, cricket-themed design with TailwindCSS

### Statistics & Analytics
- **Automatic Statistics**: Run rates, strike rates, bowling figures
- **Player Performance**: Top scorers, wicket-takers, and MVP suggestions
- **Tournament Analytics**: Points tables, net run rates, leaderboards
- **Match Analysis**: Comprehensive post-match statistics

## Technology Stack

- **Frontend**: React.js 18 with Vite
- **Backend**: Firebase (Firestore + Authentication)
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Date Handling**: date-fns
- **Real-time**: Firebase Firestore listeners

## Project Structure

```
src/
├── components/
│   ├── auth/               # Authentication components
│   ├── common/             # Reusable components
│   ├── dashboard/          # User dashboard
│   ├── home/               # Landing page
│   ├── matches/            # Match-related components
│   └── profile/            # User profile
├── contexts/               # React contexts
├── firebase/               # Firebase configuration
└── App.jsx                 # Main app component
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd royal-falcons-scoring

# Install dependencies
npm install
```

### 2. Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Follow the setup wizard

2. **Enable Authentication**:
   - Navigate to Authentication > Sign-in method
   - Enable "Email/Password" provider
   - (Optional) Enable "Google" provider

3. **Create Firestore Database**:
   - Navigate to Firestore Database
   - Click "Create database"
   - Start in test mode (configure security rules later)
   - Choose a location near your users

4. **Get Configuration**:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click "Web app" icon to register your app
   - Copy the configuration object

### 3. Environment Configuration

1. **Create Environment File**:
   ```bash
   cp .env.example .env
   ```

2. **Add Firebase Configuration**:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key_here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   REACT_APP_FIREBASE_APP_ID=your_app_id_here
   ```

### 4. Firestore Security Rules

Update your Firestore rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Matches: creators can write, everyone can read
    match /matches/{matchId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.createdBy);
    }
    
    // Series: creators can write, everyone can read
    match /series/{seriesId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.createdBy);
    }
    
    // Tournaments: creators can write, everyone can read
    match /tournaments/{tournamentId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.createdBy);
    }
  }
}
```

### 5. Run the Application

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

## Data Structure

### Matches Collection (`/matches`)
```javascript
{
  id: "match_id",
  teamA: "Team Alpha",
  teamB: "Team Beta", 
  venue: "Cricket Ground",
  overs: 20,
  scheduledTime: Timestamp,
  status: "live" | "upcoming" | "completed",
  createdBy: "user_id",
  currentScore: {
    teamA: 150,
    teamB: 120,
    wicketsA: 3,
    wicketsB: 5,
    oversA: 15.4,
    oversB: 14.2
  },
  ballByBall: [
    {
      over: 1,
      ball: 1,
      runs: 4,
      extras: 0,
      wicket: false,
      batsman: "Player Name",
      bowler: "Bowler Name",
      commentary: "Great shot!",
      timestamp: Timestamp
    }
  ],
  stats: {
    teamA: { runs: 150, wickets: 3, overs: "15.4", extras: 5 },
    teamB: { runs: 120, wickets: 5, overs: "14.2", extras: 3 }
  },
  tossWinner: "Team Alpha",
  tossDecision: "bat",
  result: "Team Alpha won by 30 runs"
}
```

### Users Collection (`/users`)
```javascript
{
  id: "user_id",
  name: "John Doe",
  email: "john@example.com",
  role: "user",
  createdAt: Timestamp
}
```

## Usage Guide

### Creating a Match
1. Sign up/Login to the application
2. Click "Create Match" from dashboard or navigation
3. Fill in match details (teams, venue, overs, time)
4. Optionally set toss details
5. Click "Create Match"

### Live Scoring
1. Navigate to your created match
2. Click "Score" button on the scorecard
3. Enter ball-by-ball details:
   - Runs scored (0-6)
   - Extras (wide, no-ball, bye, leg-bye)
   - Wicket information
   - Batsman and bowler names
   - Commentary
4. Stats update automatically in real-time

### OBS Integration
1. Open any match scorecard
2. Click "OBS" button to get overlay URL
3. In OBS Studio:
   - Add "Browser Source"
   - Paste the overlay URL
   - Set transparency background
   - Adjust size as needed
4. Overlay updates automatically with live scores

### Tournament Features
- Create tournaments with multiple teams
- Automatic fixture generation
- Real-time points table updates
- Tournament statistics and leaderboards

## Deployment

### Firebase Hosting (Recommended)

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and Initialize**:
   ```bash
   firebase login
   firebase init hosting
   ```

3. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

### Netlify/Vercel

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your preferred hosting platform

3. **Set environment variables** in your hosting platform's settings

## Free Tier Limitations

The application is designed to work within Firebase's free tier limits:

- **Firestore**: 50K reads, 20K writes, 20K deletes per day
- **Authentication**: Unlimited users
- **Hosting**: 1GB storage, 10GB bandwidth per month

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions:
- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review [React Documentation](https://react.dev)
- Open an issue in the repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Royal Falcons Scoring** - Professional Cricket Scoring Made Simple