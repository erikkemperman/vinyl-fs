'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');

var fo = require('../../file-operations');

var isWindows = (os.platform() === 'win32');

function writeSymbolicLink(file, optResolver, onWritten) {
  if (!file.symlink) {
    return onWritten(new Error('Missing symlink property on symbolic vinyl'));
  }

  // This option provides a way to create a Junction instead of a
  // Directory symlink on Windows. This comes with the following caveats:
  // * NTFS Junctions cannot be relative.
  // * NTFS Junctions MUST be directories.
  // * NTFS Junctions must be on the same file system.
  // * Most products CANNOT detect a directory is a Junction:
  //    This has the side effect of possibly having a whole directory
  //    deleted when a product is deleting the Junction directory.
  //    For example, JetBrains product lines will delete the entire
  //    contents of the TARGET directory because the product does not
  //    realize it's a symlink as the JVM and Node return false for isSymlink.
  var useJunctions = isWindows && optResolver.resolve('useJunctions', file);

  var isRelative = optResolver.resolve('relativeSymlinks', file);
  var flag = optResolver.resolve('flag', file);

  if (isWindows) {
    fs.stat(file.symlink, onStat);
  } else {
    onStat(null, file.stat);
  }

  function onStat(statErr, stat) {
    if (statErr && statErr.code !== 'ENOENT') {
      return onWritten(statErr);
    }
    if (!stat) {
      // If target doesn't exist, let's look at the vinyl to see which kind
      // of dangling link we should to create...
      stat = file.stat;
    }

    var symDirType = useJunctions ? 'junction' : 'dir';
    var symType = stat && stat.isDirectory() ? symDirType : 'file';

    // This is done after prepare() to use the adjusted file.base property
    if (isRelative && symType !== 'junction') {
      file.symlink = path.relative(file.base, file.symlink);
    }

    var opts = {
      flag: flag,
      type: symType,
    };
    fo.symlink(file.symlink, file.path, opts, onWritten);
  }
}

module.exports = writeSymbolicLink;
