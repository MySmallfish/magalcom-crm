[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $PackageRoot,
    [Parameter(Mandatory)] [string] $WebAppDestination,
    [Parameter(Mandatory)] [string] $WebApiDestination,
    [Parameter(Mandatory)] [string] $BackendDestination,
    [int] $WebAppPort = 7001,
    [int] $WebApiPort = 7002,
    [string] $WebAppSiteName = "Magalcom CRM WebApp",
    [string] $WebApiSiteName = "Magalcom CRM WebApi",
    [string] $WebAppAppPool = "MagalcomCrmWebApp",
    [string] $WebApiAppPool = "MagalcomCrmWebApi",
    [string] $BackendServiceName = "MagalcomCrmBackend",
    [switch] $SkipDatabase,
    [string] $SqlConnectionString,
    [string] $SqlPackagePath = "sqlpackage",
    [switch] $Force
)

$webAppPackage = Join-Path $PackageRoot 'webapp'
$webApiPackage = Join-Path $PackageRoot 'webapi'
$backendPackage = Join-Path $PackageRoot 'backend'

function Invoke-RobocopyMirror {
    param(
        [Parameter(Mandatory)] [string] $Source,
        [Parameter(Mandatory)] [string] $Destination
    )

    robocopy $Source $Destination /MIR | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed for '$Source' -> '$Destination' with exit code $LASTEXITCODE."
    }
}

foreach ($requiredPath in @($webAppPackage, $webApiPackage, $backendPackage)) {
    if (-not (Test-Path $requiredPath)) {
        throw "Required package path '$requiredPath' was not found."
    }
}

New-Item -ItemType Directory -Force -Path $WebAppDestination, $WebApiDestination, $BackendDestination | Out-Null
Invoke-RobocopyMirror -Source $webAppPackage -Destination $WebAppDestination
Invoke-RobocopyMirror -Source $webApiPackage -Destination $WebApiDestination
Invoke-RobocopyMirror -Source $backendPackage -Destination $BackendDestination

& (Join-Path $PSScriptRoot 'install-iis-site.ps1') -SiteName $WebAppSiteName -PhysicalPath $WebAppDestination -AppPoolName $WebAppAppPool -Port $WebAppPort -Force:$Force
& (Join-Path $PSScriptRoot 'install-iis-site.ps1') -SiteName $WebApiSiteName -PhysicalPath $WebApiDestination -AppPoolName $WebApiAppPool -Port $WebApiPort -Force:$Force
& (Join-Path $PSScriptRoot 'install-backend-service.ps1') -ServiceName $BackendServiceName -ExecutablePath (Join-Path $BackendDestination 'Magalcom.Crm.Backend.exe') -Force:$Force

if (-not $SkipDatabase) {
    if ([string]::IsNullOrWhiteSpace($SqlConnectionString)) {
        throw 'SqlConnectionString is required unless -SkipDatabase is specified.'
    }

    & (Join-Path $PSScriptRoot 'publish-database.ps1') -ConnectionString $SqlConnectionString -SqlPackagePath $SqlPackagePath -DacpacPath (Join-Path $PackageRoot 'database\Magalcom.Crm.Database.dacpac')
}
