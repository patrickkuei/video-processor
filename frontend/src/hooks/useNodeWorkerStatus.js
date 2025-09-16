import { useState, useEffect } from "react";
import { getHealthAndWake } from "../api/client";

export function useNodeWorkerStatus() {
  const [status, setStatus] = useState("waking"); // 'waking', 'awake', 'error'

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    const checkWorkerStatus = async () => {
      try {
        const data = await getHealthAndWake();
        if (cancelled) return;
        if (data.status === "awake") {
          setStatus("awake");
          clearInterval(intervalId);
        } else {
          setStatus("waking");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    intervalId = setInterval(checkWorkerStatus, 3000);
    checkWorkerStatus();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return status;
}
