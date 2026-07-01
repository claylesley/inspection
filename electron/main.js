const { app, BrowserWindow, shell, Menu, ipcMain, powerMonitor, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const { spawn } = require("child_process");

function getMacAddress() {
  const ifaces = os.networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    for (const a of addrs) {
      if (!a.internal && a.mac && a.mac !== "00:00:00:00:00:00") return a.mac;
    }
  }
  return null;
}

ipcMain.handle("get-mac-address", () => getMacAddress());
ipcMain.handle("get-device-name",  () => os.hostname());
ipcMain.handle("set-zoom", (_, factor) => { if (win) win.webContents.setZoomFactor(factor); });

const isDev = !app.isPackaged;

let win        = null;
let lampProc   = null; // resident PowerShell process that keeps the torch ON

// ── Torch control via Windows.Devices.Lights.Lamp ──────────────────────────
// Spawning lamp.ps1 turns the LED on; killing it turns it off (WinRT cleanup).

function stopLamp() {
  if (lampProc) {
    try { lampProc.kill(); } catch {}
    lampProc = null;
  }
}

ipcMain.handle("torch-set", async (_event, enabled) => {
  stopLamp();
  if (!enabled) return { ok: true };

  const scriptPath = path.join(__dirname, "lamp.ps1");
  lampProc = spawn("powershell.exe", [
    "-NonInteractive", "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", scriptPath,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result) => { if (!settled) { settled = true; resolve(result); } };

    lampProc.stdout.once("data", (d) => {
      const line = d.toString().trim();
      settle({ ok: line === "ON", msg: line });
    });
    lampProc.stderr.once("data", (d) => {
      settle({ ok: false, msg: d.toString().trim() });
    });
    lampProc.once("close", (code) => {
      settle({ ok: false, msg: `Process exited (${code})` });
    });
    // Timeout — driver may be slow to respond
    setTimeout(() => settle({ ok: false, msg: "TIMEOUT" }), 5000);
  });
});

// ── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width:    1280,
    height:   860,
    minWidth: 420,
    minHeight:600,
    title: "The Groves — Inspection App",
    // icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.on("restore", () => win.webContents.send("session-refresh"));

  // Intercept close: confirm with user, then sign out
  win.on("close", (e) => {
    e.preventDefault();
    const choice = dialog.showMessageBoxSync(win, {
      type:    "question",
      buttons: ["Exit", "Cancel"],
      defaultId: 1,
      title:   "Exit The Groves",
      message: "Are you sure you want to exit?",
      detail:  "You will be signed out.",
    });
    if (choice !== 0) return; // Cancel
    stopLamp();
    win.webContents.send("app-closing");
    setTimeout(() => { if (win) win.destroy(); }, 2000);
  });
}

// Renderer signals sign-out is done
ipcMain.on("sign-out-complete", () => {
  stopLamp();
  if (win) win.destroy();
});

// ── Save PDF + photos to Documents/Inspections/ ─────────────────────────────

ipcMain.handle("save-pdf", (_event, base64, filename, photos) => {
  try {
    const inspectDir = path.join(app.getPath("documents"), "Inspections");
    if (!fs.existsSync(inspectDir)) fs.mkdirSync(inspectDir, { recursive: true });

    const pdfPath = path.join(inspectDir, filename);
    fs.writeFileSync(pdfPath, Buffer.from(base64, "base64"));

    if (photos && photos.length > 0) {
      const photoDir = path.join(inspectDir, filename.replace(".pdf", "_Photos"));
      if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
      photos.forEach(({ name, data }) => {
        const raw = data.includes(",") ? data.split(",")[1] : data;
        fs.writeFileSync(path.join(photoDir, name), Buffer.from(raw, "base64"));
      });
    }

    return { success: true, path: pdfPath, photoCount: photos?.length ?? 0 };
  } catch (err) {
    console.error("save-pdf error:", err);
    return { success: false, error: err.message };
  }
});

// ── App lifecycle ────────────────────────────────────────────────────────────

Menu.setApplicationMenu(null);

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-available", (info) => {
    const choice = dialog.showMessageBoxSync(win, {
      type:    "info",
      buttons: ["Download Update", "Later"],
      defaultId: 0,
      title:   "Update Available",
      message: `Version ${info.version} is available`,
      detail:  "A new version of The Groves Inspection app is ready. Download it now?",
    });
    if (choice === 0) autoUpdater.downloadUpdate();
  });

  autoUpdater.on("update-downloaded", () => {
    const choice = dialog.showMessageBoxSync(win, {
      type:    "info",
      buttons: ["Restart & Install", "Later"],
      defaultId: 0,
      title:   "Update Ready",
      message: "Update downloaded and ready to install",
      detail:  "Restart the app now to apply the update?",
    });
    if (choice === 0) autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err.message);
  });

  // Check 5 s after launch so the window is fully loaded first
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Notify renderer when system wakes from sleep or window regains focus
  // so it can silently refresh the Supabase session before showing login
  powerMonitor.on("resume", () => {
    if (win) win.webContents.send("session-refresh");
  });

  if (!isDev) setupAutoUpdater();
});

app.on("before-quit", () => stopLamp());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
