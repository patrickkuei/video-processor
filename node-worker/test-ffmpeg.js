import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";

const input = path.resolve("./input.MOV");
const output = path.resolve("./output.mp4");

ffmpeg.setFfmpegPath(ffmpegPath);

ffmpeg(input)
  .outputOptions([
    "-vf scale=640:-1", // 縮小寬度到 640px，高度自動
    "-c:v libx264", // 視訊編碼 h264
    "-c:a aac", // 音訊編碼 aac
    "-preset fast", // 編碼速度/壓縮率平衡
    "-movflags +faststart", // 讓瀏覽器能邊下載邊播
  ])
  .on("start", (cmd) => {
    console.log("FFmpeg 命令:", cmd);
  })
  .on("progress", (p) => {
    console.log(`處理進度: ${p.percent ? p.percent.toFixed(2) : 0}%`);
  })
  .on("end", () => {
    console.log("轉檔完成 ✅ 輸出檔:", output);
  })
  .on("error", (err) => {
    console.error("發生錯誤:", err);
  })
  .save(output);
