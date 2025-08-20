#include <napi.h>
#include "pd_engine.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
    return PdEngine::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)
