'use strict'

const path = require('node:path')
const bindings = require('bindings')

// When running under Electron, cmake-js build with -r electron ensures ABI match
const addon = bindings({
    bindings: 'node-libpd-napi',
    module_root: __dirname,
})

module.exports = addon
