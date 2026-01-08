
import React from 'react';

const SkeletonCard = () => (
  <div className="w-full h-24 rounded-lg bg-dp-soft-gray dark:bg-dp-charcoal p-2 overflow-hidden relative">
    <div className="w-full h-full">
      <div className="h-4 bg-gray-300 dark:bg-gray-700/50 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-300 dark:bg-gray-700/50 rounded w-1/2"></div>
    </div>
    {/* Shimmer effect */}
    <div className="absolute top-0 right-0 bottom-0 left-0 w-full h-full 
                   bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent 
                   transform -translate-x-full animate-shimmer" />
  </div>
);

const SkeletonGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 18 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export default SkeletonGrid;
