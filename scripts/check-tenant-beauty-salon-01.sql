-- beauty-salon-01のテナントが存在するか確認
SELECT tenant_id, tenant_code, salon_name, is_active
FROM tenants
WHERE tenant_code = 'beauty-salon-01';

-- もしテナントが存在しない場合は作成
INSERT INTO tenants (tenant_code, salon_name, is_active)
SELECT 'beauty-salon-01', 'ビューティーサロン名古屋', true
WHERE NOT EXISTS (
    SELECT 1 FROM tenants WHERE tenant_code = 'beauty-salon-01'
)
RETURNING tenant_id, tenant_code, salon_name;

-- 管理者が存在するか確認
SELECT admin_id, username, email, is_active
FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
);
