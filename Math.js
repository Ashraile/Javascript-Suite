// Math.js
// Dependencies: Object.prototype.hasOwnProperty, Function.prototype.call, Number.MAX_VALUE, Number.EPSILON

/*
 * Checks all arguments for strict equality, including NaN and -0;
 */
function is() {
    var i = 0, len = arguments.length; 

    function _is(x, y) {
        if (x === y) { return x !== 0 || 1/x === 1/y } // 0 === -0, but they are not identical
        // NaN !== NaN, but they are identical. 
        // NaNs are the only non-reflexive value, i.e., if x !== x, then x is a NaN.
        return x !== x && y !== y; // this returns false unless both values are NaN. 
    }

    while (i+1 < len) { // if A === B and B === C: A === C and so on
        if (!_is(arguments[i], arguments[++i])) { return false } 
    }
    return true;
}

function isNegativeZero(x) {
    return is(-0, x);
}

var NON_ENUM = { writable: true, configurable: true }; // enumerable: false;

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

    /// Detect IE8's incomplete defineProperty implementation
    var SUPPORTS_DESCRIPTORS = !!(function() {
        try { return (Object.defineProperty({}, 1, { get: function() {return 7} })[1]) === 7; } catch (e) {}
    })();

    /// V8 ~ Chrome ~15- to 36 | https://bugs.chromium.org/p/v8/issues/detail?id=3334
    var V8_PROTOTYPE_DEFINE_BUG = SUPPORTS_DESCRIPTORS && 
        Object.defineProperty(function(){}, 'prototype', { value: 42, writable: false }).prototype !== 42;
        

    if (V8_PROTOTYPE_DEFINE_BUG) {
        Object.defineProperty(Object, 'defineProperty', {
            writable: true, 
            configurable: true, // enumerable: false
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

        var len = arguments.length;
        
        var valueHasAccessors = (value === Object(value) && ('get' in value || 'set' in value));

        var config = (function(o) { // Only defines whether enumerable, writable, or configurable. Defaults to {}.
            if (options === Object(options)) {
                if (e in options) { o[e] = !!options[e]; }
                if (c in options) { o[c] = !!options[c]; }
                if (w in options) { o[w] = !!options[w]; }
            } return o;
        })( {} );

        if (len < 3 || len > 5) { 
            throw new TypeError('_define expects between 3 and 5 arguments');
        }

        if (len === 4 && options === !!options) { 
            overwrite = options;
        }

        if (!valueHasAccessors) { 
            config.value = value;
        } 
        else {
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
        if (typeof overwrite == 'function') { // bugcheck
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


    return function(obj, property, value, options, overwrite) {
        var _options, _overwrite;
        if (property === Object(property)) {
            switch (arguments.length) {
                case 4: { _options = value; _overwrite = options; break; }
                case 3: { if (typeof value === 'function') { _options = null; _overwrite = value; } break; }
                case 2: { _options = null; break; }
                default: { throw new TypeError('define with object notation must have 4 or fewer arguments.'); }
            }
            for (var key in property) {
                if (hasOwnProp(property, key)) { // IE8 enumeration bug if properties exist in the object already.
                    _define(obj, key, property[key], _options, _overwrite); // obj, key, value, options, overwrite
                }
            }
        } else {
            if (arguments.length === 2) { options = {enumerable: true, configurable: true, writable: true} }
            return _define(obj, property, value, options, overwrite);
        }
    };

})('enumerable', 'configurable', 'writable');

define.version = 3.6;
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


/* 
    For browsers that do not scope named function expressions correctly (IE < 9) etc, any named function expression will expose that function 
    to the wider scope. Hence we scope all functions within a closure to prevent naming overlap, and also sometimes individual closures.
    This is why you will see IIFE's returning functions, or the functions defined separately instead of one-liners naming functions with NFEs.
    Named function expressions are useful to tracing issues within the call stack, and for scoped recursion.
    If you are forking this code, it is good enough to either create an individual functions and reference them, or disallow any environment
    that does not fully support NFEs.

    NOTE 1: Coercion to typeof `number` throws on Symbol, Bigint in the native functions, so we use the unary operator over the Number() constructor.

    NOTE 2: Methods that are listed as defined in all browsers since like Netscape 3\4. Its really really highly unlikely that you would need to emulate them,
    but you can if you're especially paranoid:

      Math.abs(), Math.acos(), Math.asin(), Math.atan(), Math.atan2(), Math.ceil(), Math.cos(), Math.exp(),
      Math.floor(), Math.log(), Math.max(), Math.min(), Math.pow(), Math.random(), Math.round(), Math.sin(),
      Math.sqrt(), Math.tan().        

    NOTE 3: bugchecks attempt to run the referenced object method immediately when encountered.
    When defining any method (A) with a dependency (B) that is also not defined before (A) is called, (such as during a bugcheck)
    (A) will search for (B) and throw a Type/Reference Error, (caught by define), and will overwrite any native function if it exists.
    Thus is is best practice to define dependencies first.
    
*/
;(function MathClosure(log, sqrt, floor, exp) { 

    define(Math, { 
        E : 2.718281828459045, 
        LN10 : 2.302585092994046, 
        LN2 : 0.6931471805599453, 
        LOG10E : 0.4342944819032518, 
        LOG2E : 1.4426950408889634, 
        PI : 3.141592653589793, 
        SQRT1_2 : 0.7071067811865476, 
        SQRT2 : 1.4142135623730951
    });

    define(Math, {

        'abs': abs, 'acosh': acosh, 'asinh': asinh, 'atanh': atanh, 'cbrt': cbrt, 'clz32': clz32, 'cosh': cosh, 
        'expm1': expm1, 'f16round': f16round, 'fround': fround, 'hypot': hypot, 'imul': imul, 'log10': log10, 
        'log1p': log1p, 'log2': log2, 'sign': sign, 'sinh': sinh, 'tanh': tanh, 'trunc': trunc

    }, NON_ENUM, function overwriteIfBuggyOrUndefined(key) {    

        function withinULPDistance(result, expected) {
            return Math.abs(1 - (result / expected)) < 8 * Number.EPSILON;
        }
        switch (key) {
            case 'abs'  : { return isNegativeZero(this(-0)) }
            case 'acosh': { 
                return (
                    this(Infinity) !== Infinity || 
                    !is(710, floor(this(Number.MAX_VALUE))) ||
                    withinULPDistance(this(1 + Number.EPSILON), Math.sqrt(2 * Number.EPSILON)) // Chrome < 54 has an inaccurate acosh for EPSILON deltas
                );
            }
            case 'asinh': { return isNegativeZero(this(0)) }
            case 'atanh': { return !(1 / this(-0) < 0) }
            case 'cosh' : { return this(710) === Infinity }
            case 'expm1': { return this(10) > 22025.465794806719 || this(10) < 22025.4657948067165168 || this(-2e-17) !== -2e-17 }
            case 'hypot': { return this(Infinity, NaN) !== Infinity }
            case 'imul' : { return this(0xFFFFFFFF, 5) !== -5 || this.length !== 2 }
            case 'sinh' : { return this(-2e-17) !== -2e-17 }
        }
    });


    function abs(n) { 
        n = +n; return (n === 0) ? 0 : (n < 0) ? -n : n;
    }

    function acosh(n) { // return Math.log(n + Math.sqrt(n * n - 1));
        n = +n;
        if (n !== n || n < 1) { return NaN }
        if (n === 1) { return 0 }
        if (n === Infinity) { return n }

        var sqrtInvNSquared = Math.sqrt(1 - (1 / (n * n)));
        var halfn = n / 2;

        if (n < 2) { return Math.log1p(n - 1 + (sqrtInvNSquared * n)) }

        return Math.log1p(halfn + (sqrtInvNSquared * halfn) - 1) + (1 / Math.LOG2E);
    }

    function asinh(n) { 
        n = +n; 
        return !isFinite(n) || n === 0 ? n : n < 0 ? -asinh(-n) : Math.log(n + sqrt(n * n + 1));
    }

    function atanh(n) { 
        n = +n; 
        return (n === 0) ? n : log((1+n) / (1-n)) / 2;
    }

    function cbrt(n) { 
        n = +n; return Math.sign(n) * Math.pow(Math.abs(n), 1 / 3);
    }

    function clz32(n) { 
        n = n >>> 0; 
        return n ? 31 - floor(log(n + 0.5) * Math.LOG2E) : 32;
    }

    function cosh(n) { 
        var E = Math.E;
        var t = Math.expm1(Math.abs(n) - 1) + 1; 
        return (t + 1 / (t * E * E)) * (E / 2);
    }

    function expm1(n) {
        n = +n; 
        return (n === 0) ? n : n > -1e-6 && n < 1e-6 ? n + n * n / 2 : (exp(n) - 1);
    }

    function _floatRound(x, FLOAT_EPSILON, FLOAT_MAX_VALUE, FLOAT_MIN_VALUE) {
        var n = +x;
        var absolute = Math.abs(n);
        var s = Math.sign(n);

        if (absolute < FLOAT_MIN_VALUE) {
            return s * _roundTiesToEven(absolute / FLOAT_MIN_VALUE / FLOAT_EPSILON) * FLOAT_MIN_VALUE * FLOAT_EPSILON;
        }

        var a = ((1 + FLOAT_EPSILON / Number.EPSILON) * absolute);
        var result = (a - (a - absolute));

        if (result > FLOAT_MAX_VALUE || result !== result) { return s * Infinity; }
        return s * result;
    };

    function _roundTiesToEven(x) {
        var INVERSE_EPSILON = (1 / Number.EPSILON);
        return x + INVERSE_EPSILON - INVERSE_EPSILON;
    }

    function fround(n) {
        // floatRound(n, FLOAT32_EPSILON: [2 ** -23], FLOAT32_MAX_VALUE: [2 ** 128 - 2 ** 104], FLOAT32_MIN_VALUE: [2 ** -126])
        return _floatRound(n, 1.1920928955078125e-7, 3.4028234663852886e+38, 1.1754943508222875e-38);
    }

    function f16round(n) {
        // floatRound(n, FLOAT16_EPSILON, FLOAT16_MAX_VALUE, FLOAT16_MIN_VALUE)
        return _floatRound(n, 0.0009765625, 65504, 6.103515625e-05);
    }

    function hypot() {
        var arg, div, i=0, sum = 0, larg = 0, aLen = arguments.length;
        while (i < aLen) {
            arg = Math.abs(arguments[i++]);
            if (larg < arg) {
                div = larg / arg;
                sum = sum * div * div + 1;
                larg = arg;
            } else if (arg > 0) {
                div = arg / larg;
                sum += div * div;
            } else {
                sum += arg;
            }
        }
        return (larg === Infinity) ? Infinity : (larg * Math.sqrt(sum));
    }

    function imul(x, y) {
        var UINT16 = 0xFFFF;
        var xn = +x, yn = +y;
        var xl = (UINT16 & xn), yl = (UINT16 & yn);
        return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
    }

    function log10(n) { 
        return log(n) * Math.LOG10E;
    }

    function log1p(n) { 
        n = +n; return n > -1e-8 && n < 1e-8 ? n - n * n / 2 : log(1+n);
    }

    function log2(n) { 
        return log(n) / Math.LN2;
    }

    function sign(n) {
        n = +n; return (!n) ? n : n < 0 ? -1 : 1;
    }

    function sinh(n) { 
        n = +n;
        return Math.abs(n) < 1 ? (Math.expm1(n) - Math.expm1(-n)) / 2 : (exp(n-1) - exp(-n - 1)) * (Math.E / 2);
    }

    function tanh(n) {
        n = +n;
        var a = Math.expm1(n), b = Math.expm1(-n);
        return a === Infinity ? 1 : b === Infinity ? -1 : (a - b) / (exp(n) + exp(-n));
    }

    function trunc(n) {
        n = +n; return (n > 0 ? Math.floor : Math.ceil)(n);
    }

})(Math.log, Math.sqrt, Math.floor, Math.exp);



