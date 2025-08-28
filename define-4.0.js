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
            writable: true, configurable: true, 
            value: (function($) {
                return function defineProperty(O, key, options) {
                    if (typeof O === 'function' && key === 'prototype' && 'value' in options && !options[w]) {
                        var current = Object.getOwnPropertyDescriptor(O, key);
                        if (current && current[w]) {
                            try { O[key] = options.value; } catch (e) {}
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

    /// Define a hasOwnProperty wrapper, while conditionally polyfilling hasOwnProperty
    var hasOwnProp = (function(HasOwn) {
        return function(value, key) { 
            try { return HasOwn.call(value, key); } catch (e) {return false}
        };
    })(Object.prototype.hasOwnProperty || (function() {
        function hasOwnProperty(prop) {
            if (this === null || this === undefined) {
                throw new TypeError('Object.prototype.hasOwnProperty called on' + this);
            }
            var O = Object(this), key = String(prop);
            var _proto_ = (function() { try{return O.__proto__ || O.constructor.prototype} catch(e){} })() || {};
            return key in O && (!(key in _proto_) || O[key] !== _proto_[key]);
        }
        try { 
            Object.defineProperty(Object.prototype, 'hasOwnProperty', { 
                configurable: true, writable: true, value: hasOwnProperty 
            });
        } catch (e) { 
            Object.prototype.hasOwnProperty = hasOwnProperty;
        }
        return Object.prototype.hasOwnProperty;
    })());


    function __define(obj, list, options, overwrite) {
        if (Object(list) !== list) {
            throw new Error('List (argument 2) must be object-like!');
        }
        var config = {}, values = [];

        if (options && typeof options === 'object') { 
            if (e in options) { config[e] = !!options[e]; }
            if (c in options) { config[c] = !!options[c]; }
            if (w in options) { config[w] = !!options[w]; }
        }

        for (var key in list) {
          if (hasOwnProp(list, key)) {
            var descriptor = Object.getOwnPropertyDescriptor(list, key); // console.log('Descriptor: ', descriptor);
            if (!descriptor) {
                console.warn('Failed to get property descriptor for ' + key); 
                continue;
            }

            var isAccessor = 'get' in descriptor || 'set' in descriptor; // Determine if the property is an accessor
            if (!isAccessor) {
                var value = descriptor.value;
                if (typeof value === 'object' && value) {
                    if ('get' in value) { descriptor.get = value.get;   isAccessor = true; } // isAccessorLike
                    if ('set' in value) { descriptor.set = value.set;   isAccessor = true; }
                }
            }

            if (e in config) descriptor.enumerable = config[e];   // Apply enumerable and configurable overrides
            if (c in config) descriptor.configurable = config[c];
            if (isAccessor) { // Handle writable for data properties, validate for accessors
                if (w in config) {
                    throw new TypeError('Property descriptors must not specify writable when a getter or setter is present');
                }
                // Remove value and writable for accessor properties
                delete descriptor.value;
                delete descriptor.writable;
            } else if (w in config) {
                descriptor.writable = config[w];
            }
            if (define && define.development) { key = '_$' + key; }

            if (typeof overwrite === 'function') {
                overwrite = !(function() { try {return !(overwrite.call(obj[key], key, obj[key]))} catch(e){} })();
            }  
            try {
                if (overwrite || !(key in obj)) {
                    try { Object.defineProperty(obj, key, descriptor); } catch (e) {
                        if (isAccessor) {
                            if (!SUPPORTS_DESCRIPTORS) {
                                console.warn('Accessor properties not supported in this environment for ' + key + '. Skipping.');
                                continue;
                            }
                            throw e;
                        } else {
                            obj[key] = descriptor.value;
                        }
                    }
                }
                values.push(isAccessor ? undefined : obj[key]); // Push undefined for getter/setter to avoid invoking getter
            } catch (e) { 
                if (define && define.strict) {
                    throw e;
                }
            }
          }
        }
        return values.length > 1 ? values : values[0];
    }

    return function _define(obj, property, value, options, overwrite) {
        if (Object(property) === property) {
            return __define(obj, property, value, options);
        } else {
            var O = {};
            O[String(property)] = value;
            return __define(obj, O, options, overwrite);
        }
    }

})('enumerable', 'configurable', 'writable');

define( define, { // define.defaultConfig = { enumerable: false, configurable: true, writable: true };
    version: 4.0,
    developent: false,
    strict: false,

    ne: function(obj, prop, value, overwrite) {
        var NONENUM = { writable: true, configurable: true };
        return (prop === Object(prop)) ? define(obj, prop, NONENUM, value) : define(obj, prop, value, NONENUM, overwrite);
    },

    'const': function(obj, prop, value, overwrite) {
        return (prop === Object(prop)) ? define(obj, prop, null, value) : define(obj, prop, value, null, overwrite);
    },

    wrap: function wrap(obj, prop, wrapfn, options, overwrite) {
        var value = (function(prev) { return wrapfn(prev) })(obj[prop]);
        return define(obj, prop, value, options, overwrite);
    },

    getter: function(obj, prop, value, options, overwrite) {
        if (prop === Object(prop)) {
            var getters = {}, has = Object.prototype.hasOwnProperty;
            for (var key in prop) {         
                if (has.call(prop, key)) {
                    var fn = prop[key];
                    if (typeof fn !== 'function') { throw new TypeError('define.getter expects property values to be functions');}
                    getters[key] = { get: fn }; // populate new getter object
                }
            }
            return define(obj, getters, value, options); // value => options, options => overwrite
        } else {
            return define(obj, prop, { get: value }, options, overwrite);
        }
    },

    setter: function(obj, prop, value, options, overwrite) {
        if (prop === Object(prop)) {
            var setters = {}, has = Object.prototype.hasOwnProperty;
            for (var key in prop) {
                if (has.call(prop, key)) {
                    var fn = prop[key];
                    if (typeof fn !== 'function') { throw new TypeError("Property descriptor's set field is neither undefined nor a function"); }
                    setters[key] = { set: fn };
                }
            }
            return define(obj, setters, value, options); // value become options, options becomes overwrite
        } else {
            return define(obj, prop, { set: value }, options, overwrite);
        }
    }
}, {enumerable: true, configurable: true, writable: true});

