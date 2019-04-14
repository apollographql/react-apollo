export function wait(ms) {
    return new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, ms); });
}
//# sourceMappingURL=wait.js.map