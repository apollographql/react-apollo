export const catchAsyncError = (done: jest.DoneCallback, cb: () => void) => {
  try {
    cb();
  } catch (e) {
    done.fail(e);
  }
};
