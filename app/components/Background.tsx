import React from 'react';
import Image from "next/image";

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
        <Image
          src="/maintext.gif"
          alt="Sui Rewards Me"
          width={500} // Set an explicit width
          height={300} // Set an explicit height
          className="w-auto h-auto max-w-full max-h-full"
        />
      </div>
    </div>
  );
};

export default Background;