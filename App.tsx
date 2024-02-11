import { StatusBar } from 'expo-status-bar';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
//import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bufferToBase64URLString, passkeyUtils, utf8StringToBuffer } from "./utils/passkey-utils";
import React from 'react';

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
          {/* <Pressable style={styles.button} onPress={writeBlob}>
  					<Text>Add Blob</Text>
  				</Pressable>*/}
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

