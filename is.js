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

// console.log(is(NaN, NaN, NaN));  
// console.log(is(-0, 0, 0));       
// console.log(null, null, null, undefined);
