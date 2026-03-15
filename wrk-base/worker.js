'use strict'

// used to spawn a `bfx-svc-js` service. Contains the worker CLI.
const handler = require('bfx-svc-boot-js')

if (require.main === module && handler) {
  if (typeof handler.init === 'function') handler.init()
  if (typeof handler.start === 'function') handler.start()
}

module.exports = handler
