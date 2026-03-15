'use strict'

const async = require('async')
const WrkBase = require('wrk-base/workers/base.wrk')
const libServer = require('./lib/server')

/**
 * HTTP Node Worker class
 * @class WrkNodeHttp
 * @extends WrkBase
 */
class WrkNodeHttp extends WrkBase {
  /**
   * Creates an instance of WrkNodeHttp
   * @param {Object} conf - Configuration object
   * @param {Object} ctx - Context object
   * @param {number} ctx.port - HTTP server port
   * @throws {Error} ERR_HTTP_PORT_INVALID - If port is not provided
   */
  constructor (conf, ctx) {
    super(conf, ctx)

    if (!ctx.port) {
      throw new Error('ERR_HTTP_PORT_INVALID')
    }

    this.prefix = `${this.wtype}-${ctx.port}`

    this.init()
    this.start()
  }

  /**
   * Initialize worker and set up facilities
   */
  init () {
    super.init()

    this.setInitFacs([
      ['fac', 'bfx-facs-interval', '0', '0', {}, 0],
      ['fac', 'bfx-facs-lru', '15m', '15m', { max: 10000, maxAge: 60000 * 15 }],
      ['fac', 'bfx-facs-http', 'c0', 'c0', { timeout: 30000, debug: false }, 1],
      ['fac', 'svc-facs-httpd', 'h0', 'h0', {
        port: this.ctx.port,
        logger: true,
        addDefaultRoutes: true,
        trustProxy: true
      }, 1]
    ])
  }

  /**
   * Start the HTTP server and set up routes and handlers
   * @param {Function} cb - Callback function
   */
  _start (cb) {
    async.series([
      next => { super._start(next) },
      async () => {
        const httpd = this.httpd_h0

        libServer.routes(this).forEach(r => {
          httpd.addRoute(r)
        })

        await httpd.startServer()
      }
    ], cb)
  }
}

module.exports = WrkNodeHttp
