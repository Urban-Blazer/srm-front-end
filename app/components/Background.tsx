import React from 'react'

const Background: React.FC = () => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center -z-10" // Lower z-index to prevent overlap
      style={{ pointerEvents: 'none', backgroundColor: '#272730' }}
    >
      <div className="flex justify-center items-center h-screen">
        <div className="text-white text-center" style={{ fontSize: '12em', fontWeight: 800 }}>
          Sui Rewards
        </div>
      </div>
    </div>
  )
}

export default Background