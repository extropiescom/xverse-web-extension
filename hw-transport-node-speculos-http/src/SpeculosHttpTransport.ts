import { DisconnectedDevice } from '@ledgerhq/errors';
import Transport from '@ledgerhq/hw-transport';
import axios, { AxiosInstance } from 'axios';
import { Subject } from 'rxjs';
import { Readable } from 'stream';

export type SpeculosHttpTransportOpts = {
  apiPort?: string;
  timeout?: number;
  baseURL?: string;
};

enum SpeculosButton {
  LEFT = 'Ll',
  RIGHT = 'Rr',
  BOTH = 'LRlr',
}

/**
 * Speculos TCP transport implementation
 *
 * @example
 * import SpeculosHttpTransport from "@ledgerhq/hw-transport-node-speculos-http";
 * const transport = await SpeculosHttpTransport.open();
 * const res = await transport.send(0xE0, 0x01, 0, 0);
 */
export default class SpeculosHttpTransport extends Transport {
  instance: AxiosInstance;
  opts: SpeculosHttpTransportOpts;
  eventStream: any; // ReadStream?
  automationEvents: Subject<Record<string, any>> = new Subject();

  constructor(instance: AxiosInstance, opts: SpeculosHttpTransportOpts) {
    super();
    this.instance = instance;
    this.opts = opts;
  }

  static isSupported = (): Promise<boolean> => Promise.resolve(true);
  // this transport is not discoverable
  static list = (): any => Promise.resolve([]);
  static listen = (_observer: any) => ({
    unsubscribe: () => {},
  });

  buttonTable = {
    [SpeculosButton.BOTH]: 'both',
    [SpeculosButton.RIGHT]: 'right',
    [SpeculosButton.LEFT]: 'left',
  };

  static open = (opts: SpeculosHttpTransportOpts): Promise<SpeculosHttpTransport> =>
    new Promise((resolve, reject) => {
      const instance = axios.create({
        baseURL: `http://localhost:${opts.apiPort || '5000'}`,
        timeout: opts.timeout,
        adapter: 'fetch',
      })<ReadableStream>;

      const transport = new SpeculosHttpTransport(instance, opts);

      instance({
        url: '/events?stream=true',
        responseType: 'stream',
      })
        .then((res) => {
          console.log('------------------Speculos open------------------', res);

          const reader = res.data.getReader();

          const response = new Readable({
            read() {
              const pushChunk = () => {
                reader
                  .read()
                  .then(({ done, value }) => {
                    if (done) {
                      this.push(null); // End the Node.js stream
                    } else if (value) {
                      this.push(Buffer.from(value)); // Push the chunk
                      pushChunk(); // Read the next chunk
                    }
                  })
                  .catch((err) => {
                    this.emit('error', err); // Emit error if something goes wrong
                  });
              };

              pushChunk(); // Start reading
            },
          });

          response.on('data', (chunk) => {
            const eventData = chunk.toString();
            console.log('speculos-event', eventData);

            const jsonPattern = /\s*data:\s*({[\s\S]*?})\s*(?=data:|$)/g;

            let match;
            while ((match = jsonPattern.exec(eventData)) !== null) {
              try {
                // console.log('---------segment---------', match[1]);
                const json = JSON.parse(match[1]);
                console.log('---------json---------', json);

                transport.automationEvents.next(json);
              } catch (error) {
                console.error(error);
              }
              // 将匹配的 JSON 部分解析为对象
            }
          });

          response.on('close', () => {
            console.log('speculos-event', 'close');
            transport.emit('disconnect', new DisconnectedDevice('Speculos exited!'));
          });

          transport.eventStream = response;
          // we are connected to speculos
          resolve(transport);
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });

  /**
   * Press and release button
   * buttons available: left, right, both
   * @param {*} but
   */
  button = (but: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const input = this.buttonTable[but] ?? but;
      console.log('speculos-button', 'press-and-release', input);
      this.instance
        .post(`/button/${input}`, { action: 'press-and-release' })
        .then((response) => {
          resolve(response.data);
        })
        .catch((e) => {
          reject(e);
        });
    });

  async exchange(apdu: Buffer): Promise<any> {
    const hex = apdu.toString('hex');
    console.log('apdu', '=> ' + hex);
    return this.instance.post('/apdu', { data: hex }).then((r) => {
      // r.data is {"data": "hex value of response"}
      const data = r.data.data;
      console.log('apdu', '<= ' + data);
      return Buffer.from(data, 'hex');
    });
  }

  async close() {
    // close event stream
    this.eventStream.destroy();
    return Promise.resolve();
  }
}
