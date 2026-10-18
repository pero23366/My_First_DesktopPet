<#
.SYNOPSIS
    把桌面版（WPF 桌宠）打成可以直接发到 GitHub Releases 的 zip。

.DESCRIPTION
    为什么要自包含（--self-contained）：
        桌面版的目标框架是 net10.0-windows，而 Windows 10/11 只自带 .NET Framework 4.8，
        不自带 .NET 10。框架依赖版虽然只有 4MB，却要求用户先去微软官网装
        ".NET 10 Desktop Runtime"（约 55MB）—— 普通用户多半在这一步放弃。
        所以选 137MB 的单文件自包含：双击即用，代价只是下载慢一点。

    为什么用 ASCII 文件名：
        zip 里如果带中文名，在部分解压工具 / 老系统上会乱码。
        发给所有人下载的东西，文件名保持 xiaowo-... 这种形式最稳。

.PARAMETER ProjectPath
    WPF 项目所在目录（会自动找里面的 .csproj）。

.PARAMETER Version
    版本号，只用于产物命名，不会改代码里的 AssemblyVersion。

.PARAMETER OutDir
    产物输出目录，默认在仓库根的 release/（已被 .gitignore 排除）。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\publish-desktop.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\publish-desktop.ps1 -Version 1.1.0
#>
[CmdletBinding()]
param(
    [string]$ProjectPath = 'D:\code\项目\工具\AI桌宠_V1.0.0',
    [string]$Version = '1.0.0',
    [string]$OutDir = (Join-Path $PSScriptRoot '..\release'),
    [switch]$KeepStaging
)

$ErrorActionPreference = 'Stop'

# 控制台默认编码是 GBK，中文输出在某些终端里会变成乱码
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Write-Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host "    $text" -ForegroundColor Green }

# ---------- 1. 校验输入 ----------
if (-not (Test-Path $ProjectPath)) {
    throw "找不到项目目录：$ProjectPath`n（用 -ProjectPath 参数指定 WPF 项目所在目录）"
}

$csproj = Get-ChildItem -Path $ProjectPath -Filter *.csproj -File | Select-Object -First 1
if (-not $csproj) { throw "目录里没有 .csproj：$ProjectPath" }

$rid = 'win-x64'
# 产物名保持 ASCII：中文名在 zip / 某些解压工具里会乱码
$assetBase = "xiaowo-desktop-v$Version-$rid"
$zipPath = Join-Path $OutDir "$assetBase.zip"
$staging = Join-Path $env:TEMP ("petpublish_" + [guid]::NewGuid().ToString('N').Substring(0, 8))

Write-Step "项目：$($csproj.Name)"
Write-Step "输出：$zipPath"

# ---------- 2. 发布 ----------
Write-Step 'dotnet publish（自包含单文件，约需 1 分钟）'
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$publishArgs = @(
    $csproj.FullName
    '-c', 'Release'
    '-r', $rid
    '--self-contained', 'true'
    '-p:PublishSingleFile=true'
    # WPF 需要把原生库一起塞进单文件，否则运行时报找不到 hostfxr
    '-p:IncludeNativeLibrariesForSelfExtract=true'
    # 不发布调试符号：省体积，也别把路径信息带给用户
    '-p:DebugType=none'
    '-p:DebugSymbols=false'
    '-o', $staging
)

& dotnet publish @publishArgs
if ($LASTEXITCODE -ne 0) { throw "dotnet publish 失败（退出码 $LASTEXITCODE）" }

$exe = Get-ChildItem -Path $staging -Filter *.exe | Where-Object { $_.Name -notlike '*.pdb' } | Select-Object -First 1
if (-not $exe) { throw "发布成功但没找到 exe，检查 ProjectPath 指向的是不是 WPF 项目" }
$exeMB = [math]::Round($exe.Length / 1MB, 1)
Write-Ok "exe：$($exe.Name)（$exeMB MB）"

# ---------- 3. 压缩 ----------
Write-Step '压缩成 zip'
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
$zipMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Ok "zip：$zipMB MB"

# ---------- 4. SHA256 ----------
# 未签名的 exe 一定会被 SmartScreen 拦，校验值是让用户能自证"文件没被改过"的唯一手段
Write-Step '计算 SHA256'
$hash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLower()
"$hash  $assetBase.zip" | Set-Content -Path "$zipPath.sha256" -Encoding ASCII
Write-Ok $hash

# ---------- 5. 清理 ----------
if (-not $KeepStaging) { Remove-Item $staging -Recurse -Force }

# ---------- 6. 下一步提示 ----------
Write-Host ''
Write-Host '产物已就绪：' -ForegroundColor Yellow
Write-Host "  $zipPath"
Write-Host "  $zipPath.sha256"
Write-Host ''
Write-Host '发布到 GitHub（gh CLI 没装，走网页上传）：' -ForegroundColor Yellow
Write-Host "  1. 打开 https://github.com/pero23366/My_First_DesktopPet/releases/new"
Write-Host "  2. Tag 填 v$Version，标题填「小沃桌宠 v$Version」"
Write-Host '  3. 把上面两个文件拖进附件区，先点 Save draft 再检查一遍，最后 Publish release'
Write-Host '  4. 网页首页的「下载桌面版」指向 releases/latest，发完立刻生效，不用改代码'
Write-Host ''
Write-Host '注意：单个文件超过 100MB 不能进 git 仓库，只能作为 Release 附件（上限 2GB）。' -ForegroundColor DarkGray
