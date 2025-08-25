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

    // Afficher un message simple
    log('Coucou ! L\'audio est géré par le processus principal.')
})()
