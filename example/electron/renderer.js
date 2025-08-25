(() => {
    const statusEl = document.getElementById('status')
    const btnStart = document.getElementById('btn-start')
    const btnStop = document.getElementById('btn-stop')
    const log = (msg) => { statusEl.textContent = msg }

    btnStart.addEventListener('click', async () => {
        try {
            await window.libpd.start()
            log('Audio started')
        } catch (e) {
            log('Failed to start audio: ' + e)
        }
    })
    btnStop.addEventListener('click', async () => {
        try {
            await window.libpd.stop()
            log('Audio stopped')
        } catch (e) {
            log('Failed to stop audio: ' + e)
        }
    })

        // Try to open default patch (handled in main at startup; this is a no-op fallback)
        ; (async () => {
            try {
                await window.libpd.openPatch('patch.pd')
                log('Patch opened: patches/patch.pd')
            } catch (e) {
                log('Waiting for patch... Put your file at patches/patch.pd')
            }
        })()
})()
