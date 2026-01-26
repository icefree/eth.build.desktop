const axiosParent = require('axios').default;
const https = require('https')
const { invoke } = require('../../lib/tauri-api')
const axios = axiosParent.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const hasTauriInvoke = () => {
  if (typeof window === 'undefined') return false
  return Boolean(
    window.__TAURI__?.core?.invoke ||
    window.__TAURI__?.invoke ||
    window.__TAURI_INTERNALS__?.invoke
  )
}

function Compile() {
  this.addInput("name","string")
  this.addInput("solidity","string")
  this.addInput("compile",-1)
  this.addOutput("bytecode","string")
  this.addOutput("abi","object")
//  this.properties = { host: "http://localhost", port:"48452" };
  this.size[0] = 210
}

Compile.title = "Compile";


Compile.prototype.onExecute = function() {
  let name = this.getInputData(0)
  let solidity = this.getInputData(1)
  if(name && solidity && (solidity!=this.solidity || name!=this.name)){
    this.solidity = solidity
    this.name = name
    this.compile(name)
  }

  this.setOutputData(0,this.bytecode?"0x"+this.bytecode:this.bytecode)
  this.setOutputData(1,this.abi)
};

Compile.prototype.onAction = function() {
  let name = this.getInputData(0)
  let solidity = this.getInputData(1)
  if(name && solidity){
    this.properties.solidity = solidity
    this.compile(name)
  }
}

Compile.prototype.compile = function(name) {
  let dependencies = {}

  console.log("this.properties.solidity",this.properties.solidity)
  dependencies[name+".sol"] = {content: this.properties.solidity};

  console.log("dependencies",dependencies)
  let solcObject = {
    language: 'Solidity',
    sources: dependencies,
    settings: {
      outputSelection: {
            '*': {
                '*': [ '*' ]
            }
      },
    }
  }

  console.log(" 🛠️  Compiling...",solcObject.sources)

  const compileRequest = hasTauriInvoke()
    ? invoke('compile_solidity', { input: solcObject })
    : axios.post('http://localhost:48452/',solcObject).then((response) => response.data)

  compileRequest.then((compiled) => {
    //console.log("response.data",response.data)
    this.properties.compiled = compiled

    //console.log("COMPILED:",this.properties.compiled)
    if(this.properties.compiled.errors && this.properties.compiled.errors[0] && this.properties.compiled.errors[0].message){
      console.log("ERRORS:",this.properties.compiled.errors)
      for(let e in this.properties.compiled.errors){
        if(this.properties.compiled.errors[e].type != "Warning"){
          global.setSnackbar({msg:this.properties.compiled.errors[e].formattedMessage})
          break;
        }
      }
    }

    let fileKey = name + ".sol";
    let compiledFile = this.properties.compiled.contracts[fileKey];
    let compiledContractObject;

    if (compiledFile) {
      // 优先尝试使用输入的 name 查找合约
      if (compiledFile[name]) {
        compiledContractObject = compiledFile[name];
      } else {
        // 如果找不到，取该文件下的第一个合约
        let contractNames = Object.keys(compiledFile);
        if (contractNames.length > 0) {
          compiledContractObject = compiledFile[contractNames[0]];
          console.log("⚠️ Contract name mismatch, using the first contract found:", contractNames[0]);
        }
      }
    }

    if(compiledContractObject && compiledContractObject.evm ) {
      this.bytecode = compiledContractObject.evm.bytecode.object
      this.abi = compiledContractObject.abi
      global.setSnackbar({msg:"✅ Compiled",color:"#64cb53"})
    } else {
      console.error("❌ Failed to find contract or EVM data in compiled output for:", fileKey);
    }
  })
  .catch(function (error) {
    console.log(error);
  });




}

export default Compile
