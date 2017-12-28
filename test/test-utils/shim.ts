/**
 * React requires the requestAnimationFrame to be defined for tests.
 */
// Prevent typescript from giving error.
const globalAny: any = global;

globalAny.requestAnimationFrame = callback => {
  setTimeout(callback, 0);
};
