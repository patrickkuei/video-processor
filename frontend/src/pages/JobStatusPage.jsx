import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJob, getJobUrl } from "../api/client";

const POLL_MS = 3000;

function StatusBadge({ status }) {
  const map = {
    queued: "等待中",
    processing: "處理中",
    done: "完成",
    failed: "失敗",
  };
  const text = map[(status || "").toLowerCase()] || status || "—";
  return (
    <span className={`badge badge-${(status || "").toLowerCase()}`}>
      {text}
    </span>
  );
}

export default function JobStatusPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [playUrl, setPlayUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const isDone = (job?.status || "").toLowerCase() === "done";
  const isFailed = (job?.status || "").toLowerCase() === "failed";

  const fetchJob = async () => {
    try {
      const data = await getJob(id);
      setJob(data);
      setError("");
      const st = (data?.status || "").toLowerCase();
      if (st === "done" || st === "failed") {
        if (timer.current) clearInterval(timer.current);
        if (st === "done") {
          try {
            const { signedUrl } = await getJobUrl(id);
            if (signedUrl) setPlayUrl(signedUrl);
          } catch (e) {
            // keep error non-blocking for status
            console.error("Failed to fetch job url:", e);
          }
        }
      }
    } catch (err) {
      setError(err?.message || "讀取任務失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    timer.current = setInterval(fetchJob, POLL_MS);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const video = useMemo(() => {
    return (
      <video
        src={playUrl}
        controls
        style={{ maxWidth: "100%", borderRadius: 8 }}
      />
    );
  }, [playUrl]);

  return (
    <div className="page">
      <h2>任務狀態</h2>
      <div className="panel">
        <div className="row">
          <div className="label">Job ID</div>
          <div className="value mono">{id}</div>
        </div>
        <div className="row">
          <div className="label">狀態</div>
          <div className="value">
            <StatusBadge status={job?.status} />
          </div>
        </div>

        {loading && <div className="hint">讀取中…</div>}
        {error && <div className="error">{error}</div>}

        {isFailed && job?.error && (
          <div className="error">{String(job.error)}</div>
        )}

        {isDone && (
          <div className="stack">
            <div className="label">處理結果</div>
            {video}
          </div>
        )}

        <div className="actions">
          <button onClick={() => navigate("/")}>回到上傳頁</button>
        </div>
      </div>
    </div>
  );
}
