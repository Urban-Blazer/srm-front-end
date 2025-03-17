"use client";
import { Loader } from "@react-three/drei";
import { Toaster } from "sonner";
import Background from "./components/Background";
import Socials from "./components/Socials";

export default function Home() {
  return (
    <>
      <Background />
      <Toaster position="bottom-left" richColors />
      <Socials />
      <Loader />
    </>
  );
}