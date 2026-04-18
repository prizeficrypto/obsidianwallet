"use client";

import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export function useMiniKitAvailability() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    try {
      setIsAvailable(MiniKit.isInstalled());
    } catch {
      setIsAvailable(false);
    }
    setIsChecked(true);
  }, []);

  return { isAvailable, isChecked };
}
