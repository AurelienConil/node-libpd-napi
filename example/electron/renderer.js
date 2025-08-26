(() => {
    const statusEl = document.getElementById('status')
    const audioToggle = document.getElementById('audio-toggle')
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
                log('Ready')
            } else {
                log('Not Ready')
            }
        } catch (err) {
            log('Error: ' + err)
        }
    }

    // Contrôle audio avec le toggle switch
    audioToggle.addEventListener('change', async () => {
        try {
            if (audioToggle.checked) {
                const result = await window.libpd.start()
                log(result ? 'On' : 'Failed')
            } else {
                const result = await window.libpd.stop()
                log(result ? 'Off' : 'Failed')
            }
        } catch (e) {
            log('Error: ' + e)
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
        
        // Démarrer l'audio automatiquement au chargement
        try {
            const result = await window.libpd.start()
            log(result ? 'On' : 'Failed')
        } catch (e) {
            log('Error: ' + e)
        }
        
        // Envoyer les valeurs initiales au patch
        await sendInitialValues()
    }, 500)
})()
