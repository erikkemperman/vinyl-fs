'use strict';

var path = require('path');

var fs = require('graceful-fs');
var through = require('through2');

var LINK_MODE = require('../constants').LINK_MODE;

function prepareSymlink(folderResolver, optResolver) {
  if (!folderResolver) {
    throw new Error('Invalid output folder');
  }

  function normalize(file, enc, cb) {
    var cwd = path.resolve(optResolver.resolve('cwd', file));

    var outFolderPath = folderResolver.resolve('outFolder', file);
    if (!outFolderPath) {
      return cb(new Error('Invalid output folder'));
    }
    var basePath = path.resolve(cwd, outFolderPath);
    var writePath = path.resolve(basePath, file.relative);

    // Wire up new properties
    // TODO new stats will have invalid props, but target stats will have the
    // wrong ones...
    file.stat = (file.stat || new fs.Stats());
    file.stat.mode = LINK_MODE;
    file.cwd = cwd;
    file.base = basePath;
    // This is the path we are linking *TO*
    file.symlink = file.path;
    file.path = writePath;
    // We have to set contents to null for a link
    // Otherwise `isSymbolic()` returns false
    file.contents = null;

    cb(null, file);
  }

  return through.obj(normalize);
}

module.exports = prepareSymlink;
