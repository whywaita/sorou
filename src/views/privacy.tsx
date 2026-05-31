import { Layout } from "./layout";

export function PrivacyPage(props: { currentUrl: string }) {
  return (
    <Layout title="プライバシーポリシー" currentUrl={props.currentUrl}>
      <article class="prose prose-slate max-w-none">
        <h1 class="text-2xl font-bold mb-6">プライバシーポリシー</h1>

        <p class="text-sm text-slate-500 mb-8">最終更新日: 2026年6月1日</p>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">1. 収集する情報</h2>
          <p class="mb-2">
            sorou（以下「本サービス」）は、日程調整のために以下の情報を収集・保存します。
          </p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>イベント作成時に提供される情報:</strong>{" "}
              イベント名、メモ、候補日時
            </li>
            <li>
              <strong>参加者により提供される情報:</strong>{" "}
              参加者名（任意の表示名）、コメント、各候補日に対する出欠回答（〇/△/×）
            </li>
          </ul>
          <p class="mt-2">
            本サービスは利用者アカウントを作成せず、メールアドレス、パスワード、その他の個人識別情報を収集しません。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">2. 情報の利用目的</h2>
          <p class="mb-2">
            収集した情報は、以下の目的にのみ利用されます。
          </p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>日程調整イベントの作成・共有</li>
            <li>参加者の出欠状況の集計・表示</li>
            <li>イベント作成者による管理画面上での確認</li>
          </ul>
          <p class="mt-2">
            収集した情報を、上記目的以外のマーケティング、広告配信、プロファイリング等に利用することはありません。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">3. 情報の保存</h2>
          <p class="mb-2">
            収集した情報は、Cloudflare D1（SQLite互換のエッジデータベース）に保存されます。データはCloudflareのインフラストラクチャ上で保管され、Cloudflareのセキュリティ対策の下で保護されます。
          </p>
          <p class="mt-2">
            イベント作成者は、管理画面から任意のタイミングでイベントおよび関連するすべての回答データを削除できます。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">4. 情報の共有</h2>
          <p>
            本サービスは、収集した情報を第三者に販売、共有、または開示することはありません。ただし、法令に基づく開示請求があった場合を除きます。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">
            5. アクセス解析・トラッキング
          </h2>
          <p>
            本サービスは、Google
            Analytics等のアクセス解析ツールや、トラッキングCookieを使用していません。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">6. 外部リンク</h2>
          <p>
            本サービスには外部サイトへのリンクは含まれません。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">7. プライバシーポリシーの変更</h2>
          <p>
            本プライバシーポリシーは、必要に応じて変更されることがあります。変更があった場合は、本ページ上で告知します。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">8. お問い合わせ</h2>
          <p>
            本プライバシーポリシーに関するお問い合わせは、本サービスのGitHubリポジトリのIssueを通じてご連絡ください。
          </p>
        </section>
      </article>
    </Layout>
  );
}
