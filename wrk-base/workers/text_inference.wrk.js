'use strict'

const WrkBase = require('./base.wrk')
const { createDiscovery } = require('../lib/discovery')
const { decodeJson, encodeJson } = require('../lib/codec')
const sentiment = require('../models/sentiment')
const uppercase = require('../models/uppercase')

class TextInferenceWorker extends WrkBase {
  init () {
    super.init()

    this.workerId = `text-${process.pid}`
    this.models = {
      sentiment: sentiment.infer,
      uppercase: uppercase.infer
    }
  }

  async registerRpc (rpcServer) {
    rpcServer.respond('infer', async data => {
      const payload = decodeJson(data)
      if (!payload || typeof payload.input !== 'string') {
        return encodeJson({ ok: false, error: 'Invalid payload' })
      }

      const model = payload.model
      const inferFn = this.models[model]
      if (!inferFn) {
        return encodeJson({ ok: false, error: `Unsupported model: ${model}` })
      }

      const result = inferFn(payload.input)
      return encodeJson({
        ok: true,
        model,
        result,
        workerId: this.workerId
      })
    })

    this._setupDiscovery()
  }

  _setupDiscovery () {
    const rpcPublicKey = this.getRpcKey().toString('hex')
    const capabilities = Object.keys(this.models)
    this.logger.info({ rpcPublicKey, capabilities }, 'text worker rpc ready')

    createDiscovery({
      swarm: this.net_r0.swarm,
      topics: ['ai-workers'],
      role: 'worker',
      info: {
        rpcPublicKey,
        workerId: this.workerId,
        capabilities
      },
      logger: this.logger,
      onHello: message => {
        if (message.role === 'router') {
          this.logger.info({ router: message.rpcPublicKey }, 'router discovered')
        }
      }
    })
  }
}

module.exports = TextInferenceWorker
