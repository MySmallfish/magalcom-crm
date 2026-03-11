[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $ServiceName,
    [Parameter(Mandatory)] [string] $ExecutablePath,
    [switch] $Force
)

if (-not (Test-Path $ExecutablePath)) {
    throw "Executable path '$ExecutablePath' does not exist."
}

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
    if (-not $Force) {
        throw "Service '$ServiceName' already exists. Use -Force to recreate it."
    }

    sc.exe stop $ServiceName | Out-Null
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

sc.exe create $ServiceName binPath= "`"$ExecutablePath`"" start= auto | Out-Null
sc.exe description $ServiceName "Magalcom CRM backend worker service" | Out-Null
sc.exe start $ServiceName | Out-Null
