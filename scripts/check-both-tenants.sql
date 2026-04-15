-- beauty-salon-01とbeauty-salon-001の両方を確認
SELECT tenant_id, tenant_code, salon_name, is_active
FROM tenants
WHERE tenant_code IN ('beauty-salon-01', 'beauty-salon-001')
ORDER BY tenant_code;

-- それぞれの管理者を確認
SELECT 
    ta.admin_id,
    ta.username,
    ta.email,
    ta.is_active,
    t.tenant_code,
    t.salon_name
FROM tenant_admins ta
INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
WHERE t.tenant_code IN ('beauty-salon-01', 'beauty-salon-001')
ORDER BY t.tenant_code, ta.admin_id;
