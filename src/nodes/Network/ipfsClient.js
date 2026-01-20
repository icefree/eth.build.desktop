const { create } = require('ipfs-http-client')

const defaultApiUrl =
  process.env.REACT_APP_IPFS_API_URL || 'http://127.0.0.1:5001'

function createIpfsClient() {
  return create({ url: defaultApiUrl })
}

module.exports = { createIpfsClient, defaultApiUrl }
