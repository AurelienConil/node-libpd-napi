const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('libpd', {
    start: () => ipcRenderer.invoke('libpd:start'),
    stop: () => ipcRenderer.invoke('libpd:stop'),
    openPatch: (nameOrPath) => ipcRenderer.invoke('libpd:openPatch', nameOrPath),
    closePatch: () => ipcRenderer.invoke('libpd:closePatch')
})
