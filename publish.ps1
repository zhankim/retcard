# RetCard 发布脚本（首次运行会引导 GitHub 登录）
# 用法: powershell -ExecutionPolicy Bypass -File .\publish.ps1
param([string]$Repo = "retcard")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Definition)

gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  if ($env:GH_TOKEN) { $env:GH_TOKEN | gh auth login --with-token }
  else { gh auth login -h github.com -p https -w }
}

$login = (gh api user -q .login).Trim()
Write-Host "账号 $login" -ForegroundColor Cyan

$readme = Join-Path $PWD "README.md"
$text = Get-Content $readme -Raw -Encoding UTF8
if ($text -match "github.com/USER/") {
  $text = $text -replace "github.com/USER/", "github.com/$login/"
  [System.IO.File]::WriteAllText($readme, $text, [System.Text.UTF8Encoding]::new($false))
  git add README.md
  git commit -q -m "docs: link repo to $login"
}

gh repo create $Repo --public --description "退货地址制卡：粘贴退货信息一键生成四平台退货卡图（离线/无广告/无账号）" --source=. --remote=origin --push
git tag v1.0.0 -f
git push -f origin v1.0.0
gh release create v1.0.0 "RetCard-1.0.apk" --title "RetCard 1.0" --notes "首个公开版本：4 套模板、地址识别、纯离线渲染、0.75 MB"

$u = (gh repo view --json url -q .url).Trim()
Write-Host "完成 $u" -ForegroundColor Green
