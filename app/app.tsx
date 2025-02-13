"use client";
import { Loader } from "@react-three/drei";
import { Toaster } from "sonner";
import Background from "./components/Background";
import Torus from "./components/Torus/App";
import Socials from "./components/Socials";

export default function Home() {
  return (
    <>
      <Background />
      <Torus />
      <Toaster position="bottom-left" richColors />
      <Socials />
      <Loader />
    </>
  );
}