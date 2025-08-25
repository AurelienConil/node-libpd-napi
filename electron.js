'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { app } = require('electron')

// Import le module principal
const libpd = require('./index')

// Fonction pour configurer les chemins de bibliothèques pour Electron
function setupElectronLibraryPaths() {
    // Dans Electron, on peut utiliser app.getAppPath() pour obtenir le chemin de l'application
    const appPath = app.getAppPath()
    const nodeModulesPath = path.join(appPath, 'node_modules', 'node-libpd-napi')
    
    // Déterminer les chemins possibles pour la bibliothèque
    const possibleLibDirs = [
        path.join(nodeModulesPath, 'lib'),
        path.join(nodeModulesPath, 'build', 'Release')
    ]
    
    // Déterminer le nom de la bibliothèque selon la plateforme
    let libName
    switch (process.platform) {
        case 'darwin': libName = 'libpd.dylib'; break
        case 'linux': libName = 'libpd.so'; break
        case 'win32': libName = 'libpd.dll'; break
        default: throw new Error(`Plateforme non supportée: ${process.platform}`)
    }
    
    // Chercher la bibliothèque dans les chemins possibles
    let libPath = null
    for (const dir of possibleLibDirs) {
        const testPath = path.join(dir, libName)
        if (fs.existsSync(testPath)) {
            libPath = testPath
            break
        }
    }
    
    if (libPath) {
        // Copier la bibliothèque dans le répertoire de l'application si nécessaire
        const targetPath = path.join(appPath, libName)
        if (!fs.existsSync(targetPath)) {
            try {
                fs.copyFileSync(libPath, targetPath)
                console.log(`Bibliothèque ${libName} copiée dans ${appPath} pour Electron`)
            } catch (err) {
                console.warn(`Avertissement: Impossible de copier ${libName} vers ${appPath}: ${err.message}`)
            }
        }
    } else {
        console.warn(`Avertissement: Impossible de trouver ${libName} dans les chemins de recherche`)
    }
}

// Configuration spécifique à Electron
if (process.type === 'browser') {
    // Seulement dans le processus principal d'Electron
    try {
        setupElectronLibraryPaths()
    } catch (err) {
        console.error(`Erreur lors de la configuration des chemins pour Electron: ${err.message}`)
    }
}

module.exports = libpd
