'use strict';

function mock(value) {
  return function isSymbolicLink() {
    return value;
  };
}
module.exports = mock;
