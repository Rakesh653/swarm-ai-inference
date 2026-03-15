'use strict'

/**
 * Generates a standardized log name by appending '-5' to the input name
 * @param {string} n - Base name for the log
 * @returns {string} Formatted log name
 */
function getLogName (n) {
  return n + '-5'
}

/**
 * Initializes metadata for a bee log with counter set to 0. This counter is useful for rotating logs
 * @param {string} logKey - Key identifier for the log
 * @returns {Object} Initialized metadata object
 */
async function initBeeLogMeta (logKey) {
  const meta = {
    cur: 0
  }

  await this.meta_logs.put(logKey, meta)

  return meta
}

/**
 * Rotates a bee log by incrementing its counter in metadata
 * @param {string} logKey - Key identifier for the log to rotate
 * @returns {Object} Updated metadata object
 * @throws {Error} If log metadata not found
 */
async function rotateBeeLog (logKey) {
  const meta = await getBeeLogMeta.call(this, logKey)

  if (!meta) {
    throw new Error('ERR_BEE_LOG_META_NOTFOUND')
  }

  meta.cur++

  await this.meta_logs.put(logKey, meta)

  return meta
}

/**
 * Retrieves metadata for a bee log, optionally initializing if not found
 * @param {string} logKey - Key identifier for the log
 * @param {boolean} [init=false] - Whether to initialize metadata if not found
 * @returns {Object|null} Log metadata object or null if not found
 */
async function getBeeLogMeta (logKey, init = false) {
  let meta = await this.meta_logs.get(logKey)

  if (meta) {
    meta = meta.value
  } else {
    if (init) {
      meta = initBeeLogMeta.call(this, logKey)
    }
  }

  return meta
}

/**
 * Safely closes a bee time log and handles any errors
 * @param {Object} log - Log object to release
 * @returns {Promise<void>}
 */
async function releaseBeeTimeLog (log) {
  try {
    await log.close()
  } catch (e) {
    this.debugError(log.discoveryKey.toString('hex'), e)
  }
}

/**
 * Retrieves a bee time log based on key and offset from current position
 * @param {string} logKey - Key identifier for the log
 * @param {number} [offset=0] - Offset from current position
 * @param {boolean} [init=false] - Whether to initialize metadata if not found
 * @returns {Object|null} Log object or null if not found
 */
async function getBeeTimeLog (logKey, offset = 0, init = false) {
  const meta = await getBeeLogMeta.call(this, logKey, init)

  if (!meta) {
    return null
  }

  const point = meta.cur - offset

  if (point < 0) {
    return null
  }

  let log = null

  log = await this.store_s1.getBee(
    {
      name: `${getLogName(logKey)}-${point}`
    },
    { keyEncoding: 'binary', valueEncoding: 'json' }
  )

  if (!log) {
    return null
  }

  try {
    await log.ready()
  } catch (e) {
    console.error(e)
    log = null
  }

  return log
}

/**
 * Rotates logs that have exceeded the configured maximum length
 * @returns {Array} Array of rotated log information [key, metadata, length]
 */
async function rotateLogs () {
  const thingConf = this.conf.thing

  if (!thingConf.logRotateMaxLength) {
    return []
  }

  const stream = this.meta_logs.createReadStream({})

  const res = []

  for await (const chunk of stream) {
    const meta = chunk.value
    const log = await getBeeTimeLog.call(this, chunk.key, 0)

    if (log) {
      if (log.core.length >= thingConf.logRotateMaxLength) {
        await rotateBeeLog.call(this, chunk.key)
        res.push([chunk.key, meta, log.core.length])
        this.logger.debug(`ROTATE: log-key=${chunk.key},cur=${meta.cur},len=${log.core.length}`)
      }

      await releaseBeeTimeLog.call(this, log)
    }
  }

  return res
}

module.exports = {
  rotateLogs,
  getBeeTimeLog,
  releaseBeeTimeLog
}
