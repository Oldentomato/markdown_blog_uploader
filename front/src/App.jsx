import React, { useState, useRef, useEffect } from "react";
import { Layout, Input, Button, Space, Typography, ConfigProvider, theme, Switch, Modal, InputNumber, Upload } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { imageForm, quoteForm, linkForm, codeForm, codeDiffForm } from "./util/mdTemplate";
import { checkContentValid, onPushGithub } from "./components/mdCheck";
import { UploadOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

const serverUrl = "http://server.mark-uploader.kro.kr/";
const STORAGE_KEY = "markdown-content";
const EXPIRY_MS = 1000 * 60 * 30; // 30분 유지

export default function App() {
  const [markdown, setMarkdown] = useState("## Table of contents");
  const [darkMode, setDarkMode] = useState(true);
  const [isUpload, setIsUpload] = useState(false);
  const [repoModalVisible, setRepoModalVisible] = useState(false);
  const [repoName, setRepoName] = useState("astro-paper");
  const [repoPath, setRepoPath] = useState("src/data/blog");
  const [imagePath, setImagePath] = useState("src/data/images")
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [columnCount, setColumnCount] = useState(2); // 기본 2칸
  const [isFrontmatterModalOpen, setIsFrontmatterModalOpen] = useState(false);
  const [modal, contextHolder] = Modal.useModal();
  const [frontmatter, setFrontmatter] = useState({
    author: "",
    pubDatetime: "",
    modDatetime: "",
    title: "",
    slug: "",
    featured: "true",
    draft: "false",
    tags: "",
    description: ""
  });
  const textareaRef = useRef(null);

  // 페이지 로드 시 localStorage에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Date.now() - parsed.timestamp < EXPIRY_MS) {
        setMarkdown(parsed.value);
      } else {
        localStorage.removeItem(STORAGE_KEY); // 만료되면 삭제
      }
    }
  }, []);

  // 값이 바뀔 때마다 저장
  useEffect(() => {
    const data = {
      value: markdown,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [markdown]);


  const generateTableMarkdown = (cols) => {
    const headers = Array(cols).fill("헤더").map((h, i) => `${h}${i+1}`).join(" | ");
    const separators = Array(cols).fill("---").join(" | ");
    const values = Array(cols).fill("값").map((v, i) => `${v}${i+1}`).join(" | ");
    return `| ${headers} |\n| ${separators} |\n| ${values} |`;
  };

  const insertToday = (field) => {
    const now = new Date().toISOString();
    setFrontmatter({ ...frontmatter, [field]: now });
  };

  const generateFrontmatter = () => {
    return `---
  author: ${frontmatter.author}
  pubDatetime: ${frontmatter.pubDatetime}
  modDatetime: ${frontmatter.modDatetime}
  title: ${frontmatter.title}
  slug: ${frontmatter.slug}
  featured: ${frontmatter.featured}
  draft: ${frontmatter.draft}
  tags:
    - ${frontmatter.tags}
  description: ${frontmatter.description}
---\n`;
  };

  const onUpload = async() => {
    setIsUpload(true)
    const result = checkContentValid(markdown);
    if (!result.valid) {
      alert(result.message);
    } else {
      // 업로드 진행
      if(repoName === "" || repoPath === ""){
        alert("repo 정보를 입력하십시오")
      }else{
        await onPushGithub(markdown, repoName, repoPath, imagePath, result.title.replaceAll(" ", "_"))
      }
    }
    setIsUpload(false)
  }

  const uploadProps = {
    name: "file",
    action: "/api/upload/image", // Express 서버 엔드포인트
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        alert("이미지 파일만 업로드할 수 있습니다!");
        return Upload.LIST_IGNORE; // ❌ 업로드 취소
      }
      return true; // ✅ 업로드 진행
    },
    onChange(info) {
      if (info.file.status === "done") {
        // 업로드 후 md에 이미지 삽입
        const imageUrl = info.file.response.url;
        insertAtCursor(`\n![업로드 이미지](${serverUrl}${imageUrl})`);
      } else if (info.file.status === "error") {
        alert(`${info.file.name} upload failed`);
      }
    },
  };


  // 커서 위치에 마크다운 템플릿 삽입
  const insertAtCursor = (text, insertAtStart = false) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;
  
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    let newValue = "";
  
    if (insertAtStart) {
      // 무조건 맨 앞에 삽입
      newValue = text + markdown;
      setMarkdown(newValue);
  
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = text.length;
        textarea.focus();
      }, 0);
    } else {
      // 기존 커서 위치에 삽입
      newValue =
        markdown.substring(0, start) + text + markdown.substring(end);
      setMarkdown(newValue);
  
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      }, 0);
    }
  };


  const showConfirm = () => {
    modal.confirm({
      title: "업로드 확인",
      content: "정말 업로드하시겠습니까?",
      okText: "네",
      cancelText: "취소",
      onOk: () => onUpload(),
    });
  };

return (
  <ConfigProvider
  theme={{
  algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }}
  >
  <Layout style={{ minHeight: "100vh", margin: 0, padding: 0 }}>
    <Header style={{ background: "inherit", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <Title level={3} style={{ margin: 0, color: "inherit" }}>
    Markdown Blog Uploader 
    </Title> 

    <Space>
      <span style={{ color: "inherit" }}>🌞/🌙</span> <Switch checked={darkMode} onChange={setDarkMode} /> 
    </Space> 
    </Header>

      <Content style={{ padding: "20px"}}>
      <Modal
        title="표 생성"
        open={isTableModalOpen}
        onOk={() => {
          insertAtCursor(generateTableMarkdown(columnCount));
          setIsTableModalOpen(false);
        }}
        onCancel={() => setIsTableModalOpen(false)}
      >
        <p>칼럼 수를 선택하세요:</p>
        <InputNumber min={1} max={10} value={columnCount} onChange={setColumnCount} />
      </Modal>

      <Modal
        title="GitHub Repository"
        open={repoModalVisible}
        onOk={() => {
          // 저장 처리
          setRepoModalVisible(false);
        }}
        onCancel={() => setRepoModalVisible(false)}
        okText="Save"
        cancelText="Cancel"
      >
        <Input
          placeholder="Enter GitHub repository name"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
        />
        <Input
          placeholder="Enter repo path"
          value={repoPath}
          style={{ marginTop: "10px"}}
          onChange={(e) => setRepoPath(e.target.value)}
        />
        <Input
          placeholder="Enter image path"
          value={imagePath}
          style={{ marginTop: "10px"}}
          onChange={(e) => setImagePath(e.target.value)}
        />
      </Modal>

      <Modal
        title="Frontmatter 생성"
        open={isFrontmatterModalOpen}
        onOk={() => {
          insertAtCursor(generateFrontmatter(), true);
          setIsFrontmatterModalOpen(false);
        }}
        onCancel={() => setIsFrontmatterModalOpen(false)}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="author"
            value={frontmatter.author}
            onChange={(e) => setFrontmatter({ ...frontmatter, author: e.target.value })}
          />
          <Space>
            <Input
              placeholder="pubDatetime"
              value={frontmatter.pubDatetime}
              onChange={(e) => setFrontmatter({ ...frontmatter, pubDatetime: e.target.value })}
            />
            <Button onClick={() => insertToday("pubDatetime")}>오늘날짜</Button>
          </Space>
          <Space>
            <Input
              placeholder="modDatetime"
              value={frontmatter.modDatetime}
              onChange={(e) => setFrontmatter({ ...frontmatter, modDatetime: e.target.value })}
            />
            <Button onClick={() => insertToday("modDatetime")}>오늘날짜</Button>
          </Space>
          <Input
            placeholder="title"
            value={frontmatter.title}
            onChange={(e) => setFrontmatter({ ...frontmatter, title: e.target.value })}
          />
          <Input
            placeholder="slug"
            value={frontmatter.slug}
            onChange={(e) => setFrontmatter({ ...frontmatter, slug: e.target.value })}
          />
          <Input
            placeholder="featured (true/false)"
            value={frontmatter.featured}
            onChange={(e) => setFrontmatter({ ...frontmatter, featured: e.target.value })}
          />
          <Input
            placeholder="draft (true/false)"
            value={frontmatter.draft}
            onChange={(e) => setFrontmatter({ ...frontmatter, draft: e.target.value })}
          />
          <Input
            placeholder="tags (쉼표 구분)"
            value={frontmatter.tags}
            onChange={(e) => setFrontmatter({ ...frontmatter, tags: e.target.value })}
          />
          <Input.TextArea
            rows={3}
            placeholder="description"
            value={frontmatter.description}
            onChange={(e) => setFrontmatter({ ...frontmatter, description: e.target.value })}
          />
        </Space>
      </Modal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* 왼쪽: 입력 영역 */}
          <div>
            <Space style={{ marginBottom: 10 }} wrap>
            <Button onClick={() => setIsFrontmatterModalOpen(true)}>Frontmatter</Button>
              <Button onClick={() => insertAtCursor(imageForm)}>
                이미지
              </Button>
              <Button
                onClick={() =>
                  setIsTableModalOpen(true)
                }
              >
                표
              </Button>
              <Button onClick={() => insertAtCursor(quoteForm)}>인용</Button>
              <Button onClick={() => insertAtCursor(codeDiffForm)}>코드 diff</Button>
              <Button
                onClick={() =>
                  insertAtCursor(codeForm)
                }
              >
                코드블록
              </Button>
              <Button onClick={() => insertAtCursor(linkForm)}>링크</Button>
              
            </Space>
            <br />
            <Space style={{ marginBottom: 15 }}>
              <Button
                style={{
                  background: "linear-gradient(90deg, #ff7e5f, #feb47b)",
                  border: "none",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                desc 생성
              </Button>

              <Button
                style={{
                  background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                  border: "none",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                OG 생성
              </Button>
            </Space>

            <TextArea
              ref={textareaRef}
              rows={25}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault(); // 기본 포커스 이동 막기
                  const textarea = e.target;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
            
                  // 여기서 원하는 문자열 삽입 (예: 공백 2칸 or \t)
                  const tab = "  "; // 혹은 "\t"
                  const newValue = markdown.substring(0, start) + tab + markdown.substring(end);
            
                  setMarkdown(newValue);
            
                  // 커서 위치 갱신
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + tab.length;
                  }, 0);
                }
              }}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          {/* 오른쪽: 미리보기 */}
          <div
            className="markdown" 
            style={{
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: "15px",
              overflowY: "auto",
              height: "100%",
              background: darkMode ? "#1f1f1f" : "white",
              color: darkMode ? "#e8e8e8" : "inherit",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <Button type="primary" onClick={showConfirm} loading={isUpload}>
                Push
              </Button>
              {contextHolder}
              <Upload style={{marginLeft: 10}} {...uploadProps}>
                <Button icon={<UploadOutlined />}>Upload Image</Button>
              </Upload>
              <Button
                style={{
                  position: "absolute",
                  top: 16,
                  right: 126,
                  zIndex: 1000,
                }}
                type="primary"
                onClick={() => setRepoModalVisible(true)} // 모달 상태
              >
                <img
                  src="/github-icon.png" // 프로젝트 public 폴더에 GitHub 아이콘
                  alt="GitHub"
                  style={{ width: 20, marginRight: 8 }}
                />
                Set Repo
              </Button>
            </div>
            <ReactMarkdown children={markdown} 
            remarkPlugins={[remarkGfm]} 
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
            rehypePlugins={[rehypeRaw]} />
          </div>
        </div>
      </Content>
    </Layout>
  </ConfigProvider>


  );
}
