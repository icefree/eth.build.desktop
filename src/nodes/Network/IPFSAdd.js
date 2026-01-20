import { getLocalIpfs, getLocalIpfsStatus } from '../../lib/ipfs/localNode';

function IPFSAdd() {
  this.addInput("data","string");
  this.addInput("add", -1);
  this.addOutput("path","string");
  this.properties = { };
  this.size[0] = 200
  this.size[1] = 70
  this.status = "waiting for local ipfs"
}

IPFSAdd.title = "IPFSUpload";

IPFSAdd.prototype.onAdded = async function() {
  this.title_color = "#dddddd";
  this.status = "waiting for local ipfs";
  this.refreshIpfs();
};

IPFSAdd.prototype.refreshIpfs = function() {
  const localIpfs = getLocalIpfs();
  if (!localIpfs) {
    const info = getLocalIpfsStatus();
    this.status = info.starting ? "local ipfs starting" : "请先启动 IPFS 节点";
    this.ipfs = null;
    return false;
  }
  this.ipfs = localIpfs;
  this.title_color = "#eeee44";
  this.status = "local ipfs ready";
  return true;
};

IPFSAdd.prototype.onExecute = async function() {
  if (!this.ipfs) {
    this.refreshIpfs();
  }
  this.setOutputData(0,this.path)
}

IPFSAdd.prototype.onAction = async function() {
  let data = this.getInputData(0)
  if(typeof data !== "undefined" && data != null){
    try{
      if (!this.ipfs && !this.refreshIpfs()) {
        console.warn("IPFS 未启动，请先启动 IPFS 节点");
        return;
      }
      let result = await this.ipfs.add(data)
      this.path = result.cid.toString()
      this.dataSize = result.size
    }catch(e){
      console.log(e)
    }
  }
}

export default IPFSAdd
