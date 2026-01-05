// Solidity compiler service using solc
// Task 5.1: Compiler service

import solc from "solc";

export interface CompileResult {
  success: boolean;
  abi?: object[];
  bytecode?: string;
  errors?: string[];
}

// OpenZeppelin imports resolver - provides common interfaces
const OPENZEPPELIN_SOURCES: Record<string, string> = {
  "@openzeppelin/contracts/token/ERC20/IERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}`,
  "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IERC20} from "../IERC20.sol";
library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(abi.encodeCall(token.transfer, (to, value)));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transfer failed");
    }
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(abi.encodeCall(token.transferFrom, (from, to, value)));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transferFrom failed");
    }
}`,
  "@openzeppelin/contracts/access/Ownable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
abstract contract Ownable {
    address private _owner;
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(initialOwner);
    }
    modifier onlyOwner() {
        _checkOwner();
        _;
    }
    function owner() public view virtual returns (address) { return _owner; }
    function _checkOwner() internal view virtual {
        if (owner() != msg.sender) revert OwnableUnauthorizedAccount(msg.sender);
    }
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}`,
  "@openzeppelin/contracts/utils/ReentrancyGuard.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    error ReentrancyGuardReentrantCall();
    constructor() { _status = NOT_ENTERED; }
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }
    function _nonReentrantBefore() private {
        if (_status == ENTERED) revert ReentrancyGuardReentrantCall();
        _status = ENTERED;
    }
    function _nonReentrantAfter() private { _status = NOT_ENTERED; }
}`,
};

function findImports(importPath: string): { contents: string } | { error: string } {
  // Handle OpenZeppelin imports
  if (importPath.startsWith("@openzeppelin/")) {
    const source = OPENZEPPELIN_SOURCES[importPath];
    if (source) {
      return { contents: source };
    }
  }
  return { error: `File not found: ${importPath}` };
}

export function compileSolidity(sourceCode: string, contractName: string): CompileResult {
  const input = {
    language: "Solidity",
    sources: {
      "contract.sol": { content: sourceCode },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode"] },
      },
    },
  };

  try {
    const output = JSON.parse(
      solc.compile(JSON.stringify(input), { import: findImports })
    );

    // Check for errors
    const errors = output.errors?.filter((e: { severity: string }) => e.severity === "error");
    if (errors?.length > 0) {
      return {
        success: false,
        errors: errors.map((e: { formattedMessage: string }) => e.formattedMessage),
      };
    }

    // Get compiled contract
    const contracts = output.contracts?.["contract.sol"];
    if (!contracts || !contracts[contractName]) {
      return {
        success: false,
        errors: [`Contract "${contractName}" not found in compiled output`],
      };
    }

    const contract = contracts[contractName];
    return {
      success: true,
      abi: contract.abi,
      bytecode: "0x" + contract.evm.bytecode.object,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Compilation failed"],
    };
  }
}
