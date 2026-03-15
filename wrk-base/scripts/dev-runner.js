'use strict'

const { spawn } = require('child_process')
const readline = require('readline')
const os = require('os')
const path = require('path')

const args = process.argv.slice(2)

const config = {
  routers: 1,
  gateways: 1,
  text: 1,
  image: 1,
  logLevel: process.env.LOG_LEVEL || 'info',
  runClient: false,
  clientModel: 'sentiment',
  clientInput: 'I love this',
  clientDelayMs: 1000,
  env: process.env.NODE_ENV || 'development'
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--routers') {
    config.routers = Number(args[i + 1] || '1')
    i += 1
    continue
  }
  if (arg === '--gateways') {
    config.gateways = Number(args[i + 1] || '1')
    i += 1
    continue
  }
  if (arg === '--text') {
    config.text = Number(args[i + 1] || '1')
    i += 1
    continue
  }
  if (arg === '--image') {
    config.image = Number(args[i + 1] || '1')
    i += 1
    continue
  }
  if (arg === '--log-level') {
    config.logLevel = args[i + 1] || config.logLevel
    i += 1
    continue
  }
  if (arg === '--run-client') {
    config.runClient = true
    continue
  }
  if (arg === '--client-model') {
    config.clientModel = args[i + 1] || config.clientModel
    i += 1
    continue
  }
  if (arg === '--client-input') {
    config.clientInput = args[i + 1] || config.clientInput
    i += 1
    continue
  }
  if (arg === '--client-delay-ms') {
    config.clientDelayMs = Number(args[i + 1] || config.clientDelayMs)
    i += 1
    continue
  }
  if (arg === '--env') {
    config.env = args[i + 1] || config.env
    i += 1
    continue
  }
}

const children = []
let clientStarted = false
let gatewayKey = null

function spawnWorker (label, wtype, index) {
  const name = `${label}-${index}`
  const rack = `${wtype}-${index}`
  const storeDir = path.join(os.tmpdir(), 'wrk-base-demo', rack)
  const child = spawn(process.execPath, ['worker.js', '--wtype', wtype, '--env', config.env, '--rack', rack, '--storeDir', storeDir], {
    env: { ...process.env, LOG_LEVEL: config.logLevel },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  prefixOutput(child.stdout, name)
  prefixOutput(child.stderr, `${name}:err`)

  child.on('exit', code => {
    console.log(`[${name}] exited with code ${code}`)
  })

  children.push(child)
}

function prefixOutput (stream, prefix) {
  const rl = readline.createInterface({ input: stream })
  rl.on('line', line => {
    console.log(`[${prefix}] ${line}`)
    handleLine(prefix, line)
  })
}

function handleLine (prefix, line) {
  if (!config.runClient) return
  if (clientStarted) return
  if (!prefix.startsWith('gateway')) return

  const trimmed = line.trim()
  if (!trimmed.startsWith('{')) return

  try {
    const payload = JSON.parse(trimmed)
    if (payload.msg === 'gateway rpc ready' && payload.rpcPublicKey) {
      gatewayKey = payload.rpcPublicKey
      scheduleClient()
    }
  } catch (err) {}
}

function scheduleClient () {
  if (clientStarted) return
  clientStarted = true

  setTimeout(() => {
    spawnClient(gatewayKey)
  }, config.clientDelayMs)
}

function spawnClient (key) {
  if (!key) return
  const child = spawn(process.execPath, [
    'client.js',
    config.clientInput,
    '--model',
    config.clientModel,
    '--gateway',
    key
  ], {
    env: { ...process.env, LOG_LEVEL: config.logLevel },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  prefixOutput(child.stdout, 'client')
  prefixOutput(child.stderr, 'client:err')

  child.on('exit', code => {
    console.log(`[client] exited with code ${code}`)
  })

  children.push(child)
}

function shutdown () {
  for (const child of children) {
    child.kill('SIGINT')
  }
  setTimeout(() => {
    for (const child of children) {
      child.kill('SIGTERM')
    }
  }, 1500)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

for (let i = 0; i < config.routers; i++) spawnWorker('router', 'router', i + 1)
for (let i = 0; i < config.gateways; i++) spawnWorker('gateway', 'gateway', i + 1)
for (let i = 0; i < config.text; i++) spawnWorker('text', 'text_inference', i + 1)
for (let i = 0; i < config.image; i++) spawnWorker('image', 'image_inference', i + 1)

console.log('Dev runner started. Press Ctrl+C to stop all services.')
