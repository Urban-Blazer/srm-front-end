// @ts-nocheck

import { NightlyConnectSuiAdapter } from '@nightlylabs/wallet-selector-sui'

let _adapter: NightlyConnectSuiAdapter | undefined

export const getAdapter = async (persisted = true) => {
  if (_adapter) return _adapter

  // Define UI Overrides for Mobile Fix
  const uiOverrides = {
    variablesOverride: {
      '--nc-modal-width': '90vw',
      '--nc-modal-max-width': '400px',
      '--nc-modal-font-size': '14px',
    },
    stylesOverride: `
      @media (max-width: 768px) {
        .nc_modalContent {
          width: var(--nc-modal-width) !important;
          max-width: var(--nc-modal-max-width) !important;
          font-size: var(--nc-modal-font-size) !important;
          padding: 16px !important;
        }

        .nc_modalContainer {
          width: 100vw !important;
          height: 100vh !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .nc_modalHeader {
          font-size: 16px !important;
          text-align: center !important;
          padding-bottom: 8px !important;
        }

        .nc_modalButtons button {
          width: 100% !important;
          padding: 12px !important;
          font-size: 14px !important;
          margin-top: 10px !important;
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
      uiOverrides, // Apply UI overrides
    },
    persisted
  )

  // Fix Modal Positioning Dynamically
  setTimeout(() => {
    const modal = document.querySelector('.nc_modalContainer')
    if (modal) {
      modal.style.display = 'flex'
      modal.style.width = '90vw'
      modal.style.maxWidth = '400px'
      modal.style.top = '50%'
      modal.style.left = '50%'
      modal.style.transform = 'translate(-50%, -50%)'
    }
  }, 500)

  return _adapter
}
