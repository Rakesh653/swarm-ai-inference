'use strict'

const { rpcRequest } = require('../lib/rpc')

function createGatewayService (options) {
  const registry = options.registry
  const rpc = options.rpc
  const logger = options.logger
  const timeoutMs = options.timeoutMs || 2000
  const retries = options.retries == null ? 1 : options.retries

  async function forwardInference (payload) {
    const routers = registry.list('router').filter(router => registry.isHealthy(router))
    if (routers.length === 0) {
      const err = new Error('No available router peers')
      err.code = 'NO_ROUTER'
      throw err
    }

    let lastErr
    const attempted = new Set()

    for (let i = 0; i < routers.length; i++) {
      const router = registry.select('router')
      if (!router || attempted.has(router.id)) continue
      attempted.add(router.id)

      try {
        const response = await rpcRequest({
          rpc,
          peer: Buffer.from(router.id, 'hex'),
          method: 'route_inference',
          payload,
          timeoutMs,
          retries,
          logger
        })
        registry.markSuccess(router.id)
        return response
      } catch (err) {
        lastErr = err
        registry.markFailure(router.id)
        if (logger) logger.warn({ err: err.message, router: router.id }, 'router request failed')
      }
    }

    throw lastErr || new Error('Failed to forward inference request')
  }

  return {
    forwardInference
  }
}

module.exports = {
  createGatewayService
}
