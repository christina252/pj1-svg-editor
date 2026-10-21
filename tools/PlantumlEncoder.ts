import { deflateRawSync } from 'node:zlib';

/**
 * Encodes PlantUML source into the code used by the public server
 * (`https://www.plantuml.com/plantuml/svg/<code>`).
 *
 * The format is not standard base64: PlantUML first deflates the source (raw
 * deflate, no zlib header) and then encodes every 3 bytes into 4 characters of
 * its own alphabet. This mirrors the reference implementation, so the produced
 * code is byte-identical to what the PlantUML CLI would send.
 */
export class PlantumlEncoder {
  static readonly ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

  static encode(source: string): string {
    const deflated = deflateRawSync(Buffer.from(source, 'utf8'), { level: 9 });
    let out = '';
    for (let index = 0; index < deflated.length; index += 3) {
      const b1 = deflated[index] ?? 0;
      const b2 = deflated[index + 1] ?? 0;
      const b3 = deflated[index + 2] ?? 0;
      out += PlantumlEncoder.#appendThreeBytes(b1, b2, b3);
    }
    return out;
  }

  static #appendThreeBytes(b1: number, b2: number, b3: number): string {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3f;
    return (
      PlantumlEncoder.ALPHABET.charAt(c1 & 0x3f) +
      PlantumlEncoder.ALPHABET.charAt(c2 & 0x3f) +
      PlantumlEncoder.ALPHABET.charAt(c3 & 0x3f) +
      PlantumlEncoder.ALPHABET.charAt(c4 & 0x3f)
    );
  }
}
