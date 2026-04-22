const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  runtime: "Electron Desktop",
});
