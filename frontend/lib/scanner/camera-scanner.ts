// FR-H1: camera scanning with the native BarcodeDetector when available,
// falling back to ZXing (loaded on demand so it never ships in the main bundle).

const FORMATS = ["code_128", "qr_code", "ean_13"];

interface NativeDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = {
  new (opts: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};

/**
 * Starts the rear camera on `video` and calls `onCode` for each decoded value.
 * Returns a stop function that releases the camera.
 */
export async function startCameraScanner(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const Detector = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  const supported = Detector ? await Detector.getSupportedFormats().catch(() => []) : [];

  if (Detector && FORMATS.some((f) => supported.includes(f))) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
    await video.play();
    const detector = new Detector({ formats: FORMATS.filter((f) => supported.includes(f)) });
    let running = true;
    const loop = async () => {
      if (!running) return;
      try {
        const [hit] = await detector.detect(video);
        if (hit?.rawValue) onCode(hit.rawValue);
      } catch {
        // frame not ready — try the next one
      }
      if (running) setTimeout(loop, 150);
    };
    void loop();
    return () => {
      running = false;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }

  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: "environment" }, audio: false },
    video,
    (result) => {
      if (result) onCode(result.getText());
    },
  );
  return () => controls.stop();
}
