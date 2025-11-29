# Asset Creation Guide

The app requires several image assets. You can create these using design tools like Figma, Canva, or Adobe Illustrator.

## Required Assets

### 1. App Icon (`assets/icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Content**: Logo representing a bicycle or Karunya Institute
- **Colors**: Use blue (#1e40af) as primary color

### 2. Splash Screen (`assets/splash.png`)
- **Size**: 2048x2048 pixels (will be cropped to fit)
- **Format**: PNG
- **Content**: App logo with "Karunya Cycle Rental" text
- **Background**: White or light blue

### 3. Adaptive Icon (`assets/adaptive-icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Content**: Same as app icon but centered
- **Safe zone**: Keep important elements within 768x768px center

### 4. Favicon (`assets/favicon.png`)
- **Size**: 48x48 pixels
- **Format**: PNG
- **Content**: Simplified version of app icon

## Quick Creation Tips

### Using Canva (Free)
1. Go to [Canva.com](https://www.canva.com)
2. Create custom size: 1024x1024
3. Search for "bicycle" or "cycle" icons
4. Add "Karunya Cycle Rental" text
5. Use brand colors (blue #1e40af)
6. Download as PNG

### Using Figma (Free)
1. Create 1024x1024 frame
2. Design your icon/logo
3. Export as PNG at 1x

### Using AI Image Generators
- Use DALL-E or Midjourney
- Prompt: "Modern minimalist bicycle logo for mobile app, blue color, simple design, professional"

## Default Placeholder

Until you create custom assets, you can use these:

### Temporary Solution
Create simple colored squares:
- **icon.png**: Blue square with white bicycle emoji 🚲
- **splash.png**: White background with centered logo
- **adaptive-icon.png**: Same as icon
- **favicon.png**: Scaled down version

## Creating Programmatically

### Using ImageMagick (Command Line)

```bash
# Create a simple blue icon with text
convert -size 1024x1024 xc:#1e40af \
  -gravity center \
  -fill white \
  -pointsize 200 \
  -annotate +0+0 "🚲" \
  assets/icon.png

# Create splash screen
convert -size 2048x2048 xc:white \
  -gravity center \
  -fill #1e40af \
  -pointsize 100 \
  -annotate +0-200 "Karunya" \
  -annotate +0-50 "Cycle Rental" \
  assets/splash.png
```

### Using Node.js (with sharp library)

```javascript
const sharp = require('sharp');

// Create icon
sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 30, g: 64, b: 175, alpha: 1 }
  }
})
.composite([{
  input: Buffer.from('<svg><!-- bicycle icon SVG --></svg>'),
  top: 312,
  left: 312
}])
.png()
.toFile('assets/icon.png');
```

## Online Tools

### Free Icon Makers
- [App Icon Generator](https://appicon.co/) - Upload image, generates all sizes
- [Make App Icon](https://makeappicon.com/) - Free icon generator
- [Icon Kitchen](https://icon.kitchen/) - Android icon generator

### Free Design Resources
- [Flaticon](https://www.flaticon.com/) - Free icons
- [Undraw](https://undraw.co/) - Free illustrations
- [Freepik](https://www.freepik.com/) - Free vectors

## Asset Checklist

After creating assets, verify:

- [ ] All files are in `assets/` folder
- [ ] `icon.png` is 1024x1024
- [ ] `splash.png` is 2048x2048
- [ ] `adaptive-icon.png` is 1024x1024
- [ ] `favicon.png` is 48x48
- [ ] PNG format with transparency (except splash)
- [ ] No copyrighted content
- [ ] Recognizable at small sizes (32x32)
- [ ] Matches brand colors

## Testing Assets

After adding assets, run:

```bash
expo start
```

You should see your custom icon in:
- Expo Go app
- Standalone builds
- Web browser tab (favicon)

## Notes

- Keep backup copies of original designs
- Use vector formats (.svg, .ai) for source files
- Export at 2x or 3x for better quality
- Consider accessibility (good contrast)
- Test on both light and dark backgrounds

---

For professional assets, consider hiring a designer on Fiverr or 99designs.
