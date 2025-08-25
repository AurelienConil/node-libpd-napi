const path = require('path');

// Chemin vers le fichier patch.pd
function resolvePatchPath(relOrAbs) {
    if (path.isAbsolute(relOrAbs)) return relOrAbs;
    return path.join(__dirname, 'patches', relOrAbs);
}

try {
    console.log('Chargement du module node-libpd-napi...');
    const addon = require('../../'); // Charger le module depuis le répertoire parent
    console.log('Module chargé avec succès!');

    // Créer une instance du moteur PureData
    console.log('Création d\'une instance de PdEngine...');
    const engine = new addon.PdEngine({
        sampleRate: 48000,
        blockSize: 1024, // Configure la taille du buffer audio dans miniaudio
        channelsOut: 2,
        channelsIn: 0
    });
    console.log('Instance créée avec succès!');

    // Démarrer le moteur audio
    console.log('Démarrage du moteur audio...');
    engine.start();
    console.log('Moteur audio démarré!');

    // Ouvrir le patch PureData
    const patchPath = resolvePatchPath('patch.pd');
    console.log(`Ouverture du patch: ${patchPath}`);
    engine.openPatch(patchPath);
    console.log('Patch ouvert avec succès!');

    // Garder le programme en cours d'exécution pendant un certain temps
    console.log('Le son devrait être audible maintenant...');
    console.log('Le programme s\'exécutera pendant 30 secondes pour que vous puissiez entendre l\'audio');
    console.log('Appuyez sur Ctrl+C pour arrêter avant ce délai');

    // Envoyer un bang au patch toutes les secondes pour être sûr qu'il joue
    const bangInterval = setInterval(() => {
        try {
            engine.sendBang('play');
            process.stdout.write('.');
        } catch (err) {
            console.error('Erreur lors de l\'envoi du bang:', err);
        }
    }, 1000);

    // Maintenir le programme ouvert pendant 30 secondes
    setTimeout(() => {
        clearInterval(bangInterval);
        console.log('\nArrêt du moteur audio après 30 secondes...');
        engine.stop();
        console.log('Moteur audio arrêté!');
        process.exit(0);
    }, 30000);

    // Écouter le signal d'arrêt pour nettoyer
    process.on('SIGINT', () => {
        clearInterval(bangInterval);
        console.log('\nArrêt du moteur audio...');
        engine.stop();
        console.log('Moteur audio arrêté!');
        process.exit(0);
    });

} catch (err) {
    console.error('Erreur lors de l\'exécution:', err);
    process.exit(1);
}
