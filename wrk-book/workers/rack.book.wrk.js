'use strict'

const WrkBase = require('tpl-wrk-thing/workers/tpl.thing.wrk')
const async = require('async')

/**
 * BookWrk class for handling book-related operations
 * @class BookWrk
 * @extends WrkBase
 */
class BookWrk extends WrkBase {
  /**
   * Creates an instance of BookWrk
   * @param {Object} ctx - The context object for the worker
   * @param {Object} conf - The configuration settings for the worker
   */
  constructor (ctx, conf) {
    super(ctx, conf)

    this.init()
    this.start()
  }

  /**
   * Returns tags associated with book things
   * @returns {Array<string>} Array of tags including 'book'
   */
  getThingTags () {
    return [...super.getThingTags(), 'book']
  }

  /**
   * Returns the type identifier for book things
   * @returns {string} The string 'book'
   */
  getThingType () {
    return 'book'
  }

  /**
   * Gets statistics about books in the system, called from parent class
   * Note: This will be useful to fetch info from another service. In this demo app, we are simply returning basic info
   * @async
   * @param {Object} thg - The book thing object
   * @returns {Promise<Object>} Statistics object details about the book
   */
  async collectThingSnap (thg) {
    return {
      isAvailable: thg?.info?.status === 'available',
      isCheckedOut: thg?.info?.status === 'checked-out',
      ts: new Date().getTime()
    }
  }

  /**
   * Starts the worker and sets up RPC handlers, get's called by the parent class
   * @param {Function} cb - Callback function to execute after starting
   * @private
   */
  _start (cb) {
    async.series([
      next => { super._start(next) }
    ], cb)
  }
}

module.exports = BookWrk
