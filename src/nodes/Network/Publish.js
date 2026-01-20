import React from 'react';
import ReactDOM from 'react-dom'

import socketIOClient from "socket.io-client";
const { getSocketBaseUrl, getSocketBaseUrlSync, onSocketConfigChange } = require('../../utils/socketConfig')

function Publish() {
  this.addInput("[channel]","string")
  this.addInput("message", "string");
  this.addInput("publish", -1);
  this.properties = { channel: "network.eth.build", network: getSocketBaseUrlSync() };
  this.size[0] = 240
  this.socket = socketIOClient(this.properties.network);
  this.loadedNetwork = this.properties.network
  this.syncNetworkFromConfig()
  onSocketConfigChange(({ baseUrl }) => {
    this.updateNetwork(baseUrl)
  })
}

Publish.title = "Publish";

Publish.prototype.onExecute = async function() {
  let channel = this.getInputData(0)
  if(channel && this.properties.channel!=channel){
      this.properties.channel = channel
  }
  if(this.properties.network!=this.loadedNetwork){
    this.loadedNetwork = this.properties.network
    this.socket = socketIOClient(this.properties.network);
  }
}

Publish.prototype.syncNetworkFromConfig = async function() {
  const network = await getSocketBaseUrl()
  this.updateNetwork(network)
}

Publish.prototype.updateNetwork = function(network) {
  if(network && network !== this.properties.network){
    this.properties.network = network
    this.loadedNetwork = network
    this.socket = socketIOClient(network)
  }
}

Publish.prototype.onAction = async function() {
  console.log("SENDING TO ",this.properties.channel)
  let message = this.getInputData(1)
  if(typeof message != "undefined" && message!=null){
    this.socket.emit("eth.build", this.properties.channel, message)
  }
}

Publish.prototype.onDrawBackground = function(ctx) {
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

export default Publish
