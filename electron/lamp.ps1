# Turns camera flash on via Windows.Devices.Lights.Lamp API.
# Stays resident while torch is ON — kill the process to turn it off.
# The WinRT runtime cleans up the Lamp object on exit, disabling the LED.
param()
$ErrorActionPreference = 'SilentlyContinue'

try {
    [void][Windows.Devices.Lights.Lamp,Windows.Devices.Lights,ContentType=WindowsRuntime]
    [void][Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime]

    $selector = [Windows.Devices.Lights.Lamp]::GetDeviceSelector()
    $devices  = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector).GetAwaiter().GetResult()

    if (-not $devices -or $devices.Count -eq 0) {
        [Console]::Error.WriteLine("NO_LAMP_DEVICE")
        exit 1
    }

    $lamp = [Windows.Devices.Lights.Lamp]::FromIdAsync($devices[0].Id).GetAwaiter().GetResult()
    if (-not $lamp) {
        [Console]::Error.WriteLine("LAMP_OPEN_FAILED")
        exit 1
    }

    $lamp.IsEnabled = $true
    Write-Output "ON"
    [Console]::Out.Flush()

    # Stay alive — Windows WinRT tears down the Lamp (turning LED off) when this process exits
    while ($true) { Start-Sleep -Milliseconds 500 }
}
catch {
    [Console]::Error.WriteLine("ERROR:$($_.Exception.Message)")
    exit 1
}
