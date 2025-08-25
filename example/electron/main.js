const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

let engine = null

function resolvePatchPath(relOrAbs) {
  if (path.isAbsolute(relOrAbs)) return relOrAbs
  return path.join(__dirname, 'patches', relOrAbs)
}

function createWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 380,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    // Load native addon in main process
    try {
        const addon = require('node-libpd-napi')
        engine = new addon.PdEngine()
    } catch (e) {
        console.error('Failed to load node-libpd-napi:', e)
    }

    // IPC API exposed to renderer
    ipcMain.handle('libpd:start', async () => {
        if (!engine) throw new Error('PdEngine unavailable')
        try { engine.start(); return true } catch (e) { console.error(e); return false }
    })
    ipcMain.handle('libpd:stop', async () => {
        if (!engine) return false
        try { engine.stop(); return true } catch (e) { console.error(e); return false }
    })
    ipcMain.handle('libpd:openPatch', async (_e, fileNameOrPath) => {
        if (!engine) throw new Error('PdEngine unavailable')
        const full = resolvePatchPath(fileNameOrPath)
        try { engine.openPatch(full); return full } catch (e) { console.error(e); throw e }
    })
    ipcMain.handle('libpd:closePatch', async () => {
        if (!engine) return false
        try { engine.closePatch && engine.closePatch(); return true } catch (e) { console.error(e); return false }
    })

    createWindow()

    // Attempt to open default patch at startup (without starting audio)
    try {
        if (engine) {
            const defaultPatch = resolvePatchPath('patch.pd')
            // Optional: only open if file exists; for now we just attempt
            engine.openPatch(defaultPatch)
            console.log('Opened patch at startup:', defaultPatch)
        }
    } catch (e) {
        console.warn('Could not open default patch at startup:', e.message || e)
    }

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
    try { engine && engine.stop() } catch { /* ignore */ }
})
