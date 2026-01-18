import { setAutoMine } from '../../hooks/useTauri';

// Auto Mine 节点 - 控制自动挖矿
export function AutoMine() {
  this.color = '#627eea';
  this.size = [140, 80];

  this.addProperty('enabled', false, 'boolean');
  this.addProperty('interval (ms)', 5000, 'number');

  this.addInput('enable', 'boolean');
  this.addInput('interval', 'number');
  this.addOutput('status', 'string');

  this.widgets_up = true;
}

AutoMine.prototype.onExecute = async function() {
  const enabledInput = this.getInputData(0);
  const intervalInput = this.getInputData(1);

  const enabled = enabledInput !== undefined ? enabledInput : this.properties.enabled;
  const interval = intervalInput !== undefined ? intervalInput : this.properties['interval (ms)'];

  if (enabled !== this.lastEnabled || interval !== this.lastInterval) {
    try {
      await setAutoMine(enabled, interval);
      this.lastEnabled = enabled;
      this.lastInterval = interval;
      this.setOutputData(0, enabled ? 'Auto mining' : 'Manual mining');

      this.boxcolor = enabled ? '#cfc' : '#ccc';
      this.graph?.setDirtyCanvas(true, true);
    } catch (error) {
      console.error('Failed to set auto mine:', error);
      this.boxcolor = '#fcc';
      this.graph?.setDirtyCanvas(true, true);
    }
  }
};

AutoMine.prototype.onDrawForeground = function(ctx) {
  if (this.flags.collapsed) return;

  const enabled = this.getInputData(0) !== undefined
    ? this.getInputData(0)
    : this.properties.enabled;

  ctx.font = '12px Arial';
  ctx.fillStyle = enabled ? '#3c3' : '#999';
  ctx.fillText(enabled ? '● Auto Mining' : '○ Manual Mining', 10, 35);
};

AutoMine.title = 'Auto Mine';
AutoMine.desc = 'Control automatic mining';
AutoMine.category = 'LocalNet';

export default AutoMine;
