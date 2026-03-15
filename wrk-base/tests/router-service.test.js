'use strict'

const { describe, it, expect } = require('vitest')
const { WorkerRegistry } = require('../lib/registry')
const { createRouterService } = require('../services/router-service')
const { encodeJson } = require('../lib/codec')

describe('router service', () => {
  it('routes to a healthy worker after failure', async () => {
    const registry = new WorkerRegistry({ maxFailures: 2 })
    registry.upsert({ rpcPublicKey: 'aa', capabilities: ['sentiment'] })
    registry.upsert({ rpcPublicKey: 'bb', capabilities: ['sentiment'] })

    const rpc = {
      request: async (peer, method, payload) => {
        const hex = peer.toString('hex')
        if (hex === 'aa') throw new Error('worker down')
        return encodeJson({ ok: true, model: 'sentiment', result: { input: 'hi' }, workerId: 'bb' })
      }
    }

    const service = createRouterService({
      registry,
      rpc,
      timeoutMs: 50,
      retries: 0,
      strategy: 'round_robin'
    })

    const response = await service.routeInference({ input: 'hi', model: 'sentiment' })
    expect(response.ok).toBe(true)
    expect(response.workerId).toBe('bb')
  })
})
