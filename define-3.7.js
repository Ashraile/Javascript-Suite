    /*  
    *  Object.defineProperty convenience wrapper function.
    *  Dependencies: `Function.prototype.call`, `Object.prototype.hasOwnProperty`
    *  Skips existing properties, unless you specify a force override conditional.
    *  Supports a version of getters / setters
    *  Won't throw if browser doesn't support Object.defineProperty 
    *  Defaults to: {enumerable: false, writable: false, configurable: false, value: undefined}
    *  works with `this` scope
    *  optional strict error mode
    *  returns the completed property or `undefined`.
    *  If `valueHasAccessors` is `true`, `value` is an object with `get` / `set` accessors, which we will assume to be intentional.
    *  Example: define(window, 'getter', { get() { return 2; }, set(a) { window.current = a; }, }, { enumerable: true, configurable: true }); 
    *  NOTE: You cannot both specify accessors and a `value` or `writable` attribute (even if the attribute is set to `false` or `undefined`)
    *   And the native functions will still throw even when the `forbidden` attributes are merely inherited (such as from Object.prototype) and never defined directly. 
    *   So `in` is the correct specificity, to model this function to work like native implementations.
    */
    var define = (function(e, c, w) {

        /// Detect undefined (IE7-) or incomplete (IE8) defineProperty implementation
        var SUPPORTS_DESCRIPTORS = !!(function() {
            try { return (Object.defineProperty({}, 1, { get: function() {return 7} })[1]) === 7; } catch (e) {}
        })();

        /// V8 ~ Chrome ~15 - 36 | https://bugs.chromium.org/p/v8/issues/detail?id=3334
        var V8_PROTOTYPE_DEFINE_BUG = SUPPORTS_DESCRIPTORS && 
            Object.defineProperty(function(){}, 'prototype', { value: 42, writable: false }).prototype !== 42;
            

        if (V8_PROTOTYPE_DEFINE_BUG) {
            Object.defineProperty(Object, 'defineProperty', {
                writable: true, 
                configurable: true, 
                value: (function($) {
                    return function defineProperty(O, key, options) {
                        // Typechecking is not necessary as the original function will handle any bad parameters.
                        // Skip ('writable' in options) check: false negative when enumerable properties are set to nonenumerable by leaving 'writable' out of options object
                        if (typeof O === 'function' && key === 'prototype' && 'value' in options && !options[w]) {
                            var current = Object.getOwnPropertyDescriptor(O, key); // can return undefined if no key exists.
                            if (current && current[w]) { // object is currently writable
                                try {
                                    O[key] = options.value;
                                } catch (e) {}
                                options = {
                                    enumerable: (e in options) ? options[e] : current[e],
                                    configurable: (c in options) ? options[c] : current[c],
                                    writable: false
                                };
                            }
                        }
                        return $(O, key, options);
                    }
                })(Object.defineProperty)
            });
        }

        function hasOwnProp(object, key) {
            return !!(function() { 
                try { return Object.prototype.hasOwnProperty.call(object, key) } catch (e) {} 
            })();
        }   

        function _define(obj, key, value, options, overwrite) {

            var config = (function(O) {  // Only defines whether enumerable, writable, or configurable. Defaults to {}.
                if (options && typeof options === 'object') {
                    if (e in options) { O[e] = !!options[e]; }
                    if (c in options) { O[c] = !!options[c]; }
                    if (w in options) { O[w] = !!options[w]; }
                } return O;
            })({});

            var valueHasAccessors = (value && typeof value === 'object' && ('get' in value || 'set' in value));

            if (!valueHasAccessors) { 
                config.value = value;
            } else {
                if (('value' in value) || (w in value) || (w in config)) {
                    throw new TypeError("Invalid property descriptor. Cannot both specify accessors and a value or writable attribute");
                }
                value[e] = !!config[e]; // Coerce to boolean as the property may not be initialized
                value[c] = !!config[c]; // ConfigObject settings overwrite all others
            }

            if (define && define.development) { // development mode: behave as if we're writing from scratch: add _$ to all defined properties
                key = '_$' + key;
            }

            // if overwrite returns true or there was an error when calling it, overwrite is true. Otherwise, overwrite is false.
            if (typeof overwrite === 'function') { // bugcheck
                overwrite = !(function() { try {return !(overwrite.call(obj[key], key, obj[key]))} catch(e){} })(); // caught error: !undefined -> true
            }
            
            try {
                if (overwrite || !(key in obj)) { // only if key isn't defined, or we want to overwrite
                    try {
                        Object.defineProperty(obj, key, (valueHasAccessors ? value : config));
                    } catch (e) {
                        if (define && define.strict) { console.warn('Object.defineProperty could not be used. Using dot notation syntax'); }
                        obj[key] = value;
                    }
                }
                return obj[key];
            } catch (e) { 
                return (function(s) { if (s) {throw e} })(define && define.strict);
            }
        }

        return function (obj, property, value, options, overwrite) {

            var _options, _overwrite, len = arguments.length;

            if (typeof property === 'object' && property) {

                switch (len) {
                    case 4: { 
                        _options = value;
                        _overwrite = options; 
                        break; 
                    }
                    case 3: { if (typeof value === 'function') { _options = null; _overwrite = value; } break; }
                    case 2: { _options = null; break; }
                    default: { throw new TypeError('define with object notation must have 4 or fewer arguments.'); }
                }

                for (var key in property) { // IE8 enumeration bug if certain properties exist in the object already.
                    if (hasOwnProp(property, key)) { 
                        _define(obj, key, property[key], _options, _overwrite); // obj, key, value, options, overwrite
                    }
                }
            } else {

                var exotic = (options === !!options || typeof options === 'function');
  
                if (len < 2 || len > 5) {
                    throw new TypeError('define with function notation expects between 2 and 5 arguments!');
                }
                if (len === 2) { 
                    options = { enumerable: true, configurable: true, writable: true }; // value: undefined, overwrite: undefined
                }

                if (len === 4 && exotic) { // defining with default configuration with overwrite as boolean or function
                    overwrite = options;
                    options = null;
                }
                if (len === 5 && exotic && !(typeof overwrite === 'function' || overwrite === !!overwrite)) { // if overwrite is not a function or boolean, and options is
                    overwrite = options;
                    options = null;
                }

                return _define(obj, property, value, options, overwrite);
            }
        };

    })('enumerable', 'configurable', 'writable');

    define.version = 3.7;
    define.development = false;
    define.strict = false;
    // define.defaultConfig = { enumerable: false, configurable: true, writable: true };

    define.ne = function(obj, prop, value, overwrite) {
        var NONENUM = { writable: true, configurable: true };
        return (prop === Object(prop)) ? define(obj, prop, NONENUM, value) : define(obj, prop, value, NONENUM, overwrite);
    };

    define.const = function(obj, prop, value, overwrite) {
        return (prop === Object(prop)) ? define(obj, prop, null, value) : define(obj, prop, value, null, overwrite);
    }
    
    define.wrap = function wrap(obj, prop, wrapfn, options, overwrite) {
        var value = (function(prev) { return wrapfn(prev) })(obj[prop]);
        return define(obj, prop, value, options, overwrite);
    };
