const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createRoundIcon(inputPath, outputPath, size) {
  try {
    // 画像のメタデータを取得
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;
    
    // 正方形にクロップ（中央部分を取得）
    let left = 0;
    let top = 0;
    let cropSize;
    
    if (width > height) {
      // 横長の場合、中央を正方形に
      cropSize = height;
      left = Math.floor((width - height) / 2);
    } else {
      // 縦長の場合、中央を正方形に
      cropSize = width;
      top = Math.floor((height - width) / 2);
    }
    
    // 正方形にクロップしてリサイズ
    let image = await sharp(inputPath)
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(size, size, { fit: 'cover' });
    
    // 丸いマスクを作成
    const svgMask = `
      <svg width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
      </svg>
    `;
    
    // 丸いマスクを適用
    const rounded = await image
      .composite([
        {
          input: Buffer.from(svgMask),
          blend: 'dest-in'
        }
      ])
      .png()
      .toBuffer();
    
    // 保存
    await fs.promises.writeFile(outputPath, rounded);
    console.log(`✓ 丸いアイコンを作成しました: ${outputPath} (${size}x${size})`);
    
    return true;
  } catch (error) {
    console.error(`エラーが発生しました (${outputPath}):`, error.message);
    return false;
  }
}

async function main() {
  const inputPath = 'app/icon.png';
  
  // 複数のサイズで作成
  const sizes = [
    { size: 512, path: 'app/icon.png' },
    { size: 512, path: 'public/favicon.png' },
    { size: 180, path: 'public/apple-touch-icon.png' },
    { size: 32, path: 'public/favicon-32x32.png' },
    { size: 16, path: 'public/favicon-16x16.png' },
  ];
  
  console.log('丸いアイコンの作成を開始します...\n');
  
  for (const { size, path: outputPath } of sizes) {
    await createRoundIcon(inputPath, outputPath, size);
  }
  
  console.log('\n完了しました！');
}

main().catch(console.error);
