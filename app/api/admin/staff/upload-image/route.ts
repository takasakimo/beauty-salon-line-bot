import { NextRequest, NextResponse } from 'next/server';
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

    // 画像をBase64エンコードしてデータURIとして保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // データベースに画像URL（Base64データURI）を保存
    try {
      await query(
        `UPDATE staff SET image_url = $1 WHERE staff_id = $2 AND tenant_id = $3`,
        [dataUri, parseInt(staffId), tenantId]
      );
    } catch (updateError: any) {
      // カラムが存在しない場合は自動的に作成
      if (updateError.message && updateError.message.includes('does not exist')) {
        console.log('image_urlカラムが存在しないため、自動的に作成します');
        try {
          // カラムを追加
          await query(`
            ALTER TABLE staff 
            ADD COLUMN IF NOT EXISTS image_url TEXT;
          `);
          console.log('✅ image_urlカラムを追加しました');
          
          // 再度更新を試行
          await query(
            `UPDATE staff SET image_url = $1 WHERE staff_id = $2 AND tenant_id = $3`,
            [dataUri, parseInt(staffId), tenantId]
          );
        } catch (migrationError: any) {
          console.error('マイグレーションエラー:', migrationError);
          return NextResponse.json(
            { error: 'データベースの設定に失敗しました', details: migrationError.message },
            { status: 500 }
          );
        }
      } else {
        // その他のエラーは再スロー
        throw updateError;
      }
    }

    return NextResponse.json({ 
      success: true,
      image_url: dataUri 
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

