export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // セッションをlocalStorageに保持
    autoRefreshToken: true,    // トークン自動更新
    detectSessionInUrl: true,  // 招待URLのトークン自動検出
    // ブラウザの「鍵（Web Locks API）」の仕組みを使わないようにする設定。
    // タブが裏に回って一時停止した際に、鍵の奪い合いが起きて画面が固まる
    // 既知の不具合（Supabase側のライブラリの問題）への回避策。
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn();
    },
  },
})