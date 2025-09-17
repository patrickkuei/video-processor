import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, getUploadUrl, putFileToUrl } from "../api/client";

const VALIDATION_CONFIG = {
  MAX_SIZE_MB: 10,
  ALLOWED_MIME_TYPES: [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
  ],
  get MAX_SIZE_BYTES() {
    return this.MAX_SIZE_MB * 1024 * 1024;
  },
};

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
    if (f.size > VALIDATION_CONFIG.MAX_SIZE_BYTES) {
      setError(
        `檔案過大，限制 ${VALIDATION_CONFIG.MAX_SIZE_MB}MB。現在是 ${humanSize(
          f.size
        )}`
      );
      setFile(null);
      return;
    }
    // Validate MIME type
    if (!VALIDATION_CONFIG.ALLOWED_MIME_TYPES.includes(f.type.toLowerCase())) {
      setError(`不支援的檔案格式。請上傳影片檔 (${f.type})`);
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
        fileSize: file.size,
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
          accept={VALIDATION_CONFIG.ALLOWED_MIME_TYPES.join(",")}
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
