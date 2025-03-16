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