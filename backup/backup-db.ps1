param(
  [string]$DbPath = $env:DB_FILE,
  [string]$Destination = "./backups"
)

if (-not $DbPath) {
  Write-Error "DB_FILE が設定されていません"
  exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetDir = Join-Path $Destination $timestamp
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$sqlite = "sqlite3"

& $sqlite $DbPath "PRAGMA wal_checkpoint(FULL);" | Out-Null

Copy-Item -Path $DbPath -Destination (Join-Path $targetDir (Split-Path $DbPath -Leaf)) -Force
$walPath = "$DbPath-wal"
if (Test-Path $walPath) {
  Copy-Item -Path $walPath -Destination (Join-Path $targetDir (Split-Path $walPath -Leaf)) -Force
}

Write-Output "バックアップを作成しました: $targetDir"
