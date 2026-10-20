# Comercial · 96 FM & Rádio do Agro

Sistema do departamento comercial: programas, cotas de patrocínio, carteira de clientes, visitas, contratos e parcelas.

- **App do vendedor** (`/app`): feito para o celular, com botões grandes e poucas telas.
- **Painel do gestor** (`/gestao`): programas, usuários, contratos, modelo de contrato, parcelas e histórico.
- **Painel do Diretor** (`/diretor`): resumo para o dono das emissoras em blocos grandes (iPhone e iPad), com o login do gestor master. Para apresentar no computador: `/celular/diretor` (moldura de iPhone ou iPad).

Tecnologia: Next.js 14 (site) + Supabase (banco de dados, login e atualização ao vivo) + Vercel (hospedagem).

## Regras de negócio (garantidas pelo banco de dados)

- **Exclusividade de segmento:** o mesmo segmento não pode ter dois patrocinadores no mesmo programa no mesmo período.
- **Cotas:** um programa não aceita mais contratos simultâneos do que o número de cotas.
- Contratos *Aguardando assinatura* e *Ativos* ocupam vaga. *Cancelados* e *Encerrados* liberam a vaga.
- Cada cliente tem um vendedor responsável. Só o gestor transfere clientes entre vendedores.
- Tudo o que cada usuário faz fica registrado em **Histórico**.

## Segurança

- Row Level Security (RLS) ligada em **todas** as tabelas. Sem login, nada é lido nem gravado.
- O vendedor só altera o que é dele. Programas, usuários e modelos são exclusivos do gestor.
- O papel (gestor/vendedor) fica em `app_metadata`, que só o servidor consegue definir.
- A chave mestra do Supabase **nunca sai do Supabase**: criar/alterar logins passa pela função `admin-usuarios` (supabase/functions), chamada só pelo servidor com o segredo `ADMIN_PROXY_SECRET`, sempre depois de conferir que quem pede é gestor.
- Checklist obrigatório na instalação:
  1. Supabase → Authentication → Sign In / Providers → **desligar "Allow new users to sign up"**.
  2. Vercel → cadastrar `ADMIN_PROXY_SECRET` (o mesmo valor do segredo da função) marcada como **Sensitive**.
  3. Ativar verificação em duas etapas (2FA) nas contas GitHub, Supabase e Vercel.

## Instalação

1. **Supabase**: crie um projeto (região São Paulo). Abra o **SQL Editor**, cole e rode `supabase/schema.sql`. Depois cole e rode `supabase/seed.sql`.
2. **Supabase**: em *Authentication → Sign In / Providers*, desligue o cadastro público.
3. **GitHub**: suba esta pasta para um repositório **privado**.
4. **Vercel**: *Add New → Project*, importe o repositório e cadastre as variáveis de `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → API (URL e chave *anon/publishable*).
   - `ADMIN_PROXY_SECRET`: um segredo longo e aleatório, igual ao segredo `ADMIN_PROXY_SECRET` da função `admin-usuarios`, marcado como **Sensitive**.
5. Faça o deploy e abra `https://SEU-SITE.vercel.app/primeiro-acesso` para criar o usuário do gestor. Essa página se bloqueia depois que existe um gestor.
6. No painel, cadastre os vendedores em **Usuários**, ajuste **Programas** e o **Modelo de contrato**.

No celular, o vendedor abre o site e escolhe *Adicionar à tela inicial* para ter um ícone de app.

## Desenvolvimento local

```bash
cp .env.example .env.local   # preencha as chaves
npm install
npm run dev
```

## Próximas etapas

- Integração de boletos/Pix (Asaas, Efí, Banco Inter, Sicoob...): a tabela `parcelas` já tem os campos `gateway`, `gateway_id`, `linha_digitavel` e `url_boleto`.
- Assinatura eletrônica do contrato (ZapSign/Clicksign).
- Chatbot para os vendedores perguntarem disponibilidade ("tem vaga no Agro em Foco para farmácia?").
