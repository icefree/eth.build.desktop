import React from 'react';
import { getLocalIpfs, getLocalIpfsStatus } from '../../lib/ipfs/localNode';

function IPFSSub() {
  this.addInput("[channel]","string")
  this.addOutput("message", "string")
  this.addOutput("received", -1)
  this.properties = { channel: "ipfs.eth.build"};
  this.size[0] = 280
  this.history = null
  this.message = null
  this.status = "waiting for local ipfs"
  this.subscribedChannel = null
  this.onReceiveMsgBound = null
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
    await this.ensureSubscribed();
  } catch (err) {
    this.status = "subscribe failed";
    console.log(err);
  }
};

IPFSSub.prototype.refreshIpfs = function() {
  const localIpfs = getLocalIpfs();
  if (!localIpfs) {
    const info = getLocalIpfsStatus();
    this.status = info.starting ? "local ipfs starting" : "local ipfs offline";
    this.ipfs = null;
    this.subscribedChannel = null;
    return false;
  }
  if (this.ipfs !== localIpfs) {
    this.ipfs = localIpfs;
    this.subscribedChannel = null;
  }
  this.title_color = "#eeee44";
  this.status = "local ipfs ready";
  return true;
};

IPFSSub.prototype.ensureSubscribed = async function() {
  if (!this.refreshIpfs()) return false;
  if (!this.onReceiveMsgBound) {
    this.onReceiveMsgBound = this.onReceiveMsg.bind(this);
  }
  if (this.subscribedChannel === this.properties.channel) {
    return true;
  }
  try {
    if (this.subscribedChannel) {
      await this.ipfs.pubsub.unsubscribe(this.subscribedChannel, this.onReceiveMsgBound).catch(() => null);
    }
    await this.ipfs.pubsub.subscribe(this.properties.channel, this.onReceiveMsgBound);
    this.subscribedChannel = this.properties.channel;
    this.status = "subscribed";
    return true;
  } catch (err) {
    this.status = "subscribe failed";
    console.log(err);
    return false;
  }
};

IPFSSub.prototype.onExecute = function() {
  let channel = this.getInputData(0)
  if(channel && this.properties.channel!==channel){
      this.onPropertyChanged("channel",channel)
  }
  if (!this.ipfs) {
    this.ensureSubscribed().catch(() => null);
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
  if (name === "channel") {
    this.ensureSubscribed().catch(() => null);
  }
  return true;
};

export default IPFSSub
