$ErrorActionPreference = "Stop"

$AppName = "pc-control-center"
$TaskName = "PC Control Center Agent"
$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AgentPath = Join-Path $ProjectDir "agent\agent.js"

$Node = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $Node) {
  throw "Node.js não encontrado. Instale Node.js antes de instalar o agente."
}

if (-not (Test-Path $AgentPath)) {
  throw "agent\agent.js não encontrado em $ProjectDir."
}

$Action = New-ScheduledTaskAction -Execute $Node.Source -Argument "`"$AgentPath`" --daemon" -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "$AppName Telegram agent" -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

$Task = Get-ScheduledTask -TaskName $TaskName
if (-not $Task) {
  throw "A tarefa $TaskName não foi criada."
}

Write-Host "Tarefa criada e iniciada: $TaskName"
