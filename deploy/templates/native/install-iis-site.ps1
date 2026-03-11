[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $SiteName,
    [Parameter(Mandatory)] [string] $PhysicalPath,
    [Parameter(Mandatory)] [string] $AppPoolName,
    [Parameter(Mandatory)] [int] $Port,
    [string] $HostHeader = "",
    [switch] $Force
)

Import-Module WebAdministration -ErrorAction Stop

if (-not (Test-Path $PhysicalPath)) {
    throw "Physical path '$PhysicalPath' does not exist."
}

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
}

Set-ItemProperty "IIS:\AppPools\$AppPoolName" managedRuntimeVersion ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" processModel.identityType 4

if (Test-Path "IIS:\Sites\$SiteName") {
    if (-not $Force) {
        throw "Site '$SiteName' already exists. Use -Force to recreate it."
    }

    Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
    Remove-Website -Name $SiteName
}

New-Website -Name $SiteName -PhysicalPath $PhysicalPath -ApplicationPool $AppPoolName -Port $Port -HostHeader $HostHeader | Out-Null
