'use strict'

const { describe, it, expect } = require('vitest')
const { WorkerRegistry } = require('../lib/registry')

describe('WorkerRegistry', () => {
  it('selects workers by capability', () => {
    const registry = new WorkerRegistry({ maxFailures: 2 })
    registry.upsert({ rpcPublicKey: 'a1', capabilities: ['sentiment'] })
    registry.upsert({ rpcPublicKey: 'b2', capabilities: ['embedding'] })

    const selected = registry.select('sentiment')
    expect(selected.id).toBe('a1')
  })

  it('marks failures and excludes unhealthy workers', () => {
    const registry = new WorkerRegistry({ maxFailures: 1 })
    registry.upsert({ rpcPublicKey: 'a1', capabilities: ['sentiment'] })

    registry.markFailure('a1')
    const selected = registry.select('sentiment')
    expect(selected).toBe(null)
  })
})
