import IPFS from 'ipfs-core';

let ipfsNode = null;
let startPromise = null;
const status = {
  running: false,
  starting: false,
  error: null,
  nodeId: null,
};

const buildLocalOptions = () => ({
  repo: 'ipfs-local',
  start: true,
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Addresses: {
      Swarm: [],
    },
    Bootstrap: [],
  },
  libp2p: {
    addresses: {
      listen: [],
    },
    pubsub: {
      emitSelf: true,
    },
  },
});

export const startLocalIpfs = async () => {
  if (ipfsNode) return ipfsNode;
  if (startPromise) return startPromise;

  status.starting = true;
  status.error = null;

  startPromise = (async () => {
    try {
      ipfsNode = await IPFS.create(buildLocalOptions());
      const info = await ipfsNode.id();
      status.nodeId = info?.id || null;
      status.running = true;
      return ipfsNode;
    } catch (err) {
      status.error = err?.message || String(err);
      ipfsNode = null;
      throw err;
    } finally {
      status.starting = false;
      startPromise = null;
    }
  })();

  return startPromise;
};

export const stopLocalIpfs = async () => {
  if (startPromise) {
    await startPromise.catch(() => null);
  }
  if (!ipfsNode) {
    status.running = false;
    status.nodeId = null;
    return;
  }

  try {
    await ipfsNode.stop();
  } finally {
    ipfsNode = null;
    status.running = false;
    status.nodeId = null;
  }
};

export const getLocalIpfs = () => ipfsNode;

export const getLocalIpfsStatus = () => ({
  ...status,
});
