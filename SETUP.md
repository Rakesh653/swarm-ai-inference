# Setup

## Introduction

This document guides you through setting up and running the main components: `app-node`, `wrk-ork`, and `wrk-book`.

To set up the initial configuration for these workers, first run:

```bash
./setup-config.sh
```

Workers are run using `bfx-svc-boot-js`. The entry point is `worker.js`, which loads the specific worker code (e.g., from `workers/xyz.wrk.js`). See the [`bfx-svc-boot-js`](https://github.com/bitfinexcom/bfx-svc-boot-js) repository for details.

## Requirements  

- **Node.js v18.x**
- **npm** (for package management)

### `wrk-book`

A worker service responsible for managing books. Multiple instances of this worker can run and be registered with the orchestrator.

#### Steps

2. Since we are linking tpl-wrk-thing from a local directory, we need to run `npm install` for tpl-wrk-thing first.
3. Run `npm install` to install project dependencies.
4. Run the command `./setup-config.sh` to set up the initial configuration.
5. Once installation and initial configuration are complete, start the worker using the following command:

    ```bash
    node worker.js --wtype wrk-book-rack --env development --debug true --rack <RACK_ID>
    ```

    > **Note:** Replace `<RACK_ID>` with the actual rack ID

    Examples:

    For server with <RACK_ID> equal to: `25d0c2e5-3d14-4975-bddf-b836bdf3842a`:

    ```bash
    node worker.js --wtype wrk-book-rack --env development --debug true --rack 25d0c2e5-3d14-4975-bddf-b836bdf3842a
    ```


### `wrk-ork`

A worker service that acts as an orchestrator for other worker services. Requires `node.js` and `npm`.

#### Steps

2. Run `npm install` to install all project dependencies.
3. Run the command `./setup-config.sh` to set up the initial configuration.
4. Once installation and initial configuration are complete, start the worker:

    ```bash
    node worker.js --wtype wrk-ork-proc-aggr --env development --cluster <CLUSTER_NUMBER>
    ```

    > **Note:** Replace `<CLUSTER_NUMBER>` with the actual cluster number.  

    Example:

    ```bash
    node worker.js --wtype wrk-ork-proc-aggr --env development --cluster 1
    ```

5. Register `wrk-book` instances (racks) with the orchestrator. Use the following RPC call for each rack:

    ```bash
    npx hp-rpc-cli -s <ORK_RPC_KEY> -m registerRack -d '{"id": <RACK_ID>,"type": "<TYPE>", "info": {"rpcPublicKey": <WRK_BOOK_RPC_KEY>}}' -t 1000000
    ```

    > **Note:**  
    >
    > - Replace `<ORK_RPC_KEY>` with the actual RPC key for the ork (this worker).  
    > - Replace `<RACK_ID>` with the ID of the rack we want to register.  
    > - Replace `<WRK_BOOK_RPC_KEY>` with the RPC key of the rack being registered.
    > - Replace `<TYPE>` with the type of the rack (e.g., `book` for `wrk-book`).

    Examples:

    For server with <RACK_ID> equal to: `25d0c2e5-3d14-4975-bddf-b836bdf3842a`, 
    and <ORK_RPC_KEY> equal to: `d3445aae5c8c623e3771a75b780d29a3ae1d1e0f9737a38bc1b22f65e5b73683`, 
    and <TYPE> equal to: `book`
    and <WRK_BOOK_RPC_KEY> equal to: `f32ee1c2454864fda56b040d4f13b86d5d4eed38c78929eff57afc4228afbf94`:

    ```bash
    npx hp-rpc-cli -s d3445aae5c8c623e3771a75b780d29a3ae1d1e0f9737a38bc1b22f65e5b73683 -m registerRack -d '{"id":"25d0c2e5-3d14-4975-bddf-b836bdf3842a","type": "book", "info": {"rpcPublicKey": "f32ee1c2454864fda56b040d4f13b86d5d4eed38c78929eff57afc4228afbf94"}}' -t 1000000
    ```
---

### `app-node`

This service facilitates communication between the user interface (frontend) and the worker services. Requires `node.js` and `npm`.

#### Steps

2. Run `npm install` to install all project dependencies.
3. Run the command `./setup-config.sh` to set up the initial configuration.
4. Configure the service:
   - Collect the RPC **public key** of the `wrk-ork` worker.
   - Choose a secure `signUpSecret`.
   - Update the `config/common.json` file with these values:

    ```diff
    {
    "debug": 0,
    +  "signUpSecret": "test_123", // replace with your signup secret
    -  "signUpSecret": "SIGN_UP_SECRET",
    "orks": {
        "cluster-1": {
    +      "rpcPublicKey": "d3445aae5c8c623e3771a75b780d29a3ae1d1e0f9737a38bc1b22f65e5b73683" // replace with your ork rpc public key
    -      "rpcPublicKey": "RPC_PUBLIC_KEY"
        }
    },
    "signUpRoles": [
        "customer",
        "librarian"
    ]
    }
    ```

5. Once installation and configuration are complete, start the service:

    ```bash
    node worker.js --wtype wrk-node-http --env production --port 3000
    ```

---
