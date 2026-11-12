# ============================================================
# RetCard 一键构建（不依赖 Gradle：aapt2 + javac + d8 + apksigner）
# 用法:  powershell -ExecutionPolicy Bypass -File .\build.ps1
# 依赖:  JDK 17+（javac/keytool）、Android SDK build-tools 35、Python 3
# ============================================================
$ErrorActionPreference = "Stop"

$SDK = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { "C:\Android\Sdk" }
$BT  = Join-Path $SDK "build-tools\35.0.0"
$AJ  = Join-Path $SDK "platforms\android-35\android.jar"
$JAVAC   = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\javac.exe" }   else { "javac" }
$KEYTOOL = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\keytool.exe" } else { "keytool" }

$P   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$APP = Join-Path $P "app"
$B   = Join-Path $P "build"

Write-Host "[1/7] clean" -ForegroundColor Cyan
Remove-Item (Join-Path $B "gen"), (Join-Path $B "classes"), (Join-Path $B "dex") -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path (Join-Path $B "gen"), (Join-Path $B "classes"), (Join-Path $B "dex") | Out-Null

Write-Host "[2/7] aapt2 compile" -ForegroundColor Cyan
& (Join-Path $BT "aapt2.exe") compile --dir (Join-Path $APP "res") -o (Join-Path $B "res.zip")

Write-Host "[3/7] aapt2 link" -ForegroundColor Cyan
& (Join-Path $BT "aapt2.exe") link -o (Join-Path $B "base.apk") -I $AJ --manifest (Join-Path $APP "AndroidManifest.xml") -A (Join-Path $APP "assets") --java (Join-Path $B "gen") --min-sdk-version 23 --target-sdk-version 34 --version-code 1 --version-name "1.0" (Join-Path $B "res.zip")

Write-Host "[4/7] javac" -ForegroundColor Cyan
& $JAVAC -nowarn -encoding UTF-8 -source 8 -target 8 -bootclasspath $AJ -classpath $AJ -d (Join-Path $B "classes") (Join-Path $APP "java\com\pineapple\retcard\MainActivity.java") (Join-Path $B "gen\com\pineapple\retcard\R.java")

Write-Host "[5/7] d8" -ForegroundColor Cyan
$cls = Get-ChildItem (Join-Path $B "classes") -Recurse -Filter *.class | ForEach-Object { $_.FullName }
& (Join-Path $BT "d8.bat") --lib $AJ --min-api 23 --output (Join-Path $B "dex") $cls

Write-Host "[6/7] pack apk" -ForegroundColor Cyan
$pack = @"
import zipfile, shutil, os, sys
P = sys.argv[1]
base = os.path.join(P, "build", "base.apk")
dex  = os.path.join(P, "build", "dex", "classes.dex")
out  = os.path.join(P, "build", "unsigned.apk")
if os.path.exists(out): os.remove(out)
shutil.copyfile(base, out)
with zipfile.ZipFile(out, "a", zipfile.ZIP_DEFLATED) as z: z.write(dex, "classes.dex")
print("packed", os.path.getsize(out))
"@
$pack | Out-File -Encoding utf8 (Join-Path $B "pack.py")
python (Join-Path $B "pack.py") $P

Write-Host "[7/7] zipalign + sign" -ForegroundColor Cyan
& (Join-Path $BT "zipalign.exe") -f 4 (Join-Path $B "unsigned.apk") (Join-Path $B "aligned.apk")
$ks = Join-Path $P "pineapple.keystore"
if (-not (Test-Path $ks)) {
  & $KEYTOOL -genkeypair -keystore $ks -alias pineapple -keyalg RSA -keysize 2048 -validity 10950 -storepass pineapple123 -keypass pineapple123 -dname "CN=Pineapple,OU=RetCard,O=Pineapple,L=Shanghai,ST=Shanghai,C=CN"
}
& (Join-Path $BT "apksigner.bat") sign --ks $ks --ks-key-alias pineapple --ks-pass pass:pineapple123 --key-pass pass:pineapple123 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out (Join-Path $P "RetCard-1.0.apk") (Join-Path $B "aligned.apk")
& (Join-Path $BT "apksigner.bat") verify --print-certs (Join-Path $P "RetCard-1.0.apk")

Write-Host "done -> RetCard-1.0.apk" -ForegroundColor Green
