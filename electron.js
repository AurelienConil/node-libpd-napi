'use strict'

// Entrée simplifiée pour Electron: on exporte simplement le module principal.
// libpd est lié statiquement dans le binaire .node; aucune copie de .dylib n'est nécessaire.
module.exports = require('./index')
