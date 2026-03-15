$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $root
$logDir = Join-Path $repo 'demo-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$storeBase = Join-Path $env:TEMP 'wrk-base-demo'
New-Item -ItemType Directory -Force -Path $storeBase | Out-Null

$routerLog = Join-Path $logDir 'router.out.log'
$routerErr = Join-Path $logDir 'router.err.log'
$gatewayLog = Join-Path $logDir 'gateway.out.log'
$gatewayErr = Join-Path $logDir 'gateway.err.log'
$textLog = Join-Path $logDir 'text.out.log'
$textErr = Join-Path $logDir 'text.err.log'
$imageLog = Join-Path $logDir 'image.out.log'
$imageErr = Join-Path $logDir 'image.err.log'

$procs = @()

function Start-Worker($name, $type, $rack, $outPath, $errPath) {
  $storeDir = Join-Path $storeBase $rack
  $proc = Start-Process node -ArgumentList @('worker.js','--wtype',$type,'--env','development','--rack',$rack,'--storeDir',$storeDir) -WorkingDirectory $repo -RedirectStandardOutput $outPath -RedirectStandardError $errPath -PassThru
  Write-Host "Started $name (PID $($proc.Id))"
  $script:procs += $proc
}

try {
  Start-Worker 'router' 'router' 'router-1' $routerLog $routerErr
  Start-Worker 'gateway' 'gateway' 'gateway-1' $gatewayLog $gatewayErr
  Start-Worker 'text' 'text_inference' 'text-1' $textLog $textErr
  Start-Worker 'image' 'image_inference' 'image-1' $imageLog $imageErr

  Start-Sleep -Seconds 3

  $gatewayKey = $null
  for ($i = 0; $i -lt 30 -and -not $gatewayKey; $i++) {
    if (Test-Path $gatewayLog) {
      $matches = Select-String -Path $gatewayLog -Pattern 'gateway rpc ready' | Select-Object -Last 1
      if ($matches) {
        try {
          $json = $matches.Line | ConvertFrom-Json
          if ($json.rpcPublicKey) {
            $gatewayKey = $json.rpcPublicKey
            break
          }
        } catch {}
      }
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $gatewayKey) {
    throw 'Gateway key not found. Check demo-logs/gateway.log'
  }

  Write-Host "Gateway key: $gatewayKey"
  Write-Host 'Running client request...'
  Start-Sleep -Seconds 2
  node client.js 'I love this' --model sentiment --gateway $gatewayKey

  Write-Host "Logs saved to $logDir"
} finally {
  foreach ($proc in $procs) {
    try { Stop-Process -Id $proc.Id -Force } catch {}
  }
  Write-Host 'Stopped services.'
}
