import { expect, test } from "@playwright/test";

// GS1 EAN digit encodings; the camera receives pixels, never a mocked decode result.
const left = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const even = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const parity = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];
function barcodeBits(code: string, upce: boolean) {
  if (upce) {
    // UPC-E number system 0, check digit 4: even/odd parity GLGGLL.
    return (
      "101" +
      [...code.slice(1, 7)].map((d, i) => ("GLGGLL"[i] === "L" ? left : even)[Number(d)]).join("") +
      "010101"
    );
  }
  const ean = code.length === 12 ? `0${code}` : code;
  const right = (digit: string) =>
    left[Number(digit)].replace(/[01]/g, (bit) => (bit === "0" ? "1" : "0"));
  if (ean.length === 8) {
    return (
      "101" +
      [...ean.slice(0, 4)].map((d) => left[Number(d)]).join("") +
      "01010" +
      [...ean.slice(4)].map(right).join("") +
      "101"
    );
  }
  return (
    "101" +
    [...ean.slice(1, 7)]
      .map((d, i) => (parity[Number(ean[0])][i] === "L" ? left : even)[Number(d)])
      .join("") +
    "01010" +
    [...ean.slice(7)].map(right).join("") +
    "101"
  );
}

for (const { name, code, rotated, brokenNative = false, upce = false, known = false } of [
  { name: "EAN-13", code: "9556001123459", rotated: false, known: true },
  { name: "EAN-8", code: "96385074", rotated: false },
  { name: "UPC-A with a leading zero", code: "036000291452", rotated: false },
  { name: "UPC-E", code: "04252614", rotated: false, upce: true },
  { name: "rotated EAN-13", code: "5901234123457", rotated: true },
  {
    name: "EAN-13 when the native detector fails",
    code: "5901234123457",
    rotated: false,
    brokenNative: true,
  },
]) {
  test(`camera decodes ${name} after empty frames and releases the stream`, async ({ page }) => {
    if (rotated) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    const decoderRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".wasm")) decoderRequests.push(request.url());
    });
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type())) errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ bits, rotated, brokenNative }) => {
        const state = window as unknown as { showBarcode: boolean; cameraStopped: boolean };
        Object.defineProperty(window, "BarcodeDetector", {
          value: brokenNative
            ? class {
                static async getSupportedFormats() {
                  return ["ean_13", "ean_8", "upc_a", "upc_e"];
                }
                async detect() {
                  throw new Error("Native video detection unavailable");
                }
              }
            : undefined,
          configurable: true,
        });
        Object.defineProperty(navigator, "mediaDevices", {
          configurable: true,
          value: {
            getUserMedia: async () => {
              const canvas = document.createElement("canvas");
              canvas.width = 1280;
              canvas.height = 720;
              const context = canvas.getContext("2d")!;
              const draw = () => {
                context.fillStyle = "white";
                context.fillRect(0, 0, canvas.width, canvas.height);
                if (!state.showBarcode) return;
                context.save();
                context.translate(640, 360);
                if (rotated) context.rotate(Math.PI / 2);
                context.fillStyle = "black";
                [...bits].forEach((bit, i) => {
                  if (bit === "1") context.fillRect((i - bits.length / 2) * 4, -100, 4, 200);
                });
                context.restore();
              };
              draw();
              const interval = setInterval(draw, 50);
              const stream = canvas.captureStream(20);
              const track = stream.getVideoTracks()[0];
              const stop = track.stop.bind(track);
              track.stop = () => {
                state.cameraStopped = true;
                clearInterval(interval);
                stop();
              };
              return stream;
            },
          },
        });
      },
      { bits: barcodeBits(code, upce), rotated, brokenNative },
    );
    await page.goto("/demo/scan");
    expect(decoderRequests).toEqual([]);
    await page.getByRole("button", { name: "Open camera" }).click();
    await expect(page.getByText("Hold the barcode inside the frame")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (rotated) {
      expect((await page.getByLabel("Barcode number").boundingBox())?.width).toBeGreaterThan(250);
    }
    // Several empty frames must leave the decoder running.
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      (window as unknown as { showBarcode: boolean }).showBarcode = true;
    });
    await expect(page.getByLabel("Barcode number")).toHaveValue(code, { timeout: 10000 });
    await expect(page.getByRole("button", { name: "Open camera" })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { cameraStopped: boolean }).cameraStopped),
      )
      .toBe(true);
    if (known) await expect(page.locator(".scan-result")).toContainText("Fresh milk");
    else
      await expect(
        page.getByText("This barcode isn’t in the sample catalog.", { exact: false }),
      ).toBeVisible();
    expect(errors).toEqual([]);
    expect(decoderRequests).toHaveLength(1);
    expect(decoderRequests[0]).toBe(`${new URL(page.url()).origin}/wasm/zxing-reader-3.1.6.wasm`);
  });
}
