// Programa para Windows: abre o sistema da rádio numa janela própria e se atualiza sozinho.
// O mesmo código gera os dois programas; o que muda é o "app.json" que cada instalador leva.
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const config = require('./app.json') // vem de apps/<programa>/app.json no instalador;

const SITE = 'https://comercial-radio.vercel.app';
let janela;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  if (!janela) return;
  if (janela.isMinimized()) janela.restore();
  janela.focus();
});

function criarJanela() {
  janela = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: config.nome,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'icone.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  janela.loadURL(SITE + config.inicio);

  // links de fora do sistema (WhatsApp, PDF de outro site, banco) abrem no navegador
  const deFora = (url) => !url.startsWith(SITE);
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (deFora(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
  });
  janela.webContents.on('will-navigate', (e, url) => {
    if (deFora(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  janela.webContents.on('did-fail-load', (_e, codigo) => {
    if (codigo === -3) return; // navegação cancelada
    janela.loadFile(path.join(__dirname, 'sem-internet.html'), { query: { voltar: SITE + config.inicio } });
  });
  janela.on('closed', () => { janela = null; });
}

// Atualização: confere ao abrir e a cada 4 horas; baixa sozinho e instala ao fechar o programa
function atualizar() {
  autoUpdater.channel = config.canal;
  autoUpdater.allowDowngrade = false;
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(janela, {
      type: 'info',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      title: 'Atualização pronta',
      message: `A versão ${info.version} do ${config.nome} já foi baixada.`,
      detail: 'Ela entra quando você reiniciar o programa.',
    }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall(); });
  });
  autoUpdater.on('error', () => {});
  const conferir = () => autoUpdater.checkForUpdates().catch(() => {});
  conferir();
  setInterval(conferir, 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Programa', submenu: [
      { label: 'Recarregar', accelerator: 'F5', click: () => janela?.webContents.reload() },
      { label: 'Início', click: () => janela?.loadURL(SITE + config.inicio) },
      { type: 'separator' },
      { label: 'Aumentar', role: 'zoomIn' }, { label: 'Diminuir', role: 'zoomOut' }, { label: 'Tamanho normal', role: 'resetZoom' },
      { type: 'separator' },
      { label: `Versão ${app.getVersion()}`, enabled: false },
      { label: 'Procurar atualização', click: () => autoUpdater.checkForUpdates().catch(() => {}) },
      { type: 'separator' },
      { label: 'Sair', role: 'quit' },
    ] },
  ]));
  criarJanela();
  if (app.isPackaged) atualizar();
});

app.on('window-all-closed', () => app.quit());
