// 测试 Solidity 0.8.x 编译器
const solc = require('solc');

// 简单的 Solidity 0.8 合约示例
const sourceCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;

    event ValueChanged(uint256 newValue);

    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}
`;

const input = {
  language: 'Solidity',
  sources: {
    'SimpleStorage.sol': {
      content: sourceCode,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
};

console.log('Testing Solidity 0.8.33 compiler...');
console.log('Source code:', sourceCode);

const output = JSON.parse(solc.compile(JSON.stringify(input)));

console.log('\nCompilation output:');
console.log(JSON.stringify(output, null, 2));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  const warnings = output.errors.filter(e => e.severity === 'warning');

  if (errors.length > 0) {
    console.error('\n❌ Compilation errors:', errors);
  } else {
    console.log('\n⚠️  Warnings:', warnings);
  }
}

if (output.contracts) {
  console.log('\n✅ Compilation successful!');
  console.log('Contracts:', Object.keys(output.contracts));

  if (output.contracts['SimpleStorage.sol']) {
    const contract = output.contracts['SimpleStorage.sol']['SimpleStorage'];
    console.log('\nSimpleStorage contract:');
    console.log('- ABI:', contract.abi ? 'Generated' : 'Not found');
    console.log('- Bytecode:', contract.evm ? contract.evm.bytecode.object : 'Not found');
  }
}
