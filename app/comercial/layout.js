import { requireGestor } from '@/lib/auth';
import AoVivo from '@/components/AoVivo';
import TemaPainel from '../diretor/TemaPainel';
import '../diretor/diretor.css';

export const dynamic = 'force-dynamic';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f2ee',
};

export default async function ComercialLayout({ children }) {
  await requireGestor();
  return (
    <div className="dir">
      <TemaPainel />
      {children}
      <AoVivo tabelas={['visitas', 'contratos', 'visitas_liberadas']} />
    </div>
  );
}
