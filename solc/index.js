const express = require('express')
var cors = require('cors')
const solc = require('solc')
const bodyParser = require('body-parser');
const app = express()

const port = 48452

app.use(bodyParser.json());
app.use(cors())

app.post('/', function(request, response){
  console.log("COMPILING...",request.body);      // your JSON
  console.log("SOURCES:",request.body.sources)

  // solc 0.8.x 使用新的 compile API
  // 构建标准 JSON 输入
  const input = {
    language: 'Solidity',
    sources: request.body.sources || {},
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  };

  // 如果有提供 evmVersion,使用它
  if (request.body.settings && request.body.settings.evmVersion) {
    input.settings.evmVersion = request.body.settings.evmVersion;
  }

  // 如果有提供 optimizer,使用它
  if (request.body.settings && request.body.settings.optimizer) {
    input.settings.optimizer = request.body.settings.optimizer;
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  console.log("Compilation result:");
  console.log(output);

  // 检查编译错误
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error("Compilation errors:", errors);
      response.send(output);
      return;
    }
  }

  response.send(output);
});

app.get('/', (req, res) => res.send('solc.eth.build - Solidity 0.8.33'))

app.listen(port, () => console.log(`Solidity compiler v0.8.33 listening on port ${port}!`))
