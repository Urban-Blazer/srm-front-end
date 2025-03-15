import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-20">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* GIF Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/maintext.gif"
          alt="Animated Text"
          className="w-auto h-auto max-w-full max-h-full"
        />
      </div>
    </div>
  );
};

export default Background;