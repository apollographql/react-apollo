export var catchAsyncError = function (done, cb) {
    try {
        cb();
    }
    catch (e) {
        done.fail(e);
    }
};
//# sourceMappingURL=catchAsyncError.js.map