'use strict'

const crypto = require('crypto')

function topicFromName (name) {
  return crypto.createHash('sha256').update(String(name)).digest()
}

module.exports = {
  topicFromName
}
