#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Détermine le nom de la bibliothèque et son emplacement selon la plateforme
function getPlatformLibraryInfo() {
    const platform = os.platform();
    let libName, platformDir;

    switch (platform) {
        case 'darwin':
            libName = 'libpd.dylib';
            platformDir = 'macos';
            break;
        case 'linux':
            libName = 'libpd.so';
            platformDir = 'linux';
            break;
        case 'win32':
            libName = 'libpd.dll';
            platformDir = 'win';
            break;
        default:
            throw new Error(`Plateforme non supportée: ${platform}`);
    }

    return { platform, libName, platformDir };
}

// Copie la bibliothèque précompilée aux bons endroits
function deployPrebuiltLibrary() {
    try {
        const { platform, libName, platformDir } = getPlatformLibraryInfo();
        const rootDir = path.resolve(__dirname, '..');

        // Chemin de la bibliothèque précompilée (depuis notre répertoire lib/<platform>)
        const sourceLib = path.join(rootDir, 'lib', platformDir, libName);

        // Vérifier si la bibliothèque précompilée existe
        if (!fs.existsSync(sourceLib)) {
            console.error(`Erreur: Bibliothèque précompilée ${sourceLib} introuvable. Le module pourrait ne pas fonctionner sur cette plateforme.`);
            return;
        }

        // Chemins cibles où la bibliothèque doit être déployée
        const targetPaths = [
            // 1. Pour les modules natifs
            path.join(rootDir, 'build', 'Release', libName),

            // 2. Pour une référence centrale
            path.join(rootDir, 'lib', libName),

            // 3. À la racine du module (pour simplifier la recherche)
            path.join(rootDir, libName),

            // 4. Dans build/Debug (si utilisé)
            path.join(rootDir, 'build', 'Debug', libName)
        ];

        // Créer les répertoires cibles si nécessaire et copier la bibliothèque
        for (const targetPath of targetPaths) {
            try {
                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                // Copier la bibliothèque
                console.log(`Copie de ${sourceLib} vers ${targetPath}`);
                fs.copyFileSync(sourceLib, targetPath);

                // Sur macOS, modifier la référence de bibliothèque pour utiliser @rpath et @loader_path
                if (platform === 'darwin') {
                    try {
                        // 1. Utiliser @rpath pour la recherche relative au runtime
                        execSync(`install_name_tool -id "@rpath/${libName}" "${targetPath}"`);

                        // 2. Ajouter également @loader_path pour la recherche relative au binaire
                        execSync(`install_name_tool -add_rpath "@loader_path/" "${targetPath}" 2>/dev/null || true`);

                        console.log(`Références de bibliothèque modifiées pour ${targetPath}`);
                    } catch (err) {
                        console.warn(`Avertissement: install_name_tool: ${err.message}`);
                    }
                }
            } catch (copyErr) {
                console.warn(`Avertissement: Échec de copie vers ${targetPath}: ${copyErr.message}`);
            }
        }

        // Si nous sommes sur macOS, créer des liens symboliques pour faciliter la recherche
        if (platform === 'darwin') {
            try {
                // Lien symbolique dans /usr/local/lib (nécessite des droits d'admin)
                const localLibPath = '/usr/local/lib/' + libName;

                // Tester si on peut écrire dans /usr/local/lib
                try {
                    fs.accessSync('/usr/local/lib', fs.constants.W_OK);

                    // Vérifier si le lien existe déjà
                    if (!fs.existsSync(localLibPath)) {
                        try {
                            execSync(`ln -sf "${path.join(rootDir, 'lib', libName)}" "${localLibPath}"`);
                            console.log(`Lien symbolique créé: ${localLibPath}`);
                        } catch (err) {
                            console.warn(`Impossible de créer le lien symbolique: ${err.message}`);
                        }
                    }
                } catch (e) {
                    // Pas de droits d'écriture, on ignore
                }
            } catch (err) {
                console.warn(`Avertissement lors de la création de liens: ${err.message}`);
            }
        }

        console.log(`✓ ${libName} a été déployé avec succès pour ${platform}`);
    } catch (err) {
        console.error(`Erreur lors du déploiement de la bibliothèque: ${err.message}`);
        // Ne pas quitter avec un code d'erreur, pour permettre l'installation même en cas d'erreur
    }
}

// Exécuter la fonction principale
deployPrebuiltLibrary();