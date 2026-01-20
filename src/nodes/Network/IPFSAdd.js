const { createIpfsClient } = require('./ipfsClient')

function IPFSAdd() {
  this.addInput("data","string");
  this.addInput("add", -1);
  this.addOutput("path","string");
  this.properties = { };
  this.size[0] = 200
  this.size[1] = 70
}

IPFSAdd.title = "IPFSUpload";

IPFSAdd.prototype.onAdded = async function() {
  this.title_color = "#dddddd";
  try {
    this.ipfs = createIpfsClient()
    const { id, agentVersion, protocolVersion } = await this.ipfs.id()
    console.log("IPFS FOR ADD!", id, agentVersion, protocolVersion)
    this.title_color = "#eeee44";
  } catch (e) {
    console.log(e)
    this.title_color = "#ff6666";
  }
};

IPFSAdd.prototype.onExecute = async function() {
  this.setOutputData(0,this.path)
}

IPFSAdd.prototype.onAction = async function() {
  let data = this.getInputData(0)
  if(typeof data !== "undefined" && data != null){
    try{
      let result = await this.ipfs.add(data)
      this.path = result.cid.toString()
      this.dataSize = result.size
    }catch(e){
      console.log(e)
    }
  }
}

export default IPFSAdd
