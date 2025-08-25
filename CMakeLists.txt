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

# libpd integration (headers only initially) — prefer third_party but allow include/ fallback
set(_LIBPD_HEADERS
  ${LIBPD_ROOT}/libpd_wrapper/z_libpd.h
  ${CMAKE_CURRENT_SOURCE_DIR}/include/z_libpd.h
)
set(_LIBPD_FOUND FALSE)
foreach(_hdr IN LISTS _LIBPD_HEADERS)
  if (EXISTS ${_hdr})
    get_filename_component(_HDR_DIR ${_hdr} DIRECTORY)
    target_include_directories(${PROJECT_NAME} PRIVATE ${_HDR_DIR} ${LIBPD_ROOT})
    target_compile_definitions(${PROJECT_NAME} PRIVATE HAVE_LIBPD=1)
    set(_LIBPD_FOUND TRUE)
    break()
  endif()
endforeach()

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

# Link libpd if found
if (_LIBPD_FOUND)
  if (EXISTS ${LIBPD_ROOT}/libs/libpd.dylib OR EXISTS ${LIBPD_ROOT}/libs/libpd.so OR EXISTS ${LIBPD_ROOT}/libs/libpd.dll)
    set(LIBPD_LIB "${LIBPD_ROOT}/libs/libpd${CMAKE_SHARED_LIBRARY_SUFFIX}")
    if (APPLE)
      # Sur macOS, nous devons ajuster le chemin de recherche de la bibliothèque
      add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND install_name_tool -change "libs/libpd.dylib" "@loader_path/libpd.dylib" "$<TARGET_FILE:${PROJECT_NAME}>"
      )
      # Copier la bibliothèque dans le répertoire de sortie
      add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy "${LIBPD_LIB}" "$<TARGET_FILE_DIR:${PROJECT_NAME}>"
      )
    endif()
    target_link_libraries(${PROJECT_NAME} PRIVATE ${LIBPD_LIB})
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
