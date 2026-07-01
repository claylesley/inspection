const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron:      true,
  savePDF:         (base64, filename, photos) => ipcRenderer.invoke("save-pdf", base64, filename, photos),
  onAppClosing:    (callback) => ipcRenderer.on("app-closing", () => callback()),
  signOutComplete: () => ipcRenderer.send("sign-out-complete"),
  torchSet:         (enabled) => ipcRenderer.invoke("torch-set", enabled),
  onSessionRefresh: (callback) => ipcRenderer.on("session-refresh", () => callback()),
  getMacAddress:    () => ipcRenderer.invoke("get-mac-address"),
  getDeviceName:    () => ipcRenderer.invoke("get-device-name"),
});
