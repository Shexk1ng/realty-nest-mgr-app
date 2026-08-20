# Uruchamia polecenie w prawdziwym oknie konsoli Windows PowerShell i zapisuje
# zrzut tego okna do pliku PNG. Zrzuty wykorzystywane sa jako material
# dowodowy w rozdziale czwartym pracy magisterskiej.
#
# Uzycie:
#   .\capture-console.ps1 -WorkDir <katalog> -Cmd "<polecenie>" -Out <plik.png> [-Cols 140] [-Rows 52]

param(
  [Parameter(Mandatory=$true)][string]$WorkDir,
  [Parameter(Mandatory=$true)][string]$Cmd,
  [Parameter(Mandatory=$true)][string]$Out,
  [int]$Cols = 140,
  [int]$Rows = 52,
  [int]$TimeoutSec = 420
)

Add-Type -AssemblyName System.Windows.Forms, System.Drawing

# Definicja funkcji WinAPI potrzebnych do odnalezienia i zmierzenia okna.
if (-not ([System.Management.Automation.PSTypeName]'Win32Cap').Type) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Cap {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
}

$done = Join-Path $env:TEMP ("cap_" + [guid]::NewGuid().ToString("N") + ".done")

# Skrypt wykonywany w nowym oknie: ustawia rozmiar bufora i okna, drukuje
# znak zachety z poleceniem (aby zrzut wygladal jak realna sesja), uruchamia
# polecenie, a na koniec sygnalizuje zakonczenie przez utworzenie pliku.
$inner = @"
`$ErrorActionPreference = 'Continue'
try {
  `$raw = `$Host.UI.RawUI
  `$raw.BufferSize = New-Object Management.Automation.Host.Size($Cols, 3000)
  `$raw.WindowSize = New-Object Management.Automation.Host.Size($Cols, $Rows)
  `$raw.WindowTitle = 'Windows PowerShell - Realty Nest - testy'
} catch {}
Set-Location '$WorkDir'
Clear-Host
Write-Host "PS `$(Get-Location)> " -NoNewline -ForegroundColor Cyan
Write-Host "$($Cmd -replace '"','`"')" -ForegroundColor Yellow
$Cmd
New-Item -ItemType File -Path '$done' -Force | Out-Null
"@

$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inner))
$proc = Start-Process powershell.exe -PassThru `
  -ArgumentList @('-NoExit','-NoProfile','-EncodedCommand',$encoded)

# Uchwyt okna nie jest dostepny natychmiast po starcie procesu - wymaga
# odswiezenia obiektu procesu az system utworzy okno konsoli.
$hwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 300
  try { $proc.Refresh() } catch {}
  if ($proc.MainWindowHandle -ne [IntPtr]::Zero) { $hwnd = $proc.MainWindowHandle; break }
}
if ($hwnd -eq [IntPtr]::Zero) { Write-Output "BLAD: nie uzyskano uchwytu okna"; exit 1 }

# Oczekiwanie na zakonczenie polecenia w oknie potomnym.
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while (-not (Test-Path $done) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 400 }
Start-Sleep -Milliseconds 1500   # domalowanie ostatnich wierszy

# Wysuniecie okna na wierzch i zrzut jego prostokata.
[void][Win32Cap]::ShowWindow($hwnd, 9)   # SW_RESTORE
[void][Win32Cap]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 1000

$r = New-Object Win32Cap+RECT
[void][Win32Cap]::GetWindowRect($hwnd, [ref]$r)
$w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top

if ($w -le 0 -or $h -le 0) { Write-Output "BLAD: nie udalo sie zmierzyc okna"; exit 1 }

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
$dir = Split-Path $Out -Parent
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

try { $proc.CloseMainWindow() | Out-Null; Start-Sleep -Milliseconds 300; if (-not $proc.HasExited) { $proc.Kill() } } catch {}
Remove-Item $done -ErrorAction SilentlyContinue

Write-Output "zapisano: $Out ($w x $h)"
