// @ts-nocheck

import { NightlyConnectSuiAdapter } from '@nightlylabs/wallet-selector-sui'

let _adapter: NightlyConnectSuiAdapter | undefined
export const getAdapter = async (persisted = true) => {
  if (_adapter) return _adapter
  _adapter = await NightlyConnectSuiAdapter.build(
    {
      appMetadata: {
        name: 'Sui Rewards',
        description: 'SuiRewards.me',
        icon: 'https://docs.nightly.app/img/logo.png',
      },
    },
    persisted
  )
  return _adapter
}
