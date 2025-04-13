"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function GetPoolPage() {
    const [typeA, setTypeA] = useState("");
    const [typeB, setTypeB] = useState("");
    const [poolId, setPoolId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setPoolId(null);

        try {
            const params = new URLSearchParams({ typeA, typeB });
            const res = await fetch(`/api/get-pool-id?${params.toString()}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to fetch pool ID");
            setPoolId(data.poolId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow-md">
            <h1 className="text-2xl font-bold mb-4">Get Pool ID</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Token A Type Name
                    </label>
                    <input
                        type="text"
                        value={typeA}
                        onChange={(e) => setTypeA(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-black"
                        required
                        placeholder="e.g. 0x2::sui::SUI"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Token B Type Name
                    </label>
                    <input
                        type="text"
                        value={typeB}
                        onChange={(e) => setTypeB(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-black"
                        required
                        placeholder="e.g. 0x1::usdc::USDC"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={loading}
                >
                    {loading ? "Searching..." : "Get Pool ID"}
                </button>
            </form>

            {poolId && (
                <div className="mt-4 text-green-600 font-mono">
                    <strong>Pool ID:</strong> {poolId}
                </div>
            )}

            {error && (
                <div className="mt-4 text-red-500 font-medium">
                    Error: {error}
                </div>
            )}
        </div>
    );
}