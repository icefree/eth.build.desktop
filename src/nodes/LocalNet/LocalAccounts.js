import { getAccounts } from '../../hooks/useTauri';

// Accounts 节点 - 获取账户列表
export function LocalAccounts() {
  this.color = '#627eea';
  this.size = [180, 100];

  this.addProperty('include private keys', false, 'boolean');

  this.addInput('refresh', -1);
  this.addOutput('accounts', 'array');
  this.addOutput('count', 'number');

  this.accounts = [];
}

LocalAccounts.prototype.onExecute = async function() {
  if (this.getInputData(0) || this.accounts.length === 0) {
    try {
      const accounts = await getAccounts();
      this.accounts = accounts;
      this.setOutputData(0, accounts);
      this.setOutputData(1, accounts.length);
      this.trigger('accounts_loaded', accounts);
      this.graph?.setDirtyCanvas(true, true);
    } catch (error) {
      console.error('Failed to get accounts:', error);
      this.boxcolor = '#fcc';
      this.graph?.setDirtyCanvas(true, true);
    }
  }
};

LocalAccounts.prototype.onDrawForeground = function(ctx) {
  if (this.flags.collapsed) return;

  ctx.font = '12px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText(`Accounts: ${this.accounts.length}`, 10, 30);

  if (this.accounts.length > 0) {
    ctx.fillText('First account:', 10, 50);
    ctx.fillStyle = '#627eea';
    ctx.font = '11px monospace';
    const shortAddr = this.accounts[0].address.slice(0, 10);
    ctx.fillText(shortAddr + '...', 10, 65);
  }
};

LocalAccounts.title = 'Local Accounts';
LocalAccounts.desc = 'Get local test accounts';
LocalAccounts.category = 'LocalNet';

export default LocalAccounts;
