# node-libpd-napi

Modern N-API bindings for [libpd](https://github.com/libpd/libpd), designed to work with Electron. Uses CMake + [cmake-js](https://github.com/cmake-js/cmake-js) for a clean cross-platform build. Optional [miniaudio](https://github.com/mackron/miniaudio) backend for audio I/O.

## Features

- Native binding via N-API (`node-addon-api`)
- CMake build orchestrated by `cmake-js`
- Paths/hooks to integrate libpd and miniaudio
- Minimal JS API surface you can extend
- Electron example app

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

## JavaScript API (early draft)

```js
const { PdEngine } = require('node-libpd-napi')

// Initialize PdEngine with audio configuration
const pd = new PdEngine({
  sampleRate: 48000,
  blockSize: 64,  // Equivalent to "ticks" in original node-libpd (1 tick = 64 samples)
  channelsOut: 2, // Number of output channels
  channelsIn: 0   // Number of input channels
})

await pd.start() // start audio
await pd.openPatch('path/to/patch.pd')
pd.sendBang('start')
pd.sendFloat('freq', 440)
pd.sendSymbol('message', 'hello')
await pd.stop()
```

All methods are synchronous for now; you can convert to async Promises later.

## Electron compatibility

Build against Electron headers by running:

```sh
npm run build:electron
```

This sets the correct ABI during compilation via `cmake-js -r electron`.

## License

MIT
