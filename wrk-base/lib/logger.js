'use strict'

const pino = require('pino')

function createLogger (name, level) {
  return pino({
    name,
    level: level || 'info'
  })
}

module.exports = {
  createLogger
}
