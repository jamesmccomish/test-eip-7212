import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { passkeys } from "./utils/passkeys";
import React from 'react';
import { client } from "./utils/viem-client";

export default function App() {
  const insets = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }

  const P256VERIFY_ADDRESS = '0x0000000000000000000000000000000000000100' // p256verify precompile
  const DUMMY_ADDRESS = '0x0000000000000000000000000000000000000111' // dummy address for call

  const { createPasskey, signR1WithPasskey } = passkeys();

  const [passkeyResult, setPasskeyResult] = React.useState({});
  const [signatureResult, setSignatureResult] = React.useState({});
  const [callResult, setCallResult] = React.useState(undefined);
  const [credentialId, setCredentialId] = React.useState("");

  const handleCreatePasskey = async () => {
    try {
      const passkey = await createPasskey();
      console.log("creation json -", passkey);

      if (passkey?.rawId) setCredentialId(passkey.rawId);
      setPasskeyResult(passkey);
    } catch (e) {
      console.error("create error", e);
    }
  }

  const handleSignR1WithPasskey = async () => {
    const sigData = await signR1WithPasskey({ credentialId });
    console.log("signature response -", { ...sigData });

    setSignatureResult({
      ...sigData,
      combined: `${sigData.hash}${sigData.r}${sigData.s}${passkeyResult?.pk.substr(2)}`
    });
  }

  const handleCallPrecompile = async () => {
    console.log({
      ...signatureResult,
      ...passkeyResult
    })

    const callResult = await client.call({
      account: DUMMY_ADDRESS,
      data: `0x${signatureResult?.combined}`, // combined hash, r, s, x, y
      to: P256VERIFY_ADDRESS
    })
    console.log("call result -", callResult);

    setCallResult(callResult?.data ?? 'failed');
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fccefe" }}>
      <ScrollView
        style={{
          paddingTop: "10%",
          marginBottom: "10%",
        }}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.title}>Testing EIP-7212</Text>
        <br />
        <br />
        <Text style={styles.infoText}>The introduction of {" "}
          <Text
            onPress={() => Linking.openURL("https://eips.ethereum.org/EIPS/eip-7212")}
            style={{ textDecorationLine: "underline" }}
          >
            this EIP
          </Text>
          {" "} allows for signature verifications on the secp256r1 curve</Text>
        <br />
        <Text style={styles.infoText}>This opens up the possibility for passkeys to control contract wallets, with comparable gas costs to standard Ethereum secp256k1 signatures</Text>
        <br />
        <Text style={styles.infoText}>The below example, built using{" "}
          <Text
            onPress={() => Linking.openURL("https://github.com/peterferguson/react-native-passkeys")}
            style={{ textDecorationLine: "underline" }}
          >
            react-native-passkeys
          </Text>
          {" "}lets you create a passkey, sign a test message, and call the precompile</Text>
        <View style={styles.buttonContainer}>
          <Pressable style={styles.button} onPress={handleCreatePasskey}>
            <Text>Create</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleSignR1WithPasskey}>
            <Text>Sign</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleCallPrecompile}>
            <Text>Call</Text>
          </Pressable>
        </View>
        {passkeyResult.x &&
          <>
            <Text>Your new passkey</Text>
            <br />
            <Text style={styles.resultText}>X: {passkeyResult.x}</Text>
            <Text style={styles.resultText}>Y: {passkeyResult.y}</Text>
            <br />
          </>
        }
        {signatureResult.r &&
          <>
            <Text>Created this signature</Text>
            <br />
            <Text style={styles.resultText}>Signature R: {signatureResult.r}</Text>
            <Text style={styles.resultText}>Signature S: {signatureResult.s}</Text>
            <Text style={styles.resultText}>Hash: {signatureResult.hash}</Text>
            <br />
          </>
        }
        {callResult && (callResult !== 'failed' ?
          <>
            <Text>And successfully called P256VERIFY!</Text>
            <br />
            <Text style={styles.resultText}>Call Result: {callResult}</Text>
            <br />
          </> :
          <Text>Has failed to verify :/</Text>)
        }
      </ScrollView>
      <Text
        style={{
          textAlign: "center",
          position: "absolute",
          bottom: insets.bottom + 16,
          left: 0,
          right: 0,
        }}
      >
        Code on{" "}
        <Text
          onPress={() => Linking.openURL("https://github.com/jamesmccomish/test-eip-7212")}
          style={{ textDecorationLine: "underline" }}
        >
          Github
        </Text>
      </Text>
    </View >
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: "90%",
  },
  resultText: {
    maxWidth: "90%",
  },
  buttonContainer: {
    padding: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 4,
    justifyContent: "space-evenly",
  },
  button: {
    backgroundColor: "#fff",
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    width: "45%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
});

