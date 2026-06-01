import { Layout } from "./layout";

export function TermsPage(props: { currentUrl: string }) {
  return (
    <Layout title="利用規約" currentUrl={props.currentUrl}>
      <article class="prose prose-slate max-w-none">
        <h1 class="text-2xl font-bold mb-6">利用規約</h1>

        <p class="text-sm text-slate-500 mb-8">最終更新日: 2026年6月1日</p>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第1条（適用）</h2>
          <p>
            本利用規約（以下「本規約」）は、sorou（以下「本サービス」）の利用に関する条件を定めるものです。本サービスを利用することにより、本規約に同意したものとみなされます。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第2条（サービスの内容）</h2>
          <p>
            本サービスは、日程調整のためのイベント作成・共有・出欠集計を行うオンラインツールです。利用者はアカウント登録なしで利用できます。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第3条（禁止事項）</h2>
          <p class="mb-2">
            利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。
          </p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>他人のプライバシーを侵害する行為（個人情報の無断投稿等）</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>
              過度なリクエストを送信するなど、サーバーに過大な負荷をかける行為
            </li>
            <li>不正アクセスまたはその試み</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第4条（免責事項）</h2>
          <ol class="list-decimal list-inside space-y-2 ml-2">
            <li>
              本サービスは「現状有姿（AS-IS）」で提供され、特定の目的への適合性、有用性、正確性、完全性について、明示または黙示を問わず、いかなる保証も行いません。
            </li>
            <li>
              本サービスの利用により生じたいかなる損害（データの消失、機会損失、業務の中断、その他直接的・間接的損害を含むがこれに限られない）について、運営者は一切の責任を負いません。
            </li>
            <li>
              本サービスに保存されたデータは、予告なく削除される可能性があります。重要なデータは利用者自身の責任でバックアップしてください。
            </li>
            <li>
              本サービスは、予告なく一時的な停止または終了を行うことがあります。
            </li>
            <li>
              利用者間または利用者と第三者との間で生じた紛議について、運営者は一切の責任を負いません。
            </li>
          </ol>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第5条（知的財産権）</h2>
          <p>
            本サービスのプログラムコードはオープンソースライセンス（MIT
            License）の下で公開されています。本サービス上で利用者が作成したイベント情報（イベント名、メモ、候補日等）の権利は、作成者に帰属します。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第6条（規約の変更）</h2>
          <p>
            運営者は、必要に応じて本規約を変更することができます。変更後の規約は、本ページ上に掲載された時点で効力を生じるものとします。
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-lg font-bold mb-3">第7条（準拠法・管轄）</h2>
          <p>
            本規約の解釈には日本法が適用され、本サービスに関連して生じる紛議については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </article>
    </Layout>
  );
}
