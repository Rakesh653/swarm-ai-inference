'use strict'

const WrkBase = require('./base.wrk')
const { createDiscovery } = require('../lib/discovery')
const { WorkerRegistry } = require('../lib/registry')
const { createRouterService } = require('../services/router-service')
const { decodeJson, encodeJson } = require('../lib/codec')

class RouterWorker extends WrkBase {
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

    this.routerService = createRouterService({
      registry: this.registry,
      rpc: this.net_r0.rpc,
      logger: this.logger,
      timeoutMs,
      retries,
      strategy: this.conf.routingStrategy || 'round_robin'
    })

    rpcServer.respond('route_inference', async data => {
      const payload = decodeJson(data)
      const response = await this.routerService.routeInference(payload)
      return encodeJson(response)
    })

    this._setupDiscovery()
  }

  _setupDiscovery () {
    const rpcPublicKey = this.getRpcKey().toString('hex')
    this.logger.info({ rpcPublicKey }, 'router rpc ready')

    createDiscovery({
      swarm: this.net_r0.swarm,
      topics: ['ai-workers', 'ai-routers'],
      role: 'router',
      info: {
        rpcPublicKey,
        capabilities: ['router']
      },
      logger: this.logger,
      onHello: message => {
        if (message.role !== 'worker') return
        if (!message.rpcPublicKey) return

        const capabilities = message.info && message.info.capabilities
          ? message.info.capabilities
          : []

        this.registry.upsert({
          rpcPublicKey: message.rpcPublicKey,
          role: message.role,
          capabilities
        })

        this.logger.info({
          worker: message.rpcPublicKey,
          capabilities
        }, 'registered worker')
      },
      onDisconnect: details => {
        if (!details || !details.publicKey) return
        const peerKey = details.publicKey.toString('hex')
        this.registry.markDisconnected(peerKey)
      }
    })
  }
}

module.exports = RouterWorker
