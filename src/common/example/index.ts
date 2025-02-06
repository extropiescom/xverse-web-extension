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

export async function signPsbt({
  transport,
  psbt,
  policy,
}: {
  transport: Transport;
  psbt: Uint8Array;
  policy: WalletPolicy;
}): Promise<Transaction> {
  const app = new AppClient(transport);

  const psbtBase64 = base64.encode(psbt);
  const signatures = await app.signPsbt(psbtBase64, policy, null);

  const hasScript = !!getTaprootScript(psbtBase64);

  const transaction = Transaction.fromPSBT(psbt);
  for (const signature of signatures) {
    const idx = signature[0];

    if (hasScript) {
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
    } else {
      transaction.updateInput(
        idx,
        {
          tapKeySig: signature[1].signature,
        },
        true,
      );
    }
  }

  return transaction;
}

export enum MessageSigningProtocols {
  ECDSA = 'ECDSA',
  BIP322 = 'BIP322',
}

export type SignedMessage = {
  signature: string;
  protocol: MessageSigningProtocols;
};

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

function formatKey(key: string | Buffer, isTestnet: boolean): string {
  return createExtendedPubkey(
    !isTestnet ? 'Mainnet' : 'Testnet',
    0,
    Buffer.from('00000000', 'hex'),
    0,
    Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
    Buffer.concat([
      Buffer.from('02', 'hex'),
      key instanceof Buffer ? key : Buffer.from(key as string, 'hex'),
    ]),
  );
}

export type SlashingPolicy = 'Stake / Step 1' | 'Stake / Step 2';

export async function signSlashingPath({
  policyName,
  transport,
  psbt,
  finalityProviderPk,
  covenantThreshold,
  covenantPks,
  derivationPath,
  isTestnet = false,
}: {
  policyName: SlashingPolicy;
  transport: Transport;
  psbt: Uint8Array;
  finalityProviderPk: string;
  covenantThreshold: number;
  covenantPks?: string[];
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);
  const script = getTaprootScript(psbtBase64)!;
  const leafHash = getLeafHash(script);

  const keys: string[] = [];
  keys.push(formatKey(leafHash, isTestnet));
  keys.push(`[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`);
  keys.push(formatKey(finalityProviderPk, isTestnet));

  const length = !covenantPks ? 0 : covenantPks!.length;
  for (let index = 0; index < length; index++) {
    const pk = covenantPks![index];
    keys.push(formatKey(pk, isTestnet));
  }

  const policy = new WalletPolicy(
    policyName,
    // "tr(@0/**,and_v(pk_k(staker_pk), and_v(pk_k(finalityprovider_pk),multi_a(covenant_threshold, covenant_pk1, ..., covenant_pkn))))"
    `tr(@0/**,and_v(pk_k(@1/**),and_v(pk_k(@2),multi_a(${covenantThreshold}, ${Array.from(
      { length },
      (_, index) => index,
    )
      .map((n) => `@${3 + n}`)
      .join(', ')}))))`,
    keys,
  );

  return signPsbt({ transport, psbt, policy });
}

export type UnbondingPolicy = 'Unbond' | undefined;

export async function signUnbondingPath({
  policyName = 'Unbond',
  transport,
  psbt,
  covenantThreshold,
  covenantPks,
  derivationPath,
  isTestnet = false,
}: {
  policyName: UnbondingPolicy;
  transport: Transport;
  psbt: Uint8Array;
  covenantThreshold: number;
  covenantPks?: string[];
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);

  const script = getTaprootScript(psbtBase64)!;
  const leafHash = getLeafHash(script);

  const keys: string[] = [];
  keys.push(formatKey(leafHash, isTestnet));
  keys.push(`[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`);

  const length = !covenantPks ? 0 : covenantPks!.length;
  for (let index = 0; index < length; index++) {
    const pk = covenantPks![index];
    keys.push(formatKey(pk, isTestnet));
  }

  const policy = new WalletPolicy(
    policyName,
    // "tr(@0/**,and_v(pk_k(staker_pk), multi_a(covenant_threshold, covenant_pk1, ..., covenant_pkn)))"
    `tr(@0/**,and_v(pk_k(@1/**),multi_a(${covenantThreshold}, ${Array.from(
      { length },
      (_, index) => index,
    )
      .map((n) => `@${2 + n}`)
      .join(', ')})))`,
    keys,
  );

  return signPsbt({ transport, psbt, policy });
}

export type TimelockPolicy = 'Withdraw' | undefined;

export async function signTimelockPath({
  policyName = 'Withdraw',
  transport,
  psbt,
  timelockBlocks,
  derivationPath,
  isTestnet = false,
}: {
  policyName: TimelockPolicy;
  transport: Transport;
  psbt: Uint8Array;
  timelockBlocks: number;
  derivationPath: string;
  isTestnet: boolean;
}): Promise<Transaction> {
  const app = new AppClient(transport);
  const masterFingerPrint = await app.getMasterFingerprint();
  const extendedPublicKey = await app.getExtendedPubkey(derivationPath);

  const psbtBase64 = base64.encode(psbt);

  const script = getTaprootScript(psbtBase64)!;
  const leafHash = getLeafHash(script);

  const keys: string[] = [];
  keys.push(formatKey(leafHash, isTestnet));
  keys.push(`[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`);

  const policy = new WalletPolicy(
    policyName,
    // tr(@0/**,and_v(pk_k(staker_pk), older(timelock_blocks)))
    `tr(@0/**,and_v(pk_k(@1/**), older(${timelockBlocks})))`,
    keys,
  );

  return signPsbt({ transport, psbt, policy });
}

// Step5
export async function signStakingTx({
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

  const policy = new WalletPolicy('Stake / Transfer', 'tr(@0/**)', [
    `[${derivationPath.replace('m/', `${masterFingerPrint}/`)}]${extendedPublicKey}`,
  ]);

  return signPsbt({ transport, psbt, policy });
}
