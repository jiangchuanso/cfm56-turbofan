# build-war.ps1
# 将 CFM56 涡扇发动机三维体验打包成可在 Tomcat 中部署的 WAR 文件。
#
# 用法:
#   powershell -ExecutionPolicy Bypass -File build-war.ps1
#   powershell -ExecutionPolicy Bypass -File build-war.ps1 -Name ROOT   # 部署为根应用
#
# 说明:
#   - 仅打包运行所需的静态资源（index.html / script.js / styles.css /
#     plane.obj / plane.mtl / sky.hdr）与 WEB-INF/web.xml。
#   - 自动排除 .git、folio-3d（Vite 变体需单独构建）、code-cards、
#     *.py 等开发/演示文件。
#   - 生成的 WAR 文件名决定 Tomcat 中的上下文路径：
#       cfm56.war  -> http://host:8080/cfm56/
#       ROOT.war   -> http://host:8080/

param(
  [string]$Name = 'cfm56'
)

$ErrorActionPreference = 'Stop'
$root   = $PSScriptRoot
$stage  = Join-Path $root '.war-stage'
$warName = "$Name.war"
$warPath = Join-Path $root $warName

# --- 清理旧的暂存区与产物 ---
if (Test-Path $stage)  { Remove-Item $stage  -Recurse -Force }
if (Test-Path $warPath) { Remove-Item $warPath -Force }
New-Item $stage -ItemType Directory | Out-Null

# --- 拷贝运行必需的静态资源 ---
$include = @('index.html', 'script.js', 'styles.css', 'plane.obj', 'plane.mtl', 'sky.hdr')
foreach ($f in $include) {
  $src = Join-Path $root $f
  if (-not (Test-Path $src)) { throw "缺少必需文件: $f" }
  Copy-Item $src (Join-Path $stage $f)
}

# --- 拷贝 WEB-INF/web.xml ---
$webInf = Join-Path $stage 'WEB-INF'
New-Item $webInf -ItemType Directory | Out-Null
Copy-Item (Join-Path (Join-Path $root 'WEB-INF') 'web.xml') $webInf

# --- 打包为 WAR（本质是 ZIP，Tomcat 可直接识别）---
# Compress-Archive 只接受 .zip 扩展名，因此先生成临时 zip 再重命名为 .war。
$zipPath = Join-Path $root '.cfm56-tmp.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -Force
Move-Item $zipPath $warPath -Force
Remove-Item $stage -Recurse -Force

$size = [math]::Round((Get-Item $warPath).Length / 1KB, 1)
Write-Host "已生成 $warPath ($size KB)"
$ctx = if ($Name -eq 'ROOT') { '' } else { $Name }
Write-Host "上下文路径: /$ctx"
