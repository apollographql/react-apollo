/**
 * React requires the requestAnimationFrame to be defined for tests.
 */
// Prevent typescript from giving error.
const globalAny: any = global;

const raf: typeof requestAnimationFrame = callback => {
  setTimeout(callback, 0);
  return 0;
};

globalAny.requestAnimationFrame = raf;
