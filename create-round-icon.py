#!/usr/bin/env python3
"""
画像を丸くトリミングしてファビコンを作成するスクリプト
"""
from PIL import Image, ImageDraw
import sys
import os

def create_round_icon(input_path, output_path, size=None):
    """画像を丸くトリミングして保存"""
    try:
        # 画像を開く
        img = Image.open(input_path).convert("RGBA")
        
        # 元の画像サイズを取得
        width, height = img.size
        
        # 正方形にクロップ（中央部分を取得）
        if width > height:
            # 横長の場合、中央を正方形に
            left = (width - height) // 2
            top = 0
            right = left + height
            bottom = height
        else:
            # 縦長の場合、中央を正方形に
            left = 0
            top = (height - width) // 2
            right = width
            bottom = top + width
        
        # 正方形にクロップ
        img_cropped = img.crop((left, top, right, bottom))
        
        # サイズ指定がある場合はリサイズ
        if size:
            img_cropped = img_cropped.resize((size, size), Image.Resampling.LANCZOS)
        else:
            size = img_cropped.size[0]
        
        # 丸いマスクを作成
        mask = Image.new('L', (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        
        # 丸いマスクを適用
        output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        output.paste(img_cropped, (0, 0))
        output.putalpha(mask)
        
        # 保存
        output.save(output_path, 'PNG')
        print(f"丸いアイコンを作成しました: {output_path} ({size}x{size})")
        return True
        
    except ImportError:
        print("PIL (Pillow) がインストールされていません。")
        print("インストール方法: pip3 install Pillow")
        return False
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return False

if __name__ == "__main__":
    input_path = "app/icon.png"
    
    # 複数のサイズで作成
    sizes = [
        (512, "app/icon.png"),  # Next.js用
        (512, "public/favicon.png"),  # 公開用
        (180, "public/apple-touch-icon.png"),  # Apple Touch Icon用
        (32, "public/favicon-32x32.png"),  # 標準ファビコン用
        (16, "public/favicon-16x16.png"),  # 小さいファビコン用
    ]
    
    for size, output_path in sizes:
        create_round_icon(input_path, output_path, size)
