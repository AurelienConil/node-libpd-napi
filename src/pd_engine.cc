#include "pd_engine.h"

Napi::Object PdEngine::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "PdEngine",
                                      {PdEngine::InstanceMethod("start", &PdEngine::start),
                                       PdEngine::InstanceMethod("stop", &PdEngine::stop),
                                       PdEngine::InstanceMethod("openPatch", &PdEngine::openPatch),
                                       PdEngine::InstanceMethod("closePatch", &PdEngine::closePatch),
                                       PdEngine::InstanceMethod("sendBang", &PdEngine::sendBang),
                                       PdEngine::InstanceMethod("sendFloat", &PdEngine::sendFloat),
                                       PdEngine::InstanceMethod("sendSymbol", &PdEngine::sendSymbol)});

    exports.Set("PdEngine", func);
    return exports;
}

PdEngine::PdEngine(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<PdEngine>(info)
{
    // TODO: Wire libpd init here when available
}

Napi::Value PdEngine::start(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (running_)
        return env.Undefined();
    // TODO: init audio (miniaudio or portaudio), open stream, start
    running_ = true;
    return env.Undefined();
}

Napi::Value PdEngine::stop(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!running_)
        return env.Undefined();
    // TODO: stop audio, cleanup
    running_ = false;
    return env.Undefined();
}

Napi::Value PdEngine::openPatch(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "path string required").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string path = info[0].As<Napi::String>().Utf8Value();
    // TODO: libpd open patch
    return env.Undefined();
}

Napi::Value PdEngine::closePatch(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    // TODO: libpd close patch
    return env.Undefined();
}

Napi::Value PdEngine::sendBang(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "receiver name string required").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string recv = info[0].As<Napi::String>().Utf8Value();
    // TODO: libpd send bang
    return env.Undefined();
}

Napi::Value PdEngine::sendFloat(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber())
    {
        Napi::TypeError::New(env, "(receiver: string, value: number)").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string recv = info[0].As<Napi::String>().Utf8Value();
    double value = info[1].As<Napi::Number>().DoubleValue();
    // TODO: libpd send float
    return env.Undefined();
}

Napi::Value PdEngine::sendSymbol(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString())
    {
        Napi::TypeError::New(env, "(receiver: string, symbol: string)").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string recv = info[0].As<Napi::String>().Utf8Value();
    std::string sym = info[1].As<Napi::String>().Utf8Value();
    // TODO: libpd send symbol
    return env.Undefined();
}
