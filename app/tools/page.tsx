"use client";

import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";

export default function ToolsPage() {
  const provider = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();

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
    // 0xa7d6ad203334c6e96dfa8881fbe33596c3ef7fddc7bd8cd2a628cd1d0a6c3563::stax::STAX
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

  return (
    <div>
      <h1>Tools</h1>
      <button onClick={handleSpamObjects}>Spam Objects</button>
    </div>
  );
}
