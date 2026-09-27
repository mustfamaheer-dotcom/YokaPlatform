Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$sourcePath,
        [string]$destPath,
        [int]$targetWidth,
        [int]$targetHeight
    )

    $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
    $destBitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)

    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fill background white or transparent
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillRectangle($brush, 0, 0, $targetWidth, $targetHeight)
    $brush.Dispose()

    # Draw image centered keeping aspect ratio or fit
    $srcRatio = $srcImage.Width / $srcImage.Height
    $destRatio = $targetWidth / $targetHeight

    if ($srcRatio -gt $destRatio) {
        $w = $targetWidth
        $h = [int]($targetWidth / $srcRatio)
        $x = 0
        $y = [int](($targetHeight - $h) / 2)
    } else {
        $h = $targetHeight
        $w = [int]($targetHeight * $srcRatio)
        $x = [int](($targetWidth - $w) / 2)
        $y = 0
    }

    $destRect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $graphics.DrawImage($srcImage, $destRect, 0, 0, $srcImage.Width, $srcImage.Height, [System.Drawing.GraphicsUnit]::Pixel)

    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $destBitmap.Dispose()
    $srcImage.Dispose()
}

$source = Join-Path $PSScriptRoot "..\img\yokaStore.png"
$source = [System.IO.Path]::GetFullPath($source)

$outDir = Join-Path $PSScriptRoot "..\client-ecp\public\icons"
$outDir = [System.IO.Path]::GetFullPath($outDir)
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$icon192 = Join-Path $outDir "icon-192.png"
$icon512 = Join-Path $outDir "icon-512.png"

Resize-Image -sourcePath $source -destPath $icon192 -targetWidth 192 -targetHeight 192
Write-Host "Created $icon192"

Resize-Image -sourcePath $source -destPath $icon512 -targetWidth 512 -targetHeight 512
Write-Host "Created $icon512"
