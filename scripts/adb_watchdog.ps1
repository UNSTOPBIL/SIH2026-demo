# ADB Reverse Watchdog: ensures ports 3000 and 8000 remain continuously forwarded to phone
$adb = "C:\Program Files\ASUS\GlideX\adb.exe"

while ($true) {
    try {
        $devs = & $adb devices
        if ($devs -match "device\s*$") {
            $rev = (& $adb reverse --list | Out-String)
            if (-not $rev.Contains("tcp:3000")) {
                & $adb reverse tcp:3000 tcp:3000 | Out-Null
                & $adb reverse tcp:8000 tcp:8000 | Out-Null
                & $adb forward tcp:9222 localabstract:chrome_devtools_remote | Out-Null
                Write-Host "Re-established ADB reverse port forwarding."
            }
        }
    } catch {
        # ignore transient errors
    }
    Start-Sleep -Seconds 5
}
