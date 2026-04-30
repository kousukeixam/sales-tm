import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // 呼び出し元の認証確認
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // superadminのみ実行可能
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin") {
      throw new Error("権限がありません");
    }

    const { email, password, name, role, group_id } = await req.json();
    if (!email || !password) throw new Error("メールアドレスとパスワードは必須です");

    // Service Role Keyでユーザー作成
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // メール確認不要で即時有効化
      user_metadata: {
        name: name ?? "",
        role: role ?? "member",
      },
    });

    if (error) throw error;

    // profilesテーブルに直接挿入
    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      name: name ?? email,
      role: role ?? "member",
      group_id: group_id ? parseInt(group_id) : null,
    });

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});