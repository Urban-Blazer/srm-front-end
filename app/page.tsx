"use client"; // ✅ Fix: Mark as Client Component
import { Spinner } from "@components/Spinner";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const App = dynamic(() => import("./app"), { ssr: false });

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 300); // Prevent flicker
  }, []);

  return loading ? <div className="bg-[#000306] w-screen h-screen flex items-center justify-center text-white"><Spinner /></div> : <App />;
}
