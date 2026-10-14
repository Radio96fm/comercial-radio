import Link from 'next/link';
import { requireGestor } from '@/lib/auth';
import FormImportar from './form';

export default async function ImportarClientes() {
  await requireGestor();
  return (
    <>
      <div className="cabecalho">
        <h1>Importar clientes</h1>
        <Link className="btn sec" href="/gestao/clientes">Voltar</Link>
      </div>
      <FormImportar />
    </>
  );
}
