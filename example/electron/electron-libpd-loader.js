'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Utilitaire pour assurer le chargement correct des bibliothèques partagées
 * dans un contexte Electron. Spécifiquement conçu pour node-libpd-napi.
 */
function setupLibpdForElectron() {
    // Déterminer le nom de la bibliothèque selon la plateforme
    let libName;
    switch (process.platform) {
        case 'darwin': libName = 'libpd.dylib'; break;
        case 'linux': libName = 'libpd.so'; break;
        case 'win32': libName = 'libpd.dll'; break;
        default: throw new Error(`Plateforme non supportée: ${process.platform}`);
    }

    // Chemins où la bibliothèque pourrait se trouver
    const searchPaths = [
        // Dans le package node-libpd-napi
        path.join(app.getAppPath(), 'node_modules', 'node-libpd-napi', 'lib', 'macos', libName),
        path.join(app.getAppPath(), 'node_modules', 'node-libpd-napi', 'lib', libName),
        path.join(app.getAppPath(), 'node_modules', 'node-libpd-napi', libName),
        // Dans notre répertoire d'application
        path.join(app.getAppPath(), libName),
        // Dans le répertoire courant
        path.join(process.cwd(), libName),
        // Dans des chemins absolus (développement local)
        path.resolve(__dirname, '..', '..', 'lib', 'macos', libName),
        path.resolve(__dirname, '..', '..', 'lib', libName)
    ];

    // Chemins où la bibliothèque doit être copiée
    const targetPaths = [
        // Dans le répertoire de l'application
        path.join(app.getAppPath(), libName),
        
        // Dans le répertoire des ressources
        process.resourcesPath ? path.join(process.resourcesPath, libName) : null,
        
        // À côté de l'exécutable Electron
        path.join(path.dirname(process.execPath), libName),
        
        // Emplacements spécifiques où Electron recherche les bibliothèques (d'après l'erreur)
        path.join(app.getAppPath(), 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'Frameworks', 
                 'Electron Framework.framework', 'Versions', 'A', 'Libraries', libName),
                 
        path.join(app.getAppPath(), 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'Frameworks', libName)
    ].filter(Boolean); // Filtrer les valeurs null

    // Trouver la première occurrence de la bibliothèque
    let sourcePath = null;
    for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
            sourcePath = searchPath;
            console.log(`Bibliothèque libpd trouvée: ${searchPath}`);
            
            // Sur macOS, vérifier si on peut modifier la référence interne de la bibliothèque
            if (process.platform === 'darwin') {
                try {
                    const { execSync } = require('child_process');
                    console.log(`Modification de la référence interne de la bibliothèque...`);
                    // Utiliser install_name_tool pour changer l'ID de la bibliothèque
                    // Ceci permet de rendre la bibliothèque chargeable depuis n'importe où
                    execSync(`install_name_tool -id "@rpath/libpd.dylib" "${searchPath}"`);
                    execSync(`install_name_tool -add_rpath "@loader_path/" "${searchPath}" 2>/dev/null || true`);
                    execSync(`install_name_tool -add_rpath "@executable_path/" "${searchPath}" 2>/dev/null || true`);
                    execSync(`install_name_tool -add_rpath "/usr/local/lib" "${searchPath}" 2>/dev/null || true`);
                    console.log(`Référence interne de la bibliothèque modifiée avec succès`);
                } catch (err) {
                    console.warn(`Avertissement: Impossible de modifier la référence interne de la bibliothèque: ${err.message}`);
                }
            }
            break;
        }
    }

    if (!sourcePath) {
        console.error('ERREUR: Impossible de trouver la bibliothèque libpd.dylib!');
        console.error('Les chemins suivants ont été vérifiés:');
        searchPaths.forEach(p => console.error(` - ${p}`));
        return false;
    }

    // Copier la bibliothèque vers tous les emplacements cibles
    let success = false;
    for (const targetPath of targetPaths) {
        try {
            // Créer les répertoires parents s'ils n'existent pas
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
                try {
                    fs.mkdirSync(targetDir, { recursive: true });
                    console.log(`Répertoire créé: ${targetDir}`);
                } catch (mkdirErr) {
                    console.warn(`Impossible de créer le répertoire ${targetDir}: ${mkdirErr.message}`);
                    continue; // Passer à la prochaine cible si on ne peut pas créer le répertoire
                }
            }
            
            if (!fs.existsSync(targetPath)) {
                console.log(`Copie de ${sourcePath} vers ${targetPath}...`);
                fs.copyFileSync(sourcePath, targetPath);
                success = true;
            } else {
                console.log(`La bibliothèque existe déjà à: ${targetPath}`);
                success = true;
            }
        } catch (err) {
            console.warn(`Avertissement: Impossible de copier vers ${targetPath}: ${err.message}`);
        }
    }

    return success;
}

// Exporter la fonction
module.exports = setupLibpdForElectron;
