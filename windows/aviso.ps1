# Aviso da Agenda Juridica no Windows.
# Mostra uma janela com os compromissos de hoje, amanha e dos proximos 7 dias.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $root 'config.json'
$cachePath = Join-Path $root 'cache.json'

function Pad2([int]$n) { return $n.ToString('00') }

function TodayIso {
  $d = Get-Date
  return '{0}-{1}-{2}' -f $d.Year, (Pad2 $d.Month), (Pad2 $d.Day)
}

function AddDaysIso([string]$iso, [int]$days) {
  $parts = $iso.Split('-')
  $d = Get-Date -Year ([int]$parts[0]) -Month ([int]$parts[1]) -Day ([int]$parts[2])
  $d = $d.AddDays($days)
  return '{0}-{1}-{2}' -f $d.Year, (Pad2 $d.Month), (Pad2 $d.Day)
}

function FormatDateBr([string]$iso) {
  if (-not $iso) { return '' }
  $parts = $iso.Split('-')
  if ($parts.Count -lt 3) { return $iso }
  return '{0}/{1}/{2}' -f $parts[2], $parts[1], $parts[0]
}

function FormatTimeBr([string]$time) {
  if ($time -match '^(\d{2}):(\d{2})') {
    $h = [int]$Matches[1]
    $m = [int]$Matches[2]
    if ($m -eq 0) { return ('{0}h' -f $h) }
    return ('{0}h{1}' -f $h, (Pad2 $m))
  }
  return $time
}

function NormalizeCode([string]$code) {
  $n = ($code.ToUpper() -replace '[\s–—]', '' -replace '[^A-Z0-9-]', '')
  if ($n -notmatch '-' -and $n.Length -eq 8) {
    $n = $n.Substring(0, 4) + '-' + $n.Substring(4)
  }
  return $n
}

function LoadConfig {
  if (-not (Test-Path $configPath)) {
    throw 'Falta o codigo do escritorio. Rode "Ligar avisos no Windows.cmd" no computador do escritorio.'
  }
  return Get-Content -Raw -Encoding UTF8 $configPath | ConvertFrom-Json
}

function PullAppointments($cfg) {
  $url = ([string]$cfg.supabaseUrl).Trim().TrimEnd('/')
  $key = [string]$cfg.supabaseAnonKey
  $code = NormalizeCode ([string]$cfg.officeCode)
  $headers = @{
    apikey          = $key
    Authorization   = "Bearer $key"
    'Content-Type'  = 'application/json'
  }
  $body = (@{ p_code = $code } | ConvertTo-Json -Compress)
  $remote = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/pull_office" -Headers $headers -Body $body
  $items = @()
  if ($remote.appointments) {
    foreach ($row in $remote.appointments) {
      if ($row.deleted_at) { continue }
      $p = $row.payload
      if ($p -is [string]) {
        try { $p = $p | ConvertFrom-Json } catch { continue }
      }
      if (-not $p) { continue }
      $date = [string]$p.date
      if ($date.Length -ge 10) { $date = $date.Substring(0, 10) }
      $status = [string]$p.status
      if (-not $status) { $status = 'agendado' }
      $items += [pscustomobject]@{
        date       = $date
        time       = [string]$p.time
        clientName = [string]$p.clientName
        courthouse = [string]$p.courthouse
        status     = $status
        type       = [string]$p.type
      }
    }
  }
  $payload = @{ savedAt = (Get-Date).ToString('o'); items = $items }
  ($payload | ConvertTo-Json -Depth 6) | Set-Content -Path $cachePath -Encoding UTF8
  return $items
}

function LoadCache {
  if (-not (Test-Path $cachePath)) { return @() }
  $data = Get-Content -Raw -Encoding UTF8 $cachePath | ConvertFrom-Json
  if ($data.items) { return @($data.items) }
  return @()
}

function DueLines($items) {
  $today = TodayIso
  $tomorrow = AddDaysIso $today 1
  $limit = AddDaysIso $today 7
  $active = @($items | Where-Object {
      $_.status -in @('agendado', 'adiado') -and $_.date -ge $today -and $_.date -le $limit
    } | Sort-Object date, time)

  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($item in $active) {
    if ($item.date -eq $today) { $when = 'Hoje' }
    elseif ($item.date -eq $tomorrow) { $when = 'Amanha' }
    else { $when = FormatDateBr $item.date }
    $bit = '{0}  {1}  {2}' -f $when, (FormatTimeBr $item.time), $item.clientName
    if ($item.courthouse) { $bit += '  ·  ' + $item.courthouse }
    $lines.Add($bit) | Out-Null
  }
  return ,@($lines.ToArray())
}

function ShowWindow([string[]]$lines, [bool]$offline) {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'Agenda Juridica'
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.TopMost = $true
  $form.Width = 460
  $form.Height = 420
  $form.BackColor = [System.Drawing.Color]::FromArgb(243, 240, 232)
  $form.Font = New-Object System.Drawing.Font('Segoe UI', 11)

  $title = New-Object System.Windows.Forms.Label
  $title.Text = 'Compromissos do escritorio'
  $title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 16)
  $title.ForeColor = [System.Drawing.Color]::FromArgb(12, 35, 64)
  $title.Left = 20
  $title.Top = 16
  $title.Width = 410
  $title.Height = 32
  $form.Controls.Add($title)

  $sub = New-Object System.Windows.Forms.Label
  if ($offline) {
    $sub.Text = 'Sem internet agora. Mostrando a ultima lista salva neste computador.'
  } else {
    $sub.Text = 'Hoje, amanha e os proximos 7 dias.'
  }
  $sub.ForeColor = [System.Drawing.Color]::FromArgb(74, 90, 106)
  $sub.Left = 20
  $sub.Top = 50
  $sub.Width = 410
  $sub.Height = 24
  $form.Controls.Add($sub)

  $box = New-Object System.Windows.Forms.TextBox
  $box.Multiline = $true
  $box.ReadOnly = $true
  $box.ScrollBars = 'Vertical'
  $box.BorderStyle = 'FixedSingle'
  $box.BackColor = [System.Drawing.Color]::White
  $box.Left = 20
  $box.Top = 84
  $box.Width = 404
  $box.Height = 230
  if ($lines.Count -eq 0) {
    $box.Text = 'Nenhum compromisso para hoje nem para os proximos 7 dias.'
  } else {
    $box.Text = ($lines -join [Environment]::NewLine)
  }
  $form.Controls.Add($box)

  $ok = New-Object System.Windows.Forms.Button
  $ok.Text = 'Entendi'
  $ok.Width = 140
  $ok.Height = 40
  $ok.Left = 284
  $ok.Top = 328
  $ok.BackColor = [System.Drawing.Color]::FromArgb(12, 35, 64)
  $ok.ForeColor = [System.Drawing.Color]::FromArgb(243, 240, 232)
  $ok.FlatStyle = 'Flat'
  $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.AcceptButton = $ok
  $form.Controls.Add($ok)

  [void]$form.ShowDialog()
}

$offline = $false
$items = @()
try {
  $cfg = LoadConfig
  $items = @(PullAppointments $cfg)
} catch {
  $offline = $true
  $items = @(LoadCache)
}

$lines = DueLines $items
ShowWindow $lines $offline
