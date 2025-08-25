# node-libpd-napi

Modern N-API bindings for [libpd](https://github.com/libpd/libpd), designed to work with Electron. Uses CMake + [cmake-js](https://github.com/cmake-js/cmake-js) for a clean cross-platform build. Optional [miniaudio](https://github.com/mackron/miniaudio) backend for audio I/O.

## Features

- Native binding via N-API (`node-addon-api`)
- CMake build orchestrated by `cmake-js`
- Automatic handling of libpd shared libraries
- Electron-ready with dedicated integration
- Easy audio configuration with customizable parameters
- Minimal JS API surface you can extend
- Complete examples for both Node.js and Electron

## Project layout

- `src/` C++ addon sources (`addon.cc`, `pd_engine.cc`)
- `include/` addon headers (`pd_engine.h`)
- `CMakeLists.txt` build definition
- `third_party/` (not checked-in) expected location for `libpd/` and `miniaudio/`
- `example/electron/` runnable Electron demo

## Build prerequisites

- CMake >= 3.18
- Node.js 18+ (LTS recommended)
- Python 3 (for node-gyp internals used by cmake-js)
- A C++17 compiler
- macOS: Xcode command line tools, frameworks linked automatically

## Quick start

Install dependencies and build the addon:

```sh
npm install
npm run build
```

Run the Electron example:

```sh
npm run example:electron
```

## Integrating libpd and miniaudio

By default, the project compiles without bundling third parties. Place sources like so:

```
third_party/
  libpd/
    libpd_wrapper/z_libpd.h
    # ... libpd sources
  miniaudio/
    miniaudio.h
```

CMake detects them automatically and defines `HAVE_LIBPD` / `HAVE_MINIAUDIO`.
Extend `src/pd_engine.cc` to call libpd init/open/close and wire the audio callback via miniaudio.

## JavaScript API

### Node.js Usage

```js
const { PdEngine } = require('node-libpd-napi')

// Initialize PdEngine with audio configuration
const pd = new PdEngine({
  sampleRate: 48000,
  blockSize: 1024, // Configure the size of the audio buffer in miniaudio
  channelsOut: 2,  // Number of output channels
  channelsIn: 0    // Number of input channels
})

// Start the audio engine
pd.start()

// Open a Pure Data patch
pd.openPatch('path/to/patch.pd')

// Send messages to the patch
pd.sendBang('start')
pd.sendFloat('freq', 440)
pd.sendSymbol('message', 'hello')

// Stop the audio engine when done
pd.stop()
```

### Electron Usage

In your Electron main process:

```js
const { app } = require('electron')
const { PdEngine } = require('node-libpd-napi/electron')

app.whenReady().then(() => {
  // Create PdEngine instance
  const pd = new PdEngine({
    sampleRate: 48000,
    blockSize: 1024,
    channelsOut: 2,
    channelsIn: 0
  })

  // Start audio and open a patch
  pd.start()
  pd.openPatch('path/to/patch.pd')

  // The module handles the shared libraries automatically
})
```

## Installation

```sh
npm install node-libpd-napi
```

For Electron projects, make sure to build against Electron headers:

```sh
npm install
npm run build:electron
```

The module automatically handles the shared libraries for you - no need to manually copy files.

## License

MIT
