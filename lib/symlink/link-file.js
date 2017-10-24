'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');
var through = require('through2');

var fo = require('../file-operations');

var isWindows = (os.platform() === 'win32');

function linkStream(optResolver) {

  function linkFile(file, enc, callback) {
    var isRelative = optResolver.resolve('relativeSymlinks', file);
    var flag = optResolver.resolve('flag', file);

    if (!isWindows) {
      // On non-Windows, just use 'file'
      return createLinkWithType('file');
    }

    fs.stat(file.symlink, onStat);

    function onStat(statErr, stat) {
      if (statErr && statErr.code !== 'ENOENT') {
        return onWritten(statErr);
      }
      if (!stat) {
        // If target doesn't exist, let's look at the vinyl to see which kind
        // of dangling link we should to create...
        stat = file.stat;
      }

      // This option provides a way to create a Junction instead of a
      // Directory symlink on Windows. This comes with the following caveats:
      // * NTFS Junctions cannot be relative.
      // * NTFS Junctions MUST be directories.
      // * NTFS Junctions must be on the same file system.
      // * Most products CANNOT detect a directory is a Junction:
      //    This has the side effect of possibly having a whole directory
      //    deleted when a product is deleting the Junction directory.
      //    For example, JetBrains product lines will delete the entire contents
      //    of the TARGET directory because the product does not realize it's
      //    a symlink as the JVM and Node return false for isSymlink.

      // This function is Windows only, so we don't need to check again
      var useJunctions = optResolver.resolve('useJunctions', file);

      var dirType = useJunctions ? 'junction' : 'dir';
      // Must check if isDirectory is defined
      var type = stat.isDirectory && stat.isDirectory() ? dirType : 'file';

      createLinkWithType(type);
    }

    function createLinkWithType(type) {
      // This is done after prepare() to use the adjusted file.base property
      if (isRelative && type !== 'junction') {
        file.symlink = path.relative(file.base, file.symlink);
      }

      var opts = {
        flag: flag,
        type: type,
      };
      fo.symlink(file.symlink, file.path, opts, onSymlink);
    }

    function onSymlink(symlinkErr) {
      if (symlinkErr) {
        return callback(symlinkErr);
      }

      fo.reflectMetadata(file.path, file, onReflect);
    }

    function onReflect(reflectErr) {
      if (reflectErr) {
        return callback(reflectErr);
      }

      callback(null, file);
    }
  }

  return through.obj(linkFile);
}

module.exports = linkStream;
