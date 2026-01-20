import React from 'react';
import { getLocalIpfs, getLocalIpfsStatus } from '../../lib/ipfs/localNode';

function IPFSPub() {
  this.addInput("[channel]","string")
  this.addInput("message", "string");
  this.addInput("publish", -1);
  this.properties = { channel: "ipfs.eth.build"};
  this.size[0] = 240
  this.status = "waiting for local ipfs"
}

IPFSPub.title = "IPFSPublish";

IPFSPub.prototype.onAdded = async function() {
  this.title_color = "#dddddd";
  this.refreshIpfs();
};

IPFSPub.prototype.refreshIpfs = function() {
  const localIpfs = getLocalIpfs();
  if (!localIpfs) {
    const info = getLocalIpfsStatus();
    this.status = info.starting ? "local ipfs starting" : "Please start local IPFS first";
    this.ipfs = null;
    return false;
  }
  this.ipfs = localIpfs;
  this.title_color = "#eeee44";
  this.status = "local ipfs ready";
  return true;
};

IPFSPub.prototype.onExecute = async function() {
  let channel = this.getInputData(0)
  if(channel && this.properties.channel!==channel){
      this.properties.channel = channel

  }
  if (!this.ipfs) {
    this.refreshIpfs();
  }
}

IPFSPub.prototype.onAction = async function() {
  let data = this.getInputData(1)
  if(typeof data !== "undefined" && data != null){
    try{
      if (!this.ipfs && !this.refreshIpfs()) {
        console.warn("IPFS not started, please start local IPFS node first");
        return;
      }
      console.log("publishing",data,"to",this.properties.channel)
      this.ipfs.pubsub.publish(this.properties.channel, data)
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
        <div style={{paddingTop:6, fontSize:12, opacity:0.8}}>
          {this.status}
        </div>
      </div>
    )
  }
};

export default IPFSPub
