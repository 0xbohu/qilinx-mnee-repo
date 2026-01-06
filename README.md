# Overview

Welcome to the Qilinx MNEE platform documentation. Qilinx is an autonomous agent platform for MNEE ecosystem, with build in tools for users and developer to access both BSV and Ethereum chains.

**Live Demo:** [https://qilinx-mnee-dashboard.vercel.app/](https://qilinx-mnee-dashboard.vercel.app/)

**Demo Video:** [https://youtu.be/g-CItDWVK3Y](https://youtu.be/g-CItDWVK3Y)

**Documentation:** [https://bo0.gitbook.io/qilinx-mnee/](https://bo0.gitbook.io/qilinx-mnee/)

<figure><img src="https://1192796973-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnjX1SqrLbXMbnnif6JRT%2Fuploads%2FogAjFTIzg42J8yvAoadT%2FScreenshot%202026-01-05%20at%206.46.22%E2%80%AFPM.png?alt=media&#x26;token=87e6a482-a241-4e7f-b1f9-3aaf045fe2ad" alt=""><figcaption></figcaption></figure>

## Applications

Qilinx solution includes three applications

<table><thead><tr><th>Application</th><th>Url</th><th width="306.1953125">Desc</th><th>Github</th></tr></thead><tbody><tr><td><strong>Qilinx MNEE Dashboard</strong></td><td><a href="https://qilinx-mnee-dashboard.vercel.app/">https://qilinx-mnee-dashboard.vercel.app</a></td><td>Dashboard application for user and developers to access autonomous agents, chats, wallets and building tools</td><td><a href="https://github.com/0xbohu/qilinx-mnee-repo/">https://github.com/0xbohu/qilinx-mnee-repo/</a></td></tr><tr><td><strong>Qilinx MNEE MCP Server</strong></td><td><a href="https://qilin-mcp-mnee.vercel.app/api/mcp">https://qilin-mcp-mnee.vercel.app/api/mcp</a></td><td><p></p><p>MCP server for interacting with MNEE BSV wallets and activities</p><p></p></td><td><a href="https://github.com/0xbohu/qilinx-mcp-mnee-repo/">https://github.com/0xbohu/qilinx-mcp-mnee-repo/</a></td></tr><tr><td><strong>Qilin MNEE Payemnt Gateway</strong></td><td><a href="https://mnee-payment-gateway.vercel.app/">https://mnee-payment-gateway.vercel.app/</a></td><td>A payment-as-service Middleware application for external system to integrate with MNEE Ethereum Payment contracts to accept MNEE token as onchain payment </td><td><a href="https://github.com/0xbohu/qilinx-mnee-payment-repo/">https://github.com/0xbohu/qilinx-mnee-payment-repo/</a></td></tr></tbody></table>

## Key Technologies

* **MNEE Token** - The native token used across the platform for payments and DeFi operations, support both Mainnet and Sepolia testnet on Ethereum, BSV chain productin and sandbox environment
* **Vercel SDK/AI-SDK/AI Elements:** For building applications, chats and agents UI and backend services
* **Neon PostgreSQL Database**: for relational database, authentication
* **MCP (Model Context Protocol)** - Enables external tool integration with the AI chat
* **Web3 Wallet integration** - Ethereum wallet integration for contract deployment and DApp interactions
* **Gemini 3 models** - Google Gemini 3 models power the conversational AI and autonomous agent capabilities, enable logical thinking and decision making of AI agents
* **Redis** - caching services
* **Vercel Blob Storage** - storing unstructured data

## Smart Contracts

Mainnet [MNEE Token](https://etherscan.io/token/0x8ccedbae4916b79da7f3f612efb2eb93a2bfd6cf?a=0x4240781a9ebdb2eb14a183466e8820978b7da4e2#code) Contract by MNEE team

```
# MNEE Ethereum Mainnet Contract
0x772DDa9B82c99Dd9F4d47ACBe2405F89A1440509
```

Below Sepolia Testnet contracts are created by Qilinx team for testing purpose

Sepolia [Testnet MNEE Token](https://sepolia.etherscan.io/address/0x772DDa9B82c99Dd9F4d47ACBe2405F89A1440509#code) Contract

```
# MNEE Sepolia Testnet Contract
0x772DDa9B82c99Dd9F4d47ACBe2405F89A1440509
```

Sepolia Testnet [Payment Contract](https://sepolia.etherscan.io/address/0x587cc79827DCB69d73E9e2d776fCadd0a1A66559#code)

```
# Sepolia Testnet Payment Contract
0x587cc79827DCB69d73E9e2d776fCadd0a1A66559
```

Sepolia Testnet [Staking Contract](https://sepolia.etherscan.io/tx/0x2b58372a0a6c528f68f026655871c87166d8eb5567dd42db3bc5b0c25e0a0648)

```
# Sepolia Testnet Payment Contract
0x2b58372a0a6c528f68f026655871c87166d8eb5567dd42db3bc5b0c25e0a0648
```