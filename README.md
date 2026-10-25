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

## 部署到 Tomcat
本项目是纯静态前端，无需后端代码，打包为 WAR 即可部署到 Tomcat（已按
Servlet 4.0 / Tomcat 9 配置 `WEB-INF/web.xml`，由 Tomcat 内置的
DefaultServlet 提供静态资源）。

### 1. 打包 WAR
```powershell
powershell -ExecutionPolicy Bypass -File build-war.ps1
# 产物：cfm56.war  ->  上下文路径 /cfm56
# 若要作为根应用部署（http://host:8080/），加参数：
powershell -ExecutionPolicy Bypass -File build-war.ps1 -Name ROOT
```
打包脚本只收集运行必需的静态资源（`index.html`、`script.js`、`styles.css`、
`plane.obj`、`plane.mtl`、`sky.hdr`）与 `WEB-INF/web.xml`，自动排除
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
