import React from 'react';
import Image from "next/image";

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-20">
      {/* Background Video - Scales Dynamically on All Screens */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover min-h-screen"
      >
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Opening Banner Text */}
      <div className="absolute top-24 sm:top-28 md:top-32 w-full flex justify-center z-50 pointer-events-none px-2">
        <h1 className="text-white text-2xl sm:text-4xl md:text-5xl font-extrabold drop-shadow-md tracking-wide text-center bg-black bg-opacity-50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl leading-tight max-w-[90%]">
          $SRM NOW TRADING LIVE!
        </h1>
      </div>

      {/* GIF Overlay (Now Fully Responsive) */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <Image
          src="/maintext.gif"
          alt="Sui Rewards Me"
          width={500}
          height={300}
          className="w-auto h-auto max-w-[90%] sm:max-w-[70%] md:max-w-[50%] max-h-[70vh]"
        />
      </div>
    </div>
  );
};

export default Background;