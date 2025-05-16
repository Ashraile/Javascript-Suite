Object.prototype.hasOwnProperty || (function() {

    function hasOwnProperty(prop) {

        if (this === null || this === undefined) { // strict equality eliminates document.all false-positive
            throw new TypeError('Object.prototype.hasOwnProperty called on' + this);
        }
        var O = Object(this), key = String(prop);
        
        // handles O.constructor being undefined
        var _proto_ = (function(){ try { return O.__proto__ || O.constructor.prototype } catch(e){} })() || {}; // Object.prototype

        return key in O && (!(key in _proto_) || O[key] !== _proto_[key]);
    }

    try { 
        Object.defineProperty( Object.prototype, 'hasOwnProperty', { 
            configurable: true, writable: true, value: hasOwnProperty // enumerable: false
        });
    } 
    catch (e) { Object.prototype.hasOwnProperty = hasOwnProperty; } // Object.defineProperty isn't supported. Use dot notation syntax.

})();
