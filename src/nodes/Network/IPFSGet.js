import { getLocalIpfs, getLocalIpfsStatus } from '../../lib/ipfs/localNode';

function IPFSGet() {
  this.addInput("path","string");
  this.addInput("get",-1);
  this.addOutput("data","string");
  this.properties = { };
  this.size[0] = 230
  this.size[1] = 70
  this.status = "waiting for local ipfs"

}

IPFSGet.title = "IPFSDownload";

IPFSGet.prototype.onAdded = async function() {
  this.title_color = "#dddddd";
  this.status = "waiting for local ipfs";
  this.refreshIpfs();
};

IPFSGet.prototype.refreshIpfs = function() {
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

IPFSGet.prototype.onAction = async function() {
  let path = this.getInputData(0)
  if(typeof path !== "undefined" && path != null) {
    try{
        if (!this.ipfs && !this.refreshIpfs()) {
          console.warn("IPFS 未启动，请先启动 IPFS 节点");
          return;
        }
        const results = []
        for await (const result of this.ipfs.cat(path)) {
          results.push(Buffer.from(result).toString('utf-8'))
        }
        this.data = results[0] 
      }catch(e){console.log(e)}
  }
}

IPFSGet.prototype.onExecute = async function() {
  if (!this.ipfs) {
    this.refreshIpfs();
  }
  this.setOutputData(0,this.data)
}

export default IPFSGet
