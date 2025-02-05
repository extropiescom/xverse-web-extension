import Transport from '@ledgerhq/hw-transport';
import { base64 } from '@scure/base';
import { Transaction } from '@scure/btc-signer';
import AppClient, { WalletPolicy } from 'ledger-bitcoin';
import { createExtendedPubkey, getLeafHash, getTaprootScript } from './utils';

export async function getLedgerTransport(): Promise<Transport> {
  const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then((m) => m.default);
  const transport = (await TransportWebUSB.create()) as Transport;

  return transport;
}

export enum MessageSigningProtocols {
  ECDSA = 'ECDSA',
  BIP322 = 'BIP322',
}

export type SignedMessage = {
  signature: string;
  protocol: MessageSigningProtocols;
};

export type SlashingPolicy = 'Stake / Step 1' | 'Stake / Step 2';

export async function signSlashingPath({
  policyName,
  transport,
  psbt,
  derivationPath,
  isTestnet,
}: {
  policyName: SlashingPolicy;
  transport: Transport;
  psbt: Uint8Array;
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);

  const script = getTaprootScript(psbtBase64)!;
  const leafHash = getLeafHash(script);
  const leafHashT = createExtendedPubkey(
    !isTestnet ? 'Mainnet' : 'Testnet',
    0,
    Buffer.from('00000000', 'hex'),
    0,
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
    Buffer.concat([Buffer.from('02', 'hex'), leafHash]),
  );

  const accountPolicy = new WalletPolicy(policyName, 'tr(@0/**,pk(@1/**))', [
    leafHashT,
    `[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`,
  ]);

  const transaction = Transaction.fromPSBT(psbt);

  const signatures = await app.signPsbt(psbtBase64, accountPolicy, null);
  for (const signature of signatures) {
    const idx = signature[0];
    transaction.updateInput(
      idx,
      {
        tapScriptSig: [
          [
            {
              pubKey: signature[1].pubkey,
              leafHash: signature[1].tapleafHash!,
            },
            signature[1].signature,
          ],
        ],
      },
      true,
    );
  }

  return transaction;
}

export type UnbondingPolicy = 'Unbond' | undefined;

export async function signUnbondingPath({
  policyName = 'Unbond',
  transport,
  psbt,
  derivationPath,
  isTestnet,
}: {
  policyName: UnbondingPolicy;
  transport: Transport;
  psbt: Uint8Array;
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);

  const script = getTaprootScript(psbtBase64)!;
  const leafHash = getLeafHash(script);
  const leafHashT = createExtendedPubkey(
    !isTestnet ? 'Mainnet' : 'Testnet',
    0,
    Buffer.from('00000000', 'hex'),
    0,
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
    Buffer.concat([Buffer.from('02', 'hex'), leafHash]),
  );

  const accountPolicy = new WalletPolicy(policyName, 'tr(@0/**,pk(@1/**))', [
    leafHashT,
    `[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`,
  ]);

  const transaction = Transaction.fromPSBT(psbt);

  const signatures = await app.signPsbt(psbtBase64, accountPolicy, null);
  for (const signature of signatures) {
    const idx = signature[0];
    transaction.updateInput(
      idx,
      {
        tapScriptSig: [
          [
            {
              pubKey: signature[1].pubkey,
              leafHash: signature[1].tapleafHash!,
            },
            signature[1].signature,
          ],
        ],
      },
      true,
    );
  }

  return transaction;
}

export type TimelockPolicy = 'Withdraw' | undefined;

export async function signTimelockPath({
  policyName = 'Withdraw',
  transport,
  psbt,
  derivationPath,
  isTestnet,
}: {
  policyName: TimelockPolicy;
  transport: Transport;
  psbt: Uint8Array;
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);

  const script = getTaprootScript(psbtBase64)!;
  const leafHash = getLeafHash(script);
  const leafHashT = createExtendedPubkey(
    !isTestnet ? 'Mainnet' : 'Testnet',
    0,
    Buffer.from('00000000', 'hex'),
    0,
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
    Buffer.concat([Buffer.from('02', 'hex'), leafHash]),
  );

  const accountPolicy = new WalletPolicy(policyName, 'tr(@0/**,pk(@1/**))', [
    leafHashT,
    `[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`,
  ]);

  const transaction = Transaction.fromPSBT(psbt);

  const signatures = await app.signPsbt(psbtBase64, accountPolicy, null);
  for (const signature of signatures) {
    const idx = signature[0];
    transaction.updateInput(
      idx,
      {
        tapScriptSig: [
          [
            {
              pubKey: signature[1].pubkey,
              leafHash: signature[1].tapleafHash!,
            },
            signature[1].signature,
          ],
        ],
      },
      true,
    );
  }

  return transaction;
}

export async function signMessageECDSA({
  transport,
  message,
  derivationPath = `m/86'/0'/0'/0/0`,
}: {
  transport: Transport;
  message: string;
  derivationPath: string;
}): Promise<SignedMessage> {
  const app = new AppClient(transport);
  const signature = await app.signMessage(Buffer.from(message), derivationPath);
  return {
    signature,
    protocol: MessageSigningProtocols.ECDSA,
  };
}

export async function signStep1({
  transport,
  psbt,
  derivationPath = `m/86'/0'/0'`,
  isTestnet = false,
}: {
  transport: Transport;
  psbt: Uint8Array;
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  return signSlashingPath({
    policyName: 'Stake / Step 1',
    transport,
    psbt,
    derivationPath,
    isTestnet,
  });
}

export async function signStep2({
  transport,
  psbt,
  derivationPath = `m/86'/0'/0'`,
  isTestnet = false,
}: {
  transport: Transport;
  psbt: Uint8Array;
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  return signSlashingPath({
    policyName: 'Stake / Step 2',
    transport,
    psbt,
    derivationPath,
    isTestnet,
  });
}

export async function signStep5({
  transport,
  psbt,
  derivationPath = `m/86'/0'/0'`,
}: {
  transport: Transport;
  psbt: Uint8Array;
  derivationPath: string;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);

  const accountPolicy = new WalletPolicy('Stake / Transfer', 'tr(@0/**)', [
    `[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`,
  ]);

  const transaction = Transaction.fromPSBT(psbt);

  const signatures = await app.signPsbt(psbtBase64, accountPolicy, null);
  for (const signature of signatures) {
    const idx = signature[0];
    transaction.updateInput(
      idx,
      {
        tapKeySig: signature[1].signature,
      },
      true,
    );
  }

  return transaction;
}
