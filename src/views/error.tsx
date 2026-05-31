import { Layout } from "./layout";

export function NotFoundPage() {
  return (
    <Layout title="404">
      <div class="text-center py-16">
        <h1 class="text-6xl font-bold text-slate-300 mb-4">404</h1>
        <p class="text-slate-500 mb-6">ページが見つかりません</p>
        <a href="/" class="text-brand hover:underline">
          ← トップページに戻る
        </a>
      </div>
    </Layout>
  );
}
