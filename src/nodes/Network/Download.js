import React from 'react';
import ReactDOM from 'react-dom'

import axios from "axios";
const { getSocketBaseUrl, buildSocketUrl } = require('../../utils/socketConfig')

function Download() {
  this.addInput("key","string");
  this.addInput("get",-1);
  this.addOutput("data","string");
  this.properties = { };
  this.size[0] = 200
  this.size[1] = 70
}

Download.title = "Download";

Download.prototype.onExecute = function() {
  this.setOutputData(0,this.data)
}

Download.prototype.onAction = async function() {
  let key = this.getInputData(0)
  console.log("KEY",key)
  if(key){
    try{
      console.log("GETtting...")
      const baseUrl = await getSocketBaseUrl()
      const url = `${buildSocketUrl('', baseUrl)}?key=${key}`
      axios.get(url).then((response) => {
        console.log("RESPONSE FROM GET:",response);
        if(response && response.data){
          this.data = response.data.response
        }
      })
    }catch(e){console.log(e)}
  }
}


export default Download
