// @ts-nocheck

import { NightlyConnectSuiAdapter } from '@nightlylabs/wallet-selector-sui'

let _adapter: NightlyConnectSuiAdapter | undefined

export const getAdapter = async (persisted = true) => {
  if (_adapter) return _adapter

  // Define UI Overrides for Mobile Optimization
  const uiOverrides = {
    variablesOverride: {
      '--nc-modal-width': '90vw', // Adjust width for mobile
      '--nc-modal-max-width': '400px', // Max width limit
      '--nc-modal-font-size': '14px', // Improve readability
    },
    stylesOverride: `
      @media (max-width: 768px) {
        .nc_modalContent {
          width: var(--nc-modal-width);
          max-width: var(--nc-modal-max-width);
          font-size: var(--nc-modal-font-size);
          padding: 16px;
        }

        .nc_modalContainer {
          width: 100vw;
          height: 100vh;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nc_modalHeader {
          font-size: 16px;
          text-align: center;
          padding-bottom: 8px;
        }

        .nc_modalButtons button {
          width: 100%;
          padding: 12px;
          font-size: 14px;
          margin-top: 10px;
        }
      }
    `,
  }

  // Initialize the adapter with UI overrides
  _adapter = await NightlyConnectSuiAdapter.build(
    {
      appMetadata: {
        name: 'Sui Rewards',
        description: 'SuiRewards.me',
        icon: 'https://docs.nightly.app/img/logo.png',
      },
      uiOverrides, // Apply UI overrides here
    },
    persisted
  )

  return _adapter
}
