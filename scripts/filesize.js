#!/usr/bin/env node
'use strict';

var Flags = require('minimist')(process.argv.slice(2)),
      Fs = require('fs'),
      Path = require('path'),
      PrettyBytes = require('pretty-bytes'),
      Colors = require('colors');

if (!Flags.file) {
  process.exit(1);
}

let totalSize = 0,
    totalGzippedSize = 0,
    filePath = Path.resolve(process.cwd(), Flags.file);

var rawSize = Fs.statSync(filePath).size;
totalSize = PrettyBytes(rawSize);
var rawGzippedSize = Fs.statSync(`${filePath}.gz`).size;
totalGzippedSize = PrettyBytes(rawGzippedSize);

console.log('\n');
console.log('=============================== FileSize summary ===============================');
console.log(`The total size of ${Path.basename(filePath)} is ${Colors.green(totalSize)}.`);
console.log(`The total gzipped size of ${Path.basename(filePath)} is ${Colors.green(totalGzippedSize)}.`);
console.log('================================================================================');
console.log('\n');

if (Flags.max) {
  var max = Number(Flags.max) * 1000; // kb to bytes
  if (max > totalSize) {
    process.exitCode = 1;
    console.log(Colors.red(`The total size of ${Path.basename(filePath)} exceeds ${PrettyBytes(max)}.`));
  }
}

if (Flags.maxGzip) {
  var maxGzip = Number(Flags.maxGzip) * 1000; // kb to bytes
  if (rawGzippedSize > maxGzip) {
    process.exitCode = 1;
    console.log(Colors.red(`The total gzipped size of ${Path.basename(filePath)} exceeds ${PrettyBytes(maxGzip)}.`));
  }
}
