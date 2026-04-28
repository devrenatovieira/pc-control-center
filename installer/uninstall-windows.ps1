$ErrorActionPreference = "Stop"

$TaskName = "PC Control Center Agent"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Tarefa removida: $TaskName"
} else {
  Write-Host "Tarefa não encontrada: $TaskName"
}
