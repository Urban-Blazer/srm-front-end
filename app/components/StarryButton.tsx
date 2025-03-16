import React from 'react'
import './StarryButton.css'

export interface StarryButtonProps {
  connected: boolean
  publicKey?: string
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
}

const StarryButton: React.FC<StarryButtonProps> = ({
  connected,
  onConnect,
  onDisconnect,
  publicKey,
}) => {
  const [connecting, setConnecting] = React.useState(false)
  const [hovering, setHovering] = React.useState(false)

  return (
    <button
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={async () => {
        if (connecting) return
        setConnecting(true)
        connected ? await onDisconnect() : await onConnect()
        setConnecting(false)
      }}
      className="relative overflow-hidden text-royalPurple w-[200px] sm:w-[180px] h-[60px] sm:h-[50px] 
                 rounded-xl glow-effect hover:scale-105 transition-transform duration-250 
                 connect-button flex items-center justify-center"
    >
      <span className="relative z-10 px-6 py-3 text-base sm:text-sm xs:text-xs font-bold truncate whitespace-nowrap max-w-full">
        {hovering && connected
          ? 'Disconnect'
          : connected
            ? `${publicKey?.substring(0, 6)}...${publicKey?.slice(-6)}` // Shortened to fit better
            : 'Connect'}
      </span>
      <div className="absolute inset-0 stars-bg z-0"></div>
    </button>
  )
}

export default StarryButton