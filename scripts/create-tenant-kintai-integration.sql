-- らくポチ勤怠連携設定用テーブル（SQLEditor 等で実行）
-- シフト連携_リザーブ側作業手順.md の「3.4 勤怠連携用テーブルの作成」用

CREATE TABLE IF NOT EXISTS tenant_kintai_integration (
  tenant_id INTEGER NOT NULL PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  kintai_base_url TEXT NOT NULL,
  kintai_api_key TEXT NOT NULL,
  kintai_company_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
