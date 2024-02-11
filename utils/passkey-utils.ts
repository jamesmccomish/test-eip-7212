import * as passkey from "react-native-passkeys";
import base64 from "@hexagon/base64";
import {
    Base64URLString,
    PublicKeyCredentialUserEntityJSON,
} from "@simplewebauthn/typescript-types";
import { Buffer } from 'buffer';

// ! Mostly taken from https://github.com/peterferguson/react-native-passkeys/blob/main/example/src/app/index.tsx

export function bufferToBase64URLString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = "";

    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }

    const base64String = btoa(str);

    return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function utf8StringToBuffer(value: string): ArrayBuffer {
    return new TextEncoder().encode(value);
}

export function toBuffer(
    base64urlString: Base64URLString,
    from: 'base64' | 'base64url' = 'base64url',
): Uint8Array {
    const _buffer = base64.toArrayBuffer(base64urlString, from === 'base64url')
    return new Uint8Array(_buffer)
}

export const getRAndSFromSignature = (signature: ArrayBuffer) => {
    // Convert signature from ASN.1 sequence to "raw" format
    const usignature = new Uint8Array(signature)
    const hexSig = usignature.reduce((acc, i) => acc + i.toString(16).padStart(2, '0'), '')

    const r = hexSig.substring(4, 68); // Start at index  4, end at index  68
    const s = hexSig.substring(68, 132); // Start at index  68, end at index  132

    console.log("r:", r);
    console.log("s:", s);

    return { r, s }
}

// Basic test setup
const rp = {
    id: undefined,
    name: "ReactNativePasskeys",
} satisfies PublicKeyCredentialRpEntity;

// Don't do this in production!
const challenge = bufferToBase64URLString(utf8StringToBuffer("fizz"));

const user = {
    id: bufferToBase64URLString(utf8StringToBuffer("290283490")),
    displayName: "username",
    name: "username",
} satisfies PublicKeyCredentialUserEntityJSON;

const authenticatorSelection = {
    userVerification: "required",
    residentKey: "required",
} satisfies AuthenticatorSelectionCriteria;

const bufferToHex = (buffer: ArrayBuffer) => {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

const base64UrlToArrayBuffer = (base64Url: string): ArrayBuffer => {
    // Replace '-' with '+' and '_' with '/' to get the standard Base64 format
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if necessary
    const padding = base64.length % 4;
    if (padding) {
        base64 += '='.repeat(4 - padding);
    }

    // Decode the Base64 string to a byte array
    const binaryString = window.atob(base64);

    // Create a new ArrayBuffer and a Uint8Array view on it
    const arrayBuffer = new ArrayBuffer(binaryString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    // Fill the Uint8Array with the byte values from the binary string
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    return arrayBuffer;
}

// ? See https://github.dev/0xjjpa/passkeys-is/blob/main/src/lib/passkey.ts#L37
const importPublicKeyAsCryptoKey = async (publicKey: ArrayBuffer): Promise<CryptoKey | null> => {
    try {
        const key = await crypto.subtle.importKey(
            // The getPublicKey() operation thus returns the credential public key as a SubjectPublicKeyInfo. See:
            // https://w3c.github.io/webauthn/#sctn-public-key-easy
            // crypto.subtle can import the spki format:
            // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
            "spki", // "spki" Simple Public Key Infrastructure rfc2692
            publicKey,
            {
                // these are the algorithm options
                // await cred.response.getPublicKeyAlgorithm() // returns -7
                // -7 is ES256 with P-256 // search -7 in https://w3c.github.io/webauthn
                // the W3C webcrypto docs:
                // https://www.w3.org/TR/WebCryptoAPI/#informative-references (scroll down a bit)
                // ES256 corrisponds with the following AlgorithmIdentifier:
                name: "ECDSA",
                namedCurve: "P-256",
                hash: { name: "SHA-256" }
            },
            true, //whether the key is extractable (i.e. can be used in exportKey)
            ["verify"] //"verify" for public key import, "sign" for private key imports
        );
        return key;
    } catch (e) {
        console.error(e);
        return null;
    }
}

const getXandY = async (pk) => {
    let jwkKey;
    try {
        jwkKey = await window.crypto.subtle.exportKey('jwk', pk);
    } catch (err) {
        console.error('Failed to export key:', err);
        return;
    }
    if (jwkKey) {
        // ! can jwkKey.x and jwkKey.y be used as is?
        const xBuffer = Buffer.from(jwkKey.x, 'base64');
        const xHex = xBuffer.toString('hex');

        const yBuffer = Buffer.from(jwkKey.y, 'base64');
        const yHex = yBuffer.toString('hex');

        console.log("(🔑,ℹ️) X Point Public Key", xHex);
        console.log("(🔑,ℹ️) Y Point Public Key", yHex);

        return { x: xHex, y: yHex };
    }
}

export const passkeyUtils = () => {
    const createPasskey = async () => {
        try {
            const json = await passkey.create({
                challenge,
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                rp,
                user,
                authenticatorSelection,
                extensions: { largeBlob: { support: "required" } },
            });

            const pk = await importPublicKeyAsCryptoKey(json?.publicKey);
            const { x, y } = await getXandY(pk);

            return {
                rawId: json?.rawId,
                pk: `0x${[x, y].join('').replaceAll('0x', '')}`,
                x,
                y
            }
        } catch (e) {
            console.error("create error", e);
        }
    };

    const signR1WithPasskey = async ({ credentialId }: { credentialId: string }) => {
        const passkeyResponse = await passkey.get({
            rpId: undefined,
            challenge,
            ...(credentialId && {
                allowCredentials: [{ id: credentialId, type: "public-key" }],
            }),
        });

        const {
            response: {
                signature,
                authenticatorData: rawAuthenticatorData,
                clientDataJSON: rawClientDataJSON,
            },
        } = passkeyResponse

        console.log('sign passkey response', { signature, rawAuthenticatorData, rawClientDataJSON })

        // ---------------- getting full signed message ----------------
        // convert base64url responses to ArrayBuffer
        const authenticatorDataAsUint8Array = new Uint8Array(base64UrlToArrayBuffer(rawAuthenticatorData));
        const clientDataHashAsUint8Array = new Uint8Array(await crypto.subtle.digest("SHA-256", base64UrlToArrayBuffer(rawClientDataJSON)));

        // combine into signed message
        const signedData = new Uint8Array(authenticatorDataAsUint8Array.length + clientDataHashAsUint8Array.length);
        signedData.set(authenticatorDataAsUint8Array);
        signedData.set(clientDataHashAsUint8Array, authenticatorDataAsUint8Array.length);

        console.log('auth response data', { signedData, authenticatorDataAsUint8Array, clientDataHashAsUint8Array })
        // ----------------

        // ---------------- checking the returned client data ----------------
        const utf8Decoder = new TextDecoder('utf-8');
        const decodedClientData = utf8Decoder.decode(
            toBuffer(rawClientDataJSON, 'base64url'))
        const clientDataObj = JSON.parse(decodedClientData);

        console.log({ decodedClientData, clientDataObj })
        // ----------------

        // This is the hash of the message that was signed
        const messageHash = await crypto.subtle.digest(
            { name: "SHA-256" },
            new TextEncoder().encode("fizz")
            //base64UrlToArrayBuffer(challenge)
        );
        const messageHex = bufferToHex(messageHash);

        console.log({
            messageHash,
            messageHex,
            message: utf8Decoder.decode(base64UrlToArrayBuffer(challenge)) // in this test case, "fizz"
        })

        const { r, s } = getRAndSFromSignature(Buffer.from(signature))

        return { r, s, hash: messageHex };
    };

    return { signR1WithPasskey, createPasskey };
    //return createPasskey;

}
