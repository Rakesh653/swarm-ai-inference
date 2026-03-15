'use strict'

function encodeJson (value) {
  return Buffer.from(JSON.stringify(value))
}

function decodeJson (buffer) {
  if (buffer == null) return null
  const text = Buffer.isBuffer(buffer) ? buffer.toString() : String(buffer)
  if (!text) return null
  return JSON.parse(text)
}

module.exports = {
  encodeJson,
  decodeJson
}
