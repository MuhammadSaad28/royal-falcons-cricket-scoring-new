import React from 'react';
import { Loader } from 'lucide-react';

const Loading = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <Loader className="h-8 w-8 animate-spin text-cricket-green mx-auto mb-2" />
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
};

export default Loading;