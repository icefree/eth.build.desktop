# Solidity 编译器升级说明

## 版本信息

- **旧版本**: solc 0.6.1
- **新版本**: solc 0.8.33
- **升级日期**: 2025-01-18

## 主要变化

### 1. API 变化
solc 0.8.x 使用新的标准 JSON 编译 API,与 0.6.x 主要区别:

#### 0.6.x 旧 API
```javascript
const result = solc.compile(JSON.stringify(input));
```

#### 0.8.x 新 API
```javascript
const input = {
  language: 'Solidity',
  sources: {
    'Contract.sol': {
      content: sourceCode
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
```

### 2. 编译输出格式
0.8.x 返回的输出结构更加详细:
```json
{
  "contracts": {
    "Contract.sol": {
      "ContractName": {
        "abi": [...],
        "evm": {
          "bytecode": {
            "object": "0x..."
          }
        }
      }
    }
  },
  "sources": {...},
  "errors": [...]
}
```

### 3. 错误处理
0.8.x 引入了错误严重性级别:
- `error`: 严重错误,编译失败
- `warning`: 警告,不影响编译

## 新特性

### Solidity 0.8.x 新增特性

1. **更严格的类型检查**
   - 算术运算溢出检查默认开启
   - 更精确的类型推断

2. **改进的元数据**
   - 更好的合约文档生成
   - 改进的 NATSPEC 文档

3. **优化的 gas 使用**
   - 更高效的代码生成
   - 内联汇编优化

4. **新的语言特性**
   - `error` 类型定义自定义错误
   - `unchecked` 块用于无检查运算
   - 用户定义运算符

## 使用示例

### 标准编译
```javascript
const input = {
  language: 'Solidity',
  sources: {
    'SimpleStorage.sol': {
      content: `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;

        contract SimpleStorage {
            uint256 private value;

            function setValue(uint256 _value) public {
                value = _value;
            }

            function getValue() public view returns (uint256) {
                return value;
            }
        }
      `
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
```

### 带 EVM 版本
```javascript
const input = {
  language: 'Solidity',
  sources: {...},
  settings: {
    evmVersion: 'paris',
    outputSelection: {...}
  }
};
```

### 带优化器
```javascript
const input = {
  language: 'Solidity',
  sources: {...},
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {...}
  }
};
```

## 服务配置

### 默认端口
- **端口**: 48452
- **协议**: HTTPS (开发环境可使用 HTTP)

### 启动服务
```bash
cd solc
npm install
npm start
```

### API 端点
- **POST**: `/` - 编译 Solidity 代码
- **GET**: `/` - 服务信息

### 请求示例
```bash
curl -X POST http://localhost:48452/ \
  -H "Content-Type: application/json" \
  -d '{
    "sources": {
      "Contract.sol": {
        "content": "pragma solidity ^0.8.0; contract Test {}"
      }
    }
  }'
```

## 兼容性

### 前端代码
前端 `Compile.js` 节点已经使用了新 API,无需修改。

### 旧合约代码
如果使用 0.6.x 编写的合约代码,需要注意:
1. 构造函数必须使用 `constructor()` 关键字
2. 显式类型转换 (例如 `uint256(x)` 代替 `x`)
3. 检查溢出行为的变更

## 测试

运行测试验证编译器功能:
```bash
cd solc
node test-0.8.js
```

## 迁移指南

### 从 0.6.x 迁移到 0.8.x

1. **更新 pragma**
   ```solidity
   // 旧
   pragma solidity ^0.6.0;

   // 新
   pragma solidity ^0.8.0;
   ```

2. **构造函数**
   ```solidity
   // 旧
   function Contract(uint256 value) public {}

   // 新
   constructor(uint256 value) {}
   ```

3. **显式转换**
   ```solidity
   // 旧
   uint256 x = 100;

   // 新 (推荐)
   uint256 x = uint256(100);
   ```

4. **溢出检查**
   ```solidity
   // 0.8.x 默认检查溢出
   // 如需禁用,使用 unchecked 块
   unchecked {
     x += 1;
   }
   ```

## 常见问题

### Q: 编译失败,提示版本不匹配?
**A**: 确保 `pragma solidity ^0.8.0;` 与编译器版本一致。

### Q: 如何禁用溢出检查?
**A**: 使用 `unchecked` 块包裹相关运算代码。

### Q: 如何优化 gas 使用?
**A**: 在编译输入中启用优化器:
```javascript
settings: {
  optimizer: {
    enabled: true,
    runs: 200
  }
}
```

## 参考资源

- [Solidity 0.8.0 发布说明](https://blog.soliditylang.org/2020/12/16/solidity-v0.8.0-release-announcement/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [solc 标准 JSON API](https://docs.soliditylang.org/en/latest/using-the-compiler/#compiler-api)

## 维护

- **更新依赖**: `npm update solc`
- **检查版本**: `npm list solc`
- **测试**: `node test-0.8.js`
