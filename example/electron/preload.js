const { contextBridge, ipcRenderer } = require('electron')

// Le preload.js servira uniquement de pont entre le renderer et le main process
// car les modules natifs comme node-libpd-napi doivent être chargés dans le processus principal

// Exposer les fonctions au frontend via Context Bridge
// Ces fonctions appellent le main process via IPC
contextBridge.exposeInMainWorld('libpd', {
    // État de l'initialisation
    isInitialized: async () => await ipcRenderer.invoke('libpd:isInitialized'),

    // Contrôle audio
    start: async () => await ipcRenderer.invoke('libpd:start'),
    stop: async () => await ipcRenderer.invoke('libpd:stop'),

    // Gestion des patchs
    openPatch: async (fileNameOrPath) => await ipcRenderer.invoke('libpd:openPatch', fileNameOrPath),
    closePatch: async () => await ipcRenderer.invoke('libpd:closePatch'),

    // Envoyer des messages au patch
    sendFloat: async (receiver, value) => await ipcRenderer.invoke('libpd:sendFloat', receiver, value),
    sendBang: async (receiver) => await ipcRenderer.invoke('libpd:sendBang', receiver),
    sendSymbol: async (receiver, symbol) => await ipcRenderer.invoke('libpd:sendSymbol', receiver, symbol),

    // Récupérer la configuration audio
    getConfig: async () => await ipcRenderer.invoke('libpd:getConfig'),

    // Événements
    onAudioSettingsChanged: (callback) => {
        ipcRenderer.on('audio-settings-changed', (_, data) => callback(data));
    }
})
