'use strict'

const WrkBase = require('./base.wrk')
const { createDiscovery } = require('../lib/discovery')
const { WorkerRegistry } = require('../lib/registry')
const { createGatewayService } = require('../services/gateway-service')
const { validateInferenceRequest } = require('../lib/validation')
const { decodeJson, encodeJson } = require('../lib/codec')

class GatewayWorker extends WrkBase {
  init () {
    super.init()

    this.registry = new WorkerRegistry({
      logger: this.logger,
      maxFailures: 3
    })
  }

  async registerRpc (rpcServer) {
    const timeoutMs = this.conf.rpcTimeoutMs || 2000
    const retries = this.conf.rpcRetries == null ? 1 : this.conf.rpcRetries

    this.gatewayService = createGatewayService({
      registry: this.registry,
      rpc: this.net_r0.rpc,
      logger: this.logger,
      timeoutMs,
      retries
    })

    rpcServer.respond('infer', async data => {
      const payload = decodeJson(data)
      const validation = validateInferenceRequest(payload)
      if (!validation.ok) {
        return encodeJson({ ok: false, error: validation.error })
      }

      try {
        const response = await this.gatewayService.forwardInference({
          input: validation.input,
          model: validation.model
        })
        return encodeJson({ ok: true, result: response })
      } catch (err) {
        return encodeJson({ ok: false, error: err.message, code: err.code })
      }
    })

    this._setupDiscovery()
  }

  _setupDiscovery () {
    const rpcPublicKey = this.getRpcKey().toString('hex')
    this.logger.info({ rpcPublicKey }, 'gateway rpc ready')

    createDiscovery({
      swarm: this.net_r0.swarm,
      topics: ['ai-routers'],
      role: 'gateway',
      info: {
        rpcPublicKey,
        capabilities: ['gateway']
      },
      logger: this.logger,
      onHello: message => {
        if (message.role !== 'router') return
        if (!message.rpcPublicKey) return

        this.registry.upsert({
          rpcPublicKey: message.rpcPublicKey,
          role: message.role,
          capabilities: ['router']
        })

        this.logger.info({
          router: message.rpcPublicKey
        }, 'registered router')
      },
      onDisconnect: details => {
        if (!details || !details.publicKey) return
        const peerKey = details.publicKey.toString('hex')
        this.registry.markDisconnected(peerKey)
      }
    })
  }
}

module.exports = GatewayWorker
