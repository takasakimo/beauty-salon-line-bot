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
  
  // 既にtenantIdがURLに含まれている場合は追加しない
  if (baseUrl.includes('tenantId=')) {
    return baseUrl;
  }
  
  if (tenantId) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}tenantId=${tenantId}`;
    return url;
  }
  
  return baseUrl;
}

/**
 * 管理画面ページのリンクURLにtenantIdクエリパラメータを追加
 * スーパー管理者がページ間を移動する際にクエリパラメータを保持するため
 */
export function getAdminLinkUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('tenantId');
  
  if (tenantId) {
    return `${path}?tenantId=${tenantId}`;
  }
  
  return path;
}
