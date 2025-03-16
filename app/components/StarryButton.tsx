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
      className="relative overflow-hidden bg-black text-royalPurple w-[180px] h-[50px] rounded-lg glow-effect hover:scale-110 transition-transform duration-250"
    >
      <span className="absolute inset-0 flex items-center justify-center z-10">
        {hovering && connected
          ? 'Disconnect'
          : connected
            ? `${publicKey?.substring(0, 8)}...${publicKey?.slice(-8)}`
            : 'Connect'}
      </span>
      <div className="absolute inset-0 stars-bg z-0"></div>
    </button>
  )
}

export default StarryButton