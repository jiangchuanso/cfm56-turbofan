# CFM56 涡扇发动机 — 三维 Web 体验

基于 **Three.js** 的涡扇发动机（CFM56 风格）交互式三维可视化：轨道环绕相机、
逐片分解的叶片，以及由虚拟时间驱动的动画编排。这是我为网站与产品打造的
三维体验技术演示。

## 技术栈
- **Three.js**（WebGL）— `.obj` 模型 + HDRI 环境光照。
- 无构建版本（`index.html` + `script.js`）与 **Vite** 变体（`folio-3d/`）。

## 本地预览
```bash
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000
```

> 截帧脚本 `capture-video.py` 同样连接该 8000 端口的本地服务器（可用环境变量
> `CFM56_URL` 覆盖，例如 `CFM56_URL=http://localhost:8123 python capture-video.py`）。

## 部署到 Tomcat
本项目是纯静态前端，无需后端代码，打包为 WAR 即可部署到 Tomcat（已按
Servlet 4.0 / Tomcat 9 配置 `WEB-INF/web.xml`，由 Tomcat 内置的
DefaultServlet 提供静态资源）。

### 1. 打包 WAR
打包已迁移到 GitHub Actions 工作流（`.github/workflows/build-war.yml`），
不再需要本机手动执行。推送到 `master` 或 `v*` 标签即自动构建，WAR 作为
Artifact（标签推送时还会发布为 Release）产出。

- **手动触发**：在仓库 **Actions → Build WAR → Run workflow**，可选 `name`
  （默认 `cfm56`；填 `ROOT` 则作为根应用部署）。
- **产物**：`cfm56.war` → 上下文路径 `/cfm56`；`ROOT.war` → `http://host:8080/`。
- `build-war.ps1` 已移除，打包逻辑完全内联在 `.github/workflows/build-war.yml`
  中（PowerShell 步骤），无需本机脚本。
- 如需离线构建，可直接在 PowerShell 中执行工作流内联的打包步骤（拷贝上述 6 个
  静态资源 + `WEB-INF/web.xml` 到暂存区，再 `Compress-Archive` 并重命名为 `.war`）。

工作流收集的静态资源为：`index.html`、`script.js`、`styles.css`、
`plane.obj`、`plane.mtl`、`sky.hdr` 与 `WEB-INF/web.xml`，自动排除
`.git`、`folio-3d/`（Vite 变体需单独 `npm run build`）、`code-cards/`、`*.py` 等。

### 2. 部署
把生成的 `cfm56.war` 复制到 Tomcat 的 `webapps/` 目录，Tomcat 会自动解压部署；
无需重启（若已开启自动部署）。访问地址：
- `cfm56.war` → `http://<主机>:8080/cfm56/`
- `ROOT.war`   → `http://<主机>:8080/`

> 说明：页面通过 CDN（unpkg）加载 Three.js 及插件，并通过 Google Fonts 加载字体，
> 因此**浏览端需要可访问外网**。如需完全离线运行，可将 Three.js 相关文件 vendoring
> 到本地并修改 `index.html` 中的 importmap 路径。

作者：[Gonzalo-IA](https://gonzalfred.com)。
