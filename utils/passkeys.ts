import * as passkey from "react-native-passkeys";
import {
    PublicKeyCredentialUserEntityJSON,
} from "@simplewebauthn/typescript-types";
import { Buffer } from 'buffer';
import { bufferToBase64URLString, utf8StringToBuffer, importPublicKeyAsCryptoKey, getXandY, base64UrlToArrayBuffer, toBuffer, getRAndSFromSignature, bufferToHex } from "./passkey-utils";

// ! Mostly taken from https://github.com/peterferguson/react-native-passkeys/blob/main/example/src/app/index.tsx

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

export const passkeys = () => {
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

            const pk = await importPublicKeyAsCryptoKey(new Uint8Array(json?.publicKey));
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
            signedData.buffer
        );
        const messageHex = bufferToHex(messageHash);

        const { r, s } = getRAndSFromSignature(Buffer.from(signature, 'base64'))

        return { r, s, hash: messageHex };
    };

    return { signR1WithPasskey, createPasskey };
}
