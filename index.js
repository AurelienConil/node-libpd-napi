'use strict'

const bindings = require('bindings')

// Le binaire natif embarque libpd statiquement, aucun .dylib/.so à copier
module.exports = bindings({
    bindings: 'node-libpd-napi',
    module_root: __dirname,
})
