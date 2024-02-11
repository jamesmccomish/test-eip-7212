import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
//import { useSafeAreaInsets } from "react-native-safe-area-context";
import { passkeyUtils } from "./utils/passkey-utils";
import React from 'react';
import { client } from "./utils/viem-client";

export default function App() {
  //const insets = useSafeAreaInsets();
  const insets = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }

  const { createPasskey, signR1WithPasskey } = passkeyUtils();

  const [passkeyResult, setPasskeyResult] = React.useState();
  const [signatureResult, setSignatureResult] = React.useState({});
  const [callResult, setCallResult] = React.useState({});
  const [credentialId, setCredentialId] = React.useState("");

  const handleCreatePasskey = async () => {
    try {
      const json = await createPasskey();
      console.log("creation json -", json);

      if (json?.rawId) setCredentialId(json.rawId);
      setPasskeyResult(json);
    } catch (e) {
      console.error("create error", e);
    }
  }

  const handleSignR1WithPasskey = async () => {
    const { r, s, hash } = await signR1WithPasskey({ credentialId });
    console.log("signature response -", { r, s, hash });

    setSignatureResult({
      r,
      s,
      hash,
      combined: `${hash}${r}${s}${passkeyResult?.pk.substr(2)}`
    });
  }

  const handleCallPrecompile = async () => {
    const callResult = await client.call({
      account: '0x0000000000000000000000000000000000000111',
      data: `0x${signatureResult?.combined}`,
      //data: `0x${'9e1b8f6e4a810fed210f5fe75fd0727198eea412181a11c5ad199f9d568e8caa594349514355506b464474736a4177516a325f685761546246727074326a5031316b4e76546d327349556b4d304d6e414968414d50464a65735f77496b745458be57b0048332e3b7131cc5fa2994760104c817d321a1e03774576deb4d22582076f6010b6ab330a3b84e906ba3f3924d1ec099b2cffc55a6bc96ab17eaf55b8f'}`,
      // data: `0x${'4cee90eb86eaa050036147a12d49004b6b9c72bd725d39d4785011fe190f0b4da73bd4903f0ce3b639bbbf6e8e80d16931ff4bcf5993d58468e8fb19086e8cac36dbcd03009df8c59286b162af3bd7fcc0450c9aa81be5d10d312af6c66b1d604aebd3099c618202fcfe16ae7770b0c49ab5eadf74b754204a3bb6060e44eff37618b065f9832de4ca6ca971a7a1adc826d0f7c00181a5fb2ddf79ae00b4e10e'}`,
      to: '0x0000000000000000000000000000000000000100'
    })
    console.log("call result -", callResult);

    setCallResult({ data: callResult });
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{
          paddingTop: insets.top,
          backgroundColor: "#fccefe",
          paddingBottom: insets.bottom,
        }}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.title}>Testing Passkeys</Text>
        {credentialId && <Text>User Credential ID: {credentialId}</Text>}
        <View style={styles.buttonContainer}>
          <Pressable style={styles.button} onPress={handleCreatePasskey}>
            <Text>Create</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleSignR1WithPasskey}>
            <Text>Sign Message</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleCallPrecompile}>
            <Text>Call Precompile</Text>
          </Pressable>
        </View>
        {passkeyResult &&
          <>
            <Text style={styles.resultText}>Result {passkeyResult.x}</Text>
            <Text style={styles.resultText}>Result {passkeyResult.y}</Text>
            <Text style={styles.resultText}>Result {passkeyResult.pk}</Text>
          </>
        }
        {signatureResult &&
          <>
            <Text style={styles.resultText}>Signature R: {signatureResult.r}</Text>
            <Text style={styles.resultText}>Signature S: {signatureResult.s}</Text>
            <Text style={styles.resultText}>Hash: {signatureResult.hash}</Text>
            <Text style={styles.resultText}>Combined: {signatureResult.combined}</Text>
          </>
        }
        {callResult &&
          <>
            <Text style={styles.resultText}>Call Result: {JSON.stringify(callResult)}</Text>
          </>
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
        Built using{" "}
        <Text
          onPress={() => Linking.openURL("https://github.com/peterferguson/react-native-passkeys")}
          style={{ textDecorationLine: "underline" }}
        >
          react-native-passkeys
        </Text>
      </Text>
    </View>
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
    marginVertical: "5%",
  },
  resultText: {
    maxWidth: "80%",
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

