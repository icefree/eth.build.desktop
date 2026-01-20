import React from 'react';
const { createIpfsClient } = require('./ipfsClient')

function IPFSSub() {
  this.addInput("[channel]","string")
  this.addOutput("message", "string")
  this.addOutput("received", -1)
  this.properties = { channel: "ipfs.eth.build"};
  this.size[0] = 280
  this.history = null
  this.message = null
  this.status = "connecting..."
}

IPFSSub.title = "IPFSSubscribe";

IPFSSub.prototype.onReceiveMsg = async function(msg) {
  console.log(msg)
  this.message = Buffer.from(msg.data).toString('utf-8')
  console.log("this.message is now",this.message)
  this.trigger("received",this.message)
}

IPFSSub.prototype.onAdded = async function() {
  this.title_color = "#dddddd";
  try {
    this.ipfs = createIpfsClient()
    const { id, agentVersion, protocolVersion } = await this.ipfs.id()
    console.log("IPFS FOR SUBSCRIBE!", id, agentVersion, protocolVersion)
    console.log("IPFS SUBSCRIBING TO ", this.properties.channel)
    await this.ipfs.pubsub.subscribe(
      this.properties.channel,
      this.onReceiveMsg.bind(this)
    )
    console.log("IPFS SUBSCRIBED")
    this.title_color = "#eeee44";
    this.status = "connected"
  } catch (e) {
    console.log(e)
    this.title_color = "#ff6666";
    this.status = "error"
  }
};

IPFSSub.prototype.onExecute = function() {
  let channel = this.getInputData(0)
  if(channel && this.properties.channel!==channel){
      this.onPropertyChanged("channel",channel)
  }
  this.setOutputData(0,this.message)
}

IPFSSub.prototype.onDrawBackground = function(ctx) {
  if (this.flags.collapsed) {
    this.destory()
  }else{
    this.render(
      <div>
        <div style={{opacity:0.5}}>
          {this.properties.channel}
        </div>
        <div style={{padding:6}}>
          {this.status}
        </div>
      </div>
    )
  }
};

IPFSSub.prototype.onPropertyChanged = function(name, value) {
  console.log("PROP CHANGE",name,value)
  this.properties[name] = value;
  return true;
};

export default IPFSSub
