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
    // Options: { sampleRate?: number, blockSize?: number, channelsOut?: number, channelsIn?: number }
    if (info.Length() > 0 && info[0].IsObject())
    {
        auto obj = info[0].As<Napi::Object>();
        if (obj.Has("sampleRate"))
            sampleRate_ = obj.Get("sampleRate").As<Napi::Number>().Int32Value();
        if (obj.Has("blockSize"))
            blockSize_ = obj.Get("blockSize").As<Napi::Number>().Int32Value();
        if (obj.Has("channelsOut"))
            channelsOut_ = obj.Get("channelsOut").As<Napi::Number>().Int32Value();
        if (obj.Has("channelsIn"))
            channelsIn_ = obj.Get("channelsIn").As<Napi::Number>().Int32Value();
    }

#ifdef HAVE_LIBPD
    // Defer full init until start() when audio is set up
#endif
}

PdEngine::~PdEngine()
{
    if (running_)
    {
        StopInternal();
    }
}

Napi::Value PdEngine::start(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (running_)
        return env.Undefined();
    // Init libpd audio config
#ifdef HAVE_LIBPD
    // pd_init() and audio config here; keep it guarded
#endif

#ifdef HAVE_MINIAUDIO
    // Create and start miniaudio device (placeholder, compilable without headers)
    // Real code will include miniaudio.h and set up callbacks
#endif
    running_ = true;
    return env.Undefined();
}

Napi::Value PdEngine::stop(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!running_)
        return env.Undefined();
    // Stop audio and cleanup
    StopInternal();
    return env.Undefined();
}

void PdEngine::StopInternal()
{
#ifdef HAVE_MINIAUDIO
    // stop and uninit device
#endif
    running_ = false;
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
#ifdef HAVE_LIBPD
    // patch_ = libpd_openfile(...)
#else
    (void)path;
#endif
    return env.Undefined();
}

Napi::Value PdEngine::closePatch(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
#ifdef HAVE_LIBPD
    // if (patch_) { libpd_closefile(patch_); patch_ = nullptr; }
#endif
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
#ifdef HAVE_LIBPD
    // libpd_bang(recv.c_str());
#else
    (void)recv;
#endif
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
#ifdef HAVE_LIBPD
    // libpd_float(recv.c_str(), (t_float)value);
#else
    (void)recv;
    (void)value;
#endif
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
#ifdef HAVE_LIBPD
    // libpd_symbol(recv.c_str(), sym.c_str());
#else
    (void)recv;
    (void)sym;
#endif
    return env.Undefined();
}
