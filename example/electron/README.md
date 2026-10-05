# Node LibPD NAPI - Exemple Electron

Application Electron autonome qui joue un patch Pure Data via `node-libpd-napi`.

## Commandes

```bash
npm install          # dépendances (première fois)
npm start            # développement
npm run dist         # build complet : module natif + .app/.dmg + vérification
```

`npm run dist` lance `build.js`, qui :
1. compile le module natif pour Electron (`npm run build:electron` à la racine) ;
2. installe les dépendances de l'exemple ;
3. lance electron-builder (`dist/`) ;
4. vérifie le `.app` avec `../../scripts/check-mac-app.sh` (doit afficher `RESULT: PASS`).

## Comment libpd est embarqué dans le .app

libpd est compilé depuis les sources (sous-module `third_party/libpd`) et lié
**statiquement** dans le `.node` : il n'y a aucune bibliothèque partagée à trouver.

```
App.app/Contents/Resources/app.asar.unpacked/
├── node_modules/node-libpd-napi/build/Release/
│   └── node-libpd-napi.node   ← contient libpd, ne dépend que de macOS
└── patches/patch.pd           ← hors asar : libpd (C) ne sait pas lire dans app.asar
```

Les règles `files` et `asarUnpack` du `package.json` n'embarquent que ces fichiers.

## Méthode de debug

1. **Inspecter les binaires** (ce que dyld voit réellement) :
   ```bash
   otool -L  chemin/vers/node-libpd-napi.node                   # dépendances
   otool -l  chemin/vers/node-libpd-napi.node | grep -A2 RPATH  # où @rpath est cherché
   ```
   Toute dépendance hors `/System` et `/usr/lib` (ou un rpath absolu `/Users/...`)
   ne marchera que sur la machine de build.
2. **Lire l'erreur exacte de dyld** avec l'Electron du .app, sans interface :
   ```bash
   ELECTRON_RUN_AS_NODE=1 "dist/mac/<App>.app/Contents/MacOS/<App>" \
     -e "require('<chemin absolu du .node>')"
   ```
   Le message `Library not loaded ... tried: ...` liste tous les chemins essayés.
3. **Voir les logs du main process** : lancer directement
   `"dist/mac/<App>.app/Contents/MacOS/<App>"` depuis le terminal.
4. **Simuler une autre machine** : renommer `build/` à la racine, relancer l'app,
   puis restaurer.
5. **Tout d'un coup** : `../../scripts/check-mac-app.sh [chemin/App.app]`.

## Distribution sur internet (macOS)

L'app est autonome, mais pour qu'un autre Mac accepte de l'ouvrir après
téléchargement, elle doit être **signée et notarisée** par Apple. Sinon,
Gatekeeper affiche « l'app est endommagée » ou refuse de l'ouvrir.

- Prérequis : compte Apple Developer (99 $/an) et certificat « Developer ID Application »
  dans le trousseau.
- electron-builder signe automatiquement s'il trouve le certificat. Pour notariser :
  `"mac": { "hardenedRuntime": true, "notarize": { "teamId": "<TEAM_ID>" } }` et les
  variables `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` (electron-builder 24.x).
- Si le patch utilise l'entrée micro (`channelsIn > 0`) : entitlement
  `com.apple.security.device.audio-input` et `NSMicrophoneUsageDescription`.
- Sans signature (tests entre amis) : `xattr -cr "/Applications/<App>.app"` après copie.

Architecture : l'app est construite pour l'architecture de la machine de build
(x64 sur Mac Intel, arm64 sur Apple Silicon). Une app x64 tourne aussi sur Apple
Silicon via Rosetta.
