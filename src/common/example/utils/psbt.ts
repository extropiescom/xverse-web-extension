import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';

export function getTaprootScript(base64PSBT: string): Buffer | undefined {
  const psbtBuffer = Buffer.from(base64PSBT, 'base64');

  const psbt = bitcoin.Psbt.fromBuffer(psbtBuffer);

  for (const input of psbt.data.inputs) {
    // console.log(input);
    if (input.tapLeafScript && input.tapLeafScript.length > 0) {
      for (const leafScript of input.tapLeafScript) {
        return leafScript.script;
      }
    }
  }

  return undefined;
}

// BIP341 中定义的 Tagged Hash
function taggedHash(tag: Buffer, data: Buffer): Buffer {
  const tagHash = crypto.createHash('sha256').update(tag).digest();
  return crypto
    .createHash('sha256')
    .update(Buffer.concat([tagHash, tagHash, data]))
    .digest();
}

// 比特币协议的 VarInt 编码
function encodeVarint(n: number): Buffer {
  if (n < 0xfd) {
    return Buffer.from([n]);
  } else if (n <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf.writeUInt8(0xfd, 0);
    buf.writeUInt16LE(n, 1);
    return buf;
  } else if (n <= 0xffffffff) {
    const buf = Buffer.alloc(5);
    buf.writeUInt8(0xfe, 0);
    buf.writeUInt32LE(n, 1);
    return buf;
  } else {
    const buf = Buffer.alloc(9);
    buf.writeUInt8(0xff, 0);
    buf.writeUInt32LE(n, 1);
    buf.writeBigUInt64LE(BigInt(n), 5);
    return buf;
  }
}

export function getLeafHash(scriptBytes: Buffer) {
  // 叶子版本 (BIP342 通常是 0xc0)
  const leafVersion = Buffer.from([0xc0]);

  // 计算脚本的长度
  const scriptLen = scriptBytes.length;
  //   console.log('script_len =', scriptLen);

  // 编码脚本长度为 VarInt
  const varintLen = encodeVarint(scriptLen);

  // 组装待哈希数据: leaf_version || varint(script_len) || script
  const toHash = Buffer.concat([leafVersion, varintLen, scriptBytes]);

  // 调用 TaggedHash("TapLeaf", to_hash) 得到 leaf hash
  const leafHash = taggedHash(Buffer.from('TapLeaf'), toHash);

  //   console.log('leaf_hash =', leafHash.toString('hex'));
  return leafHash;
}

// // 示例：Base64 编码的 PSBT
// const base64PSBT= 'cHNidP8BAH0CAAAAAe5Zu8YR8si9c+Pj2ZU0zXSRmAG8/Qxcee9e7BpsVHtOAAAAAAD/////AsQJAAAAAAAAFgAUW+EmJNCKK0JAldfAciHDNFDRS/EEpgAAAAAAACJRICyVutUKY9E6qBjfjktoZBga2/RyCoiq+OPBI1ugik2fAAAAAAABAStQwwAAAAAAACJRIEOj7UvRXfRV9er0SUNeReHNqaiqtOoEhmW60JCFUoUyQhXAUJKbdMGgSVS3i0tgNel6XgeKWg8o7JbVR7/ums6AOsCJtgX5iDHD5SbZ6yF5ZRRSk4qMD/f16u7MthJR1dRt6/15ASDcjS+e/wxPTb3gcKSOMw78kItip2ZWjZHmWPKEsyS4eK0gH5MjVzLmTKwzVprRw9vwQTgsO3dPz7BTO5sx1MKna/mtIAruBQmxbbccmZI4pIJ9uUVSaFmxPJVIerRnJTV8mp8lrCARPDoyqdMgtyGQoEoCCg2zl27zaXJnMljpo4o2Tz3DsLogF5Ic8VbMtOc9Qo+ZbtEbJFMT434nyXisTSzCHspGcuS6IDu5PfyLYYh9dx82MOmmPpfLr8/MeFVqR034OjGg74mcuiBAr69HxP+lbehkENjke6ortvBLYE9OokMjc33cP+CS37ogeacf/XHFA+8uL5G8z8j82nlG9GU87w2fPd4geV7zufC6INIfr3jGdRoNOOa9gCi5B/8H6ahppD/IN9az+N/2EZo2uiD1GZ764/KLuCR2Fjp+RYx61EXZv/sGgtENO9sstB+Ojrog+p2ILUX0BgvbgEIYOCjNh1RPHqmXOA5YbKt31f1phze6VpzAARcgUJKbdMGgSVS3i0tgNel6XgeKWg8o7JbVR7/ums6AOsAAAAA=';
// // const base64PSBT = "cHNidP8BAJ0CA7QhBO4F0lYcG2E6FzH5dNRhKK2s2m1nCOjM6eOMi7n9gGF1fRqaG8y6pg8o4hKTvNmOwYMKHkjZMbXl52yBTI3LHGXQ2TAJdF2EBnGZcTy6GfTZ2EwxoIbgq9h7Fe8LZYkL8P1zUyf+RwfklPyhxSJe6q8VHJ9lKNcsS/xHf0zTbXy9Bln5N4bfnYlLMX6kZaGdDzoLVgXN4zYZY+YhfzvXX9aWIrHkYQ9H6FS4u6IyzTn91PqOhP+YXGb4nA3F6mZcpe7MnI2br7ddh9v+qCTpgUKXXhFxq0NlwCjAxg0jN5d3Fq+mcLRg==";

// // 获取 Taproot 脚本
// const taprootScript = getTaprootScript(base64PSBT).toString('hex');

// if (taprootScript) {
//   console.log("Found Taproot script:", taprootScript);
// } else {
//   console.log("No Taproot script found.");
// }
