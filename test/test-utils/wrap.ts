// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = <TArgs>(done: jest.DoneCallback, cb: (...args: TArgs[]) => void) => (
  ...args: TArgs[]
) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};

export default wrap;
