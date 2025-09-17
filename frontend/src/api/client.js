import { apiUrl } from "../config";

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON from ${url}`);
  }
  if (!res.ok) {
    const message = data?.error || res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function getUploadUrl({ filename, contentType, fileSize }) {
  return jsonFetch(apiUrl("/upload-url"), {
    method: "POST",
    body: JSON.stringify({ filename, contentType, fileSize }),
  });
}

export async function createJob({ fileUrl }) {
  return jsonFetch(apiUrl("/jobs"), {
    method: "POST",
    body: JSON.stringify({ fileUrl }),
  });
}

export async function getJob(id) {
  return jsonFetch(apiUrl(`/jobs/${id}`), {
    method: "GET",
  });
}

export async function getJobUrl(id) {
  // Returns: { url }
  return jsonFetch(apiUrl(`/jobs/${id}/url`), {
    method: "GET",
  });
}

export async function putFileToUrl(uploadUrl, file, contentType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${res.statusText} ${text}`);
  }
}

export async function getHealthAndWake() {
  return jsonFetch(apiUrl("/wake"), {
    method: "GET",
  });
}
