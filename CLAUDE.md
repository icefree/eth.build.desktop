# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ETH.Build is an educational sandbox for Web3 built as a drag-and-drop visual programming environment. It uses a node-based interface (powered by LiteGraph.js) where users can connect visual blocks to learn about Ethereum concepts like hashing, key pairs, transactions, smart contracts, and blockchain mechanics.

## Development Commands

### Setup and Running
```bash
# Install dependencies (use exact versions from lockfile, ignore engine warnings)
yarn install --frozen-lockfile --ignore-engines

# Start development server (requires increased memory allocation)
yarn start

# Build for production (requires increased memory allocation)
yarn build

# Run tests
yarn test
```

### Environment Requirements
- Node: v14.17.5 (recommended)
- Yarn: 1.22.5
- Note: The project uses `--max_old_space_size=8192` for both start and build scripts due to memory-intensive operations

## Architecture Overview

### Core Technologies
- **React** (v16.9.0): Main UI framework
- **LiteGraph.js**: Node-based visual programming engine (custom fork: `grahamtallen/litegraph.js`)
- **Web3.js**: Ethereum interaction
- **Material-UI**: Component library for dialogs and UI elements
- **React DnD**: Drag-and-drop functionality for the interface

### Application Structure

#### Entry Point Flow
1. `src/index.js` - React app initialization
2. `src/App.js` - Main application component containing:
   - LiteGraph canvas initialization
   - Touch event handlers for mobile support
   - Menu/dialog management (save, load, QR code)
   - Library of lesson templates (`src/data/lessons`)
   - Graph serialization/deserialization with URL compression (using `json-url` with LZW codec)

#### Node System Architecture

All visual programming blocks are implemented as LiteGraph nodes organized in `src/nodes/` by category:

**Primary Node Categories:**
- **Components/** - High-level Ethereum components (MetaMask, Wallet, Uniswap, ENS, ERC20Token, etc.)
- **Crypto/** - Cryptographic operations (Hash, KeyPair, Sign, Encrypt, Decrypt, Recover, Mnemonic)
- **Web3/** - Ethereum blockchain interactions (Contract, Transaction, Block, Balance, SendTransaction, Call, Compile)
- **Input/** - User input nodes (Text, Number, etc.)
- **Display/** - Visualization nodes (Watch, Hash display, Transaction display)
- **Control/** - Flow control (Timer, etc.)
- **Math/** - Mathematical operations and hex conversions
- **String/** - String manipulation
- **Object/** - Object property access and manipulation
- **Network/** - HTTP requests and network operations
- **Storage/** - Variable storage and state management
- **Utils/** - Utility functions (To Float, etc.)
- **Special/** - Special-purpose nodes
- **System/** - System-level operations
- **Events/** - Event handling

#### Custom Node Framework (`src/CustomNodes.js`)

This file provides the node extension system with helper functions:
- `addHelpers(obj)` - Adds common functionality to node prototypes
- `parseContract()` - Automatically generates function outputs for smart contract ABIs
- Dynamic output generation based on contract ABI structure
- Distinguishes between view/pure functions (returns data) vs state-changing functions

**Smart Contract Node Pattern:**
Nodes with a `prototype.abi` property automatically parse the ABI and create:
- Static outputs (defined by `this.staticOutputs` index)
- Dynamic function outputs for each ABI function
- Different output types: `contractCall` for view functions, `contractFunction` for transactions

#### Modules System (`src/Modules/`)

Reusable subgraph modules that can be embedded in the main graph:
- `account.js` - Account-related functionality
- `price.js` - Price feed module (includes example of Timer + Request + parsing pattern)

Global modules are stored in `global.modules` and can contain complete subgraphs with their own nodes and links.

### LiteGraph Node Lifecycle (from `notes.txt`)

**Key Properties:**
- `title`, `pos`, `size` - Basic node metadata
- `input|output` - Connection definitions with name, type, pos, direction, links
- `properties` - Node-specific configuration
- `flags.collapsed` - Collapse state

**Important Callbacks:**
- `onAdded` - Called when added to graph (before configuration when loading)
- `onRemoved` - When removed from graph
- `onExecute` - Main execution logic
- `onConfigure` - Called after node is configured
- `onConnectionsChange` - When connections are added/removed
- `onDrawForeground` - Custom rendering inside node
- `parseContract` - Custom callback for smart contract nodes with ABIs

### Data Serialization

Graphs are serialized to JSON and compressed using LZW codec (`json-url` library) for:
- URL sharing (graphs can be loaded from URL parameters)
- Save/load functionality via dialogs
- QR code generation for mobile sharing

### Touch Support

Custom touch event handlers in `App.js` convert touch events to mouse events for LiteGraph compatibility:
- Prevents scroll during touchmove (except when library is open)
- Maps touchstart/touchmove/touchend to mousedown/mousemove/mouseup

## Key Files

- `src/App.js` - Main application with LiteGraph canvas and UI management
- `src/CustomNodes.js` - Node helper system and smart contract ABI parsing
- `src/nodes/` - All visual programming node implementations
- `src/Modules/` - Reusable module definitions
- `src/data/lessons.js` - Pre-built tutorial/example graphs
- `sandbox.js` - Sandbox utilities for contract deployment
- `deploySandbox.js` - Deployment scripts
- `Ledger.js` - Ledger integration utilities

## Development Patterns

### Creating New Nodes

1. Create a new file in the appropriate `src/nodes/[Category]/` directory
2. Import and extend LiteGraph node base
3. Export with proper naming convention (e.g., `Components/MetaMask`)
4. Add to category index file if needed
5. For smart contract nodes, define `prototype.abi` to enable auto-parsing

### Working with Smart Contract Nodes

Smart contract nodes automatically generate function outputs from ABIs:
- Set `this.abi` in the node prototype
- Define `this.staticOutputs` to mark where dynamic outputs begin
- The `parseContract()` helper will create outputs for all ABI functions
- View/pure functions use type `contractCall`, others use `contractFunction`

### Graph Serialization Format

Graphs use LiteGraph's native JSON format containing:
- `nodes[]` - Array of node definitions with id, type, pos, size, inputs, outputs, properties
- `links[]` - Array of connections between nodes
- `groups[]` - Visual groupings
- `config` - Graph-level configuration

## Notes

- The project uses a custom fork of LiteGraph.js from `grahamtallen/litegraph.js#master`
- Memory settings are critical: both start and build commands use `--max_old_space_size=8192`
- Touch event handling is global and crucial for mobile support
- Many Web3 integrations (MetaMask, WalletConnect, Portis, Torus, Fortmatic, Burner wallets)
- IPFS integration via `ipfs-core` for decentralized storage
- Solidity compilation happens in-browser via `solc` modules
