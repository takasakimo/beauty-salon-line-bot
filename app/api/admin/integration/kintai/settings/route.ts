import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getTenantIdFromRequestValidated } from '@/lib/auth';
import { query, getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 勤怠連携設定取得（APIキーはマスクして返す） */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const tenantId = await getTenantIdFromRequestValidated(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: session ? 'この店舗にアクセスする権限がありません' : '店舗が特定できません' },
        { status: session ? 403 : 400 }
      );
    }

    const result = await query(
      `SELECT tenant_id, kintai_base_url, kintai_company_code,
              CASE WHEN kintai_api_key IS NOT NULL AND length(kintai_api_key) > 4
                   THEN '****' || right(kintai_api_key, 4) ELSE NULL END as kintai_api_key_masked,
              created_at, updated_at
       FROM tenant_kintai_integration WHERE tenant_id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ settings: null });
    }
    const row = result.rows[0];
    return NextResponse.json({
      settings: {
        tenantId: row.tenant_id,
        kintaiBaseUrl: row.kintai_base_url,
        kintaiCompanyCode: row.kintai_company_code,
        kintaiApiKeyMasked: row.kintai_api_key_masked,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Kintai settings GET error:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** 勤怠連携設定保存 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const tenantId = await getTenantIdFromRequestValidated(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: session ? 'この店舗にアクセスする権限がありません' : '店舗が特定できません' },
        { status: session ? 403 : 400 }
      );
    }

    const body = await request.json();
    const baseUrl = (body.kintaiBaseUrl || '').trim().replace(/\/$/, '');
    const apiKey = typeof body.kintaiApiKey === 'string' ? body.kintaiApiKey.trim() : '';
    const companyCode = (body.kintaiCompanyCode || '').trim();

    if (!baseUrl || !companyCode) {
      return NextResponse.json(
        { error: '勤怠のベースURLと企業コードは必須です' },
        { status: 400 }
      );
    }

    if (apiKey) {
      await query(
        `INSERT INTO tenant_kintai_integration (tenant_id, kintai_base_url, kintai_api_key, kintai_company_code, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (tenant_id) DO UPDATE SET
           kintai_base_url = EXCLUDED.kintai_base_url,
           kintai_api_key = EXCLUDED.kintai_api_key,
           kintai_company_code = EXCLUDED.kintai_company_code,
           updated_at = CURRENT_TIMESTAMP`,
        [tenantId, baseUrl, apiKey, companyCode]
      );
    } else {
      const existing = await query(
        'SELECT tenant_id FROM tenant_kintai_integration WHERE tenant_id = $1',
        [tenantId]
      );
      if (existing.rows.length > 0) {
        await query(
          `UPDATE tenant_kintai_integration SET kintai_base_url = $1, kintai_company_code = $2, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $3`,
          [baseUrl, companyCode, tenantId]
        );
      } else {
        return NextResponse.json(
          { error: '初回はAPIキーを入力してください' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Kintai settings PATCH error:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
