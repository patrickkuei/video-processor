import os from "os";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";
import ffmpegPath from "ffmpeg-static";

// 環境變數
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function processJob(job) {
  console.log(`🎬 Processing job ${job.id}`);

  const inputFile = path.join(os.tmpdir(), `input-${job.id}.mp4`);
  const outputFile = path.join(os.tmpdir(), `output-${job.id}.mp4`);

  try {
    // 1. 更新狀態 -> Processing
    await supabase
      .from("jobs")
      .update({ status: "Processing" })
      .eq("id", job.id);

    // 2. 下載檔案 from R2
    const bucket = process.env.R2_BUCKET_NAME;
    const key = job.file_url.replace("r2://", "").split("/").slice(1).join("/");

    const obj = await r2.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const fileBuffer = await obj.Body.transformToByteArray();
    await fs.writeFile(inputFile, Buffer.from(fileBuffer));

    // 3. ffmpeg 轉檔
    await runFfmpeg(inputFile, outputFile);

    // 4. 上傳結果到 R2
    const resultKey = `outputs/${job.id}.mp4`;
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: resultKey,
        Body: await fs.readFile(outputFile),
        ContentType: "video/mp4",
      })
    );

    const resultUrl = `r2://${bucket}/${resultKey}`;

    // 5. 更新狀態 -> Done
    await supabase
      .from("jobs")
      .update({
        status: "Done",
        result_url: resultUrl,
      })
      .eq("id", job.id);

    console.log(`✅ Job ${job.id} done`);
  } catch (err) {
    console.error(`❌ Job ${job.id} failed`, err);
    await supabase
      .from("jobs")
      .update({
        status: "Failed",
        error: String(err),
      })
      .eq("id", job.id);
  } finally {
    // 清理暫存檔
    await fs.rm(inputFile, { force: true });
    await fs.rm(outputFile, { force: true });
  }
}

function runFfmpeg(input, output) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, [
      "-y",
      "-i",
      input,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-vf",
      "scale=640:-1,fps=30",
      "-movflags",
      "+faststart",
      output,
    ]);

    ff.stderr.on("data", (d) => process.stderr.write(d));

    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function pollJobs() {
  while (true) {
    try {
      // 撈一筆 queued job
      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "Queued")
        .limit(1);

      if (jobs && jobs.length > 0) {
        await processJob(jobs[0]);
      } else {
        console.log("⏳ No jobs, sleeping...");
        await sleep(5000);
      }
    } catch (err) {
      console.error("Poll error", err);
      await sleep(5000);
    }
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

pollJobs();
