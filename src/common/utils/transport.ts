import SpeculosTransport from '@ledgerhq/hw-transport-node-speculos-http';
import { type Transport } from '@secretkeylabs/xverse-core';

import type { SpeculosHttpTransportOpts } from '@ledgerhq/hw-transport-node-speculos-http';

interface TransportOptions {
  /** 是否使用 Speculos 模拟器；默认为 false */
  useSpeculos?: boolean;
  apiPort?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function openSpeculosAndWait(
  opts: SpeculosHttpTransportOpts = {},
): Promise<SpeculosTransport> {
  for (let i = 0; ; i++) {
    try {
      return await SpeculosTransport.open(opts);
    } catch (e) {
      if (i > 50) {
        throw e;
      }
    }
    await sleep(100);
  }
}

export async function getLedgerTransport({
  useSpeculos = true,
  apiPort = '3344',
}: TransportOptions = {}): Promise<Transport> {
  console.log(
    '---------------------------------getLedgerTransport---------------------------------',
  );

  let transport: Transport;
  if (useSpeculos) {
    transport = (await openSpeculosAndWait({
      apiPort,
    })) as Transport;
  } else {
    const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then((m) => m.default);
    transport = (await TransportWebUSB.create()) as Transport;
  }

  return transport;
}
