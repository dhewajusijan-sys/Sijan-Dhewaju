import React from 'react';

const MathPlayground: React.FC = () => {
  return (
    <div className="w-full h-full bg-white">
      <iframe
        src="https://mathigon.org/polypad"
        title="Math Playground"
        className="w-full h-full border-0"
        allow="geolocation"
      />
    </div>
  );
};

export default MathPlayground;