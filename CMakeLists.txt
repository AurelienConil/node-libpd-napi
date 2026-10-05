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

# libpd: built from source (git submodule third_party/libpd) and linked
# statically into the addon, so the .node has no libpd shared library to locate.
if (NOT EXISTS ${LIBPD_ROOT}/CMakeLists.txt OR NOT EXISTS ${LIBPD_ROOT}/pure-data/src/m_pd.h)
  message(FATAL_ERROR "libpd sources missing in ${LIBPD_ROOT}. Run: git submodule update --init --recursive")
endif()
set(LIBPD_STATIC ON  CACHE BOOL "" FORCE)
set(LIBPD_SHARED OFF CACHE BOOL "" FORCE)
set(PD_BUILD_C_EXAMPLES OFF CACHE BOOL "" FORCE)
add_subdirectory(${LIBPD_ROOT} ${CMAKE_BINARY_DIR}/libpd EXCLUDE_FROM_ALL)
# The static archive is linked into a shared library (.node)
set_target_properties(libpd_static PROPERTIES POSITION_INDEPENDENT_CODE ON)

find_package(Threads REQUIRED)
target_link_libraries(${PROJECT_NAME} PRIVATE libpd_static Threads::Threads ${CMAKE_DL_LIBS})
if (UNIX AND NOT APPLE)
  target_link_libraries(${PROJECT_NAME} PRIVATE m)
endif()
target_compile_definitions(${PROJECT_NAME} PRIVATE HAVE_LIBPD=1)

# miniaudio integration (single header) — allow include/ fallback
if (WITH_MINIAUDIO)
  set(_MA_CANDIDATES
    ${MINIAUDIO_ROOT}/miniaudio.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/miniaudio.h
  )
  set(_MA_FOUND FALSE)
  foreach(_cand IN LISTS _MA_CANDIDATES)
    if (EXISTS ${_cand})
      get_filename_component(_MA_DIR ${_cand} DIRECTORY)
      target_include_directories(${PROJECT_NAME} PRIVATE ${_MA_DIR})
      target_compile_definitions(${PROJECT_NAME} PRIVATE HAVE_MINIAUDIO=1)
      set(_MA_FOUND TRUE)
      break()
    endif()
  endforeach()
  if (NOT _MA_FOUND)
    message(STATUS "miniaudio.h not found; audio output disabled. Place it under third_party/miniaudio/ or include/.")
  endif()
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
