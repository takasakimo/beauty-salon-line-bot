'use client';

import Link from 'next/link';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  SparklesIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import {
  CalendarDaysIcon as CalendarDaysSolid,
  UserGroupIcon as UserGroupSolid,
  BanknotesIcon as BanknotesSolid,
  ChartBarIcon as ChartBarSolid,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/solid';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-rose-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
          <Link href="/lp" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">
              らくっぽリザーブ
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">主な機能</a>
            <a href="#compare" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">他社比較</a>
            <a href="#cases" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">導入事例</a>
            <a href="#pricing" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">料金</a>
            <a href="#for-you" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">向いている店舗</a>
            <a href="#support" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">導入サポート</a>
            <a href="#contact" className="text-gray-600 hover:text-rose-600 transition-colors text-sm font-medium">お問い合わせ</a>
            <Link href="/login" className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              ログイン
            </Link>
          </nav>
          <div className="md:hidden">
            <Link href="/login" className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium">ログイン</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="inline-block px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-sm font-medium mb-6">
            美容室・サロン向け 会員制Web予約・顧客管理システム
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
            予約手数料<span className="text-rose-600">0円</span>で
            <br className="md:hidden" />
            顧客を自社に囲い込む
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            完全会員制の自社専用予約サイト。リピーターをしっかり囲い込み、
            <br className="hidden md:block" />
            月額固定でコスト削減を実現。ホットペッパーからの乗り換えにも。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="inline-flex items-center justify-center px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-rose-200 hover:shadow-rose-300">
              お問い合わせ・デモ申し込み
            </a>
            <Link href="/login" className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-200 hover:border-rose-300 text-gray-700 hover:text-rose-600 rounded-xl font-semibold text-lg transition-all">
              ログイン
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-rose-500" />初期費用0円</span>
            <span className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-rose-500" />予約件数無制限</span>
            <span className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-rose-500" />顧客データ自社保有</span>
          </div>
        </div>
      </section>

      {/* らくっぽとは */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">らくっぽとは</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            美容室・サロン・中小企業向けのクラウドサービス群です
          </p>
          <div className="overflow-x-auto">
            <table className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <thead>
                <tr className="bg-rose-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">サービス</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">用途</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">主な得意分野</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="px-6 py-4 font-medium text-rose-600">らくっぽリザーブ</td><td className="px-6 py-4 text-gray-600">予約・顧客・売上管理</td><td className="px-6 py-4 text-gray-600">美容室・サロン</td></tr>
                <tr><td className="px-6 py-4 font-medium text-gray-900">らくっぽ勤怠</td><td className="px-6 py-4 text-gray-600">打刻・シフト・有給・申請</td><td className="px-6 py-4 text-gray-600">中小企業全般</td></tr>
                <tr><td className="px-6 py-4 font-medium text-gray-900">連携</td><td className="px-6 py-4 text-gray-600">シフトの一元管理</td><td className="px-6 py-4 text-gray-600">両方を使う店舗</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 課題と解決策 */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">こんな課題、ありませんか？</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">ホットペッパー等の予約媒体には、多くのコストと制約があります</p>
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">×</span>
                既存予約媒体の課題
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li>• 予約1件あたり300〜500円の手数料（月100件で年間数十万円）</li>
                <li>• 顧客データはプラットフォームが管理、自社で活用できない</li>
                <li>• 競合店舗と一緒に表示され、リピーターの囲い込みが困難</li>
                <li>• 勤怠と予約でシフトを二重入力、入力もれのリスク</li>
              </ul>
            </div>
            <div className="bg-rose-50/50 rounded-2xl p-8 border border-rose-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold">✓</span>
                らくっぽリザーブで解決
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li>• <strong className="text-rose-600">予約手数料0円</strong>・月額固定のみ</li>
                <li>• <strong>顧客データは店舗が保有</strong>・分析・マーケティングに自由に活用</li>
                <li>• <strong>完全会員制</strong>・競合比較なし、自社専用</li>
                <li>• <strong>らくっぽ勤怠連携</strong>・シフト1回入力で両方に反映</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ホットペッパー vs らくっぽ 比較 */}
      <section id="compare" className="py-20 bg-gray-50 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">他社システムとの比較</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">ホットペッパービューティーとの主な違い</p>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">項目</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ホットペッパービューティー</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-rose-600">らくっぽリザーブ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                <tr><td className="px-6 py-3 font-medium text-gray-700">サービス性格</td><td className="px-6 py-3 text-gray-600">広告機能付きの予約媒体</td><td className="px-6 py-3 text-gray-900 font-medium">完全会員制の非公開予約サイト</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">主な用途</td><td className="px-6 py-3 text-gray-600">新規顧客獲得</td><td className="px-6 py-3 text-gray-900 font-medium">リピーター予約・顧客囲い込み</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">初期費用</td><td className="px-6 py-3 text-gray-600">約30,000円〜50,000円</td><td className="px-6 py-3 text-rose-600 font-semibold">0円</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">月額料金</td><td className="px-6 py-3 text-gray-600">約10,000円〜30,000円</td><td className="px-6 py-3 text-rose-600 font-semibold">先着10社 3,980円／通常 8,980円(税抜)</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">予約手数料</td><td className="px-6 py-3 text-gray-600">約300円〜500円/件</td><td className="px-6 py-3 text-rose-600 font-semibold">0円</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">顧客データ</td><td className="px-6 py-3 text-gray-600">プラットフォームが管理</td><td className="px-6 py-3 text-gray-900 font-medium">店舗が所有</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">競合比較</td><td className="px-6 py-3 text-gray-600">同一プラットフォームで競合表示</td><td className="px-6 py-3 text-gray-900 font-medium">自社専用で競合表示なし</td></tr>
                <tr><td className="px-6 py-3 font-medium text-gray-700">勤怠連携</td><td className="px-6 py-3 text-gray-600">なし</td><td className="px-6 py-3 text-gray-900 font-medium">らくっぽ勤怠と連携可能</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 主な機能 詳細 */}
      <section id="features" className="py-20 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">主な機能</h2>
          <p className="text-gray-600 text-center mb-16 max-w-2xl mx-auto">予約・顧客・売上を一元管理。シンプルで使いやすい設計</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
                <CalendarDaysSolid className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">予約管理</h3>
              <p className="text-sm text-gray-600 mb-3">カレンダー・タイムライン表示、ステータス管理、電話予約も登録可能</p>
              <p className="text-xs text-gray-500">顧客側：30日間の空き状況、複数メニュー選択、料金自動計算</p>
            </div>
            <div className="group">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
                <UserGroupSolid className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">顧客管理</h3>
              <p className="text-sm text-gray-600 mb-3">名前・メール・電話で検索、予約・購入履歴、QRコード生成</p>
              <p className="text-xs text-gray-500">来店頻度や利用状況の分析が可能</p>
            </div>
            <div className="group">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
                <BanknotesSolid className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">売上管理</h3>
              <p className="text-sm text-gray-600 mb-3">日別・月別の自動集計、商品別売上、売上推移の分析</p>
              <p className="text-xs text-gray-500">ダッシュボードで店舗状況を一目で把握</p>
            </div>
            <div className="group">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
                <ChartBarSolid className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">メニュー・商品</h3>
              <p className="text-sm text-gray-600 mb-3">カテゴリ別メニュー、在庫管理、一括販売登録</p>
              <p className="text-xs text-gray-500">営業時間・定休日・最大同時予約数も設定可能</p>
            </div>
          </div>

          {/* らくっぽ勤怠連携 */}
          <div className="mt-16 p-8 bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl border border-rose-100">
            <div className="flex items-start gap-6">
              <ArrowPathIcon className="w-12 h-12 text-rose-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">らくっぽ勤怠とのシフト連携</h3>
                <p className="text-gray-600 mb-4">勤怠で入力したスタッフのシフトを、ワンクリックで予約側に同期。シフトの二重入力が不要に。今月分・全期間まとめて同期のどちらにも対応。</p>
                <div className="bg-white/80 rounded-xl p-4 text-sm">
                  <p className="font-medium text-gray-900 mb-2">連携の流れ</p>
                  <p className="text-gray-600">らくっぽ勤怠でシフト入力 → リザーブでワンクリック同期 → 予約可能枠に自動反映</p>
                  <p className="text-gray-500 text-xs mt-2">※従業員の名前・メール等は連携されません。リザーブ側で従業員登録が必要です。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 導入事例 */}
      <section id="cases" className="py-20 bg-gray-50 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">導入事例・想定ユースケース</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">コスト削減効果の目安</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <UserGroupIcon className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">個人サロン（月間予約50件）</h3>
              <p className="text-sm text-gray-600 mb-3">ホットペッパーの手数料負担、顧客データの活用不足</p>
              <p className="text-rose-600 font-bold">月額約31,000円削減（年間約37万円削減）</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-rose-100">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <ClipboardDocumentListIcon className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">小規模美容室（月間予約100件）</h3>
              <p className="text-sm text-gray-600 mb-3">予約増加に伴う手数料の増大、競合との比較回避</p>
              <p className="text-rose-600 font-bold">月額約56,000円削減（年間約67万円削減）</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <CpuChipIcon className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">らくっぽ勤怠利用店舗</h3>
              <p className="text-sm text-gray-600 mb-3">勤怠と予約でシフトを二重入力、入力もれやミスの懸念</p>
              <p className="text-rose-600 font-bold">入力の手間削減、予約可能枠と実シフトのずれ防止</p>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">月間100件で年間50万円〜100万円規模の削減が可能</p>
        </div>
      </section>

      {/* 料金 */}
      <section id="pricing" className="py-20 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">料金プラン</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">シンプルな月額制。予約件数に制限なし</p>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-8 py-6 text-white text-center">
                <p className="text-rose-100 text-sm font-medium mb-1">月額料金</p>
                <p className="text-4xl font-bold">3,980<span className="text-xl font-normal">円</span><span className="text-lg font-normal">(税抜)</span></p>
                <p className="text-rose-100 text-sm mt-2">※先着10社限定</p>
              </div>
              <div className="p-8">
                <p className="text-gray-600 text-center mb-6">11社目以降の通常価格</p>
                <p className="text-2xl font-bold text-gray-900 text-center mb-8">8,980円(税抜)／月</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-700"><CheckCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />初期費用0円</li>
                  <li className="flex items-center gap-3 text-gray-700"><CheckCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />予約手数料0円</li>
                  <li className="flex items-center gap-3 text-gray-700"><CheckCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />予約件数無制限</li>
                  <li className="flex items-center gap-3 text-gray-700"><CheckCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />らくっぽ勤怠と連携可能</li>
                </ul>
                <a href="#contact" className="block w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-center font-semibold rounded-xl transition-colors">
                  お問い合わせ・デモ申し込み
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 向いている店舗 */}
      <section id="for-you" className="py-20 bg-gray-50 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">こんな店舗におすすめ</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">らくっぽリザーブが向いているのは…</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              'リピーターの予約管理を効率化したい',
              '予約手数料を減らしたい（ホットペッパーからの乗り換え）',
              '顧客データを自社で蓄積・活用したい',
              '顧客を囲い込む専用の予約サイトが欲しい',
              'らくっぽ勤怠を利用中で、シフトを予約と連携したい',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-rose-50/50 transition-colors border border-gray-100 hover:border-rose-100 shadow-sm">
                <CheckCircleIcon className="w-6 h-6 text-rose-500 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 導入サポート */}
      <section id="support" className="py-20 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">導入サポート</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">初期セットアップ</h3>
              <p className="text-sm text-gray-600">店舗登録支援、メニュー・スタッフ登録、営業時間・休業日設定のサポート</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">トレーニング</h3>
              <p className="text-sm text-gray-600">管理者向けトレーニング、デモ体験、オンラインサポート</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">継続サポート</h3>
              <p className="text-sm text-gray-600">運用サポート、操作方法の質問対応、機能追加・改善（要相談）</p>
            </div>
          </div>
          <div className="mt-12 p-6 bg-rose-50 rounded-2xl border border-rose-100 max-w-2xl mx-auto">
            <h4 className="font-semibold text-gray-900 mb-4 text-center">次のステップ</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>お問い合わせ：現在の予約状況のヒアリング、最適プランの提案</li>
              <li>デモ体験：実際のシステムを体験</li>
              <li>導入準備：店舗設定、メニュー・スタッフ登録</li>
              <li>運用開始：スタッフへの説明、顧客への案内</li>
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-20 bg-gradient-to-br from-rose-500 to-rose-600 scroll-mt-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">まずはお気軽にご相談ください</h2>
          <p className="text-rose-100 mb-10 max-w-2xl mx-auto">デモ体験・導入のご相談・料金のご案内など、お気軽にお問い合わせください</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="mailto:info@aims-ngy.com" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors">
              <EnvelopeIcon className="w-5 h-5" /> メールで問い合わせ
            </a>
            <a href="tel:052-990-3127" className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white hover:bg-white/10 rounded-xl font-semibold transition-colors">
              <PhoneIcon className="w-5 h-5" /> 052-990-3127
            </a>
          </div>
          <p className="text-rose-100 text-sm">受付：平日 10:00〜18:00</p>
          <div className="mt-8 pt-8 border-t border-rose-400/50">
            <p className="text-white font-medium">株式会社aims</p>
            <p className="text-rose-100 text-sm mt-1">愛知県名古屋市名東区社が丘3-1722 乃木坂2F</p>
            <a href="https://aims-ngy-2023.com/" target="_blank" rel="noopener noreferrer" className="text-rose-100 hover:text-white text-sm underline mt-2 inline-block">https://aims-ngy-2023.com/</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/lp" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">らくっぽリザーブ</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/login" className="hover:text-rose-600 transition-colors">ログイン</Link>
            <a href="#contact" className="hover:text-rose-600 transition-colors">お問い合わせ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
