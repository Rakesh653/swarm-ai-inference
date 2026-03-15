'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { encodeJson, decodeJson } = require('./lib/codec')
const { createLogger } = require('./lib/logger')

const logger = createLogger('client', process.env.LOG_LEVEL || 'info')

const args = process.argv.slice(2)
let model = process.env.MODEL || 'sentiment'
let gatewayKey = process.env.GATEWAY_KEY

const inputParts = []

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--model') {
    model = args[i + 1]
    i += 1
    continue
  }
  if (arg === '--gateway') {
    gatewayKey = args[i + 1]
    i += 1
    continue
  }
  inputParts.push(arg)
}

const input = inputParts.join(' ').trim()

if (!input) {
  console.log('Usage: node client.js "Hello world" --model sentiment --gateway <rpcPublicKey>')
  process.exit(1)
}

if (!gatewayKey) {
  console.error('Missing gateway public key. Set GATEWAY_KEY or pass --gateway <hex>')
  process.exit(1)
}

async function main () {
  const dht = new DHT()
  const rpc = new RPC({ dht })

  try {
    const response = await rpc.request(Buffer.from(gatewayKey, 'hex'), 'infer', encodeJson({
      input,
      model
    }))

    const parsed = decodeJson(response)
    console.log(JSON.stringify(parsed, null, 2))
  } catch (err) {
    logger.error({ err: err.message }, 'client request failed')
    process.exitCode = 1
  } finally {
    await rpc.destroy()
    await dht.destroy()
  }
}

main()
