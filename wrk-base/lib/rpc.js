'use strict'

const { encodeJson, decodeJson } = require('./codec')

function timeoutAfter (ms) {
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      clearTimeout(handle)
      const err = new Error(`RPC timeout after ${ms}ms`)
      err.code = 'RPC_TIMEOUT'
      reject(err)
    }, ms)
  })
}

async function rpcRequest (options) {
  const rpc = options.rpc
  const peer = options.peer
  const method = options.method
  const payload = options.payload
  const timeoutMs = options.timeoutMs || 2000
  const retries = options.retries == null ? 1 : options.retries
  const logger = options.logger

  let lastErr

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        rpc.request(peer, method, encodeJson(payload)),
        timeoutAfter(timeoutMs)
      ])
      return decodeJson(result)
    } catch (err) {
      lastErr = err
      if (logger) {
        logger.warn({ err: err.message, method, attempt, peer: peer.toString('hex') }, 'rpc request failed')
      }
    }
  }

  throw lastErr
}

module.exports = {
  rpcRequest
}
