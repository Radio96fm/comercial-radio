'use client';
import { useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { importarClientes } from '../../actions';

// Colunas que o sistema entende. A ordem importa: "nome do contato" deve cair em
// contato, não em nome, então "nome" é o último a ser procurado.
const CAMPOS = [
  { k: 'razao_social', rotulo: 'Razão social', chaves: ['razao social', 'razao'] },
  { k: 'documento', rotulo: 'CNPJ / CPF', chaves: ['cnpj', 'cpf', 'documento'] },
  { k: 'email', rotulo: 'E-mail', chaves: ['e-mail', 'email'] },
  { k: 'telefone', rotulo: 'Telefone', chaves: ['telefone', 'fone', 'celular', 'whatsapp'] },
  { k: 'contato_nome', rotulo: 'Contato', chaves: ['contato', 'responsavel', 'pessoa'] },
  { k: 'vendedor', rotulo: 'Vendedor', chaves: ['vendedor', 'carteira', 'executivo', 'representante'] },
  { k: 'segmento', rotulo: 'Segmento', chaves: ['segmento', 'ramo', 'atividade', 'categoria'] },
  { k: 'endereco', rotulo: 'Endereço', chaves: ['endereco', 'rua', 'logradouro'] },
  { k: 'cidade', rotulo: 'Cidade', chaves: ['cidade', 'municipio'] },
  { k: 'observacoes', rotulo: 'Observações', chaves: ['observac', 'obs', 'anotac'] },
  { k: 'nome', rotulo: 'Empresa', chaves: ['nome fantasia', 'fantasia', 'empresa', 'cliente', 'nome'] },
];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

function lerCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const primeira = texto.split(/\r?\n/)[0] || '';
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

function mapearColunas(cabecalho) {
  const mapa = {};
  const usadas = new Set();
  const nomes = cabecalho.map(norm);
  for (const c of CAMPOS) {
    let idx = nomes.findIndex((h, i) => !usadas.has(i) && c.chaves.includes(h));
    if (idx < 0) idx = nomes.findIndex((h, i) => !usadas.has(i) && h && c.chaves.some((ch) => h.includes(ch)));
    if (idx >= 0) { mapa[c.k] = idx; usadas.add(idx); }
  }
  return mapa;
}

const MODELO = 'Empresa;Segmento;Contato;Telefone;Cidade;Vendedor;Observações\nPadaria Exemplo;Restaurante / Alimentação;Maria;(00) 00000-0000;Sua cidade;Nome do vendedor;\n';

export default function FormImportar() {
  const [linhas, setLinhas] = useState(null);
  const [mapa, setMapa] = useState({});
  const [arquivo, setArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function aoEscolher(e) {
    const f = e.target.files?.[0];
    setErro(''); setResultado(null); setLinhas(null);
    if (!f) return;
    setArquivo(f.name);
    try {
      let dados;
      if (/\.(xlsx)$/i.test(f.name)) dados = await readSheet(f);
      else if (/\.(csv|txt)$/i.test(f.name)) dados = lerCSV(await f.text());
      else throw new Error('Use um arquivo .xlsx (Excel) ou .csv.');
      dados = (dados || []).map((l) => (l || []).map((v) => (v == null ? '' : v instanceof Date ? v.toLocaleDateString('pt-BR') : String(v))));
      const inicio = dados.findIndex((l) => l.some((v) => v.trim()));
      if (inicio < 0) throw new Error('A planilha está vazia.');
      const m = mapearColunas(dados[inicio]);
      if (m.nome === undefined) throw new Error('Não achei a coluna com o nome da empresa. A primeira linha precisa ter os títulos, por exemplo "Empresa".');
      const corpo = dados.slice(inicio + 1).filter((l) => l.some((v) => v.trim()));
      const objetos = corpo.map((l) => Object.fromEntries(Object.entries(m).map(([k, i]) => [k, (l[i] || '').trim()])));
      setMapa(m);
      setLinhas(objetos);
    } catch (err) {
      setErro(err.message || 'Não foi possível ler o arquivo.');
    }
  }

  async function importar() {
    setEnviando(true); setErro('');
    const total = { importados: 0, duplicados: 0, semNome: 0, segmentosCriados: 0, vendedoresNaoAchados: new Set() };
    try {
      for (let i = 0; i < linhas.length; i += 500) {
        const r = await importarClientes(linhas.slice(i, i + 500));
        if (r?.erro) throw new Error(r.erro);
        total.importados += r.importados; total.duplicados += r.duplicados;
        total.semNome += r.semNome; total.segmentosCriados += r.segmentosCriados;
        r.vendedoresNaoAchados.forEach((v) => total.vendedoresNaoAchados.add(v));
      }
      setResultado({ ...total, vendedoresNaoAchados: [...total.vendedoresNaoAchados] });
      setLinhas(null);
    } catch (err) {
      setErro(err.message);
      if (total.importados) setResultado({ ...total, vendedoresNaoAchados: [...total.vendedoresNaoAchados] });
    } finally {
      setEnviando(false);
    }
  }

  const colunas = CAMPOS.filter((c) => mapa[c.k] !== undefined).reverse();

  return (
    <>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          Exporte os clientes do sistema atual em <b>Excel (.xlsx)</b> ou <b>.csv</b> e envie aqui. A primeira linha precisa ter os títulos das colunas.
          O sistema reconhece: Empresa, Segmento, Contato, Telefone, Cidade, Vendedor, E-mail, CNPJ, Razão social, Endereço e Observações.
        </p>
        <p className="muted">
          Clientes com o mesmo nome de um já cadastrado são pulados. Segmentos novos são criados. Na coluna Vendedor, use o nome ou o e-mail do vendedor no sistema; sem ela, o cliente fica sem vendedor e você distribui depois.
        </p>
        <a className="btn peq sec" download="modelo-clientes.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent('﻿' + MODELO)}`}>Baixar planilha modelo</a>
      </div>

      <div className="card">
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="arquivo">Arquivo da planilha</label>
          <input id="arquivo" type="file" accept=".xlsx,.csv,.txt" onChange={aoEscolher} />
        </div>
      </div>

      {erro && <div className="alerta erro">{erro}</div>}

      {resultado && (
        <div className="alerta ok">
          {resultado.importados} {resultado.importados === 1 ? 'cliente importado' : 'clientes importados'}.
          {resultado.duplicados ? ` ${resultado.duplicados} já existiam e foram pulados.` : ''}
          {resultado.semNome ? ` ${resultado.semNome} linhas sem nome foram ignoradas.` : ''}
          {resultado.segmentosCriados ? ` ${resultado.segmentosCriados} segmentos novos criados.` : ''}
          {resultado.vendedoresNaoAchados.length ? ` Vendedores não encontrados (clientes ficaram sem vendedor): ${resultado.vendedoresNaoAchados.join(', ')}.` : ''}
        </div>
      )}

      {linhas && (
        <>
          <div className="cabecalho" style={{ marginTop: 6 }}>
            <h2 style={{ margin: 0 }}>{arquivo}: {linhas.length} {linhas.length === 1 ? 'linha' : 'linhas'}</h2>
            <button className="btn" onClick={importar} disabled={enviando || !linhas.length}>
              {enviando ? 'Importando...' : `Importar ${linhas.length} clientes`}
            </button>
          </div>
          <p className="muted">Prévia das primeiras 10 linhas. Confira se cada coluna caiu no lugar certo.</p>
          <div className="tabela">
            <table>
              <thead><tr>{colunas.map((c) => <th key={c.k}>{c.rotulo}</th>)}</tr></thead>
              <tbody>
                {linhas.slice(0, 10).map((l, i) => (
                  <tr key={i}>{colunas.map((c) => <td key={c.k}>{l[c.k]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
