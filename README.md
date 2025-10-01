# CricketScore Pro - World-Class Cricket Scoring Application

A comprehensive cricket scoring application built with React and Firebase, featuring real-time scoring, team management, and professional broadcast-quality overlays.

## 🏆 Features

### Core Functionality
- **Firebase Authentication**: Secure email/password authentication
- **Team Management**: Create and manage teams with player rosters
- **Player Management**: Add players with comprehensive statistics tracking
- **Match Creation**: Set up matches with customizable formats (T20, ODI, etc.)
- **Live Scoring**: Real-time international standard cricket scoring
- **Public Access**: Unauthenticated users can view match details and scorecards

### Advanced Features
- **Live Overlays**: Professional broadcast-quality overlays for OBS/streaming
- **Real-time Updates**: Live score updates using Firebase real-time listeners
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **International Standards**: Comprehensive cricket scoring with extras, dismissals, and statistics
- **Match Filters**: Filter matches by status (Live, Upcoming, Completed)

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- Firebase account
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cricket-scoring-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Email/Password provider
   - Create a Firestore database in production mode
   - Copy your Firebase configuration

4. **Configure Firebase**
   - Open `src/firebase.js`
   - Replace the configuration object with your Firebase project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

5. **Set up Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx      # Navigation bar
│   ├── MatchCard.jsx   # Match display cards
│   ├── Loading.jsx     # Loading spinner
│   └── ProtectedRoute.jsx
├── pages/              # Application pages
│   ├── LandingPage.jsx # Public homepage
│   ├── Login.jsx       # User authentication
│   ├── Signup.jsx      # User registration
│   ├── Dashboard.jsx   # User dashboard
│   ├── Matches.jsx     # All matches listing
│   ├── MatchDetail.jsx # Individual match view
│   ├── CreateTeam.jsx  # Team creation
│   ├── CreatePlayer.jsx # Player creation
│   ├── CreateMatch.jsx # Match setup
│   └── Overlay.jsx     # Broadcast overlay
├── context/            # React Context providers
│   └── AuthContext.jsx # Authentication state
├── firebase.js         # Firebase configuration
├── App.jsx            # Main app component
└── index.css          # Global styles
```

## 🎯 Usage Guide

### For Unauthenticated Users
1. Browse matches on the homepage
2. View detailed scorecards for any match
3. Filter matches by status (Live, Upcoming, Completed)

### For Authenticated Users
1. **Create Account**: Sign up with email and password
2. **Create Teams**: Add teams to organize players
3. **Add Players**: Register players to teams (minimum 11 required for matches)
4. **Create Matches**: Set up matches between your teams
5. **Live Scoring**: Score matches in real-time with comprehensive statistics
6. **Manage**: View and manage all your teams, players, and matches

### Overlay for Streaming
1. Navigate to `/overlay/{matchId}` for any live match
2. Use this URL as a browser source in OBS or other streaming software
3. The overlay updates in real-time as the match progresses

## 🛠 Firebase Schema

The application uses the following Firestore collections:

### Users Collection
```javascript
{
  id: "string",
  name: "string",
  email: "string", 
  createdAt: "timestamp",
  role: "enum('player','admin','coach','viewer')"
}
```

### Teams Collection
```javascript
{
  id: "string",
  createdBy: "string (user ID)",
  name: "string",
  players: "array of player references",
  createdAt: "timestamp"
}
```

### Players Collection
```javascript
{
  id: "string",
  teamId: "string (team reference)",
  createdBy: "string (user ID)",
  name: "string",
  // Statistics
  totalRunsScored: "number",
  totalMatches: "number", 
  totalInnings: "number",
  totalBallsFaced: "number",
  totalRunsGiven: "number",
  totalOversBowled: "number",
  totalWickets: "number",
  totalSixesHit: "number",
  totalFoursHit: "number",
  totalSixesConceded: "number",
  totalFoursConceded: "number",
  createdAt: "timestamp"
}
```

### Matches Collection
```javascript
{
  id: "string",
  status: "enum('upcoming','live','completed')",
  team1: "string (team reference)",
  team2: "string (team reference)", 
  toss: {
    winner: "string (team reference)",
    decision: "enum('bat','bowl')"
  },
  totalPlayersPerTeam: "number (min 11)",
  overs: "number",
  maximumOversPerPlayer: "number",
  createdAt: "timestamp"
}
```

### Live Scoring Collection
```javascript
{
  id: "string",
  matchId: "string (match reference)",
  batting: "array of batting statistics",
  bowling: "array of bowling statistics", 
  fielding: "array of fielding statistics",
  runs: "number",
  overs: "number (decimal format)",
  extraRuns: {
    wides: "number",
    noBalls: "number", 
    legByes: "number",
    byes: "number"
  },
  battersOnCrease: "array of 2 player references",
  bowler: "string (player reference)",
  createdAt: "timestamp"
}
```

## 🎨 Design Features

### Professional UI
- Cricket-themed color palette (greens, golds, whites)
- Responsive grid layouts
- Smooth animations and transitions
- Touch-friendly controls for mobile scoring

### Broadcast Quality Overlays
- Professional sports channel aesthetic
- Real-time data updates
- Gradient backgrounds with proper contrast
- Clean typography optimized for streaming

### Accessibility
- Keyboard navigation support
- High contrast ratios
- Screen reader compatible
- Mobile-first responsive design

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Technologies
- **React 18** - Modern React with hooks
- **Firebase 9** - Authentication and Firestore database
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Modern icon library

## 📱 Responsive Design

The application is fully responsive with optimized layouts for:
- **Mobile** (< 768px): Single column layouts, touch-friendly controls
- **Tablet** (768px - 1024px): Two-column layouts, medium sizing
- **Desktop** (> 1024px): Multi-column layouts, full feature access

## 🚀 Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting** (optional)
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

3. **Alternative Deployment**: Deploy to Vercel, Netlify, or any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by professional cricket broadcasts (Star Sports, Sky Sports, Fox Sports)
- Built with modern web technologies for optimal performance
- Designed for cricket enthusiasts and professional scorers

---

**CricketScore Pro** - Bringing professional cricket scoring to everyone! 🏏