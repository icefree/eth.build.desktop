const axios = require('axios');
const { getSocketBaseUrl } = require('../../utils/socketConfig')

function Price() {
  this.addInput("[symbol]","string")
  this.addOutput("","number")
  this.size[0] = 190
  this.symbol = "ETH"
  this.value = null
  this.debouncer = false
  setInterval(this.loadPrice.bind(this),45000)
}

Price.title = "Price";

Price.prototype.onAdded = async function() {
  this.loadPrice()
}


Price.prototype.loadPrice = async function() {
  try{
    //get price
    const baseUrl = await getSocketBaseUrl()
    let result = await axios.get(`${baseUrl}price?symbol=${this.symbol}`)
    const payload = result?.data?.data || result?.data
    if (payload) {
      const symbolKey = (this.symbol || "").toUpperCase()
      const price = payload?.[symbolKey]?.quote?.USD?.price
      if (typeof price !== "undefined") {
        this.value = price
      }
    }
  }catch(e){
    console.log(e)
  }
}

Price.prototype.onExecute = function() {
  let symbol = this.getInputData(0)
  if(typeof symbol != "undefined" && symbol!=this.symbol){
    this.symbol = symbol
    if(this.debouncer) clearTimeout(this.debouncer)
    this.debouncer = setTimeout(this.loadPrice.bind(this),1000)
  }
  this.setOutputData(0,parseFloat(this.value))
};


export default Price
