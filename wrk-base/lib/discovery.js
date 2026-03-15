'use strict'

const { topicFromName } = require('./topics')

function createDiscovery (options) {
  const swarm = options.swarm
  const role = options.role
  const info = options.info || {}
  const logger = options.logger
  const onHello = options.onHello
  const onDisconnect = options.onDisconnect
  const topics = normalizeTopics(options.topics || options.topic)

  const topicKeys = topics.map(topic => topicFromName(topic))

  for (const topicKey of topicKeys) {
    swarm.join(topicKey, { server: true, client: true })
  }

  swarm.on('connection', (socket, details) => {
    const peerKey = details && details.publicKey ? details.publicKey.toString('hex') : 'unknown'
    if (logger) {
      logger.info({ topics, peerKey, client: details.client }, 'swarm connection')
    }

    const hello = JSON.stringify({
      type: 'hello',
      topics,
      role,
      info,
      rpcPublicKey: info.rpcPublicKey,
      ts: Date.now()
    }) + '\n'

    socket.write(hello)

    let buffer = ''

    socket.on('data', data => {
      buffer += data.toString()
      let index = buffer.indexOf('\n')
      while (index !== -1) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        if (line) {
          try {
            const message = JSON.parse(line)
            if (message.type === 'hello' && onHello) {
              onHello(message, details)
            }
          } catch (err) {
            if (logger) logger.warn({ err: err.message }, 'failed to parse discovery message')
          }
        }
        index = buffer.indexOf('\n')
      }
    })

    socket.on('error', err => {
      if (logger) logger.warn({ err: err.message, peerKey }, 'swarm socket error')
    })

    socket.on('close', () => {
      if (onDisconnect) onDisconnect(details)
    })
  })

  if (swarm.flush) swarm.flush().catch(err => {
    if (logger) logger.warn({ err: err.message }, 'swarm flush failed')
  })

  return {
    topics,
    topicKeys
  }
}

function normalizeTopics (value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(topic => String(topic))
  return [String(value)]
}

module.exports = {
  createDiscovery
}
