'use strict';

const { PdEngine } = require('./');

console.log('Testing node-libpd-napi with new library handling...');

try {
    // Initialize PdEngine with audio configuration
    const pd = new PdEngine({
        sampleRate: 48000,
        blockSize: 1024,
        channelsOut: 2,
        channelsIn: 0
    });

    console.log('PdEngine instance created successfully!');

    // Start the audio engine
    pd.start();
    console.log('Audio engine started');

    // Stop the engine after 2 seconds
    setTimeout(() => {
        pd.stop();
        console.log('Audio engine stopped');
        console.log('Test completed successfully!');
    }, 2000);

} catch (error) {
    console.error('Error:', error.message);
}
