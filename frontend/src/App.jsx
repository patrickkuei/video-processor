import { Link, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import UploadPage from "./pages/UploadPage.jsx";
import JobStatusPage from "./pages/JobStatusPage.jsx";
import WakeupPage from "./pages/WakeupPage.jsx";

import { useNodeWorkerStatus } from "./hooks/useNodeWorkerStatus.js";

function App() {
  const status = useNodeWorkerStatus();

  // Only allow access to other pages if status is 'awake'. Otherwise, redirect to WakeupPage ("/")
  const isAwake = status === "awake";

  return (
    <div className="container">
      <header className="header">
        <Link to="/upload" className="brand">
          Video Processor
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<WakeupPage />} />
          <Route
            path="/upload"
            element={isAwake ? <UploadPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/jobs/:id"
            element={isAwake ? <JobStatusPage /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
      <footer className="footer">MVP Demo</footer>
    </div>
  );
}

export default App;
