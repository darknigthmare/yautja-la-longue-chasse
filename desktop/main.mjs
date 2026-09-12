import { app, BrowserWindow, dialog, Menu, protocol, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { DESKTOP_RELEASE_TAG } from "./release.mjs";
import { APP_ORIGIN, CSP, appRoutePath, isAppUrl, resolveAppFile, parseAudioByteRange, appDownloadKind } from "./protocol.mjs";

app.setName("Yautja La Longue Chasse");
const qaProfile = process.env.YAUTJA_DESKTOP_QA_PROFILE;
app.setPath("userData", qaProfile ? path.resolve(qaProfile) : path.join(app.getPath("appData"), "YautjaLaLongueChasse"));
app.enableSandbox();
protocol.registerSchemesAsPrivileged([{
  scheme: "yautja",
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
}]);

let mainWindow;
let closing = false;
const auxiliary = new Map();
function logError(message) {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.appendFileSync(path.join(app.getPath("userData"), "desktop-errors.log"), new Date().toISOString() + " " + message + "\n");
  } catch { /* A read-only profile must not cause recursive crash reporting. */ }
}
function explainExternalLink() {
  if (!qaProfile) void dialog.showMessageBox({
    type: "info", title: "Édition hors ligne",
    message: "Les liens de référence externes ne sont pas ouverts par le jeu PC.",
    detail: "Les références restent consultables dans l’édition web. Aucun contenu distant n’est chargé ici.",
  });
}
function createWindow(route = "/") {
  const isMain = route === "/";
  const existing = isMain ? mainWindow : auxiliary.get(route);
  if (existing && !existing.isDestroyed()) {
    if (appRoutePath(existing.webContents.getURL()) !== route) {
      void existing.loadURL(APP_ORIGIN + route).catch((error) => logError("reload " + error.message));
    }
    if (existing.isMinimized()) existing.restore();
    if (!qaProfile) existing.show();
    existing.focus();
    return existing;
  }
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 640,
    backgroundColor: "#050706", show: false,
    title: "Yautja : La Longue Chasse · PC " + DESKTOP_RELEASE_TAG.toUpperCase() + " · hors ligne",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, spellcheck: false, devTools: !app.isPackaged || Boolean(qaProfile),
      backgroundThrottling: true,
    },
  });
  if (isMain) mainWindow = win; else auxiliary.set(route, win);
  win.once("ready-to-show", () => { if (!qaProfile) win.show(); });
  win.webContents.on("page-title-updated", (event) => event.preventDefault());
  win.webContents.on("will-navigate", (event, url) => {
    const target = appRoutePath(url);
    if (!target) { event.preventDefault(); explainExternalLink(); return; }
    if (target !== route) { event.preventDefault(); createWindow(target); }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    const target = appRoutePath(url);
    if (target) createWindow(target); else explainExternalLink();
    return { action: "deny" };
  });
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
  win.webContents.on("render-process-gone", (_event, details) => {
    logError("renderer " + details.reason + " exit=" + details.exitCode);
    if (!qaProfile) void dialog.showMessageBox({
      type: "error", message: "Le rendu du jeu s’est arrêté.",
      detail: "Relancez le jeu. Les sauvegardes déjà enregistrées restent dans le profil PC ; la dernière action peut ne pas avoir été sauvegardée.",
    });
  });
  win.on("close", (event) => {
    if (!isMain || closing) return;
    event.preventDefault();
    const answer = dialog.showMessageBoxSync(win, {
      type: "question", title: "Quitter la chasse",
      message: "Quitter le jeu ?",
      detail: "Pour conserver votre avancée, utilisez Suspendre dans la pause de la chasse. Une alerte d’enregistrement doit être résolue avant de quitter.",
      buttons: ["Continuer à jouer", "Quitter"], defaultId: 0, cancelId: 0,
    });
    if (answer !== 1) return;
    closing = true;
    session.defaultSession.flushStorageData();
    for (const other of auxiliary.values()) if (!other.isDestroyed()) other.close();
    win.close();
  });
  win.on("closed", () => {
    if (isMain) mainWindow = undefined; else auxiliary.delete(route);
  });
  void win.loadURL(APP_ORIGIN + route).catch((error) => logError("load " + error.message));
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  });
  // Electron emits ready after evaluating the ESM entry point: do not await ready at module scope.
  void app.whenReady().then(async () => {
  const currentSession = session.defaultSession;
  currentSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === "fullscreen"));
  currentSession.setPermissionCheckHandler((_webContents, permission, origin) => permission === "fullscreen" && isAppUrl(origin));
  currentSession.setDevicePermissionHandler(() => false);
  currentSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*", "file:///*", "ftp://*/*"] }, (_details, callback) => callback({ cancel: true }));
  currentSession.on("will-download", (event, item) => {
    const kind = appDownloadKind(item.getURL());
    if (!kind) { event.preventDefault(); return; }
    item.setSaveDialogOptions({
      title: kind === "image" ? "Exporter une image du jeu" : "Exporter une sauvegarde Yautja", defaultPath: path.join(app.getPath("documents"), path.basename(item.getFilename())),
      filters: kind === "image" ? [{ name: "Image du jeu", extensions: ["png", "webp", "jpg", "jpeg"] }] : [{ name: "Sauvegarde JSON", extensions: ["json"] }],
    });
  });
  const rendererRoot = path.join(app.getAppPath(), "renderer");
  await protocol.handle("yautja", async (request) => {
    const file = resolveAppFile(rendererRoot, request.url, request.method);
    if (!file) return new Response("Accès refusé", { status: 403 });
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile()) return new Response("Introuvable", { status: 404 });
      const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".flac": "audio/flac", ".aac": "audio/aac", ".webm": "audio/webm", ".opus": "audio/ogg", ".woff2": "font/woff2" };
      const headers = new Headers({ "Content-Type": mime[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
      headers.set("Content-Security-Policy", CSP);
      headers.set("X-Content-Type-Options", "nosniff");

      if (/\.(ogg|mp3|m4a|wav|flac|aac|webm|opus)$/i.test(file)) {
        headers.set("Accept-Ranges", "bytes");
        const range = parseAudioByteRange(request.headers.get("range"), stat.size);
        if (range === false) { headers.set("Content-Range", "bytes */" + stat.size); return new Response(null, { status: 416, headers }); }
        const start = range?.start ?? 0; const end = range?.end ?? stat.size - 1;
        headers.set("Content-Length", String(Math.max(0, end - start + 1)));
        if (range) headers.set("Content-Range", "bytes " + start + "-" + end + "/" + stat.size);
        if (request.method === "HEAD" || !stat.size) return new Response(null, { status: range ? 206 : 200, headers });
        const stream = fs.createReadStream(file, { start, end });
        const cancel = () => stream.destroy();
        request.signal.addEventListener("abort", cancel, { once: true });
        stream.once("close", () => request.signal.removeEventListener("abort", cancel));
        return new Response(Readable.toWeb(stream), { status: range ? 206 : 200, headers });
      }
      return new Response(request.method === "HEAD" ? null : await readFile(file), { status: 200, headers });
    } catch { return new Response("Introuvable", { status: 404 }); }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Jeu", submenu: [
      { label: "Plein écran", accelerator: "F11", click: (_item, win) => { if (win) win.setFullScreen(!win.isFullScreen()); } },
      { label: "Dossier des sauvegardes PC", click: async () => {
        const error = await shell.openPath(app.getPath("userData"));
        if (error) logError("open profile: " + error);
      } },
      { type: "separator" },
      { label: "Quitter", accelerator: "Alt+F4", click: () => mainWindow?.close() },
    ] },
    { label: "Édition", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "Aide", submenu: [
      { label: "À propos de cette version", click: () => { void dialog.showMessageBox({
        title: "Yautja : La Longue Chasse", message: "Édition PC " + DESKTOP_RELEASE_TAG.toUpperCase() + " · " + app.getVersion(),
        detail: "Jeu de fan non commercial. Moteur 2D React/Canvas, runtime Electron embarqué.\n\nJeu et ateliers accessibles sans réseau. Sauvegardes PC séparées du navigateur ; utilisez les exports et imports du jeu pour transférer la campagne.\n\nAlt : menu PC. F11 : plein écran. La signature, les tests matériels et la production artistique finale restent à terminer.",
      }); } },
    ] },
  ]));
  createWindow();
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => currentSession.flushStorageData());
  }).catch((error) => { logError("startup " + error.message); app.exit(1); });
}
