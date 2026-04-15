/**
 * らくっぽ勤怠 連携API 呼び出し
 */

export interface KintaiShiftItem {
  shiftId: number;
  date: string;
  employeeId: number;
  employeeEmail: string;
  employeeNumber: string;
  employeeName: string;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  isOff: boolean;
  workLocation: string | null;
}

export interface KintaiShiftsResponse {
  companyCode: string;
  companyId: number;
  companyName: string;
  startDate: string;
  endDate: string;
  shifts: KintaiShiftItem[];
}

/**
 * 勤怠APIからシフト一覧を取得
 */
export async function fetchShiftsFromKintai(
  baseUrl: string,
  apiKey: string,
  companyCode: string,
  startDate: string,
  endDate: string
): Promise<KintaiShiftsResponse> {
  const url = new URL('/api/integration/shifts', baseUrl.replace(/\/$/, ''));
  url.searchParams.set('company_code', companyCode);
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kintai API error ${res.status}: ${text || res.statusText}`);
  }

  const data = (await res.json()) as KintaiShiftsResponse;
  if (!data.shifts || !Array.isArray(data.shifts)) {
    throw new Error('Invalid response from Kintai API');
  }
  return data;
}
