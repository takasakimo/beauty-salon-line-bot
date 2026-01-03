// 環境変数の検証と設定

export function validateEnv() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local or environment configuration.'
    );
  }
}

// 環境変数の取得（型安全）
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  return value;
}

// 本番環境かどうか
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// 開発環境かどうか
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}



