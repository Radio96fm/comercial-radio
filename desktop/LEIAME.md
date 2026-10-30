# Programas para Windows

Dois programas instaláveis que abrem o sistema numa janela própria:

- **Rádio Comercial** abre `/gestao` (gestão comercial).
- **Rádio Financeiro** abre `/financeiro`.

Os dois vêm do mesmo `main.js`. O que muda é o `apps/<programa>/app.json` e o `builder-<programa>.json`.

## Atualização

- **Telas e funções do sistema:** atualizam na hora, a cada publicação do site, porque o programa carrega o site.
- **O programa em si:** aumente `version` em `package.json` e envie para `main`.
  - A ação **Programas Windows** gera os instaladores e publica na aba Releases do GitHub.
  - Os programas instalados conferem ao abrir e a cada 4 horas, baixam a versão nova sozinhos e pedem para reiniciar.

## Download

https://github.com/Radio96fm/comercial-radio/releases/latest

- `comercial-setup-<versão>.exe`
- `financeiro-setup-<versão>.exe`

Sem certificado de assinatura de código, o Windows mostra o aviso "O Windows protegeu o computador". Para instalar mesmo assim: **Mais informações › Executar assim mesmo**.
