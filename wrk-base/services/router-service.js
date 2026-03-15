'use strict'

const { rpcRequest } = require('../lib/rpc')

function createRouterService (options) {
  const registry = options.registry
  const rpc = options.rpc
  const logger = options.logger
  const timeoutMs = options.timeoutMs || 2000
  const retries = options.retries == null ? 1 : options.retries
  const strategy = options.strategy || 'round_robin'

  async function routeInference (payload) {
    const model = payload.model
    const candidates = registry.list(model).filter(worker => registry.isHealthy(worker))

    if (candidates.length === 0) {
      const err = new Error(`No available workers for model: ${model}`)
      err.code = 'NO_WORKERS'
      throw err
    }

    let lastErr
    const attempted = new Set()

    for (let i = 0; i < candidates.length; i++) {
      const worker = registry.select(model, strategy === 'random' ? 'random' : undefined)
      if (!worker || attempted.has(worker.id)) continue
      attempted.add(worker.id)

      try {
        const response = await rpcRequest({
          rpc,
          peer: Buffer.from(worker.id, 'hex'),
          method: 'infer',
          payload,
          timeoutMs,
          retries,
          logger
        })
        registry.markSuccess(worker.id)
        if (logger) logger.info({ worker: worker.id, model }, 'worker handled inference')
        return response
      } catch (err) {
        lastErr = err
        registry.markFailure(worker.id)
        if (logger) logger.warn({ worker: worker.id, err: err.message }, 'worker inference failed')
      }
    }

    throw lastErr || new Error('Failed to route inference request')
  }

  return {
    routeInference
  }
}

module.exports = {
  createRouterService
}
