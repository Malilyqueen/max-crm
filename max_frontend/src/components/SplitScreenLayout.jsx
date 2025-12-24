// src/components/SplitScreenLayout.jsx
import React from 'react';

export default function SplitScreenLayout({ sidebar, main }) {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-1/4 bg-gray-800 border-r border-gray-700 overflow-y-auto p-4">
        {sidebar}
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {main}
      </div>
    </div>
  );
}
