'use strict'

const path = require('node:path')
const fs = require('node:fs')
const bindings = require('bindings')
const os = require('os')

// Configurer les chemins de recherche pour les bibliothèques partagées
function setupLibraryPaths() {
    // Déterminer le nom de la bibliothèque selon la plateforme
    let libName, platformDir
    switch (os.platform()) {
        case 'darwin':
            libName = 'libpd.dylib';
            platformDir = 'macos';
            break
        case 'linux':
            libName = 'libpd.so';
            platformDir = 'linux';
            break
        case 'win32':
            libName = 'libpd.dll';
            platformDir = 'win';
            break
        default:
            throw new Error(`Plateforme non supportée: ${os.platform()}`)
    }

    // Liste exhaustive de tous les emplacements possibles pour la bibliothèque
    const possiblePaths = [
        // 1. Dans les répertoires spécifiques à la plateforme (prioritaires)
        path.join(__dirname, 'lib', platformDir),
        // 2. Dans le répertoire lib central
        path.join(__dirname, 'lib'),
        // 3. Dans les répertoires de build
        path.join(__dirname, 'build', 'Release'),
        path.join(__dirname, 'build', 'Debug'),
        // 4. Dans le répertoire courant et ses sous-répertoires
        __dirname,
        // 5. Dans des emplacements relatifs courants
        path.join(__dirname, '..', 'lib', platformDir),
        path.join(__dirname, '..', 'lib')
    ]

    console.log(`Recherche de ${libName} pour la plateforme ${os.platform()}...`)

    // Configuration spécifique à chaque plateforme
    if (os.platform() === 'darwin') {
        // Sur macOS, configurer la variable d'environnement DYLD_LIBRARY_PATH
        const currentPaths = process.env.DYLD_LIBRARY_PATH ?
            process.env.DYLD_LIBRARY_PATH.split(':') : []

        // Ajouter nos chemins s'ils ne sont pas déjà présents
        for (const p of possiblePaths) {
            if (!currentPaths.includes(p) && fs.existsSync(p)) {
                currentPaths.push(p)
            }
        }

        // Mettre à jour la variable d'environnement
        process.env.DYLD_LIBRARY_PATH = currentPaths.join(':')

        // Sur macOS, on peut aussi utiliser DYLD_FALLBACK_LIBRARY_PATH comme secours
        if (!process.env.DYLD_FALLBACK_LIBRARY_PATH) {
            process.env.DYLD_FALLBACK_LIBRARY_PATH = currentPaths.join(':')
        }
    } else if (os.platform() === 'linux') {
        // Sur Linux, configurer LD_LIBRARY_PATH
        const currentPaths = process.env.LD_LIBRARY_PATH ?
            process.env.LD_LIBRARY_PATH.split(':') : []

        for (const p of possiblePaths) {
            if (!currentPaths.includes(p) && fs.existsSync(p)) {
                currentPaths.push(p)
            }
        }

        process.env.LD_LIBRARY_PATH = currentPaths.join(':')
    }

    // Méthode 1: Copier la bibliothèque à côté du module natif .node
    try {
        const nodePath = bindings.getRoot(__dirname)
        if (nodePath) {
            const nativeModuleDir = path.dirname(nodePath)
            const targetPath = path.join(nativeModuleDir, libName)

            // Chercher la bibliothèque dans les chemins possibles
            let sourceFound = false
            for (const p of possiblePaths) {
                const sourcePath = path.join(p, libName)
                if (fs.existsSync(sourcePath)) {
                    sourceFound = true
                    if (!fs.existsSync(targetPath)) {
                        fs.copyFileSync(sourcePath, targetPath)
                        console.log(`Copié ${libName} à côté du module natif: ${targetPath}`)
                    }
                    break
                }
            }

            if (!sourceFound) {
                console.warn(`Avertissement: ${libName} introuvable dans les chemins de recherche.`)
            }
        }
    } catch (err) {
        console.warn(`Avertissement: Méthode 1 - ${err.message}`)
    }

    // Méthode 2: Copier dans les répertoires de recherche standard du système
    try {
        let sourceLib = null

        // Trouver la première occurrence de la bibliothèque
        for (const p of possiblePaths) {
            const sourcePath = path.join(p, libName)
            if (fs.existsSync(sourcePath)) {
                sourceLib = sourcePath
                break
            }
        }

        if (sourceLib) {
            // Liste des répertoires où copier selon la plateforme
            const systemLibDirs = []

            if (os.platform() === 'darwin') {
                // Sur macOS, essayer des répertoires courants
                if (process.resourcesPath) { // Sous Electron
                    systemLibDirs.push(process.resourcesPath)
                }
            }

            // Copier dans les répertoires systèmes si possible
            for (const dir of systemLibDirs) {
                if (fs.existsSync(dir)) {
                    const targetPath = path.join(dir, libName)
                    if (!fs.existsSync(targetPath)) {
                        try {
                            fs.copyFileSync(sourceLib, targetPath)
                            console.log(`Copié ${libName} vers ${targetPath}`)
                        } catch (e) {
                            console.warn(`Impossible de copier vers ${targetPath}: ${e.message}`)
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn(`Avertissement: Méthode 2 - ${err.message}`)
    }
}

// Configurer les chemins de bibliothèques avant de charger le module
setupLibraryPaths()

// When running under Electron, cmake-js build with -r electron ensures ABI match
const addon = bindings({
    bindings: 'node-libpd-napi',
    module_root: __dirname,
})

module.exports = addon
