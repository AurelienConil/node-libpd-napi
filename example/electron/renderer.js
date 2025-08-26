(() => {
    const statusEl = document.getElementById('status')
    const btnStart = document.getElementById('btn-start')
    const btnStop = document.getElementById('btn-stop')
    const log = (msg) => { statusEl.textContent = msg }

    // Éléments des contrôles du patch
    const speedSlider = document.getElementById('speed-slider')
    const filterSlider = document.getElementById('filter-slider')
    const cutoffSlider = document.getElementById('cutoff-slider')
    const speedValue = document.getElementById('speed-value')
    const filterValue = document.getElementById('filter-value')
    const cutoffValue = document.getElementById('cutoff-value')

    // Vérifier l'état initial de PdEngine
    const checkInitialState = async () => {
        try {
            const initialized = await window.libpd.isInitialized()
            if (initialized) {
                log('PureData est initialisé et prêt!')
            } else {
                log('PureData n\'est pas disponible ou n\'a pas pu être initialisé.')
            }
        } catch (err) {
            log('Erreur lors de la vérification de l\'état de PureData: ' + err)
        }
    }

    // Contrôles audio
    btnStart.addEventListener('click', async () => {
        try {
            const result = await window.libpd.start()
            log(result ? 'Audio démarré' : 'Échec du démarrage audio')
        } catch (e) {
            log('Erreur lors du démarrage audio: ' + e)
        }
    })

    btnStop.addEventListener('click', async () => {
        try {
            const result = await window.libpd.stop()
            log(result ? 'Audio arrêté' : 'Échec de l\'arrêt audio')
        } catch (e) {
            log('Erreur lors de l\'arrêt audio: ' + e)
        }
    })

    // Gestion des curseurs
    speedSlider.addEventListener('input', async (e) => {
        const value = parseInt(e.target.value)
        speedValue.textContent = value
        try {
            await window.libpd.sendFloat('speed', value)
            console.log(`Envoyé: speed ${value}`)
        } catch (err) {
            console.error('Erreur lors de l\'envoi de speed:', err)
        }
    })

    filterSlider.addEventListener('input', async (e) => {
        const value = parseInt(e.target.value)
        filterValue.textContent = value
        try {
            await window.libpd.sendFloat('filter', value)
            console.log(`Envoyé: filter ${value}`)
        } catch (err) {
            console.error('Erreur lors de l\'envoi de filter:', err)
        }
    })

    cutoffSlider.addEventListener('input', async (e) => {
        const value = parseInt(e.target.value)
        cutoffValue.textContent = value
        try {
            await window.libpd.sendFloat('cutoff', value)
            console.log(`Envoyé: cutoff ${value}`)
        } catch (err) {
            console.error('Erreur lors de l\'envoi de cutoff:', err)
        }
    })

    // Envoyer les valeurs initiales au patch
    const sendInitialValues = async () => {
        try {
            const speedVal = parseInt(speedSlider.value)
            const filterVal = parseInt(filterSlider.value)
            const cutoffVal = parseInt(cutoffSlider.value)

            await window.libpd.sendFloat('speed', speedVal)
            await window.libpd.sendFloat('filter', filterVal)
            await window.libpd.sendFloat('cutoff', cutoffVal)

            console.log(`Valeurs initiales envoyées: speed=${speedVal}, filter=${filterVal}, cutoff=${cutoffVal}`)
        } catch (e) {
            console.error('Erreur lors de l\'envoi des valeurs initiales:', e)
        }
    }

    // Vérifier l'état initial après un court délai pour s'assurer que tout est initialisé
    setTimeout(async () => {
        await checkInitialState()

        // Envoyer les valeurs initiales au patch
        await sendInitialValues()
    }, 500)
})()
