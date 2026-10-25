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

作者：[Gonzalo-IA](https://gonzalfred.com)。
