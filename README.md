# EIP-7212 Test
This repo demonstrates how a passkey can be used to interact with the new `P256VERIFY` precompile deployed to address `0x0000000000000000000000000000000000000100` (currently on Mumbai testnet).

The [EIP](https://eips.ethereum.org/EIPS/eip-7212) allows for verification of P256 signatures for 3450 gas, comparable to the 3000 gas required for the `ECRECOVER` precompile.

The passkey handling was managed using [react-native-passkeys](https://github.com/peterferguson/react-native-passkeys)