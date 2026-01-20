const axios = require('axios');

const url = "https://api.etherscan.io/v2/api"

function Price() {
  this.addInput("[speed]","string")
  this.addInput("[multiplier]","number")
  this.addInput("[apiKey]","string")
  this.addOutput("","number")
  this.size[0] = 190
  this.value = null
  this.speed = "safeLow"
  this.multiplier = 1.03
  this.apiKey = ""
  this.debouncer = false
  this.data = false
  setInterval(this.loadPrice.bind(this),45000)
}

Price.title = "Gas Price";

Price.prototype.onAdded = async function() {
  this.loadPrice()
}


Price.prototype.loadPrice = async function() {
  try{
    //get price
    const apiKey = this.apiKey || process.env.REACT_APP_ETHERSCAN_API_KEY || (typeof window !== "undefined" ? window.ETHERSCAN_API_KEY : "")
    let result = await axios.get(url, {
      params: {
        chainid: 1,
        module: "gastracker",
        action: "gasoracle",
        apikey: apiKey || undefined,
      },
    })
    if(result && result.data && result.data.result){
      this.data = result.data.result
    }
  }catch(e){
    console.log(e)
  }
}

Price.prototype.onExecute = function() {
  let speed = this.getInputData(0)
  if(typeof speed != "undefined" && speed!=this.speed){
    this.speed = speed
    if(this.debouncer) clearTimeout(this.debouncer)
    this.debouncer = setTimeout(this.loadPrice.bind(this),25000)
  }
  let multiplier = this.getInputData(1)
  if(typeof multiplier != "undefined" && multiplier!=this.multiplier){
    this.multiplier = multiplier
    if(this.debouncer) clearTimeout(this.debouncer)
    this.debouncer = setTimeout(this.loadPrice.bind(this),25000)
  }
  let apiKey = this.getInputData(2)
  if(typeof apiKey != "undefined" && apiKey!=this.apiKey){
    this.apiKey = apiKey
    if(this.debouncer) clearTimeout(this.debouncer)
    this.debouncer = setTimeout(this.loadPrice.bind(this),25000)
  }
  if(this.data){
    let priceKey = "SafeGasPrice"
    if(this.speed === "fast") priceKey = "FastGasPrice"
    if(this.speed === "average") priceKey = "ProposeGasPrice"
    if(this.speed === "safeLow") priceKey = "SafeGasPrice"
    this.value = this.data[priceKey]
    if(this.value){
      this.value = parseFloat(this.value)
      this.value *= this.multiplier
    }
  }
  this.setOutputData(0,this.value)
};


export default Price
