// This function is self-contained and can be inlined as a module in any script without external dependencies.
// It is ~40% more performant than the eponymous npm es-shim methods.
var ES = (function() {

    var $OPTS = Object.prototype.toString;
    var $FPTS = Function.prototype.toString;

    var classRegex =  /^\s*class\b/;
    var hasToStringTag = (typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol');

    function tryMethodCall(value, method, $1, $2) { // tryStringObject, tryFunctionObject, tryRegexExec, etc
        return hasToStringTag ? 
            !!(function() { try { return method.call(value), true} catch(e){} })() : 
            (function(str) { return !$2 ? (str === $1) : (str === $1 || str === $2) })($OPTS.call(value));
    }

    function isActualNaN(v) { return v !== v }

    function isArguments(value) {
        var str = $OPTS.call(value);
        return (
            (str === '[object Arguments]') ||
            (str !== '[object Array]'
                && typeof value === 'object' && !!value
                && typeof value.length === 'number'
                && value.length >= 0
                && isCallable(value.callee)
            )
        );
    }

    function isCallable(value) {
        // if (isDDA(value)) { return true }
        if (!value || (typeof value !== 'function' && typeof value !== 'object') || isES6ClassFn(value)) { return false }
        return tryMethodCall(value, $FPTS, '[object Function]', '[object GeneratorFunction]');
    }

    function isDDA(value) {
        try { return value === document.all } catch (e) { return false } // try catch in case we don't have a document
    }

    function isES6ClassFn(value) {
        try { return classRegex.test($FPTS.call(value)) } catch (e) { return false }
    }

    function isString(value) {
        if (typeof value === 'string') { return true }
        if (typeof value !== 'object') { return false }
        return tryMethodCall(value, String.prototype.valueOf, '[object String]');
    }

    function isRegex(value) {
        if (typeof value !== 'object') { return false }
        return tryMethodCall(value, RegExp.prototype.exec, '[object RegExp]');
    }

    function isNullish(value) { 
        return value === null || value === undefined; // strict equality check avoids document.all false positive
    }

    function isPrimitive(value) { // primitives: null, undefined, boolean, number (NaN, Infinity), string, symbol, bigint
        // if (isDDA(value)) { return false }
        return value == null || (typeof value !== 'object' && typeof value !== 'function');
    }

    function isWindow(value) {
        if (!value || typeof value !== 'object' || typeof value.document !== 'object') { return false }
        // If a program "defines" a custom windoc, that will be used as a defacto window reference.
        var $window = (typeof window === 'object' && window && typeof window.document === 'object') ? window : undefined;
        return $OPTS.call(value) === '[object Window]' || value == $window; // IE<9 window.window fails strict equality, but here == matches ===
    }

    function isArray(v) {
        return Array.isArray ? Array.isArray(v) : $OPTS.call(v) === '[object Array]';
    }

    /// Checks all arguments for strict equality, including NaN and -0;
    function is() {
        var i = 0, al = arguments.length; 
        function $is(x, y) { 
            return (x === y) ? (x !== 0 || 1/x === 1/y) : (x !== x && y !== y); // handles -0 and NaN
        } 
        while (i+1 < al) {if (!$is(arguments[i], arguments[++i])) {return false}} // if A is B and B is C: A is C and so on
        return true;
    }

    function ToNumber(v) { return +v } // Never used, as inlining is faster | Unary operator (+) throws TypeError on (BigInt, Symbol) primitives as per the spec. Number() constructor does not.
    function ToUint32(v) { return v >>> 0 } // Inlining is faster

    // https://tc39.es/ecma262/#sec-toobject
    function ToObject(v) {
        return !isNullish(v) ? Object(v) : (function() {throw new TypeError('Cannot convert '+v+' to object')})();
    }

    // ECMA-262/11. es5shim: ToInteger("-0.0") -> -0, ES: ToInteger("-0.0") -> 0
    function ToInteger(v) {
        var n = +v;                                    // Step 1. Let number be ToNumber(argument).
        if (!n) { return 0 }                           // Step 2. if number is NaN, +0, or -0, return +0. ToNumber(n) is only falsy on -0, +0, and NaN
        if (n === (1/0) || n === -(1/0)) { return n }  // Step 3. If number is +∞ or -∞, return number.
        n = (n > 0 || -1) * Math.floor(Math.abs(n));   // Step 4
        return n || 0;                                 // Step 5 & 6: (5) If number is -0, return +0. (6) Return integer. 
    }

    function ToPrimitive(v) {
        return isPrimitive(v) ? v : (function(valueOf, toStr, val) {
            if (isCallable(valueOf)) {
                val = valueOf.call(v); if (isPrimitive(val)) {return val}
            }
            if (isCallable(toStr)) {
                val = toStr.call(v); if (isPrimitive(val)) {return val}
            }
            throw new TypeError();
        })(v.valueOf, v.toString);
    }

    function ToSoftNumber(n, unary) { // Converts any value to a Number type via number/unary operator without throwing.
        try {return (unary ? +n : Number(n))} catch(e) {return NaN}
    }

    function ToSoftInteger(n, unary) { // Coerces any value to an integer without throwing a TypeError.
        return ToInteger(ToSoftNumber(n, unary))
    }

    return {
        is: is, isActualNaN: isActualNaN, isArguments: isArguments, isArray: isArray, isCallable: isCallable, isDDA: isDDA, isES6ClassFn: isES6ClassFn, 
        isPrimitive: isPrimitive, isNullish: isNullish, isString: isString, isRegex: isRegex, isWindow: isWindow,
        ToObject: ToObject, ToNumber: ToNumber, ToUint32: ToUint32, ToInteger: ToInteger, ToPrimitive: ToPrimitive, ToSoftInteger: ToSoftInteger
    };

})();

if (typeof module === 'object' && typeof module.exports === 'object') { module.exports = ES }
