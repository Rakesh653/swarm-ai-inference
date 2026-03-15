# Hyperswarm AI Inference Skeleton

**Overview**

This repository extends the existing worker-based architecture to demonstrate a decentralized AI inference platform over Hyperswarm RPC. It is intentionally minimal but designed to make distributed system decisions explicit in code and documentation.

**Architecture Summary**

- Client sends inference requests to Gateway via Hyperswarm RPC.
- Gateway validates input and forwards to Router.
- Router discovers workers using the DHT and load-balances requests.
- Stateless workers run local "model" functions and return responses.

**How Hyperswarm RPC Works Here**

- Services join Hyperswarm topics and exchange discovery messages.
- Router and workers join `ai-workers` for decentralized worker discovery.
- Gateway and router join `ai-routers` for decentralized router discovery.
- RPC requests are sent directly to peer public keys discovered through the swarm.

**Repository Structure**

- `workers/`: BaseWorker + gateway/router/worker implementations.
- `lib/`: shared utilities (discovery, registry, rpc, codec, logger).
- `models/`: dummy model inference functions.
- `services/`: routing and gateway logic.
- `tests/`: vitest unit tests.
- `docs/architecture.md`: system architecture and diagrams.

**Setup**

1. Install dependencies:

```bash
npm install
```

2. Copy example config files:

```bash
bash setup-config.sh
```

Optional config overrides live in `config/common.json`:
- `rpcTimeoutMs`: RPC timeout in milliseconds.
- `rpcRetries`: retry count for RPC calls.
- `routingStrategy`: `round_robin` or `random`.

**Run Services**

Start the services in separate terminals. The worker CLI is provided by `bfx-svc-boot-js` (exported from `worker.js`). Use the worker type name that matches the file in `workers/`.

1. Start router:

```bash
node worker.js --wtype router --env development --rack router-1
```

2. Start gateway:

```bash
node worker.js --wtype gateway --env development --rack gateway-1
```

3. Start workers (scale horizontally by running multiple instances):

```bash
node worker.js --wtype text_inference --env development --rack text-1
node worker.js --wtype image_inference --env development --rack image-1
```

Each service logs its `rpcPublicKey`. Use the Gateway key to run the client.
If you see Windows/OneDrive file lock errors, pass a temp store directory:

```bash
node worker.js --wtype gateway --env development --rack gateway-1 --storeDir %TEMP%\\wrk-base-demo\\gateway-1
```

**Dev Runner (Quick Smoke Test)**

Start a router, gateway, and one instance of each worker:

```bash
npm run dev
```

Override counts:

```bash
npm run dev -- --routers 1 --gateways 1 --text 2 --image 1
```

Specify an environment:

```bash
npm run dev -- --env development
```

Auto-run a client request once the gateway is ready:

```bash
npm run dev -- --run-client --client-model sentiment --client-input "I love this"
```

**Run Client**

```bash
node client.js "Hello world" --model sentiment --gateway <GATEWAY_RPC_KEY>
```

**Run Tests**

```bash
npm test
```

**Example Inference Request**

```bash
node client.js "I love this" --model sentiment --gateway <GATEWAY_RPC_KEY>
```

Example response:

```json
{
  "ok": true,
  "result": {
    "ok": true,
    "model": "sentiment",
    "result": {
      "input": "I love this",
      "sentiment": "positive",
      "score": 1
    },
    "workerId": "text-12345"
  }
}
```

**Scaling Notes**

- Run multiple worker processes to scale horizontally.
- Router automatically discovers new workers and balances requests.
- Workers remain stateless; no shared storage is required for inference.

For more detail, see `docs/architecture.md`.
