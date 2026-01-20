const solc = require('solc')

let input = ''

process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', () => {
  try {
    const payload = input ? JSON.parse(input) : {}

    const compileInput = payload.language
      ? payload
      : {
          language: 'Solidity',
          sources: payload.sources || {},
          settings: payload.settings || {
            outputSelection: {
              '*': {
                '*': ['*'],
              },
            },
          },
        }

    const output = JSON.parse(solc.compile(JSON.stringify(compileInput)))

    process.stdout.write(JSON.stringify(output))
  } catch (error) {
    process.stderr.write(`Failed to compile: ${error.message}\n`)
    process.exit(1)
  }
})

process.stdin.on('error', (error) => {
  process.stderr.write(`Failed to read input: ${error.message}\n`)
  process.exit(1)
})
