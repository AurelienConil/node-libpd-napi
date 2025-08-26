/**
 * pd-engine-manager.js
 * Module qui gère la création, la configuration et le redémarrage du moteur PureData
 */

const path = require('path')

class PdEngineManager {
    constructor() {
        this.engine = null
        this.addon = null
        this.initialized = false
        this.currentPatch = null
        this.currentConfig = {
            sampleRate: 48000,
            blockSize: 1024,
            channelsOut: 2,
            channelsIn: 0
        }
        this.isRunning = false
        this.controlValues = new Map() // Stocke les dernières valeurs de contrôle
    }

    /**
     * Initialise le module node-libpd-napi
     * @param {Object} config Configuration initiale du moteur
     * @returns {boolean} True si l'initialisation a réussi
     */
    initialize(config = {}) {
        try {
            // Utiliser la configuration fournie ou les valeurs par défaut
            this.currentConfig = {
                ...this.currentConfig,
                ...config
            }

            // Essayer plusieurs chemins pour charger le module
            try {
                this.addon = require('node-libpd-napi/electron')
            } catch (e) {
                console.log('Échec du chargement via electron.js, tentative de chargement direct:', e.message)
                try {
                    this.addon = require('../../electron')
                } catch (e2) {
                    console.log('Échec du chargement direct, tentative avec le module principal:', e2.message)
                    this.addon = require('../../')
                }
            }
            console.log('Module node-libpd-napi chargé avec succès')

            // Créer une instance du moteur PureData
            this.engine = new this.addon.PdEngine({
                sampleRate: this.currentConfig.sampleRate,
                blockSize: this.currentConfig.blockSize,
                channelsOut: this.currentConfig.channelsOut,
                channelsIn: this.currentConfig.channelsIn
            })

            this.initialized = true
            return true
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du moteur PdEngine:', error)
            return false
        }
    }

    /**
     * Démarre le moteur audio
     * @returns {boolean} True si le démarrage a réussi
     */
    start() {
        if (!this.initialized || !this.engine) {
            console.error('Le moteur PureData n\'est pas initialisé')
            return false
        }

        try {
            this.engine.start()
            this.isRunning = true
            this.restoreControlValues() // Restaure les valeurs de contrôle
            return true
        } catch (error) {
            console.error('Erreur lors du démarrage du moteur audio:', error)
            return false
        }
    }

    /**
     * Arrête le moteur audio
     * @returns {boolean} True si l'arrêt a réussi
     */
    stop() {
        if (!this.initialized || !this.engine) {
            return false
        }

        try {
            this.engine.stop()
            this.isRunning = false
            return true
        } catch (error) {
            console.error('Erreur lors de l\'arrêt du moteur audio:', error)
            return false
        }
    }

    /**
     * Ouvre un patch PureData
     * @param {string} patchPath Chemin vers le fichier patch
     * @returns {boolean} True si l'ouverture a réussi
     */
    openPatch(patchPath) {
        if (!this.initialized || !this.engine) {
            console.error('Le moteur PureData n\'est pas initialisé')
            return false
        }

        try {
            this.engine.openPatch(patchPath)
            this.currentPatch = patchPath
            return true
        } catch (error) {
            console.error('Erreur lors de l\'ouverture du patch:', error)
            return false
        }
    }

    /**
     * Ferme le patch actuel
     * @returns {boolean} True si la fermeture a réussi
     */
    closePatch() {
        if (!this.initialized || !this.engine || !this.currentPatch) {
            return false
        }

        try {
            if (typeof this.engine.closePatch === 'function') {
                this.engine.closePatch()
            }
            this.currentPatch = null
            return true
        } catch (error) {
            console.error('Erreur lors de la fermeture du patch:', error)
            return false
        }
    }

    /**
     * Redémarre le moteur avec une nouvelle configuration
     * @param {Object} newConfig Nouvelle configuration du moteur
     * @returns {boolean} True si le redémarrage a réussi
     */
    restart(newConfig = {}) {
        // Sauvegarder l'état actuel
        const wasRunning = this.isRunning
        const currentPatch = this.currentPatch

        // Arrêter et fermer le moteur actuel
        this.stop()
        this.closePatch()

        // Mettre à jour la configuration
        this.currentConfig = {
            ...this.currentConfig,
            ...newConfig
        }

        // Recréer le moteur avec la nouvelle configuration
        try {
            this.engine = new this.addon.PdEngine({
                sampleRate: this.currentConfig.sampleRate,
                blockSize: this.currentConfig.blockSize,
                channelsOut: this.currentConfig.channelsOut,
                channelsIn: this.currentConfig.channelsIn
            })

            // Restaurer l'état précédent
            if (currentPatch) {
                this.openPatch(currentPatch)
            }

            if (wasRunning) {
                this.start()
            }

            return true
        } catch (error) {
            console.error('Erreur lors du redémarrage du moteur audio:', error)
            this.initialized = false
            return false
        }
    }

    /**
     * Obtient la configuration actuelle du moteur
     * @returns {Object} Configuration actuelle
     */
    getConfig() {
        return { ...this.currentConfig }
    }

    /**
     * Vérifie si le moteur est initialisé
     * @returns {boolean} True si le moteur est initialisé
     */
    isInitialized() {
        return this.initialized && this.engine !== null
    }

    /**
     * Nettoie les ressources du moteur
     */
    cleanup() {
        this.stop()
        this.closePatch()
        this.engine = null
        this.initialized = false
    }

    /**
     * Stocke une valeur de contrôle pour restauration ultérieure
     * @param {string} receiver Nom du récepteur
     * @param {number|string} value Valeur à envoyer
     * @param {string} type Type de message ('float', 'bang', 'symbol')
     */
    storeControlValue(receiver, value, type = 'float') {
        this.controlValues.set(receiver, { value, type })
    }

    /**
     * Restaure toutes les valeurs de contrôle précédemment stockées
     */
    restoreControlValues() {
        if (!this.initialized || !this.engine || !this.isRunning) {
            return
        }

        // Envoyer toutes les valeurs stockées au patch
        for (const [receiver, { value, type }] of this.controlValues.entries()) {
            try {
                switch (type) {
                    case 'float':
                        this.engine.sendFloat(receiver, value)
                        break
                    case 'bang':
                        this.engine.sendBang(receiver)
                        break
                    case 'symbol':
                        this.engine.sendSymbol(receiver, value)
                        break
                }
            } catch (error) {
                console.error(`Erreur lors de la restauration de la valeur ${value} pour ${receiver}:`, error)
            }
        }
    }

    /**
     * Envoie une valeur float à un récepteur dans le patch
     * @param {string} receiver Nom du récepteur
     * @param {number} value Valeur à envoyer
     * @returns {boolean} True si l'envoi a réussi
     */
    sendFloat(receiver, value) {
        if (!this.initialized || !this.engine) {
            return false
        }

        try {
            this.engine.sendFloat(receiver, value)
            this.storeControlValue(receiver, value, 'float')
            return true
        } catch (error) {
            console.error(`Erreur lors de l'envoi de ${value} à ${receiver}:`, error)
            return false
        }
    }

    /**
     * Envoie un bang à un récepteur dans le patch
     * @param {string} receiver Nom du récepteur
     * @returns {boolean} True si l'envoi a réussi
     */
    sendBang(receiver) {
        if (!this.initialized || !this.engine) {
            return false
        }

        try {
            this.engine.sendBang(receiver)
            this.storeControlValue(receiver, null, 'bang')
            return true
        } catch (error) {
            console.error(`Erreur lors de l'envoi d'un bang à ${receiver}:`, error)
            return false
        }
    }

    /**
     * Envoie un symbole à un récepteur dans le patch
     * @param {string} receiver Nom du récepteur
     * @param {string} symbol Symbole à envoyer
     * @returns {boolean} True si l'envoi a réussi
     */
    sendSymbol(receiver, symbol) {
        if (!this.initialized || !this.engine) {
            return false
        }

        try {
            this.engine.sendSymbol(receiver, symbol)
            this.storeControlValue(receiver, symbol, 'symbol')
            return true
        } catch (error) {
            console.error(`Erreur lors de l'envoi de ${symbol} à ${receiver}:`, error)
            return false
        }
    }
}

// Exporter une instance unique du gestionnaire
const pdEngineManager = new PdEngineManager()
module.exports = pdEngineManager
