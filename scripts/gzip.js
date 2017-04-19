#!/usr/bin/env node
'use strict';

var Flags = require('minimist')(process.argv.slice(1)),
      Fs = require('fs'),
      Path = require('path'),
      Zlib = require('zlib');

var filePath = Path.resolve(process.cwd(), Flags.file);
var gzip = Zlib.createGzip({level: 9});

var readStream = Fs.createReadStream(filePath);
var writeStream = Fs.createWriteStream(`${filePath}.gz`);

readStream.pipe(gzip).pipe(writeStream);
