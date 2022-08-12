/*
 * Copyright (c) 2022, Groupon, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

/*
When babel runs, it messages with whitespace, particularly around comments.
ESLint isn't entirely willing to fix this itself, and the result can be
broken code.

e.g. if you had:

/////////////////////////////////////////
if (foo) {
  doStuff();
}

// eslint-disable-next-line no-console
console.log('blah');
/////////////////////////////////////////

it might be rewritten like:


/////////////////////////////////////////
if (foo) {

} // eslint-disable-next-line no-console

console.log('blah');
/////////////////////////////////////////

which would now fail lint.  We shall conservatively look for impossible cases
where eslint-disable-next-line exactly precedes a blank line, and move it
to write before the line.

We'll let eslint --fix (prettier) worry about the indentation later.
*/

/** @param {string} js */
function fixBrokenEslintComments(js) {
  return js.replace(
    /\s*(\/\/\s*eslint-disable-next-line\b.*)\n\s*\n/,
    '\n\n$1\n'
  );
}
module.exports = fixBrokenEslintComments;
