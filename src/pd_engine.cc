#include "pd_engine.h"
#include <cmath>
#include <cstring>

#ifdef HAVE_MINIAUDIO
#define MINIAUDIO_IMPLEMENTATION
#include "miniaudio.h"
#endif

#ifdef HAVE_LIBPD
extern "C"
{
#include "z_libpd.h"
}
#endif

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

#ifdef HAVE_LIBPD
    libpd_init();
    libpd_init_audio(channelsIn_, channelsOut_, sampleRate_);

    // Calculer le nombre de ticks (1 tick = 64 samples dans PureData)
    int numTicks = blockSize_ / 64;
    if (numTicks < 1)
        numTicks = 1; // Au moins 1 tick

    // Ajuster blockSize_ pour qu'il soit un multiple de 64
    blockSize_ = numTicks * 64;

    // Configurer la taille de bloc via les messages appropriés
    // Note: le paramètre "ticks" est souvent utilisé dans libpd pour le traitement audio
    // Pour PureData natif, on peut utiliser "-blocksize" à la place

    // Activer le traitement audio
    libpd_start_message(1);
    libpd_add_float(1.0f);
    libpd_finish_message("pd", "dsp");

    printf("Pure Data initialized with: blockSize=%d samples (buffer %d ms), sampleRate=%d, channels in/out=%d/%d\n",
           blockSize_, (blockSize_ * 1000) / sampleRate_, sampleRate_, channelsIn_, channelsOut_);
#endif

#ifdef HAVE_MINIAUDIO
    // Set up static variables for the callback
    static ma_uint32 s_channels = (ma_uint32)channelsOut_;
    static ma_uint32 s_sampleRate = (ma_uint32)sampleRate_;

    ma_device_config config = ma_device_config_init(ma_device_type_playback);
    config.playback.format = ma_format_f32;
    config.playback.channels = s_channels;
    config.sampleRate = s_sampleRate;
    config.periodSizeInFrames = blockSize_; // Configurer la taille du buffer audio
    config.pUserData = this;                // Passer l'instance PdEngine au callback

    config.dataCallback = [](ma_device *pDevice, void *pOutput, const void *pInput, ma_uint32 frameCount)
    {
        (void)pDevice;
        (void)pInput;
        float *out = (float *)pOutput;
#ifdef HAVE_LIBPD
        // Taille fixe d'un bloc PureData = 64 échantillons (standard dans PD)
        const int pdBlockSize = 64;

        // Allouer un buffer pour les résultats
        // frameCount = nombre d'échantillons demandés par miniaudio
        std::vector<float> outBuf(frameCount * (size_t)s_channels, 0.0f);

        // Calculer le nombre de "ticks" PureData à traiter
        // Un tick = 64 samples dans PureData
        int ticks = frameCount / pdBlockSize;
        if (ticks < 1)
            ticks = 1;

        // Traiter l'audio avec libpd exactement comme dans l'exemple pdtest.c
        // Premier paramètre = nombre de ticks à traiter
        // Deuxième paramètre = buffer d'entrée (nullptr car pas d'entrée)
        // Troisième paramètre = buffer de sortie
        if (libpd_process_float(ticks, nullptr, outBuf.data()) != 0)
        {
            // En cas d'erreur, produire un son silencieux
            memset(out, 0, frameCount * s_channels * sizeof(float));
            return;
        }

        // Appliquer un gain pour éviter la saturation
        const float gain = 0.8f;
        for (ma_uint32 i = 0; i < frameCount * s_channels; ++i)
        {
            out[i] = outBuf[i] * gain;
        }
#else
        static double phase = 0.0;
        double freq = 440.0;
        double sr = (double)s_sampleRate;
        for (ma_uint32 i = 0; i < frameCount; ++i)
        {
            float s = (float)std::sin(2.0 * M_PI * phase);
            for (ma_uint32 ch = 0; ch < s_channels; ++ch)
            {
                out[i * s_channels + ch] = s * 0.1f;
            }
            phase += freq / sr;
            if (phase >= 1.0)
                phase -= 1.0;
        }
#endif
    };
    static ma_device g_device; // static storage for device
    if (ma_device_init(nullptr, &config, &g_device) != MA_SUCCESS)
    {
        Napi::Error::New(env, "Failed to init audio device").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    if (ma_device_start(&g_device) != MA_SUCCESS)
    {
        ma_device_uninit(&g_device);
        Napi::Error::New(env, "Failed to start audio device").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    device_ = &g_device;
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
    if (device_)
    {
        ma_device_stop(device_);
        ma_device_uninit(device_);
        device_ = nullptr;
    }
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
    std::string dir, name;
    splitPath(path, dir, name);
    patch_ = libpd_openfile(name.c_str(), dir.c_str());
    if (!patch_)
    {
        Napi::Error::New(env, "Failed to open patch").ThrowAsJavaScriptException();
    }
#else
    // Pour les tests sans libpd, on affiche simplement le chemin
    printf("Opened patch at startup: %s\n", path.c_str());
    // Ne rien faire avec path pour éviter les avertissements
#endif
    return env.Undefined();
}

Napi::Value PdEngine::closePatch(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
#ifdef HAVE_LIBPD
    if (patch_)
    {
        libpd_closefile(patch_);
        patch_ = nullptr;
    }
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
    libpd_bang(recv.c_str());
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
    libpd_float(recv.c_str(), (float)value);
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
    libpd_symbol(recv.c_str(), sym.c_str());
#else
    (void)recv;
    (void)sym;
#endif
    return env.Undefined();
}

void PdEngine::splitPath(const std::string &full, std::string &dir, std::string &name)
{
    auto pos = full.find_last_of("/\\");
    if (pos == std::string::npos)
    {
        dir = "";
        name = full;
    }
    else
    {
        dir = full.substr(0, pos + 1);
        name = full.substr(pos + 1);
    }
}
