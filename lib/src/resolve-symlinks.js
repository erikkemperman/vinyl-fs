'use strict';

var through = require('through2');
var fs = require('graceful-fs');
var fo = require('../file-operations');

function resolveSymlinks(optResolver) {

  // A stat property is exposed on file objects as a (wanted) side effect
  function resolveFile(file, enc, callback) {

    fo.reflectMetadata(file.path, file, onReflect);

    function onReflect(statErr) {
      if (statErr) {
        return callback(statErr);
      }

      if (!file.stat.isSymbolicLink()) {
        return callback(null, file);
      }

      var resolveSymlinks = optResolver.resolve('resolveSymlinks', file);

      if (!resolveSymlinks) {
        return callback(null, file);
      }

      // Get target's stats
      fs.stat(file.path, onStat);
    }

    function onStat(statErr, stat) {
      if (statErr) {
        return callback(statErr);
      }
      file.stat = stat;
      callback(null, file);
    }
  }

  return through.obj(resolveFile);
}

module.exports = resolveSymlinks;
