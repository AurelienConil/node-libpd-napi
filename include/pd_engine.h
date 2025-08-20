#pragma once

#include <napi.h>
#include <string>
#include <vector>

class PdEngine : public Napi::ObjectWrap<PdEngine>
{
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    PdEngine(const Napi::CallbackInfo &info);

private:
    // JS methods
    Napi::Value start(const Napi::CallbackInfo &info);
    Napi::Value stop(const Napi::CallbackInfo &info);
    Napi::Value openPatch(const Napi::CallbackInfo &info);
    Napi::Value closePatch(const Napi::CallbackInfo &info);
    Napi::Value sendBang(const Napi::CallbackInfo &info);
    Napi::Value sendFloat(const Napi::CallbackInfo &info);
    Napi::Value sendSymbol(const Napi::CallbackInfo &info);

    // State
    bool running_ = false;
    int sampleRate_ = 48000;
    int blockSize_ = 64;
    int channelsOut_ = 2;
    int channelsIn_ = 0;
};
