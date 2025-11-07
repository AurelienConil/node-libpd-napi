# Intégrer libpd dans le module

Le projet compile libpd depuis ses sources et la lie statiquement dans le binaire `.node`. Aucun fichier `libpd.dylib/.so/.dll` externe n'est requis au runtime.

## Récupérer les sources

Option A — submodule Git:

```bash
cd node-libpd-napi
mkdir -p third_party
git submodule add https://github.com/libpd/libpd.git third_party/libpd
git submodule update --init --recursive
```

Option B — clone direct:

```bash
cd node-libpd-napi
mkdir -p third_party
git clone https://github.com/libpd/libpd.git third_party/libpd
```

Miniaudio (facultatif) — header only:

```bash
git clone https://github.com/mackron/miniaudio.git third_party/miniaudio
```

Ensuite, construisez:

```bash
npm run build
```

Notes:
- CMake construit `libpd_static` et l’addon la lie. Pas de copie de bibliothèques dynamiques.
- Pour Electron, utilisez `npm run build:electron` pour recompiler contre l’ABI d’Electron.
