import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useNodeWorkerStatus } from "../hooks/useNodeWorkerStatus";

const WakeupPage = () => {
  const status = useNodeWorkerStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "awake") {
      // Redirect to /upload after a short delay to show the "Engine ready" message
      const timer = setTimeout(() => {
        navigate("/upload");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [navigate, status]);

  return (
    <div>
      {status === "waking" && (
        <>
          <p>🚀 Waking up the engine...</p>
          <div className="spinner"></div>
        </>
      )}
      {status === "awake" && (
        <p style={{ color: "white" }}>✅ Engine ready! Redirecting...</p>
      )}
      {status === "error" && (
        <p style={{ color: "white" }}>
          ⚠️ Error waking up the engine. Retrying...
        </p>
      )}
      <style>{`
        .spinner {
          border: 8px solid rgba(255, 255, 255, 0.3);
          border-top: 8px solid #61dafb;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          margin-top: 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WakeupPage;
