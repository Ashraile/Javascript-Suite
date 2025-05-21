# Javascript-Suite

Collection of individual JS helper files with no dependencies.
Suite: 
Examples: `Object.prototype.hasOwnProperty`, `detectIE`, `globalThis`, `document.ready()`

is.js: 

```javascript
/// is.js

console.log(is(NaN, NaN, NaN)); // true
console.log(is(null, undefined)); // false
console.log(is(0, 0, 0, -0)); // false
console.log(is(-0, -0)); // true

```
