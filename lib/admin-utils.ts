// 管理画面用のユーティリティ関数

/**
 * クエリパラメータからtenantIdを取得し、API URLに追加
 * スーパー管理者が店舗管理画面にアクセスする際に使用
 * @param baseUrl - APIのベースURL
 * @param sessionTenantId - セッションから取得したtenantId（指定時はURLパラメータより優先）
 */
export function getApiUrlWithTenantId(baseUrl: string, sessionTenantId?: number | null): string {
  if (typeof window === 'undefined') {
    return baseUrl;
  }

  // 既にtenantIdがURLに含まれている場合は追加しない
  if (baseUrl.includes('tenantId=')) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  // セッションのtenantIdを優先（店舗管理者がURLパラメータなしでアクセスする場合に必須）
  if (sessionTenantId) {
    params.set('tenantId', String(sessionTenantId));
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantId = urlParams.get('tenantId');
    const tenantCode = urlParams.get('tenant');
    if (tenantId) {
      params.set('tenantId', tenantId);
    } else if (tenantCode) {
      params.set('tenant', tenantCode);
    }
  }

  if (params.toString()) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  }

  return baseUrl;
}

/**
 * 管理画面ページのリンクURLにtenantIdクエリパラメータを追加
 * スーパー管理者がページ間を移動する際にクエリパラメータを保持するため
 * デモモードの場合はそのまま返す（デモ画面ではtenantIdは不要）
 */
export function getAdminLinkUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }
  
  // デモモードの場合はそのまま返す
  if (path.startsWith('/demo/')) {
    return path;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('tenantId');
  
  if (tenantId) {
    return `${path}?tenantId=${tenantId}`;
  }
  
  return path;
}
