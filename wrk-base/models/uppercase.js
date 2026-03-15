'use strict'

function infer (input) {
  return {
    input,
    output: String(input).toUpperCase()
  }
}

module.exports = {
  infer
}
