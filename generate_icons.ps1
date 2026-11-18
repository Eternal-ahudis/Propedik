Add-Type -AssemblyName System.Drawing

$iconsDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$sizes = @(48, 72, 96, 144, 192, 512)

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background circle
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42)) # #0f172a
    $g.FillEllipse($bgBrush, 2, 2, $size - 4, $size - 4)

    # Cyan ring
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 14, 165, 233), [Math]::Max(2, $size / 24))
    $g.DrawEllipse($pen, [Math]::Max(2, $size / 24), [Math]::Max(2, $size / 24), $size - [Math]::Max(4, $size / 12), $size - [Math]::Max(4, $size / 12))

    # Inner medical cross
    $crossBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    $w = $size * 0.18
    $h = $size * 0.54
    $cx = $size / 2
    $cy = $size / 2

    $g.FillRectangle($crossBrush, [float]($cx - $w/2), [float]($cy - $h/2), [float]$w, [float]$h)
    $g.FillRectangle($crossBrush, [float]($cx - $h/2), [float]($cy - $w/2), [float]$h, [float]$w)

    # Central heart / pulse circle
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $dotSize = $size * 0.22
    $g.FillEllipse($dotBrush, [float]($cx - $dotSize/2), [float]($cy - $dotSize/2), [float]$dotSize, [float]$dotSize)

    $innerDotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 13, 148, 136))
    $innerDot = $size * 0.12
    $g.FillEllipse($innerDotBrush, [float]($cx - $innerDot/2), [float]($cy - $innerDot/2), [float]$innerDot, [float]$innerDot)

    $outPath = Join-Path $iconsDir "icon-$size.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated icon: $outPath"
}
