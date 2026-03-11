[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $ConnectionString,
    [string] $SqlPackagePath = "sqlpackage",
    [string] $DacpacPath = "$(Join-Path $PSScriptRoot '..\database\Magalcom.Crm.Database.dacpac')"
)

if (-not (Test-Path $DacpacPath)) {
    throw "Dacpac '$DacpacPath' was not found."
}

& $SqlPackagePath /Action:Publish /SourceFile:$DacpacPath /TargetConnectionString:$ConnectionString /p:CreateNewDatabase=True /p:BlockOnPossibleDataLoss=False /p:DropObjectsNotInSource=False
