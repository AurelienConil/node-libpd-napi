const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const pdEngineManager = require('./pd-engine-manager')
const { createApplicationMenu } = require('./menu')

// Fonction pour résoudre les chemins des patchs
function resolvePatchPath(relOrAbs) {
    if (path.isAbsolute(relOrAbs)) return relOrAbs
    return path.join(__dirname, 'patches', relOrAbs)
}

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 750,
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

    // Créer et attacher le menu personnalisé en utilisant le module externe
    createApplicationMenu(win, pdEngineManager)
}

app.whenReady().then(() => {
    // Initialiser libpd dans le processus principal (aucune copie de dylib nécessaire)
    initializePd()

    // Configurer les gestionnaires IPC
    setupIpcHandlers()

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
        console.log('Tentative d\'initialisation du moteur PureData...')

        // Pour le débogage, afficher tous les chemins de recherche des modules
        console.log('Module search paths:', module.paths)

        // Plus besoin de manipuler des bibliothèques dynamiques lorsque libpd est liée statiquement

        // Initialiser le gestionnaire de moteur PureData
        if (pdEngineManager.initialize()) {
            console.log('Moteur PureData initialisé avec succès')

            // Démarrer le moteur audio
            if (pdEngineManager.start()) {
                console.log('Moteur audio démarré avec succès')

                // Ouvrir le patch
                const patchPath = resolvePatchPath('patch.pd')
                if (pdEngineManager.openPatch(patchPath)) {
                    console.log(`Patch ouvert avec succès: ${patchPath}`)
                    return true
                }
            }
        }

        return false
    } catch (e) {
        console.error('Échec du chargement ou de l\'initialisation de node-libpd-napi:', e)
        console.error('Stack trace:', e.stack)
        return false
    }
}

// Configurer les gestionnaires IPC pour communiquer avec le renderer
function setupIpcHandlers() {
    // État de l'initialisation
    ipcMain.handle('libpd:isInitialized', () => {
        return pdEngineManager.isInitialized()
    })

    // Contrôle audio
    ipcMain.handle('libpd:start', () => {
        return pdEngineManager.start()
    })

    ipcMain.handle('libpd:stop', () => {
        return pdEngineManager.stop()
    })

    // Gestion des patchs
    ipcMain.handle('libpd:openPatch', (event, fileNameOrPath) => {
        try {
            const full = resolvePatchPath(fileNameOrPath)
            return pdEngineManager.openPatch(full) ? full : false
        } catch (e) {
            console.error('Erreur lors de l\'ouverture du patch:', e)
            return false
        }
    })

    ipcMain.handle('libpd:closePatch', () => {
        return pdEngineManager.closePatch()
    })

    // Envoyer des messages au patch
    ipcMain.handle('libpd:sendFloat', (event, receiver, value) => {
        return pdEngineManager.sendFloat(receiver, value)
    })

    ipcMain.handle('libpd:sendBang', (event, receiver) => {
        return pdEngineManager.sendBang(receiver)
    })

    ipcMain.handle('libpd:sendSymbol', (event, receiver, symbol) => {
        return pdEngineManager.sendSymbol(receiver, symbol)
    })

    // Récupérer et modifier la configuration audio
    ipcMain.handle('libpd:getConfig', () => {
        return pdEngineManager.getConfig()
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
    if (pdEngineManager.isInitialized()) {
        try {
            console.log('Nettoyage des ressources PureData...')
            pdEngineManager.cleanup()
            console.log('Nettoyage terminé avec succès!')
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
