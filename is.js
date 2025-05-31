/*
 * Checks all arguments for strict equality, including NaN and -0;
 */
function is() {
    var i = 0, al = arguments.length; 
    function $is(x, y) { 
        return (x === y) ? (x !== 0 || 1/x === 1/y) : (x !== x && y !== y); // handles -0 and NaN
    } 
    while (i+1 < al) {if (!$is(arguments[i], arguments[++i])) {return false}} // if A is B and B is C: A is C and so on
    return true;
}
// console.log(is(NaN, NaN, NaN));  
// console.log(is(-0, 0, 0));       
// console.log(null, null, null, undefined);
