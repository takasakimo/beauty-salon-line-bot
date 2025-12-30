import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const staffId = formData.get('staff_id') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    if (!staffId) {
      return NextResponse.json(
        { error: 'スタッフIDが指定されていません' },
        { status: 400 }
      );
    }

    // 画像ファイルのみ許可
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '画像ファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズ制限（5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      );
    }

    // ファイル名を生成（staff_{staffId}_{timestamp}.{ext}）
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `staff_${staffId}_${timestamp}.${fileExtension}`;

    // public/staff-imagesディレクトリを作成（存在しない場合）
    const uploadDir = join(process.cwd(), 'public', 'staff-images');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }

    // ファイルを保存
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 画像URLを生成
    const imageUrl = `/staff-images/${fileName}`;

    // データベースに画像URLを保存
    await query(
      `UPDATE staff SET image_url = $1 WHERE staff_id = $2 AND tenant_id = $3`,
      [imageUrl, parseInt(staffId), tenantId]
    );

    return NextResponse.json({ 
      success: true,
      image_url: imageUrl 
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

