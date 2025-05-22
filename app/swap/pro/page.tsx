import { redirect } from 'next/navigation';

export default function Page() {
  // redirige en el servidor antes de renderizar
  redirect('/swap/sui/srm');
}
