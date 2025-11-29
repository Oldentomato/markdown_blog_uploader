const checkContentValid = (markdown) => {
  // --- frontmatter --- 블록 추출
  const fmRegex = /^---([\s\S]*?)---/;
  const match = markdown.match(fmRegex);
  if (!match) {
    return { valid: false, message: "Frontmatter 블록이 없습니다." };
  }

  // frontmatter 본문
  const fmContent = match[1].trim();

  // 라인 단위 파싱
  const lines = fmContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const data = {};

  lines.forEach((line, idx) => {
    if (line.startsWith("tags:")) {
      const tagLines = [];
      for (let i = idx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("-")) {
          const tagValue = lines[i].replace("-", "").trim();
          if (tagValue) tagLines.push(tagValue);
        } else {
          break;
        }
      }
      data.tags = tagLines;
    } else {
      const [key, ...rest] = line.split(":");
      if (key && rest.length > 0) {
        data[key.trim()] = rest.join(":").trim();
      }
    }
  });

  // 필수 필드 체크
  const requiredFields = [
    "author",
    "pubDatetime",
    "modDatetime",
    "title",
    "slug",
    "featured",
    "draft",
    "tags",
    "description",
  ];

  for (let field of requiredFields) {
    if (!(field in data)) {
      return { valid: false, message: `${field} 항목이 없습니다.` };
    }
    if (field === "tags") {
      if (!Array.isArray(data.tags) || data.tags.length === 0) {
        return { valid: false, message: "tags 값이 없습니다." };
      }
    } else {
      if (!data[field] || data[field].length === 0) {
        return { valid: false, message: `${field} 값이 비어있습니다.` };
      }
    }
  }

  // 본문에 "## Table of contents" 포함 여부 확인
  if (!markdown.includes("## Table of contents")) {
    return { valid: false, message: '"## Table of contents" 문구가 없습니다.' };
  }

  // title 값도 같이 반환
  return { valid: true, message: "검증 통과", title: data.title };
};

const onModifyGithub = async (markdown, repoName, repoPath, title, message, fileSha) => {
  try {
    const res = await fetch("/api/modify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: repoPath+`/${title}.md`,
        repoName: repoName,
        content: markdown,
        message: message,
        sha: fileSha
      }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("업로드 성공! 커밋 SHA: " + data.data.commit.sha);
    } else {
      alert("업로드 실패: " + JSON.stringify(data));
    }
  } catch (err) {
    console.error(err);
    alert("에러 발생: " + err.message);
  }
}

const onPushGithub = async (markdown, repoName, repoPath, imagePath, title, message = "upload new markdown file via webapp") => {
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: repoPath+`/${title}.md`,
        imagePath: imagePath,
        repoName,
        content: markdown,
        message,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("업로드 성공! 커밋 SHA: " + data.data.commit.sha);
    } else {
      alert("업로드 실패: " + JSON.stringify(data));
    }
  } catch (err) {
    console.error(err);
    alert("에러 발생: " + err.message);
  }
};

export { checkContentValid, onPushGithub, onModifyGithub };
