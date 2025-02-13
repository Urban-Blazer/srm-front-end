"use client"; // ✅ Fix: Mark as Client Component
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const App = dynamic(() => import("./app"), { ssr: false });

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 300); // Prevent flicker
  }, []);

  return loading ? <div className="text-white text-center mt-10">Loading...</div> : <App />;
}
