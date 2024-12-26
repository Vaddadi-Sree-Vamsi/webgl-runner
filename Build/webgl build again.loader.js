<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> d502d3d ( new build gzip)
function createUnityInstance(canvas, config, onProgress) {
  onProgress = onProgress || function () {};

  function showBanner(msg, type) {
    // Only ever show one error at most - other banner messages after that should get ignored
    // to avoid noise.
    if (!showBanner.aborted && config.showBanner) {
      if (type == 'error') showBanner.aborted = true;
      return config.showBanner(msg, type);
    }

    // Fallback to console logging if visible banners have been suppressed
    // from the main page.
    switch(type) {
      case 'error': console.error(msg); break;
      case 'warning': console.warn(msg); break;
      default: console.log(msg); break;
    }
  }

  function errorListener(e) {
    var error = e.reason || e.error;
    var message = error ? error.toString() : (e.message || e.reason || '');
    var stack = (error && error.stack) ? error.stack.toString() : '';

    // Do not repeat the error message if it's present in the stack trace.
    if (stack.startsWith(message)) {
      stack = stack.substring(message.length);
    }

    message += '\n' + stack.trim();

    if (!message || !Module.stackTraceRegExp || !Module.stackTraceRegExp.test(message))
      return;

    var filename = e.filename || (error && (error.fileName || error.sourceURL)) || '';
    var lineno = e.lineno || (error && (error.lineNumber || error.line)) || 0;

    errorHandler(message, filename, lineno);
  }

  function fallbackToDefaultConfigWithWarning(config, key, defaultValue) {
    var value = config[key];

    if (typeof value === "undefined" || !value) {
      console.warn("Config option \"" + key + "\" is missing or empty. Falling back to default value: \"" + defaultValue + "\". Consider updating your WebGL template to include the missing config option.");
      config[key] = defaultValue;
    }
  }

  var Module = {
    canvas: canvas,
    webglContextAttributes: {
      preserveDrawingBuffer: false,
      powerPreference: 2,
    },
    wasmFileSize: 88008104,
    cacheControl: function (url) {
      return (url == Module.dataUrl || url.match(/\.bundle/)) ? "must-revalidate" : "no-store";
    },
    streamingAssetsUrl: "StreamingAssets",
    downloadProgress: {},
    deinitializers: [],
    intervals: {},
    setInterval: function (func, ms) {
      var id = window.setInterval(func, ms);
      this.intervals[id] = true;
      return id;
    },
    clearInterval: function(id) {
      delete this.intervals[id];
      window.clearInterval(id);
    },
    preRun: [],
    postRun: [],
    print: function (message) {
      console.log(message);
    },
    printErr: function (message) {
      console.error(message);

      if (typeof message === 'string' && message.indexOf('wasm streaming compile failed') != -1) {
        if (message.toLowerCase().indexOf('mime') != -1) {
          showBanner('HTTP Response Header "Content-Type" configured incorrectly on the server for file ' + Module.codeUrl + ' , should be "application/wasm". Startup time performance will suffer.', 'warning');
        } else {
          showBanner('WebAssembly streaming compilation failed! This can happen for example if "Content-Encoding" HTTP header is incorrectly enabled on the server for file ' + Module.codeUrl + ', but the file is not pre-compressed on disk (or vice versa). Check the Network tab in browser Devtools to debug server header configuration.', 'warning');
        }
      }
    },
    locateFile: function (url) {
      if (url == "build.wasm") return this.codeUrl;
      return url;
    },
    disabledCanvasEvents: [
      "contextmenu",
      "dragstart",
    ],
  };

  // Add fallback values for companyName, productName and productVersion to ensure that the UnityCache is working.
  fallbackToDefaultConfigWithWarning(config, "companyName", "Unity");
  fallbackToDefaultConfigWithWarning(config, "productName", "WebGL Player");
  fallbackToDefaultConfigWithWarning(config, "productVersion", "1.0");

  for (var parameter in config)
    Module[parameter] = config[parameter];

  Module.streamingAssetsUrl = new URL(Module.streamingAssetsUrl, document.URL).href;

  // Operate on a clone of Module.disabledCanvasEvents field so that at Quit time
  // we will ensure we'll remove the events that we created (in case user has
  // modified/cleared Module.disabledCanvasEvents in between)
  var disabledCanvasEvents = Module.disabledCanvasEvents.slice();

  function preventDefault(e) {
    e.preventDefault();
  }

  disabledCanvasEvents.forEach(function (disabledCanvasEvent) {
    canvas.addEventListener(disabledCanvasEvent, preventDefault);
  });

  window.addEventListener("error", errorListener);
  window.addEventListener("unhandledrejection", errorListener);

  // Safari does not automatically stretch the fullscreen element to fill the screen.
  // The CSS width/height of the canvas causes it to remain the same size in the full screen
  // window on Safari, resulting in it being a small canvas with black borders filling the
  // rest of the screen.
  var _savedElementWidth = "";
  var _savedElementHeight = "";
  function webkitFullscreenChangeEventHandler(e) {
    // Safari uses webkitCurrentFullScreenElement and not fullscreenElement.
    var fullscreenElement = document.webkitCurrentFullScreenElement;
    if (fullscreenElement === canvas) {
      if (canvas.style.width) {
        _savedElementWidth = canvas.style.width;
        _savedElementHeight = canvas.style.height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }
    } else {
      if (_savedElementWidth) {
        canvas.style.width = _savedElementWidth;
        canvas.style.height = _savedElementHeight;
        _savedElementWidth = "";
        _savedElementHeight = "";
      }
    }
  }
  // Safari uses webkitfullscreenchange event and not fullscreenchange
  document.addEventListener("webkitfullscreenchange", webkitFullscreenChangeEventHandler);

  // Clear the event handlers we added above when the app quits, so that the event handler
  // functions will not hold references to this JS function scope after
  // exit, to allow JS garbage collection to take place.
  Module.deinitializers.push(function() {
    Module['disableAccessToMediaDevices']();
    disabledCanvasEvents.forEach(function (disabledCanvasEvent) {
      canvas.removeEventListener(disabledCanvasEvent, preventDefault);
    });
    window.removeEventListener("error", errorListener);
    window.removeEventListener("unhandledrejection", errorListener);

    document.removeEventListener("webkitfullscreenchange", webkitFullscreenChangeEventHandler);

    for (var id in Module.intervals)
    {
      window.clearInterval(id);
    }
    Module.intervals = {};
  });

  Module.QuitCleanup = function () {
    for (var i = 0; i < Module.deinitializers.length; i++) {
      Module.deinitializers[i]();
    }
    Module.deinitializers = [];
    // After all deinitializer callbacks are called, notify user code that the Unity game instance has now shut down.
    if (typeof Module.onQuit == "function")
      Module.onQuit();

  };

  var unityInstance = {
    Module: Module,
    SetFullscreen: function () {
      if (Module.SetFullscreen)
        return Module.SetFullscreen.apply(Module, arguments);
      Module.print("Failed to set Fullscreen mode: Player not loaded yet.");
    },
    SendMessage: function () {
      if (Module.SendMessage)
        return Module.SendMessage.apply(Module, arguments);
      Module.print("Failed to execute SendMessage: Player not loaded yet.");
    },
    Quit: function () {
      return new Promise(function (resolve, reject) {
        Module.shouldQuit = true;
        Module.onQuit = resolve;
      });
    },
    GetMetricsInfo: function () {
      var metricsInfoPtr = Number(Module._getMetricsInfo()) >>> 0;
      // pointer arithmetic to then index into the WASM heap, we go up by 4 bytes for Uint32 or 8 bytes for doubles.
      var totalWASMHeapSizePtr = metricsInfoPtr;
      var usedWASMHeapSizePtr = totalWASMHeapSizePtr + 4; // + 4 because totalWasHeapSize is size_t (4 bytes/ 32-bit unsigned int)
      var totalJSHeapSizePtr = usedWASMHeapSizePtr + 4; // same reason
      var usedJSHeapSizePtr = totalJSHeapSizePtr + 8; // + 8 because totalJSHeapSize is a double (8 bytes).. and so on
      var pageLoadTimePtr = usedJSHeapSizePtr + 8;
      var pageLoadTimeToFrame1Ptr = pageLoadTimePtr + 4;
      var fpsPtr = pageLoadTimeToFrame1Ptr + 4;
      var movingAverageFpsPtr = fpsPtr + 8;
      var assetLoadTimePtr = movingAverageFpsPtr + 8;
      var webAssemblyStartupTimePtr = assetLoadTimePtr + 4;
      var codeDownloadTimePtr = webAssemblyStartupTimePtr + 4;
      var gameStartupTimePtr = codeDownloadTimePtr + 4;
      var numJankedFramesPtr = gameStartupTimePtr + 4;
      return {
        totalWASMHeapSize: Module.HEAPU32[totalWASMHeapSizePtr >> 2],
        usedWASMHeapSize: Module.HEAPU32[usedWASMHeapSizePtr >> 2],
        totalJSHeapSize: Module.HEAPF64[totalJSHeapSizePtr >> 3],
        usedJSHeapSize: Module.HEAPF64[usedJSHeapSizePtr >> 3],
        pageLoadTime: Module.HEAPU32[pageLoadTimePtr >> 2],
        pageLoadTimeToFrame1: Module.HEAPU32[pageLoadTimeToFrame1Ptr >> 2],
        fps: Module.HEAPF64[fpsPtr >> 3],
        movingAverageFps: Module.HEAPF64[movingAverageFpsPtr >> 3],
        assetLoadTime: Module.HEAPU32[assetLoadTimePtr >> 2],
        webAssemblyStartupTime: Module.HEAPU32[webAssemblyStartupTimePtr >> 2] - (Module.webAssemblyTimeStart || 0),
        codeDownloadTime: Module.HEAPU32[codeDownloadTimePtr >> 2],
        gameStartupTime: Module.HEAPU32[gameStartupTimePtr >> 2],
        numJankedFrames: Module.HEAPU32[numJankedFramesPtr >> 2]
      };
    }
  };


  Module.SystemInfo = (function () {

    var browser, browserVersion, os, osVersion, canvas, gpu;

    var ua = navigator.userAgent + ' ';
    var browsers = [
      ['Firefox', 'Firefox'],
      ['OPR', 'Opera'],
      ['Edg', 'Edge'],
      ['SamsungBrowser', 'Samsung Browser'],
      ['Trident', 'Internet Explorer'],
      ['MSIE', 'Internet Explorer'],
      ['Chrome', 'Chrome'],
      ['CriOS', 'Chrome on iOS Safari'],
      ['FxiOS', 'Firefox on iOS Safari'],
      ['Safari', 'Safari'],
    ];

    function extractRe(re, str, idx) {
      re = RegExp(re, 'i').exec(str);
      return re && re[idx];
    }
    for(var b = 0; b < browsers.length; ++b) {
      browserVersion = extractRe(browsers[b][0] + '[\/ ](.*?)[ \\)]', ua, 1);
      if (browserVersion) {
        browser = browsers[b][1];
        break;
      }
    }
    if (browser == 'Safari') browserVersion = extractRe('Version\/(.*?) ', ua, 1);
    if (browser == 'Internet Explorer') browserVersion = extractRe('rv:(.*?)\\)? ', ua, 1) || browserVersion;

    // These OS strings need to match the ones in Runtime/Misc/SystemInfo.cpp::GetOperatingSystemFamily()
    var oses = [
      ['Windows (.*?)[;\)]', 'Windows'],
      ['Android ([0-9_\.]+)', 'Android'],
      ['iPhone OS ([0-9_\.]+)', 'iPhoneOS'],
      ['iPad.*? OS ([0-9_\.]+)', 'iPadOS'],
      ['FreeBSD( )', 'FreeBSD'],
      ['OpenBSD( )', 'OpenBSD'],
      ['Linux|X11()', 'Linux'],
      ['Mac OS X ([0-9_\\.]+)', 'MacOS'],
      ['bot|google|baidu|bing|msn|teoma|slurp|yandex', 'Search Bot']
    ];
    for(var o = 0; o < oses.length; ++o) {
      osVersion = extractRe(oses[o][0], ua, 1);
      if (osVersion) {
        os = oses[o][1];
        osVersion = osVersion.replace(/_/g, '.');
        break;
      }
    }
    var versionMappings = {
      'NT 5.0': '2000',
      'NT 5.1': 'XP',
      'NT 5.2': 'Server 2003',
      'NT 6.0': 'Vista',
      'NT 6.1': '7',
      'NT 6.2': '8',
      'NT 6.3': '8.1',
      'NT 10.0': '10'
    };
    osVersion = versionMappings[osVersion] || osVersion;

    // TODO: Add mobile device identifier, e.g. SM-G960U
    webgpuVersion = 0;
    canvas = document.createElement("canvas");
    if (canvas) {
      var gl = canvas.getContext("webgl2");
      var glVersion = gl ? 2 : 0;
      if (!gl) {
        if (gl = canvas && canvas.getContext("webgl")) glVersion = 1;
      }

      if (gl) {
        gpu = (gl.getExtension("WEBGL_debug_renderer_info") && gl.getParameter(0x9246 /*debugRendererInfo.UNMASKED_RENDERER_WEBGL*/)) || gl.getParameter(0x1F01 /*gl.RENDERER*/);
      }

    }

    // Returns true on success, and a string on failure that denotes which sub-feature was missing.
    function testWasm2023Supported() {
      try {
        if (!window.WebAssembly) return 'WebAssembly';
        if (!WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,3,1,0,1,10,13,1,11,0,65,0,65,0,65,1,252,11,0,11]))) return 'bulk-memory';
        if (!WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,11,1,9,1,1,125,32,0,252,0,26,11]))) return 'non-trapping fp-to-int';
        if (!WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,10,1,8,1,1,126,32,0,194,26,11]))) return 'sign-extend';
        if (!WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,9,1,7,0,65,0,253,15,26,11]))) return 'wasm-simd128';
        if (!WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,10,1,8,0,6,64,1,25,1,11,11]))) return 'wasm-exceptions';
        return true;
      } catch(e) {
        return 'Exception: ' + e;
      }
    }

    var hasThreads = typeof SharedArrayBuffer !== 'undefined';
    var hasWasm = typeof WebAssembly === "object" && typeof WebAssembly.compile === "function";
    var hasWasm2023 = hasWasm && testWasm2023Supported() === true;

    return {
      width: screen.width,
      height: screen.height,
      userAgent: ua.trim(),
      browser: browser || 'Unknown browser',
      browserVersion: browserVersion || 'Unknown version',
      mobile: /Mobile|Android|iP(ad|hone)/.test(navigator.appVersion),
      os: os || 'Unknown OS',
      osVersion: osVersion || 'Unknown OS Version',
      gpu: gpu || 'Unknown GPU',
      language: navigator.userLanguage || navigator.language,
      hasWebGL: glVersion,
      hasWebGPU: webgpuVersion,
      hasCursorLock: !!document.body.requestPointerLock,
      hasFullscreen: !!document.body.requestFullscreen || !!document.body.webkitRequestFullscreen, // Safari still uses the webkit prefixed version
      hasThreads: hasThreads,
      hasWasm: hasWasm,
      hasWasm2023: hasWasm2023,
      missingWasm2023Feature: hasWasm2023 ? null : testWasm2023Supported(),
      // This should be updated when we re-enable wasm threads. Previously it checked for WASM thread
      // support with: var wasmMemory = hasWasm && hasThreads && new WebAssembly.Memory({"initial": 1, "maximum": 1, "shared": true});
      // which caused Chrome to have a warning that SharedArrayBuffer requires cross origin isolation.
      hasWasmThreads: false,
    };
  })();

  function errorHandler(message, filename, lineno) {
    // Unity needs to rely on Emscripten deferred fullscreen requests, so these will make their way to error handler
    if (message.indexOf('fullscreen error') != -1)
      return;

    if (Module.startupErrorHandler) {
      Module.startupErrorHandler(message, filename, lineno);
      return;
    }
    if (Module.errorHandler && Module.errorHandler(message, filename, lineno))
      return;
    console.log("Invoking error handler due to\n" + message);

    // Support Firefox window.dump functionality.
    if (typeof dump == "function")
      dump("Invoking error handler due to\n" + message);

    if (errorHandler.didShowErrorMessage)
      return;
    var message = "An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n" + message;
    if (message.indexOf("DISABLE_EXCEPTION_CATCHING") != -1) {
      message = "An exception has occurred, but exception handling has been disabled in this build. If you are the developer of this content, enable exceptions in your project WebGL player settings to be able to catch the exception or see the stack trace.";
    } else if (message.indexOf("Cannot enlarge memory arrays") != -1) {
      message = "Out of memory. If you are the developer of this content, try allocating more memory to your WebGL build in the WebGL player settings.";
    } else if (message.indexOf("Invalid array buffer length") != -1  || message.indexOf("Invalid typed array length") != -1 || message.indexOf("out of memory") != -1 || message.indexOf("could not allocate memory") != -1) {
      message = "The browser could not allocate enough memory for the WebGL content. If you are the developer of this content, try allocating less memory to your WebGL build in the WebGL player settings.";
    }
    alert(message);
    errorHandler.didShowErrorMessage = true;
  }


  Module.abortHandler = function (message) {
    errorHandler(message, "", 0);
    return true;
  };

  Error.stackTraceLimit = Math.max(Error.stackTraceLimit || 0, 50);

  function progressUpdate(id, e) {
    if (id == "symbolsUrl")
      return;
    var progress = Module.downloadProgress[id];
    if (!progress)
      progress = Module.downloadProgress[id] = {
        started: false,
        finished: false,
        lengthComputable: false,
        total: 0,
        loaded: 0,
      };
    if (typeof e == "object" && (e.type == "progress" || e.type == "load")) {
      if (!progress.started) {
        progress.started = true;
        progress.lengthComputable = e.lengthComputable;
      }
      progress.total = e.total;
      progress.loaded = e.loaded;
      if (e.type == "load")
        progress.finished = true;
    }
    var loaded = 0, total = 0, started = 0, computable = 0, unfinishedNonComputable = 0;
    for (var id in Module.downloadProgress) {
      var progress = Module.downloadProgress[id];
      if (!progress.started)
        return 0;
      started++;
      if (progress.lengthComputable) {
        loaded += progress.loaded;
        total += progress.total;
        computable++;
      } else if (!progress.finished) {
        unfinishedNonComputable++;
      }
    }
    var totalProgress = started ? (started - unfinishedNonComputable - (total ? computable * (total - loaded) / total : 0)) / started : 0;
    onProgress(0.9 * totalProgress);
  }

Module.readBodyWithProgress = function() {
  /**
   * Estimate length of uncompressed content by taking average compression ratios
   * of compression type into account.
   * @param {Response} response A Fetch API response object
   * @param {boolean} lengthComputable Return wether content length was given in header.
   * @returns {number}
   */
  function estimateContentLength(response, lengthComputable) {
    if (!lengthComputable) {
      // No content length available
      return 0;
    }

    var compression = response.headers.get("Content-Encoding");
    var contentLength = parseInt(response.headers.get("Content-Length"));
    
    switch (compression) {
    case "br":
      return Math.round(contentLength * 5);
    case "gzip":
      return Math.round(contentLength * 4);
    default:
      return contentLength;
    }
  }

  function readBodyWithProgress(response, onProgress, enableStreaming) {
    var reader = response.body ? response.body.getReader() : undefined;
    var lengthComputable = typeof response.headers.get('Content-Length') !== "undefined";
    var estimatedContentLength = estimateContentLength(response, lengthComputable);
    var body = new Uint8Array(estimatedContentLength);
    var trailingChunks = [];
    var receivedLength = 0;
    var trailingChunksStart = 0;

    if (!lengthComputable) {
      console.warn("[UnityCache] Response is served without Content-Length header. Please reconfigure server to include valid Content-Length for better download performance.");
    }

    function readBody() {
      if (typeof reader === "undefined") {
        // Browser does not support streaming reader API
        // Fallback to Respone.arrayBuffer()
        return response.arrayBuffer().then(function (buffer) {
          var body = new Uint8Array(buffer);
          onProgress({
            type: "progress",
            response: response,
            total: buffer.length,
            loaded: 0,
            lengthComputable: lengthComputable,
            chunk: enableStreaming ? body : null
          });
          
          return body;
        });
      }
      
      // Start reading memory chunks
      return reader.read().then(function (result) {
        if (result.done) {
          return concatenateTrailingChunks();
        }

        if ((receivedLength + result.value.length) <= body.length) {
          // Directly append chunk to body if enough memory was allocated
          body.set(result.value, receivedLength);
          trailingChunksStart = receivedLength + result.value.length;
        } else {
          // Store additional chunks in array to append later
          trailingChunks.push(result.value);
        }

        receivedLength += result.value.length;
        onProgress({
          type: "progress",
          response: response,
          total: Math.max(estimatedContentLength, receivedLength),
          loaded: receivedLength,
          lengthComputable: lengthComputable,
          chunk: enableStreaming ? result.value : null
        });

        return readBody();
      });
    }

    function concatenateTrailingChunks() {
      if (receivedLength === estimatedContentLength) {
        return body;
      }

      if (receivedLength < estimatedContentLength) {
        // Less data received than estimated, shrink body
        return body.slice(0, receivedLength);
      }

      // More data received than estimated, create new larger body to prepend all additional chunks to the body
      var newBody = new Uint8Array(receivedLength);
      newBody.set(body, 0);
      var position = trailingChunksStart;
      for (var i = 0; i < trailingChunks.length; ++i) {
        newBody.set(trailingChunks[i], position);
        position += trailingChunks[i].length;
      }

      return newBody;
    }

    return readBody().then(function (parsedBody) {
      onProgress({
        type: "load",
        response: response,
        total: parsedBody.length,
        loaded: parsedBody.length,
        lengthComputable: lengthComputable,
        chunk: null
      });

      response.parsedBody = parsedBody;
      return response;
    });
  }

  return readBodyWithProgress;
}();

Module.fetchWithProgress = function () {
  function fetchWithProgress(resource, init) {
    var onProgress = function () { };
    if (init && init.onProgress) {
      onProgress = init.onProgress;
    }

    return fetch(resource, init).then(function (response) {
      return Module.readBodyWithProgress(response, onProgress, init.enableStreamingDownload);
    });
  }

  return fetchWithProgress;
}();

  /**
 * @interface RequestMetaData
 * An object with meta data for a request
 * 
 * @property {string} url The url of a request
 * @property {string} company The company name
 * @property {string} product The product name
 * @property {number} version The version of the build
 * @property {number} size The company of the build 
 * @property {number} accessedAt Timestamp when request was last accessed (Unix timestamp format)
 * @property {number} updatedAt Timestamp when request was last updated in the cache (Unix timestamp format)
 */

/**
 * @interface ResponseWithMetaData
 * An object with a cached response and meta data
 * @property {Response} response
 * @property {RequestMetaData} metaData
 */

Module.UnityCache = function () {
  var UnityCacheDatabase = { name: "UnityCache", version: 4 };
  var RequestMetaDataStore = { name: "RequestMetaDataStore", version: 1 };
  var RequestStore = { name: "RequestStore", version: 1 };
  var WebAssemblyStore = { name: "WebAssembly", version: 1 };
  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  function log(message) {
    console.log("[UnityCache] " + message);
  }

  /**
   * A request cache that uses the browser Index DB to cache large requests
   * @property {Promise<void>} isConnected
   * @property {Cache} cache
   */
  function UnityCache() {
    var self = this;

    this.isConnected = this.connect().then(function () {
      return self.cleanUpCache();
    });

    this.isConnected.catch(function (error) {
      log("Error when initializing cache: " + error);
    });
  }

  var instance = null;
  /**
   * Singleton accessor. Returns unity cache instance
   * @returns {UnityCache}
   */
  UnityCache.getInstance = function () {
    if (!instance) {
      instance = new UnityCache();
    }

    return instance;
  }

  /**
   * Destroy unity cache instance. Returns a promise that waits for the
   * database connection to be closed.
   * @returns {Promise<void>}
   */
  UnityCache.destroyInstance = function () {
    if (!instance) {
      return Promise.resolve();
    }

    return instance.close().then(function () {
      instance = null;
    });
  }

  /**
   * Clear the unity cache. 
   * @returns {Promise<void>} A promise that resolves when the cache is cleared.
   */
  UnityCache.prototype.clearCache = function () {
    var self = this;

    function deleteCacheEntries(cacheKeys) {
      if (cacheKeys.length === 0) {
        return Promise.resolve();
      }

      var key = cacheKeys.pop();

      return self.cache.delete(key).then(function () {
        return deleteCacheEntries(cacheKeys);
      });
    }

    return this.isConnected.then(function () {
      return self.execute(RequestMetaDataStore.name, "clear", []);
    }).then(function () {
      return self.cache.keys();
    }).then(function (keys) {
      return deleteCacheEntries(keys)
    });
  }

  /**
   * Config for request meta data store
   */
  UnityCache.UnityCacheDatabase = UnityCacheDatabase;
  UnityCache.RequestMetaDataStore = RequestMetaDataStore;
  UnityCache.MaximumCacheSize = 1024 * 1024 * 1024; // 1 GB

  /**
   * Load a request response from cache
   * @param {Request|string} request The fetch request
   * @returns {Promise<ResponseWithMetaData|undefined>} A cached response with meta data for the request or undefined if request is not in cache.
   */
  UnityCache.prototype.loadRequest = function (request) {
    var self = this;

    return self.isConnected.then(function () {
      return Promise.all([
        self.cache.match(request),
        self.loadRequestMetaData(request)
      ]);
    }).then(function (result) {
      if (typeof result[0] === "undefined" || typeof result[1] === "undefined") {
        return undefined;
      }

      return {
        response: result[0],
        metaData: result[1]
      };
    });
  }

  /**
   * Load a request meta data from cache
   * @param {Request|string} request The fetch request
   * @returns {Promise<RequestMetaData>} Request meta data
   */
  UnityCache.prototype.loadRequestMetaData = function (request) {
    var url = typeof request === "string" ? request : request.url;

    return this.execute(RequestMetaDataStore.name, "get", [url]);
  }

  /**
   * Update meta data of a request
   * @param {RequestMetaData} metaData
   * @returns {Promise<void>}
   */
  UnityCache.prototype.updateRequestMetaData = function (metaData) {
    return this.execute(RequestMetaDataStore.name, "put", [metaData]);
  }

  /**
   * Store request in cache
   * @param {Request} request 
   * @param {Response} response 
   * @returns {Promise<void>}
   */
  UnityCache.prototype.storeRequest = function (request, response) {
    var self = this;

    return self.isConnected.then(function () {
      return self.cache.put(request, response);
    });
  }

  /**
   * Close database and cache connection.
   * @async
   */
   UnityCache.prototype.close = function () {
    return this.isConnected.then(function () {
      if (this.database) {
        this.database.close();
        this.database = null;
      }

      if (this.cache) {
        this.cache = null;
      }

    }.bind(this));
  }


  /**
   * Create a connection to Cache and IndexedDB for meta data storage
   * @private
   * @async
   * @returns {Promise<void>} A Promise that is resolved when a connection to the IndexedDB and cache are established.
   */
  UnityCache.prototype.connect = function () {
    var self = this;

    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("Could not connect to cache: IndexedDB is not supported."));
    }

    if (typeof window.caches === "undefined") {
      return Promise.reject(new Error("Could not connect to cache: Cache API is not supported."));
    }

    var isConnected = new Promise(function (resolve, reject) {
      try {
        // Workaround for WebKit bug 226547:
        // On very first page load opening a connection to IndexedDB hangs without triggering onerror.
        // Add a timeout that triggers the error handling code.
        self.openDBTimeout = setTimeout(function () {
          if (typeof self.database != "undefined") {
            return;
          }

          reject(new Error("Could not connect to cache: Database timeout."));
        }, 20000);

        function clearOpenDBTimeout() {
          if (!self.openDBTimeout) {
            return;
          }

          clearTimeout(self.openDBTimeout);
          self.openDBTimeout = null;
        }

        var openRequest = indexedDB.open(UnityCacheDatabase.name, UnityCacheDatabase.version);

        openRequest.onupgradeneeded =  self.upgradeDatabase.bind(self);

        openRequest.onsuccess = function (e) {
          clearOpenDBTimeout();
          self.database = e.target.result;
          resolve();
        };

        openRequest.onerror = function (error) {
          clearOpenDBTimeout();
          self.database = null;
          reject(new Error("Could not connect to database."));
        };
      } catch (error) {
        clearOpenDBTimeout();
        self.database = null;
        self.cache = null;
        reject(new Error("Could not connect to cache: Could not connect to database."));
      }
    }).then(function () {
      var cacheName = UnityCacheDatabase.name + "_" + Module.companyName + "_" + Module.productName;
      
      return caches.open(cacheName);
    }).then(function (cache) {
      self.cache = cache;
    });

    return isConnected;
  }

  /**
   * Upgrade object store if database is outdated
   * @private
   * @param {any} e Database upgrade event
   */
  UnityCache.prototype.upgradeDatabase = function (e) {
    var database = e.target.result;

    if (!database.objectStoreNames.contains(RequestMetaDataStore.name)) {
      var objectStore = database.createObjectStore(RequestMetaDataStore.name, { keyPath: "url" });
      ["accessedAt", "updatedAt"].forEach(function (index) { objectStore.createIndex(index, index); });
    }

    if (database.objectStoreNames.contains(RequestStore.name)) {
      database.deleteObjectStore(RequestStore.name);
    }

    if (database.objectStoreNames.contains(WebAssemblyStore.name)) {
      database.deleteObjectStore(WebAssemblyStore.name);
    }
  }

  /**
   * Execute an operation on the cache
   * @private
   * @param {string} store The name of the store to use
   * @param {string} operation The operation to to execute on the cache
   * @param {Array} parameters Parameters for the operation
   * @returns {Promise} A promise to the cache entry
   */
   UnityCache.prototype.execute = function (store, operation, parameters) {
    return this.isConnected.then(function () {
      return new Promise(function (resolve, reject) {
        try {
          // Failure during initialization of database -> reject Promise
          if (this.database === null) {
            reject(new Error("indexedDB access denied"))
            return;
          }

          // Create a transaction for the request
          var accessMode = ["put", "delete", "clear"].indexOf(operation) != -1 ? "readwrite" : "readonly";
          var transaction = this.database.transaction([store], accessMode)
          var target = transaction.objectStore(store);
          if (operation == "openKeyCursor") {
            target = target.index(parameters[0]);
            parameters = parameters.slice(1);
          }

          // Make a request to the database
          var request = target[operation].apply(target, parameters);
          request.onsuccess = function (e) {
            resolve(e.target.result);
          };
          request.onerror = function (error) {
            reject(error);
          };
        } catch (error) {
          reject(error);
        }
      }.bind(this));
    }.bind(this));
  }

  UnityCache.prototype.getMetaDataEntries = function () {
    var self = this;
    var cacheSize = 0;
    var metaDataEntries = [];

    return new Promise(function (resolve, reject) {
      var transaction = self.database.transaction([RequestMetaDataStore.name], "readonly");
      var target = transaction.objectStore(RequestMetaDataStore.name);
      var request = target.openCursor();

      request.onsuccess = function (event) {
        var cursor = event.target.result;

        if (cursor) {
          cacheSize += cursor.value.size;
          metaDataEntries.push(cursor.value);

          cursor.continue();
        } else {
          resolve({
            metaDataEntries: metaDataEntries,
            cacheSize: cacheSize
          });
        }
      };
      request.onerror = function (error) {
        reject(error);
      };
    });
  }

  /**
   * Clean up cache by removing outdated entries.
   * @private
   * @returns {Promise<void>}
   */
  UnityCache.prototype.cleanUpCache = function () {
    var self = this;

    return this.getMetaDataEntries().then(function (result) {
      var metaDataEntries = result.metaDataEntries;
      var cacheSize = result.cacheSize;
      var entriesToDelete = [];
      var newMetaDataEntries = [];

      // Remove cached entries with outdated product version
      for (var i = 0; i < metaDataEntries.length; ++i) {
        if (metaDataEntries[i].version == Module.productVersion) {
          newMetaDataEntries.push(metaDataEntries[i]);
          continue;
        }

        entriesToDelete.push(metaDataEntries[i]);
        cacheSize -= metaDataEntries[i].size;
      }

      // Remove cache entries until cache size limit is met
      newMetaDataEntries.sort(function (a,b) {
        return a.accessedAt - b.accessedAt;
      });

      for (var i = 0; i < newMetaDataEntries.length; ++i) {
        if (cacheSize < UnityCache.MaximumCacheSize) {
          break;
        }

        entriesToDelete.push(newMetaDataEntries[i]);
        cacheSize -= newMetaDataEntries[i].size;
      }

      function deleteMetaDataEntry(url) {
        return new Promise(function (resolve, reject) {
          var transaction = self.database.transaction([RequestMetaDataStore.name], "readwrite");
          var target = transaction.objectStore(RequestMetaDataStore.name);
          target.delete(url);

          transaction.oncomplete = resolve;
          transaction.onerror = reject;
        });
      }

      function deleteEntries() {
        if (entriesToDelete.length === 0) {
          return Promise.resolve();
        }

        var entryToDelete = entriesToDelete.pop();
        return self.cache.delete(entryToDelete.url).then(function (deleted) {
          if (deleted) {
            return deleteMetaDataEntry(entryToDelete.url);
          }
        }).then(function () {
          return deleteEntries();
        });
      }

      return deleteEntries();
    });
  }

  return UnityCache;
}();
  Module.cachedFetch = function () {
  var UnityCache = Module.UnityCache;
  var fetchWithProgress = Module.fetchWithProgress;
  var readBodyWithProgress = Module.readBodyWithProgress;

  function log(message) {
    console.log("[UnityCache] " + message);
  }

  function resolveURL(url) {
    resolveURL.link = resolveURL.link || document.createElement("a");
    resolveURL.link.href = url;
    return resolveURL.link.href;
  }

  function isCrossOriginURL(url) {
    var originMatch = window.location.href.match(/^[a-z]+:\/\/[^\/]+/);
    return !originMatch || url.lastIndexOf(originMatch[0], 0);
  }

  function isCacheEnabled(url, init) {
    if (init && init.method && init.method !== "GET") {
      return false;
    }

    if (init && ["must-revalidate", "immutable"].indexOf(init.control) == -1) {
      return false;
    }

    if (!url.match("^https?:\/\/")) {
      return false;
    }

    return true;
  }

  function cachedFetch(resource, init) {
    var unityCache = UnityCache.getInstance();
    var url = resolveURL((typeof resource === "string") ? resource : resource.url);
    var cache = { enabled: isCacheEnabled(url, init) };
    if (init) {
      cache.control = init.control;
      cache.companyName = init.companyName;
      cache.productName = init.productName;
      cache.productVersion = init.productVersion;
    }
    cache.revalidated = false;
    cache.metaData = {
      url: url,
      accessedAt: Date.now(),
      version: cache.productVersion
    };
    cache.response = null;

    function fetchAndStoreInCache(resource, init) {
      return fetch(resource, init).then(function (response) {
        if (!cache.enabled || cache.revalidated) {
          return response;
        }

        if (response.status === 304) {
          // Cached response is still valid. Set revalidated flag and return cached response
          cache.revalidated = true;

          unityCache.updateRequestMetaData(cache.metaData).then(function () {
            log("'" + cache.metaData.url + "' successfully revalidated and served from the browser cache");
          }).catch(function (error) {
            log("'" + cache.metaData.url + "' successfully revalidated but not stored in the browser cache due to the error: " + error);
          });

          return readBodyWithProgress(cache.response, init.onProgress, init.enableStreamingDownload);
        } else if (response.status == 200) {
          // New response -> Store it and cache and return it
          cache.response = response;
          cache.metaData.updatedAt = cache.metaData.accessedAt;
          cache.revalidated = true;
          var clonedResponse = response.clone();

          return readBodyWithProgress(response, init.onProgress, init.enableStreamingDownload).then(function (response) {
            // Update cached request and meta data
            cache.metaData.size = response.parsedBody.length;
            Promise.all([
              unityCache.storeRequest(resource, clonedResponse),
              unityCache.updateRequestMetaData(cache.metaData)
            ]).then(function () {
              log("'" + url + "' successfully downloaded and stored in the browser cache");
            }).catch(function (error) {
              log("'" + url + "' successfully downloaded but not stored in the browser cache due to the error: " + error);
            });

            return response;
          });
        } else {
          // Request failed
          log("'" + url + "' request failed with status: " + response.status + " " + response.statusText);
        }

        return readBodyWithProgress(response, init.onProgress, init.enableStreamingDownload);
      });
    }

    // Use fetch directly if request can't be cached
    if (!cache.enabled) {
      return fetchWithProgress(resource, init);
    }

    return unityCache.loadRequest(url).then(function (result) {
      // Fetch resource and store it in cache if not present or outdated version
      if (!result) {
        return fetchAndStoreInCache(resource, init);
      }

      var response = result.response;
      var metaData = result.metaData;
      cache.response = response;
      cache.metaData.size = metaData.size;
      cache.metaData.updatedAt = metaData.updatedAt;
      
      if (cache.control == "immutable") {
        cache.revalidated = true;
        unityCache.updateRequestMetaData(metaData).then(function () {
          log("'" + cache.metaData.url + "' served from the browser cache without revalidation");
        });

        return readBodyWithProgress(response, init.onProgress, init.enableStreamingDownload);
      } else if (isCrossOriginURL(url) && (response.headers.get("Last-Modified") || response.headers.get("ETag"))) {
        return fetch(url, { method: "HEAD" }).then(function (headResult) {
          cache.revalidated = ["Last-Modified", "ETag"].every(function (header) {
            return !response.headers.get(header) || response.headers.get(header) == headResult.headers.get(header);
          });
          if (cache.revalidated) {
            unityCache.updateRequestMetaData(metaData).then(function () {
              log("'" + cache.metaData.url  + "' successfully revalidated and served from the browser cache");
            });

            return readBodyWithProgress(cache.response, init.onProgress, init.enableStreamingDownload);
          } else {
            return fetchAndStoreInCache(resource, init);
          }
        });
      } else {
        init = init || {};
        var requestHeaders = init.headers || {};
        init.headers = requestHeaders;
        if (response.headers.get("Last-Modified")) {
          requestHeaders["If-Modified-Since"] = response.headers.get("Last-Modified");
          requestHeaders["Cache-Control"] = "no-cache";
        } else if (response.headers.get("ETag")) {
          requestHeaders["If-None-Match"] = response.headers.get("ETag");
          requestHeaders["Cache-Control"] = "no-cache";
        }

        return fetchAndStoreInCache(resource, init);
      }
    }).catch(function (error) {
      // Fallback to regular fetch if an error occurs
      log("Failed to load '" + cache.metaData.url  + "' from browser cache due to the error: " + error);
      return fetchWithProgress(resource, init);
    });
  }

  return cachedFetch;
}();

  var decompressors = {
    gzip: {
      hasUnityMarker: function (data) {
        var commentOffset = 10, expectedComment = "UnityWeb Compressed Content (gzip)";
        if (commentOffset > data.length || data[0] != 0x1F || data[1] != 0x8B)
          return false;
        var flags = data[3];
        if (flags & 0x04) {
          if (commentOffset + 2 > data.length)
            return false;
          commentOffset += 2 + data[commentOffset] + (data[commentOffset + 1] << 8);
          if (commentOffset > data.length)
            return false;
        }
        if (flags & 0x08) {
          while (commentOffset < data.length && data[commentOffset])
            commentOffset++;
          if (commentOffset + 1 > data.length)
            return false;
          commentOffset++;
        }
        return (flags & 0x10) && String.fromCharCode.apply(null, data.subarray(commentOffset, commentOffset + expectedComment.length + 1)) == expectedComment + "\0";
      },
    },
    br: {
      hasUnityMarker: function (data) {
        var expectedComment = "UnityWeb Compressed Content (brotli)";
        if (!data.length)
          return false;
        var WBITS_length = (data[0] & 0x01) ? (data[0] & 0x0E) ? 4 : 7 : 1,
            WBITS = data[0] & ((1 << WBITS_length) - 1),
            MSKIPBYTES = 1 + ((Math.log(expectedComment.length - 1) / Math.log(2)) >> 3);
            commentOffset = (WBITS_length + 1 + 2 + 1 + 2 + (MSKIPBYTES << 3) + 7) >> 3;
        if (WBITS == 0x11 || commentOffset > data.length)
          return false;
        var expectedCommentPrefix = WBITS + (((3 << 1) + (MSKIPBYTES << 4) + ((expectedComment.length - 1) << 6)) << WBITS_length);
        for (var i = 0; i < commentOffset; i++, expectedCommentPrefix >>>= 8) {
          if (data[i] != (expectedCommentPrefix & 0xFF))
            return false;
        }
        return String.fromCharCode.apply(null, data.subarray(commentOffset, commentOffset + expectedComment.length)) == expectedComment;
      },
    },
  };


  function downloadBinary(urlId) {
      progressUpdate(urlId);
      var cacheControl = Module.cacheControl(Module[urlId]);
      var fetchImpl = Module.companyName && Module.productName ? Module.cachedFetch : Module.fetchWithProgress;
      var url = Module[urlId];
      var mode = /file:\/\//.exec(url) ? "same-origin" : undefined;

      var request = fetchImpl(Module[urlId], {
        method: "GET",
        companyName: Module.companyName,
        productName: Module.productName,
        productVersion: Module.productVersion,
        control: cacheControl,
        mode: mode,
        onProgress: function (event) {
          progressUpdate(urlId, event);
        }
      });

      return request.then(function (response) {
        // At this point the browser should have decompressed the gzip/brotli-compressed content,
        // but that relies on the web server having been properly configured with Content-Encoding: gzip/br flag.
        // Verify that browser did in fact decompress the content.
        var compression;
        if (decompressors.gzip.hasUnityMarker(response.parsedBody)) compression = ['gzip', 'gzip'];
        if (decompressors.br.hasUnityMarker(response.parsedBody)) compression = ['brotli', 'br'];
        if (compression) {
          var type = response.headers.get('Content-Type');
          var encoding = response.headers.get('Content-Encoding');
          var compressedLength = response.headers.get('Content-Length'); // Content-Length, if present, specifies the byte size of the downloaded file when it was still compressed

          var browserDidDecompress = (compressedLength > 0 && response.parsedBody.length != compressedLength);
          var browserDidNotDecompress = (compressedLength > 0 && response.parsedBody.length == compressedLength);

          if (encoding != compression[1]) showBanner('Failed to parse binary data file ' + url + ' (with "Content-Type: ' + type + '"), because it is still ' + compression[0] + '-compressed. It should have been uncompressed by the browser, but it was unable to do so since the web server provided the compressed content without specifying the HTTP Response Header "Content-Encoding: ' + compression[1] + '" that would have informed the browser that decompression is needed. Please verify your web server hosting configuration to add the missing "Content-Encoding: ' + compression[1] + '" HTTP Response Header.', 'error');
          else if (browserDidDecompress) {
            showBanner("Web server configuration error: it looks like the web server has been misconfigured to double-compress the data file " + url + "! That is, it looks like the web browser has decompressed the file, but it is still in compressed form, suggesting that an already compressed file was compressed a second time. (Content-Length: " + compressedLength + ', obtained length: ' + response.parsedBody.length + ')', 'error');
          } else if (browserDidNotDecompress) {
            var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (isSafari && encoding == 'gzip' && type == 'application/octet-stream')
              showBanner('Unable to load content due to Apple Safari bug https://bugs.webkit.org/show_bug.cgi?id=247421 . To work around this issue, please reconfigure your web server to serve ' + url + ' with Content-Type: application/gzip instead of Content-Type: application/octet-stream', 'error');
            else
              showBanner('Malformed binary data? Received compressed data file ' + url + ', with "Content-Type: ' + type + '", "Content-Encoding: ' + compression[1] + '", "Content-Length: ' + compressedLength + '", which the web browser should have decompressed, but it seemingly did not (received file size is the same as compressed file size was). Double check that the integrity of the file is intact.', 'error');
          } else {
            showBanner('Malformed binary data URL ' + url + '. No "Content-Length" HTTP Response header present. Check browser console for more information.', 'error');
          }
          console.error('Malformed data? Downloaded binary data file ' + url + ' (ArrayBuffer size: ' + response.parsedBody.length + ') and browser should have decompressed it, but it might have not. Dumping raw HTTP Response Headers if it might help debug:');
          response.headers.forEach(function(value, key) {
            console.error(key + ': ' + value);
          });
        }
        return response.parsedBody;
      }).catch(function (e) {
        var error = 'Failed to download file ' + url;
        if (location.protocol == 'file:') {
          showBanner(error + '. Loading web pages via a file:// URL without a web server is not supported by this browser. Please use a local development web server to host Unity content, or use the Unity Build and Run option.', 'error');
        } else {
          console.error(error);
        }
      });
  }

  function downloadFramework() {
      return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = Module.frameworkUrl;
        script.onload = function () {
          // Adding the framework.js script to DOM created a global
          // 'unityFramework' variable that should be considered internal.
          // If not, then we have received a malformed file.
          if (typeof unityFramework === 'undefined' || !unityFramework) {
            var compressions = [['br', 'br'], ['gz', 'gzip']];
            for(var i in compressions) {
              var compression = compressions[i];
              if (Module.frameworkUrl.endsWith('.' + compression[0])) {
                var error = 'Unable to parse ' + Module.frameworkUrl + '!';
                if (location.protocol == 'file:') {
                  showBanner(error + ' Loading pre-compressed (brotli or gzip) content via a file:// URL without a web server is not supported by this browser. Please use a local development web server to host compressed Unity content, or use the Unity Build and Run option.', 'error');
                  return;
                }
                error += ' This can happen if build compression was enabled but web server hosting the content was misconfigured to not serve the file with HTTP Response Header "Content-Encoding: ' + compression[1] + '" present. Check browser Console and Devtools Network tab to debug.';
                if (compression[0] == 'br') {
                  if (location.protocol == 'http:') {
                    var migrationHelp = ['localhost', '127.0.0.1'].indexOf(location.hostname) != -1 ? '' : 'Migrate your server to use HTTPS.'
                    if (/Firefox/.test(navigator.userAgent)) error = 'Unable to parse ' + Module.frameworkUrl + '!<br>If using custom web server, verify that web server is sending .br files with HTTP Response Header "Content-Encoding: br". Brotli compression may not be supported in Firefox over HTTP connections. ' + migrationHelp + ' See <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1670675">https://bugzilla.mozilla.org/show_bug.cgi?id=1670675</a> for more information.';
                    else error = 'Unable to parse ' + Module.frameworkUrl + '!<br>If using custom web server, verify that web server is sending .br files with HTTP Response Header "Content-Encoding: br". Brotli compression may not be supported over HTTP connections. Migrate your server to use HTTPS.';
                  }
                }
                showBanner(error, 'error');
                return;
              }
            };
            showBanner('Unable to parse ' + Module.frameworkUrl + '! The file is corrupt, or compression was misconfigured? (check Content-Encoding HTTP Response Header on web server)', 'error');
          }

          // Capture the variable to local scope and clear it from global
          // scope so that JS garbage collection can take place on
          // application quit.
          var fw = unityFramework;
          unityFramework = null;
          // Also ensure this function will not hold any JS scope
          // references to prevent JS garbage collection.
          script.onload = null;
          resolve(fw);
        }
        script.onerror = function(e) {
          showBanner('Unable to load file ' + Module.frameworkUrl + '! Check that the file exists on the remote server. (also check browser Console and Devtools Network tab to debug)', 'error');
        }
        document.body.appendChild(script);
        Module.deinitializers.push(function() {
          document.body.removeChild(script);
        });
      });
  }

  // WebGPU is only available if both navigator.gpu exists,
  // and if requestAdapter returns a non-null adapter.
  function checkForWebGPU() {
    return new Promise(function (resolve, reject) {
      if (!navigator.gpu) {
        resolve(false);
        return;
      }
      navigator.gpu.requestAdapter().then(function (adapter) {
        Module.SystemInfo.hasWebGPU = !!adapter;
        resolve(Module.SystemInfo.hasWebGPU);
      });
    });
  }

  function loadBuild() {
    var codeDownloadTimeStartup = performance.now();
    downloadFramework().then(function (unityFramework) {
      Module.webAssemblyTimeStart = performance.now();
      unityFramework(Module);
      Module.codeDownloadTimeEnd = performance.now() - codeDownloadTimeStartup;
    });

    var dataUrlLoadStartTime = performance.now();
    var dataPromise = downloadBinary("dataUrl");
    Module.preRun.push(function () {
      Module.addRunDependency("dataUrl");
      dataPromise.then(function (data) {
        var textDecoder = new TextDecoder('utf-8');
        var pos = 0;
        // Reads an unaligned u32 from a given ArrayBuffer.
        function readU32() {
          var u32 = (data[pos] | (data[pos+1] << 8) | (data[pos+2]) << 16 | (data[pos+3] << 24)) >>> 0;
          pos += 4;
          return u32;
        }
        function fail(reason) {
          if (decompressors.gzip.hasUnityMarker(data)) throw reason + '. Failed to parse binary data file, because it is still gzip-compressed and should have been uncompressed by the browser. Web server has likely provided gzip-compressed data without specifying the HTTP Response Header "Content-Encoding: gzip" with it to instruct the browser to decompress it. Please verify your web server hosting configuration.';
          if (decompressors.br.hasUnityMarker(data)) throw reason + '. Failed to parse binary data file, because it is still brotli-compressed and should have been uncompressed by the browser. Web server has likely provided brotli-compressed data without specifying the HTTP Response Header "Content-Encoding: br" with it to instruct the browser to decompress it. Please verify your web server hosting configuration.';
          throw reason;
        }
        var prefix = "UnityWebData1.0\0";
        var id = textDecoder.decode(data.subarray(0, prefix.length));
        if (id != prefix) fail('Unknown data format (id="' + id + '")');
        pos += prefix.length;
        var headerSize = readU32();
        if (pos + headerSize > data.length) fail('Invalid binary data file header! (pos=' + pos + ', headerSize=' + headerSize + ', file length=' + data.length + ')');
        while (pos < headerSize) {
          var offset = readU32();
          var size = readU32();
          if (offset + size > data.length) fail('Invalid binary data file size! (offset=' + offset + ', size=' + size + ', file length=' + data.length + ')');
          var pathLength = readU32();
          if (pos + pathLength > data.length) fail('Invalid binary data file path name! (pos=' + pos + ', length=' + pathLength + ', file length=' + data.length + ')');
          var path = textDecoder.decode(data.subarray(pos, pos + pathLength));
          pos += pathLength;
          // Create the full path leading up to the target filename ("mkdir -d" behavior)
          for (var folder = 0, folderNext = path.indexOf("/", folder) + 1 ; folderNext > 0; folder = folderNext, folderNext = path.indexOf("/", folder) + 1)
            Module.FS_createPath(path.substring(0, folder), path.substring(folder, folderNext - 1), true, true);
          // Create the file itself
          Module.FS_createDataFile(path, null, data.subarray(offset, offset + size), true, true, true);
        }
        Module.removeRunDependency("dataUrl");
        Module.dataUrlLoadEndTime = performance.now() - dataUrlLoadStartTime;
      });
    });
  }

  return new Promise(function (resolve, reject) {
    if (!Module.SystemInfo.hasWebGL) {
      reject("Your browser does not support WebGL.");
    } else if (Module.SystemInfo.hasWebGL == 1) {
      var msg = "Your browser does not support graphics API \"WebGL 2\" which is required for this content.";
      if (Module.SystemInfo.browser == 'Safari' && parseInt(Module.SystemInfo.browserVersion) < 15) {
        if (Module.SystemInfo.mobile || navigator.maxTouchPoints > 1)
          msg += "\nUpgrade to iOS 15 or later.";
        else
          msg += "\nUpgrade to Safari 15 or later.";
      }
      reject(msg);
    } else if (!Module.SystemInfo.hasWasm) {
      reject("Your browser does not support WebAssembly.");
    } else {
      Module.startupErrorHandler = reject;
      onProgress(0);
      Module.postRun.push(function () {
        onProgress(1);
        Module.WebPlayer.WaitForInitialization().then(function () {
          delete Module.startupErrorHandler;
          resolve(unityInstance);
          Module.pageStartupTime = performance.now();
        });
      });
      // Checking for WebGPU availability is asynchronous, so wait until
      // it has finished checking before loading the build.
      checkForWebGPU().then(function () {
        loadBuild();
      });
    }
  });
}
<<<<<<< HEAD
=======
=======
function createUnityInstance(t,n,l){function d(e,t){if(!d.aborted&&n.showBanner)return"error"==t&&(d.aborted=!0),n.showBanner(e,t);switch(t){case"error":console.error(e);break;case"warning":console.warn(e);break;default:console.log(e)}}function r(e){var t=e.reason||e.error,n=t?t.toString():e.message||e.reason||"",r=t&&t.stack?t.stack.toString():"";(n+="\n"+(r=r.startsWith(n)?r.substring(n.length):r).trim())&&b.stackTraceRegExp&&b.stackTraceRegExp.test(n)&&g(n,e.filename||t&&(t.fileName||t.sourceURL)||"",e.lineno||t&&(t.lineNumber||t.line)||0)}function e(e,t,n){var r=e[t];void 0!==r&&r||(console.warn('Config option "'+t+'" is missing or empty. Falling back to default value: "'+n+'". Consider updating your WebGL template to include the missing config option.'),e[t]=n)}l=l||function(){};var o,b={canvas:t,webglContextAttributes:{preserveDrawingBuffer:!1,powerPreference:2},wasmFileSize:84950558,streamingAssetsUrl:"StreamingAssets",downloadProgress:{},deinitializers:[],intervals:{},setInterval:function(e,t){e=window.setInterval(e,t);return this.intervals[e]=!0,e},clearInterval:function(e){delete this.intervals[e],window.clearInterval(e)},preRun:[],postRun:[],print:function(e){console.log(e)},printErr:function(e){console.error(e),"string"==typeof e&&-1!=e.indexOf("wasm streaming compile failed")&&(-1!=e.toLowerCase().indexOf("mime")?d('HTTP Response Header "Content-Type" configured incorrectly on the server for file '+b.codeUrl+' , should be "application/wasm". Startup time performance will suffer.',"warning"):d('WebAssembly streaming compilation failed! This can happen for example if "Content-Encoding" HTTP header is incorrectly enabled on the server for file '+b.codeUrl+", but the file is not pre-compressed on disk (or vice versa). Check the Network tab in browser Devtools to debug server header configuration.","warning"))},locateFile:function(e){return e},disabledCanvasEvents:["contextmenu","dragstart"]};for(o in e(n,"companyName","Unity"),e(n,"productName","WebGL Player"),e(n,"productVersion","1.0"),n)b[o]=n[o];b.streamingAssetsUrl=new URL(b.streamingAssetsUrl,document.URL).href;var i=b.disabledCanvasEvents.slice();function a(e){e.preventDefault()}i.forEach(function(e){t.addEventListener(e,a)}),window.addEventListener("error",r),window.addEventListener("unhandledrejection",r);var s="",f="";function u(e){document.webkitCurrentFullScreenElement===t?t.style.width&&(s=t.style.width,f=t.style.height,t.style.width="100%",t.style.height="100%"):s&&(t.style.width=s,t.style.height=f,f=s="")}document.addEventListener("webkitfullscreenchange",u),b.deinitializers.push(function(){for(var e in b.disableAccessToMediaDevices(),i.forEach(function(e){t.removeEventListener(e,a)}),window.removeEventListener("error",r),window.removeEventListener("unhandledrejection",r),document.removeEventListener("webkitfullscreenchange",u),b.intervals)window.clearInterval(e);b.intervals={}}),b.QuitCleanup=function(){for(var e=0;e<b.deinitializers.length;e++)b.deinitializers[e]();b.deinitializers=[],"function"==typeof b.onQuit&&b.onQuit()};var c={Module:b,SetFullscreen:function(){if(b.SetFullscreen)return b.SetFullscreen.apply(b,arguments);b.print("Failed to set Fullscreen mode: Player not loaded yet.")},SendMessage:function(){if(b.SendMessage)return b.SendMessage.apply(b,arguments);b.print("Failed to execute SendMessage: Player not loaded yet.")},Quit:function(){return new Promise(function(e,t){b.shouldQuit=!0,b.onQuit=e})},GetMetricsInfo:function(){var e=Number(b._getMetricsInfo())>>>0,t=4+e,n=4+t,r=8+n,o=8+r,i=4+o,a=4+i,s=8+a,l=8+s,d=4+l,f=4+d,u=4+f;return{totalWASMHeapSize:b.HEAPU32[e>>2],usedWASMHeapSize:b.HEAPU32[t>>2],totalJSHeapSize:b.HEAPF64[n>>3],usedJSHeapSize:b.HEAPF64[r>>3],pageLoadTime:b.HEAPU32[o>>2],pageLoadTimeToFrame1:b.HEAPU32[i>>2],fps:b.HEAPF64[a>>3],movingAverageFps:b.HEAPF64[s>>3],assetLoadTime:b.HEAPU32[l>>2],webAssemblyStartupTime:b.HEAPU32[d>>2]-(b.webAssemblyTimeStart||0),codeDownloadTime:b.HEAPU32[f>>2],gameStartupTime:b.HEAPU32[u>>2],numJankedFrames:b.HEAPU32[4+u>>2]}}};function h(e,t,n){-1==e.indexOf("fullscreen error")&&(b.startupErrorHandler?b.startupErrorHandler(e,t,n):b.errorHandler&&b.errorHandler(e,t,n)||(console.log("Invoking error handler due to\n"+e),"function"==typeof dump&&dump("Invoking error handler due to\n"+e),h.didShowErrorMessage||(-1!=(e="An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n"+e).indexOf("DISABLE_EXCEPTION_CATCHING")?e="An exception has occurred, but exception handling has been disabled in this build. If you are the developer of this content, enable exceptions in your project WebGL player settings to be able to catch the exception or see the stack trace.":-1!=e.indexOf("Cannot enlarge memory arrays")?e="Out of memory. If you are the developer of this content, try allocating more memory to your WebGL build in the WebGL player settings.":-1==e.indexOf("Invalid array buffer length")&&-1==e.indexOf("Invalid typed array length")&&-1==e.indexOf("out of memory")&&-1==e.indexOf("could not allocate memory")||(e="The browser could not allocate enough memory for the WebGL content. If you are the developer of this content, try allocating less memory to your WebGL build in the WebGL player settings."),alert(e),h.didShowErrorMessage=!0)))}function m(e,t){var n="(wasm-function\\[)(\\d+)(\\])",r=new RegExp(n);return e.replace(new RegExp(n,"g"),function(e){e=e.match(r);return e[1]+(t[e[2]]?t[e[2]]+"@":"")+e[2]+e[3]})}function g(r,o,i){b.symbols?h(m(r,b.symbols),o,i):b.symbolsUrl?v("symbolsUrl").then(function(e){for(var t="",n=0;n<e.length;n++)t+=String.fromCharCode(e[n]);b.symbols=JSON.parse(t),h(m(r,b.symbols),o,i)}).catch(function(e){h(r,o,i)}):h(r,o,i)}function p(e,t){if("symbolsUrl"!=e){var n=b.downloadProgress[e],r=(n=n||(b.downloadProgress[e]={started:!1,finished:!1,lengthComputable:!1,total:0,loaded:0}),"object"!=typeof t||"progress"!=t.type&&"load"!=t.type||(n.started||(n.started=!0,n.lengthComputable=t.lengthComputable),n.total=t.total,n.loaded=t.loaded,"load"==t.type&&(n.finished=!0)),0),o=0,i=0,a=0,s=0;for(e in b.downloadProgress){if(!(n=b.downloadProgress[e]).started)return;i++,n.lengthComputable?(r+=n.loaded,o+=n.total,a++):n.finished||s++}l(.9*(i?(i-s-(o?a*(o-r)/o:0))/i:0))}}b.SystemInfo=function(){var e,t,n,r,o,i=navigator.userAgent+" ",a=[["Firefox","Firefox"],["OPR","Opera"],["Edg","Edge"],["SamsungBrowser","Samsung Browser"],["Trident","Internet Explorer"],["MSIE","Internet Explorer"],["Chrome","Chrome"],["CriOS","Chrome on iOS Safari"],["FxiOS","Firefox on iOS Safari"],["Safari","Safari"]];function s(e,t,n){return(e=RegExp(e,"i").exec(t))&&e[n]}for(var l=0;l<a.length;++l)if(t=s(a[l][0]+"[/ ](.*?)[ \\)]",i,1)){e=a[l][1];break}"Safari"==e&&(t=s("Version/(.*?) ",i,1)),"Internet Explorer"==e&&(t=s("rv:(.*?)\\)? ",i,1)||t);for(var d=[["Windows (.*?)[;)]","Windows"],["Android ([0-9_.]+)","Android"],["iPhone OS ([0-9_.]+)","iPhoneOS"],["iPad.*? OS ([0-9_.]+)","iPadOS"],["FreeBSD( )","FreeBSD"],["OpenBSD( )","OpenBSD"],["Linux|X11()","Linux"],["Mac OS X ([0-9_\\.]+)","MacOS"],["bot|google|baidu|bing|msn|teoma|slurp|yandex","Search Bot"]],f=0;f<d.length;++f)if(r=s(d[f][0],i,1)){n=d[f][1],r=r.replace(/_/g,".");break}var u;function c(){try{return window.WebAssembly?WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,3,1,0,1,10,13,1,11,0,65,0,65,0,65,1,252,11,0,11]))?WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,11,1,9,1,1,125,32,0,252,0,26,11]))?WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,10,1,8,1,1,126,32,0,194,26,11]))?WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,9,1,7,0,65,0,253,15,26,11]))?!!WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,10,1,8,0,6,64,1,25,1,11,11]))||"wasm-exceptions":"wasm-simd128":"sign-extend":"non-trapping fp-to-int":"bulk-memory":"WebAssembly"}catch(e){return"Exception: "+e}}r={"NT 5.0":"2000","NT 5.1":"XP","NT 5.2":"Server 2003","NT 6.0":"Vista","NT 6.1":"7","NT 6.2":"8","NT 6.3":"8.1","NT 10.0":"10"}[r]||r,webgpuVersion=0,(h=document.createElement("canvas"))&&(u=(m=h.getContext("webgl2"))?2:0,m||(m=h&&h.getContext("webgl"))&&(u=1),m&&(o=m.getExtension("WEBGL_debug_renderer_info")&&m.getParameter(37446)||m.getParameter(7937)));var h="undefined"!=typeof SharedArrayBuffer,m="object"==typeof WebAssembly&&"function"==typeof WebAssembly.compile,b=m&&!0===c();return{width:screen.width,height:screen.height,userAgent:i.trim(),browser:e||"Unknown browser",browserVersion:t||"Unknown version",mobile:/Mobile|Android|iP(ad|hone)/.test(navigator.appVersion),os:n||"Unknown OS",osVersion:r||"Unknown OS Version",gpu:o||"Unknown GPU",language:navigator.userLanguage||navigator.language,hasWebGL:u,hasWebGPU:webgpuVersion,hasCursorLock:!!document.body.requestPointerLock,hasFullscreen:!!document.body.requestFullscreen||!!document.body.webkitRequestFullscreen,hasThreads:h,hasWasm:m,hasWasm2023:b,missingWasm2023Feature:b?null:c(),hasWasmThreads:!1}}(),b.abortHandler=function(e){return g(e,"",0),!0},Error.stackTraceLimit=Math.max(Error.stackTraceLimit||0,50),b.readBodyWithProgress=function(i,a,s){var e=i.body?i.body.getReader():void 0,l=void 0!==i.headers.get("Content-Length"),d=function(e,t){if(!t)return 0;var t=e.headers.get("Content-Encoding"),n=parseInt(e.headers.get("Content-Length"));switch(t){case"br":return Math.round(5*n);case"gzip":return Math.round(4*n);default:return n}}(i,l),f=new Uint8Array(d),u=[],c=0,h=0;return l||console.warn("[UnityCache] Response is served without Content-Length header. Please reconfigure server to include valid Content-Length for better download performance."),function o(){return void 0===e?i.arrayBuffer().then(function(e){var t=new Uint8Array(e);return a({type:"progress",response:i,total:e.length,loaded:0,lengthComputable:l,chunk:s?t:null}),t}):e.read().then(function(e){if(e.done){if(c===d)return f;if(c<d)return f.slice(0,c);for(var t=new Uint8Array(c),n=(t.set(f,0),h),r=0;r<u.length;++r)t.set(u[r],n),n+=u[r].length;return t}return c+e.value.length<=f.length?(f.set(e.value,c),h=c+e.value.length):u.push(e.value),c+=e.value.length,a({type:"progress",response:i,total:Math.max(d,c),loaded:c,lengthComputable:l,chunk:s?e.value:null}),o()})}().then(function(e){return a({type:"load",response:i,total:e.length,loaded:e.length,lengthComputable:l,chunk:null}),i.parsedBody=e,i})},b.fetchWithProgress=function(e,t){var n=function(){};return t&&t.onProgress&&(n=t.onProgress),fetch(e,t).then(function(e){return b.readBodyWithProgress(e,n,t.enableStreamingDownload)})};var w={gzip:{require:function(e){var t,n={"inflate.js":function(e,t,n){"use strict";var u=e("./zlib/inflate"),c=e("./utils/common"),h=e("./utils/strings"),m=e("./zlib/constants"),r=e("./zlib/messages"),o=e("./zlib/zstream"),i=e("./zlib/gzheader"),b=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=c.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;if(t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new o,this.strm.avail_out=0,(e=u.inflateInit2(this.strm,t.windowBits))!==m.Z_OK)throw new Error(r[e]);this.header=new i,u.inflateGetHeader(this.strm,this.header)}function s(e,t){if((t=new a(t)).push(e,!0),t.err)throw t.msg||r[t.err];return t.result}a.prototype.push=function(e,t){var n,r,o,i,a,s=this.strm,l=this.options.chunkSize,d=this.options.dictionary,f=!1;if(this.ended)return!1;r=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?s.input=h.binstring2buf(e):"[object ArrayBuffer]"===b.call(e)?s.input=new Uint8Array(e):s.input=e,s.next_in=0,s.avail_in=s.input.length;do{if(0===s.avail_out&&(s.output=new c.Buf8(l),s.next_out=0,s.avail_out=l),(n=u.inflate(s,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&d&&(a="string"==typeof d?h.string2buf(d):"[object ArrayBuffer]"===b.call(d)?new Uint8Array(d):d,n=u.inflateSetDictionary(this.strm,a)),n===m.Z_BUF_ERROR&&!0===f&&(n=m.Z_OK,f=!1),n!==m.Z_STREAM_END&&n!==m.Z_OK)return this.onEnd(n),!(this.ended=!0)}while(!s.next_out||0!==s.avail_out&&n!==m.Z_STREAM_END&&(0!==s.avail_in||r!==m.Z_FINISH&&r!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(a=h.utf8border(s.output,s.next_out),o=s.next_out-a,i=h.buf2string(s.output,a),s.next_out=o,s.avail_out=l-o,o&&c.arraySet(s.output,s.output,a,o,0),this.onData(i)):this.onData(c.shrinkBuf(s.output,s.next_out))),0===s.avail_in&&0===s.avail_out&&(f=!0),(0<s.avail_in||0===s.avail_out)&&n!==m.Z_STREAM_END);return(r=n===m.Z_STREAM_END?m.Z_FINISH:r)===m.Z_FINISH?(n=u.inflateEnd(this.strm),this.onEnd(n),this.ended=!0,n===m.Z_OK):r!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(s.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=c.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},n.Inflate=a,n.inflate=s,n.inflateRaw=function(e,t){return(t=t||{}).raw=!0,s(e,t)},n.ungzip=s},"utils/common.js":function(e,t,n){"use strict";var r="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array,o=(n.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var n=t.shift();if(n){if("object"!=typeof n)throw new TypeError(n+"must be non-object");for(var r in n)n.hasOwnProperty(r)&&(e[r]=n[r])}}return e},n.shrinkBuf=function(e,t){if(e.length!==t){if(e.subarray)return e.subarray(0,t);e.length=t}return e},{arraySet:function(e,t,n,r,o){if(t.subarray&&e.subarray)e.set(t.subarray(n,n+r),o);else for(var i=0;i<r;i++)e[o+i]=t[n+i]},flattenChunks:function(e){for(var t,n,r,o=0,i=0,a=e.length;i<a;i++)o+=e[i].length;for(r=new Uint8Array(o),i=t=0,a=e.length;i<a;i++)n=e[i],r.set(n,t),t+=n.length;return r}}),i={arraySet:function(e,t,n,r,o){for(var i=0;i<r;i++)e[o+i]=t[n+i]},flattenChunks:function(e){return[].concat.apply([],e)}};n.setTyped=function(e){e?(n.Buf8=Uint8Array,n.Buf16=Uint16Array,n.Buf32=Int32Array,n.assign(n,o)):(n.Buf8=Array,n.Buf16=Array,n.Buf32=Array,n.assign(n,i))},n.setTyped(r)},"utils/strings.js":function(e,t,n){"use strict";var l=e("./common"),o=!0,i=!0;try{String.fromCharCode.apply(null,[0])}catch(e){o=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){i=!1}for(var d=new l.Buf8(256),r=0;r<256;r++)d[r]=252<=r?6:248<=r?5:240<=r?4:224<=r?3:192<=r?2:1;function f(e,t){if(t<65537&&(e.subarray&&i||!e.subarray&&o))return String.fromCharCode.apply(null,l.shrinkBuf(e,t));for(var n="",r=0;r<t;r++)n+=String.fromCharCode(e[r]);return n}d[254]=d[254]=1,n.string2buf=function(e){for(var t,n,r,o,i=e.length,a=0,s=0;s<i;s++)55296==(64512&(n=e.charCodeAt(s)))&&s+1<i&&56320==(64512&(r=e.charCodeAt(s+1)))&&(n=65536+(n-55296<<10)+(r-56320),s++),a+=n<128?1:n<2048?2:n<65536?3:4;for(t=new l.Buf8(a),s=o=0;o<a;s++)55296==(64512&(n=e.charCodeAt(s)))&&s+1<i&&56320==(64512&(r=e.charCodeAt(s+1)))&&(n=65536+(n-55296<<10)+(r-56320),s++),n<128?t[o++]=n:(n<2048?t[o++]=192|n>>>6:(n<65536?t[o++]=224|n>>>12:(t[o++]=240|n>>>18,t[o++]=128|n>>>12&63),t[o++]=128|n>>>6&63),t[o++]=128|63&n);return t},n.buf2binstring=function(e){return f(e,e.length)},n.binstring2buf=function(e){for(var t=new l.Buf8(e.length),n=0,r=t.length;n<r;n++)t[n]=e.charCodeAt(n);return t},n.buf2string=function(e,t){for(var n,r,o=t||e.length,i=new Array(2*o),a=0,s=0;s<o;)if((n=e[s++])<128)i[a++]=n;else if(4<(r=d[n]))i[a++]=65533,s+=r-1;else{for(n&=2===r?31:3===r?15:7;1<r&&s<o;)n=n<<6|63&e[s++],r--;1<r?i[a++]=65533:n<65536?i[a++]=n:(n-=65536,i[a++]=55296|n>>10&1023,i[a++]=56320|1023&n)}return f(i,a)},n.utf8border=function(e,t){for(var n=(t=(t=t||e.length)>e.length?e.length:t)-1;0<=n&&128==(192&e[n]);)n--;return!(n<0)&&0!==n&&n+d[e[n]]>t?n:t}},"zlib/inflate.js":function(e,t,n){"use strict";var B=e("../utils/common"),L=e("./adler32"),R=e("./crc32"),I=e("./inffast"),O=e("./inftrees"),z=0,F=-2,H=1,r=852,o=592;function N(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function i(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new B.Buf16(320),this.work=new B.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=H,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new B.Buf32(r),t.distcode=t.distdyn=new B.Buf32(o),t.sane=1,t.back=-1,z):F}function s(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):F}function l(e,t){var n,r;return!e||!e.state||(r=e.state,t<0?(n=0,t=-t):(n=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t))?F:(null!==r.window&&r.wbits!==t&&(r.window=null),r.wrap=n,r.wbits=t,s(e))}function d(e,t){var n;return e?(n=new i,(e.state=n).window=null,(n=l(e,t))!==z&&(e.state=null),n):F}var W,Z,M=!0;function D(e,t,n,r){var o;return null===(e=e.state).window&&(e.wsize=1<<e.wbits,e.wnext=0,e.whave=0,e.window=new B.Buf8(e.wsize)),r>=e.wsize?(B.arraySet(e.window,t,n-e.wsize,e.wsize,0),e.wnext=0,e.whave=e.wsize):(r<(o=e.wsize-e.wnext)&&(o=r),B.arraySet(e.window,t,n-r,o,e.wnext),(r-=o)?(B.arraySet(e.window,t,n-r,r,0),e.wnext=r,e.whave=e.wsize):(e.wnext+=o,e.wnext===e.wsize&&(e.wnext=0),e.whave<e.wsize&&(e.whave+=o))),0}n.inflateReset=s,n.inflateReset2=l,n.inflateResetKeep=a,n.inflateInit=function(e){return d(e,15)},n.inflateInit2=d,n.inflate=function(e,t){var n,r,o,i,a,s,l,d,f,u,c,h,m,b,g,p,w,v,y,k,_,x,S,E,U=0,A=new B.Buf8(4),C=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return F;12===(n=e.state).mode&&(n.mode=13),a=e.next_out,o=e.output,l=e.avail_out,i=e.next_in,r=e.input,s=e.avail_in,d=n.hold,f=n.bits,u=s,c=l,x=z;e:for(;;)switch(n.mode){case H:if(0===n.wrap)n.mode=13;else{for(;f<16;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(2&n.wrap&&35615===d)A[n.check=0]=255&d,A[1]=d>>>8&255,n.check=R(n.check,A,2,0),f=d=0,n.mode=2;else if(n.flags=0,n.head&&(n.head.done=!1),!(1&n.wrap)||(((255&d)<<8)+(d>>8))%31)e.msg="incorrect header check",n.mode=30;else if(8!=(15&d))e.msg="unknown compression method",n.mode=30;else{if(f-=4,_=8+(15&(d>>>=4)),0===n.wbits)n.wbits=_;else if(_>n.wbits){e.msg="invalid window size",n.mode=30;break}n.dmax=1<<_,e.adler=n.check=1,n.mode=512&d?10:12,f=d=0}}break;case 2:for(;f<16;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(n.flags=d,8!=(255&n.flags)){e.msg="unknown compression method",n.mode=30;break}if(57344&n.flags){e.msg="unknown header flags set",n.mode=30;break}n.head&&(n.head.text=d>>8&1),512&n.flags&&(A[0]=255&d,A[1]=d>>>8&255,n.check=R(n.check,A,2,0)),f=d=0,n.mode=3;case 3:for(;f<32;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}n.head&&(n.head.time=d),512&n.flags&&(A[0]=255&d,A[1]=d>>>8&255,A[2]=d>>>16&255,A[3]=d>>>24&255,n.check=R(n.check,A,4,0)),f=d=0,n.mode=4;case 4:for(;f<16;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}n.head&&(n.head.xflags=255&d,n.head.os=d>>8),512&n.flags&&(A[0]=255&d,A[1]=d>>>8&255,n.check=R(n.check,A,2,0)),f=d=0,n.mode=5;case 5:if(1024&n.flags){for(;f<16;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}n.length=d,n.head&&(n.head.extra_len=d),512&n.flags&&(A[0]=255&d,A[1]=d>>>8&255,n.check=R(n.check,A,2,0)),f=d=0}else n.head&&(n.head.extra=null);n.mode=6;case 6:if(1024&n.flags&&((h=s<(h=n.length)?s:h)&&(n.head&&(_=n.head.extra_len-n.length,n.head.extra||(n.head.extra=new Array(n.head.extra_len)),B.arraySet(n.head.extra,r,i,h,_)),512&n.flags&&(n.check=R(n.check,r,h,i)),s-=h,i+=h,n.length-=h),n.length))break e;n.length=0,n.mode=7;case 7:if(2048&n.flags){if(0===s)break e;for(h=0;_=r[i+h++],n.head&&_&&n.length<65536&&(n.head.name+=String.fromCharCode(_)),_&&h<s;);if(512&n.flags&&(n.check=R(n.check,r,h,i)),s-=h,i+=h,_)break e}else n.head&&(n.head.name=null);n.length=0,n.mode=8;case 8:if(4096&n.flags){if(0===s)break e;for(h=0;_=r[i+h++],n.head&&_&&n.length<65536&&(n.head.comment+=String.fromCharCode(_)),_&&h<s;);if(512&n.flags&&(n.check=R(n.check,r,h,i)),s-=h,i+=h,_)break e}else n.head&&(n.head.comment=null);n.mode=9;case 9:if(512&n.flags){for(;f<16;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(d!==(65535&n.check)){e.msg="header crc mismatch",n.mode=30;break}f=d=0}n.head&&(n.head.hcrc=n.flags>>9&1,n.head.done=!0),e.adler=n.check=0,n.mode=12;break;case 10:for(;f<32;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}e.adler=n.check=N(d),f=d=0,n.mode=11;case 11:if(0===n.havedict)return e.next_out=a,e.avail_out=l,e.next_in=i,e.avail_in=s,n.hold=d,n.bits=f,2;e.adler=n.check=1,n.mode=12;case 12:if(5===t||6===t)break e;case 13:if(n.last)d>>>=7&f,f-=7&f,n.mode=27;else{for(;f<3;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}switch(n.last=1&d,--f,3&(d>>>=1)){case 0:n.mode=14;break;case 1:var T,T=P=void 0,P=n;if(M){for(W=new B.Buf32(512),Z=new B.Buf32(32),T=0;T<144;)P.lens[T++]=8;for(;T<256;)P.lens[T++]=9;for(;T<280;)P.lens[T++]=7;for(;T<288;)P.lens[T++]=8;for(O(1,P.lens,0,288,W,0,P.work,{bits:9}),T=0;T<32;)P.lens[T++]=5;O(2,P.lens,0,32,Z,0,P.work,{bits:5}),M=!1}if(P.lencode=W,P.lenbits=9,P.distcode=Z,P.distbits=5,n.mode=20,6!==t)break;d>>>=2,f-=2;break e;case 2:n.mode=17;break;case 3:e.msg="invalid block type",n.mode=30}d>>>=2,f-=2}break;case 14:for(d>>>=7&f,f-=7&f;f<32;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if((65535&d)!=(d>>>16^65535)){e.msg="invalid stored block lengths",n.mode=30;break}if(n.length=65535&d,f=d=0,n.mode=15,6===t)break e;case 15:n.mode=16;case 16:if(h=n.length){if(0===(h=l<(h=s<h?s:h)?l:h))break e;B.arraySet(o,r,i,h,a),s-=h,i+=h,l-=h,a+=h,n.length-=h}else n.mode=12;break;case 17:for(;f<14;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(n.nlen=257+(31&d),d>>>=5,f-=5,n.ndist=1+(31&d),d>>>=5,f-=5,n.ncode=4+(15&d),d>>>=4,f-=4,286<n.nlen||30<n.ndist){e.msg="too many length or distance symbols",n.mode=30;break}n.have=0,n.mode=18;case 18:for(;n.have<n.ncode;){for(;f<3;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}n.lens[C[n.have++]]=7&d,d>>>=3,f-=3}for(;n.have<19;)n.lens[C[n.have++]]=0;if(n.lencode=n.lendyn,n.lenbits=7,S={bits:n.lenbits},x=O(0,n.lens,0,19,n.lencode,0,n.work,S),n.lenbits=S.bits,x){e.msg="invalid code lengths set",n.mode=30;break}n.have=0,n.mode=19;case 19:for(;n.have<n.nlen+n.ndist;){for(;p=(U=n.lencode[d&(1<<n.lenbits)-1])>>>16&255,w=65535&U,!((g=U>>>24)<=f);){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(w<16)d>>>=g,f-=g,n.lens[n.have++]=w;else{if(16===w){for(E=g+2;f<E;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(d>>>=g,f-=g,0===n.have){e.msg="invalid bit length repeat",n.mode=30;break}_=n.lens[n.have-1],h=3+(3&d),d>>>=2,f-=2}else if(17===w){for(E=g+3;f<E;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}_=0,h=3+(7&(d>>>=g)),d>>>=3,f=f-g-3}else{for(E=g+7;f<E;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}_=0,h=11+(127&(d>>>=g)),d>>>=7,f=f-g-7}if(n.have+h>n.nlen+n.ndist){e.msg="invalid bit length repeat",n.mode=30;break}for(;h--;)n.lens[n.have++]=_}}if(30===n.mode)break;if(0===n.lens[256]){e.msg="invalid code -- missing end-of-block",n.mode=30;break}if(n.lenbits=9,S={bits:n.lenbits},x=O(1,n.lens,0,n.nlen,n.lencode,0,n.work,S),n.lenbits=S.bits,x){e.msg="invalid literal/lengths set",n.mode=30;break}if(n.distbits=6,n.distcode=n.distdyn,S={bits:n.distbits},x=O(2,n.lens,n.nlen,n.ndist,n.distcode,0,n.work,S),n.distbits=S.bits,x){e.msg="invalid distances set",n.mode=30;break}if(n.mode=20,6===t)break e;case 20:n.mode=21;case 21:if(6<=s&&258<=l){e.next_out=a,e.avail_out=l,e.next_in=i,e.avail_in=s,n.hold=d,n.bits=f,I(e,c),a=e.next_out,o=e.output,l=e.avail_out,i=e.next_in,r=e.input,s=e.avail_in,d=n.hold,f=n.bits,12===n.mode&&(n.back=-1);break}for(n.back=0;p=(U=n.lencode[d&(1<<n.lenbits)-1])>>>16&255,w=65535&U,!((g=U>>>24)<=f);){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(p&&0==(240&p)){for(v=g,y=p,k=w;p=(U=n.lencode[k+((d&(1<<v+y)-1)>>v)])>>>16&255,w=65535&U,!(v+(g=U>>>24)<=f);){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}d>>>=v,f-=v,n.back+=v}if(d>>>=g,f-=g,n.back+=g,n.length=w,0===p){n.mode=26;break}if(32&p){n.back=-1,n.mode=12;break}if(64&p){e.msg="invalid literal/length code",n.mode=30;break}n.extra=15&p,n.mode=22;case 22:if(n.extra){for(E=n.extra;f<E;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}n.length+=d&(1<<n.extra)-1,d>>>=n.extra,f-=n.extra,n.back+=n.extra}n.was=n.length,n.mode=23;case 23:for(;p=(U=n.distcode[d&(1<<n.distbits)-1])>>>16&255,w=65535&U,!((g=U>>>24)<=f);){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(0==(240&p)){for(v=g,y=p,k=w;p=(U=n.distcode[k+((d&(1<<v+y)-1)>>v)])>>>16&255,w=65535&U,!(v+(g=U>>>24)<=f);){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}d>>>=v,f-=v,n.back+=v}if(d>>>=g,f-=g,n.back+=g,64&p){e.msg="invalid distance code",n.mode=30;break}n.offset=w,n.extra=15&p,n.mode=24;case 24:if(n.extra){for(E=n.extra;f<E;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}n.offset+=d&(1<<n.extra)-1,d>>>=n.extra,f-=n.extra,n.back+=n.extra}if(n.offset>n.dmax){e.msg="invalid distance too far back",n.mode=30;break}n.mode=25;case 25:if(0===l)break e;if(n.offset>(h=c-l)){if((h=n.offset-h)>n.whave&&n.sane){e.msg="invalid distance too far back",n.mode=30;break}m=h>n.wnext?(h-=n.wnext,n.wsize-h):n.wnext-h,h>n.length&&(h=n.length),b=n.window}else b=o,m=a-n.offset,h=n.length;for(l-=h=l<h?l:h,n.length-=h;o[a++]=b[m++],--h;);0===n.length&&(n.mode=21);break;case 26:if(0===l)break e;o[a++]=n.length,l--,n.mode=21;break;case 27:if(n.wrap){for(;f<32;){if(0===s)break e;s--,d|=r[i++]<<f,f+=8}if(c-=l,e.total_out+=c,n.total+=c,c&&(e.adler=n.check=(n.flags?R:L)(n.check,o,c,a-c)),c=l,(n.flags?d:N(d))!==n.check){e.msg="incorrect data check",n.mode=30;break}f=d=0}n.mode=28;case 28:if(n.wrap&&n.flags){for(;f<32;){if(0===s)break e;s--,d+=r[i++]<<f,f+=8}if(d!==(4294967295&n.total)){e.msg="incorrect length check",n.mode=30;break}f=d=0}n.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;default:return F}return e.next_out=a,e.avail_out=l,e.next_in=i,e.avail_in=s,n.hold=d,n.bits=f,(n.wsize||c!==e.avail_out&&n.mode<30&&(n.mode<27||4!==t))&&D(e,e.output,e.next_out,c-e.avail_out)?(n.mode=31,-4):(u-=e.avail_in,c-=e.avail_out,e.total_in+=u,e.total_out+=c,n.total+=c,n.wrap&&c&&(e.adler=n.check=(n.flags?R:L)(n.check,o,c,e.next_out-c)),e.data_type=n.bits+(n.last?64:0)+(12===n.mode?128:0)+(20===n.mode||15===n.mode?256:0),(0==u&&0===c||4===t)&&x===z?-5:x)},n.inflateEnd=function(e){var t;return e&&e.state?((t=e.state).window&&(t.window=null),e.state=null,z):F},n.inflateGetHeader=function(e,t){return e&&e.state&&0!=(2&(e=e.state).wrap)?((e.head=t).done=!1,z):F},n.inflateSetDictionary=function(e,t){var n,r=t.length;return!e||!e.state||0!==(n=e.state).wrap&&11!==n.mode?F:11===n.mode&&L(1,t,r,0)!==n.check?-3:D(e,t,r,r)?(n.mode=31,-4):(n.havedict=1,z)},n.inflateInfo="pako inflate (from Nodeca project)"},"zlib/constants.js":function(e,t,n){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},"zlib/messages.js":function(e,t,n){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},"zlib/zstream.js":function(e,t,n){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},"zlib/gzheader.js":function(e,t,n){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},"zlib/adler32.js":function(e,t,n){"use strict";t.exports=function(e,t,n,r){for(var o=65535&e|0,i=e>>>16&65535|0,a=0;0!==n;){for(n-=a=2e3<n?2e3:n;i=i+(o=o+t[r++]|0)|0,--a;);o%=65521,i%=65521}return o|i<<16|0}},"zlib/crc32.js":function(e,t,n){"use strict";var s=function(){for(var e=[],t=0;t<256;t++){for(var n=t,r=0;r<8;r++)n=1&n?3988292384^n>>>1:n>>>1;e[t]=n}return e}();t.exports=function(e,t,n,r){var o=s,i=r+n;e^=-1;for(var a=r;a<i;a++)e=e>>>8^o[255&(e^t[a])];return-1^e}},"zlib/inffast.js":function(e,t,n){"use strict";t.exports=function(e,t){var n,r,o,i,a,s,l=e.state,d=e.next_in,f=e.input,u=d+(e.avail_in-5),c=e.next_out,h=e.output,m=c-(t-e.avail_out),b=c+(e.avail_out-257),g=l.dmax,p=l.wsize,w=l.whave,v=l.wnext,y=l.window,k=l.hold,_=l.bits,x=l.lencode,S=l.distcode,E=(1<<l.lenbits)-1,U=(1<<l.distbits)-1;e:do{for(_<15&&(k+=f[d++]<<_,_+=8,k+=f[d++]<<_,_+=8),n=x[k&E];;){if(k>>>=r=n>>>24,_-=r,0==(r=n>>>16&255))h[c++]=65535&n;else{if(!(16&r)){if(0==(64&r)){n=x[(65535&n)+(k&(1<<r)-1)];continue}if(32&r){l.mode=12;break e}e.msg="invalid literal/length code",l.mode=30;break e}for(o=65535&n,(r&=15)&&(_<r&&(k+=f[d++]<<_,_+=8),o+=k&(1<<r)-1,k>>>=r,_-=r),_<15&&(k+=f[d++]<<_,_+=8,k+=f[d++]<<_,_+=8),n=S[k&U];;){if(k>>>=r=n>>>24,_-=r,!(16&(r=n>>>16&255))){if(0==(64&r)){n=S[(65535&n)+(k&(1<<r)-1)];continue}e.msg="invalid distance code",l.mode=30;break e}if(i=65535&n,_<(r&=15)&&(k+=f[d++]<<_,(_+=8)<r&&(k+=f[d++]<<_,_+=8)),g<(i+=k&(1<<r)-1)){e.msg="invalid distance too far back",l.mode=30;break e}if(k>>>=r,_-=r,(r=c-m)<i){if(w<(r=i-r)&&l.sane){e.msg="invalid distance too far back",l.mode=30;break e}if(s=y,(a=0)===v){if(a+=p-r,r<o){for(o-=r;h[c++]=y[a++],--r;);a=c-i,s=h}}else if(v<r){if(a+=p+v-r,(r-=v)<o){for(o-=r;h[c++]=y[a++],--r;);if(a=0,v<o){for(o-=r=v;h[c++]=y[a++],--r;);a=c-i,s=h}}}else if(a+=v-r,r<o){for(o-=r;h[c++]=y[a++],--r;);a=c-i,s=h}for(;2<o;)h[c++]=s[a++],h[c++]=s[a++],h[c++]=s[a++],o-=3;o&&(h[c++]=s[a++],1<o&&(h[c++]=s[a++]))}else{for(a=c-i;h[c++]=h[a++],h[c++]=h[a++],h[c++]=h[a++],2<(o-=3););o&&(h[c++]=h[a++],1<o&&(h[c++]=h[a++]))}break}}break}}while(d<u&&c<b);k&=(1<<(_-=(o=_>>3)<<3))-1,e.next_in=d-=o,e.next_out=c,e.avail_in=d<u?u-d+5:5-(d-u),e.avail_out=c<b?b-c+257:257-(c-b),l.hold=k,l.bits=_}},"zlib/inftrees.js":function(e,t,n){"use strict";var I=e("../utils/common"),O=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],z=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],F=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],H=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,n,r,o,i,a,s){for(var l,d,f,u,c,h,m,b,g,p=s.bits,w=0,v=0,y=0,k=0,_=0,x=0,S=0,E=0,U=0,A=0,C=null,T=0,P=new I.Buf16(16),B=new I.Buf16(16),L=null,R=0,w=0;w<=15;w++)P[w]=0;for(v=0;v<r;v++)P[t[n+v]]++;for(_=p,k=15;1<=k&&0===P[k];k--);if(k<_&&(_=k),0===k)o[i++]=20971520,o[i++]=20971520,s.bits=1;else{for(y=1;y<k&&0===P[y];y++);for(_<y&&(_=y),w=E=1;w<=15;w++)if((E=(E<<=1)-P[w])<0)return-1;if(0<E&&(0===e||1!==k))return-1;for(B[1]=0,w=1;w<15;w++)B[w+1]=B[w]+P[w];for(v=0;v<r;v++)0!==t[n+v]&&(a[B[t[n+v]]++]=v);if(h=0===e?(C=L=a,19):1===e?(C=O,T-=257,L=z,R-=257,256):(C=F,L=H,-1),w=y,c=i,S=v=A=0,f=-1,u=(U=1<<(x=_))-1,1===e&&852<U||2===e&&592<U)return 1;for(;;){for(g=a[v]<h?(b=0,a[v]):a[v]>h?(b=L[R+a[v]],C[T+a[v]]):(b=96,0),l=1<<(m=w-S),y=d=1<<x;o[c+(A>>S)+(d-=l)]=m<<24|b<<16|g|0,0!==d;);for(l=1<<w-1;A&l;)l>>=1;if(A=0!==l?(A&l-1)+l:0,v++,0==--P[w]){if(w===k)break;w=t[n+a[v]]}if(_<w&&(A&u)!==f){for(c+=y,E=1<<(x=w-(S=0===S?_:S));x+S<k&&!((E-=P[x+S])<=0);)x++,E<<=1;if(U+=1<<x,1===e&&852<U||2===e&&592<U)return 1;o[f=A&u]=_<<24|x<<16|c-i|0}}0!==A&&(o[c+A]=w-S<<24|64<<16|0),s.bits=_}return 0}}};for(t in n)n[t].folder=t.substring(0,t.lastIndexOf("/")+1);function r(e,t){var n=t.match(/^\//)?null:e?t.match(/^\.\.?\//)?o(e.folder+t):i(e,t):o(t);if(n)return n.exports||(n.parent=e,n(r.bind(null,n),n,n.exports={})),n.exports;throw"module not found: "+t}var o=function(e){var t=[];return(e=e.split("/").every(function(e){return".."==e?t.pop():"."==e||""==e||t.push(e)})?t.join("/"):null)?n[e]||n[e+".js"]||n[e+"/index.js"]:null},i=function(e,t){return e?o(e.folder+"node_modules/"+t)||i(e.parent,t):null};return r(null,e)},decompress:function(e){this.exports||(this.exports=this.require("inflate.js"));try{return this.exports.inflate(e)}catch(e){}},hasUnityMarker:function(e){var t=10,n="UnityWeb Compressed Content (gzip)";if(t>e.length||31!=e[0]||139!=e[1])return!1;var r=e[3];if(4&r){if(t+2>e.length)return!1;if((t+=2+e[t]+(e[t+1]<<8))>e.length)return!1}if(8&r){for(;t<e.length&&e[t];)t++;if(t+1>e.length)return!1;t++}return 16&r&&String.fromCharCode.apply(null,e.subarray(t,t+n.length+1))==n+"\0"}},br:{hasUnityMarker:function(e){var t="UnityWeb Compressed Content (brotli)";if(!e.length)return!1;var n=1&e[0]?14&e[0]?4:7:1,r=e[0]&(1<<n)-1,o=1+(Math.log(t.length-1)/Math.log(2)>>3);if(commentOffset=1+n+2+1+2+(o<<3)+7>>3,17==r||commentOffset>e.length)return!1;for(var i=r+(6+(o<<4)+(t.length-1<<6)<<n),a=0;a<commentOffset;a++,i>>>=8)if(e[a]!=(255&i))return!1;return String.fromCharCode.apply(null,e.subarray(commentOffset,commentOffset+t.length))==t}}};function v(t){p(t);var e=b.fetchWithProgress,n=b[t],r=/file:\/\//.exec(n)?"same-origin":void 0;return e(b[t],{method:"GET",companyName:b.companyName,productName:b.productName,productVersion:b.productVersion,control:"no-store",mode:r,onProgress:function(e){p(t,e)}}).then(function(e){return a=e.parsedBody,s=b[t],new Promise(function(e,t){try{for(var n in w){var r,o,i;if(w[n].hasUnityMarker(a))return s&&console.log('You can reduce startup time if you configure your web server to add "Content-Encoding: '+n+'" response header when serving "'+s+'" file.'),(r=w[n]).worker||(o=URL.createObjectURL(new Blob(["this.require = ",r.require.toString(),"; this.decompress = ",r.decompress.toString(),"; this.onmessage = ",function(e){e={id:e.data.id,decompressed:this.decompress(e.data.compressed)};postMessage(e,e.decompressed?[e.decompressed.buffer]:[])}.toString(),"; postMessage({ ready: true });"],{type:"application/javascript"})),r.worker=new Worker(o),r.worker.onmessage=function(e){e.data.ready?URL.revokeObjectURL(o):(this.callbacks[e.data.id](e.data.decompressed),delete this.callbacks[e.data.id])},r.worker.callbacks={},r.worker.nextCallbackId=0),i=r.worker.nextCallbackId++,r.worker.callbacks[i]=e,void r.worker.postMessage({id:i,compressed:a},[a.buffer])}e(a)}catch(e){t(e)}});var a,s}).catch(function(e){var t="Failed to download file "+n;"file:"==location.protocol?d(t+". Loading web pages via a file:// URL without a web server is not supported by this browser. Please use a local development web server to host Unity content, or use the Unity Build and Run option.","error"):console.error(t)})}function y(){var t=performance.now(),m=(Promise.all([v("frameworkUrl").then(function(e){var s=URL.createObjectURL(new Blob([e],{type:"application/javascript"}));return new Promise(function(i,e){var a=document.createElement("script");a.src=s,a.onload=function(){if("undefined"==typeof unityFramework||!unityFramework){var e,t=[["br","br"],["gz","gzip"]];for(e in t){var n,r=t[e];if(b.frameworkUrl.endsWith("."+r[0]))return n="Unable to parse "+b.frameworkUrl+"!","file:"==location.protocol?void d(n+" Loading pre-compressed (brotli or gzip) content via a file:// URL without a web server is not supported by this browser. Please use a local development web server to host compressed Unity content, or use the Unity Build and Run option.","error"):(n+=' This can happen if build compression was enabled but web server hosting the content was misconfigured to not serve the file with HTTP Response Header "Content-Encoding: '+r[1]+'" present. Check browser Console and Devtools Network tab to debug.',"br"==r[0]&&"http:"==location.protocol&&(r=-1!=["localhost","127.0.0.1"].indexOf(location.hostname)?"":"Migrate your server to use HTTPS.",n=/Firefox/.test(navigator.userAgent)?"Unable to parse "+b.frameworkUrl+'!<br>If using custom web server, verify that web server is sending .br files with HTTP Response Header "Content-Encoding: br". Brotli compression may not be supported in Firefox over HTTP connections. '+r+' See <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1670675">https://bugzilla.mozilla.org/show_bug.cgi?id=1670675</a> for more information.':"Unable to parse "+b.frameworkUrl+'!<br>If using custom web server, verify that web server is sending .br files with HTTP Response Header "Content-Encoding: br". Brotli compression may not be supported over HTTP connections. Migrate your server to use HTTPS.'),void d(n,"error"))}d("Unable to parse "+b.frameworkUrl+"! The file is corrupt, or compression was misconfigured? (check Content-Encoding HTTP Response Header on web server)","error")}var o=unityFramework;unityFramework=null,a.onload=null,URL.revokeObjectURL(s),i(o)},a.onerror=function(e){d("Unable to load file "+b.frameworkUrl+"! Check that the file exists on the remote server. (also check browser Console and Devtools Network tab to debug)","error")},document.body.appendChild(a),b.deinitializers.push(function(){document.body.removeChild(a)})})}),v("codeUrl")]).then(function(e){b.wasmBinary=e[1],e[0](b),b.codeDownloadTimeEnd=performance.now()-t}),performance.now()),e=v("dataUrl");b.preRun.push(function(){b.addRunDependency("dataUrl"),e.then(function(t){var e=new TextDecoder("utf-8"),n=0;function r(){var e=(t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24)>>>0;return n+=4,e}function o(e){if(w.gzip.hasUnityMarker(t))throw e+'. Failed to parse binary data file, because it is still gzip-compressed and should have been uncompressed by the browser. Web server has likely provided gzip-compressed data without specifying the HTTP Response Header "Content-Encoding: gzip" with it to instruct the browser to decompress it. Please verify your web server hosting configuration.';if(w.br.hasUnityMarker(t))throw e+'. Failed to parse binary data file, because it is still brotli-compressed and should have been uncompressed by the browser. Web server has likely provided brotli-compressed data without specifying the HTTP Response Header "Content-Encoding: br" with it to instruct the browser to decompress it. Please verify your web server hosting configuration.';throw e}var i="UnityWebData1.0\0",a=e.decode(t.subarray(0,i.length)),s=(a!=i&&o('Unknown data format (id="'+a+'")'),n+=i.length,r());for(n+s>t.length&&o("Invalid binary data file header! (pos="+n+", headerSize="+s+", file length="+t.length+")");n<s;){var l=r(),d=r(),f=(l+d>t.length&&o("Invalid binary data file size! (offset="+l+", size="+d+", file length="+t.length+")"),r()),u=(n+f>t.length&&o("Invalid binary data file path name! (pos="+n+", length="+f+", file length="+t.length+")"),e.decode(t.subarray(n,n+f)));n+=f;for(var c=0,h=u.indexOf("/",c)+1;0<h;c=h,h=u.indexOf("/",c)+1)b.FS_createPath(u.substring(0,c),u.substring(c,h-1),!0,!0);b.FS_createDataFile(u,null,t.subarray(l,l+d),!0,!0,!0)}b.removeRunDependency("dataUrl"),b.dataUrlLoadEndTime=performance.now()-m})})}return new Promise(function(e,t){var n;b.SystemInfo.hasWebGL?1==b.SystemInfo.hasWebGL?(n='Your browser does not support graphics API "WebGL 2" which is required for this content.',"Safari"==b.SystemInfo.browser&&parseInt(b.SystemInfo.browserVersion)<15&&(b.SystemInfo.mobile||1<navigator.maxTouchPoints?n+="\nUpgrade to iOS 15 or later.":n+="\nUpgrade to Safari 15 or later."),t(n)):b.SystemInfo.hasWasm?(b.startupErrorHandler=t,l(0),b.postRun.push(function(){l(1),b.WebPlayer.WaitForInitialization().then(function(){delete b.startupErrorHandler,e(c),b.pageStartupTime=performance.now()})}),new Promise(function(t,e){navigator.gpu?navigator.gpu.requestAdapter().then(function(e){b.SystemInfo.hasWebGPU=!!e,t(b.SystemInfo.hasWebGPU)}):t(!1)}).then(function(){y()})):t("Your browser does not support WebAssembly."):t("Your browser does not support WebGL.")})}
>>>>>>> 9cc211a ( new gzip build)
>>>>>>> d502d3d ( new build gzip)
