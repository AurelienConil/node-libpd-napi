#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Détermine le nom de la bibliothèque selon la plateforme
function getLibraryName() {
    switch (process.platform) {
        case 'darwin': return 'libpd.dylib';
        case 'linux': return 'libpd.so';
        case 'win32': return 'libpd.dll';
        default: throw new Error(`Plateforme non supportée: ${process.platform}`);
    }
}

function copyLibrary() {
    try {
        const rootDir = path.resolve(__dirname, '..');
        const buildDir = path.join(rootDir, 'build', 'Release');
        const libName = getLibraryName();
        const libSrc = path.join(buildDir, libName);
        const libDest = path.join(rootDir, 'lib', libName);
        
        // Créer le répertoire lib s'il n'existe pas
        if (!fs.existsSync(path.join(rootDir, 'lib'))) {
            fs.mkdirSync(path.join(rootDir, 'lib'), { recursive: true });
        }

        // Vérifier si la bibliothèque existe dans le répertoire de build
        if (fs.existsSync(libSrc)) {
            console.log(`Copie de ${libSrc} vers ${libDest}`);
            fs.copyFileSync(libSrc, libDest);
            
            // Sur macOS, modifier la référence de bibliothèque pour utiliser @rpath
            if (process.platform === 'darwin') {
                try {
                    execSync(`install_name_tool -id "@rpath/${libName}" "${libDest}"`);
                    console.log(`Référence de bibliothèque modifiée avec install_name_tool`);
                } catch (err) {
                    console.warn(`Avertissement: Impossible de modifier la référence de bibliothèque: ${err.message}`);
                }
            }
            
            console.log(`${libName} a été installé avec succès dans le répertoire lib`);
        } else {
            console.warn(`Avertissement: ${libSrc} n'existe pas. Assurez-vous que le projet a été compilé.`);
        }
    } catch (err) {
        console.error(`Erreur lors de l'installation de la bibliothèque: ${err.message}`);
        process.exit(1);
    }
}

// Exécuter la fonction principale
copyLibrary();
