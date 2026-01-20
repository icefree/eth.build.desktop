import { getNetworkStatus } from '../../hooks/useTauri';

// Block Height node - displaying current block height
export function BlockHeight() {
  this.color = '#627eea';
  this.size = [140, 60];

  this.addProperty('auto refresh', true);
  this.addProperty('refresh interval', 5000);

  this.addOutput('height', 'number');
  this.addOutput('hash', 'string');

  this.widgets_up = true;
  this.blockHeight = 0;
  this.blockHash = '';
}

BlockHeight.prototype.onAdded = function() {
  this.refreshBlock();
  if (this.properties['auto refresh']) {
    this.startAutoRefresh();
  }
};

BlockHeight.prototype.onRemoved = function() {
  this.stopAutoRefresh();
};

BlockHeight.prototype.refreshBlock = async function() {
  try {
    const status = await getNetworkStatus();
    if (status && status.is_running) {
      // TODO: 从 RPC 获取实际区块高度
      this.blockHeight = 0;
      this.blockHash = '';
    }
    this.setOutputData(0, this.blockHeight);
    this.setOutputData(1, this.blockHash);
    this.graph?.setDirtyCanvas(true, true);
  } catch (error) {
    console.error('Failed to get block height:', error);
  }
};

BlockHeight.prototype.startAutoRefresh = function() {
  const interval = this.properties['refresh interval'] || 5000;
  this.refreshInterval = setInterval(() => {
    this.refreshBlock();
  }, interval);
};

BlockHeight.prototype.stopAutoRefresh = function() {
  if (this.refreshInterval) {
    clearInterval(this.refreshInterval);
    this.refreshInterval = null;
  }
};

BlockHeight.prototype.onDrawForeground = function(ctx) {
  if (this.flags.collapsed) return;

  ctx.font = '12px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText(`Height: ${this.blockHeight}`, 10, 35);

  if (this.blockHash) {
    const shortHash = `${this.blockHash.slice(0, 8)}...${this.blockHash.slice(-6)}`;
    ctx.fillText(`Hash: ${shortHash}`, 10, 50);
  }
};

BlockHeight.title = 'Block Height';
BlockHeight.desc = 'Display current block height';
BlockHeight.category = 'LocalNet';

export default BlockHeight;
