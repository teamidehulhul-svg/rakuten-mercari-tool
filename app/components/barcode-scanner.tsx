"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type SearchTarget = "rakuten" | "ebay";

type BarcodeScannerProps = {
  onSearch: (target: SearchTarget, barcode: string) => void;
};

const PRODUCT_BARCODE_PATTERN = /^\d{8,14}$/;

export default function BarcodeScanner({ onSearch }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState(
    "JAN・EAN・UPCのバーコードを読み取れます"
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanSessionRef = useRef(0);

  const stopScanning = useCallback(() => {
    scanSessionRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  useEffect(() => stopScanning, [stopScanning]);

  const startScanning = async () => {
    stopScanning();
    const scanSession = ++scanSessionRef.current;
    setMessage("カメラを起動しています...");
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("この端末ではカメラを利用できません");
      }

      const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");

      if (scanSessionRef.current !== scanSession) {
        return;
      }

      const reader = new BrowserMultiFormatOneDReader(undefined, {
        delayBetweenScanAttempts: 100,
        delayBetweenScanSuccess: 500,
      });

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        },
        videoRef.current ?? undefined,
        (result, _error, callbackControls) => {
          if (!result) {
            return;
          }

          const detectedBarcode = result.getText().replace(/\D/g, "");

          if (!PRODUCT_BARCODE_PATTERN.test(detectedBarcode)) {
            setMessage("商品バーコードを枠の中央に合わせてください");
            return;
          }

          callbackControls.stop();
          scanSessionRef.current += 1;
          controlsRef.current = null;
          setIsScanning(false);
          setBarcode(detectedBarcode);
          setMessage(`読み取り成功：${detectedBarcode}`);
        }
      );

      if (scanSessionRef.current !== scanSession) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setMessage("バーコードを枠の中央に合わせてください");
    } catch (error) {
      if (scanSessionRef.current !== scanSession) {
        return;
      }

      stopScanning();
      setMessage(
        error instanceof Error
          ? error.message
          : "カメラを起動できませんでした"
      );
    }
  };

  const searchWithBarcode = (target: SearchTarget) => {
    const normalizedBarcode = barcode.replace(/\D/g, "");

    if (!PRODUCT_BARCODE_PATTERN.test(normalizedBarcode)) {
      setMessage("8〜14桁の商品バーコードを入力してください");
      return;
    }

    stopScanning();
    onSearch(target, normalizedBarcode);
  };

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold">📷 バーコードで商品検索</h2>
        <p className="mt-2 text-sm text-gray-500">
          商品のJAN・EAN・UPCコードをカメラで読み取ります
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-gray-950">
        <div className="relative aspect-[4/3] w-full">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-28 -translate-y-1/2 rounded-xl border-4 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 px-6 text-center font-bold text-white">
              「カメラを起動」を押してバーコードを読み取ります
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={startScanning}
          disabled={isScanning}
          className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50"
        >
          {isScanning ? "読み取り中..." : "📷 カメラを起動"}
        </button>
        <button
          type="button"
          onClick={stopScanning}
          disabled={!isScanning}
          className="rounded-xl bg-gray-200 px-4 py-3 font-bold text-gray-700 disabled:opacity-50"
        >
          停止
        </button>
      </div>

      <p
        aria-live="polite"
        className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-800"
      >
        {message}
      </p>

      <div className="mt-5">
        <label htmlFor="barcode-value" className="mb-2 block font-bold">
          バーコード番号
        </label>
        <input
          id="barcode-value"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={barcode}
          onChange={(event) =>
            setBarcode(event.target.value.replace(/\D/g, "").slice(0, 14))
          }
          placeholder="例：4901234567890"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-lg"
        />
        <p className="mt-2 text-xs text-gray-500">
          カメラが使えない場合は番号を直接入力できます
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => searchWithBarcode("rakuten")}
          className="rounded-xl bg-red-500 px-5 py-4 font-bold text-white"
        >
          🛒 楽天で検索
        </button>
        <button
          type="button"
          onClick={() => searchWithBarcode("ebay")}
          className="rounded-xl bg-blue-600 px-5 py-4 font-bold text-white"
        >
          🌎 eBayで検索
        </button>
      </div>
    </section>
  );
}
