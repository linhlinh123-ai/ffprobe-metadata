import express from "express";
import { execFile } from "child_process";

const app = express();
app.use(express.json());

// Đặt API key nếu muốn (để trống = public)
const API_KEY = process.env.API_KEY || "";

// Hàm gọi ffprobe
function runFfprobe(url, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      "-rw_timeout", "15000000", // 15s
      ...extraArgs,
      url
    ];
    execFile("ffprobe", args, { timeout: 30000 }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(e); }
    });
  });
}

app.get("/", (req, res) => {
  res.json({ ok: true, hint: "GET /metadata?url=..." });
});

// GET /metadata?url=...&probesize=50M&analyzeduration=50M
app.get("/metadata", async (req, res) => {
  try {
    if (API_KEY && req.get("x-api-key") !== API_KEY) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const url = req.query.url;
    if (!url) return res.status(400).json({ ok: false, error: "missing url" });

    const extra = [];
    if (req.query.probesize) extra.push("-probesize", String(req.query.probesize));
    if (req.query.analyzeduration) extra.push("-analyzeduration", String(req.query.analyzeduration));

    const data = await runFfprobe(url, extra);

    const fmt = data.format || {};
    const v = (data.streams || []).find(s => s.codec_type === "video");
    const a = (data.streams || []).find(s => s.codec_type === "audio");

    const fps = v?.avg_frame_rate && v.avg_frame_rate.includes("/")
      ? (Number(v.avg_frame_rate.split("/")[0]) / Math.max(1, Number(v.avg_frame_rate.split("/")[1])))
      : null;

    res.json({
      ok: true,
      format: {
        format_name: fmt.format_name,
        duration_sec: fmt.duration ? Number(fmt.duration) : null,
        size_bytes: fmt.size ? Number(fmt.size) : null,
        bit_rate: fmt.bit_rate ? Number(fmt.bit_rate) : null
      },
      video: v ? {
        codec: v.codec_name,
        width: v.width,
        height: v.height,
        fps,
        bit_rate: v.bit_rate ? Number(v.bit_rate) : null
      } : null,
      audio: a ? {
        codec: a.codec_name,
        channels: a.channels,
        sample_rate: a.sample_rate ? Number(a.sample_rate) : null,
        bit_rate: a.bit_rate ? Number(a.bit_rate) : null
      } : null,
      raw: data
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Listening on", process.env.PORT || 8080);
});

