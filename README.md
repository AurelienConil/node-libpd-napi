# node-libpd-napi

Modern N-API bindings for [libpd](https://github.com/libpd/libpd), designed to work with Electron. Uses CMake + [cmake-js](https://github.com/cmake-js/cmake-js) for a clean cross-platform build. Optional [miniaudio](https://github.com/mackron/miniaudio) backend for audio I/O.

## Features

- Native binding via N-API (`node-addon-api`)
- CMake build orchestrated by `cmake-js`
- libpd lié statiquement: pas de .dylib/.so à copier
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

By default, we vendor libpd and build it from source; it's linked statically into the addon. You'll need sources locally:

```
# Clone the dependencies into third_party directory
mkdir -p third_party
git clone https://github.com/libpd/libpd.git third_party/libpd
git clone https://github.com/mackron/miniaudio.git third_party/miniaudio

# libpd will be built by CMake as part of this project; no separate make is required.
```

After running these commands, your directory structure should look like:

```
third_party/
  libpd/ (git clone)
  miniaudio/
    miniaudio.h
```

## Platform-specific libraries

Not required anymore for runtime. libpd is linked statically into the .node binary.

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
const { PdEngine } = require('node-libpd-napi')

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

No need to copy shared libraries; libpd is embedded.

### Distribution

When publishing to npm, no external libpd.{dylib,so,dll} needs to be shipped. The addon contains libpd.

## License

MIT
