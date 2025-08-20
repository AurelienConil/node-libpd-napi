const { contextBridge } = require('electron')

try {
    const addon = require('node-libpd-napi')
    contextBridge.exposeInMainWorld('libpd', {
        test: () => typeof addon.PdEngine === 'function'
    })
} catch (e) {
    contextBridge.exposeInMainWorld('libpd', {
        error: String(e)
    })
}
