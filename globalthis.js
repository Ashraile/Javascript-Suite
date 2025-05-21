  /// GLOBALTHIS: Finds `globalThis` without polluting the global namespace | Adapted from https://mathiasbynens.be/notes/globalthis
  var GLOBALTHIS = (function(outerThis) {

      if (typeof globalThis === 'object' && globalThis && globalThis.globalThis === globalThis) { 
          return globalThis;
      } 

      try { 
          Object.defineProperty(Object.prototype, '_magic_', {
              get: function() { 
                  return this;
              }, 
              configurable: true
          });

          _magic_.globalThis = _magic_; // `globalThis` is now a global var except in IE<10.

          var global = (typeof globalThis === 'undefined') ? outerThis : globalThis; // Cache our `globalThis` locally.
          
          delete _magic_.globalThis; // Clean up namespaces.
          delete Object.prototype._magic_; 

          return global;

      } catch (e) { 
          return outerThis; // In IE8, Object.defineProperty only works on DOM objects. If we hit this code path, assume `window` exists.
      } 
      
  })((function() {
      if (typeof window === 'object' && window && (window.window === window) && typeof window.document === 'object') { return window } 
      return this || (new Function('return this')());
  }()));
