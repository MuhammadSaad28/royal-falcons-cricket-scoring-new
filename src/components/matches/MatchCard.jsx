import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Trophy, Clock } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

const MatchCard = ({ match }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatMatchTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (match.status === 'upcoming') {
      return `${format(date, 'PPp')} (${formatDistanceToNow(date, { addSuffix: true })})`;
    }
    return format(date, 'PPp');
  };

  const getMatchResult = () => {
    if (match.status === 'completed' && match.result) {
      return match.result;
    }
    if (match.status === 'live' && match.currentScore) {
      return `${match.currentScore.teamA} vs ${match.currentScore.teamB}`;
    }
    return null;
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-cricket-green" />
          <h3 className="text-lg font-semibold text-gray-900">{match.title || `${match.teamA} vs ${match.teamB}`}</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(match.status)}`}>
          {match.status?.toUpperCase()}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center text-gray-600">
          <Users className="h-4 w-4 mr-2" />
          <span>{match.teamA} vs {match.teamB}</span>
        </div>

        {match.venue && (
          <div className="flex items-center text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{match.venue}</span>
          </div>
        )}

        <div className="flex items-center text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{formatMatchTime(match.scheduledTime)}</span>
        </div>

        {match.overs && (
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{match.overs} overs</span>
          </div>
        )}
      </div>

      {getMatchResult() && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-900">{getMatchResult()}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <Link
          to={`/scorecard/${match.id}`}
          className="btn-primary flex-1 text-center"
        >
          View Scorecard
        </Link>
        {match.status === 'live' && (
          <Link
            to={`/overlay/${match.id}`}
            className="btn-secondary text-center px-4"
          >
            OBS
          </Link>
        )}
      </div>
    </div>
  );
};

export default MatchCard;