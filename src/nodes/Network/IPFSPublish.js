import React from 'react';

const { createIpfsClient } = require('./ipfsClient')

function IPFSPub() {
  this.addInput("[channel]","string")
  this.addInput("message", "string");
  this.addInput("publish", -1);
  this.properties = { channel: "ipfs.eth.build"};
  this.size[0] = 240
}

IPFSPub.title = "IPFSPublish";

IPFSPub.prototype.onAdded = async function() {
  this.title_color = "#dddddd";
  try {
    this.ipfs = createIpfsClient()
    console.log('IPFS (publish) node is ready')
    const { id, agentVersion, protocolVersion } = await this.ipfs.id()
    console.log("IPFS FOR PUBLISH!", id, agentVersion, protocolVersion)
    this.title_color = "#eeee44";
  } catch (e) {
    console.log(e)
    this.title_color = "#ff6666";
  }
};

IPFSPub.prototype.onExecute = async function() {
  let channel = this.getInputData(0)
  if(channel && this.properties.channel!==channel){
      this.properties.channel = channel

  }
}

IPFSPub.prototype.onAction = async function() {
  let data = this.getInputData(1)
  if(typeof data !== "undefined" && data != null){
    try{
      console.log("publishing",data,"to",this.properties.channel)
      await this.ipfs.pubsub.publish(this.properties.channel, data)
    }catch(e){
      console.log(e)
    }

  }
}

IPFSPub.prototype.onDrawBackground = function(ctx) {
  if (this.flags.collapsed) {
    this.destory()
  }else{
    this.render(
      <div>
        <div style={{opacity:0.5}}>
          {this.properties.channel}
        </div>
      </div>
    )
  }
};

export default IPFSPub
