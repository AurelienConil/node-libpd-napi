// Electron main process: loads node-libpd-napi, runs the Pd patch and exposes it to the renderer via IPC.
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// Variable globale pour l'instance de PdEngine
let engine = null
let pdInitialized = false

// libpd is C code and cannot read inside app.asar: patches are unpacked
// (see asarUnpack in package.json), so point to the real directory.
const PATCHES_DIR = path.join(__dirname, 'patches').replace('app.asar', 'app.asar.unpacked')

// Fonction pour résoudre les chemins des patchs
function resolvePatchPath(relOrAbs) {
    if (path.isAbsolute(relOrAbs)) return relOrAbs
    return path.join(PATCHES_DIR, relOrAbs)
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
    if (initializePd()) {
        setupIpcHandlers()
    } else {
        console.error('ERREUR: initialisation de libpd échouée')
        // Continuer quand même pour que l'UI soit visible, mais l'audio ne fonctionnera pas
    }

    // Créer la fenêtre principale
    createWindow()

    // Standard macOS behavior
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Initialiser PureData
function initializePd() {
    try {
        console.log('Chargement du module node-libpd-napi...')
        const addon = require('node-libpd-napi')
        console.log('Module chargé avec succès!')

        console.log('Création d\'une instance de PdEngine...')
        // Configuration des paramètres audio
        engine = new addon.PdEngine({
            sampleRate: 48000,
            blockSize: 1024, // Configure la taille du buffer audio dans miniaudio
            channelsOut: 2,
            channelsIn: 0
        })
        console.log('Instance créée avec succès!')

        // Démarrage du moteur audio
        try {
            console.log('Démarrage du moteur audio...')
            engine.start()
            console.log('Moteur audio démarré!')
        } catch (err) {
            console.error('ERREUR lors du démarrage du moteur audio:', err)
        }

        // Ouverture du patch
        try {
            const patchPath = resolvePatchPath('patch.pd')
            console.log(`Ouverture du patch: ${patchPath}`)
            engine.openPatch(patchPath)
            console.log('Patch ouvert avec succès!')
        } catch (err) {
            console.error('ERREUR lors de l\'ouverture du patch:', err)
        }

        pdInitialized = true;
        return true
    } catch (e) {
        console.error('Échec du chargement ou de l\'initialisation de node-libpd-napi:', e)
        console.error('Stack trace:', e.stack)
        pdInitialized = false;
        return false
    }
}

// Configurer les gestionnaires IPC pour communiquer avec le renderer
function setupIpcHandlers() {
    // État de l'initialisation
    ipcMain.handle('libpd:isInitialized', () => {
        return pdInitialized && engine !== null
    })

    // Contrôle audio
    ipcMain.handle('libpd:start', () => {
        if (!engine) return false
        try {
            engine.start()
            return true
        } catch (e) {
            console.error('Erreur lors du démarrage audio:', e)
            return false
        }
    })

    ipcMain.handle('libpd:stop', () => {
        if (!engine) return false
        try {
            engine.stop()
            return true
        } catch (e) {
            console.error('Erreur lors de l\'arrêt audio:', e)
            return false
        }
    })

    // Gestion des patchs
    ipcMain.handle('libpd:openPatch', (event, fileNameOrPath) => {
        if (!engine) return false
        try {
            const full = resolvePatchPath(fileNameOrPath)
            engine.openPatch(full)
            return full
        } catch (e) {
            console.error('Erreur lors de l\'ouverture du patch:', e)
            return false
        }
    })

    ipcMain.handle('libpd:closePatch', () => {
        if (!engine) return false
        try {
            if (engine.closePatch) {
                engine.closePatch()
            }
            return true
        } catch (e) {
            console.error('Erreur lors de la fermeture du patch:', e)
            return false
        }
    })

    // Envoyer des messages au patch
    ipcMain.handle('libpd:sendFloat', (event, receiver, value) => {
        if (!engine) return false
        try {
            engine.sendFloat(receiver, value)
            return true
        } catch (e) {
            console.error(`Erreur lors de l'envoi de ${value} à ${receiver}:`, e)
            return false
        }
    })

    ipcMain.handle('libpd:sendBang', (event, receiver) => {
        if (!engine) return false
        try {
            engine.sendBang(receiver)
            return true
        } catch (e) {
            console.error(`Erreur lors de l'envoi d'un bang à ${receiver}:`, e)
            return false
        }
    })

    ipcMain.handle('libpd:sendSymbol', (event, receiver, symbol) => {
        if (!engine) return false
        try {
            engine.sendSymbol(receiver, symbol)
            return true
        } catch (e) {
            console.error(`Erreur lors de l'envoi de ${symbol} à ${receiver}:`, e)
            return false
        }
    })
}

// Quitter l'application quand toutes les fenêtres sont fermées
// Dans notre cas, nous voulons toujours quitter complètement pour libérer les ressources audio
app.on('window-all-closed', function () {
    console.log('Toutes les fenêtres sont fermées, nettoyage des ressources...')

    // Arrêter le moteur PureData
    cleanupPureData()

    // Quitter l'application sur toutes les plateformes, même macOS
    // car notre application audio n'a pas de raison de tourner en arrière-plan
    app.quit()

    // Forcer la sortie après un délai au cas où quelque chose bloquerait
    setTimeout(() => {
        console.log('Forçage de la sortie après délai de sécurité')
        process.exit(0)
    }, 2000)
})

// Fonction de nettoyage pour arrêter proprement PureData
function cleanupPureData() {
    if (engine) {
        try {
            console.log('Fermeture du patch...')
            if (engine.closePatch) {
                engine.closePatch()
            }

            console.log('Arrêt du moteur audio...')
            engine.stop()
            console.log('Moteur audio arrêté avec succès!')

            // Libérer la référence
            engine = null
            pdInitialized = false
        } catch (err) {
            console.error('Erreur lors du nettoyage des ressources PureData:', err)
        }
    }
}

// S'assurer que le moteur est arrêté avant de quitter
app.on('before-quit', () => {
    console.log('Application en cours de fermeture, nettoyage des ressources...')
    cleanupPureData()
})

// Gérer également l'arrêt forcé
process.on('SIGINT', () => {
    console.log('Interruption reçue (SIGINT), nettoyage des ressources...')
    cleanupPureData()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('Terminaison reçue (SIGTERM), nettoyage des ressources...')
    cleanupPureData()
    process.exit(0)
})
