"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};
export function BarcodeCamera({ onDetect }: { onDetect: (barcode: string) => void }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [starting, setStarting] = useState(false),
    [hint, setHint] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    callback = useRef(onDetect);
  useEffect(() => {
    callback.current = onDetect;
  }, [onDetect]);
  useEffect(() => {
    if (!open) return;
    let disposed = false,
      stopped = false,
      detected = false,
      stream: MediaStream | null = null,
      timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (timer) clearTimeout(timer);
    };
    const receive = (value: string) => {
      if (disposed || stopped || detected || !/^\d{4,32}$/.test(value)) return;
      detected = true;
      stop();
      setOpen(false);
      callback.current(value);
    };
    const fail = (message: string) => {
      stop();
      if (disposed) return;
      setError(message);
      setOpen(false);
      setStarting(false);
    };
    async function startFallback() {
      const { createBarcodeDecoder } = await import("@/lib/barcode-decoder");
      if (disposed || stopped || !video.current || !stream) return;
      const decode = await createBarcodeDecoder();
      if (disposed || stopped) return;
      const scan = async () => {
        if (disposed || stopped || detected || !video.current) return;
        try {
          const barcode = await decode(video.current);
          if (barcode) receive(barcode);
        } catch {
          fail("The barcode reader stopped. Reopen the camera, or enter the barcode below.");
          return;
        }
        if (!disposed && !stopped && !detected) timer = setTimeout(() => void scan(), 180);
      };
      void scan();
    }
    const pause = () => {
      if (document.hidden) {
        stop();
        setOpen(false);
      }
    };
    document.addEventListener("visibilitychange", pause);
    async function start() {
      setStarting(true);
      setError("");
      setHint(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Camera access needs HTTPS or localhost and a supported browser.");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (disposed || stopped) {
          stop();
          return;
        }
        if (!video.current) {
          stop();
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        if (disposed || stopped) return;
        const Constructor = (window as unknown as { BarcodeDetector?: DetectorConstructor })
          .BarcodeDetector;
        const formats = ["ean_13", "ean_8", "upc_a", "upc_e"];
        const supported = Constructor
          ? await Constructor.getSupportedFormats().catch(() => [])
          : [];
        if (disposed || stopped) {
          stop();
          return;
        }
        if (Constructor && formats.every((f) => supported.includes(f))) {
          let detector: Detector;
          try {
            detector = new Constructor({ formats });
          } catch {
            await startFallback();
            if (!disposed && !stopped) setStarting(false);
            return;
          }
          let failures = 0;
          const scan = async () => {
            if (disposed || stopped || detected || !video.current) return;
            try {
              const results = await detector.detect(video.current);
              failures = 0;
              for (const result of results) receive(result.rawValue);
            } catch {
              // Some browsers advertise BarcodeDetector but fail on video input.
              // Allow transient unready frames, then use the software decoder.
              if (++failures >= 3) {
                try {
                  await startFallback();
                } catch {
                  fail(
                    "The barcode reader could not start. Reopen the camera, or enter the barcode below.",
                  );
                }
                return;
              }
            }
            if (!disposed && !stopped && !detected) timer = setTimeout(() => void scan(), 180);
          };
          void scan();
        } else {
          await startFallback();
        }
        if (!disposed && !stopped) setStarting(false);
      } catch (e) {
        stop();
        if (!disposed) {
          const name = e instanceof DOMException ? e.name : "";
          setError(
            name === "NotAllowedError"
              ? "Camera permission was denied. Allow access in your browser, or enter the barcode below."
              : name === "NotFoundError"
                ? "No camera was found. Enter the barcode or product name below."
                : e instanceof Error
                  ? e.message
                  : "The camera could not be started. Try manual entry.",
          );
          setOpen(false);
          setStarting(false);
        }
      }
    }
    const hintTimer = setTimeout(() => {
      if (!disposed && !detected) setHint(true);
    }, 15000);
    void start();
    return () => {
      disposed = true;
      stop();
      clearTimeout(hintTimer);
      document.removeEventListener("visibilitychange", pause);
    };
  }, [open]);
  return (
    <div className="camera-panel">
      {open ? (
        <>
          <div className="camera-viewport">
            <video ref={video} playsInline muted aria-label="Barcode camera preview" />
            <div className="scan-reticle" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            {starting ? (
              <span className="camera-loading">
                <LoaderCircle className="animate-spin" />
                Opening camera…
              </span>
            ) : (
              <span className="camera-instruction">Hold the barcode inside the frame</span>
            )}
          </div>
          {hint ? (
            <p className="text-sm text-muted-foreground">
              Still looking. Try brighter light, move back a little, or enter the code manually.
            </p>
          ) : null}
          <Button variant="outline" onClick={() => setOpen(false)}>
            <CameraOff />
            Close camera
          </Button>
        </>
      ) : (
        <div className="camera-placeholder">
          <span className="camera-symbol">
            <Camera />
          </span>
          <h3>A quick scan. A little clarity.</h3>
          <p>
            Point your camera at a product’s barcode.
            <br />
            We’ll check your household catalog first.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Camera />
            Open camera
          </Button>
          <small>Camera access is requested only when you open it.</small>
        </div>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
