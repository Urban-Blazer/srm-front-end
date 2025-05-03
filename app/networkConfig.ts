"use client";
import { createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui.js/client";
import { GETTER_RPC, PACKAGE_ID } from "./config";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
    mainnet: { 
        url: GETTER_RPC || getFullnodeUrl('mainnet'),
        variables: {
            packageId: PACKAGE_ID
        }
    }, 
    testnet: { 
        url: getFullnodeUrl('testnet'),
        variables: {
            packageId: ''
        }
    },
    devnet: { 
        url: getFullnodeUrl('devnet'),
        variables: {
            packageId: ''
        }
    },
    localnet: { 
        url: getFullnodeUrl('localnet'),
        variables: {
            packageId: ''
        }
    },
});

export { networkConfig, useNetworkVariable, useNetworkVariables };