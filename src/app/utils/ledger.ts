import {
  MessageSigningProtocols,
  mockSignMessage,
  signMessageLedger,
  type NetworkType,
  type Transport,
} from '@secretkeylabs/xverse-core';

export const handleLedgerMessageSigning = async ({
  transport,
  addressIndex,
  address,
  networkType,
  message,
  protocol,
  mock = false,
}: {
  transport: Transport;
  addressIndex?: number;
  address: string;
  networkType: NetworkType;
  message: string;
  protocol?: MessageSigningProtocols;
  mock?: boolean;
}) => {
  if (addressIndex === undefined) {
    throw new Error('Account not found');
  }

  console.log('addressIndex', addressIndex);

  if (mock) {
    return mockSignMessage({
      address,
      message,
      network: networkType,
      seedPhrase:
        'glory promote mansion idle axis finger extra february uncover one trip resource lawn turtle enact monster seven myth punch hobby comfort wild raise skin',
      protocol,
      derivationPath: "m/86'/1'/0'/0/0",
    });
  } else {
    return signMessageLedger({
      transport,
      networkType,
      addressIndex,
      address,
      message,
      protocol,
    });
  }
};

export const signatureVrsToRsv = (sig: string): string => sig.slice(2) + sig.slice(0, 2);
