cmake_minimum_required(VERSION 3.18)
project(node-libpd-napi VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# N-API version
add_definitions(-DNAPI_VERSION=8)

# node-addon-api (headers only)
include(FetchContent)
FetchContent_Declare(
  node_addon_api
  GIT_REPOSITORY https://github.com/nodejs/node-addon-api.git
  GIT_TAG v8.2.1
)
FetchContent_MakeAvailable(node_addon_api)

# Options to control backends
option(WITH_MINIAUDIO "Build with miniaudio backend" ON)
option(WITH_PORTAUDIO "Build with PortAudio backend" OFF)

# Paths to third-party sources (expected to be vendored under third_party/)
set(LIBPD_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/third_party/libpd" CACHE PATH "Path to libpd root")
set(MINIAUDIO_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/third_party/miniaudio" CACHE PATH "Path to miniaudio root")

# Add addon
add_library(${PROJECT_NAME} SHARED
  src/addon.cc
  src/pd_engine.cc
)

# Ensure proper filename for Node addons
set_target_properties(${PROJECT_NAME} PROPERTIES
  PREFIX ""
  SUFFIX ".node"
)

# Include directories
target_include_directories(${PROJECT_NAME}
  PRIVATE
    ${CMAKE_JS_INC}
    ${node_addon_api_SOURCE_DIR}
    include
)

# Link Node.js
# CMAKE_JS_LIB will be defined by cmake-js during configure
if (DEFINED CMAKE_JS_LIB)
  target_link_libraries(${PROJECT_NAME} PRIVATE ${CMAKE_JS_LIB})
endif()

# libpd integration (headers only initially)
if (EXISTS ${LIBPD_ROOT}/libpd_wrapper/z_libpd.h)
  target_include_directories(${PROJECT_NAME} PRIVATE ${LIBPD_ROOT}/libpd_wrapper)
  target_compile_definitions(${PROJECT_NAME} PRIVATE HAVE_LIBPD=1)
endif()

# miniaudio integration (single header)
if (WITH_MINIAUDIO AND EXISTS ${MINIAUDIO_ROOT}/miniaudio.h)
  target_include_directories(${PROJECT_NAME} PRIVATE ${MINIAUDIO_ROOT})
  target_compile_definitions(${PROJECT_NAME} PRIVATE HAVE_MINIAUDIO=1)
endif()

# macOS specific flags
if(APPLE)
  find_library(COREAUDIO_FRAMEWORK CoreAudio)
  find_library(AUDIOUNIT_FRAMEWORK AudioUnit)
  find_library(AUDIOTOOLBOX_FRAMEWORK AudioToolbox)
  find_library(COREFOUNDATION_FRAMEWORK CoreFoundation)
  target_link_libraries(${PROJECT_NAME} PRIVATE
    ${COREAUDIO_FRAMEWORK}
    ${AUDIOUNIT_FRAMEWORK}
    ${AUDIOTOOLBOX_FRAMEWORK}
    ${COREFOUNDATION_FRAMEWORK}
  )
endif()

# Export compile_commands.json
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
