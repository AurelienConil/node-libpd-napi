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

    // Plusieurs chemins potentiels pour trouver le module
    let moduleRoots = [
        // 1. Installation locale (développement)
        __dirname,
        // 2. Installation dans node_modules
        path.join(appPath, 'node_modules', 'node-libpd-napi'),
        // 3. Installation dans node_modules parent (workspace)
        path.join(appPath, '..', 'node_modules', 'node-libpd-napi')
    ]

    // Déterminer le nom de la bibliothèque selon la plateforme
    let libName, platformDir
    switch (process.platform) {
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
            throw new Error(`Plateforme non supportée: ${process.platform}`)
    }

    // Liste complète des chemins à vérifier pour chaque racine de module
    const getAllPossibleLibPaths = (moduleRoot) => {
        return [
            // 1. Dans le répertoire lib spécifique à la plateforme (recommandé)
            path.join(moduleRoot, 'lib', platformDir, libName),
            // 2. Dans le répertoire lib central
            path.join(moduleRoot, 'lib', libName),
            // 3. Dans le répertoire de build
            path.join(moduleRoot, 'build', 'Release', libName),
            // 4. À la racine du module (pour les tests)
            path.join(moduleRoot, libName)
        ];
    };

    console.log(`Electron: Recherche de ${libName} pour la plateforme ${process.platform}...`)

    // Chercher la bibliothèque dans tous les chemins possibles
    let libPath = null

    // Vérifier chaque racine de module
    for (const moduleRoot of moduleRoots) {
        if (!fs.existsSync(moduleRoot)) continue;

        console.log(`Vérification du module à: ${moduleRoot}`)
        const possiblePaths = getAllPossibleLibPaths(moduleRoot);

        // Vérifier chaque chemin possible pour cette racine
        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                libPath = possiblePath;
                console.log(`Bibliothèque trouvée: ${possiblePath}`)
                break;
            }
        }

        if (libPath) break;
    }

    // Si la bibliothèque est trouvée, la copier dans plusieurs emplacements stratégiques
    if (libPath) {
        const targetLocations = [
            // 1. Dans le répertoire de l'application (nécessaire pour Electron packagé)
            path.join(appPath, libName),

            // 2. Dans le répertoire du module natif (pour que dlopen puisse la trouver)
            (() => {
                try {
                    // Chercher où se trouve le module natif .node
                    const bindings = require('bindings');
                    const nodePath = bindings.getRoot(__dirname);
                    return path.join(path.dirname(nodePath), libName);
                } catch (e) {
                    return null;
                }
            })(),

            // 3. Dans le répertoire de l'exécutable Electron
            path.join(process.resourcesPath, libName),

            // 4. Dans plusieurs emplacements connus d'Electron pour charger les bibliothèques
            path.join(process.resourcesPath, 'app.asar', libName),
            path.join(process.execPath, '..', libName)
        ].filter(Boolean); // Filtrer les emplacements null

        // Copier la bibliothèque dans chaque emplacement cible
        for (const targetPath of targetLocations) {
            try {
                if (!fs.existsSync(targetPath)) {
                    console.log(`Copie de ${libPath} vers ${targetPath}`);
                    fs.copyFileSync(libPath, targetPath);
                }
            } catch (err) {
                console.warn(`Avertissement: Impossible de copier vers ${targetPath}: ${err.message}`);
            }
        }

        console.log(`Configuration des bibliothèques partagées pour Electron terminée.`)
    } else {
        console.warn(`ATTENTION: Impossible de trouver ${libName}. Le module risque de ne pas fonctionner correctement.`)
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
