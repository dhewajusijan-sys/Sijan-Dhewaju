import React from 'react';

const BananimateView: React.FC = () => {
  return (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-800">
      <iframe
        src="https://ai.studio/apps/bundled/bananimate"
        title="Bananimate"
        className="w-full h-full border-0"
        allow="camera; microphone; geolocation"
      />
    </div>
  );
};

export default BananimateView;