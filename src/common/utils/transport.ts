import type Transport from '@ledgerhq/hw-transport';

interface TransportOptions {
    // /** 是否使用 Speculos 模拟器；默认为 false */
    // useSpeculos?: boolean;
    // /** Speculos 的 HTTP 地址，如 http://127.0.0.1:5000 */
    // baseURL?: string;
    // /** HTTP Agent，可选，用于保持长连接或自定义代理 */
    // agent?: Agent;
    // /** 连接超时时间，单位毫秒 */
    // timeout?: number;
    // /** 是否允许发送任意 APDU（某些测试场景下需要） */
    // arbitraryAPDU?: boolean;
  }

export async function getLedgerTransport({
//   useSpeculos = false,
//   baseURL = 'http://127.0.0.1:5000',
//   agent,
//   timeout = 30000,
//   arbitraryAPDU = false,
}: TransportOptions = {}): Promise<Transport> {
  console.log('---------------------------------getLedgerTransport---------------------------------')
  // if (useSpeculos) {
  //   // Node.js 环境下的 Speculos Transport
  //   // 注意 require 或动态 import 防止在浏览器打包时报错
  //   const TransportNodeSpeculos = await import("@ledgerhq/hw-transport-node-speculos-http").then(
  //     (m) => m.default,
  //   );

  //   return await TransportNodeSpeculos.open({
  //     baseURL,
  //     agent,
  //     timeout,
  //     arbitraryAPDU,
  //   });
  // } else {
  const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then((m) => m.default);
  return await TransportWebUSB.create();
  // }
}
