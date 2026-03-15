'use strict'

const { describe, it, expect, vi } = require('vitest')

vi.mock('bfx-wrk-base', () => {
  return class MockBase {
    constructor () {
      this.ctx = {
        env: 'test',
        rack: 'r0',
        wtype: 'test',
        debug: false,
        tmpdir: 'tmp'
      }
      this.conf = {}
      this.status = {}
    }

    init () {}

    loadConf () {}

    setInitFacs () {}

    saveStatus () {
      this.saved = true
    }

    _start (cb) {
      cb()
    }
  }
})

const WrkBase = require('../workers/base.wrk')

class TestWorker extends WrkBase {
  async registerRpc () {
    this.registered = true
  }
}

describe('WrkBase lifecycle', () => {
  it('invokes registerRpc hook', async () => {
    const worker = new TestWorker()
    worker.init()

    const rpcServer = {
      respond: vi.fn(),
      publicKey: Buffer.alloc(32),
      dht: { defaultKeyPair: { publicKey: Buffer.alloc(32) } }
    }

    worker.net_r0 = {
      rpcServer,
      startRpcServer: vi.fn(async () => {})
    }

    await new Promise((resolve, reject) => {
      worker._start(err => {
        if (err) return reject(err)
        resolve()
      })
    })

    expect(worker.registered).toBe(true)
    expect(rpcServer.respond).toHaveBeenCalled()
  })
})
