'use strict'

class WorkerRegistry {
  constructor (options) {
    const opts = options || {}
    this.logger = opts.logger
    this.maxFailures = opts.maxFailures || 3
    this.workers = new Map()
    this._rrIndex = 0
  }

  upsert (info) {
    if (!info || !info.rpcPublicKey) return null
    const id = info.rpcPublicKey
    const existing = this.workers.get(id) || {}
    const record = {
      id,
      role: info.role || existing.role,
      capabilities: info.capabilities || existing.capabilities || [],
      lastSeen: Date.now(),
      failures: existing.failures || 0,
      inflight: existing.inflight || 0
    }
    this.workers.set(id, record)
    return record
  }

  markFailure (id) {
    const record = this.workers.get(id)
    if (!record) return
    record.failures += 1
    if (record.failures >= this.maxFailures) {
      if (this.logger) this.logger.warn({ id }, 'worker exceeded failure threshold')
    }
  }

  markSuccess (id) {
    const record = this.workers.get(id)
    if (!record) return
    record.failures = 0
  }

  markDisconnected (id) {
    if (this.workers.has(id)) {
      this.workers.delete(id)
      if (this.logger) this.logger.warn({ id }, 'worker removed')
    }
  }

  list (capability) {
    const all = Array.from(this.workers.values())
    if (!capability) return all
    return all.filter(worker => (worker.capabilities || []).includes(capability))
  }

  isHealthy (worker) {
    return worker.failures < this.maxFailures
  }

  select (capability, strategy) {
    const candidates = this.list(capability).filter(worker => this.isHealthy(worker))
    if (candidates.length === 0) return null

    if (strategy === 'random') {
      const idx = Math.floor(Math.random() * candidates.length)
      return candidates[idx]
    }

    const idx = this._rrIndex % candidates.length
    this._rrIndex = (this._rrIndex + 1) % candidates.length
    return candidates[idx]
  }
}

module.exports = {
  WorkerRegistry
}
