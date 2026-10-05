# node-libpd-napi

Modern N-API bindings for [libpd](https://github.com/libpd/libpd), designed to work with Electron. Uses CMake + [cmake-js](https://github.com/cmake-js/cmake-js) for a clean cross-platform build. Optional [miniaudio](https://github.com/mackron/miniaudio) backend for audio I/O.

## Features

- Native binding via N-API (`node-addon-api`)
- CMake build orchestrated by `cmake-js`
- libpd built from source (git submodule) and linked statically: a single self-contained `.node`
- Electron-ready with dedicated integration
- Easy audio configuration with customizable parameters
- Minimal JS API surface you can extend
- Complete examples for both Node.js and Electron

## Project layout

- `src/` C++ addon sources (`addon.cc`, `pd_engine.cc`)
- `include/` addon headers (`pd_engine.h`)
- `CMakeLists.txt` build definition
- `third_party/libpd/` libpd sources (git submodule)
- `include/miniaudio.h` miniaudio single-header audio backend
- `scripts/check-mac-app.sh` verifies a packaged macOS `.app`
- `example/electron/` runnable Electron demo

## Build prerequisites

- CMake >= 3.18
- Node.js 18+ (LTS recommended)
- Python 3 (for node-gyp internals used by cmake-js)
- A C++17 compiler
- macOS: Xcode command line tools, frameworks linked automatically

## Quick start

```sh
git clone --recursive https://github.com/AurelienConil/node-libpd-napi.git
cd node-libpd-napi
npm install            # also builds the addon (libpd is compiled from source)
```

Already cloned without `--recursive`? Run `git submodule update --init --recursive`.

Run the Electron example, or package it as a `.app`:

```sh
npm run example:electron
cd example/electron && npm run dist
```

## How libpd is linked

libpd (`third_party/libpd`, git submodule) is compiled with its own CMake as a
static library and linked into `build/Release/node-libpd-napi.node`. The addon
depends only on system libraries, so there is no shared library to locate at
runtime, in development or inside a packaged app. No binaries are committed.

Check it with:

```sh
otool -L build/Release/node-libpd-napi.node   # macOS: only /System and /usr/lib entries
```

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

### Packaging an Electron app

See `example/electron/README.md`: the `.node` must be unpacked
from `app.asar` (`asarUnpack`), as well as Pd patches, because native code
cannot read inside an asar archive. `scripts/check-mac-app.sh` verifies a
packaged `.app`.

## License

MIT
