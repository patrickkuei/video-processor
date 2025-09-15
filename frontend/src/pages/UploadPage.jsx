import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, getUploadUrl, putFileToUrl } from "../api/client";

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXT = [".mp4", ".mov"];

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onFileChange = (e) => {
    setError("");
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    // Validate size
    if (f.size > MAX_SIZE) {
      setError(`檔案過大，限制 100MB。現在是 ${humanSize(f.size)}`);
      setFile(null);
      return;
    }
    // Validate extension
    const name = f.name.toLowerCase();
    if (!ALLOWED_EXT.some((ext) => name.endsWith(ext))) {
      setError("僅支援 .mp4 / .mov");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("請選擇檔案");
      return;
    }

    setBusy(true);
    try {
      // 1) get signed upload url
      const contentType = file.type || "application/octet-stream";
      const { uploadUrl, fileUrl } = await getUploadUrl({
        filename: file.name,
        contentType,
      });

      // 2) upload direct to R2
      await putFileToUrl(uploadUrl, file, contentType);

      // 3) create job
      const { id } = await createJob({ fileUrl });

      // 4) navigate to job status
      navigate(`/jobs/${id}`);
    } catch (err) {
      console.error(err);
      setError(err?.message || "發生未知錯誤");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h2>上傳影片</h2>
      <form onSubmit={onSubmit} className="panel">
        <input
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          onChange={onFileChange}
          disabled={busy}
        />
        {file && (
          <div className="hint">
            已選擇：{file.name}（{humanSize(file.size)}）
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={!file || busy}>
          {busy ? "處理中…" : "開始建立任務"}
        </button>
        <div className="note">限制：小於 100MB，格式 mp4/mov</div>
      </form>
    </div>
  );
}
