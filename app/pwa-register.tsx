"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA登録に失敗しても、検索・計算機能はそのまま利用できます。
      });
    }
  }, []);

  return null;
}
