'use strict'

const async = require('async')
const WrkProcAggrBase = require('./aggr.proc.ork.tpl')

/**
 * Worker for aggregating and managing racks and their things
 * @class WrkProcAggr
 * @extends WrkProcAggrBase
 */
class WrkProcAggr extends WrkProcAggrBase {
  /**
   * Creates a new WrkProcAggr instance
   * @param {Object} conf - Configuration object
   * @param {Object} ctx - Context object containing cluster information
   * @throws {Error} When cluster is not defined in the context
   */
  constructor (conf, ctx) {
    super(conf, ctx)

    if (!ctx.cluster) {
      throw new Error('ERR_PROC_RACK_UNDEFINED')
    }

    this.prefix = `${this.wtype}-${ctx.cluster}`

    this.init()
    this.start()
  }

  /**
   * Initialize the worker
   */
  init () {
    super.init()

    this.mem = {
    }
  }

  /**
   * List all things from all racks
   * @returns {Promise<Array>} Array of things with rack_id
   */
  async listThings () {
    const stream = this.racks.createReadStream()

    const collection = await Array.prototype.concat.apply([], await async.mapLimit(stream, 25, async data => {
      const { value: entry, key } = data
      const rackId = key.toString()

      try {
        const result = await this.net_r0.jRequest(
          entry.info.rpcPublicKey,
          'listThings',
          {},
          { timeout: 10000 }
        )

        return result.map(item => ({
          rack_id: rackId,
          ...item
        }))
      } catch (e) {
        this.debugError(`listThings ${entry}`, e, true)
        return []
      }
    }))

    return collection
  }

  /**
   * Register a thing on a specific rack
   * @param {Object} req - Request object
   * @param {string} req.rack_id - Target rack ID
   * @returns {Promise<*>} Result from the rack
   * @throws {Error} When rack is not found or registration fails
   */
  async registerThing (req) {
    const { rack_id: rackFromRequest } = req

    const stream = this.racks.createReadStream()

    const targetRackEntry = await async.detectLimit(stream, 25, async data => {
      const { key } = data
      const rackId = key.toString()

      if (rackId === rackFromRequest) {
        return true
      }
    })

    if (!targetRackEntry) {
      throw new Error('ERR_RACK_ID_NOT_FOUND')
    }

    const targetRack = targetRackEntry.value

    try {
      const result = await this.net_r0.jRequest(
        targetRack.info.rpcPublicKey,
        'registerThing',
        req,
        { timeout: 10000 }
      )

      return result
    } catch (e) {
      this.debugError(`registerThing ${req}`, e, true)
      throw e
    }
  }

  /**
   * Update a thing on a specific rack
   * @param {Object} req - Request object
   * @param {string} req.rack_id - Target rack ID
   * @returns {Promise<number>} Result from the rack
   */
  async updateThing (req) {
    const { rack_id: rackIdFromRequest } = req

    const stream = this.racks.createReadStream()

    const targetRackEntry = await async.detectLimit(stream, 25, async data => {
      const { key } = data
      const rackId = key.toString()

      if (rackId === rackIdFromRequest) {
        return true
      }
    })

    if (!targetRackEntry) {
      throw new Error('ERR_RACK_NOT_FOUND')
    }

    const targetRack = targetRackEntry.value

    try {
      const result = await this.net_r0.jRequest(
        targetRack.info.rpcPublicKey,
        'updateThing',
        req, { timeout: 10000 }
      )

      return result
    } catch (e) {
      this.debugError(`updateThing ${req}`, e, true)
      return 0
    }
  }

  /**
   * Delete a thing from all racks
   * @param {Object} req - Request object with thing identifiers
   * @returns {Promise<number>} Total count of things removed
   */
  async forgetThing (req) {
    const stream = this.racks.createReadStream()

    const collection = await Array.prototype.concat.apply([], await async.mapLimit(stream, 25, async data => {
      const entry = data.value

      return this.net_r0.jRequest(
        entry.info.rpcPublicKey,
        'forgetThing',
        req, { timeout: 10000 }
      )
    }))

    return collection.reduce((acc, e) => {
      return acc + e
    }, 0)
  }

  /**
   * Start the worker and initialize all the RPC endpoints
   * @param {Function} cb - Callback function
   * @private
   */
  _start (cb) {
    async.series([
      next => { super._start(next) },
      async () => {
        const rpcServer = this.net_r0.rpcServer

        rpcServer.respond('listThings', async (req) => {
          return await this.net_r0.handleReply('listThings', req)
        })

        rpcServer.respond('registerThing', async (req) => {
          return await this.net_r0.handleReply('registerThing', req)
        })

        rpcServer.respond('updateThing', async (req) => {
          return await this.net_r0.handleReply('updateThing', req)
        })

        rpcServer.respond('forgetThing', async (req) => {
          return await this.net_r0.handleReply('forgetThing', req)
        })
      },
      async () => { }
    ], cb)
  }
}

module.exports = WrkProcAggr
