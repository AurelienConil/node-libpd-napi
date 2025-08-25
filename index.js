'use strict'

const path = require('node:path')
const fs = require('node:fs')
const bindings = require('bindings')
const os = require('os')

// Configurer les chemins de recherche pour les bibliothèques partagées
function setupLibraryPaths() {
    // Déterminer le nom de la bibliothèque selon la plateforme
    let libName
    switch (os.platform()) {
        case 'darwin': libName = 'libpd.dylib'; break
        case 'linux': libName = 'libpd.so'; break
        case 'win32': libName = 'libpd.dll'; break
        default: throw new Error(`Plateforme non supportée: ${os.platform()}`)
    }
    
    // Ajouter des chemins de recherche pour la bibliothèque
    const possiblePaths = [
        // 1. Dans le répertoire lib du module
        path.join(__dirname, 'lib'),
        // 2. Dans le répertoire build/Release
        path.join(__dirname, 'build', 'Release'),
        // 3. Dans le répertoire courant (pour le développement)
        __dirname
    ]
    
    // Sur macOS, configurer la variable d'environnement DYLD_LIBRARY_PATH
    if (os.platform() === 'darwin') {
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
        
        // Sur macOS, copier la bibliothèque à côté du .node si elle n'y est pas déjà
        // (solution de secours pour les cas où DYLD_LIBRARY_PATH ne fonctionne pas)
        try {
            const nodePath = bindings.getRoot(__dirname)
            const targetPath = path.join(path.dirname(nodePath), libName)
            
            // Chercher la bibliothèque dans les chemins possibles
            for (const p of possiblePaths) {
                const sourcePath = path.join(p, libName)
                if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
                    fs.copyFileSync(sourcePath, targetPath)
                    console.log(`Copié ${libName} à côté du module natif pour assurer le chargement.`)
                    break
                }
            }
        } catch (err) {
            console.warn(`Avertissement: Impossible de copier ${libName}: ${err.message}`)
        }
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
