// electron/main.js
// Place this file at:  <project-root>/electron/main.js

const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width:    1280,
    height:   860,
    minWidth: 420,
    minHeight:600,
    title: "The Groves — Inspection App",
    // icon: path.join(__dirname, "icon.ico"),   // ← add your .ico here
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      // preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    // Development: load from Vite dev server
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // Production: load the built React app
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Open external links in the system browser, not in-app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// Remove default menu bar (optional — comment out to keep it)
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
