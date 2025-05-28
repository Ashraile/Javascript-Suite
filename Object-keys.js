// Round table typechecking functions. You can use just 'typeof x === 'y' or whatever in place of them but it will sacrifice accuracy for brevity.

#import define from "/define-3.7.js";

var classRegex = /^\s*class\b/;
var hasToStringTag = (typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol');
var ObjectPrototypeToString = Object.prototype.toString;
var FunctionPrototypeToString = Function.prototype.toString;
var array_slice = Array.prototype.slice;
var NON_ENUM = { writable: true, configurable: true }; // enumerable: false

function ToObject(O) {
    return isNullish(O) ? (function(){ throw new TypeError('Cannot convert undefined or null to object'); })() : Object(O);
}

function isArguments(value) { // "use strict";
    var str = ObjectPrototypeToString.call(value);
    return (
        (str === '[object Arguments]') ||
        (str !== '[object Array]'
            && typeof value === 'object' && value
            && typeof value.length === 'number'
            && value.length >= 0
            && isCallable(value.callee)
        )
    );
}

function isCallable(value) {
    if (isDDA(value)) { return true }
    if (!value || (typeof value !== 'function' && typeof value !== 'object') || isES6ClassFn(value)) { 
        return false;
    }
    if (hasToStringTag) {
        return !!(function() { // tryFunctionObject()
            try {
                return FunctionPrototypeToString.call(value), true;
            } catch (e) {}
        })();
    }
    var str = ObjectPrototypeToString.call(value);
    return str === '[object Function]' || str === '[object GeneratorFunction]';
}

function isDDA(v) {
    try { return v === document.all } catch (e) { return false } // try catch in case we don't have a document
}

function isES6ClassFn(value) {
    try { return classRegex.test(FunctionPrototypeToString.call(value)) } catch (e) { return false }
}

 function isString(value) {
    if (typeof value === 'string') { return true }
    if (typeof value !== 'object') { return false }
    return hasToStringTag ? !!(function() { // tryStringObject()
        try { 
            return String.prototype.valueOf.call(value), true;
        } catch (e) {} 
    })() : ObjectPrototypeToString.call(value) === '[object String]';  
}

function isNullish(v) {
    return v === null || v === undefined; // direct strict equaity comparison to avoid document.all false positive
}


;(function ObjectKeys(has, isEnumerable) {    

    function ECP(O) { // Equals Constructor Prototype
        return O.constructor && (O.constructor.prototype === O);
    }

    function ECPIfNotBuggy(O) {
        try { return ECP(O) } catch (e) { return false }                      // removed window check: ECP(O) or false is returned regardless of context.
    }

    var dontEnums = [
        'toString','toLocaleString','valueOf','hasOwnProperty','isPrototypeOf','propertyIsEnumerable','constructor'
    ];

    var hasDontEnumBug = ! isEnumerable.call({'toString': null }, 'toString');  // if IE8 jscript dontEnum bug
    var hasProtoEnumBug = isEnumerable.call( function(){}, 'prototype');        // if prototype is mistakenly enumerable
    var hasStringEnumBug = !has.call('xyz', '0');                               // if string bracket notation (SBR) is unsupported.
    var hasAutomationEqualityBug = !!(function() {                              // if IE8 throws on equality comparison to certain constructor prototypes

        var excludedKeys = (function(O, i) {

            var keys = ['applicationCache|console|external|frame|frameElement|frames|innerHeight|innerWidth|',
                'onmozfullscreenchange|onmozfullscreenerror|outerHeight|outerWidth|pageXOffset|pageYOffset|',
                'parent|scrollLeft|scrollTop|scrollX|scrollY|self|webkitIndexedDB|webkitStorageInfo|window|',
                'width|height|top|localStorage'
            ].join('').split('|');

            while (i < keys.length) { O['$'+ keys[i++]] = true }
            return O;

        })({}, 0);

        if (typeof window !== 'undefined') {                                    // globals window. simplistic window check, revisit
            for (var k in window) {
                try {                                                           // avoid IE8 randomly throwing on accessing window.localstorage
                    if (!excludedKeys['$'+ k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
                        ECP(window[k]);
                    }
                } catch (e) { return true }                                     // removed nested try catch: nested errors are automatically handled.
            }
        }
    })();

    // https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.keys
    // http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation

    define(Object, 'keys', function keys(value) {

        var O = ToObject(value);                          // convert to object, throw TypeError if nullish
        var skipProto = isCallable(O) && hasProtoEnumBug; // skipProto is only true if value is a function
        var theKeys = [];

        if (isString(O) && hasStringEnumBug && value.length > 0) { // confirm string objects always have a length in IE otherwise first convert value toString()
            for (var i=0, len = value.length; i<len;) { // add the indices as keys if no SBR.
                theKeys.push(String(i++));
            }
        }

        // Arguments object can have additional properties added to it.
        // String Objects (created via new String('abc')) also can have additional properties added to them.
        // without SBR (0 in 'a') is false.
        for (var key in O) {
            if ( !(skipProto && key === 'prototype') && has.call(O, key)) {  // confirm arguments object always works with `for-in`.
                theKeys.push(String(key));
            }
        }

        if (hasDontEnumBug) {
            var skipConstructor = ECPIfNotBuggy(O);

            for (var k=0; k < 7;) { // dontEnums.length: 7
                (function(dontEnum) {
                    if ( !(skipConstructor && dontEnum === 'constructor') && has.call(O, dontEnum)) {
                        theKeys.push(dontEnum);
                    }
                })(dontEnums[k++]);
            }
        }

        return theKeys;

    }, NON_ENUM, function forceOverride() {
        return (
            !this(1) || // FAILS_ON_PRIMITIVES check
            hasDontEnumBug || hasProtoEnumBug || hasStringEnumBug || hasAutomationEqualityBug
        );
    });

    // Object.keys() bugfix 2
    define.wrap(Object, 'keys', function(orig) {
        return function keys(O) {
            return orig(isArguments(O) ? arraySlice(O) : O); // this is old Array.prototype.slice before bugfixes, but arguments will never be a string
        }
    }, NON_ENUM,
        function hasKeysArgumentsBugs(key, self) {

            var keysWorksWithArguments = (function() { // Safari 5.0 bug
                return self(arguments).length === 2;
            })(1, 2);

            var keysHasArgumentsLengthBug = (function() {
                var argKeys = self(arguments);
                return arguments.length !== 1 || argKeys.length !== 1 || argKeys[0] !== 1;
            })(1);

            return !keysWorksWithArguments || keysHasArgumentsLengthBug;
        }
    );

})(Object.prototype.hasOwnProperty, Object.prototype.propertyIsEnumerable);
