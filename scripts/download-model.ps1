# download-vosk-model.ps1
# This script downloads the required VOSK model to the local public folder.
# This prevents CORS and COEP (require-corp) errors in the browser.

$ProgressPreference = 'SilentlyContinue'

$ModelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
$ModelDir = "public/models"
$ZipFile = "$ModelDir/vosk-model-en.zip"

if (-not (Test-Path $ModelDir)) {
    New-Item -ItemType Directory -Path $ModelDir | Out-Null
    Write-Host "[MeetSync] Created $ModelDir directory." -ForegroundColor Cyan
}

if (-not (Test-Path $ZipFile)) {
    Write-Host "[MeetSync] Downloading VOSK model (40MB)..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $ModelUrl -OutFile $ZipFile
    Write-Host "[MeetSync] Download complete!" -ForegroundColor Green
} else {
    Write-Host "[MeetSync] VOSK model already exists in local storage." -ForegroundColor Green
}

Write-Host "`n[MeetSync] SUCCESS: The AI model is now available locally at $ZipFile" -ForegroundColor Cyan
Write-Host "[MeetSync] IMPORTANT: You can now refresh the browser to start using AI features." -ForegroundColor White
