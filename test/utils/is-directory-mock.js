'use strict';

function mock(value) {
  return function isDirectory() {
    return value;
  };
}
module.exports = mock;
