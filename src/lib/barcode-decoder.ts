import { prepareZXingModule, readBarcodes, ZXING_WASM_VERSION } from "zxing-wasm/reader";

// Serve the decoder from this app: camera images never leave the browser.
const moduleOptions = {
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith(".wasm") ? `/wasm/zxing-reader-${ZXING_WASM_VERSION}.wasm` : prefix + path,
  },
  fireImmediately: true as const,
};

export async function createBarcodeDecoder() {
  await prepareZXingModule(moduleOptions);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable for barcode scanning.");

  return async (video: HTMLVideoElement): Promise<string | null> => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return null;
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.drawImage(video, 0, 0, width, height);
    const results = await readBarcodes(context.getImageData(0, 0, width, height), {
      formats: ["EAN-13", "EAN-8", "UPC-A", "UPC-E"],
      tryHarder: true,
      tryRotate: true,
      maxNumberOfSymbols: 1,
    });
    const result = results.find((result) => result.isValid);
    if (!result) return null;
    // ZXing-C++ normalizes UPC values to GTIN-13. Keep the printed UPC-E
    // from metadata, or the equivalent 12-digit UPC-A (including its zeros).
    if (result.format === "UPCE" && result.extra) {
      const original: unknown = JSON.parse(result.extra).UPCE;
      if (typeof original === "string" && /^\d{8}$/.test(original)) return original;
    }
    return /^0\d{12}$/.test(result.text) ? result.text.slice(1) : result.text;
  };
}
