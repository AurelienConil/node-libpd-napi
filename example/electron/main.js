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
        // Utiliser la version spécifique pour Electron qui gère automatiquement les bibliothèques partagées
        const addon = require('node-libpd-napi/electron')
        console.log('Module chargé avec succès!')

        console.log('Création d\'une instance de PdEngine...')
        // Configuration des paramètres audio
        // Note: La taille du bloc audio est en nombre d'échantillons
        // Avec un sampleRate de 48000, un blockSize de 1024 donne une latence de ~21ms
        engine = new addon.PdEngine({
            sampleRate: 48000,
            blockSize: 1024, // Configure la taille du buffer audio dans miniaudio
            channelsOut: 2,
            channelsIn: 0
        })
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

    // API IPC exposée au renderer (uniquement le contrôle audio de base)
    ipcMain.handle('libpd:start', async () => {
        if (!engine) throw new Error('PdEngine unavailable')
        try { engine.start(); return true } catch (e) { console.error(e); return false }
    })
    ipcMain.handle('libpd:stop', async () => {
        if (!engine) return false
        try { engine.stop(); return true } catch (e) { console.error(e); return false }
    })

    // Ces handlers ne sont pas utilisés actuellement mais peuvent être utiles pour d'autres interfaces
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

    // Note: Le patch est déjà ouvert plus haut dans le code, pas besoin de le rouvrir ici
    // L'audio est également déjà démarré

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
