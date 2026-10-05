#!/usr/bin/env node
// Build script: compiles the native addon for Electron, packages the app with
// electron-builder, then verifies the packaged .app is self-contained (macOS).

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../..');
const electronExampleDir = __dirname;

function run(step, command, cwd) {
    console.log(`\n${step}\n$ ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd });
    } catch (error) {
        console.error(`❌ Échec: ${step}`);
        process.exit(1);
    }
}

// Étape 1: compiler le module natif pour Electron (libpd y est lié statiquement)
run('📦 Compilation du module natif', 'npm run build:electron', projectRoot);

// Étape 2: vérifier que le module natif est bien présent
const releaseDir = path.join(projectRoot, 'build', 'Release');
for (const file of ['node-libpd-napi.node']) {
    if (!fs.existsSync(path.join(releaseDir, file))) {
        console.error(`❌ ${file} introuvable dans ${releaseDir}`);
        process.exit(1);
    }
}

// Étape 3: dépendances de l'exemple
run('📦 Installation des dépendances', 'npm install', electronExampleDir);

// Étape 4: electron-builder
run('🚀 Electron Builder', `npx electron-builder ${process.argv[2] || '--mac'}`, electronExampleDir);

// Étape 5: vérification du .app (macOS uniquement)
if (process.platform === 'darwin') {
    run('🔍 Vérification du .app', path.join(projectRoot, 'scripts', 'check-mac-app.sh'), projectRoot);
}

console.log('\n✅ Build terminé. Application dans le dossier dist/');
