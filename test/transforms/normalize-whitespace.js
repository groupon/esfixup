'use strict';

function normWS(code) {
  return code.replace(/\s+/g, '').trim();
}

module.exports = normWS;
