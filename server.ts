import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // API health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", name: "Cổng Dịch Vụ Công Phường Tân Mỹ" });
  });

  // Server-side Vietnamese Text-To-Speech (TTS) endpoint
  app.get("/api/tts", async (req, res) => {
    try {
      const text = (req.query.text as string || "").trim();
      if (!text) {
        return res.status(400).send("No text provided");
      }

      // Truncate to reasonable length (500 chars) for single TTS request
      const cleanText = text.slice(0, 500);
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

      const response = await fetch(googleTtsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        console.warn("Google TTS fetch non-200:", response.status);
        return res.status(500).send("TTS service unavailable");
      }

      const audioBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(audioBuffer));
    } catch (error: any) {
      console.error("TTS endpoint error:", error);
      return res.status(500).json({ error: error?.message || "TTS error" });
    }
  });

  // Server-side Gemini audio transcription endpoint
  app.post("/api/gemini/transcribe", async (req, res) => {
    try {
      const { base64Data, mimeType, prompt } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY;

      if (!base64Data) {
        return res.status(400).json({ error: "Thừa hoặc thiếu dữ liệu âm thanh" });
      }

      if (!apiKey) {
        return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      let transcribed = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: mimeType || "audio/webm", data: base64Data } },
                {
                  text:
                    prompt ||
                    'Hãy nghe đoạn âm thanh tiếng Việt này và trích xuất ngắn gọn khẩu lệnh thủ tục hành chính mà người dân đang muốn làm (ví dụ: "Đăng ký kết hôn", "Đăng ký khai sinh", "Cấp giấy xác nhận tình trạng hôn nhân", "Đăng ký thường trú", "Cấp bản sao trích lục", ...). Chỉ trả về câu nói hoặc tên thủ tục, không kèm lời giải thích.',
                },
              ],
            },
          ],
        });
        transcribed = response.text?.trim() || "";
      } catch (transcribeErr: any) {
        console.warn("gemini-3.5-transcribe error, fallback to gemini-3.8-flash:", transcribeErr?.message);
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: mimeType || "audio/webm", data: base64Data } },
                {
                  text:
                    prompt ||
                    'Hãy nghe đoạn âm thanh tiếng Việt này và trích xuất ngắn gọn khẩu lệnh thủ tục hành chính mà người dân đang muốn làm (ví dụ: "Đăng ký kết hôn", "Đăng ký khai sinh", "Cấp giấy xác nhận tình trạng hôn nhân", "Đăng ký thường trú", "Cấp bản sao trích lục", ...). Chỉ trả về câu nói hoặc tên thủ tục, không kèm lời giải thích.',
                },
              ],
            },
          ],
        });
        transcribed = fallbackResponse.text?.trim() || "";
      }
      return res.json({ text: transcribed });
    } catch (error: any) {
      console.error("Gemini audio transcription error:", error);
      return res.status(500).json({ error: error?.message || "Lỗi xử lý AI" });
    }
  });

  // Vite middleware for development vs static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
