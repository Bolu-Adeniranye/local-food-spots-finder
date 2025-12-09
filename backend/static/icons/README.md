# PWA Icons

This directory should contain PWA icons for the application.

## Required Icons

The following icon sizes are referenced in `manifest.json`:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## Generating Icons

You can generate these icons using:
1. Online tools like https://realfavicongenerator.net/
2. Image editing software (resize a 512x512 icon)
3. Command line tools like ImageMagick

## Quick Setup

1. Create a 512x512 PNG icon with your app logo
2. Name it `icon-512x512.png`
3. Resize it to all required sizes
4. Place them in this directory with names like `icon-72x72.png`, `icon-96x96.png`, etc.

## Temporary Solution

For development, you can use a simple colored square or download placeholder icons from:
- https://www.flaticon.com/
- https://icons8.com/

The app will work without icons, but PWA installation prompts may not show icons properly.

