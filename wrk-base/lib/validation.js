'use strict'

function validateInferenceRequest (payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Payload must be an object' }
  }

  const input = payload.input
  const model = payload.model

  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, error: 'Input must be a non-empty string' }
  }

  if (typeof model !== 'string' || model.trim().length === 0) {
    return { ok: false, error: 'Model must be a non-empty string' }
  }

  return { ok: true, input: input.trim(), model: model.trim() }
}

module.exports = {
  validateInferenceRequest
}
