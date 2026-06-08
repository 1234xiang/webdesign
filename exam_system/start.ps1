Set-Location $PSScriptRoot

function Get-UsablePython {
    $venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        & $venvPython -c "import flask, flask_cors" *> $null
        if ($LASTEXITCODE -eq 0) {
            return $venvPython
        }
    }

    try {
        $systemPython = (Get-Command python -ErrorAction Stop).Source
        & $systemPython -c "import flask, flask_cors" *> $null
        if ($LASTEXITCODE -eq 0) {
            return $systemPython
        }
    } catch {
    }

    $fallbackPython = "C:\Users\yuyuyu\AppData\Local\Programs\Python\Python312\python.exe"
    if (Test-Path $fallbackPython) {
        & $fallbackPython -c "import flask, flask_cors" *> $null
        if ($LASTEXITCODE -eq 0) {
            return $fallbackPython
        }
    }

    return $null
}

$pythonExe = Get-UsablePython

if (-not $pythonExe) {
    Write-Host ""
    Write-Host "No usable Python runtime was found, or Flask dependencies are missing." -ForegroundColor Red
    Write-Host "Please make sure Python 3.12 is installed, then install dependencies:" -ForegroundColor Yellow
    Write-Host "pip install flask flask-cors gunicorn" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting website..." -ForegroundColor Green
Write-Host "Open: http://127.0.0.1:5000" -ForegroundColor Cyan
Write-Host "Keep this window open. Closing it will stop the site." -ForegroundColor Yellow
Write-Host ""

& $pythonExe app.py
