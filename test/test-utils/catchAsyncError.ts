const catchAsyncError = (done, cb) => {
  try {
    cb();
  } catch (e) {
    done.fail(e);
  }
};

export default catchAsyncError;
