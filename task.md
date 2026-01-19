# Control Panel: Block Explorer + Tx Detail + Faucet + Reset

## Goals

- Add a Block Explorer inside the Control Panel.
- Block list shows: block number + transaction hash (at least one hash per row; full list in details).
- Click a block to open block details (includes full transaction hash list).
- Click a transaction hash to open transaction details.
- Add a "Reset Network" action implemented as stop + start.
- Add a Faucet action (default 10 ETH, user can modify amount).
- Pagination: default page size = 20.
- Add a search box (supports block number and tx hash).
- Increase Control Panel width to fit tables.

## Assumptions

- "Search" input accepts either:
  - block number (decimal integer), or
  - transaction hash (0x + 64 hex chars).

## Phase 1 (Backend / Tauri)

- [x] Add Tauri commands for block browsing:
  - [x] `get_blocks(page: Option<u64>, page_size: Option<u64>) -> Vec<BlockSummary>`
  - [x] `get_block_by_number(number: u64) -> Option<BlockDetail>`
- [x] Extend Rust types:
  - [x] `BlockSummary` (number, hash, timestamp, transaction_count)
  - [x] `BlockDetail` (BlockSummary + tx_hashes: Vec<String>)
- [x] Implement block queries in `src-tauri/src/ethereum/local_network.rs` using ethers Provider:
  - [x] Determine latest block
  - [x] Compute range for pagination (newest-first)
  - [x] Fetch block headers and tx hash lists (for details)
- [x] Implement Faucet for local Anvil:
  - [x] Send an actual value-transfer tx from a funded default Anvil account to target address
  - [x] Return real tx hash
  - [x] Validate address + amount input

## Phase 2 (Frontend: Components)

- [x] Add a Block Explorer UI component for Control Panel:
  - [x] Block list table + pagination (default 20)
  - [x] Search box (block number / tx hash)
  - [x] Block detail modal/panel with tx hash list
  - [x] Tx detail modal/panel (reuse existing TxExplorer logic where possible)
- [x] Add a Faucet UI section in Control Panel:
  - [x] Default amount = 10 ETH (editable)
  - [x] Input: address
  - [x] Show tx hash on success

## Phase 3 (Control Panel Integration)

- [x] Add "Reset Network" button:
  - [x] Implementation: stopLocalNetwork() then startLocalNetwork() with existing config
  - [x] Disable while busy; surface errors
- [x] Add Block Explorer entry inside Control Panel (only when network is running)
- [x] Increase Control Panel width to better fit tables (responsive constraints preserved)

## Phase 4 (Quality)

- [ ] Basic manual test plan:
  - [ ] Start network
  - [ ] Faucet 10 ETH to a new address; verify a tx appears
  - [ ] Block list updates; block detail shows tx hashes
  - [ ] Clicking a tx hash opens tx detail
  - [ ] Search by block number works
  - [ ] Search by tx hash works
  - [ ] Reset network clears history (new chain) and UI refreshes
