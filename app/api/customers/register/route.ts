import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, real_name, phone_number, password, tenantCode } = body;

    // 店舗コードが指定されている場合はそれを使用、なければリクエストから取得
    const tenantId = await getTenantIdFromRequest(request, tenantCode);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: '店舗コードが見つかりません。正しい店舗コードを入力してください。' },
        { status: 400 }
      );
    }

    // 既存チェック（テナント別、emailまたはphone_numberで）
    const checkQuery = email
      ? 'SELECT * FROM customers WHERE email = $1 AND tenant_id = $2'
      : 'SELECT * FROM customers WHERE phone_number = $1 AND tenant_id = $2';
    const checkParams = email ? [email, tenantId] : [phone_number, tenantId];
    
    const checkResult = await query(checkQuery, checkParams);

    if (checkResult.rows.length > 0) {
      // すでに登録済み - 情報を更新（パスワードも更新する場合）
      const passwordHash = password ? hashPassword(password) : null;
      const updateQuery = passwordHash
        ? `
          UPDATE customers 
          SET real_name = $1, phone_number = $2, email = $3, password_hash = $4
          WHERE ${email ? 'email' : 'phone_number'} = $5 AND tenant_id = $6
          RETURNING *
        `
        : `
          UPDATE customers 
          SET real_name = $1, phone_number = $2, email = $3
          WHERE ${email ? 'email' : 'phone_number'} = $4 AND tenant_id = $5
          RETURNING *
        `;
      const updateParams = passwordHash
        ? email
          ? [real_name, phone_number, email, passwordHash, email, tenantId]
          : [real_name, phone_number, email, passwordHash, phone_number, tenantId]
        : email
          ? [real_name, phone_number, email, email, tenantId]
          : [real_name, phone_number, email, phone_number, tenantId];
      
      const updateResult = await query(updateQuery, updateParams);
      
      return NextResponse.json({
        success: true,
        message: 'Customer information updated',
        data: updateResult.rows[0]
      });
    }

    // パスワードハッシュの生成（パスワードが提供されている場合）
    const passwordHash = password ? hashPassword(password) : null;

    // 新規登録
    const insertQuery = `
      INSERT INTO customers (tenant_id, email, real_name, phone_number, password_hash, registered_date)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await query(insertQuery, [
      tenantId, email || null, real_name, phone_number, passwordHash
    ]);

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error registering customer:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed', details: error.message },
      { status: 500 }
    );
  }
}

