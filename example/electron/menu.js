/**
 * menu.js
 * Gestion du menu Electron pour l'application node-libpd
 */

const { Menu, dialog } = require('electron')

/**
 * Crée et configure le menu de l'application
 * @param {BrowserWindow} window - La fenêtre Electron à laquelle le menu sera attaché
 * @param {Object} pdEngineManager - Le gestionnaire du moteur PureData
 */
function createApplicationMenu(window, pdEngineManager) {
    const config = pdEngineManager.getConfig()

    // Modèle du menu
    const template = [
        {
            label: 'Fichier',
            submenu: [
                { role: 'quit', label: 'Quitter' }
            ]
        },
        {
            label: 'Edition',
            submenu: [
                { role: 'undo', label: 'Annuler' },
                { role: 'redo', label: 'Rétablir' },
                { type: 'separator' },
                { role: 'cut', label: 'Couper' },
                { role: 'copy', label: 'Copier' },
                { role: 'paste', label: 'Coller' },
                { type: 'separator' },
                { role: 'selectAll', label: 'Sélectionner tout' }
            ]
        },
        {
            label: 'Audio',
            submenu: [
                {
                    label: 'Taille de bloc',
                    submenu: [
                        {
                            label: '64 échantillons',
                            type: 'radio',
                            checked: config.blockSize === 64,
                            click: () => setBlockSize(window, pdEngineManager, 64)
                        },
                        {
                            label: '128 échantillons',
                            type: 'radio',
                            checked: config.blockSize === 128,
                            click: () => setBlockSize(window, pdEngineManager, 128)
                        },
                        {
                            label: '256 échantillons',
                            type: 'radio',
                            checked: config.blockSize === 256,
                            click: () => setBlockSize(window, pdEngineManager, 256)
                        },
                        {
                            label: '512 échantillons',
                            type: 'radio',
                            checked: config.blockSize === 512,
                            click: () => setBlockSize(window, pdEngineManager, 512)
                        },
                        {
                            label: '1024 échantillons',
                            type: 'radio',
                            checked: config.blockSize === 1024,
                            click: () => setBlockSize(window, pdEngineManager, 1024)
                        },
                        {
                            label: '2048 échantillons',
                            type: 'radio',
                            checked: config.blockSize === 2048,
                            click: () => setBlockSize(window, pdEngineManager, 2048)
                        }
                    ]
                },
                {
                    label: 'Fréquence d\'échantillonnage',
                    submenu: [
                        {
                            label: '44100 Hz',
                            type: 'radio',
                            checked: config.sampleRate === 44100,
                            click: () => setSampleRate(window, pdEngineManager, 44100)
                        },
                        {
                            label: '48000 Hz',
                            type: 'radio',
                            checked: config.sampleRate === 48000,
                            click: () => setSampleRate(window, pdEngineManager, 48000)
                        },
                        {
                            label: '88200 Hz',
                            type: 'radio',
                            checked: config.sampleRate === 88200,
                            click: () => setSampleRate(window, pdEngineManager, 88200)
                        },
                        {
                            label: '96000 Hz',
                            type: 'radio',
                            checked: config.sampleRate === 96000,
                            click: () => setSampleRate(window, pdEngineManager, 96000)
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Canaux de sortie',
                    submenu: [
                        {
                            label: '1 (mono)',
                            type: 'radio',
                            checked: config.channelsOut === 1,
                            click: () => setChannelsOut(window, pdEngineManager, 1)
                        },
                        {
                            label: '2 (stéréo)',
                            type: 'radio',
                            checked: config.channelsOut === 2,
                            click: () => setChannelsOut(window, pdEngineManager, 2)
                        },
                        {
                            label: '4',
                            type: 'radio',
                            checked: config.channelsOut === 4,
                            click: () => setChannelsOut(window, pdEngineManager, 4)
                        },
                        {
                            label: '8',
                            type: 'radio',
                            checked: config.channelsOut === 8,
                            click: () => setChannelsOut(window, pdEngineManager, 8)
                        }
                    ]
                },
                {
                    label: 'Canaux d\'entrée',
                    submenu: [
                        {
                            label: '0 (aucun)',
                            type: 'radio',
                            checked: config.channelsIn === 0,
                            click: () => setChannelsIn(window, pdEngineManager, 0)
                        },
                        {
                            label: '1 (mono)',
                            type: 'radio',
                            checked: config.channelsIn === 1,
                            click: () => setChannelsIn(window, pdEngineManager, 1)
                        },
                        {
                            label: '2 (stéréo)',
                            type: 'radio',
                            checked: config.channelsIn === 2,
                            click: () => setChannelsIn(window, pdEngineManager, 2)
                        }
                    ]
                }
            ]
        },
        {
            label: 'Affichage',
            submenu: [
                { role: 'reload', label: 'Actualiser' },
                { role: 'toggleDevTools', label: 'Outils de développement' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Plein écran' }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    return menu
}

/**
 * Modifie la taille de bloc du moteur audio
 * @param {BrowserWindow} window - La fenêtre Electron
 * @param {Object} pdEngineManager - Le gestionnaire du moteur PureData
 * @param {number} size - La nouvelle taille de bloc
 */
function setBlockSize(window, pdEngineManager, size) {
    const currentConfig = pdEngineManager.getConfig()

    if (currentConfig.blockSize === size) {
        return // Aucun changement nécessaire
    }

    dialog.showMessageBox(window, {
        type: 'question',
        buttons: ['Annuler', 'Redémarrer l\'audio'],
        title: 'Redémarrage audio nécessaire',
        message: `Changer la taille de bloc de ${currentConfig.blockSize} à ${size} échantillons nécessite de redémarrer le moteur audio. Continuer?`
    }).then(result => {
        if (result.response === 1) { // Si "Redémarrer l'audio" est cliqué
            const success = pdEngineManager.restart({ blockSize: size })
            if (success) {
                // Recréer le menu pour refléter les nouvelles valeurs
                createApplicationMenu(window, pdEngineManager)
                // Notifier le renderer
                window.webContents.send('audio-settings-changed', {
                    blockSize: size,
                    config: pdEngineManager.getConfig()
                })
            } else {
                dialog.showErrorBox(
                    'Erreur',
                    'Impossible de redémarrer le moteur audio avec la nouvelle taille de bloc.'
                )
            }
        }
    })
}

/**
 * Modifie la fréquence d'échantillonnage du moteur audio
 * @param {BrowserWindow} window - La fenêtre Electron
 * @param {Object} pdEngineManager - Le gestionnaire du moteur PureData
 * @param {number} rate - La nouvelle fréquence d'échantillonnage
 */
function setSampleRate(window, pdEngineManager, rate) {
    const currentConfig = pdEngineManager.getConfig()

    if (currentConfig.sampleRate === rate) {
        return // Aucun changement nécessaire
    }

    dialog.showMessageBox(window, {
        type: 'question',
        buttons: ['Annuler', 'Redémarrer l\'audio'],
        title: 'Redémarrage audio nécessaire',
        message: `Changer la fréquence d'échantillonnage de ${currentConfig.sampleRate} à ${rate} Hz nécessite de redémarrer le moteur audio. Continuer?`
    }).then(result => {
        if (result.response === 1) { // Si "Redémarrer l'audio" est cliqué
            const success = pdEngineManager.restart({ sampleRate: rate })
            if (success) {
                // Recréer le menu pour refléter les nouvelles valeurs
                createApplicationMenu(window, pdEngineManager)
                // Notifier le renderer
                window.webContents.send('audio-settings-changed', {
                    sampleRate: rate,
                    config: pdEngineManager.getConfig()
                })
            } else {
                dialog.showErrorBox(
                    'Erreur',
                    'Impossible de redémarrer le moteur audio avec la nouvelle fréquence d\'échantillonnage.'
                )
            }
        }
    })
}

/**
 * Modifie le nombre de canaux de sortie du moteur audio
 * @param {BrowserWindow} window - La fenêtre Electron
 * @param {Object} pdEngineManager - Le gestionnaire du moteur PureData
 * @param {number} channels - Le nouveau nombre de canaux de sortie
 */
function setChannelsOut(window, pdEngineManager, channels) {
    const currentConfig = pdEngineManager.getConfig()

    if (currentConfig.channelsOut === channels) {
        return // Aucun changement nécessaire
    }

    dialog.showMessageBox(window, {
        type: 'question',
        buttons: ['Annuler', 'Redémarrer l\'audio'],
        title: 'Redémarrage audio nécessaire',
        message: `Changer le nombre de canaux de sortie de ${currentConfig.channelsOut} à ${channels} nécessite de redémarrer le moteur audio. Continuer?`
    }).then(result => {
        if (result.response === 1) { // Si "Redémarrer l'audio" est cliqué
            const success = pdEngineManager.restart({ channelsOut: channels })
            if (success) {
                // Recréer le menu pour refléter les nouvelles valeurs
                createApplicationMenu(window, pdEngineManager)
                // Notifier le renderer
                window.webContents.send('audio-settings-changed', {
                    channelsOut: channels,
                    config: pdEngineManager.getConfig()
                })
            } else {
                dialog.showErrorBox(
                    'Erreur',
                    'Impossible de redémarrer le moteur audio avec le nouveau nombre de canaux de sortie.'
                )
            }
        }
    })
}

/**
 * Modifie le nombre de canaux d'entrée du moteur audio
 * @param {BrowserWindow} window - La fenêtre Electron
 * @param {Object} pdEngineManager - Le gestionnaire du moteur PureData
 * @param {number} channels - Le nouveau nombre de canaux d'entrée
 */
function setChannelsIn(window, pdEngineManager, channels) {
    const currentConfig = pdEngineManager.getConfig()

    if (currentConfig.channelsIn === channels) {
        return // Aucun changement nécessaire
    }

    dialog.showMessageBox(window, {
        type: 'question',
        buttons: ['Annuler', 'Redémarrer l\'audio'],
        title: 'Redémarrage audio nécessaire',
        message: `Changer le nombre de canaux d'entrée de ${currentConfig.channelsIn} à ${channels} nécessite de redémarrer le moteur audio. Continuer?`
    }).then(result => {
        if (result.response === 1) { // Si "Redémarrer l'audio" est cliqué
            const success = pdEngineManager.restart({ channelsIn: channels })
            if (success) {
                // Recréer le menu pour refléter les nouvelles valeurs
                createApplicationMenu(window, pdEngineManager)
                // Notifier le renderer
                window.webContents.send('audio-settings-changed', {
                    channelsIn: channels,
                    config: pdEngineManager.getConfig()
                })
            } else {
                dialog.showErrorBox(
                    'Erreur',
                    'Impossible de redémarrer le moteur audio avec le nouveau nombre de canaux d\'entrée.'
                )
            }
        }
    })
}

module.exports = {
    createApplicationMenu
}
