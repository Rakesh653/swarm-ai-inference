'use strict'

const async = require('async')
const WrkBase = require('tether-wrk-base/workers/base.wrk.tether')
const crypto = require('crypto')
const utilsStore = require('hp-svc-facs-store/utils')
const lWrkFunLogs = require('./lib/wrk-fun-logs')
const { promiseTimeout } = require('lib-js-util-promise')

/**
 * Template worker for managing "things" - abstract entities with common properties and lifecycle methods.
 * This worker provides base functionality for CRUD operations on things, with hooks for customized behavior.
 * It implements storage in both memory and database, RPC endpoints, and lifecycle management of things.
 *
 * @extends WrkBase
 */
class WrkTplThing extends WrkBase {
  /**
   * Creates a new WrkTplThing instance, should not be called directly, use subclasses instead
   * @param {Object} conf - Configuration object
   * @param {Object} ctx - Context object containing rack information
   * @throws {Error} If ctx.rack is undefined
   */
  constructor (conf, ctx) {
    super(conf, ctx)

    if (!ctx.rack) {
      throw new Error('ERR_PROC_RACK_UNDEFINED')
    }

    this.prefix = `${this.wtype}-${ctx.rack}`

    this.loadConf('base.thing', 'thing')
  }

  /**
   * Returns the type of things managed by this worker, should be overridden by subclasses
   * @returns {string} The thing type
   */
  getThingType () {
    return 'thing'
  }

  /**
   * Returns default tags for things managed by this worker
   * @returns {Array} Array of default tags
   */
  getThingTags () {
    return []
  }

  /**
   * Selects additional information to include when presenting thing data, should be overridden by subclasses
   * @param {Object} thg - The thing object
   * @returns {Object} Additional information to include
   */
  selectThingInfo (thg) {
    return {}
  }

  /**
   * Initializes the worker
   * @override
   */
  init () {
    super.init()

    const ctx = this.ctx

    this.rackId = `${this.getThingType()}-${ctx.rack}`

    this.setInitFacs([
      ['fac', 'bfx-facs-interval', '0', '0', {}, 0],
      ['fac', 'bfx-facs-scheduler', '0', '0', {}, 0],
      [
        'fac',
        'hp-svc-facs-store',
        's1',
        's1',
        {
          storePrimaryKey: this.ctx.storePrimaryKey,
          storeDir: `store/${this.ctx.rack}-data`
        },
        1
      ]
    ])

    this.mem = {
      things: {}
    }
  }

  /**
   * Logs debug information for a thing-specific error
   * @param {Object} thg - The thing object
   * @param {Error} e - The error to log
   */
  debugThingError (thg, e) {
    this.logger.debug(`[THING/${this.rackId}/${thg.id}]`, e)
  }

  /**
   * Logs debug information for a general error
   * @param {Object} data - Additional data to log
   * @param {Error} e - The error to log
   */
  debugError (data, e) {
    this.logger.debug(`[THING/${this.rackId}]`, data, e)
  }

  /**
   * Hook for processing the list of things before returning them
   * @param {Object} thg - The thing object
   * @returns {Promise<void>}
   */
  async listThingsHook0 (thg) {
    // Hook implementation to be provided by subclasses
  }

  /**
   * Hook called when registering a thing, should be overridden by subclasses
   * @param {Object} thg - The thing object
   * @returns {Promise<void>}
   */
  async registerThingHook0 (thg) {
    // Hook implementation to be provided by subclasses
  }

  /**
   * Hook called when updating a thing, should be overridden by subclasses
   * @param {Object} thg - The updated thing object
   * @param {Object} thgPrev - The previous thing state
   * @returns {Promise<void>}
   */
  async updateThingHook0 (thg, thgPrev) {
    // Hook implementation to be provided by subclasses
  }

  /**
   * Hook called when forgetting a thing, should be overridden by subclasses
   * @param {Object} thg - The thing object to forget
   * @returns {Promise<void>}
   */
  async forgetThingHook0 (thg) {
    // Hook implementation to be provided by subclasses
  }

  /**
   * Hook called when setting up a thing, should be overridden by subclasses
   * @param {Object} thg - The thing object to set up
   * @returns {Promise<void>}
   */
  async setupThingHook0 (thg) {
    // Hook implementation to be provided by subclasses
  }

  /**
   * Validates data before registering a thing, should be overridden by subclasses
   * @param {Object} data - The data to validate
   * @private
   */
  _validateRegisterThing (data) {
    // noop
  }

  /**
   * Validates data before updating a thing, should be overridden by subclasses
   * @param {Object} data - The data to validate
   * @private
   */
  _validateUpdateThing (data) {
    // no op
  }

  /**
   * Generates a unique ID for a new thing
   * @returns {string} A UUID
   * @private
   */
  _generateThingId () {
    return crypto.randomUUID()
  }

  /**
   * Sets up a thing in memory
   * @param {Object} base - The base thing object from database
   * @returns {Promise<number>} 1 if setup succeeded, 0 if thing already exists
   * @private
   */
  async _setupThing (base) {
    const thgId = base.id

    if (this.mem.things[thgId]) {
      return 0
    }

    const thg = {
      id: thgId,
      type: this.getThingType(),
      tags: base.tags,
      info: base.info,
      last: {}
    }

    const log = await lWrkFunLogs.getBeeTimeLog.call(this, `thing-5m-${thgId}`, 0, true)

    try {
      let last = await log.peek({ reverse: true, limit: 1 })
      if (last) {
        last = JSON.parse(last.value.toString())
        thg.last = last
      }
    } catch (e) {
      this.debugError(null, e)
    }

    lWrkFunLogs.releaseBeeTimeLog.call(this, log)

    await this.setupThingHook0(thg)

    this.mem.things[thgId] = thg

    return 1
  }

  /**
   * Sets up all things from database into memory
   * @returns {Promise<number>} 1 when complete
   * @private
   */
  async _setupThings () {
    const valid = {}

    const streamThings = this.things.createReadStream()

    for await (const data of streamThings) {
      const entry = data.value

      try {
        valid[entry.id] = true
        await this._setupThing(entry)
      } catch (e) {
        this.debugError(entry, e)
      }
    }

    const thgIds = Object.keys(this.mem.things)

    for await (const thgId of thgIds) {
      if (valid[thgId]) {
        continue
      }

      await this._forgetThing(thgId)
    }

    this.logger.debug('things setup finished')

    return 1
  }

  /**
   * Registers a new thing
   * @param {Object} req - Request object with thing data
   * @param {string} [req.id] - Optional ID for the thing
   * @param {Object} req.info - Thing information
   * @param {Array} req.tags - Thing tags
   * @returns {Promise<number>} 1 when complete
   */
  async registerThing (req) {
    this._validateRegisterThing(req)
    const thgId = req.id ?? this._generateThingId()

    const thg = {
      id: thgId,
      info: req.info,
      tags: req.tags
    }

    await this.registerThingHook0(thg)
    await this._storeThingDb(thg)
    await this._setupThing(thg)

    return 1
  }

  /**
   * Updates an existing thing
   * @param {Object} req - Request object with update data
   * @param {string} req.id - ID of the thing to update
   * @param {Object} [req.info] - Optional updated info
   * @param {Array} [req.tags] - Optional updated tags
   * @returns {Promise<number>} 1 when complete
   * @throws {Error} If thing not found
   */
  async updateThing (req) {
    if (!req.id || !this.mem.things[req.id]) {
      throw new Error('ERR_THING_NOTFOUND')
    }

    this._validateUpdateThing(req)

    let thg = await this.things.get(req.id)
    thg = thg.value
    const thgPrev = {
      info: { ...thg.info },
      tags: [...thg.tags]
    }

    if (req.info) {
      thg.info = req.info
    }

    if (req.tags) {
      thg.tags = req.tags
    }

    await this.updateThingHook0(thg, thgPrev)

    await this._storeThingDb(thg)

    this._saveThingDataToMem(thg)

    return 1
  }

  /**
   * Removes a thing from the database and memory
   * @param {string} thgId - ID of the thing to forget
   * @returns {Promise<number>} 1 when complete
   * @private
   */
  async _forgetThing (thgId) {
    const thg = this.mem.things[thgId]

    await this.forgetThingHook0(thg)

    await this.things.del(thgId)
    delete this.mem.things[thgId]

    return 1
  }

  /**
   * Forgets a thing by ID
   * @param {Object} req - Request object
   * @param {string} req.id - ID of the thing to forget
   * @returns {Promise<number>} 1 if forgotten, 0 if not found
   */
  async forgetThing (req) {
    const { id } = req

    if (this.mem.things[id]) {
      await this._forgetThing(id)
      return 1
    }

    return 0
  }

  /**
   * Saves thing data to both database and memory
   * @param {Object} thg - The thing object to save
   * @returns {Promise<void>}
   */
  async saveThingData (thg) {
    await this._saveThingDataToDb(thg)
    this._saveThingDataToMem(thg)
  }

  /**
   * Saves thing data to database
   * @param {Object} thg - The thing object to save
   * @returns {Promise<void>}
   * @private
   */
  async _saveThingDataToDb (thg) {
    let thgDb = await this.things.get(thg.id)
    thgDb = thgDb.value

    if (thg.info) thgDb.info = thg.info
    if (thg.tags) thgDb.tags = thg.tags

    await this._storeThingDb(thgDb)
  }

  /**
   * Saves thing data to memory
   * @param {Object} thg - The thing object to save
   * @private
   */
  _saveThingDataToMem (thg) {
    const thgMem = this.mem.things[thg.id]
    if (thg.info) thgMem.info = thg.info
    if (thg.tags) thgMem.tags = thg.tags
  }

  /**
   * Stores a thing in the database
   * @param {Object} thg - The thing object to store
   * @returns {Promise<void>}
   * @private
   */
  async _storeThingDb (thg) {
    await this.things.put(thg.id, thg)
  }

  /**
   * Prepares thing info for external representation
   * @param {Object} thg - The thing object
   * @returns {Object} Prepared info object
   * @private
   */
  _prepThingInfo (thg) {
    const pack = {
      id: thg.id,
      type: thg.type,
      tags: thg.tags,
      info: thg.info,
      rack: this.rackId,
      ...this.selectThingInfo(thg)
    }

    return pack
  }

  /**
   * Lists all things in memory
   * @returns {Promise<Object[]>}
   */
  async listThings () {
    const thgs = Object.values(this.mem.things)

    await this.listThingsHook0(thgs)

    const res = thgs.map((thg) => {
      const pack = this._prepThingInfo(thg)
      return pack
    })

    return res
  }

  /**
   * Collects snapshots of all things in memory
   * Processes them in batches and optionally stores them in logs based on the storeSnapItvMs interval
   * @returns {Promise<void>}
   * @private
   */
  async _collectSnaps () {
    if (this._collectingSnaps) {
      return
    }

    this._collectingSnaps = true

    const thingConf = this.conf.thing

    const things = this.mem.things
    const now = Date.now()

    if (!this._tsCollectSnap) {
      this._tsCollectSnap = 0
    }

    const shouldStore = (now - this._tsCollectSnap) > thingConf.storeSnapItvMs

    async.eachLimit(
      things,
      thingConf.thingQueryConcurrency,
      async (thg) => {
        let snap = null
        let err = null

        try {
          snap = await promiseTimeout(this.collectThingSnap(thg), thingConf.collectSnapTimeoutMs)
        } catch (e) {
          if (e.message === 'ERR_PROMISE_TIMEOUT') {
            snap = {
              success: false,
              stats: {
                status: 'offline'
              }
            }
          } else {
            err = e
            this.debugThingError(thg, e)
          }
        }
        thg.last.snap = snap
        thg.last.err = err ? err.message : null
        thg.last.ts = now

        if (shouldStore) {
          try {
            const log = await lWrkFunLogs.getBeeTimeLog.call(this, `thing-5m-${thg.id}`, 0, true)
            const kts = utilsStore.convIntToBin(now)

            await log.put(kts, {
              ts: now,
              err: err ? err.message : null,
              snap
            })

            await lWrkFunLogs.releaseBeeTimeLog.call(this, log)
          } catch (e) {
            this.debugError(snap, e)
          }
        }
      },
      () => {
        if (shouldStore) {
          this._tsCollectSnap = now
        }
        this._collectingSnaps = false
      }
    )
  }

  /**
   * Collects a snapshot of a thing's current state
   * This method should be implemented by subclasses
   * @param {Object} thg - The thing object to collect a snapshot for
   * @returns {Promise<Object>} The snapshot data
   * @throws {Error} ERR_IMPL_UNKNOWN if not implemented by subclass
   */
  async collectThingSnap (thg) {
    throw new Error('ERR_IMPL_UNKNOWN')
  }

  /**
   * Retrieves log entries for a specific thing
   * @param {Object} req - Request object
   * @param {string} req.key - The key identifier for the log, like thing-5m
   * @param {string} req.tag - The tag identifier for the log, like <thingId>
   * @param {number} [req.offset=0] - Starting offset for retrieval
   * @param {number} [req.limit] - Maximum number of entries to retrieve
   * @param {number} [req.start] - Start timestamp
   * @param {number} [req.end] - End timestamp
   * @returns {Promise<Array>} Array of log entries
   * @throws {Error} If key or tag is missing or invalid
   */
  async tailLog (req) {
    if (!req.key) {
      throw new Error('ERR_LOG_KEY_NOTFOUND')
    }

    const key = req.key
    const offset = req.offset || 0

    if (!req.tag) {
      throw new Error('ERR_LOG_TAG_INVALID')
    }

    const tag = req.tag
    const log = await lWrkFunLogs.getBeeTimeLog.call(this, `${key}-${tag}`, offset)

    if (!log) {
      throw new Error('ERR_LOG_NOTFOUND')
    }

    const res = await this._tailHistLog(log, {
      reverse: true,
      limit: req.limit,
      start: req.start,
      end: req.end
    })

    await lWrkFunLogs.releaseBeeTimeLog.call(this, log)

    return res
  }

  /**
   * Retrieves entries from a historical log
   * @param {Object} log - The log object to query
   * @param {Object} req - Request parameters
   * @param {number} [req.start] - Start timestamp
   * @param {number} [req.end] - End timestamp
   * @param {number} [req.limit] - Maximum number of entries to retrieve
   * @param {boolean} [req.reverse] - Whether to retrieve entries in reverse order
   * @returns {Promise<Array>} Array of log entries
   * @private
   */
  async _tailHistLog (log, req) {
    const query = {}

    if (req.start) {
      const kstart = utilsStore.convIntToBin(req.start)
      query.gte = kstart
    }

    if (req.end) {
      const kend = utilsStore.convIntToBin(req.end)
      query.lte = kend
    }

    if (req.limit) {
      query.limit = req.limit
    }

    if (req.reverse) {
      query.reverse = true
    }

    const stream = log.createReadStream(query)

    const res = []

    for await (const chunk of stream) {
      res.push(chunk.value)
    }

    return res
  }

  /**
   * Starts the worker
   * @param {Function} cb - Callback function
   * @returns {void}
   * @private
   */
  _start (cb) {
    async.series(
      [
        (next) => {
          super._start(next)
        },
        async () => {
          const rpcServer = this.net_r0.rpcServer

          this.things = await this.store_s1.getBee(
            { name: 'things' },
            { keyEncoding: 'utf-8', valueEncoding: 'json' }
          )

          this.meta_logs = await this.store_s1.getBee(
            { name: 'meta_logs_00' },
            { keyEncoding: 'utf-8', valueEncoding: 'json' }
          )

          await this.things.ready()
          await this.meta_logs.ready()

          rpcServer.respond('echo', (x) => x)

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

          rpcServer.respond('tailLog', async (req) => {
            return await this.net_r0.handleReply('tailLog', req)
          })

          const thingConf = this.conf.thing
          thingConf.thingQueryConcurrency = thingConf.thingQueryConcurrency || 25
          thingConf.storeSnapItvMs = thingConf.storeSnapItvMs || 300000
          thingConf.collectSnapTimeoutMs = thingConf.collectSnapTimeoutMs || 120000

          this.status.rpcPublicKey = this.getRpcKey().toString('hex')
          this.status.storeS1PrimaryKey =
            this.store_s1.store.primaryKey.toString('hex')

          this.saveStatus()
        },
        async () => {
          await this._setupThings()
          const thingConf = this.conf.thing

          this.interval_0.add(
            'collectSnaps',
            this._collectSnaps.bind(this),
            thingConf.collectSnapsItvMs || 600000
          )

          this.interval_0.add(
            'rotateLogs',
            lWrkFunLogs.rotateLogs.bind(this),
            thingConf.rotateLogsItvMs || 120000
          )
        }
      ],
      cb
    )
  }
}

module.exports = WrkTplThing
