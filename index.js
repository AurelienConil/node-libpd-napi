'use strict'

// Entry point: loads the native node-libpd-napi addon (exports PdEngine).
// libpd.dylib is shipped next to the .node file and found through its
// @loader_path rpath, so no runtime library path setup is needed.

module.exports = require('./build/Release/node-libpd-napi.node')
