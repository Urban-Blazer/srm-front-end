/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react'
import { toast } from 'sonner'
import { getAdapter } from '../misc/adapter'
import StarryButton from './StarryButton'
import { WalletAccount } from '@mysten/wallet-standard'

const StickyHeader: React.FC = () => {
  const [userAccount, setUserAccount] = React.useState<WalletAccount | undefined>()

  useEffect(() => {
    const init = async () => {
      const adapter = await getAdapter()
      if (await adapter.canEagerConnect()) {
        try {
          await adapter.connect()
          const account = await adapter.getAccounts()
          if (account[0]) {
            setUserAccount(account[0])
          }
        } catch (error) {
          await adapter.disconnect().catch(() => { })
          console.log(error)
        }
      }
    }
    init()
  }, [])

  return (
    <div className="relative z-50">
      <div className="flex items-center justify-between">
        <div>
          {/* Logo or other elements can be placed here */}
        </div>
        <div className="flex flex-col space-y-4">
          <StarryButton
            connected={userAccount?.address !== undefined}
            onConnect={async () => {
              const adapter = await getAdapter()
              try {
                await adapter.connect()
                const account = await adapter.getAccounts()
                if (account[0]) {
                  setUserAccount(account[0])
                }
              } catch (error) {
                await adapter.disconnect().catch(() => { })
              }
            }}
            onDisconnect={async () => {
              try {
                const adapter = await getAdapter()
                await adapter.disconnect()
                setUserAccount(undefined)
              } catch (error) {
                console.log(error)
              }
            }}
            publicKey={userAccount?.address}
          />
        </div>
      </div>
    </div>
  )
}

export default StickyHeader
