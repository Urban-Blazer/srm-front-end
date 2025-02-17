"use client";
import { useState, useEffect, useRef } from "react";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { predefinedCoins } from "@data/coins";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC } from "../config";
import TokenSelector from "@components/tokenSelector"

const provider = new SuiClient({ url: GETTER_RPC });

export default function Swap() {
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [sellToken, setSellToken] = useState(null);
    const [buyToken, setBuyToken] = useState(null);
    const [sellAmount, setSellAmount] = useState("");
    const [buyAmount, setBuyAmount] = useState("");
    const [sellBalance, setSellBalance] = useState(0);
    const [buyBalance, setBuyBalance] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState<"sell" | "buy" | null>(null);

    // ✅ Initialize Wallet Connection
    const walletAdapterRef = useRef<NightlyConnectSuiAdapter | null>(null);

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    
    // ✅ Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const initWallet = async () => {
            try {
                if (!walletAdapterRef.current) {
                    const adapter = await NightlyConnectSuiAdapter.build({
                        appMetadata: {
                            name: "Sui DEX",
                            description: "DEX for trading tokens on Sui",
                            icon: "https://your-app-logo-url.com/icon.png",
                        },
                    });

                    walletAdapterRef.current = adapter;
                    setWalletAdapter(adapter);

                    await adapter.connect();
                    const accounts = await adapter.getAccounts();

                    if (accounts.length > 0) {
                        setWalletConnected(true);
                        setWalletAddress(accounts[0].address);
                    }

                    adapter.on("connect", (account) => {
                        setWalletConnected(true);
                        setWalletAddress(account.address);
                    });

                    adapter.on("disconnect", () => {
                        setWalletConnected(false);
                        setWalletAddress(null);
                    });
                }
            } catch (error) {
                console.error("Failed to initialize Nightly Connect:", error);
            }
        };

        initWallet();

        return () => {
            walletAdapterRef.current?.off("connect");
            walletAdapterRef.current?.off("disconnect");
        };
    }, []);


    // ✅ Fetch Token Balances when a Token is Selected
    const fetchBalance = async (token, setBalance) => {
        if (!walletAddress || !token) return;

        try {
            console.log(`Fetching balance for ${token.symbol}...`);
            const { totalBalance } = await provider.getBalance({
                owner: walletAddress,
                coinType: token.typeName,
            });

            setBalance(Number(totalBalance) / 1_000_000_000); // Convert from MIST (10⁹)
            console.log(`${token.symbol} Balance:`, Number(totalBalance) / 1_000_000_000);
        } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            setBalance(0);
        }
    };

    // ✅ Fetch balances whenever `sellToken` or `buyToken` changes
    useEffect(() => {
        if (sellToken) fetchBalance(sellToken, setSellBalance);
    }, [sellToken, walletAddress]);

    useEffect(() => {
        if (buyToken) fetchBalance(buyToken, setBuyBalance);
    }, [buyToken, walletAddress]);

    // ✅ Handle Token Selection
    const handleSelectToken = (token, type) => {
        console.log(`Selected ${token.symbol} as ${type}`);

        if (type === "sell") {
            if (buyToken && buyToken.symbol === token.symbol) {
                setBuyToken(null);
                setBuyBalance(0);
            }
            setSellToken(token);
        } else {
            if (sellToken && sellToken.symbol === token.symbol) {
                setSellToken(null);
                setSellBalance(0);
            }
            setBuyToken(token);
        }

        setDropdownOpen(null); // ✅ Close dropdown after selection
    };

    // ✅ Swap Tokens Function
    const handleSwapTokens = () => {
        if (sellToken && buyToken) {
            setSellToken(buyToken);
            setBuyToken(sellToken);

            // Swap balances
            setSellBalance(buyBalance);
            setBuyBalance(sellBalance);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 overflow-y-auto">

            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 relative">

                {/* Swap Interface */}
                <div className="flex flex-col space-y-4">
                    <h2 className="text-xl font-bold text-center">Swap Tokens</h2>

                    {/* Sell Input */}
                    <div className="bg-gray-100 p-4 rounded-lg relative">
                        <div className="flex justify-between items-center">
                            <label htmlFor="sellAmount" className="block text-gray-500">Sell</label>
                            {sellToken && <span className="text-sm text-gray-600">Balance: {sellBalance}</span>}
                        </div>

                        <div className="flex items-center justify-between">
                            <input
                                id="sellAmount"
                                name="sellAmount"
                                type="number"
                                className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                placeholder="0"
                                value={sellAmount}
                                onChange={(e) => setSellAmount(e.target.value)}
                            />
                            {/* Sell Token Selection Button */}
                            <button
                                className="flex items-center justify-between w-32 bg-white border rounded-lg px-3 py-2 shadow hover:bg-gray-100"
                                onClick={() => setDropdownOpen(dropdownOpen === "sell" ? null : "sell")}
                            >
                                {sellToken ? (
                                    <div className="flex items-center">
                                        <img src={sellToken.logo} alt={sellToken.symbol} className="w-5 h-5 mr-2" />
                                        <span className="text-black font-medium">{sellToken.symbol}</span>
                                    </div>
                                ) : (
                                    <span>Select Token</span>
                                )}
                            </button>
                        </div>

                        {/* Open Token Selector Modal for Sell */}
                        {dropdownOpen === "sell" && (
                            <TokenSelector
                                onSelectToken={(token) => handleSelectToken(token, "sell")}
                                onClose={() => setDropdownOpen(null)}
                                type="sell"
                            />
                        )}
                    </div>

                    {/* Swap Arrow */}
                    <div className="flex justify-center">
                        <button
                            className="bg-gray-200 p-2 rounded-full transition hover:bg-gray-300"
                            onClick={handleSwapTokens}
                        >
                            ⬇️
                        </button>
                    </div>

                    {/* Buy Input */}
                    <div className="bg-gray-100 p-4 rounded-lg relative">
                        <div className="flex justify-between items-center">
                            <label htmlFor="buyAmount" className="block text-gray-500">Buy</label>
                            {buyToken && <span className="text-sm text-gray-600">Balance: {buyBalance}</span>}
                        </div>

                        <div className="flex items-center justify-between">
                            <input
                                id="buyAmount"
                                name="buyAmount"
                                type="number"
                                className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                placeholder="0"
                                value={buyAmount}
                                onChange={(e) => setBuyAmount(e.target.value)}
                            />
                            {/* Buy Token Selection Button */}
                            <button
                                className="flex items-center justify-between w-32 bg-white border rounded-lg px-3 py-2 shadow hover:bg-gray-100"
                                onClick={() => setDropdownOpen(dropdownOpen === "buy" ? null : "buy")}
                            >
                                {buyToken ? (
                                    <div className="flex items-center">
                                        <img src={buyToken.logo} alt={buyToken.symbol} className="w-5 h-5 mr-2" />
                                        <span className="text-black font-medium">{buyToken.symbol}</span>
                                    </div>
                                ) : (
                                    <span>Select Token</span>
                                )}
                            </button>
                        </div>

                        {/* Open Token Selector Modal for Buy */}
                        {dropdownOpen === "buy" && (
                            <TokenSelector
                                onSelectToken={(token) => handleSelectToken(token, "buy")}
                                onClose={() => setDropdownOpen(null)}
                                type="buy"
                            />
                        )}
                    </div>

                    {/* Swap Button */}
                    <button
                        className={`w-full text-white p-3 rounded-lg ${walletConnected && sellToken && buyToken ? "bg-black" : "bg-gray-300 cursor-not-allowed"
                            }`}
                        onClick={!walletConnected ? () => walletAdapter?.connect() : () => console.log("Swap Executed")}
                        disabled={walletConnected && (!sellToken || !buyToken)}
                    >
                        {walletConnected ? "Swap" : "Connect Wallet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
