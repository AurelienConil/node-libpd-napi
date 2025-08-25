const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

let engine = null

function resolvePatchPath(relOrAbs) {
    if (path.isAbsolute(relOrAbs)) return relOrAbs
    return path.join(__dirname, 'patches', relOrAbs)
}

function createWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 380,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            enableRemoteModule: false
        }
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    // Load native addon in main process
    try {
        console.log('Tentative de chargement du module node-libpd-napi...')
        const addon = require('node-libpd-napi')
        console.log('Module chargé avec succès!')

        console.log('Création d\'une instance de PdEngine...')
        engine = new addon.PdEngine()
        console.log('Instance créée avec succès!')

        try {
            // Démarrage du moteur audio immédiatement
            console.log('Démarrage du moteur audio...')
            engine.start()
            console.log('Moteur audio démarré!')
        } catch (err) {
            console.error('ERREUR lors du démarrage du moteur audio:', err)
            // Continuons même en cas d'erreur
        }

        try {
            // Ouverture du patch
            const patchPath = resolvePatchPath('patch.pd')
            console.log(`Ouverture du patch: ${patchPath}`)
            engine.openPatch(patchPath)
            console.log('Patch ouvert avec succès!')
        } catch (err) {
            console.error('ERREUR lors de l\'ouverture du patch:', err)
        }
    } catch (e) {
        console.error('Échec du chargement ou de l\'initialisation de node-libpd-napi:', e)
        console.error('Stack trace:', e.stack)
    }

    // IPC API exposed to renderer
    ipcMain.handle('libpd:start', async () => {
        if (!engine) throw new Error('PdEngine unavailable')
        try { engine.start(); return true } catch (e) { console.error(e); return false }
    })
    ipcMain.handle('libpd:stop', async () => {
        if (!engine) return false
        try { engine.stop(); return true } catch (e) { console.error(e); return false }
    })
    ipcMain.handle('libpd:openPatch', async (_e, fileNameOrPath) => {
        if (!engine) throw new Error('PdEngine unavailable')
        const full = resolvePatchPath(fileNameOrPath)
        try { engine.openPatch(full); return full } catch (e) { console.error(e); throw e }
    })
    ipcMain.handle('libpd:closePatch', async () => {
        if (!engine) return false
        try { engine.closePatch && engine.closePatch(); return true } catch (e) { console.error(e); return false }
    })

    createWindow()

    // Open default patch at startup and start audio (server-only)
    try {
        if (engine) {
            const defaultPatch = resolvePatchPath('patch.pd')
            engine.openPatch(defaultPatch)
            console.log('Opened patch at startup:', defaultPatch)
            // Start audio automatically (no user gesture required in main process)
            engine.start()
            console.log('Audio started')
        }
    } catch (e) {
        console.warn('Could not open default patch at startup:', e.message || e)
    }

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    // Gérer la fermeture de toutes les fenêtres
    app.on('window-all-closed', function () {
        console.log('Toutes les fenêtres sont fermées, arrêt du moteur audio...')
        
        // Arrêter le moteur PureData
        if (engine) {
            try {
                console.log('Fermeture du patch...')
                if (engine.closePatch) {
                    engine.closePatch()
                }
                
                console.log('Arrêt du moteur audio...')
                engine.stop()
                console.log('Moteur audio arrêté avec succès!')
                
                // Libérer les ressources
                engine = null
            } catch (err) {
                console.error('Erreur lors de l\'arrêt du moteur audio:', err)
            }
        }
        
        // Quitter l'application complètement
        app.quit()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
    try { engine && engine.stop() } catch { /* ignore */ }
})
