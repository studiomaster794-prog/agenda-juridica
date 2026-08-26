Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path (Join-Path $PSScriptRoot '..\..\imagem icone app.png')).Path
$assetDir = (Resolve-Path (Join-Path $PSScriptRoot '..\assets\images')).Path
$source = [System.Drawing.Image]::FromFile($sourcePath)
$navy = [System.Drawing.Color]::FromArgb(255, 4, 25, 47)

function New-IconImage {
  param(
    [string]$OutputPath,
    [int]$Size,
    [bool]$TransparentBackground,
    [double]$ArtworkScale = 1.0
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  if ($TransparentBackground) {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  } else {
    $graphics.Clear($navy)
  }

  $artworkSize = [int]($Size * $ArtworkScale)
  $offset = [int](($Size - $artworkSize) / 2)
  $destination = New-Object System.Drawing.Rectangle($offset, $offset, $artworkSize, $artworkSize)
  $graphics.DrawImage($source, $destination)
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

try {
  New-IconImage (Join-Path $assetDir 'icon.png') 1024 $false 1.0
  New-IconImage (Join-Path $assetDir 'android-icon-foreground.png') 1024 $true 0.86
  New-IconImage (Join-Path $assetDir 'splash-icon.png') 1024 $true 0.82
  New-IconImage (Join-Path $assetDir 'favicon.png') 96 $false 1.0
} finally {
  $source.Dispose()
}
