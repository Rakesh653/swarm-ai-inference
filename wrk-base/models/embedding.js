'use strict'

function hashCode (input) {
  let hash = 0
  const text = String(input)
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function infer (input) {
  const base = hashCode(input)
  const vector = []
  for (let i = 0; i < 5; i++) {
    vector.push(((base + (i * 2654435761)) % 1000) / 1000)
  }

  return {
    input,
    embedding: vector
  }
}

module.exports = {
  infer
}
