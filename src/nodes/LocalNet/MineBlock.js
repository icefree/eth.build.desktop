import { mineBlock } from '../../hooks/useTauri';

// Mine Block 节点 - 触发手动挖矿
export function MineBlock() {
  this.color = '#627eea';
  this.size = [120, 60];

  this.addProperty('block count', 1);

  this.addInput('trigger', -1);
  this.addOutput('block', 'object');

  this.widgets_up = true;
}

MineBlock.prototype.onExecute = async function() {
  if (this.getInputData(0)) {
    try {
      const count = this.properties['block count'] || 1;

      for (let i = 0; i < count; i++) {
        const block = await mineBlock();
        this.setOutputData(0, block);
        this.trigger('mined', block);
      }

      this.boxcolor = '#cfc';
      this.graph?.setDirtyCanvas(true, true);
    } catch (error) {
      console.error('Failed to mine block:', error);
      this.boxcolor = '#fcc';
      this.graph?.setDirtyCanvas(true, true);
    }
  }
};

MineBlock.title = 'Mine Block';
MineBlock.desc = 'Manually mine a new block';
MineBlock.category = 'LocalNet';

export default MineBlock;
