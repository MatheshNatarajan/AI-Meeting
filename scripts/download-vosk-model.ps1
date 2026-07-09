# download-vosk-model.ps1
# This script downloads the VOSK model for local AI transcription.
# We download to a temp location to avoid locking conflicts with Vite HMR.

$ProgressPreference = 'SilentlyContinue'
$ModelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
$ModelDir = "public/models"
$ZipFile = "$ModelDir/vosk-model-en.zip"
$TempZip = "scripts/temp-model.zip"

write-host "[MeetSync] Starting AI Model Setup..." -ForegroundColor Green

if (-not (Test-Path $ModelDir)) {
    New-Item -ItemType Directory -Path $ModelDir -Force | Out-Null
    Write-Host "[MeetSync] Created directory: $ModelDir" -ForegroundColor Cyan
}

if (Test-Path $ZipFile) {
    $size = (Get-Item $ZipFile).Length
    if ($size -gt 10MB) {
        Write-Host "[MeetSync] VOSK AI model already exists and looks valid ($($size / 1MB) MB)." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "[MeetSync] Found existing model file but it seems corrupted (too small). Re-downloading..." -ForegroundColor Yellow
        Remove-Item $ZipFile -Force
    }
}

Write-Host "[MeetSync] Downloading VOSK AI model (approx. 40MB)..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $ModelUrl -OutFile $TempZip -ErrorAction Stop
    Move-Item -Path $TempZip -Destination $ZipFile -Force -ErrorAction Stop
    Write-Host "[MeetSync] Download complete and verified!" -ForegroundColor Green
} catch {
    Write-Host "[MeetSync] ERROR: Download failed: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $TempZip) { Remove-Item $TempZip -Force }
    exit 1
}

Write-Host "`n[MeetSync] SUCCESS: AI Speech intelligence is now available at $ZipFile" -ForegroundColor Cyan
Write-Host "[MeetSync] IMPORTANT: Refresh your browser at https://localhost:5173/ to start transcribing." -ForegroundColor White
