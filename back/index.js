// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";

const app = express();
app.use(express.json());

// CORS 허용 (모든 도메인)
app.use(cors());

// 특정 도메인만 허용(나중에 적용)
// app.use(cors({ origin: "http://localhost:3000" }));

// 업로드 디렉토리
// __filename, __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

const TEST_TOKEN = process.env.GITHUB_PAT.trim();;


app.post("/api/upload", async (req, res) => {
    try {
      const { filePath, imagePath, repoName, content, message } = req.body;
  
      // oauth2-proxy가 전달한 GitHub access token (테스트 시 fallback 가능)
      const token =
        req.headers["authorization"]?.replace("Bearer ", "") || TEST_TOKEN;
      if (!token) {
        return res.status(401).json({ error: "GitHub access token 없음" });
      }
  
      // 1. owner 가져오기
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });
      const user = await userRes.json();
      const owner = user.login;
  
      // 2. Markdown 안에서 이미지 경로 추출
      const imageRegex = /!\[.*?\]\((.*?)\)/g;
      let match;
      let newMarkdown = content;
  
      while ((match = imageRegex.exec(content)) !== null) {
        const imageUrl = match[1];
  
        // 서버 업로드 경로만 처리
        if (imageUrl.includes("/uploads/")) {
          const filename = path.basename(imageUrl);
  
          // 3. 서버에서 이미지 다운로드
          const imgRes = await fetch(imageUrl);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const encodedImg = buffer.toString("base64");
  
          // 4. GitHub Repo에 이미지 업로드
          const imgGithubRes = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${imagePath}/${filename}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github+json",
              },
              body: JSON.stringify({
                message: `upload image ${filename}`,
                content: encodedImg,
              }),
            }
          );
  
          const imgData = await imgGithubRes.json();
          if (!imgGithubRes.ok) {
            console.error("Image push failed:", imgData);
            return res.status(imgGithubRes.status).json(imgData);
          }
  
          // 5. Markdown 경로 교체
          newMarkdown = newMarkdown.replaceAll(imageUrl, `https://github.com/${owner}/${repoName}/blob/main/${imagePath}/${filename}?raw=true`);
        }
      }
  
      // 6. 최종 Markdown push
      const encodedContent = Buffer.from(newMarkdown).toString("base64");
  
      const githubRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            message: message || "upload via webapp",
            content: encodedContent,
          }),
        }
      );
  
      const data = await githubRes.json();
      if (!githubRes.ok) {
        return res.status(githubRes.status).json(data);
      }
  
      res.json({ success: true, data });
    } catch (err) {
      console.error("Upload failed:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

// 이미지업로드 API
app.post("/api/upload/image", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
    const filePath = `/uploads/${req.file.filename}`;
  
    // 일정 시간 뒤 자동 삭제 (예: 10분)
    setTimeout(() => {
      const fullPath = path.join(uploadDir, req.file.filename);
      fs.unlink(fullPath, (err) => {
        if (err) console.error("파일 삭제 실패:", err);
        else console.log("자동 삭제 완료:", req.file.filename);
      });
    }, 10 * 60 * 1000); // 10분 후 삭제
  
    // 클라이언트에 URL 응답
    res.json({ url: filePath });
  });

app.use("/uploads", express.static(uploadDir));

app.listen(4000, () => console.log("✅ Upload server running on 4000"));
