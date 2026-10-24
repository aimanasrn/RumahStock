import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { ZXING_WASM_VERSION } from "zxing-wasm/reader";

const require = createRequire(import.meta.url);
const output = new URL("../public/wasm/", import.meta.url);
await mkdir(output, { recursive: true });
await copyFile(
  require.resolve("zxing-wasm/reader/zxing_reader.wasm"),
  new URL(`zxing-reader-${ZXING_WASM_VERSION}.wasm`, output),
);
console.log(`Prepared local barcode decoder ${ZXING_WASM_VERSION}.`);
