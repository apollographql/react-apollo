export const wrap = <TArgs>(
  done: jest.DoneCallback,
  cb: (...args: TArgs[]) => void,
) => (...args: TArgs[]) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};
