const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('libpd', {
    // Exposer uniquement les commandes de base pour le contrôle audio
    start: () => ipcRenderer.invoke('libpd:start'),
    stop: () => ipcRenderer.invoke('libpd:stop')
    // Les fonctions openPatch et closePatch ne sont plus nécessaires dans le renderer
})
