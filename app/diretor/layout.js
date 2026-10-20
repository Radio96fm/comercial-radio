import { requireMaster } from '@/lib/auth';
import AoVivo from '@/components/AoVivo';
import TemaPainel from './TemaPainel';
import './diretor.css';

export const dynamic = 'force-dynamic';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f2ee',
};

export default async function DiretorLayout({ children }) {
  await requireMaster();
  return (
    <div className="dir">
      <TemaPainel />
      {children}
      <AoVivo tabelas={['visitas', 'contratos', 'parcelas', 'clientes']} />
    </div>
  );
}
