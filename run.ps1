<#
.SYNOPSIS
    Dolphin Flow - One-Command Launcher (Windows PowerShell)
.DESCRIPTION
    Builds, configures, and boots all services:
    - Docker: PostgreSQL + Redis + Daphne (HTTP & WebSockets) + Celery Worker + Celery Beat
    - Frontend: React / Vite Studio (port 5173)
#>

$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }
Set-Location $rootPath

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🐬  Dolphin Flow - سامانه یکپارچه فرآیندساز و کارتابل" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Docker Daemon
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[-] داکر دسکتاپ باز نیست! در حال راه‌اندازی Docker Desktop..." -ForegroundColor Yellow
        $dockerExe = if (Test-Path "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe") {
            "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
        } else {
            "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        }
        if (Test-Path $dockerExe) {
            Start-Process $dockerExe -ErrorAction SilentlyContinue
            Write-Host "[*] منتظر آماده‌شدن داکر (لطفاً کمی صبر کنید)..." -ForegroundColor Yellow
            $timeout = 45
            while ($timeout -gt 0) {
                Start-Sleep -Seconds 2
                docker info > $null 2>&1
                if ($LASTEXITCODE -eq 0) { break }
                $timeout -= 2
            }
        } else {
            Write-Host "[!] نرم‌افزار Docker Desktop پیدا نشد. لطفاً آن را اجرا کنید." -ForegroundColor Red
        }
    }
} catch {
    Write-Host "[!] خطا در بررسی وضعیت داکر." -ForegroundColor Red
}

# 2. Check .env files
if (-not (Test-Path "$rootPath\backend\.env")) {
    if (Test-Path "$rootPath\backend\.env.example") {
        Write-Host "[*] ایجاد فایل backend\.env از روی نمونه..." -ForegroundColor Gray
        Copy-Item "$rootPath\backend\.env.example" "$rootPath\backend\.env"
    }
}

# 3. Boot all Docker backend services
Write-Host "[*] در حال اجرای سرویس‌های بک‌اند در داکر..." -ForegroundColor Green
docker compose up -d

# 4. Start React Frontend Servers (Dual Port: 5173 for Admin, 5174 for Operator)
Write-Host "[*] در حال بررسی و اجرای پنل مدیریت ادمین (Port 5173)..." -ForegroundColor Green
$adminCheck = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if (-not $adminCheck) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\frontend'; Write-Host '--- [Port 5173] React Admin Studio ---' -ForegroundColor Cyan; npm run dev:admin"
    Start-Sleep -Seconds 2
} else {
    Write-Host "[*] استودیوی مدیریت ادمین از قبل روی پورت ۵۱۷۳ فعال است." -ForegroundColor Gray
}

Write-Host "[*] در حال بررسی و اجرای پورتال اختصاصی اپراتورها (Port 5174)..." -ForegroundColor Green
$operatorCheck = Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
if (-not $operatorCheck) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\frontend'; Write-Host '--- [Port 5174] React Operator Portal ---' -ForegroundColor Green; npm run dev:operator"
    Start-Sleep -Seconds 2
} else {
    Write-Host "[*] پورتال اپراتورها از قبل روی پورت ۵۱۷۴ فعال است." -ForegroundColor Gray
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅  سامانه Dolphin Flow با موفقیت اجرا شد!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "👨‍💼  پورتال اختصاصی اپراتورها:      http://localhost:5174/" -ForegroundColor Green
Write-Host "🛠   استودیو مدیریت فرآیندها (ادمین): http://localhost:5173/" -ForegroundColor Cyan
Write-Host "⚙️   پنل ادمین جنگو:                 http://localhost:8000/admin/" -ForegroundColor White
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "📋  مشاهده لاگ‌های زنده بک‌اند:      docker compose logs -f" -ForegroundColor DarkGray
Write-Host "🛑  خاموش کردن کانتینرها:           docker compose down" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Green
