# Solution pour intégrer libpd dans votre module npm

Pour rendre votre module `node-libpd-napi` facile à utiliser pour les autres développeurs, vous avez deux options principales pour gérer la dépendance à libpd.

## Option 1: Utiliser Git Submodules (recommandé)

Cette approche vous permet d'inclure la source de libpd dans votre projet sans augmenter la taille de votre dépôt.

```bash
# Dans votre dépôt principal
cd /Users/aurelienconil/Documents/Node/node-libpd-napi
mkdir -p third_party
git submodule add https://github.com/libpd/libpd.git third_party/libpd
git commit -m "Add libpd as submodule"
```

Ensuite, mettez à jour votre README pour indiquer aux utilisateurs de récupérer les sous-modules :

```markdown
## Installation depuis le dépôt Git

```bash
git clone https://github.com/AurelienConil/node-libpd-napi.git
cd node-libpd-napi
git submodule update --init --recursive  # Important: récupère libpd
npm install
```
```

## Option 2: Précompiler libpd et inclure la bibliothèque

Si vous préférez éviter les sous-modules, vous pouvez précompiler libpd et inclure les bibliothèques binaires :

1. Compilez libpd pour chaque plateforme cible
2. Placez les bibliothèques dans `lib/` (libpd.dylib, libpd.so, libpd.dll)
3. Ajoutez ces fichiers à votre dépôt Git

Cette approche est plus simple pour les utilisateurs mais requiert de maintenir des binaires pour chaque plateforme.
