// 管理画面用のユーティリティ関数

/**
 * クエリパラメータからtenantIdを取得し、API URLに追加
 * スーパー管理者が店舗管理画面にアクセスする際に使用
 */
export function getApiUrlWithTenantId(baseUrl: string): string {
  if (typeof window === 'undefined') {
    return baseUrl;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('tenantId');
  
  if (tenantId) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}tenantId=${tenantId}`;
  }
  
  return baseUrl;
}

