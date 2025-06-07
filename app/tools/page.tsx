"use client";

import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { predefinedCoins } from "@/app/data/coins";
import { useState } from "react";

export default function ToolsPage() {
  const provider = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const [status, setStatus] = useState<string>("");

  const handleSpamObjects = async () => {
    if (!account) {
      console.error("No account found");
      return;
    }
    const walletAddress = account.address;

    const txb = new Transaction();

    const GAS_BUDGET = 150_000_000;

    txb.setGasBudget(GAS_BUDGET);

    const { data: coins } = await provider.getCoins({
      owner: walletAddress,
      coinType:
        "0x9b8a82822335e9c5a4379f7752ec017afdf9127a34024bdc0e672264b947d237::test_coin_e::TEST_COIN_E",
    });
    // 0x9b8a82822335e9c5a4379f7752ec017afdf9127a34024bdc0e672264b947d237::test_coin_e::TEST_COIN_E
    //  0x9b8a82822335e9c5a4379f7752ec017afdf9127a34024bdc0e672264b947d237::test_coin_d::TEST_COIN_D
    // 0x9b8a82822335e9c5a4379f7752ec017afdf9127a34024bdc0e672264b947d237::test_coin_c::TEST_COIN_C

    for(let i = 0; i < 100; i++){
        let accumulated = 0;
        const coinsToUse: typeof coins = [];
        for (const coin of coins) {
            accumulated += Number(coin.balance);
            coinsToUse.push(coin);
            if (accumulated >= 100_000_000_000_000) break;
        }
    
        if (coinsToUse.length === 0) {
            console.error(`No coins found in your wallet`);
            return;
        }
        let coinToUse;
    
        if (coinsToUse.length === 1) {
            coinToUse = txb.splitCoins(
                txb.object(coinsToUse[0].coinObjectId),
                [txb.pure.u64(100_000_000_000_000)]
            );
        } else {
            const firstCoin = coinsToUse[0];
            const remainingCoins = coinsToUse.slice(1).map(coin => txb.object(coin.coinObjectId));
    
            txb.mergeCoins(txb.object(firstCoin.coinObjectId), remainingCoins);
            const [splitSui] = txb.splitCoins(
                txb.object(firstCoin.coinObjectId),
                [txb.pure.u64(100_000_000_000_000)]
            );
    
            coinToUse = splitSui;
        }

        txb.transferObjects([coinToUse], txb.pure.address(walletAddress));
    }

    signAndExecuteTransaction(
      {
        transaction: txb,
        chain: "sui:mainnet", // or 'sui:devnet' if that's your environment
      },
      {
        onSuccess: (result) => {
          console.log("Transaction submitted successfully:", result);
        },
        onError: (error) => {
          console.error("Transaction failed:", error);
        },
      }
    );
  };

  const handleCreatePredefinedCoins = async () => {
    
    try {
      // Start creating coins
      setStatus("Creating predefined coins...");
      
      // Process each predefined coin
      for (const coin of predefinedCoins) {
        const response = await fetch('/api/coins/all', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(coin)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log(`Created coin ${coin.symbol} successfully`);
        } else {
          // If the coin already exists (409) that's okay, otherwise log the error
          if (response.status === 409) {
            console.log(`Coin ${coin.symbol} already exists, skipping...`);
          } else {
            console.error(`Failed to create coin ${coin.symbol}:`, result.error);
          }
        }
      }
      
      setStatus("All coins created successfully!");
      alert("Predefined coins created successfully!");
    } catch (error) {
      console.error("Error creating predefined coins:", error);
      setStatus("Error creating coins");
      alert("Error creating predefined coins. Check console for details.");
    }
  };
  

  return (
    <div>
      <h1>Tools</h1>
      <button onClick={handleSpamObjects}>Spam Objects</button>
      <button onClick={handleCreatePredefinedCoins}>Create Predefined Coins</button>
    </div>
  );
}
