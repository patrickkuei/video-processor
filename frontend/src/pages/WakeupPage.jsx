import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config"; // Reverted to apiUrl
import { Card } from "cyberui-2045"; // Import Card component

const WakeupPage = () => {
  const [status, setStatus] = useState("waking"); // 'waking', 'awake', 'error'
  const navigate = useNavigate();

  useEffect(() => {
    let intervalId;

    const checkWorkerStatus = async () => {
      try {
        const response = await fetch(apiUrl("/wake")); // Using apiUrl
        const data = await response.json();

        if (data.status === "awake") {
          setStatus("awake");
          clearInterval(intervalId);
          setTimeout(() => {
            navigate("/upload"); // Navigate to the main upload page
          }, 1500); // Short delay for "ready" animation
        } else {
          setStatus("waking");
        }
      } catch (error) {
        console.error("Failed to fetch worker status:", error);
        setStatus("error");
        // Keep retrying on error
      }
    };

    intervalId = setInterval(checkWorkerStatus, 3000); // Poll every 3 seconds

    // Initial check immediately
    checkWorkerStatus();

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [navigate]);

  return (
    <Card variant="accent">
      {status === "waking" && (
        <>
          <p>🚀 Waking up the engine...</p>
          <div className="spinner"></div>{" "}
          {/* Placeholder for a spinner/animation */}
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
    </Card>
  );
};

export default WakeupPage;
