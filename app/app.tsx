// "use client";
import { redirect } from 'next/navigation';

export default function Page() {
  // redirige en el servidor antes de renderizar
  redirect('/swap/sui/srm');
}

// import { Loader } from "@react-three/drei";
// import { Toaster } from "sonner";
// import Background from "./components/Background";
// import Socials from "./components/Socials";

// export default function Home() {
//   return (
//     <>
//       <Background />
//       <Toaster position="bottom-left" richColors />
//       <Socials />
//       <Loader />
//     </>
//   );
// }