import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "./supabase";

const CATEGORIES = {
  A: {
    label: "収益関連",
    desc: "契約・集金・更新 等",
    color: "#3B82F6",
    bg: "#EFF6FF",
  },
  B: {
    label: "可能性大",
    desc: "提案・相談・PJ活動 等",
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
  C: {
    label: "可能性業務",
    desc: "声掛け・ヒアリング 等",
    color: "#06B6D4",
    bg: "#ECFEFF",
  },
  D: {
    label: "作業的業務",
    desc: "配送・社内作業 等",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  E: {
    label: "突発依頼",
    desc: "クレーム・緊急対応 等",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
};
const INIT_USERS = [
  {
    id: 1,
    name: "テスト部下1",
    email: "member1@company.com",
    password: "Test1234!",
    role: "member",
    groupId: 1,
  },
  {
    id: 2,
    name: "テスト部下2",
    email: "member2@company.com",
    password: "Test1234!",
    role: "member",
    groupId: 1,
  },
  {
    id: 3,
    name: "テスト上司",
    email: "manager@company.com",
    password: "Test1234!",
    role: "admin",
    groupId: 1,
  },
  {
    id: 4,
    name: "システム管理者",
    email: "sysadmin@company.com",
    password: "sysadmin123",
    role: "superadmin",
    groupId: null,
  },
];
const INIT_GROUPS = [
  { id: 1, name: "営業第1グループ", color: "#3B82F6" },
  { id: 2, name: "営業第2グループ", color: "#8B5CF6" },
];
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};
const newRow = () => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  task: "",
  detail: "",
  start: "",
  end: "",
  cat: "",
  managerComment: "",
});

const extractTags = (text) => {
  if (!text) return [];
  // 全角スペース・半角スペース・改行を区切り文字として認識
  const normalized = (text || "").replace(/[\u3000\u00A0]/g, " ");
  const matches = normalized.match(/#([^\s#]+)/g) || [];
  return matches.map((t) => t.slice(1));
};

// 通信が応答しないまま固まることを防ぐための共通タイムアウトヘルパー
const withTimeout = (promise, ms = 10000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("通信がタイムアウトしました")), ms)),
  ]);

// 一時的な通信の乱れであれば自動で再試行するための共通ヘルパー
const withRetry = async (fn, retries = 2, delayMs = 800) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
};

function generateLogs() {
  const taskDetails = {
    A: [
      {
        task: "A社年次契約更新",
        detail: "A社担当:鈴木様。昨年比+5%で合意。来月中に書類送付予定。",
      },
      { task: "B社集金訪問", detail: "集金額:¥150,000。領収書発行済み。" },
      {
        task: "C社契約締結",
        detail: "新規3年契約。月額¥80,000。オプションA・B込み。",
      },
      {
        task: "D社更新手続き",
        detail: "担当変更あり。新担当:田村様に引き継ぎ完了。",
      },
    ],
    B: [
      {
        task: "新規提案プレゼン",
        detail: "参加者:部長・課長2名。次回ヒアリング設定済み。",
      },
      {
        task: "J社相談対応",
        detail: "コスト削減の相談。現状分析レポートを来週提出予定。",
      },
      {
        task: "PJキックオフ",
        detail: "6名参加。スケジュール・役割分担を確定。",
      },
      { task: "K社見積提出", detail: "3パターンで提出。回答期限:来週金曜。" },
    ],
    C: [
      {
        task: "N社声掛け訪問",
        detail: "担当不在。名刺・資料を置いてきた。後日フォロー予定。",
      },
      {
        task: "O社ヒアリング",
        detail: "来期予算が確保できれば検討したいとのこと。",
      },
      {
        task: "P社紹介訪問",
        detail: "Q社から紹介。担当:高橋様。ニーズは在庫管理システム。",
      },
    ],
    D: [
      {
        task: "サンプル配送",
        detail: "Q社向け。3種類×2セット。送り状番号:1234567890。",
      },
      {
        task: "社内資料整理",
        detail: "顧客台帳の更新。担当変更を反映。30件更新完了。",
      },
      {
        task: "報告書作成",
        detail: "Q3実績レポート。グラフ・前年比分析含む。",
      },
    ],
    E: [
      {
        task: "緊急クレーム対応",
        detail: "R社:納品物に不備。即日対応。再発防止策を作成予定。",
      },
      {
        task: "突発呼び出し",
        detail: "S社向け資料の差し替え対応。1時間で完了。",
      },
      {
        task: "システム障害対応",
        detail: "社内CRMがダウン。IT部門と連携。2時間で復旧。",
      },
    ],
  };
  const mgComments = [
    "よく対応できています。次回は事前準備を意識してみましょう。",
    "この件は今後の重点顧客として引き続きフォローをお願いします。",
    "対応が迅速で良かったです。",
    "",
    "",
    "",
  ];
  const cats = ["A", "B", "C", "D", "E"],
    weights = [35, 25, 20, 12, 8];
  const allDates = [];
  for (let m = 1; m <= 12; m++)
    for (let d = 1; d <= 28; d++) {
      const dt = new Date(2025, m - 1, d);
      if (dt.getDay() !== 0 && dt.getDay() !== 6)
        allDates.push(
          `2025-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        );
    }
  const members = ["山田 太郎", "鈴木 花子", "佐藤 次郎"];
  const logs = [];
  members.forEach((member) => {
    const chosen = [...allDates]
      .sort(() => Math.random() - 0.5)
      .slice(0, 50)
      .sort();
    chosen.forEach((date) => {
      const nT = Math.floor(Math.random() * 3) + 1;
      let sh = 9,
        sm = [0, 15, 30][Math.floor(Math.random() * 3)];
      for (let t = 0; t < nT; t++) {
        const rnd = Math.random() * 100;
        let acc = 0,
          cat = "A";
        for (let i = 0; i < cats.length; i++) {
          acc += weights[i];
          if (rnd < acc) {
            cat = cats[i];
            break;
          }
        }
        const td =
          taskDetails[cat][Math.floor(Math.random() * taskDetails[cat].length)];
        const dur = [30, 45, 60, 90, 120][Math.floor(Math.random() * 5)];
        let eh = sh + Math.floor((sm + dur) / 60),
          em = (sm + dur) % 60;
        if (eh >= 18) break;
        logs.push({
          id: logs.length + 1,
          date,
          task: td.task,
          detail: td.detail,
          start: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
          end: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
          minutes: dur,
          cat,
          user: member,
          managerComment:
            Math.random() < 0.25
              ? mgComments[Math.floor(Math.random() * mgComments.length)]
              : "",
          managerDayComment: "",
          dayComment: "",
        });
        sm = em + [30, 45, 60][Math.floor(Math.random() * 3)];
        sh = eh + Math.floor(sm / 60);
        sm = sm % 60;
        if (sh >= 17) break;
      }
    });
  });
  return logs;
}
const INITIAL_LOGS = generateLogs();

function initBoards() {
  const b = {};
  const dc = [
    { id: "todo", name: "未着手" },
    { id: "prog", name: "進行中" },
    { id: "done", name: "完了" },
  ];
  const sc = {
    1: [
      {
        id: 101,
        col: "todo",
        title: "Q3提案資料の作成",
        desc: "A社・B社向け提案スライドを準備",
        prio: "high",
        due: addDays(5),
        comments: [],
      },
      {
        id: 102,
        col: "todo",
        title: "新規リスト整理",
        desc: "今月の新規候補先をリスト化",
        prio: "mid",
        due: addDays(10),
        comments: [],
      },
      {
        id: 103,
        col: "prog",
        title: "C社フォローアップ",
        desc: "先月ヒアリング後のネクストアクション",
        prio: "high",
        due: addDays(2),
        comments: [],
      },
      {
        id: 104,
        col: "prog",
        title: "D社見積書作成",
        desc: "価格表をベースに作成",
        prio: "high",
        due: addDays(-1),
        comments: [
          {
            id: 1,
            author: "田中 上司",
            text: "期日が過ぎています！今日中に完成させてください。",
            at: "2025-04-22",
          },
        ],
      },
      {
        id: 105,
        col: "done",
        title: "E社年次更新",
        desc: "完了済み",
        prio: "low",
        due: addDays(-5),
        comments: [],
      },
    ],
    2: [
      {
        id: 201,
        col: "todo",
        title: "F社ヒアリング準備",
        desc: "課題ヒアリングのアジェンダ作成",
        prio: "mid",
        due: addDays(7),
        comments: [],
      },
      {
        id: 202,
        col: "prog",
        title: "月次報告書作成",
        desc: "4月分の数字まとめ",
        prio: "mid",
        due: addDays(3),
        comments: [],
      },
      {
        id: 203,
        col: "done",
        title: "G社紹介訪問",
        desc: "挨拶訪問完了",
        prio: "low",
        due: addDays(-3),
        comments: [],
      },
    ],
    3: [
      {
        id: 301,
        col: "todo",
        title: "H社提案書作成",
        desc: "新規サービスの提案内容を整理",
        prio: "high",
        due: addDays(4),
        comments: [],
      },
      {
        id: 302,
        col: "prog",
        title: "I社集金訪問",
        desc: "今月末の集金対応",
        prio: "mid",
        due: addDays(8),
        comments: [],
      },
    ],
    4: [
      {
        id: 401,
        col: "todo",
        title: "チームMTG準備",
        desc: "月次MTGのアジェンダ作成",
        prio: "mid",
        due: addDays(3),
        comments: [],
      },
      {
        id: 402,
        col: "prog",
        title: "新人育成計画策定",
        desc: "来月入社の新人向けOJT計画",
        prio: "high",
        due: addDays(14),
        comments: [],
      },
      {
        id: 403,
        col: "done",
        title: "Q2目標設定完了",
        desc: "",
        prio: "low",
        due: addDays(-7),
        comments: [],
      },
    ],
    5: [
      {
        id: 501,
        col: "todo",
        title: "第2G月次目標確認",
        desc: "各メンバーの進捗確認",
        prio: "mid",
        due: addDays(6),
        comments: [],
      },
      {
        id: 502,
        col: "prog",
        title: "新規開拓エリア選定",
        desc: "来月のルート案を作成",
        prio: "high",
        due: addDays(2),
        comments: [],
      },
    ],
  };
  INIT_USERS.filter((u) => u.role !== "superadmin").forEach((u) => {
    b[u.id] = {
      cols: [...dc.map((c) => ({ ...c }))],
      cards: [...(sc[u.id] || [])],
    };
  });
  return b;
}

const PATHS = {
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  chart: "M18 20V10 M12 20V4 M6 20v-6",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  person:
    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  board: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M10 6V4h4v2",
  check: "M20 6L9 17l-5-5",
  back: "M15 18l-6-6 6-6",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
  msg: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  x: "M18 6L6 18 M6 6l12 12",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
};
const Icon = ({ name, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {(PATHS[name] || "")
      // 連続するパス（"M..." の前にスペースなしで続く場合も含む）を正しく分割
      .split(/(?=M)/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, i) => (
        <path
          key={i}
          d={s}
        />
      ))}
  </svg>
);

const C = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  padding: "16px 20px",
};
const I = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 13,
  color: "#1e293b",
  outline: "none",
  background: "#fafafa",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};
const BB = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#1e293b",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
  fontFamily: "inherit",
};
const BP = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 20px",
  background: "linear-gradient(135deg,#3B82F6,#6366F1)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSeconds, setLoginSeconds] = useState(0);
  const go = async () => {
    setLoading(true);
    setErr("");
    setLoginSeconds(0);
    const timer = setInterval(() => setLoginSeconds((s) => s + 1), 1000);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: pass }),
        15000,
      );
      if (error) {
        setErr("メールアドレスまたはパスワードが正しくありません");
        return;
      }

      // ログイン直後はセッション同期にタイムラグが生じることがあるため、
      // 失敗時は少し待って最大3回までリトライする
      let profile = null;
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: p, error: profileError } = await withTimeout(
          supabase.from("profiles").select("*").eq("id", data.user.id).single(),
          10000,
        );
        if (p && !profileError) {
          profile = p;
          break;
        }
        lastError = profileError;
        console.error(`プロフィール取得失敗(${attempt}回目):`, profileError);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
      }

      if (!profile) {
        console.error("プロフィール取得に最終的に失敗しました:", lastError);
        setErr("ログインに成功しましたが、プロフィール情報の取得に失敗しました。ページを再読み込みしてください。");
        return;
      }
      onLogin({ ...profile, email: data.user.email });
    } catch (e) {
      console.error("ログイン処理で例外発生:", e);
      setErr("ログインに時間がかかっているか、失敗しました。通信状況をご確認の上、もう一度お試しください。");
    } finally {
      clearInterval(timer);
      setLoading(false);
      setLoginSeconds(0);
    }
  };
  const si = {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)",
        fontFamily: "'Noto Sans JP','Helvetica Neue',sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            borderRadius: "50%",
            width: [300, 200, 400, 150, 250][i],
            height: [300, 200, 400, 150, 250][i],
            background: `radial-gradient(circle,rgba(59,130,246,${[0.06, 0.04, 0.03, 0.07, 0.05][i]}) 0%,transparent 70%)`,
            left: `${[10, 70, 30, 80, 20][i]}%`,
            top: `${[20, 10, 60, 40, 80][i]}%`,
            transform: "translate(-50%,-50%)",
            pointerEvents: "none",
          }}
        />
      ))}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "48px 44px",
          width: 400,
          position: "relative",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}
          >
            📊
          </div>
          <h1
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Sales TM
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 13,
              margin: "6px 0 0",
            }}
          >
            営業生産性向上システム
          </p>
        </div>
        {err && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: "#fca5a5",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              display: "block",
              marginBottom: 6,
            }}
          >
            メールアドレス
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@company.com"
            style={si}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              display: "block",
              marginBottom: 6,
            }}
          >
            パスワード
          </label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            style={si}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </div>
        <button
          onClick={go}
          disabled={loading}
          style={{
            width: "100%",
            padding: 13,
            borderRadius: 10,
            border: "none",
            background: loading
              ? "rgba(59,130,246,0.4)"
              : "linear-gradient(135deg,#3B82F6,#6366F1)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {loading ? `ログイン中...（${loginSeconds}秒経過）` : "ログイン"}
        </button>
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
              margin: "0 0 8px",
              textAlign: "center",
            }}
          >
            デモ用アカウント
          </p>
          {INIT_USERS.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setEmail(u.email);
                setPass(u.password);
              }}
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span>{u.name}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 7px",
                    borderRadius: 10,
                    background:
                      u.role === "superadmin"
                        ? "rgba(239,68,68,0.2)"
                        : u.role === "admin"
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(59,130,246,0.2)",
                    color:
                      u.role === "superadmin"
                        ? "#FCA5A5"
                        : u.role === "admin"
                          ? "#FCD34D"
                          : "#93C5FD",
                  }}
                >
                  {u.role === "superadmin"
                    ? "管理者"
                    : u.role === "admin"
                      ? "上司"
                      : "部下"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>
                  {u.password}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total)
    return (
      <div
        style={{
          textAlign: "center",
          color: "#94a3b8",
          padding: "40px 0",
          fontSize: 13,
        }}
      >
        データなし
      </div>
    );
  let cum = 0;
  const r = 70,
    cx = 90,
    cy = 90;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      <svg viewBox="0 0 180 180" width={150} height={150}>
        {data.map((d, i) => {
          const s = cum,
            p = d.value / total;
          cum += p;
          const a1 = s * 2 * Math.PI - Math.PI / 2,
            a2 = (s + p) * 2 * Math.PI - Math.PI / 2;
          return (
            <path
              key={i}
              d={`M${cx},${cy} L${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} A${r},${r} 0 ${p > 0.5 ? 1 : 0},1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)} Z`}
              fill={d.color}
              opacity="0.85"
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#64748b" }}>{d.label}</span>
            <span
              style={{
                fontWeight: 700,
                color: "#1e293b",
                marginLeft: "auto",
                paddingLeft: 8,
              }}
            >
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
          }}
        >
          <div
            style={{
              width: 32,
              textAlign: "right",
              color: "#64748b",
              flexShrink: 0,
              fontWeight: 600,
            }}
          >
            {d.label}
          </div>
          <div
            style={{
              flex: 1,
              background: "#f1f5f9",
              borderRadius: 4,
              height: 22,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: "100%",
                borderRadius: 4,
                background: d.color,
                transition: "width 0.6s",
                display: "flex",
                alignItems: "center",
                paddingLeft: 8,
                minWidth: d.value > 0 ? 40 : 0,
              }}
            >
              {d.value > 0 && (
                <span
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.value}分
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
function MonthBar({ monthlyData }) {
  const maxVal = Math.max(...monthlyData.map((m) => m.total), 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "flex-end",
          minWidth: 560,
          height: 140,
          padding: "0 4px",
        }}
      >
        {monthlyData.map((m, mi) => (
          <div
            key={mi}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column-reverse",
                height: 120,
                borderRadius: 4,
                overflow: "hidden",
                minWidth: 28,
              }}
            >
              {["A", "B", "C", "D", "E"].map((cat) => {
                const h = ((m[cat] || 0) / maxVal) * 120;
                return h > 0 ? (
                  <div
                    key={cat}
                    style={{
                      width: "100%",
                      height: h,
                      background: CATEGORIES[cat].color,
                      opacity: 0.85,
                    }}
                  />
                ) : null;
              })}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{mi + 1}月</div>
          </div>
        ))}
      </div>
    </div>
  );
}
// Open-Meteoのweather_codeを絵文字・日本語ラベルに変換
const WMO_CODE_MAP = {
  0: { type: "sun", label: "晴れ" },
  1: { type: "sun", label: "晴れ" },
  2: { type: "cloudSun", label: "晴れ時々曇り" },
  3: { type: "cloud", label: "曇り" },
  45: { type: "fog", label: "霧" },
  48: { type: "fog", label: "霧" },
  51: { type: "rain", label: "小雨" },
  53: { type: "rain", label: "小雨" },
  55: { type: "rain", label: "雨" },
  61: { type: "rain", label: "雨" },
  63: { type: "rain", label: "雨" },
  65: { type: "rain", label: "強い雨" },
  71: { type: "snow", label: "雪" },
  73: { type: "snow", label: "雪" },
  75: { type: "snow", label: "強い雪" },
  80: { type: "rain", label: "にわか雨" },
  81: { type: "rain", label: "にわか雨" },
  82: { type: "storm", label: "激しいにわか雨" },
  95: { type: "storm", label: "雷雨" },
  96: { type: "storm", label: "雷雨" },
  99: { type: "storm", label: "激しい雷雨" },
};
const wmoInfo = (code) => WMO_CODE_MAP[code] || { type: "cloud", label: "—" };

// シンプルな線画アイコン（天気種別ごと）
function WeatherIcon({ type, size = 22, color = "#3B82F6", night = false }) {
  const stroke = color;
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (night) {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      </svg>
    );
  }
  switch (type) {
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v3 M12 19v3 M4.2 4.2l2.1 2.1 M17.7 17.7l2.1 2.1 M2 12h3 M19 12h3 M4.2 19.8l2.1-2.1 M17.7 6.3l2.1-2.1" />
        </svg>
      );
    case "cloudSun":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2.5v1.5 M8 11v1.5 M3.5 8H2 M14 8h-1.5 M4.6 4.6l1 1 M11.4 4.6l-1 1" />
          <path d="M9 20h7.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1.5A4 4 0 0 0 6 19" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5-1.8A4.5 4.5 0 0 0 7 18z" />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path d="M6 9h12 M4 13h16 M6 17h12" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d="M7 16h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5-1.8A4.5 4.5 0 0 0 7 16z" />
          <path d="M9 19l-1 2.5 M13 19l-1 2.5 M17 19l-1 2.5" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path d="M7 14h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5-1.8A4.5 4.5 0 0 0 7 14z" />
          <path d="M9 18v4 M9 19l1.5 1 M9 19l-1.5 1 M15 18v4 M15 19l1.5 1 M15 19l-1.5 1" />
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          <path d="M7 13h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5-1.8A4.5 4.5 0 0 0 7 13z" />
          <path d="M13 14l-3 4h3l-2 4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5-1.8A4.5 4.5 0 0 0 7 18z" />
        </svg>
      );
  }
}

function WeatherWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("today");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("位置情報非対応");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=7`;
          const res = await fetch(url);
          const d = await res.json();
          if (!d.current) {
            setError("取得失敗");
            return;
          }
          setData(d);
        } catch (e) {
          setError("取得失敗");
        }
      },
      () => setError("位置情報の取得を許可してください"),
    );
  }, []);

  if (error) {
    return (
      <div style={{ ...C, flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>
          今日の天気
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ ...C, flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>
          今日の天気
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>取得中...</div>
      </div>
    );
  }

  const todayMax = Math.round(data.daily.temperature_2m_max[0]);
  const todayMin = Math.round(data.daily.temperature_2m_min[0]);
  const todayPop = data.daily.precipitation_probability_max[0];
  const current = wmoInfo(data.current.weather_code);

  const nowHour = new Date().getHours();
  const hourlyIdx = [0, 3, 6, 9, 12, 15, 18, 21]
    .map((h) => (h >= nowHour ? h : h + 24))
    .sort((a, b) => a - b)
    .slice(0, 7)
    .map((h) => h % 24);

  return (
    <div style={{ ...C, flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setTab("today")}
            style={{
              fontSize: 13, padding: "6px 14px", borderRadius: 8, border: "1px solid",
              borderColor: tab === "today" ? "#93c5fd" : "#e2e8f0",
              background: tab === "today" ? "#eff6ff" : "transparent",
              color: tab === "today" ? "#1d4ed8" : "#64748b",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            }}
          >
            今日
          </button>
          <button
            onClick={() => setTab("week")}
            style={{
              fontSize: 13, padding: "6px 14px", borderRadius: 8, border: "1px solid",
              borderColor: tab === "week" ? "#93c5fd" : "#e2e8f0",
              background: tab === "week" ? "#eff6ff" : "transparent",
              color: tab === "week" ? "#1d4ed8" : "#64748b",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            }}
          >
            週間
          </button>
        </div>
        <a
          href="https://www.msn.com/ja-jp/weather/forecast"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
        >
          詳細 ↗
        </a>
      </div>

      {tab === "today" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <WeatherIcon type={current.type} size={40} color="#3B82F6" />
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#1e293b", lineHeight: 1 }}>
                  {Math.round(data.current.temperature_2m)}°
                </div>
                <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>{current.label}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, color: "#64748b" }}>
                最高 <b style={{ color: "#1e293b" }}>{todayMax}°</b> / 最低 <b style={{ color: "#1e293b" }}>{todayMin}°</b>
              </div>
              <div style={{ fontSize: 13, color: "#3B82F6", marginTop: 4 }}>降水確率 {todayPop}%</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${hourlyIdx.length}, 1fr)`, gap: 4, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
            {hourlyIdx.map((h) => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const hourIdx = data.hourly.time.findIndex((t) => t === `${todayStr}T${String(h).padStart(2, "0")}:00`);
              const temp = hourIdx >= 0 ? Math.round(data.hourly.temperature_2m[hourIdx]) : null;
              const pop = hourIdx >= 0 ? data.hourly.precipitation_probability[hourIdx] : null;
              const code = hourIdx >= 0 ? data.hourly.weather_code[hourIdx] : null;
              const isNight = h >= 18 || h < 6;
              const info = code !== null ? wmoInfo(code) : null;
              return (
                <div key={h} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{h}時</div>
                  {info ? (
                    <WeatherIcon type={info.type} size={22} color={info.type === "rain" || info.type === "storm" ? "#3B82F6" : "#64748b"} night={isNight} />
                  ) : (
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>
                  )}
                  <div style={{ fontSize: 13, color: "#1e293b", marginTop: 6 }}>{temp !== null ? `${temp}°` : ""}</div>
                  <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 2 }}>{pop !== null ? `${pop}%` : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          {data.daily.time.map((dateStr, i) => {
            const d = new Date(dateStr);
            const label = i === 0 ? "今日" : `${d.getMonth() + 1}/${d.getDate()}(${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]})`;
            const info = wmoInfo(data.daily.weather_code[i]);
            return (
              <div key={dateStr} style={{
                display: "flex", alignItems: "center", gap: 14, fontSize: 14,
                padding: "10px 0", borderBottom: i < data.daily.time.length - 1 ? "1px solid #f1f5f9" : "none",
              }}>
                <span style={{ width: 64, color: "#64748b" }}>{label}</span>
                <span style={{ width: 26, display: "flex" }}>
                  <WeatherIcon type={info.type} size={22} color="#3B82F6" />
                </span>
                <span style={{ width: 70, fontSize: 13, color: "#3B82F6" }}>
                  {data.daily.precipitation_probability_max[i]}%
                </span>
                <span style={{ marginLeft: "auto", fontSize: 15 }}>
                  <b style={{ color: "#1e293b" }}>{Math.round(data.daily.temperature_2m_max[i])}°</b>
                  <span style={{ color: "#94a3b8" }}> / {Math.round(data.daily.temperature_2m_min[i])}°</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const QUOTES = [
  {
    text: "成功とは、失敗を重ねても熱意を失わない能力である。",
    author: "ウィンストン・チャーチル",
  },
  { text: "どんなに遠い道のりも、一歩から始まる。", author: "老子" },
  {
    text: "今日できることを明日に延ばすな。",
    author: "ベンジャミン・フランクリン",
  },
  { text: "夢を見るからこそ、人生は輝く。", author: "モーツァルト" },
  { text: "困難な状況は、強い人間を作る。", author: "ロイ・T・ベネット" },
  { text: "行動こそが、成功への唯一の道である。", author: "パブロ・ピカソ" },
  {
    text: "小さな機会から、偉大なことが始まることが多い。",
    author: "デモステネス",
  },
  {
    text: "人生で大切なのは、どこにいるかではなく、どこへ向かっているかだ。",
    author: "オリバー・ウェンデル・ホームズ",
  },
  { text: "失敗は成功のもと。", author: "ことわざ" },
  {
    text: "あなたの時間は限られている。他人の人生を生きて無駄にするな。",
    author: "スティーブ・ジョブズ",
  },
  {
    text: "最大のリスクは、リスクを取らないことだ。",
    author: "マーク・ザッカーバーグ",
  },
  {
    text: "やってみなければ、何もわからない。",
    author: "テオドア・ルーズベルト",
  },
];

function QuoteWidget() {
  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);
  return (
    <div style={{ ...C, flex: 1, minWidth: 200 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          marginBottom: 10,
        }}
      >
        💬 今日の名言
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#1e293b",
          lineHeight: 1.7,
          fontStyle: "italic",
          marginBottom: 8,
        }}
      >
        「{quote.text}」
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
        — {quote.author}
      </div>
    </div>
  );
}

function SummaryPanel({ logs, subtitle }) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const firstDay = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const lastDay = (() => {
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
  })();
  const [df, setDf] = useState(firstDay);
  const [dt, setDt] = useState(lastDay);
  const { cs, md, totM, totC } = useMemo(() => {
    const f = logs.filter((l) => l.date >= df && l.date <= dt);
    const cs = {};
    Object.keys(CATEGORIES).forEach((k) => (cs[k] = { minutes: 0, count: 0 }));
    f.forEach((l) => {
      if (!cs[l.cat]) return;
      cs[l.cat].minutes += l.minutes;
      cs[l.cat].count += 1;
    });
    const md = Array.from({ length: 12 }, () => {
      const o = { total: 0 };
      Object.keys(CATEGORIES).forEach((k) => (o[k] = 0));
      return o;
    });
    f.forEach((l) => {
      if (!CATEGORIES[l.cat]) return;
      const mi = parseInt(l.date.split("-")[1]) - 1;
      md[mi][l.cat] += l.minutes;
      md[mi].total += l.minutes;
    });
    return {
      cs,
      md,
      totM: Object.values(cs).reduce((s, c) => s + c.minutes, 0),
      totC: Object.values(cs).reduce((s, c) => s + c.count, 0),
    };
  }, [logs, df, dt]);
  const pd = Object.entries(CATEGORIES).map(([k, v]) => ({
    label: `${k}: ${v.label}`,
    value: cs[k].minutes,
    color: v.color,
  }));
  const bd = Object.entries(CATEGORIES).map(([k, v]) => ({
    label: k,
    value: cs[k].minutes,
    color: v.color,
  }));
  return (
    <div>
      <div
        style={{
          ...C,
          marginBottom: 20,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {subtitle && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1e293b",
              marginRight: 4,
            }}
          >
            {subtitle}
          </span>
        )}
        <span style={{ fontSize: 13, color: "#64748b" }}>集計期間</span>
        <input
          type="date"
          value={df}
          onChange={(e) => setDf(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            outline: "none",
          }}
        />
        <span style={{ color: "#94a3b8" }}>〜</span>
        <input
          type="date"
          value={dt}
          onChange={(e) => setDt(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            outline: "none",
          }}
        />
        <div style={{ marginLeft: "auto", fontSize: 13 }}>
          <b style={{ color: "#1e293b" }}>{totC}件</b>
          <span style={{ color: "#94a3b8", margin: "0 6px" }}>/</span>
          <b style={{ color: "#1e293b" }}>
            {Math.round((totM / 60) * 10) / 10}h
          </b>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <div
            key={k}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 16,
              border: `1px solid ${v.color}22`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              borderTop: `3px solid ${v.color}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: v.color }}>
                {k}
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                {cs[k].count}件
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
              {Math.round((cs[k].minutes / 60) * 10) / 10}
              <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                h
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {v.label}
            </div>
            {totM > 0 && (
              <div
                style={{
                  marginTop: 8,
                  height: 3,
                  background: "#f1f5f9",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: v.color,
                    width: `${(cs[k].minutes / totM) * 100}%`,
                    transition: "width 0.6s",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={C}>
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            区分別 時間構成比
          </h3>
          <PieChart data={pd} />
        </div>
        <div style={C}>
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            区分別 合計時間
          </h3>
          <BarChart data={bd} />
        </div>
      </div>
      <div style={C}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            月別 業務区分別 合計時間
          </h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: v.color,
                  }}
                />
                <span style={{ color: "#64748b" }}>
                  {k}: {v.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <MonthBar monthlyData={md} />
      </div>
    </div>
  );
}

function DailyReportPage({ currentUser, onSave, draft, onDraftChange, logs }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(draft?.date ?? today);
  const [dayComment, setDayComment] = useState(draft?.dayComment ?? "");
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState(
    () => draft?.rows ?? [newRow(), newRow(), newRow()],
  );
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("report"); // "report" or "row"
  const [templateRowTarget, setTemplateRowTarget] = useState(null); // 業務行テンプレート保存時の対象行
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateTab, setTemplateTab] = useState("report");
  const [tagSuggest, setTagSuggest] = useState({
    rowId: null,
    field: null,
    candidates: [],
    word: "",
  });

  const allPastTags = useMemo(() => {
    const tagSet = new Set();
    (logs || [])
      .filter((l) => l.userId === currentUser.id)
      .forEach((l) => {
        extractTags(l.task).forEach((t) => tagSet.add(t));
        extractTags(l.detail).forEach((t) => tagSet.add(t));
        extractTags(l.dayComment).forEach((t) => tagSet.add(t));
      });
    return Array.from(tagSet);
  }, [logs]);

  const handleTagInput = (rowId, field, val) => {
    upd(rowId, field, val);
    // 各行の末尾にある#タグにマッチ（textareaの改行対応）
    const lastLine = val.split("\n").pop() || "";
    const match = lastLine.match(/#(\S*)$/);
    if (match) {
      const word = match[1];
      const candidates = allPastTags.filter(
        (t) => t.toLowerCase().startsWith(word.toLowerCase()) && t !== word,
      );
      setTagSuggest({ rowId, field, candidates, word });
    } else {
      setTagSuggest({ rowId: null, field: null, candidates: [], word: "" });
    }
  };

  const applyTag = (rowId, field, currentVal, tag) => {
    const lines = currentVal.split("\n");
    lines[lines.length - 1] = lines[lines.length - 1].replace(
      /#(\S*)$/,
      `#${tag} `,
    );
    const newVal = lines.join("\n");
    upd(rowId, field, newVal);
    setTagSuggest({ rowId: null, field: null, candidates: [], word: "" });
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from("log_templates")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
      if (data) setTemplates(data);
    };
    fetchTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    // templateRowTargetがあれば業務行1行、なければ日報全体
    const actualType = templateRowTarget ? "row" : "report";
    let saveRows;
    if (actualType === "row") {
      saveRows = [
        {
          task: templateRowTarget.task,
          detail: templateRowTarget.detail,
          start: templateRowTarget.start,
          end: templateRowTarget.end,
          cat: templateRowTarget.cat,
        },
      ];
    } else {
      saveRows = rows
        .filter((r) => r.task)
        .map((r) => ({
          task: r.task,
          detail: r.detail,
          start: r.start,
          end: r.end,
          cat: r.cat,
        }));
    }
    if (saveRows.length === 0) return;
    const { data, error } = await supabase
      .from("log_templates")
      .insert({
        user_id: currentUser.id,
        name: templateName.trim(),
        rows: saveRows,
        type: actualType,
      })
      .select()
      .single();
    if (!error && data) {
      setTemplates((p) => [data, ...p]);
      setTemplateName("");
      setTemplateRowTarget(null);
      setShowSaveTemplate(false);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    }
  };

  const sortByTime = (rows) => {
    return [...rows].sort((a, b) => {
      if (!a.start && !b.start) return 0;
      if (!a.start) return 1;
      if (!b.start) return -1;
      return a.start.localeCompare(b.start);
    });
  };

  const handleLoadTemplate = (tmpl) => {
    setRows((p) => {
      const nonEmpty = p.filter((r) => r.task);
      const newRows = tmpl.rows.map((r) => ({ ...newRow(), ...r }));
      const sorted = sortByTime([...nonEmpty, ...newRows]);
      // 空白行を最低2行確保
      return [...sorted, newRow(), newRow()];
    });
    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = async (id) => {
    await supabase.from("log_templates").delete().eq("id", id);
    setTemplates((p) => p.filter((t) => t.id !== id));
  };

  // ページ移動時にドラフトを保存（debounceで連続実行を防ぐ）
  useEffect(() => {
    const timer = setTimeout(() => {
      onDraftChange?.({ date, dayComment, rows });
    }, 1000);
    return () => clearTimeout(timer);
  }, [date, dayComment, rows]);
  const getMins = (s, e) => {
    if (!s || !e) return 0;
    const [sh, sm] = s.split(":").map(Number),
      [eh, em] = e.split(":").map(Number);
    const v = eh * 60 + em - (sh * 60 + sm);
    return v > 0 ? v : 0;
  };
  const upd = useCallback(
    (id, field, val) =>
      setRows((r) =>
        r.map((row) => (row.id === id ? { ...row, [field]: val } : row)),
      ),
    [],
  );
  const addRow_fn = () => setRows((r) => [...r, newRow()]);
  const delRow = (id) =>
    setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : r));
  const totalMins = rows.reduce((s, r) => s + getMins(r.start, r.end), 0);
  const [savedComment, setSavedComment] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSeconds, setSaveSeconds] = useState(0);

  // 転記（業務行があれば行＋コメント、なければコメントのみ）
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    setSaveSeconds(0);
    const timer = setInterval(() => setSaveSeconds((s) => s + 1), 1000);
    try {
      await withTimeout(doSave(), 15000);
    } catch (e) {
      console.error("転記処理でエラー・タイムアウトが発生しました:", e);
      setSaveError("保存に時間がかかっています。通信状況をご確認の上、ページを再読み込みしてから再度お試しください。");
    } finally {
      clearInterval(timer);
      setSaving(false);
      setSaveSeconds(0);
    }
  };

  const doSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("セッションが切れています。ページを再読み込みしてログインし直してください。");
        window.location.reload();
        return;
      }
    } catch (e) {
      console.error("セッション確認エラー:", e);
      // セッション確認に失敗しても処理は継続する（誤って止まらないように）
    }

    // 「タイトル」が未入力なのに、他の項目（詳細・時間・区分）には何かしら入力されている行がある場合、
    // 黙って転記対象から外すと内容が消えてしまうため、転記自体を止めて気づけるようにする
    const incompleteRows = rows
      .map((r, i) => ({ ...r, _index: i + 1 }))
      .filter((r) => !r.task && (r.detail?.trim() || r.start || r.end || r.cat));
    if (incompleteRows.length > 0) {
      alert(
        `タイトルが未入力の行があります（${incompleteRows.map((r) => `${r._index}行目`).join("・")}）。\nタイトルを入力するか、その行の内容をすべて削除してから転記してください。`,
      );
      return;
    }

    const valid = rows.filter(
      (r) => r.task && r.start && r.end && r.cat && getMins(r.start, r.end) > 0,
    );
    if (!valid.length && !dayComment.trim()) return;

    // 振り返りコメントは day_comments テーブルで独立管理（既存があれば追記）
    if (dayComment.trim()) {
      const { data: existingC } = await supabase
        .from("day_comments")
        .select("comment")
        .eq("user_id", currentUser.id)
        .eq("date", date)
        .maybeSingle();
      const existingComment = existingC?.comment || "";
      const finalComment = existingComment
        ? `${existingComment}\n\n${dayComment.trim()}`
        : dayComment.trim();
      const { error: commentError } = await supabase
        .from("day_comments")
        .upsert(
          { user_id: currentUser.id, user_name: currentUser.name, date, comment: finalComment },
          { onConflict: "user_id,date" },
        );
      if (commentError) {
        alert("振り返りコメントの保存に失敗しました: " + commentError.message);
        return;
      }
    }

    if (valid.length > 0) {
      const newLogs = valid.map((r) => ({
        user_id: currentUser.id,
        user_name: currentUser.name,
        date,
        task: r.task,
        detail: r.detail,
        start_time: r.start,
        end_time: r.end,
        minutes: getMins(r.start, r.end),
        cat: r.cat,
      }));
      const { data: inserted, error } = await supabase
        .from("logs")
        .insert(newLogs)
        .select();
      if (error) {
        alert("保存に失敗しました: " + error.message);
        return;
      }
      onSave(
        (inserted || []).map((l) => ({
          id: l.id,
          date: l.date,
          task: l.task,
          detail: l.detail,
          start: l.start_time,
          end: l.end_time,
          minutes: l.minutes,
          cat: l.cat,
          user: l.user_name,
          userId: l.user_id,
          managerComment: "",
          managerDayComment: "",
          dayComment: dayComment.trim() || "",
        })),
      );
    } else {
      {
        const { data: inserted, error } = await supabase
          .from("logs")
          .insert({
            user_id: currentUser.id,
            user_name: currentUser.name,
            date,
            task: "（コメントのみ）",
            minutes: 0,
            cat: "other",
          })
          .select();
        if (error) {
          alert("保存に失敗しました: " + error.message);
          return;
        }
        onSave(
          (inserted || []).map((l) => ({
            id: l.id,
            date: l.date,
            task: l.task,
            detail: l.detail || "",
            start: l.start_time || "",
            end: l.end_time || "",
            minutes: l.minutes,
            cat: l.cat,
            user: l.user_name,
            userId: l.user_id,
            managerComment: "",
            managerDayComment: "",
            dayComment: l.day_comment || "",
          })),
        );
      }
    }
    setRows([newRow(), newRow(), newRow()]);
    setDayComment("");
    onDraftChange?.(null);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1500);
  };

  // 振り返りコメントだけ転記（業務行なしでもOK）
  const handleSaveCommentOnly = async () => {
    if (!dayComment.trim()) return;
    // 同じ日付・同ユーザーの既存レコードを確認
    const { data: existing, error: fetchError } = await supabase
      .from("logs")
      .select("id, day_comment")
      .eq("user_id", currentUser.id)
      .eq("date", date);

    console.log("[振り返り保存] 既存レコード取得結果:", existing, "エラー:", fetchError);

    if (existing && existing.length > 0) {
      const existingComment = existing
        .map((r) => r.day_comment)
        .find((c) => c && c.trim()) || "";
      console.log("[振り返り保存] 既存コメント:", existingComment, "新規入力:", dayComment);
      const finalComment = existingComment
        ? `${existingComment}\n\n${dayComment.trim()}`
        : dayComment.trim();
      console.log("[振り返り保存] 最終的に保存する内容:", finalComment);
      // 既存レコードがあれば全レコードのday_commentを統一して更新
      const { error } = await supabase
        .from("logs")
        .update({ day_comment: finalComment })
        .eq("user_id", currentUser.id)
        .eq("date", date);
      if (error) {
        alert("保存に失敗しました: " + error.message);
        return;
      }
    } else {
      // レコードがなければコメントのみのレコードを新規作成
      const { error } = await supabase.from("logs").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        date,
        task: "（コメントのみ）",
        minutes: 0,
        cat: "other",
        day_comment: dayComment.trim(),
      });
      if (error) {
        alert("保存に失敗しました: " + error.message);
        return;
      }
    }
    setSavedComment(true);
    setTimeout(() => setSavedComment(false), 2000);
  };
  return (
    <div>
      <div
        style={{
          ...C,
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 4,
              }}
            >
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              氏名
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#1e293b",
                padding: "8px 12px",
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              {currentUser.name}
            </div>
          </div>
          {totalMins > 0 && (
            <div
              style={{
                padding: "8px 16px",
                background: "#EFF6FF",
                borderRadius: 8,
                border: "1px solid #BFDBFE",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b" }}>本日合計 </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#3B82F6" }}>
                {Math.floor(totalMins / 60)}h
                {totalMins % 60 > 0 ? `${totalMins % 60}m` : ""}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowTemplateModal(true)} style={{ ...BB }}>
            📋 テンプレート
          </button>
          <button onClick={() => setShowSaveTemplate(true)} style={{ ...BB }}>
            💾 テンプレート保存
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...BP, boxShadow: "0 2px 8px rgba(59,130,246,0.3)", opacity: saving ? 0.6 : 1 }}
          >
            {saved ? (
              <>
                <Icon name="check" size={16} />
                保存しました！
              </>
            ) : saving ? (
              <>転記中...（{saveSeconds}秒経過）</>
            ) : (
              <>
                <Icon name="save" size={16} />
                転記する
              </>
            )}
          </button>
        </div>
        {saveError && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#991B1B",
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>⚠️ {saveError}</span>
            <button
              onClick={() => window.location.reload()}
              style={{ ...BB, padding: "4px 10px", fontSize: 12, flexShrink: 0 }}
            >
              再読み込み
            </button>
          </div>
        )}

        {/* テンプレート呼び出しモーダル */}
        {showTemplateModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
            onClick={(e) =>
              e.target === e.currentTarget && setShowTemplateModal(false)
            }
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 28,
                width: 500,
                maxWidth: "95vw",
                maxHeight: "80vh",
                overflow: "auto",
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  📋 テンプレートを選択
                </h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              {/* タブ切り替え */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginBottom: 16,
                  background: "#f1f5f9",
                  borderRadius: 10,
                  padding: 4,
                }}
              >
                {[
                  ["report", "📋 日報テンプレート"],
                  ["row", "📌 業務行テンプレート"],
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setTemplateTab(tab)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: templateTab === tab ? 600 : 400,
                      fontFamily: "inherit",
                      background: templateTab === tab ? "#fff" : "transparent",
                      color: templateTab === tab ? "#1e293b" : "#64748b",
                      boxShadow:
                        templateTab === tab
                          ? "0 1px 3px rgba(0,0,0,0.1)"
                          : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(() => {
                const filtered = templates.filter(
                  (t) => (t.type || "report") === templateTab,
                );
                if (filtered.length === 0)
                  return (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "32px 0",
                        fontSize: 13,
                      }}
                    >
                      保存済みのテンプレートがありません
                    </div>
                  );
                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {filtered.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          background: "#f8fafc",
                          borderRadius: 10,
                          padding: "12px 14px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#1e293b",
                              flex: 1,
                            }}
                          >
                            {t.name}
                          </span>
                          <button
                            onClick={() => handleLoadTemplate(t)}
                            style={{ ...BP, padding: "5px 14px", fontSize: 12 }}
                          >
                            追加
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(t.id)}
                            style={{
                              ...BB,
                              padding: "5px 10px",
                              fontSize: 12,
                              color: "#EF4444",
                              borderColor: "#FECACA",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#FEF2F2")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#fff")
                            }
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {t.rows.map((r, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                display: "flex",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  color: r.cat
                                    ? CATEGORIES[r.cat]?.color
                                    : "#94a3b8",
                                  fontWeight: 600,
                                }}
                              >
                                {r.cat || "-"}
                              </span>
                              <span>{r.task}</span>
                              {r.start && r.end && (
                                <span style={{ color: "#94a3b8" }}>
                                  {r.start}〜{r.end}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* テンプレート保存モーダル */}
        {showSaveTemplate && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
            onClick={(e) =>
              e.target === e.currentTarget && setShowSaveTemplate(false)
            }
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 28,
                width: 420,
                maxWidth: "95vw",
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  💾 テンプレートとして保存
                </h3>
                <button
                  onClick={() => setShowSaveTemplate(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginBottom: 16,
                  background: "#f1f5f9",
                  borderRadius: 10,
                  padding: 4,
                }}
              >
                {[
                  ["report", "📋 日報全体"],
                  ["row", "📌 業務行1行"],
                ].map(([type, label]) => {
                  const isActive = templateRowTarget
                    ? type === "row"
                    : type === "report";
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (type === "report") {
                          setTemplateRowTarget(null);
                        } else {
                          // 業務行タブを押したとき、入力済みの最初の行をデフォルトでセット
                          const firstRow = rows.find((r) => r.task);
                          setTemplateRowTarget(firstRow || null);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: "inherit",
                        background: isActive ? "#fff" : "transparent",
                        color: isActive ? "#1e293b" : "#64748b",
                        boxShadow: isActive
                          ? "0 1px 3px rgba(0,0,0,0.1)"
                          : "none",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {templateRowTarget && (
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    保存する業務行を選択
                  </label>
                  <select
                    value={templateRowTarget?.id || ""}
                    onChange={(e) => {
                      const row = rows.find((r) => r.id === e.target.value);
                      setTemplateRowTarget(row || null);
                    }}
                    style={I}
                  >
                    <option value="">選択してください</option>
                    {rows
                      .filter((r) => r.task)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.cat ? `[${r.cat}] ` : ""}
                          {r.task}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  テンプレート名
                </label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="例：定期訪問ルート、週次社内作業"
                  style={I}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                />
              </div>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button onClick={() => setShowSaveTemplate(false)} style={BB}>
                  キャンセル
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  style={{ ...BP, opacity: templateName.trim() ? 1 : 0.4 }}
                >
                  <Icon name="save" size={14} />
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {rows.map((row, i) => {
          const mins = getMins(row.start, row.end);
          const valid = row.task && row.start && row.end && row.cat && mins > 0;
          const cc = row.cat ? CATEGORIES[row.cat].color : "#cbd5e1";
          const cb = row.cat ? CATEGORIES[row.cat].bg : "#fff";
          return (
            <div
              key={row.id}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                borderLeft: `4px solid ${valid ? cc : "#e2e8f0"}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: valid ? cb : "#fafafa",
                  borderBottom: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: valid ? cc : "#e2e8f0",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="time"
                    value={row.start}
                    onChange={(e) => upd(row.id, "start", e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>〜</span>
                  <input
                    type="time"
                    value={row.end}
                    onChange={(e) => upd(row.id, "end", e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  {mins > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: cc,
                        background: cb,
                        padding: "3px 8px",
                        borderRadius: 5,
                        border: `1px solid ${cc}33`,
                      }}
                    >
                      {mins}分
                    </span>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => upd(row.id, "_showCat", !row._showCat)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: `1px solid ${row.cat ? CATEGORIES[row.cat].color : "#e2e8f0"}`,
                      fontSize: 13,
                      color: row.cat ? CATEGORIES[row.cat].color : "#94a3b8",
                      fontWeight: row.cat ? 700 : 400,
                      background: row.cat ? CATEGORIES[row.cat].bg : "#fff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      minWidth: 140,
                      textAlign: "left",
                    }}
                  >
                    {row.cat
                      ? `${row.cat}: ${CATEGORIES[row.cat].label}`
                      : "区分を選択 ▼"}
                  </button>
                  {row._showCat && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 50,
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        overflow: "hidden",
                        minWidth: 180,
                      }}
                    >
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <div
                          key={k}
                          onClick={() => {
                            upd(row.id, "cat", k);
                            upd(row.id, "_showCat", false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: row.cat === k ? v.bg : "#fff",
                            borderLeft: `3px solid ${row.cat === k ? v.color : "transparent"}`,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = v.bg)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              row.cat === k ? v.bg : "#fff")
                          }
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: v.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: v.color,
                            }}
                          >
                            {k}
                          </span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            {v.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  {row.task && (
                    <>
                      <button
                        onClick={() => {
                          setRows((p) => [
                            ...p,
                            {
                              ...newRow(),
                              task: row.task,
                              detail: row.detail,
                              start: row.start,
                              end: row.end,
                              cat: row.cat,
                            },
                          ]);
                        }}
                        style={{
                          background: "#EFF6FF",
                          border: "1px solid #BFDBFE",
                          cursor: "pointer",
                          color: "#3B82F6",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "inherit",
                        }}
                      >
                        複製
                      </button>
                      <button
                        onClick={() => {
                          setTemplateType("row");
                          setTemplateRowTarget(row);
                          setShowSaveTemplate(true);
                        }}
                        style={{
                          background: "#F5F3FF",
                          border: "1px solid #DDD6FE",
                          cursor: "pointer",
                          color: "#8B5CF6",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "inherit",
                        }}
                      >
                        保存
                      </button>
                    </>
                  )}
                  {rows.length > 1 && (
                    <button
                      onClick={() => delRow(row.id)}
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        cursor: "pointer",
                        color: "#EF4444",
                        padding: "4px 8px",
                        borderRadius: 6,
                        display: "flex",
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    タイトル <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      value={row.task}
                      onChange={(e) =>
                        handleTagInput(row.id, "task", e.target.value)
                      }
                      placeholder="業務タイトル（#タグで分類できます）"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 7,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                        color: "#1e293b",
                        outline: "none",
                        boxSizing: "border-box",
                        fontWeight: 500,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        setTimeout(
                          () =>
                            setTagSuggest({
                              rowId: null,
                              field: null,
                              candidates: [],
                              word: "",
                            }),
                          150,
                        );
                      }}
                    />
                    {tagSuggest.rowId === row.id &&
                      tagSuggest.field === "task" &&
                      tagSuggest.candidates.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            zIndex: 50,
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                            overflow: "hidden",
                            minWidth: 180,
                            marginTop: 2,
                          }}
                        >
                          {tagSuggest.candidates.map((tag) => (
                            <div
                              key={tag}
                              onMouseDown={() =>
                                applyTag(row.id, "task", row.task, tag)
                              }
                              style={{
                                padding: "8px 14px",
                                cursor: "pointer",
                                fontSize: 13,
                                color: "#6D28D9",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#F5F3FF")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "#fff")
                              }
                            >
                              <span
                                style={{ color: "#8B5CF6", fontWeight: 600 }}
                              >
                                #{tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    {extractTags(row.task).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          flexWrap: "wrap",
                          marginTop: 6,
                        }}
                      >
                        {extractTags(row.task).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: "#F5F3FF",
                              color: "#6D28D9",
                              fontSize: 11,
                              fontWeight: 600,
                              border: "1px solid #DDD6FE",
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    詳細{" "}
                    <span style={{ fontWeight: 400, fontSize: 10 }}>
                      （右下をドラッグして高さを調整できます）
                    </span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <textarea
                      value={row.detail}
                      onChange={(e) =>
                        handleTagInput(row.id, "detail", e.target.value)
                      }
                      placeholder="場所・相手・内容・目的など詳細を入力...(#タグで分類できます)"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 7,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                        color: "#1e293b",
                        outline: "none",
                        resize: "vertical",
                        minHeight: 60,
                        maxHeight: 320,
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        lineHeight: 1.7,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        setTimeout(
                          () =>
                            setTagSuggest({
                              rowId: null,
                              field: null,
                              candidates: [],
                              word: "",
                            }),
                          150,
                        );
                      }}
                    />
                    {tagSuggest.rowId === row.id &&
                      tagSuggest.field === "detail" &&
                      tagSuggest.candidates.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "100%",
                            left: 0,
                            zIndex: 50,
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                            overflow: "hidden",
                            minWidth: 180,
                            marginTop: 2,
                          }}
                        >
                          {tagSuggest.candidates.map((tag) => (
                            <div
                              key={tag}
                              onMouseDown={() =>
                                applyTag(row.id, "detail", row.detail, tag)
                              }
                              style={{
                                padding: "8px 14px",
                                cursor: "pointer",
                                fontSize: 13,
                                color: "#6D28D9",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#F5F3FF")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "#fff")
                              }
                            >
                              <span
                                style={{ color: "#8B5CF6", fontWeight: 600 }}
                              >
                                #{tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    {extractTags(row.detail).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          flexWrap: "wrap",
                          marginTop: 6,
                        }}
                      >
                        {extractTags(row.detail).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: "#F5F3FF",
                              color: "#6D28D9",
                              fontSize: 11,
                              fontWeight: 600,
                              border: "1px solid #DDD6FE",
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {row.managerComment && (
                  <div
                    style={{
                      background: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      borderRadius: 8,
                      padding: "8px 12px",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>👑</span>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#D97706",
                          marginBottom: 2,
                        }}
                      >
                        上司コメント
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#92400E",
                          lineHeight: 1.6,
                        }}
                      >
                        {row.managerComment}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={addRow_fn}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: 12,
          border: "2px dashed #cbd5e1",
          background: "transparent",
          color: "#64748b",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 16,
          transition: "all 0.2s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#3B82F6";
          e.currentTarget.style.color = "#3B82F6";
          e.currentTarget.style.background = "#EFF6FF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#cbd5e1";
          e.currentTarget.style.color = "#64748b";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon name="plus" size={16} />
        行を追加する（現在 {rows.length} 行）
      </button>
      <div style={{ ...C, marginBottom: 14 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 10,
          }}
        >
          <Icon name="msg" size={15} />
          本日の振り返り・総括コメント
          <span
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 400,
              marginLeft: 4,
            }}
          >
            （上司への共有事項）
          </span>
        </label>
        <textarea
          value={dayComment}
          onChange={(e) => setDayComment(e.target.value)}
          rows={4}
          placeholder="本日の振り返り・気づき・上司への共有事項を入力..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#1e293b",
            outline: "none",
            resize: "vertical",
            minHeight: 80,
            fontFamily: "inherit",
            boxSizing: "border-box",
            lineHeight: 1.6,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
      </div>
      <div style={C}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          業務区分
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                background: v.bg,
                borderRadius: 6,
                border: `1px solid ${v.color}33`,
              }}
            >
              <span style={{ fontWeight: 700, color: v.color, fontSize: 13 }}>
                {k}
              </span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{v.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function EditLogForm({ rec, onSave, onCancel }) {
  const [task, setTask] = useState(rec.task);
  const [detail, setDetail] = useState(rec.detail || "");
  const [start, setStart] = useState(rec.start);
  const [end, setEnd] = useState(rec.end);
  const [cat, setCat] = useState(rec.cat);
  const [showCat, setShowCat] = useState(false);
  const getMins = (s, e) => {
    if (!s || !e) return 0;
    const [sh, sm] = s.split(":").map(Number),
      [eh, em] = e.split(":").map(Number);
    const v = eh * 60 + em - (sh * 60 + sm);
    return v > 0 ? v : 0;
  };
  const handleSave = async () => {
    const minutes = getMins(start, end);
    const { error } = await supabase
      .from("logs")
      .update({
        task,
        detail,
        start_time: start,
        end_time: end,
        cat,
        minutes,
      })
      .eq("id", rec.id);
    if (!error) onSave({ ...rec, task, detail, start, end, cat, minutes });
    else alert("保存に失敗しました");
  };
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 12,
            color: "#64748b",
            display: "block",
            marginBottom: 5,
          }}
        >
          業務タイトル
        </label>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          style={I}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 12,
            color: "#64748b",
            display: "block",
            marginBottom: 5,
          }}
        >
          詳細
        </label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={4}
          style={{ ...I, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
        />
      </div>
      <div
        style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}
      >
        <div>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            開始時間
          </label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{ ...I, width: "auto" }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            終了時間
          </label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{ ...I, width: "auto" }}
          />
        </div>
        {getMins(start, end) > 0 && (
          <div
            style={{
              alignSelf: "flex-end",
              paddingBottom: 9,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            {getMins(start, end)}分
          </div>
        )}
      </div>
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            fontSize: 12,
            color: "#64748b",
            display: "block",
            marginBottom: 5,
          }}
        >
          区分
        </label>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowCat(!showCat)}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${cat ? CATEGORIES[cat].color : "#e2e8f0"}`,
              fontSize: 13,
              color: cat ? CATEGORIES[cat].color : "#94a3b8",
              fontWeight: cat ? 700 : 400,
              background: cat ? CATEGORIES[cat].bg : "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              minWidth: 160,
              textAlign: "left",
            }}
          >
            {cat ? `${cat}: ${CATEGORIES[cat].label}` : "区分を選択 ▼"}
          </button>
          {showCat && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                zIndex: 50,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                overflow: "hidden",
                minWidth: 180,
              }}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <div
                  key={k}
                  onClick={() => {
                    setCat(k);
                    setShowCat(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: cat === k ? v.bg : "#fff",
                    borderLeft: `3px solid ${cat === k ? v.color : "transparent"}`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = v.bg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      cat === k ? v.bg : "#fff")
                  }
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: v.color }}
                  >
                    {k}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {v.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={BB}>
          キャンセル
        </button>
        <button onClick={handleSave} style={BP}>
          <Icon name="save" size={14} />
          保存
        </button>
      </div>
    </div>
  );
}

function LogCard({
  rec,
  canEdit,
  isAdmin,
  onDelete,
  onSaveManagerComment,
  onEditLog,
  onDuplicateRow,
  onTagClick,
}) {
  const [editModal, setEditModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rec.managerComment || "");
  const cat = CATEGORIES[rec.cat] || {
    color: "#94a3b8",
    bg: "#f8fafc",
    label: "その他",
  };
  return (
    <div
      style={{
        borderBottom: "1px solid #f1f5f9",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((x) => !x)}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cat.color,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              color: "#1e293b",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {rec.task.split(/(#[^\s#]+)/g).map((part, i) =>
              part.startsWith("#") ? (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(part.slice(1));
                  }}
                  style={{
                    color: "#8B5CF6",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </div>
          {rec.detail && !expanded && (
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 1,
              }}
            >
              {rec.detail}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {rec.managerComment && (
            <span
              style={{
                fontSize: 10,
                background: "#FEF3C7",
                color: "#D97706",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #FDE68A",
                fontWeight: 600,
              }}
            >
              👑コメントあり
            </span>
          )}
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {rec.start}〜{rec.end}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: cat.color,
              background: cat.bg,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {rec.cat}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#64748b",
              width: 36,
              textAlign: "right",
            }}
          >
            {rec.minutes}分
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#94a3b8",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            ▼
          </span>
        </div>
      </div>
      {expanded && (
        <div
          style={{
            padding: "0 16px 14px 28px",
            borderTop: "1px solid #f8fafc",
          }}
        >
          {rec.detail && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                詳細
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.7,
                  background: "#f8fafc",
                  padding: "10px 12px",
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {rec.detail}
              </div>
            </div>
          )}
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#D97706" }}>
                👑 上司コメント（この業務について）
              </span>
              {isAdmin && !editing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                  style={{
                    fontSize: 11,
                    color: "#D97706",
                    background: "#FEF3C7",
                    border: "1px solid #FDE68A",
                    borderRadius: 5,
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  {rec.managerComment ? "編集" : "コメントを追加"}
                </button>
              )}
            </div>
            {editing ? (
              <div onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  rows={3}
                  placeholder="この業務へのフィードバックを入力..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: "1px solid #FDE68A",
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    background: "#fff",
                    boxSizing: "border-box",
                    lineHeight: 1.6,
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      onSaveManagerComment(rec.id, draft);
                      setEditing(false);
                    }}
                    style={{
                      padding: "6px 14px",
                      background: "#F59E0B",
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setDraft(rec.managerComment || "");
                      setEditing(false);
                    }}
                    style={{
                      padding: "6px 14px",
                      background: "#f1f5f9",
                      color: "#64748b",
                      border: "none",
                      borderRadius: 7,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : rec.managerComment ? (
              <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.7 }}>
                {rec.managerComment}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#D97706", opacity: 0.5 }}>
                {isAdmin
                  ? "（コメントを追加できます）"
                  : "（上司からのコメントはまだありません）"}
              </div>
            )}
          </div>
          {canEdit && (
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              {rec.task !== "（コメントのみ）" && onDuplicateRow && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateRow(rec);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    color: "#3B82F6",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: 7,
                    padding: "5px 10px",
                    cursor: "pointer",
                  }}
                >
                  📋 この行を複製
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "#3B82F6",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 7,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                <Icon name="edit" size={13} />
                編集
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(rec.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "#ef4444",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 7,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                <Icon name="trash" size={13} />
                削除
              </button>
            </div>
          )}
          {editModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 200,
              }}
              onClick={(e) =>
                e.target === e.currentTarget && setEditModal(false)
              }
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 28,
                  width: 520,
                  maxWidth: "95vw",
                  maxHeight: "88vh",
                  overflow: "auto",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    業務を編集
                  </h3>
                  <button
                    onClick={() => setEditModal(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                    }}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>
                <EditLogForm
                  rec={rec}
                  onSave={(updated) => {
                    onEditLog(updated);
                    setEditModal(false);
                  }}
                  onCancel={() => setEditModal(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DateGroup({
  date,
  recs,
  currentUser,
  onDelete,
  onSaveManagerComment,
  onSaveDayComment,
  onUpdateMemberComment,
  onEditLog,
  onDuplicate,
  onTagClick,
}) {
  const [editDay, setEditDay] = useState(false);
  const [dayDraft, setDayDraft] = useState(recs[0]?.managerDayComment || "");
  const isAdmin =
    currentUser.role === "admin" || currentUser.role === "superadmin";
  const totMins = recs.reduce((s, r) => s + r.minutes, 0);
  const memberDayComment = recs[0]?.dayComment || "";
  const managerDayComment = recs[0]?.managerDayComment || "";
  const userName = recs[0]?.user;
  const userIdForComment = recs[0]?.userId;
  const [editMemberComment, setEditMemberComment] = useState(false);
  const [memberCommentDraft, setMemberCommentDraft] = useState(memberDayComment);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
          {date}
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {recs.length}件 / {totMins}分
        </span>
        {onDuplicate && recs.some((r) => r.user === currentUser.name) && (
          <button
            onClick={() => onDuplicate(recs)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "#3B82F6",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📋 この日を複製
          </button>
        )}
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          marginBottom: 8,
        }}
      >
        {recs.map((rec) => (
          <LogCard
            key={rec.id}
            rec={rec}
            isAdmin={isAdmin}
            canEdit={isAdmin || rec.user === currentUser.name}
            onDelete={onDelete}
            onSaveManagerComment={onSaveManagerComment}
            onEditLog={onEditLog}
            onDuplicateRow={onDuplicate ? (r) => onDuplicate(recs, r) : null}
            onTagClick={onTagClick}
          />
        ))}
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 10,
          }}
        >
          <Icon name="msg" size={13} />
          本日の振り返り・総括
        </div>
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              メンバーの振り返り
            </div>
            {onUpdateMemberComment && memberDayComment && !editMemberComment && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button
                  onClick={() => {
                    setMemberCommentDraft(memberDayComment);
                    setEditMemberComment(true);
                  }}
                  style={{
                    fontSize: 11, color: "#3B82F6", background: "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    padding: "2px 4px",
                  }}
                >
                  編集
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("振り返りコメントを削除しますか？")) {
                      onUpdateMemberComment(date, userName, "", userIdForComment);
                    }
                  }}
                  style={{
                    fontSize: 11, color: "#EF4444", background: "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    padding: "2px 4px",
                  }}
                >
                  削除
                </button>
              </div>
            )}
          </div>
          {editMemberComment ? (
            <div>
              <textarea
                value={memberCommentDraft}
                onChange={(e) => setMemberCommentDraft(e.target.value)}
                style={{
                  width: "100%", minHeight: 80, fontSize: 13, padding: "10px 12px",
                  borderRadius: 8, border: "1px solid #e2e8f0", fontFamily: "inherit",
                  resize: "vertical", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => {
                    onUpdateMemberComment(date, userName, memberCommentDraft, userIdForComment);
                    setEditMemberComment(false);
                  }}
                  style={{
                    fontSize: 12, padding: "5px 14px", borderRadius: 6,
                    border: "none", background: "#3B82F6", color: "#fff",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => setEditMemberComment(false)}
                  style={{
                    fontSize: 12, padding: "5px 14px", borderRadius: 6,
                    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : memberDayComment ? (
            <div
              style={{
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.7,
                background: "#f8fafc",
                padding: "10px 12px",
                borderRadius: 8,
                whiteSpace: "pre-wrap",
              }}
            >
              {memberDayComment}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                background: "#f8fafc",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              （振り返りなし）
            </div>
          )}
        </div>
        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#D97706" }}>
              👑 上司からの総括コメント
            </span>
            {isAdmin && !editDay && (
              <button
                onClick={() => setEditDay(true)}
                style={{
                  fontSize: 11,
                  color: "#D97706",
                  background: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  borderRadius: 5,
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
              >
                {managerDayComment ? "編集" : "総括コメントを追加"}
              </button>
            )}
          </div>
          {editDay ? (
            <div>
              <textarea
                value={dayDraft}
                onChange={(e) => setDayDraft(e.target.value)}
                autoFocus
                rows={3}
                placeholder="この日の業務全体への総括コメントを入力..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: "1px solid #FDE68A",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  background: "#fff",
                  boxSizing: "border-box",
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    onSaveDayComment(date, recs[0]?.user, dayDraft);
                    setEditDay(false);
                  }}
                  style={{
                    padding: "6px 14px",
                    background: "#F59E0B",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setDayDraft(managerDayComment);
                    setEditDay(false);
                  }}
                  style={{
                    padding: "6px 14px",
                    background: "#f1f5f9",
                    color: "#64748b",
                    border: "none",
                    borderRadius: 7,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : managerDayComment ? (
            <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.7 }}>
              {managerDayComment}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#D97706", opacity: 0.5 }}>
              {isAdmin
                ? "（総括コメントを追加できます）"
                : "（上司からの総括コメントはまだありません）"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function CardLogView({
  grouped,
  currentUser,
  onDelete,
  onSaveManagerComment,
  onSaveDayComment,
  onUpdateMemberComment,
  onEditLog,
  onDuplicate,
  onTagClick,
}) {
  const [selectedDate, setSelectedDate] = useState(null);

  // 月別グルーピング
  const monthGroups = useMemo(() => {
    const mg = {};
    Object.entries(grouped).forEach(([date, recs]) => {
      const month = date.slice(0, 7); // YYYY-MM
      if (!mg[month]) mg[month] = [];
      mg[month].push([date, recs]);
    });
    // 日付降順
    Object.values(mg).forEach((arr) =>
      arr.sort((a, b) => b[0].localeCompare(a[0])),
    );
    return Object.entries(mg).sort((a, b) => b[0].localeCompare(a[0]));
  }, [grouped]);

  const selectedRecs = selectedDate ? grouped[selectedDate] : null;

  const handleSelect = (date) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [expandedMonths, setExpandedMonths] = useState(() => new Set([currentMonth]));
  const toggleMonth = (month) => {
    setExpandedMonths((p) => {
      const next = new Set(p);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
          width: selectedDate ? 280 : "100%",
          minWidth: selectedDate ? 280 : "auto",
          flexShrink: 0,
        }}
      >
        {monthGroups.map(([month, dates]) => {
          const isExpanded = expandedMonths.has(month);
          const [y, m] = month.split("-");
          const totalCount = dates.reduce((s, [, recs]) => s + recs.length, 0);
          return (
            <div key={month} style={{ marginBottom: 16 }}>
              <button
                onClick={() => toggleMonth(month)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  marginBottom: isExpanded ? 8 : 0,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                  {y}年{m}月
                </span>
                {!isExpanded && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{totalCount}件</span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  ▼
                </span>
              </button>
              {isExpanded && dates.map(([date, recs]) => (
                <DayCard
                  key={date}
                  date={date}
                  recs={recs}
                  selected={selectedDate === date}
                  compact={!!selectedDate}
                  onClick={() => handleSelect(date)}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: "100%",
          opacity: selectedDate ? 1 : 0,
          transform: selectedDate ? "translateX(0)" : "translateX(20px)",
          transition: "opacity 0.3s 0.1s, transform 0.3s 0.1s",
          pointerEvents: selectedDate ? "auto" : "none",
          display: selectedDate ? "block" : "none",
        }}
      >
        {selectedRecs && (
          <DateGroup
            date={selectedDate}
            recs={selectedRecs}
            currentUser={currentUser}
            onDelete={onDelete}
            onSaveManagerComment={onSaveManagerComment}
            onSaveDayComment={onSaveDayComment}
            onUpdateMemberComment={onUpdateMemberComment}
            onEditLog={onEditLog}
            onDuplicate={onDuplicate}
            onTagClick={onTagClick}
          />
        )}
      </div>
    </div>
  );
}

function DayCard({ date, recs, selected, compact, onClick }) {
  const totMins = recs.reduce((s, r) => s + r.minutes, 0);
  const catMins = {};
  Object.keys(CATEGORIES).forEach((k) => (catMins[k] = 0));
  recs.forEach((r) => {
    if (catMins[r.cat] !== undefined) catMins[r.cat] += r.minutes;
  });
  const dateObj = new Date(date);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const displayDate = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${weekday}）`;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1px solid ${selected ? "#3B82F6" : "#e2e8f0"}`,
        borderRadius: 14,
        padding: compact ? "10px 12px" : "13px 16px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: selected ? "0 2px 8px rgba(59,130,246,0.12)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: compact ? 0 : 7,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <span
            style={{
              fontSize: compact ? 13 : 14,
              fontWeight: 600,
              color: "#1e293b",
              whiteSpace: "nowrap",
            }}
          >
            {displayDate}
          </span>
          {!compact && (
            <span
              style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}
            >
              {recs.length}件 / {Math.floor(totMins / 60)}h
              {totMins % 60 > 0 ? `${totMins % 60}m` : ""}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>▶</span>
      </div>
      {!compact && (
        <>
          <div
            style={{
              display: "flex",
              height: 5,
              borderRadius: 3,
              overflow: "hidden",
              gap: 1,
              marginTop: 6,
            }}
          >
            {Object.entries(CATEGORIES).map(([k, v]) => {
              const w = totMins > 0 ? (catMins[k] / totMins) * 100 : 0;
              return w > 0 ? (
                <div
                  key={k}
                  style={{
                    width: `${w}%`,
                    background: v.color,
                    borderRadius: 3,
                  }}
                />
              ) : null;
            })}
          </div>
          <div
            style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}
          >
            {Object.entries(CATEGORIES)
              .filter(([k]) => catMins[k] > 0)
              .map(([k, v]) => (
                <span key={k} style={{ fontSize: 10, color: v.color }}>
                  {k}: {Math.floor(catMins[k] / 60)}h
                  {catMins[k] % 60 > 0 ? `${catMins[k] % 60}m` : ""}
                </span>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function LogListPage({
  logs,
  currentUser,
  onDelete,
  onSaveManagerComment,
  onSaveDayComment,
  onUpdateMemberComment,
  onEditLog,
  filterUser,
  onDuplicate,
}) {
  const storageKey = `pinnedTags_${currentUser.id}`;
  const targetLogs = filterUser
    ? logs.filter((l) => l.user === filterUser)
    : logs.filter((l) => l.user === currentUser.name);
  const [fd, setFd] = useState("");
  const [fk, setFk] = useState("");
  const [fc, setFc] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedTags, setPinnedTags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });

  const allTags = useMemo(() => {
    const tagSet = new Set();
    targetLogs.forEach((l) => {
      extractTags(l.task).forEach((t) => tagSet.add(t));
      extractTags(l.detail).forEach((t) => tagSet.add(t));
      extractTags(l.dayComment).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [targetLogs]);

  const togglePin = (tag) => {
    setPinnedTags((p) => {
      const next = p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const normalize = (str) =>
    (str || "")
      .normalize("NFKC")
      .replace(/[\u3041-\u3096]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) + 0x60),
      )
      .toLowerCase();

  const filtered = useMemo(
    () =>
      targetLogs
        .filter((l) => !fd || l.date === fd)
        .filter((l) => !fc || l.cat === fc)
        .filter((l) => {
          if (!fk) return true;
          const keyword = normalize(fk);
          return (
            normalize(l.task).includes(keyword) ||
            normalize(l.detail).includes(keyword)
          );
        })
        .filter((l) => {
          if (activeTags.length === 0) return true;
          const tags = [
            ...extractTags(l.task),
            ...extractTags(l.detail),
            ...extractTags(l.dayComment),
          ];
          return activeTags.every((at) => tags.includes(at));
        })
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            (a.start || "").localeCompare(b.start || ""),
        ),
    [targetLogs, fd, fc, fk, activeTags],
  );
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((l) => {
      if (!g[l.date]) g[l.date] = [];
      g[l.date].push(l);
    });
    return g;
  }, [filtered]);

  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("logViewMode") || "list",
  );
  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("logViewMode", mode);
  };

  // 当月以外を月単位で折りたたむための処理（リスト表示用）
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthGroupedForList = useMemo(() => {
    const mg = {};
    Object.entries(grouped).forEach(([date, recs]) => {
      const month = date.slice(0, 7);
      if (!mg[month]) mg[month] = [];
      mg[month].push([date, recs]);
    });
    Object.values(mg).forEach((arr) => arr.sort((a, b) => b[0].localeCompare(a[0])));
    return Object.entries(mg).sort((a, b) => b[0].localeCompare(a[0]));
  }, [grouped]);
  const [expandedMonths, setExpandedMonths] = useState(() => new Set([currentMonth]));
  const toggleMonth = (month) => {
    setExpandedMonths((p) => {
      const next = new Set(p);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  return (
    <div>
      {filterUser && (
        <div
          style={{
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: "#92400E",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>👑</span>
          各業務行をクリックして展開すると、コメント・総括コメントを入力できます。
        </div>
      )}
      <div
        style={{
          ...C,
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={fk}
          onChange={(e) => setFk(e.target.value)}
          placeholder="🔍 キーワード検索..."
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            outline: "none",
            minWidth: 200,
          }}
        />
        <input
          type="date"
          value={fd}
          onChange={(e) => setFd(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            outline: "none",
          }}
        />
        <select
          value={fc}
          onChange={(e) => setFc(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            outline: "none",
          }}
        >
          <option value="">全区分</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {k}: {v.label}
            </option>
          ))}
        </select>
        {(fd || fc || fk || activeTags.length > 0) && (
          <button
            onClick={() => {
              setFd("");
              setFc("");
              setFk("");
              setActiveTags([]);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: 13,
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            リセット
          </button>
        )}
        <div
          style={{
            marginLeft: "auto",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <b style={{ color: "#1e293b" }}>{filtered.length}件</b>
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "#f1f5f9",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {[
              ["list", "📋 リスト"],
              ["card", "🗂 カード"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => changeViewMode(id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: viewMode === id ? 600 : 400,
                  fontFamily: "inherit",
                  background: viewMode === id ? "#fff" : "transparent",
                  color: viewMode === id ? "#1e293b" : "#64748b",
                  boxShadow:
                    viewMode === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {allTags.length > 0 && (
        <div style={{ ...C, marginBottom: 16, padding: "12px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              🏷 タグ
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              タグをクリックで絞り込み・右クリックでピン留め
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {/* ピン留めタグを先に表示 */}
            {pinnedTags
              .filter((t) => allTags.includes(t))
              .map((tag) => {
                const isActive = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setActiveTags((p) =>
                        isActive ? p.filter((t) => t !== tag) : [...p, tag],
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      togglePin(tag);
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: "1px solid",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      borderColor: isActive ? "#8B5CF6" : "#DDD6FE",
                      background: isActive ? "#8B5CF6" : "#F5F3FF",
                      color: isActive ? "#fff" : "#6D28D9",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    📌 #{tag}
                  </button>
                );
              })}
            {/* 通常タグ */}
            {allTags
              .filter((t) => !pinnedTags.includes(t))
              .map((tag) => {
                const isActive = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setActiveTags((p) =>
                        isActive ? p.filter((t) => t !== tag) : [...p, tag],
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      togglePin(tag);
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: "1px solid",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      borderColor: isActive ? "#3B82F6" : "#e2e8f0",
                      background: isActive ? "#3B82F6" : "#f8fafc",
                      color: isActive ? "#fff" : "#64748b",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
          </div>
          {activeTags.length > 0 && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              {activeTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "#F5F3FF",
                    color: "#6D28D9",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </span>
              ))}
              <span style={{ marginLeft: 4 }}>
                すべて含む（AND） · {filtered.length}件
              </span>
            </div>
          )}
        </div>
      )}
      {Object.keys(grouped).length === 0 ? (
        <div
          style={{
            ...C,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
            padding: 48,
          }}
        >
          記録がありません
        </div>
      ) : viewMode === "card" ? (
        <CardLogView
          grouped={grouped}
          currentUser={currentUser}
          onDelete={onDelete}
          onSaveManagerComment={onSaveManagerComment}
          onSaveDayComment={onSaveDayComment}
          onUpdateMemberComment={onUpdateMemberComment}
          onEditLog={onEditLog}
          onDuplicate={onDuplicate}
          onTagClick={(tag) =>
            setActiveTags((p) => (p.includes(tag) ? p : [...p, tag]))
          }
        />
      ) : (
        monthGroupedForList.map(([month, dateEntries]) => {
          const isExpanded = expandedMonths.has(month);
          const [y, m] = month.split("-");
          const totalCount = dateEntries.reduce((s, [, recs]) => s + recs.length, 0);
          return (
            <div key={month} style={{ marginBottom: 16 }}>
              <button
                onClick={() => toggleMonth(month)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  marginBottom: isExpanded ? 10 : 0,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  {y}年{m}月
                </span>
                {!isExpanded && (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{totalCount}件</span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  ▼
                </span>
              </button>
              {isExpanded && dateEntries.map(([date, recs]) => (
                <DateGroup
                  key={date}
                  date={date}
                  recs={recs}
                  currentUser={currentUser}
                  onDelete={onDelete}
                  onSaveManagerComment={onSaveManagerComment}
                  onSaveDayComment={onSaveDayComment}
                  onUpdateMemberComment={onUpdateMemberComment}
                  onEditLog={onEditLog}
                  onDuplicate={onDuplicate}
                  onTagClick={(tag) => setActiveTags((p) => p.includes(tag) ? p : [...p, tag])}
                />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

function TeamPage({ logs, users, currentUser, groups, onSelectMember }) {
  const isSA = currentUser.role === "superadmin";
  const myGroupId = currentUser.groupId;
  const members = users.filter((u) => {
    if (u.role === "superadmin") return false;
    if (u.id === currentUser.id) return false;
    if (isSA) return true;
    return String(u.groupId) === String(myGroupId) && u.role === "member";
  });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
        gap: 16,
      }}
    >
      {members.map((member) => {
        const ml = logs.filter((l) => l.user === member.name);
        const totalMin = ml.reduce((s, l) => s + l.minutes, 0);
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const recentCount = ml.filter((l) => new Date(l.date) >= since).length;
        const catCount = {};
        Object.keys(CATEGORIES).forEach((k) => (catCount[k] = 0));
        ml.forEach((l) => {
          if (catCount[l.cat] !== undefined) catCount[l.cat]++;
        });
        const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
        const g = groups.find((g) => g.id === member.groupId);
        return (
          <div
            key={member.id}
            onClick={() => onSelectMember(member)}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(59,130,246,0.15)";
              e.currentTarget.style.borderColor = "#BFDBFE";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {member.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}
                >
                  {member.name}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {g ? g.name : ""}
                </div>
              </div>
              <Icon name="eye" size={16} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {[
                ["総件数", `${ml.length}件`, "#3B82F6"],
                [
                  "総時間",
                  `${Math.round((totalMin / 60) * 10) / 10}h`,
                  "#8B5CF6",
                ],
                ["直近30日", `${recentCount}件`, "#10B981"],
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    borderRadius: 10,
                    padding: "10px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: s[2] }}>
                    {s[1]}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    {s[0]}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                height: 6,
                borderRadius: 3,
                overflow: "hidden",
                gap: 1,
                marginBottom: 6,
              }}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => {
                const w = ml.length > 0 ? (catCount[k] / ml.length) * 100 : 0;
                return w > 0 ? (
                  <div
                    key={k}
                    style={{
                      width: `${w}%`,
                      background: v.color,
                      opacity: 0.8,
                    }}
                  />
                ) : null;
              })}
            </div>
            {topCat && topCat[1] > 0 && (
              <div style={{ fontSize: 11, color: "#64748b" }}>
                最多:{" "}
                <span
                  style={{
                    color: CATEGORIES[topCat[0]].color,
                    fontWeight: 600,
                  }}
                >
                  {topCat[0]}: {CATEGORIES[topCat[0]].label}
                </span>
                <span style={{ color: "#94a3b8", marginLeft: 8 }}>
                  詳細を見る →
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MemberDetailPage({
  member,
  logs,
  currentUser,
  onBack,
  onSaveManagerComment,
  onSaveDayComment,
}) {
  const memberLogs = logs.filter((l) => l.user === member.name);
  const [tab, setTab] = useState("dashboard");
  return (
    <div>
      <div
        style={{
          ...C,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 13,
            color: "#64748b",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#EFF6FF";
            e.currentTarget.style.color = "#3B82F6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <Icon name="back" size={16} />
          メンバー一覧に戻る
        </button>
        <div style={{ width: 1, height: 32, background: "#e2e8f0" }} />
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {member.name[0]}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            {member.name} の記録
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            総 {memberLogs.length}件
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: "#fff",
          borderRadius: 12,
          padding: 6,
          border: "1px solid #e2e8f0",
          width: "fit-content",
        }}
      >
        {[
          ["dashboard", "📊 ダッシュボード"],
          ["log", "💬 記録一覧・コメント入力"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              background: tab === id ? "#3B82F6" : "transparent",
              color: tab === id ? "#fff" : "#64748b",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "dashboard" && (
        <SummaryPanel logs={memberLogs} subtitle={member.name} />
      )}
      {tab === "log" && (
        <LogListPage
          logs={logs}
          currentUser={currentUser}
          onDelete={() => {}}
          onSaveManagerComment={onSaveManagerComment}
          onSaveDayComment={onSaveDayComment}
          onEditLog={() => {}}
          filterUser={member.name}
        />
      )}
    </div>
  );
}

function CardModal({ card, isOwner, currentUser, onClose, onSave, onDelete }) {
  const isNew = !card?.id;
  const [title, setTitle] = useState(card?.title || "");
  const [desc, setDesc] = useState(card?.desc || "");
  const [prio, setPrio] = useState(card?.prio || "mid");
  const [due, setDue] = useState(card?.due || "");
  const [comments, setComments] = useState(card?.comments || []);
  const [newCmt, setNewCmt] = useState("");
  const pm = {
    high: { bg: "#FEF2F2", c: "#991B1B", l: "🔴 高" },
    mid: { bg: "#FFFBEB", c: "#92400E", l: "🟡 中" },
    low: { bg: "#F0FDF4", c: "#166534", l: "🟢 低" },
  };
  const addCmt = () => {
    if (!newCmt.trim()) return;
    setComments((p) => [
      ...p,
      {
        id: Date.now(),
        author: currentUser.name,
        text: newCmt.trim(),
        at: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewCmt("");
  };
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ ...card, title: title.trim(), desc, prio, due, comments });
      onClose();
    } catch (e) {
      console.error("カード保存エラー:", e);
      alert("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        fontFamily: "inherit",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: 28,
          width: 520,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflow: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            {isNew ? "タスクを追加" : isOwner ? "タスクを編集" : "タスクを閲覧"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              padding: 4,
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {isOwner ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                タイトル <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タスクのタイトル"
                style={I}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                説明
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="詳細・メモ（任意）"
                rows={3}
                style={{
                  ...I,
                  resize: "vertical",
                  minHeight: 72,
                  lineHeight: 1.6,
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  優先度
                </label>
                <select
                  value={prio}
                  onChange={(e) => setPrio(e.target.value)}
                  style={I}
                >
                  <option value="high">🔴 高</option>
                  <option value="mid">🟡 中</option>
                  <option value="low">🟢 低</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  期日
                </label>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  style={I}
                />
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              {card?.title}
            </div>
            {card?.desc && (
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 1.6,
                }}
              >
                {card.desc}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: pm[card?.prio || "mid"].bg,
                  color: pm[card?.prio || "mid"].c,
                  fontWeight: 600,
                }}
              >
                {pm[card?.prio || "mid"].l}
              </span>
              {card?.due && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    fontWeight: 600,
                  }}
                >
                  📅 {card.due}
                </span>
              )}
            </div>
          </div>
        )}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            💬 コメント（{comments.length}件）
          </div>
          {comments.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background:
                      c.author === currentUser.name ? "#EFF6FF" : "#f8fafc",
                    borderRadius: 10,
                    padding: "10px 12px",
                    border: `1px solid ${c.author === currentUser.name ? "#BFDBFE" : "#e2e8f0"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      {c.author}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {c.at}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#374151",
                      lineHeight: 1.6,
                    }}
                  >
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newCmt}
              onChange={(e) => setNewCmt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addCmt()}
              placeholder="コメントを追加（Enter で送信）..."
              style={{ ...I, flex: 1 }}
            />
            <button
              onClick={addCmt}
              disabled={!newCmt.trim()}
              style={{
                ...BP,
                padding: "9px 14px",
                opacity: newCmt.trim() ? 1 : 0.4,
              }}
            >
              <Icon name="msg" size={14} />
            </button>
          </div>
        </div>
        {isOwner ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div>
              {!isNew && (
                <button
                  onClick={() => {
                    onDelete(card.id);
                    onClose();
                  }}
                  style={{ ...BB, color: "#EF4444", borderColor: "#FECACA" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#FEF2F2")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                  }
                >
                  <Icon name="trash" size={14} />
                  削除
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={BB}>
                キャンセル
              </button>
              <button
                onClick={save}
                disabled={!title.trim() || saving}
                style={{ ...BP, opacity: title.trim() && !saving ? 1 : 0.4 }}
              >
                <Icon name="save" size={14} />
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <button onClick={onClose} style={BB}>
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ card, isOwner, onOpen, onDragStart }) {
  const today = new Date().toISOString().split("T")[0];
  const dc = !card.due
    ? "ok"
    : card.due < today
      ? "over"
      : card.due <= addDays(3)
        ? "near"
        : "ok";
  const pc = { high: "#EF4444", mid: "#F59E0B", low: "#10B981" };
  const pl = { high: "高", mid: "中", low: "低" };
  const isUrgent = dc === "over" || dc === "near";
  return (
    <div
      draggable={isOwner}
      onDragStart={(e) => {
        e.dataTransfer.setData("cardId", String(card.id));
        e.dataTransfer.effectAllowed = "move";
        if (onDragStart) onDragStart(card.id);
      }}
      onClick={() => onOpen(card)}
      style={{
        background:
          dc === "over" ? "#FEF2F2" : dc === "near" ? "#FFFBEB" : "#fff",
        borderRadius: 12,
        border: `1px solid ${dc === "over" ? "#FECACA" : dc === "near" ? "#FDE68A" : "#e2e8f0"}`,
        padding: "12px 14px",
        cursor: isOwner ? "grab" : "pointer",
        transition: "all 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        if (!isUrgent) e.currentTarget.style.borderColor = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        if (!isUrgent) e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: pc[card.prio],
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1e293b",
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {card.title}
        </span>
      </div>
      {card.desc && (
        <p
          style={{
            margin: "0 0 8px 14px",
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.desc}
        </p>
      )}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
          paddingLeft: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            padding: "2px 7px",
            borderRadius: 8,
            background: pc[card.prio] + "18",
            color: pc[card.prio],
            fontWeight: 600,
          }}
        >
          {pl[card.prio]}
        </span>
        {card.due && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 8,
              fontWeight: 500,
              background:
                dc === "over"
                  ? "#FEF2F2"
                  : dc === "near"
                    ? "#FFFBEB"
                    : "#f1f5f9",
              color:
                dc === "over"
                  ? "#991B1B"
                  : dc === "near"
                    ? "#92400E"
                    : "#64748b",
            }}
          >
            📅 {card.due}
          </span>
        )}
        {card.comments?.length > 0 && (
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
            💬 {card.comments.length}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  col,
  cards,
  isOwner,
  onAddCard,
  onOpenCard,
  onDrop,
  onDeleteCol,
  sortValue,
  onSortChange,
}) {
  const [over, setOver] = useState(false);
  const cc = { todo: "#64748b", prog: "#3B82F6", done: "#10B981" };
  const color = cc[col.id] || "#8B5CF6";
  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        background: "#f8fafc",
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 280px)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(e.dataTransfer.getData("cardId"));
        if (id) onDrop(id, col.id);
        setOver(false);
      }}
    >
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
          }}
        />
        <span
          style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", flex: 1 }}
        >
          {col.name}
        </span>
        <select
          value={sortValue || ""}
          onChange={(e) => onSortChange(col.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 11,
            color: "#64748b",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "2px 4px",
            background: "#fff",
            outline: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <option value="">並び替え</option>
          <option value="prio">優先度順</option>
          <option value="due">期日順</option>
        </select>
        <span
          style={{
            fontSize: 12,
            color: "#94a3b8",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            padding: "1px 8px",
          }}
        >
          {cards.length}
        </span>
        {isOwner && !["todo", "prog", "done"].includes(col.id) && (
          <button
            onClick={() => onDeleteCol(col.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#EF4444",
              padding: "2px 4px",
              borderRadius: 4,
              display: "flex",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#991B1B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#EF4444")}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: over ? "#EFF6FF" : "transparent",
          transition: "background 0.15s",
          minHeight: 60,
        }}
      >
        {cards.map((c) => (
          <KanbanCard
            key={c.id}
            card={c}
            isOwner={isOwner}
            onOpen={onOpenCard}
          />
        ))}
        {over && (
          <div
            style={{
              height: 56,
              borderRadius: 10,
              border: "2px dashed #93C5FD",
              background: "#DBEAFE",
              flexShrink: 0,
            }}
          />
        )}
      </div>
      {isOwner && (
        <button
          onClick={() => onAddCard(col.id)}
          style={{
            margin: "8px 10px 10px",
            padding: "8px",
            border: "1px dashed #cbd5e1",
            borderRadius: 10,
            background: "transparent",
            color: "#94a3b8",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#3B82F6";
            e.currentTarget.style.color = "#3B82F6";
            e.currentTarget.style.background = "#EFF6FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Icon name="plus" size={14} />
          タスクを追加
        </button>
      )}
    </div>
  );
}

function BoardPage({ currentUser, allUsers, groups, boards, setBoards }) {
  const myGroup = groups.find((g) => g.id === currentUser.groupId);
  const groupMembers = allUsers.filter(
    (u) =>
      String(u.groupId) === String(currentUser.groupId) &&
      u.role !== "superadmin" &&
      u.id !== currentUser.id,
  );
  const [viewId, setViewId] = useState(currentUser.id);
  const [modal, setModal] = useState(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [filterPrio, setFilterPrio] = useState("");
  const [colSortBy, setColSortBy] = useState(() => {
    try { return JSON.parse(localStorage.getItem("todoColSortBy") || "{}"); }
    catch { return {}; }
  });
  const updateColSortBy = (updater) => {
    setColSortBy((p) => {
      const next = typeof updater === "function" ? updater(p) : updater;
      localStorage.setItem("todoColSortBy", JSON.stringify(next));
      return next;
    });
  };
  const isOwner = viewId === currentUser.id;
  const viewUser = allUsers.find((u) => u.id === viewId);
  const board = boards[viewId] || { cols: [], cards: [] };
  const visibleCards = useMemo(
    () => board.cards.filter((c) => !filterPrio || c.prio === filterPrio),
    [board.cards, filterPrio],
  );
  const sortCards = (cards, sortBy) => {
    if (sortBy === "prio") {
      const order = { high: 0, mid: 1, low: 2 };
      return [...cards].sort(
        (a, b) => (order[a.prio] ?? 99) - (order[b.prio] ?? 99),
      );
    }
    if (sortBy === "due") {
      return [...cards].sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      });
    }
    return cards;
  };
  const colCards = (cId) =>
    sortCards(
      visibleCards.filter((c) => c.col === cId),
      colSortBy[cId] || "",
    );
  const totalByStatus = useMemo(() => {
    const all = Object.entries(boards)
      .filter(([uid]) =>
        allUsers.find(
          (u) =>
            String(u.id) === String(uid) &&
            String(u.groupId) === String(currentUser.groupId),
        ),
      )
      .flatMap(([, b]) => b.cards);
    return {
      todo: all.filter((c) => c.col === "todo").length,
      prog: all.filter((c) => c.col === "prog").length,
      done: all.filter((c) => c.col === "done").length,
      total: all.length,
    };
  }, [boards, allUsers, currentUser.groupId]);
  const handleDrop = async (cardId, newColId) => {
    if (!isOwner) return;

    // 先にUIを更新（即時反映）
    setBoards((p) => ({
      ...p,
      [viewId]: {
        ...board,
        cards: board.cards.map((c) =>
          c.id === cardId ? { ...c, col: newColId } : c,
        ),
      },
    }));

    // その後DBに保存
    await supabase
      .from("kanban_cards")
      .update({ col: newColId })
      .eq("id", cardId);
  };
  const handleSave = async (updated) => {
    if (!updated.id) {
      const { data, error } = await supabase
        .from("kanban_cards")
        .insert({
          user_id: currentUser.id,
          col: updated.col,
          title: updated.title,
          description: updated.desc,
          prio: updated.prio,
          due: updated.due,
          comments: updated.comments,
        })
        .select()
        .single();
      if (!error && data) {
        setBoards((p) => ({
          ...p,
          [viewId]: {
            ...p[viewId],
            cards: [...(p[viewId]?.cards || []), { ...updated, id: data.id }],
          },
        }));
      }
    } else {
      const { error } = await supabase
        .from("kanban_cards")
        .update({
          col: updated.col,
          title: updated.title,
          description: updated.desc,
          prio: updated.prio,
          due: updated.due,
          comments: updated.comments,
        })
        .eq("id", updated.id);
      if (!error) {
        setBoards((p) => ({
          ...p,
          [viewId]: {
            ...p[viewId],
            cards: (p[viewId]?.cards || []).map((c) =>
              c.id === updated.id ? updated : c,
            ),
          },
        }));
      }
    }
  };
  const handleDelete = async (id) => {
    const { error } = await supabase.from("kanban_cards").delete().eq("id", id);
    if (!error) {
      setBoards((p) => ({
        ...p,
        [viewId]: {
          ...board,
          cards: board.cards.filter((c) => c.id !== id),
        },
      }));
    }
  };
  const handleAddCol = async () => {
    if (!newColName.trim()) return;
    const newColId = `col_${Date.now()}`;
    const { error } = await supabase.from("kanban_cols").insert({
      user_id: currentUser.id,
      col_id: newColId,
      name: newColName.trim(),
      position: board.cols.length,
    });
    if (!error) {
      setBoards((p) => ({
        ...p,
        [viewId]: {
          ...board,
          cols: [...board.cols, { id: newColId, name: newColName.trim() }],
        },
      }));
    }
    setNewColName("");
    setAddingCol(false);
  };
  const handleDeleteCol = async (colId) => {
    if (
      !window.confirm("このカラムを削除しますか？カードも一緒に削除されます。")
    )
      return;

    // カラム内のカードを削除
    await supabase
      .from("kanban_cards")
      .delete()
      .eq("col", colId)
      .eq("user_id", currentUser.id);

    // カラムを削除
    await supabase
      .from("kanban_cols")
      .delete()
      .eq("col_id", colId)
      .eq("user_id", currentUser.id);

    setBoards((p) => ({
      ...p,
      [viewId]: {
        ...board,
        cols: board.cols.filter((c) => c.id !== colId),
        cards: board.cards.filter((c) => c.col !== colId),
      },
    }));
  };
  return (
    <div>
      <div
        style={{
          ...C,
          marginBottom: 20,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 2,
            }}
          >
            {myGroup?.name || "全社"} — タスクサマリー
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            グループ全体の進捗
          </div>
        </div>
        {[
          ["未着手", totalByStatus.todo, "#64748b"],
          ["進行中", totalByStatus.prog, "#3B82F6"],
          ["完了", totalByStatus.done, "#10B981"],
          ["合計", totalByStatus.total, "#1e293b"],
        ].map(([l, v, c]) => (
          <div
            key={l}
            style={{
              textAlign: "center",
              padding: "10px 18px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {l}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
          ToDoリストを選択：
        </span>
        <button
          onClick={() => setViewId(currentUser.id)}
          style={{
            ...BB,
            background: viewId === currentUser.id ? "#1e293b" : "#fff",
            color: viewId === currentUser.id ? "#fff" : "#64748b",
            borderColor: viewId === currentUser.id ? "#1e293b" : "#e2e8f0",
            fontSize: 12,
            padding: "6px 14px",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {currentUser.name[0]}
          </div>
          マイToDo
        </button>
        {groupMembers.map((m) => (
          <button
            key={m.id}
            onClick={() => setViewId(m.id)}
            style={{
              ...BB,
              background: viewId === m.id ? "#EFF6FF" : "#fff",
              color: viewId === m.id ? "#1D4ED8" : "#64748b",
              borderColor: viewId === m.id ? "#BFDBFE" : "#e2e8f0",
              fontSize: 12,
              padding: "6px 14px",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#06B6D4,#3B82F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {m.name[0]}
            </div>
            {m.name}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              {isOwner ? "マイToDo" : `${viewUser?.name} のToDoリスト`}
            </h2>
            {!isOwner && (
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "#FEF3C7",
                  color: "#92400E",
                  border: "1px solid #FDE68A",
                  fontWeight: 600,
                }}
              >
                閲覧・コメントのみ
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            {isOwner
              ? "ドラッグでカードを移動 / クリックで編集"
              : "クリックしてコメントを追加できます"}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <select
            value={filterPrio}
            onChange={(e) => setFilterPrio(e.target.value)}
            style={{ ...I, width: "auto", padding: "7px 12px" }}
          >
            <option value="">優先度：すべて</option>
            <option value="high">🔴 高</option>
            <option value="mid">🟡 中</option>
            <option value="low">🟢 低</option>
          </select>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
          alignItems: "flex-start",
        }}
      >
        {board.cols.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            cards={colCards(col.id)}
            isOwner={isOwner}
            sortValue={colSortBy[col.id]}
            onSortChange={(colId, val) => updateColSortBy((p) => ({ ...p, [colId]: val }))}
            onAddCard={(cId) =>
              setModal({
                card: {
                  col: cId,
                  title: "",
                  desc: "",
                  prio: "mid",
                  due: "",
                  comments: [],
                },
                colId: cId,
              })
            }
            onOpenCard={(c) => setModal({ card: c, colId: c.col })}
            onDrop={handleDrop}
            onDeleteCol={handleDeleteCol}
          />
        ))}
        {isOwner &&
          (addingCol ? (
            <div
              style={{
                width: 280,
                flexShrink: 0,
                background: "#f8fafc",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                padding: 14,
                alignSelf: "flex-start",
              }}
            >
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="カラム名を入力"
                autoFocus
                style={{ ...I, marginBottom: 10 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCol();
                  if (e.key === "Escape") setAddingCol(false);
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddCol} style={BP}>
                  <Icon name="check" size={14} />
                  追加
                </button>
                <button onClick={() => setAddingCol(false)} style={BB}>
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              style={{
                width: 220,
                flexShrink: 0,
                padding: 14,
                border: "1.5px dashed #cbd5e1",
                borderRadius: 14,
                background: "transparent",
                color: "#94a3b8",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                alignSelf: "flex-start",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3B82F6";
                e.currentTarget.style.color = "#3B82F6";
                e.currentTarget.style.background = "#EFF6FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon name="plus" size={16} />
              カラムを追加
            </button>
          ))}
      </div>
      {modal && (
        <CardModal
          card={modal.card}
          isOwner={isOwner}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSave={(c) => handleSave({ ...c, col: modal.colId })}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function AIReferenceManager({ currentUser, teamMembers }) {
  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id || "");
  const member = teamMembers.find((m) => m.id === selectedMemberId);
  const [settings, setSettings] = useState({
    ai_reference_enabled: false,
    ai_reference_level: "standard",
    use_action_plan: true,
    use_challenge_sheet: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [directions, setDirections] = useState([]);
  const [newDirection, setNewDirection] = useState("");
  const [postingDirection, setPostingDirection] = useState(false);
  const [refDocs, setRefDocs] = useState([]);
  const [refFile, setRefFile] = useState(null);
  const [refReason, setRefReason] = useState("");
  const [uploadingRef, setUploadingRef] = useState(false);

  useEffect(() => {
    if (!member) return;
    setSettings({
      ai_reference_enabled: !!member.ai_reference_enabled,
      ai_reference_level: member.ai_reference_level || "standard",
      use_action_plan: member.use_action_plan ?? true,
      use_challenge_sheet: member.use_challenge_sheet ?? true,
    });
  }, [selectedMemberId]);

  useEffect(() => {
    if (!selectedMemberId) return;
    const fetchData = async () => {
      const { data: dirs } = await supabase
        .from("manager_directions")
        .select("*")
        .eq("target_user_id", selectedMemberId)
        .order("created_at", { ascending: false });
      setDirections(dirs || []);
      const { data: docs } = await supabase
        .from("reference_documents")
        .select("*")
        .eq("target_user_id", selectedMemberId)
        .order("created_at", { ascending: false });
      setRefDocs(docs || []);
    };
    fetchData();
  }, [selectedMemberId]);

  const handleSaveSettings = async () => {
    if (!selectedMemberId) return;
    setSavingSettings(true);
    setSettingsMsg("");
    const { error } = await supabase
      .from("profiles")
      .update(settings)
      .eq("id", selectedMemberId);
    if (!error) {
      setSettingsMsg("保存しました！");
    } else {
      setSettingsMsg("失敗しました: " + error.message);
    }
    setSavingSettings(false);
    setTimeout(() => setSettingsMsg(""), 3000);
  };

  const handlePostDirection = async () => {
    if (!newDirection.trim() || !selectedMemberId) return;
    setPostingDirection(true);
    const { data, error } = await supabase
      .from("manager_directions")
      .insert({
        target_user_id: selectedMemberId,
        manager_id: currentUser.id,
        content: newDirection.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setDirections((p) => [data, ...p]);
      setNewDirection("");
    }
    setPostingDirection(false);
  };

  const handleDeleteDirection = async (id) => {
    if (!window.confirm("この内容を削除しますか？")) return;
    const { error } = await supabase.from("manager_directions").delete().eq("id", id);
    if (!error) setDirections((p) => p.filter((d) => d.id !== id));
  };

  const handleUploadRef = async () => {
    if (!refFile || !selectedMemberId) return;
    setUploadingRef(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", refFile);
      formData.append("doc_type", "reference");
      formData.append("target_user_id", selectedMemberId);
      formData.append("uploaded_by", currentUser.id);
      formData.append("reason", refReason);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-excel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        },
      );
      const result = await res.json();
      if (result.success) {
        const { data: docs } = await supabase
          .from("reference_documents")
          .select("*")
          .eq("target_user_id", selectedMemberId)
          .order("created_at", { ascending: false });
        setRefDocs(docs || []);
        setRefFile(null);
        setRefReason("");
      } else {
        alert("アップロードに失敗しました: " + (result.error || "不明なエラー"));
      }
    } catch (e) {
      alert("アップロードに失敗しました: " + e.message);
    } finally {
      setUploadingRef(false);
    }
  };

  const toggleRefDocActive = async (doc) => {
    const { error } = await supabase
      .from("reference_documents")
      .update({ is_active: !doc.is_active })
      .eq("id", doc.id);
    if (!error) {
      setRefDocs((p) => p.map((d) => (d.id === doc.id ? { ...d, is_active: !d.is_active } : d)));
    }
  };

  const deleteRefDoc = async (id) => {
    if (!window.confirm("この資料を削除しますか？")) return;
    const { error } = await supabase.from("reference_documents").delete().eq("id", id);
    if (!error) setRefDocs((p) => p.filter((d) => d.id !== id));
  };

  if (teamMembers.length === 0) return null;

  return (
    <div style={{ ...C, marginBottom: 16 }}>
      <h3
        style={{
          margin: "0 0 4px",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-primary, #1e293b)",
        }}
      >
        部下のAIレポート参考資料 設定
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8" }}>
        部下ごとに、レポート生成時の参考情報の使用可否を設定できます
      </p>

      <select
        value={selectedMemberId}
        onChange={(e) => setSelectedMemberId(e.target.value)}
        style={{ ...I, width: "auto", marginBottom: 16 }}
      >
        {teamMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {member && (
        <>
          {/* ON/OFF・重さ設定 */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>参考情報を使用する</span>
              <button
                onClick={() => setSettings((p) => ({ ...p, ai_reference_enabled: !p.ai_reference_enabled }))}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                  background: settings.ai_reference_enabled ? "#3B82F6" : "#cbd5e1",
                  position: "relative", transition: "background 0.2s",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2, left: settings.ai_reference_enabled ? 20 : 2,
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            {settings.ai_reference_enabled && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>プロンプトの重さ</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      ["light", "軽め"],
                      ["standard", "標準"],
                      ["strong", "しっかり"],
                    ].map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => setSettings((p) => ({ ...p, ai_reference_level: v }))}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: "1px solid",
                          borderColor: settings.ai_reference_level === v ? "#3B82F6" : "#e2e8f0",
                          background: settings.ai_reference_level === v ? "#EFF6FF" : "#fff",
                          color: settings.ai_reference_level === v ? "#1D4ED8" : "#64748b",
                          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={settings.use_action_plan}
                      onChange={(e) => setSettings((p) => ({ ...p, use_action_plan: e.target.checked }))}
                    />
                    実行計画書を使う
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={settings.use_challenge_sheet}
                      onChange={(e) => setSettings((p) => ({ ...p, use_challenge_sheet: e.target.checked }))}
                    />
                    チャレンジシートを使う
                  </label>
                </div>
              </>
            )}

            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={handleSaveSettings} disabled={savingSettings} style={{ ...BP, fontSize: 12, padding: "6px 14px", opacity: savingSettings ? 0.6 : 1 }}>
                {savingSettings ? "保存中..." : "設定を保存"}
              </button>
              {settingsMsg && <span style={{ fontSize: 12, color: "#15803D" }}>{settingsMsg}</span>}
            </div>
          </div>

          {/* 上司から部下への期待 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
              {member.name} さんへの期待・ディレクション
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={newDirection}
                onChange={(e) => setNewDirection(e.target.value)}
                placeholder="例：新規開拓よりも既存顧客のフォローを優先してほしい"
                style={{ ...I, flex: 1 }}
                onKeyDown={(e) => e.key === "Enter" && handlePostDirection()}
              />
              <button onClick={handlePostDirection} disabled={postingDirection || !newDirection.trim()} style={{ ...BP, fontSize: 12, padding: "8px 16px", opacity: newDirection.trim() ? 1 : 0.4 }}>
                追加
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {directions.length === 0 && (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>まだ記録がありません</div>
              )}
              {directions.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#475569" }}>{d.content}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                      {new Date(d.created_at).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteDirection(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", flexShrink: 0 }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* その他資料 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
              その他参考資料
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setRefFile(e.target.files?.[0] || null)}
                style={{ fontSize: 12 }}
              />
              <input
                value={refReason}
                onChange={(e) => setRefReason(e.target.value)}
                placeholder="この資料を使う理由（例：来期の新商品リスト。提案時に意識してほしい）"
                style={I}
              />
              <button
                onClick={handleUploadRef}
                disabled={!refFile || uploadingRef}
                style={{ ...BP, fontSize: 12, padding: "7px 14px", opacity: refFile ? 1 : 0.4, alignSelf: "flex-start" }}
              >
                {uploadingRef ? "アップロード中..." : "アップロード"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {refDocs.length === 0 && (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>まだ資料がありません</div>
              )}
              {refDocs.map((doc) => (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                  <button
                    onClick={() => toggleRefDocActive(doc)}
                    style={{
                      width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", flexShrink: 0,
                      background: doc.is_active ? "#3B82F6" : "#cbd5e1", position: "relative",
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: doc.is_active ? 16 : 2 }} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.filename}
                    </div>
                    {doc.reason && (
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.reason}</div>
                    )}
                  </div>
                  <button onClick={() => deleteRefDoc(doc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", flexShrink: 0 }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MyPage({
  currentUser,
  allUsers,
  groups,
  isSA,
  onUpdateUser,
  darkMode,
  setDarkMode,
  accentColor,
  setAccentColor,
}) {
  const isAdmin = currentUser.role === "admin" || isSA;
  const [name, setName] = useState(currentUser.name);
  const [newPassword, setNewPassword] = useState("");
  const [managerId, setManagerId] = useState(currentUser.manager_id || "");
  const [groupId, setGroupId] = useState(currentUser.group_id || "");
  const [role, setRole] = useState(currentUser.role || "member");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState({ mode: "scheduled", day_of_week: 1, time_of_day: "06:00" });
  const [monthlySchedule, setMonthlySchedule] = useState({ mode: "scheduled", day_of_month: 1, time_of_day: "06:00" });
  const [scheduleOk, setScheduleOk] = useState("");
  const [challengeSheetInfo, setChallengeSheetInfo] = useState({
    filename: currentUser.challenge_sheet_filename || "",
    updatedAt: currentUser.challenge_sheet_updated_at || "",
  });
  const [uploadingChallengeSheet, setUploadingChallengeSheet] = useState(false);
  const [challengeSheetMsg, setChallengeSheetMsg] = useState("");
  const [actionPlanInfo, setActionPlanInfo] = useState({ filename: "", updatedAt: "" });
  const [uploadingActionPlan, setUploadingActionPlan] = useState(false);
  const [actionPlanMsg, setActionPlanMsg] = useState("");

  useEffect(() => {
    if (!isAdmin && !isSA) return;
    const g = groups.find((g) => String(g.id) === String(groupId));
    if (g) {
      setActionPlanInfo({
        filename: g.action_plan_filename || "",
        updatedAt: g.action_plan_updated_at || "",
      });
    }
  }, [groupId, groups]);
  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      if (data) {
        setManagerId(data.manager_id || "");
        setGroupId(data.group_id || "");
        setName(data.name || "");
        setRole(data.role || "member");
      }
    };
    fetchLatest();
  }, [currentUser.id]);

  useEffect(() => {
    const fetchSchedules = async () => {
      const { data } = await supabase
        .from("report_schedules")
        .select("*")
        .eq("user_id", currentUser.id);
      if (data) {
        const weekly = data.find((s) => s.report_type === "weekly");
        const monthly = data.find((s) => s.report_type === "monthly");
        if (weekly) {
          setWeeklySchedule({
            mode: weekly.mode,
            day_of_week: weekly.day_of_week ?? 1,
            time_of_day: (weekly.time_of_day || "06:00:00").slice(0, 5),
          });
        }
        if (monthly) {
          setMonthlySchedule({
            mode: monthly.mode,
            day_of_month: monthly.day_of_month ?? 1,
            time_of_day: (monthly.time_of_day || "06:00:00").slice(0, 5),
          });
        }
      }
    };
    fetchSchedules();
  }, [currentUser.id]);

  const managers = allUsers.filter(
    (u) => u.role === "admin" && u.id !== currentUser.id,
  );

  const handleSave = async () => {
    setOk("");
    setErr("");
    try {
      // 名前を更新
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name,
          // 全員グループ変更可（superadminへのロール変更は不可）
          group_id: groupId ? parseInt(groupId) : null,
          // superadmin以外は member ↔ admin を自由に変更可
          // superadmin自身のロールは変更不可
          ...(!isSA
            ? { role: role === "superadmin" ? currentUser.role : role }
            : {}),
          // ロールがmemberのときのみmanager_idを保持
          manager_id: role === "member" ? managerId || null : null,
        })
        .eq("id", currentUser.id);
      if (profileError) throw profileError;

      // パスワード変更
      if (newPassword) {
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passError) throw passError;
      }

      onUpdateUser({
        ...currentUser,
        name,
        role,
        group_id: groupId ? parseInt(groupId) : null,
        groupId: groupId ? parseInt(groupId) : null,
        manager_id: role === "member" ? managerId || null : null,
      });
      setOk("保存しました！");
      setNewPassword("");
      setTimeout(() => setOk(""), 3000);
    } catch (e) {
      setErr("保存に失敗しました: " + e.message);
    }
  };

  const handleUploadActionPlan = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    setUploadingActionPlan(true);
    setActionPlanMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", "action_plan");
      formData.append("target_user_id", groupId);
      formData.append("uploaded_by", currentUser.id);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-excel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        },
      );
      const result = await res.json();
      if (result.success) {
        setActionPlanInfo({ filename: result.filename, updatedAt: new Date().toISOString() });
        setActionPlanMsg("アップロードしました！");
      } else {
        setActionPlanMsg("失敗しました: " + (result.error || "不明なエラー"));
      }
    } catch (err) {
      setActionPlanMsg("失敗しました: " + err.message);
    } finally {
      setUploadingActionPlan(false);
      setTimeout(() => setActionPlanMsg(""), 4000);
      e.target.value = "";
    }
  };

  const handleUploadChallengeSheet = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingChallengeSheet(true);
    setChallengeSheetMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", "challenge_sheet");
      formData.append("target_user_id", currentUser.id);
      formData.append("uploaded_by", currentUser.id);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-excel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        },
      );
      const result = await res.json();
      if (result.success) {
        setChallengeSheetInfo({ filename: result.filename, updatedAt: new Date().toISOString() });
        setChallengeSheetMsg("アップロードしました！");
      } else {
        setChallengeSheetMsg("失敗しました: " + (result.error || "不明なエラー"));
      }
    } catch (err) {
      setChallengeSheetMsg("失敗しました: " + err.message);
    } finally {
      setUploadingChallengeSheet(false);
      setTimeout(() => setChallengeSheetMsg(""), 4000);
      e.target.value = "";
    }
  };

  const handleSaveSchedule = async (type) => {
    const sched = type === "weekly" ? weeklySchedule : monthlySchedule;
    const payload = {
      user_id: currentUser.id,
      report_type: type,
      mode: sched.mode,
      time_of_day: sched.time_of_day,
      day_of_week: type === "weekly" ? sched.day_of_week : null,
      day_of_month: type === "monthly" ? sched.day_of_month : null,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("report_schedules")
      .upsert(payload, { onConflict: "user_id,report_type" });
    if (!error) {
      setScheduleOk(`${type === "weekly" ? "週次" : "月次"}レポートの設定を保存しました！`);
      setTimeout(() => setScheduleOk(""), 3000);
    } else {
      alert("設定の保存に失敗しました: " + error.message);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ ...C, marginBottom: 16 }}>
        <h3
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          プロフィール設定
        </h3>
        {ok && (
          <div
            style={{
              background: "#DCFCE7",
              border: "1px solid #BBF7D0",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              color: "#15803D",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="check" size={14} />
            {ok}
          </div>
        )}
        {err && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              color: "#991B1B",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            氏名
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={I}
            onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            メールアドレス
          </label>
          <div style={{ ...I, background: "#f1f5f9", color: "#94a3b8" }}>
            {currentUser.email}
          </div>
        </div>

        {/* ロール選択 */}
        {!isSA && (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 5,
              }}
            >
              ロール
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                background: "#fff",
                color: "#1e293b",
              }}
            >
              <option value="member">部下（member）</option>
              <option value="admin">上司（admin）</option>
            </select>
          </div>
        )}

        {/* グループ選択 */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            所属グループ
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              background: "#fff",
              color: "#1e293b",
            }}
          >
            <option value="">未所属</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* 上司選択（memberのみ表示） */}
        {role === "member" && (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 5,
              }}
            >
              上司
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                background: "#fff",
                color: "#1e293b",
              }}
            >
              <option value="">未設定</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            パスワード変更{" "}
            <span style={{ fontWeight: 400, fontSize: 11 }}>
              （変更しない場合は空欄）
            </span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新しいパスワード"
            style={I}
            onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {isSA && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 5,
              }}
            >
              ロール
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={I}
            >
              <option value="member">部下</option>
              <option value="admin">上司</option>
              <option value="superadmin">管理者</option>
            </select>
          </div>
        )}

        <button onClick={handleSave} style={BP}>
          <Icon name="save" size={14} />
          保存
        </button>
      </div>

      <div style={{ ...C, marginBottom: 16 }}>
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary, #1e293b)",
          }}
        >
          表示設定
        </h3>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary, #64748b)",
                display: "block",
                marginBottom: 8,
              }}
            >
              ダークモード
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                ["light", "☀️ ライト"],
                ["dark", "🌙 ダーク"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => {
                    const isDark = mode === "dark";
                    setDarkMode(isDark);
                    localStorage.setItem("darkMode", String(isDark));
                  }}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "1px solid",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderColor:
                      (darkMode ? "dark" : "light") === mode
                        ? "var(--accent, #3B82F6)"
                        : "#e2e8f0",
                    background:
                      (darkMode ? "dark" : "light") === mode
                        ? "var(--accent-light, #EFF6FF)"
                        : "#fff",
                    color:
                      (darkMode ? "dark" : "light") === mode
                        ? "var(--accent, #3B82F6)"
                        : "#64748b",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary, #64748b)",
                display: "block",
                marginBottom: 8,
              }}
            >
              カラーテーマ
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                ["blue", "#3B82F6", "ブルー"],
                ["purple", "#8B5CF6", "パープル"],
                ["green", "#10B981", "グリーン"],
                ["red", "#EF4444", "レッド"],
                ["orange", "#F59E0B", "オレンジ"],
                ["pink", "#EC4899", "ピンク"],
              ].map(([key, color, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setAccentColor(key);
                    localStorage.setItem("accentColor", key);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "2px solid",
                    borderColor: accentColor === key ? color : "#e2e8f0",
                    background: accentColor === key ? color + "18" : "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: color,
                      boxShadow:
                        accentColor === key ? `0 0 0 3px ${color}44` : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: accentColor === key ? color : "#64748b",
                      fontWeight: accentColor === key ? 700 : 400,
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

{isAdmin && (
          <AIReferenceManager
            currentUser={currentUser}
            teamMembers={allUsers.filter(
              (u) => String(u.groupId) === String(groupId) && u.id !== currentUser.id && u.role !== "superadmin",
            )}
          />
        )}

{isAdmin && groupId && (
          <div style={{ ...C, marginBottom: 16 }}>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary, #1e293b)",
              }}
            >
              実行計画書（部署方針）
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8" }}>
              所属部署の年度方針です。アップロードすると、部署メンバーのレポート生成時に参考情報として活用されます（メンバーごとの設定がONの場合のみ）
            </p>
            {actionPlanMsg && (
              <div
                style={{
                  background: actionPlanMsg.includes("失敗") ? "#FEF2F2" : "#DCFCE7",
                  border: `1px solid ${actionPlanMsg.includes("失敗") ? "#FECACA" : "#BBF7D0"}`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  marginBottom: 12,
                  color: actionPlanMsg.includes("失敗") ? "#991B1B" : "#15803D",
                  fontSize: 13,
                }}
              >
                {actionPlanMsg}
              </div>
            )}
            {actionPlanInfo.filename ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                }}
              >
                <Icon name="list" size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {actionPlanInfo.filename}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {actionPlanInfo.updatedAt
                      ? `${new Date(actionPlanInfo.updatedAt).toLocaleString("ja-JP")} 更新`
                      : ""}
                  </div>
                </div>
                <label style={{ ...BB, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                  {uploadingActionPlan ? "アップロード中..." : "差し替え"}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleUploadActionPlan}
                    disabled={uploadingActionPlan}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "20px 14px",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <Icon name="plus" size={16} />
                {uploadingActionPlan ? "アップロード中..." : "クリックしてExcelファイルを選択"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadActionPlan}
                  disabled={uploadingActionPlan}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        )}

<div style={{ ...C, marginBottom: 16 }}>
          <h3
            style={{
              margin: "0 0 4px",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary, #1e293b)",
            }}
          >
            チャレンジシート
          </h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8" }}>
            アップロードすると、レポート生成時の参考情報として活用されます（上司の設定がONの場合のみ）
          </p>
          {challengeSheetMsg && (
            <div
              style={{
                background: challengeSheetMsg.includes("失敗") ? "#FEF2F2" : "#DCFCE7",
                border: `1px solid ${challengeSheetMsg.includes("失敗") ? "#FECACA" : "#BBF7D0"}`,
                borderRadius: 8,
                padding: "8px 14px",
                marginBottom: 12,
                color: challengeSheetMsg.includes("失敗") ? "#991B1B" : "#15803D",
                fontSize: 13,
              }}
            >
              {challengeSheetMsg}
            </div>
          )}
          {challengeSheetInfo.filename ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: "1px dashed #cbd5e1",
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <Icon name="list" size={18} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {challengeSheetInfo.filename}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {challengeSheetInfo.updatedAt
                    ? `${new Date(challengeSheetInfo.updatedAt).toLocaleString("ja-JP")} 更新`
                    : ""}
                </div>
              </div>
              <label style={{ ...BB, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                {uploadingChallengeSheet ? "アップロード中..." : "差し替え"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadChallengeSheet}
                  disabled={uploadingChallengeSheet}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          ) : (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "20px 14px",
                border: "1px dashed #cbd5e1",
                borderRadius: 10,
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Icon name="plus" size={16} />
              {uploadingChallengeSheet ? "アップロード中..." : "クリックしてExcelファイルを選択"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUploadChallengeSheet}
                disabled={uploadingChallengeSheet}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

<div style={{ ...C, marginBottom: 16 }}>
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary, #1e293b)",
            }}
          >
            レポート自動生成設定
          </h3>
          {scheduleOk && (
            <div
              style={{
                background: "#DCFCE7",
                border: "1px solid #BBF7D0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
                color: "#15803D",
                fontSize: 13,
              }}
            >
              {scheduleOk}
            </div>
          )}

          {/* 週次レポート */}
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
              週次レポート
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                ["scheduled", "自動生成"],
                ["manual", "手動のみ"],
              ].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setWeeklySchedule((p) => ({ ...p, mode: m }))}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: weeklySchedule.mode === m ? "#3B82F6" : "#e2e8f0",
                    background: weeklySchedule.mode === m ? "#EFF6FF" : "#fff",
                    color: weeklySchedule.mode === m ? "#1D4ED8" : "#64748b",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {weeklySchedule.mode === "scheduled" && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={weeklySchedule.day_of_week}
                  onChange={(e) =>
                    setWeeklySchedule((p) => ({ ...p, day_of_week: parseInt(e.target.value) }))
                  }
                  style={{ ...I, width: "auto" }}
                >
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                    <option key={i} value={i}>{d}曜日</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={weeklySchedule.time_of_day}
                  onChange={(e) =>
                    setWeeklySchedule((p) => ({ ...p, time_of_day: e.target.value }))
                  }
                  style={{ ...I, width: "auto" }}
                />
              </div>
            )}
            <button
              onClick={() => handleSaveSchedule("weekly")}
              style={{ ...BP, marginTop: 12, fontSize: 12, padding: "6px 14px" }}
            >
              週次設定を保存
            </button>
          </div>

          {/* 月次レポート */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
              月次レポート
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                ["scheduled", "自動生成"],
                ["manual", "手動のみ"],
              ].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMonthlySchedule((p) => ({ ...p, mode: m }))}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: monthlySchedule.mode === m ? "#3B82F6" : "#e2e8f0",
                    background: monthlySchedule.mode === m ? "#EFF6FF" : "#fff",
                    color: monthlySchedule.mode === m ? "#1D4ED8" : "#64748b",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {monthlySchedule.mode === "scheduled" && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={monthlySchedule.day_of_month}
                  onChange={(e) =>
                    setMonthlySchedule((p) => ({ ...p, day_of_month: parseInt(e.target.value) }))
                  }
                  style={{ ...I, width: "auto" }}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={monthlySchedule.time_of_day}
                  onChange={(e) =>
                    setMonthlySchedule((p) => ({ ...p, time_of_day: e.target.value }))
                  }
                  style={{ ...I, width: "auto" }}
                />
              </div>
            )}
            <button
              onClick={() => handleSaveSchedule("monthly")}
              style={{ ...BP, marginTop: 12, fontSize: 12, padding: "6px 14px" }}
            >
              月次設定を保存
            </button>
          </div>
        </div>
    </div>
  );
}
function GroupForm({ groups, setGroups }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [editId, setEditId] = useState(null);
  const [ok, setOk] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      const { error } = await supabase
        .from("groups")
        .update({ name: name.trim(), color })
        .eq("id", editId);
      if (!error) {
        setGroups((p) =>
          p.map((g) =>
            g.id === editId ? { ...g, name: name.trim(), color } : g,
          ),
        );
        setOk("更新しました！");
      }
    } else {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name: name.trim(), color })
        .select()
        .single();
      if (!error && data) {
        setGroups((p) => [...p, data]);
        setOk("追加しました！");
      }
    }
    setName("");
    setColor("#3B82F6");
    setEditId(null);
    setTimeout(() => setOk(""), 2000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("このグループを削除しますか？")) return;
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (!error) setGroups((p) => p.filter((g) => g.id !== id));
  };

  return (
    <div>
      {ok && (
        <div
          style={{
            background: "#DCFCE7",
            border: "1px solid #BBF7D0",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            color: "#15803D",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="check" size={14} />
          {ok}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            グループ名
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：営業第3グループ"
            style={I}
            onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            カラー
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: 48,
              height: 38,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              padding: 2,
            }}
          />
        </div>
        <button onClick={handleSave} style={BP}>
          <Icon name="save" size={14} />
          {editId ? "更新" : "追加"}
        </button>
        {editId && (
          <button
            onClick={() => {
              setEditId(null);
              setName("");
              setColor("#3B82F6");
            }}
            style={BB}
          >
            キャンセル
          </button>
        )}
      </div>
      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {groups.map((g) => (
          <div
            key={g.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: g.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                flex: 1,
              }}
            >
              {g.name}
            </span>
            <button
              onClick={() => {
                setEditId(g.id);
                setName(g.name);
                setColor(g.color);
              }}
              style={{ ...BB, padding: "5px 10px", fontSize: 12, gap: 4 }}
            >
              <Icon name="edit" size={13} />
              編集
            </button>
            <button
              onClick={() => handleDelete(g.id)}
              style={{
                ...BB,
                padding: "5px 10px",
                fontSize: 12,
                gap: 4,
                color: "#EF4444",
                borderColor: "#FECACA",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#FEF2F2")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <Icon name="trash" size={13} />
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function InviteModal({ onClose, currentUserRole }) {
  const INVITABLE_ROLES = {
    admin: [
      { value: "admin", label: "上司" },
      { value: "member", label: "部下" },
    ],
    manager: [{ value: "member", label: "部下" }],
    superadmin: [
      { value: "admin", label: "上司" },
      { value: "member", label: "部下" },
    ],
  };
  const selectableRoles = INVITABLE_ROLES[currentUserRole] ?? [];
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(selectableRoles[0]?.value ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (selectableRoles.length === 0) return null;

  const handleInvite = async () => {
    if (!email) return;
    setLoading(true);
    setMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email, name, role }),
        },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage({
        type: "success",
        text: `${email} に招待メールを送信しました`,
      });
      setEmail("");
      setName("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        fontFamily: "inherit",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: 28,
          width: 440,
          maxWidth: "95vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            ユーザーを招待
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              padding: 4,
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            名前（任意）
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            style={I}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            メールアドレス <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            style={I}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            ロール
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={I}
          >
            {selectableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              background: message.type === "success" ? "#DCFCE7" : "#FEF2F2",
              color: message.type === "success" ? "#15803D" : "#991B1B",
              border: `1px solid ${message.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={BB}>
            キャンセル
          </button>
          <button
            onClick={handleInvite}
            disabled={loading || !email}
            style={{ ...BP, opacity: loading || !email ? 0.4 : 1 }}
          >
            {loading ? "送信中..." : "招待メールを送る"}
          </button>
        </div>
      </div>
    </div>
  );
}
function EditUserModal({ user, groups, allUsers, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    role: user.role || "member",
    group_id: user.group_id ? String(user.group_id) : "",
    manager_id: user.manager_id || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const managers = allUsers.filter(
    (u) => u.role === "admin" && u.id !== user.id,
  );

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name,
          role: form.role,
          group_id: form.group_id ? parseInt(form.group_id) : null,
          manager_id: form.manager_id || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      onSave({
        ...user,
        ...form,
        group_id: form.group_id ? parseInt(form.group_id) : null,
      });
      setMessage({ type: "success", text: "保存しました！" });
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setMessage({ type: "error", text: "保存に失敗しました: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        fontFamily: "inherit",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: 28,
          width: 480,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            ユーザー編集
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              padding: 4,
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* 名前 */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            名前
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={I}
          />
        </div>

        {/* メールアドレス（読み取り専用） */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            メールアドレス
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontWeight: 400,
                marginLeft: 6,
              }}
            >
              （変更不可）
            </span>
          </label>
          <div style={{ ...I, background: "#f1f5f9", color: "#94a3b8" }}>
            {user.email}
          </div>
        </div>

        {/* ロール */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            ロール
          </label>
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            style={I}
          >
            <option value="member">部下</option>
            <option value="admin">上司</option>
            <option value="superadmin">管理者</option>
          </select>
        </div>

        {/* 所属グループ */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            所属グループ
          </label>
          <select
            value={form.group_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, group_id: e.target.value }))
            }
            style={I}
          >
            <option value="">未所属</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* 上司（memberのみ表示） */}
        {form.role === "member" && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 5,
              }}
            >
              上司
            </label>
            <select
              value={form.manager_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, manager_id: e.target.value }))
              }
              style={I}
            >
              <option value="">未設定</option>
              {managers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              background: message.type === "success" ? "#DCFCE7" : "#FEF2F2",
              color: message.type === "success" ? "#15803D" : "#991B1B",
              border: `1px solid ${message.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={BB}>
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !form.name}
            style={{ ...BP, opacity: loading || !form.name ? 0.4 : 1 }}
          >
            <Icon name="save" size={14} />
            {loading ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuperAdminPage({
  users,
  setUsers,
  groups,
  setGroups,
  logs,
  onRefreshUsers,
}) {
  const [tab, setTab] = useState("users");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
    groupId: "",
  });
  const [editId, setEditId] = useState(null);
  const [editUser, setEditUser] = useState(null); // 編集対象ユーザー
  const [editForm, setEditForm] = useState(null); // 編集フォームの値
  const [ok, setOk] = useState("");
  const saveUser = async () => {
    console.log("saveUser called", form); // 👈 追加
    if (!form.name || !form.email || !form.password) return;
    setOk("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
            role: form.role,
            group_id: form.groupId || null,
          }),
        },
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      await onRefreshUsers();
      setForm({
        name: "",
        email: "",
        password: "",
        role: "member",
        groupId: "",
      });
      setEditId(null);
      setOk("追加しました");
      setTimeout(() => setOk(""), 2000);
    } catch (err) {
      setOk("エラー: " + err.message);
    }
  };
  const deleteUser = async (id) => {
    if (window.confirm("このユーザーを削除しますか？")) {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      console.log("delete error:", error);
      if (!error) {
        console.log("calling onRefreshUsers");
        await onRefreshUsers();
        console.log("onRefreshUsers done");
      }
    }
  };
  const rm = {
    superadmin: { l: "管理者 ⚙️", bg: "#FEF2F2", c: "#991B1B", b: "#FECACA" },
    admin: { l: "上司 👑", bg: "#FEF3C7", c: "#D97706", b: "#FDE68A" },
    member: { l: "部下", bg: "#EFF6FF", c: "#1D4ED8", b: "#BFDBFE" },
  };
  const exportCSV = () => {
    const header = [
      "日付",
      "氏名",
      "業務タイトル",
      "詳細",
      "開始",
      "終了",
      "時間(分)",
      "業務区分",
      "上司コメント",
    ];
    const rows = logs.map((l) => [
      l.date,
      l.user,
      `"${l.task}"`,
      `"${(l.detail || "").replace(/"/g, '""')}"`,
      l.start,
      l.end,
      l.minutes,
      l.cat,
      `"${(l.managerComment || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_tm_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: "#fff",
          borderRadius: 12,
          padding: 6,
          border: "1px solid #e2e8f0",
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {[
          ["users", "👥 ユーザー管理"],
          ["groups", "🏢 グループ管理"],
          ["export", "📥 CSVエクスポート"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              background: tab === id ? "#1e293b" : "transparent",
              color: tab === id ? "#fff" : "#64748b",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "users" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div style={C}>
            <h3
              style={{
                margin: "0 0 18px",
                fontSize: 15,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              {editId ? "ユーザーを編集" : "ユーザーを追加"}
            </h3>
            {ok && (
              <div
                style={{
                  background: "#DCFCE7",
                  border: "1px solid #BBF7D0",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 14,
                  color: "#15803D",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="check" size={14} />
                {ok}
              </div>
            )}
            {[
              ["name", "氏名"],
              ["email", "メールアドレス"],
              ["password", "パスワード"],
            ].map(([f, l]) => (
              <div key={f} style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  {l}
                </label>
                <input
                  value={form[f]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [f]: e.target.value }))
                  }
                  type={f === "password" ? "password" : "text"}
                  style={I}
                  onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            ))}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  ロール
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, role: e.target.value }))
                  }
                  style={I}
                >
                  <option value="member">部下</option>
                  <option value="admin">上司</option>
                  <option value="superadmin">管理者</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  グループ
                </label>
                <select
                  value={form.groupId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, groupId: e.target.value }))
                  }
                  style={I}
                >
                  <option value="">未所属</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => saveUser()} style={BP}>
                <Icon name="save" size={14} />
                {editId ? "更新" : "追加"}
              </button>
              {editId && (
                <button
                  onClick={() => {
                    setEditId(null);
                    setForm({
                      name: "",
                      email: "",
                      password: "",
                      role: "member",
                      groupId: "",
                    });
                  }}
                  style={BB}
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
          <div style={C}>
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              ユーザー一覧（{users.length}名）
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.map((u) => {
                const g = groups.find((g) => g.id === u.groupId);
                const r = rm[u.role] || rm.member;
                return (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "#f8fafc",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        background:
                          u.role === "superadmin"
                            ? "linear-gradient(135deg,#EF4444,#F59E0B)"
                            : u.role === "admin"
                              ? "linear-gradient(135deg,#F59E0B,#EF4444)"
                              : "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {u.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#1e293b",
                        }}
                      >
                        {u.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {u.email}
                        {g ? ` · ${g.name}` : ""}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: r.bg,
                        color: r.c,
                        border: `1px solid ${r.b}`,
                        flexShrink: 0,
                      }}
                    >
                      {r.l}
                    </span>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setEditUser(u)}
                        style={{
                          ...BB,
                          padding: "5px 10px",
                          fontSize: 12,
                          gap: 4,
                        }}
                      >
                        <Icon name="edit" size={13} />
                        編集
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        style={{
                          ...BB,
                          padding: "5px 10px",
                          fontSize: 12,
                          gap: 4,
                          color: "#EF4444",
                          borderColor: "#FECACA",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#FEF2F2")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#fff")
                        }
                      >
                        <Icon name="trash" size={13} />
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {tab === "groups" && (
        <div>
          <div style={{ ...C, marginBottom: 16 }}>
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              グループを追加
            </h3>
            <GroupForm groups={groups} setGroups={setGroups} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
              gap: 16,
            }}
          >
            {groups.map((g) => {
              const members = users.filter(
                (u) => String(u.groupId) === String(g.id),
              );
              const admins = members.filter((u) => u.role === "admin");
              const mems = members.filter((u) => u.role === "member");
              return (
                <div
                  key={g.id}
                  style={{ ...C, borderTop: `4px solid ${g.color}` }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: g.color,
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      {g.name}
                    </h3>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      {members.length}名
                    </span>
                  </div>
                  {admins.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          fontWeight: 600,
                          marginBottom: 6,
                        }}
                      >
                        上司
                      </div>
                      {admins.map((u) => (
                        <div
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            background: "#FFFBEB",
                            borderRadius: 8,
                            marginBottom: 4,
                            border: "1px solid #FDE68A",
                          }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              background:
                                "linear-gradient(135deg,#F59E0B,#EF4444)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {u.name[0]}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#92400E",
                            }}
                          >
                            {u.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {mems.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          fontWeight: 600,
                          marginBottom: 6,
                        }}
                      >
                        部下
                      </div>
                      {mems.map((u) => (
                        <div
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            background: "#EFF6FF",
                            borderRadius: 8,
                            marginBottom: 4,
                            border: "1px solid #BFDBFE",
                          }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              background:
                                "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {u.name[0]}
                          </div>
                          <span style={{ fontSize: 13, color: "#1D4ED8" }}>
                            {u.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {members.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: 13,
                        padding: "16px 0",
                      }}
                    >
                      メンバーなし
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === "export" && (
        <div style={{ ...C, maxWidth: 600 }}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            📥 CSVエクスポート
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: "0 0 20px",
              lineHeight: 1.6,
            }}
          >
            全メンバーの日報記録をCSVファイルとしてダウンロードできます。
            <br />
            含まれる項目：日付・氏名・業務タイトル・詳細・開始/終了時間・時間(分)・業務区分・上司コメント
          </p>
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 10,
              padding: 16,
              border: "1px solid #e2e8f0",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#1e293b",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              現在のデータ数
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#3B82F6" }}>
              {logs.length}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#64748b",
                  marginLeft: 6,
                }}
              >
                件
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              {INIT_USERS.filter((u) => u.role !== "superadmin").length}
              名分の記録
            </div>
          </div>
          <button
            onClick={exportCSV}
            style={{ ...BP, padding: "12px 24px", fontSize: 14 }}
          >
            <Icon name="download" size={16} />
            CSVをダウンロード
          </button>
        </div>
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          groups={groups}
          allUsers={users}
          onClose={() => setEditUser(null)}
          onSave={(updated) => {
            setUsers((p) => p.map((u) => (u.id === updated.id ? updated : u)));
            setEditUser(null);
            onRefreshUsers();
          }}
        />
      )}
    </div>
  );
}
function RankingPage({ logs, users, currentUser }) {
  const [period, setPeriod] = useState("month");

  const getRange = () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = today.toISOString().split("T")[0];
    if (period === "day") return { from: todayStr, to: todayStr };
    if (period === "week") {
      const dow = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        from: mon.toISOString().split("T")[0],
        to: sun.toISOString().split("T")[0],
      };
    }
    const first = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      from: first,
      to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
    };
  };

  const ranking = useMemo(() => {
    const { from, to } = getRange();
    const filtered = logs.filter(
      (l) => l.date >= from && l.date <= to && l.task !== "（コメントのみ）",
    );
    const countMap = {};
    filtered.forEach((l) => {
      if (!countMap[l.userId]) countMap[l.userId] = 0;
      countMap[l.userId]++;
    });
    return users
      .filter((u) => u.role !== "superadmin")
      .map((u) => ({ ...u, count: countMap[u.id] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [logs, users, period]);

  const medals = ["🥇", "🥈", "🥉"];
  const periodLabel = { day: "今日", week: "今週", month: "今月" };

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: "#fff",
          borderRadius: 12,
          padding: 6,
          border: "1px solid #e2e8f0",
          width: "fit-content",
        }}
      >
        {[
          ["day", "今日"],
          ["week", "今週"],
          ["month", "今月"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPeriod(id)}
            style={{
              padding: "7px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: period === id ? 600 : 400,
              fontFamily: "inherit",
              background: period === id ? "#3B82F6" : "transparent",
              color: period === id ? "#fff" : "#64748b",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ranking.map((u, i) => {
          const isMe = u.id === currentUser.id;
          const rank = i + 1;
          const medal = medals[i] || null;
          const avatarBg =
            u.role === "admin"
              ? "linear-gradient(135deg,#F59E0B,#EF4444)"
              : "linear-gradient(135deg,#3B82F6,#8B5CF6)";
          const maxCount = ranking[0]?.count || 1;

          return (
            <div
              key={u.id}
              style={{
                background: isMe ? "#EFF6FF" : "#fff",
                borderRadius: 14,
                border: `1px solid ${isMe ? "#BFDBFE" : "#e2e8f0"}`,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow:
                  rank <= 3 && u.count > 0
                    ? "0 2px 8px rgba(0,0,0,0.07)"
                    : "none",
              }}
            >
              <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                {medal && u.count > 0 ? (
                  <span style={{ fontSize: 22 }}>{medal}</span>
                ) : (
                  <span
                    style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8" }}
                  >
                    {rank}
                  </span>
                )}
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {u.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: isMe ? 700 : 600,
                      color: "#1e293b",
                    }}
                  >
                    {u.name}
                  </span>
                  {isMe && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#3B82F6",
                        color: "#fff",
                        padding: "1px 7px",
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      あなた
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 6,
                    background: "#f1f5f9",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 3,
                      background:
                        rank === 1
                          ? "#F59E0B"
                          : rank === 2
                            ? "#94a3b8"
                            : rank === 3
                              ? "#CD7F32"
                              : isMe
                                ? "#3B82F6"
                                : "#cbd5e1",
                      width: `${maxCount > 0 ? (u.count / maxCount) * 100 : 0}%`,
                      transition: "width 0.6s",
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: rank === 1 && u.count > 0 ? "#F59E0B" : "#1e293b",
                  }}
                >
                  {u.count}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>件</div>
              </div>
            </div>
          );
        })}
        {ranking.length === 0 && (
          <div
            style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}
          >
            データがありません
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementPage({ currentUser, groups, isSA }) {
  const [announcements, setAnnouncements] = useState([]);
  const [reads, setReads] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadSeconds, setLoadSeconds] = useState(0);
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal",
    target_group_id: "",
  });
  const [posting, setPosting] = useState(false);
  const [ok, setOk] = useState("");
  const [editId, setEditId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(false);
    setLoadSeconds(0);
    const timer = setInterval(() => setLoadSeconds((s) => s + 1), 1000);
    try {
      const { data: ann } = await withRetry(
        () => withTimeout(
          supabase.from("announcements").select("*").order("created_at", { ascending: false }),
          10000,
        ),
        1,
        800,
      );
      const { data: rd } = await withRetry(
        () => withTimeout(
          supabase.from("announcement_reads").select("announcement_id").eq("user_id", currentUser.id),
          10000,
        ),
        1,
        800,
      );
      if (ann) setAnnouncements(ann);
      if (rd) setReads(new Set(rd.map((r) => r.announcement_id)));
    } catch (e) {
      console.error("お知らせの取得に失敗しました:", e);
      setLoadError(true);
    } finally {
      clearInterval(timer);
      setLoading(false);
      setLoadSeconds(0);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const markRead = async (id) => {
    if (reads.has(id)) return;
    await supabase
      .from("announcement_reads")
      .insert({ announcement_id: id, user_id: currentUser.id });
    setReads((p) => new Set([...p, id]));
  };

  const handlePost = async () => {
    if (!form.title || !form.content) return;
    setPosting(true);
    if (editId) {
      const { error } = await supabase
        .from("announcements")
        .update({
          title: form.title,
          content: form.content,
          priority: form.priority,
          target_group_id: form.target_group_id
            ? parseInt(form.target_group_id)
            : null,
        })
        .eq("id", editId);
      if (!error) {
        setAnnouncements((p) =>
          p.map((a) =>
            a.id === editId
              ? {
                  ...a,
                  ...form,
                  target_group_id: form.target_group_id
                    ? parseInt(form.target_group_id)
                    : null,
                }
              : a,
          ),
        );
        setOk("更新しました！");
      }
      setEditId(null);
    } else {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: form.title,
          content: form.content,
          priority: form.priority,
          target_group_id: form.target_group_id
            ? parseInt(form.target_group_id)
            : null,
          created_by: currentUser.id,
        })
        .select()
        .single();
      if (!error && data) {
        setAnnouncements((p) => [data, ...p]);
        setOk("投稿しました！");
      }
    }
    setForm({
      title: "",
      content: "",
      priority: "normal",
      target_group_id: "",
    });
    setPosting(false);
    setTimeout(() => setOk(""), 2000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("このお知らせを削除しますか？")) return;
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((p) => p.filter((a) => a.id !== id));
  };

  const priorityStyle = {
    normal: {
      bg: "#EFF6FF",
      color: "#1D4ED8",
      border: "#BFDBFE",
      label: "通常",
    },
    important: {
      bg: "#FEF3C7",
      color: "#D97706",
      border: "#FDE68A",
      label: "重要",
    },
    urgent: {
      bg: "#FEF2F2",
      color: "#991B1B",
      border: "#FECACA",
      label: "🚨 緊急",
    },
  };

  const visibleAnnouncements = announcements.filter((a) => {
    if (!a.target_group_id) return true;
    return String(a.target_group_id) === String(currentUser.groupId) || isSA;
  });

  const unreadCount = visibleAnnouncements.filter(
    (a) => !reads.has(a.id),
  ).length;

  return (
    <div>
      {isSA && (
        <div style={{ ...C, marginBottom: 20 }}>
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 15,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            {editId ? "お知らせを編集" : "お知らせを投稿"}
          </h3>
          {ok && (
            <div
              style={{
                background: "#DCFCE7",
                border: "1px solid #BBF7D0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
                color: "#15803D",
                fontSize: 13,
              }}
            >
              {ok}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 5,
              }}
            >
              タイトル
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="お知らせのタイトル"
              style={I}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: "#64748b",
                display: "block",
                marginBottom: 5,
              }}
            >
              本文
            </label>
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((p) => ({ ...p, content: e.target.value }))
              }
              rows={4}
              placeholder="お知らせの内容を入力..."
              style={{
                ...I,
                resize: "vertical",
                minHeight: 80,
                lineHeight: 1.6,
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                重要度
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priority: e.target.value }))
                }
                style={I}
              >
                <option value="normal">通常</option>
                <option value="important">重要</option>
                <option value="urgent">🚨 緊急</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                対象グループ
              </label>
              <select
                value={form.target_group_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, target_group_id: e.target.value }))
                }
                style={I}
              >
                <option value="">全員</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handlePost}
              disabled={posting || !form.title || !form.content}
              style={{
                ...BP,
                opacity: posting || !form.title || !form.content ? 0.4 : 1,
              }}
            >
              <Icon name="msg" size={14} />
              {editId ? "更新する" : "投稿する"}
            </button>
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setForm({
                    title: "",
                    content: "",
                    priority: "normal",
                    target_group_id: "",
                  });
                }}
                style={BB}
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          ...C,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
          お知らせ一覧
        </div>
        {unreadCount > 0 && (
          <span
            style={{
              background: "#EF4444",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 20,
            }}
          >
            未読 {unreadCount}件
          </span>
        )}
      </div>

      {loading ? (
        <div
          style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}
        >
          読み込み中...（{loadSeconds}秒経過）
        </div>
      ) : loadError ? (
        <div style={{ ...C, textAlign: "center", padding: 48 }}>
          <p style={{ color: "#94a3b8", marginBottom: 14, fontSize: 13 }}>
            読み込みに時間がかかっています。通信状況をご確認の上、再試行してください。
          </p>
          <button onClick={fetchAll} style={BP}>
            再試行
          </button>
        </div>
      ) : visibleAnnouncements.length === 0 ? (
        <div
          style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}
        >
          お知らせはありません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visibleAnnouncements.map((a) => {
            const ps = priorityStyle[a.priority] || priorityStyle.normal;
            const isRead = reads.has(a.id);
            const targetGroup = groups.find((g) => g.id === a.target_group_id);
            return (
              <div
                key={a.id}
                onClick={() => markRead(a.id)}
                style={{
                  ...C,
                  borderLeft: `4px solid ${isRead ? "#e2e8f0" : ps.border}`,
                  cursor: "pointer",
                  opacity: isRead ? 0.85 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 9px",
                          borderRadius: 20,
                          background: ps.bg,
                          color: ps.color,
                          border: `1px solid ${ps.border}`,
                        }}
                      >
                        {ps.label}
                      </span>
                      {targetGroup && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 9px",
                            borderRadius: 20,
                            background: "#f1f5f9",
                            color: "#64748b",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          🏢 {targetGroup.name}
                        </span>
                      )}
                      {!targetGroup && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 9px",
                            borderRadius: 20,
                            background: "#f1f5f9",
                            color: "#64748b",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          👥 全員
                        </span>
                      )}
                      {!isRead && (
                        <span
                          style={{
                            fontSize: 10,
                            background: "#EF4444",
                            color: "#fff",
                            padding: "1px 7px",
                            borderRadius: 10,
                            fontWeight: 700,
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: 8,
                      }}
                    >
                      {a.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {a.content}
                    </div>
                  </div>
                  {isSA && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditId(a.id);
                          setForm({
                            title: a.title,
                            content: a.content,
                            priority: a.priority,
                            target_group_id: a.target_group_id
                              ? String(a.target_group_id)
                              : "",
                          });
                        }}
                        style={{
                          ...BB,
                          padding: "4px 10px",
                          fontSize: 12,
                          gap: 4,
                        }}
                      >
                        <Icon name="edit" size={12} />
                        編集
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(a.id);
                        }}
                        style={{
                          ...BB,
                          padding: "4px 10px",
                          fontSize: 12,
                          gap: 4,
                          color: "#EF4444",
                          borderColor: "#FECACA",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#FEF2F2")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#fff")
                        }
                      >
                        <Icon name="trash" size={12} />
                        削除
                      </button>
                    </div>
                  )}
                </div>
                <div
                  style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}
                >
                  {new Date(a.created_at).toLocaleString("ja-JP")}
                  {isRead && <span style={{ marginLeft: 8 }}>✓ 既読</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackPage({ currentUser }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !content) return;
    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      title,
      content,
    });
    if (!error) {
      setTitle("");
      setContent("");
      setOk("送信しました！");
      setTimeout(() => setOk(""), 3000);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={C}>
        <h3
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          管理者への意見・要望
        </h3>
        {ok && (
          <div
            style={{
              background: "#DCFCE7",
              border: "1px solid #BBF7D0",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              color: "#15803D",
              fontSize: 13,
            }}
          >
            {ok}
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            タイトル
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：業務システムについて"
            style={I}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 5,
            }}
          >
            内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="意見・要望・改善提案などを自由に入力してください..."
            rows={6}
            style={{
              ...I,
              resize: "vertical",
              minHeight: 120,
              lineHeight: 1.6,
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !title || !content}
          style={{ ...BP, opacity: loading || !title || !content ? 0.4 : 1 }}
        >
          <Icon name="msg" size={14} />
          {loading ? "送信中..." : "送信する"}
        </button>
      </div>
    </div>
  );
}

function FeedbackAdminPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setFeedbacks(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const markAsRead = async (id) => {
    await supabase.from("feedback").update({ is_read: true }).eq("id", id);
    setFeedbacks((p) =>
      p.map((f) => (f.id === id ? { ...f, is_read: true } : f)),
    );
  };

  const unreadCount = feedbacks.filter((f) => !f.is_read).length;

  return (
    <div>
      <div
        style={{
          ...C,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
            意見・要望一覧
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            全{feedbacks.length}件
          </div>
        </div>
        {unreadCount > 0 && (
          <span
            style={{
              background: "#EF4444",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 20,
            }}
          >
            未読 {unreadCount}件
          </span>
        )}
      </div>
      {loading ? (
        <div
          style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}
        >
          読み込み中...
        </div>
      ) : feedbacks.length === 0 ? (
        <div
          style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}
        >
          意見・要望はまだありません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {feedbacks.map((f) => (
            <div
              key={f.id}
              style={{
                ...C,
                borderLeft: `4px solid ${f.is_read ? "#e2e8f0" : "#3B82F6"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {f.user_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}
                  >
                    {f.user_name}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(f.created_at).toLocaleString("ja-JP")}
                  </div>
                </div>
                {!f.is_read && (
                  <button
                    onClick={() => markAsRead(f.id)}
                    style={{ ...BB, fontSize: 12, padding: "4px 12px" }}
                  >
                    既読にする
                  </button>
                )}
                {f.is_read && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>既読</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  background: "#f8fafc",
                  padding: "10px 12px",
                  borderRadius: 8,
                }}
              >
                {f.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function TaskCarousel({ items, today }) {
  const PAGE_SIZE = 3;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const [page, setPage] = useState(0); // 0 ~ totalPages（最後は複製した先頭ページ）
  const [hovering, setHovering] = useState(false);
  const [transitionOn, setTransitionOn] = useState(true);

  // 自動スライド：常に+1（左方向）のみ。最後の複製ページに着いたら一瞬で先頭へワープ
  useEffect(() => {
    if (totalPages <= 1 || hovering) return;
    const timer = setInterval(() => {
      setTransitionOn(true);
      setPage((p) => p + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, [totalPages, hovering]);

  useEffect(() => {
    if (page === totalPages) {
      const t = setTimeout(() => {
        setTransitionOn(false);
        setPage(0);
      }, 500); // トランジション時間と合わせる
      return () => clearTimeout(t);
    }
  }, [page, totalPages]);

  // 手動操作（矢印・ドット）は左右どちらにも自由に動ける通常のページ番号を使う
  const goTo = (target) => {
    setTransitionOn(true);
    setPage(((target % totalPages) + totalPages) % totalPages);
  };

  // 全ページ分のアイテムをPAGE_SIZEごとにまとめ、末尾に先頭ページの複製を追加（無限ループ用）
  const basePages = Array.from({ length: totalPages }, (_, i) => {
    const slice = items.slice(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE);
    while (slice.length < PAGE_SIZE) slice.push(null);
    return slice;
  });
  const pages = totalPages > 1 ? [...basePages, basePages[0]] : basePages;
  const trackPages = pages.length;
  const displayPage = totalPages > 1 ? page : 0;
  const activeDot = ((displayPage % totalPages) + totalPages) % totalPages;

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ position: "relative" }}
    >
      <div style={{ overflow: "hidden", width: "100%" }}>
        <div style={{
          display: "flex",
          width: `${trackPages * 100}%`,
          transform: `translateX(-${displayPage * (100 / trackPages)}%)`,
          transition: transitionOn ? "transform 0.5s cubic-bezier(0.4,0,0.2,1)" : "none",
        }}>
          {pages.map((pageItems, pi) => (
            <div key={pi} style={{ width: `${100 / trackPages}%`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, paddingRight: 8, boxSizing: "border-box" }}>
              {pageItems.map((c, ci) => {
                if (!c) return <div key={ci} style={{ height: 17 }} />;
                const isOver = c.due < today;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#78350F", height: 17 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8,
                      background: isOver ? "#FEE2E2" : "#FEF3C7",
                      color: isOver ? "#991B1B" : "#92400E",
                      flexShrink: 0,
                    }}>
                      {isOver ? "期限切れ" : c.due}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {totalPages > 1 && hovering && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(activeDot - 1); }}
            style={{
              position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)",
              width: 22, height: 22, borderRadius: "50%", border: "1px solid #FDE68A",
              background: "#fff", color: "#92400E", fontSize: 11, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            }}
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(activeDot + 1); }}
            style={{
              position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
              width: 22, height: 22, borderRadius: "50%", border: "1px solid #FDE68A",
              background: "#fff", color: "#92400E", fontSize: 11, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            }}
          >›</button>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                style={{
                  width: 6, height: 6, borderRadius: "50%", cursor: "pointer",
                  background: i === activeDot ? "#F59E0B" : "#FDE68A",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DashboardAlerts({ boards, currentUser, onNavigate, noBottomMargin }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      const { data: ann } = await supabase.from("announcements").select("id");
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", currentUser.id);
      if (ann) {
        const readIds = new Set((reads || []).map((r) => r.announcement_id));
        setUnreadCount(ann.filter((a) => !readIds.has(a.id)).length);
      }
    };
    fetchUnread();
  }, [currentUser.id]);

  const today = new Date().toISOString().split("T")[0];
  const myBoard = boards[currentUser.id] || { cards: [] };
  const urgentCards = myBoard.cards.filter((c) => {
    if (c.col === "done" || !c.due) return false;
    return c.due <= addDays(3);
  }).sort((a, b) => a.due.localeCompare(b.due));

  const hasTasks = urgentCards.length > 0;
  const hasAnnouncements = unreadCount > 0;

  if (!hasTasks && !hasAnnouncements) return null;

  const taskBlock = (
    <div
      onClick={() => onNavigate?.("board")}
      style={{
        background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
        padding: "12px 16px", cursor: "pointer", flex: hasTasks && hasAnnouncements ? 1 : "0 1 360px",
        minWidth: 260,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>⏰ 期日が近いタスク</span>
        <span style={{ fontSize: 11, background: "#F59E0B", color: "#fff", padding: "1px 8px", borderRadius: 10, fontWeight: 700 }}>
          {urgentCards.length}件
        </span>
      </div>
      <TaskCarousel items={urgentCards} today={today} />
    </div>
  );

  const annBlock = (
    <div
      onClick={() => onNavigate?.("announcement")}
      style={{
        background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 8,
        cursor: "pointer", flex: hasTasks && hasAnnouncements ? 1 : "0 1 360px",
        minWidth: 260,
      }}
    >
      <span style={{ fontSize: 16 }}>📣</span>
      <span style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 600 }}>
        未読のお知らせが {unreadCount}件 あります
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: noBottomMargin ? 0 : 20, flexWrap: "wrap" }}>
      {hasTasks && taskBlock}
      {hasAnnouncements && annBlock}
    </div>
  );
}

function ReportPage({ currentUser, allUsers, groups, isAdmin, isSA }) {
  const [reportType, setReportType] = useState("weekly");
  const [scope, setScope] = useState("self"); // "self" | "all" | memberId
  const [reports, setReports] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [showGenModal, setShowGenModal] = useState(false);
  const [genStartDate, setGenStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });

  const [genYear, setGenYear] = useState(() => new Date().getFullYear());
  const [genMonth, setGenMonth] = useState(() => new Date().getMonth() + 1);

  const teamMembers = useMemo(() => {
    if (!isAdmin) return [];
    return allUsers.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (u.role === "superadmin") return false;
      if (isSA) return true;
      return String(u.groupId) === String(currentUser.groupId);
    });
  }, [allUsers, currentUser, isAdmin, isSA]);

  const nameOf = (userId) =>
    allUsers.find((u) => u.id === userId)?.name || "不明なユーザー";

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const table = reportType === "weekly" ? "weekly_reports" : "monthly_reports";
      let query = supabase.from(table).select("*");
      if (scope === "self") {
        query = query.eq("user_id", currentUser.id);
      } else if (scope === "all") {
        const ids = teamMembers.map((m) => m.id);
        query = query.in("user_id", ids.length > 0 ? ids : [currentUser.id]);
      } else {
        query = query.eq("user_id", scope);
      }
      const { data } = await query;
      setReports(data || []);
      setSelectedPeriod(null);
      setLoading(false);
    };
    fetchReports();
  }, [reportType, scope, currentUser.id, teamMembers]);

  const periodKey = (r) =>
    reportType === "weekly" ? `${r.period_start}_${r.period_end}` : `${r.year}_${String(r.month).padStart(2, "0")}`;
  const periodLabel = (r) =>
    reportType === "weekly" ? `${r.period_start} 〜 ${r.period_end}` : `${r.year}年${r.month}月`;

  const periodGroups = useMemo(() => {
    const g = {};
    reports.forEach((r) => {
      const k = periodKey(r);
      if (!g[k]) g[k] = [];
      g[k].push(r);
    });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [reports, reportType]);

  const selectedReports = selectedPeriod
    ? periodGroups.find(([k]) => k === selectedPeriod)?.[1] || []
    : [];

const deleteReport = async (r) => {
    if (!window.confirm(`${periodLabel(r)} のレポートを削除しますか？この操作は取り消せません。`)) return;
    const table = reportType === "weekly" ? "weekly_reports" : "monthly_reports";
    const { error } = await supabase.from(table).delete().eq("id", r.id);
    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }
    setReports((prev) => prev.filter((x) => x.id !== r.id));
    setSelectedPeriod(null);
  };

  const downloadReport = (r) => {
    const text = `${nameOf(r.user_id)} ${periodLabel(r)}\n生成日時: ${new Date(r.generated_at).toLocaleString("ja-JP")}\n\n${r.content}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType === "weekly" ? "週報" : "月報"}_${nameOf(r.user_id)}_${periodKey(r)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    setGenMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let body;
      if (reportType === "weekly") {
        const start = new Date(genStartDate);
        const end = new Date(genStartDate);
        end.setDate(end.getDate() + 6);
        const fmt = (d) => d.toISOString().slice(0, 10);
        body = {
          user_id: currentUser.id,
          report_type: "weekly",
          period_start: fmt(start),
          period_end: fmt(end),
        };
      } else {
        body = {
          user_id: currentUser.id,
          report_type: "monthly",
          year: genYear,
          month: genMonth,
        };
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(body),
        },
      );
      const result = await res.json();
      if (result.skipped) {
        setGenMsg("この期間に日報の記録がないため、レポートは作成されませんでした。");
      } else if (result.success) {
        setGenMsg("レポートを生成しました！");
        const table = reportType === "weekly" ? "weekly_reports" : "monthly_reports";
        const { data } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", currentUser.id);
        setReports(data || []);
        setTimeout(() => {
          setShowGenModal(false);
          setGenMsg("");
        }, 1500);
      } else {
        setGenMsg("生成に失敗しました: " + (result.error || "不明なエラー"));
      }
    } catch (e) {
      setGenMsg("生成に失敗しました: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div
        style={{
          ...C,
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {isAdmin && (
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ ...I, width: "auto" }}
          >
            <option value="self">自分</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="all">チーム全員</option>
          </select>
        )}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["weekly", "週次レポート"],
            ["monthly", "月次レポート"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setReportType(id)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: reportType === id ? 600 : 400,
                fontFamily: "inherit",
                background: reportType === id ? "#3B82F6" : "transparent",
                color: reportType === id ? "#fff" : "#64748b",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {scope === "self" && (
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setShowGenModal(true)} style={BP}>
              {reportType === "weekly" ? "期間を設定して生成" : "月を指定して生成"}
            </button>
          </div>
        )}
      </div>

      {showGenModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowGenModal(false)}
        >
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: 420, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                {reportType === "weekly" ? "期間を設定して生成" : "月を指定して生成"}
              </h3>
              <button onClick={() => setShowGenModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            {reportType === "weekly" ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 5 }}>
                    開始日（1週間分が対象になります）
                  </label>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                    style={I}
                  />
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
                  対象期間：{genStartDate} 〜 {(() => {
                    const d = new Date(genStartDate);
                    d.setDate(d.getDate() + 6);
                    return d.toISOString().slice(0, 10);
                  })()}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <select
                  value={genYear}
                  onChange={(e) => setGenYear(parseInt(e.target.value))}
                  style={{ ...I, width: "auto" }}
                >
                  {[genYear - 1, genYear, genYear + 1].map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  value={genMonth}
                  onChange={(e) => setGenMonth(parseInt(e.target.value))}
                  style={{ ...I, width: "auto" }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
            )}
            {genMsg && (
              <div style={{ fontSize: 12, color: genMsg.includes("失敗") ? "#EF4444" : "#15803D", marginBottom: 14 }}>
                {genMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowGenModal(false)} style={BB}>
                キャンセル
              </button>
              <button onClick={handleGenerateNow} disabled={generating} style={{ ...BP, opacity: generating ? 0.6 : 1 }}>
                {generating ? "生成中..." : "生成する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}>
          読み込み中...
        </div>
      ) : periodGroups.length === 0 ? (
        <div style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}>
          レポートがまだありません
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {periodGroups.map(([key, recs]) => (
              <div
                key={key}
                onClick={() => setSelectedPeriod(key)}
                style={{
                  background: selectedPeriod === key ? "#EFF6FF" : "#fff",
                  border: `1px solid ${selectedPeriod === key ? "#BFDBFE" : "#e2e8f0"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                  {periodLabel(recs[0])}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {scope === "all" ? `${recs.length}名分` : "生成済み"}
                </div>
              </div>
            ))}
          </div>

          <div>
            {!selectedPeriod ? (
              <div style={{ ...C, textAlign: "center", color: "#94a3b8", padding: 48 }}>
                左の一覧から期間を選んでください
              </div>
            ) : scope === "all" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {selectedReports.map((r) => (
                  <div key={r.id} style={C}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {nameOf(r.user_id)[0]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                          {nameOf(r.user_id)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => downloadReport(r)}
                          style={{ ...BB, padding: "5px 12px", fontSize: 12, gap: 4 }}
                        >
                          <Icon name="download" size={13} />
                          DL
                        </button>
                        <button
                          onClick={() => deleteReport(r)}
                          style={{ ...BB, padding: "5px 12px", fontSize: 12, gap: 4, color: "#EF4444", borderColor: "#FECACA" }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                      {r.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              selectedReports.map((r) => (
                <div key={r.id} style={C}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                        {periodLabel(r)}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {nameOf(r.user_id)}・{new Date(r.generated_at).toLocaleString("ja-JP")} 生成
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => downloadReport(r)}
                        style={{ ...BB, gap: 6 }}
                      >
                        <Icon name="download" size={14} />
                        ダウンロード
                      </button>
                      <button
                        onClick={() => deleteReport(r)}
                        style={{ ...BB, gap: 6, color: "#EF4444", borderColor: "#FECACA" }}
                      >
                        <Icon name="trash" size={14} />
                        削除
                      </button>
                    </div>
                  </div>
                  {r.category_summary && (
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginBottom: 12 }}>
                      <PieChart
                        data={Object.entries(CATEGORIES).map(([k, v]) => ({
                          label: `${k}: ${v.label}`,
                          value: r.category_summary[k] || 0,
                          color: v.color,
                        }))}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      borderTop: r.category_summary ? "none" : "1px solid #f1f5f9",
                      paddingTop: r.category_summary ? 0 : 12,
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {r.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true",
  );
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem("accentColor") || "blue",
  );
  const [inviteSession, setInviteSession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  // ▼ セッション自動復元
  useEffect(() => {
    // 初回マウント時に即座にセッション確認
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile && !profileError) {
            setCurrentUser({
              ...profile,
              email: session.user.email,
              groupId: profile.group_id,
            });
          }
        }
      } catch (e) {
        console.error("セッション復元エラー:", e);
      } finally {
        setAuthLoading(false);
      }
    };
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED") {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile) {
            setCurrentUser({
              ...profile,
              email: session.user.email,
              groupId: profile.group_id,
            });
          }
        }
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // タイムアウト保険：6秒（低速ネットワーク・古いPCでも安全に動作するよう延長）
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);
  // ▲ セッション自動復元ここまで

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=invite") || hash.includes("type=recovery")) {
      setInviteSession(true);
    }
  }, []);
  // タブが裏に回っていた後、操作可能な状態に戻ったタイミングでログイン状態を自動チェックする。
  // 一時的な通信の乱れなら自動再試行で回復し、それでも失敗する場合のみ最終手段としてリロードする。
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { data } = await withRetry(
          () => withTimeout(supabase.auth.getSession(), 8000),
          2,
          1000,
        );
        if (!data?.session && currentUser) {
          window.location.reload();
        }
      } catch (e) {
        console.error("セッション再確認に失敗しました:", e);
        if (currentUser) window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [currentUser]);
  const [page, setPage] = useState("dashboard");
  const [logs, setLogs] = useState([]);
  const [reportDraft, _setReportDraft] = useState(() => {
    try {
      const saved = localStorage.getItem("reportDraft");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setReportDraft = (updater) => {
    _setReportDraft((p) => {
      const next = typeof updater === "function" ? updater(p) : updater;
      try {
        if (next) localStorage.setItem("reportDraft", JSON.stringify(next));
        else localStorage.removeItem("reportDraft");
      } catch (e) {
        console.error("ドラフト保存エラー:", e);
      }
      return next;
    });
  };
  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("date", { ascending: false });
      const { data: dayComments } = await supabase
        .from("day_comments")
        .select("*");
      // user_id + date をキーにして振り返りコメントを高速に引けるマップを作る
      const commentMap = new Map();
      (dayComments || []).forEach((c) => {
        commentMap.set(`${c.user_id}_${c.date}`, c.comment);
      });
      if (!error && data) {
        const logsWithComments = data.map((l) => ({
          id: l.id,
          date: l.date,
          task: l.task,
          detail: l.detail,
          start: l.start_time,
          end: l.end_time,
          minutes: l.minutes,
          cat: l.cat,
          user: l.user_name,
          userId: l.user_id,
          managerComment: l.manager_comment || "",
          managerDayComment: l.manager_day_comment || "",
          dayComment: commentMap.get(`${l.user_id}_${l.date}`) || "",
        }));
        // 業務行が1件もない日でも振り返りコメントが残っていれば一覧に表示できるよう、
        // 該当する日付の組み合わせがlogsに存在しない場合は「コメントのみ」の仮想エントリを追加する
        const existingKeys = new Set(logsWithComments.map((l) => `${l.userId}_${l.date}`));
        const virtualEntries = (dayComments || [])
          .filter((c) => !existingKeys.has(`${c.user_id}_${c.date}`))
          .map((c) => ({
            id: `virtual_${c.user_id}_${c.date}`,
            date: c.date,
            task: "（コメントのみ）",
            detail: "",
            start: "",
            end: "",
            minutes: 0,
            cat: "other",
            user: c.user_name,
            userId: c.user_id,
            managerComment: "",
            managerDayComment: "",
            dayComment: c.comment || "",
          }));
        setLogs([...logsWithComments, ...virtualEntries]);
      }
    };
    if (currentUser) fetchLogs();
  }, [currentUser]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [boards, setBoards] = useState({});
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (!error && data) {
        setUsers(
          data.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            groupId: u.group_id,
            group_id: u.group_id,
            manager_id: u.manager_id,
          })),
        );
      }
    };
    if (currentUser) fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data, error } = await supabase.from("groups").select("*");
      if (!error && data) setGroups(data);
    };
    if (currentUser) fetchGroups();
  }, [currentUser]);
  useEffect(() => {
    const fetchBoards = async () => {
      const { data: cards } = await supabase.from("kanban_cards").select("*");
      const { data: cols } = await supabase
        .from("kanban_cols")
        .select("*")
        .order("position");
      const { data: users } = await supabase.from("profiles").select("*");

      if (!users) return;

      const newBoards = {};
      const defaultCols = [
        { col_id: "todo", name: "未着手", position: 0 },
        { col_id: "prog", name: "進行中", position: 1 },
        { col_id: "done", name: "完了", position: 2 },
      ];

      for (const u of users) {
        const userCols = (cols || []).filter((c) => c.user_id === u.id);

        let finalCols;
        if (userCols.length > 0) {
          finalCols = userCols.map((c) => ({ id: c.col_id, name: c.name }));
        } else if (u.id === currentUser.id) {
          // 自分のカラムだけ自動作成
          await supabase
            .from("kanban_cols")
            .insert(defaultCols.map((c) => ({ ...c, user_id: u.id })));
          finalCols = defaultCols.map((c) => ({ id: c.col_id, name: c.name }));
        } else {
          finalCols = defaultCols.map((c) => ({ id: c.col_id, name: c.name }));
        }

        newBoards[u.id] = {
          cols: finalCols,
          cards: (cards || [])
            .filter((c) => c.user_id === u.id)
            .map((c) => ({
              id: c.id,
              col: c.col,
              title: c.title,
              desc: c.description,
              prio: c.prio,
              due: c.due,
              comments: c.comments || [],
            })),
        };
      }
      setBoards(newBoards);
    };
    if (currentUser) fetchBoards();
  }, [currentUser]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const login = (u) => {
    setCurrentUser({
      ...u,
      groupId: u.group_id, // group_idをgroupIdにも設定
    });
    setPage("dashboard");
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setPage("dashboard");
    setSelectedMember(null);
    setReportDraft(null); // ← ここに追加
  };
  const refreshUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error && data) {
      setUsers(
        data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          groupId: u.group_id,
          group_id: u.group_id,
          manager_id: u.manager_id,
        })),
      );
    }
  };
  const saveLogs = (nl, commentUpdate) => {
    if (commentUpdate) {
      // コメントのみ更新の場合、既存ログのdayCommentを更新
      setLogs((p) =>
        p.map((l) =>
          l.date === commentUpdate.date && l.userId === commentUpdate.userId
            ? { ...l, dayComment: commentUpdate.dayComment }
            : l,
        ),
      );
    }
    if (nl.length > 0) {
      setLogs((p) => [
        ...p,
        ...nl.map((l, i) => ({ ...l, id: p.length + i + 1 })),
      ]);
    }
  };
  const deleteLog = async (id) => {
    const { error } = await supabase.from("logs").delete().eq("id", id);
    if (!error) {
      setLogs((p) => {
        const target = p.find((l) => l.id === id);
        const remaining = p.filter((l) => l.id !== id);
        if (!target) return remaining;
        // 同じ日・同じユーザーの業務行が他に残っているか確認
        const sameDayLogs = remaining.filter(
          (l) => l.date === target.date && l.userId === target.userId,
        );
        const hasRealTask = sameDayLogs.some((l) => l.task !== "（コメントのみ）");
        if (!hasRealTask && target.dayComment && target.dayComment.trim()) {
          // 業務行が0件になったが振り返りコメントが残っている場合、
          // 表示が消えないよう「コメントのみ」の仮想エントリを即座に補完する
          const alreadyHasVirtual = sameDayLogs.some((l) => l.task === "（コメントのみ）");
          if (alreadyHasVirtual) return remaining;
          return [
            ...remaining,
            {
              id: `virtual_${target.userId}_${target.date}`,
              date: target.date,
              task: "（コメントのみ）",
              detail: "",
              start: "",
              end: "",
              minutes: 0,
              cat: "other",
              user: target.user,
              userId: target.userId,
              managerComment: "",
              managerDayComment: target.managerDayComment || "",
              dayComment: target.dayComment,
            },
          ];
        }
        return remaining;
      });
    }
  };
  const editLog = (updated) => {
    setLogs((p) => p.map((l) => (l.id === updated.id ? updated : l)));
  };
  const saveMgrComment = async (id, comment) => {
    const { error } = await supabase
      .from("logs")
      .update({ manager_comment: comment })
      .eq("id", id);
    if (!error) {
      setLogs((p) =>
        p.map((l) => (l.id === id ? { ...l, managerComment: comment } : l)),
      );
    }
  };
  // メンバー本人の振り返りコメント（day_comment）を編集・削除する
  const updateMemberDayComment = async (date, userName, comment, userId) => {
    if (!userId) {
      alert("更新に失敗しました: ユーザー情報が取得できませんでした");
      return;
    }
    const trimmed = comment.trim();
    const { error } = trimmed
      ? await supabase
          .from("day_comments")
          .upsert(
            { user_id: userId, user_name: userName, date, comment: trimmed },
            { onConflict: "user_id,date" },
          )
      : await supabase
          .from("day_comments")
          .delete()
          .eq("user_id", userId)
          .eq("date", date);
    if (!error) {
      setLogs((p) => {
        const updated = p.map((l) =>
          l.date === date && l.userId === userId
            ? { ...l, dayComment: trimmed }
            : l,
        );
        // コメントが空になり、かつ実業務行が無い（＝仮想エントリのみ）場合は
        // 表示する理由がなくなるので仮想エントリ自体を取り除く
        if (!trimmed) {
          return updated.filter(
            (l) =>
              !(
                l.date === date &&
                l.userId === userId &&
                l.task === "（コメントのみ）"
              ),
          );
        }
        return updated;
      });
    } else {
      alert("更新に失敗しました: " + error.message);
    }
  };

  const saveDayComment = async (date, user, comment) => {
    const { error } = await supabase
      .from("logs")
      .update({ manager_day_comment: comment })
      .eq("date", date)
      .eq("user_name", user);
    if (!error) {
      setLogs((p) =>
        p.map((l) =>
          l.date === date && l.user === user
            ? { ...l, managerDayComment: comment }
            : l,
        ),
      );
    }
  };
  const selectMember = (m) => {
    setSelectedMember(m);
    setPage("member_detail");
  };
  const backToTeam = () => {
    setSelectedMember(null);
    setPage("team");
  };

  if (inviteSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)",
          fontFamily: "'Noto Sans JP','Helvetica Neue',sans-serif",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "48px 44px",
            width: 400,
            boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 24,
              }}
            >
              📊
            </div>
            <h1
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Sales TM
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                margin: "6px 0 0",
              }}
            >
              パスワードを設定してください
            </p>
          </div>
          {passwordSaved ? (
            <div
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#86efac",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              パスワードを設定しました！ログインページへ移動してください。
              <br />
              <button
                onClick={() => {
                  setInviteSession(false);
                  window.location.hash = "";
                }}
                style={{
                  marginTop: 12,
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ログインへ
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  新しいパスワード
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <button
                onClick={async () => {
                  if (!newPassword) return;
                  const { error } = await supabase.auth.updateUser({
                    password: newPassword,
                  });
                  if (!error) setPasswordSaved(true);
                  else alert("エラーが発生しました: " + error.message);
                }}
                style={{
                  width: "100%",
                  padding: 13,
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                パスワードを設定する
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ▼ 追加：認証確認中はローディング表示
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f8fafc",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #e2e8f0",
            borderTop: "3px solid #3B82F6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "#64748b", fontSize: 14 }}>読み込み中...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  // ▲ 追加ここまで

  const ACCENT_COLORS = {
    blue: {
      primary: "#3B82F6",
      gradient: "135deg,#3B82F6,#6366F1",
      light: "#EFF6FF",
      border: "#BFDBFE",
    },
    purple: {
      primary: "#8B5CF6",
      gradient: "135deg,#8B5CF6,#A855F7",
      light: "#F5F3FF",
      border: "#DDD6FE",
    },
    green: {
      primary: "#10B981",
      gradient: "135deg,#10B981,#059669",
      light: "#ECFDF5",
      border: "#A7F3D0",
    },
    red: {
      primary: "#EF4444",
      gradient: "135deg,#EF4444,#DC2626",
      light: "#FEF2F2",
      border: "#FECACA",
    },
    orange: {
      primary: "#F59E0B",
      gradient: "135deg,#F59E0B,#D97706",
      light: "#FFFBEB",
      border: "#FDE68A",
    },
    pink: {
      primary: "#EC4899",
      gradient: "135deg,#EC4899,#DB2777",
      light: "#FDF2F8",
      border: "#FBCFE8",
    },
  };
  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;

  const themeVars = {
    "--accent": accent.primary,
    "--accent-gradient": `linear-gradient(${accent.gradient})`,
    "--accent-light": accent.light,
    "--accent-border": accent.border,
    "--bg": darkMode ? "#0f172a" : "#f1f5f9",
    "--sidebar-bg": darkMode ? "#020617" : "#0f172a",
    "--card-bg": darkMode ? "#1e293b" : "#ffffff",
    "--card-border": darkMode ? "#334155" : "#e2e8f0",
    "--text-primary": darkMode ? "#f1f5f9" : "#1e293b",
    "--text-secondary": darkMode ? "#94a3b8" : "#64748b",
    "--text-muted": darkMode ? "#475569" : "#94a3b8",
    "--input-bg": darkMode ? "#0f172a" : "#fafafa",
    "--input-border": darkMode ? "#334155" : "#e2e8f0",
  };

  if (!currentUser) return <LoginPage onLogin={login} />;
  const isSA = currentUser.role === "superadmin";
  const isAdmin = currentUser.role === "admin" || isSA;
  const myGroup = groups.find((g) => g.id === currentUser.groupId);
  const roleLabel = isSA
    ? "管理者 ⚙️"
    : currentUser.role === "admin"
      ? "上司 👑"
      : "部下";
  const avatarBg = isSA
    ? "linear-gradient(135deg,#EF4444,#F59E0B)"
    : currentUser.role === "admin"
      ? "linear-gradient(135deg,#F59E0B,#EF4444)"
      : "linear-gradient(135deg,#3B82F6,#8B5CF6)";
  const navItems = [
    { id: "dashboard", label: "ダッシュボード", icon: "chart" },
    { id: "report", label: "日報入力", icon: "edit" },
    { id: "log", label: "自分の記録", icon: "list" },
    ...(isAdmin && !isSA
      ? [{ id: "team", label: "部下の記録", icon: "users" }]
      : []),
    { id: "board", label: "ToDoリスト", icon: "board" },
    { id: "announcement", label: "📣 お知らせ", icon: "msg" },
    { id: "ranking", label: "🏆 ランキング", icon: "chart" },
    { id: "reports", label: "📊 レポート", icon: "list" },
    { id: "mypage", label: "マイページ", icon: "person" },
    ...(!isSA ? [{ id: "feedback", label: "📝 意見・要望", icon: "msg" }] : []),
    ...(isSA ? [{ id: "feedbackAdmin", label: "📬 意見箱", icon: "msg" }] : []),
    ...(isSA
      ? [{ id: "superadmin", label: "システム管理", icon: "settings" }]
      : []),
    ...(isAdmin || isSA
      ? [{ id: "invite", label: "ユーザー招待", icon: "plus" }]
      : []),
  ];
  const titles = {
    dashboard: "ダッシュボード",
    report: "日報入力",
    log: "自分の記録",
    mypage: "マイページ",
    reports: "レポート",
    board: "ToDoリスト",
    team: "部下の記録",
    member_detail: selectedMember ? `${selectedMember.name} の記録` : "",
    superadmin: "システム管理",
    announcement: "お知らせ",
    ranking: "ランキング",
    feedback: "意見・要望",
    feedbackAdmin: "意見箱",
  };
  const subs = {
    dashboard: isAdmin
      ? "チーム全体の業務集計"
      : "自分の業務集計を確認できます",
    report: "業務内容を入力します（行追加・詳細入力・高さ調整対応）",
    log: "自分の記録を確認できます（行をクリックで詳細・上司コメント表示）",
    mypage: "プロフィール・設定を管理できます",
    reports: "週次・月次レポートを確認・ダウンロードできます",
    board: "マイToDoリストと部署メンバーのToDoリストを確認できます",
    team: "部下を選んで記録・ダッシュボードを確認できます",
    member_detail:
      "ダッシュボードと記録一覧・コメント入力を切り替えて確認できます",
    superadmin: "ユーザー・グループ管理・CSVエクスポート（管理者専用）",
    announcement: "お知らせを確認できます",
    ranking: "今日・今週・今月の活動ランキング",
    feedback: "管理者への意見・要望を送信できます",
    feedbackAdmin: "メンバーからの意見・要望を確認できます",
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "'Noto Sans JP','Helvetica Neue',-apple-system,sans-serif",
        display: "flex",
        ...themeVars,
      }}
    >
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
        />
      )}
      <div
        style={{
          width: 224,
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 100,
          transform: `translateX(${sidebarOpen || window.innerWidth >= 768 ? 0 : -224}px)`,
          transition: "transform 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "22px 18px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              📊
            </div>
            <div>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                Sales TM
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                営業生産性向上システム
              </div>
            </div>
          </div>
          {myGroup && (
            <div
              style={{
                marginTop: 10,
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: myGroup.color,
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                {myGroup.name}
              </span>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map((item) => {
            const active =
              page === item.id ||
              (item.id === "team" && page === "member_detail");
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "invite") {
                    setShowInvite(true);
                    setSidebarOpen(false);
                    return;
                  }
                  setPage(item.id);
                  if (item.id !== "team") setSelectedMember(null);
                  setSidebarOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 2,
                  background: active ? "rgba(59,130,246,0.15)" : "transparent",
                  color: active ? "#60A5FA" : "rgba(255,255,255,0.55)",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
                {active && (
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#60A5FA",
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
        <div
          style={{
            padding: "12px 10px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: avatarBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {currentUser.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentUser.name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                {roleLabel}
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                cursor: "pointer",
                color: "#FCA5A5",
                padding: "6px 10px",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              <Icon name="logout" size={14} />
              ログアウト
            </button>
          </div>
        </div>
      </div>
      <div
        style={{
          marginLeft: window.innerWidth >= 768 ? 224 : 0,
          flex: 1,
          padding: window.innerWidth >= 768 ? 24 : "16px 12px",
          minHeight: "100vh",
          maxWidth: window.innerWidth >= 768 ? "calc(100vw - 224px)" : "100vw",
          overflowX: "hidden",
        }}
      >
        {window.innerWidth < 768 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              padding: "10px 0",
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "#0f172a",
                border: "none",
                borderRadius: 10,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 18,
                      height: 2,
                      background: "#fff",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
            </button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                {titles[page] || ""}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {subs[page] || ""}
              </div>
            </div>
          </div>
        )}
        {window.innerWidth >= 768 && (
          <div style={{ marginBottom: 20 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              {titles[page] || ""}
            </h1>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              {subs[page] || ""}
            </div>
            {page === "dashboard" && (
              <div style={{ marginTop: 16 }}>
                <DashboardAlerts boards={boards} currentUser={currentUser} onNavigate={setPage} noBottomMargin />
              </div>
            )}
          </div>
        )}        {page === "dashboard" &&
          (() => {
            const DashboardWithFilter = () => {
              const [dashFilter, setDashFilter] = useState("self");
              const filterTabs = [
                { id: "self", label: "自分" },
                {
                  id: "mygroup",
                  label:
                    groups.find(
                      (g) => String(g.id) === String(currentUser.groupId),
                    )?.name || "所属部署",
                },
                ...groups
                  .filter((g) => String(g.id) !== String(currentUser.groupId))
                  .map((g) => ({ id: `group_${g.id}`, label: g.name })),
                { id: "all", label: "全体" },
              ];
              const dashboardLogs = (() => {
                if (dashFilter === "self")
                  return logs.filter((l) => l.userId === currentUser.id);
                if (dashFilter === "all") return logs;
                if (dashFilter === "mygroup") {
                  const ids = new Set(
                    users
                      .filter(
                        (u) =>
                          String(u.groupId) === String(currentUser.groupId),
                      )
                      .map((u) => u.id),
                  );
                  return logs.filter((l) => ids.has(l.userId));
                }
                const gid = dashFilter.replace("group_", "");
                const ids = new Set(
                  users
                    .filter((u) => String(u.groupId) === gid)
                    .map((u) => u.id),
                );
                return logs.filter((l) => ids.has(l.userId));
              })();
              const dashboardSubtitle =
                filterTabs.find((t) => t.id === dashFilter)?.label || "";
              return (
                <div>

                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginBottom: 20,
                      flexWrap: "wrap",
                      background: "#fff",
                      borderRadius: 12,
                      padding: 6,
                      border: "1px solid #e2e8f0",
                      width: "fit-content",
                    }}
                  >
                    {filterTabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setDashFilter(t.id)}
                        style={{
                          padding: "7px 16px",
                          borderRadius: 8,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: dashFilter === t.id ? 600 : 400,
                          fontFamily: "inherit",
                          background:
                            dashFilter === t.id ? "#3B82F6" : "transparent",
                          color: dashFilter === t.id ? "#fff" : "#64748b",
                          transition: "all 0.15s",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <SummaryPanel
                    logs={dashboardLogs}
                    subtitle={dashboardSubtitle}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <WeatherWidget />
                    <QuoteWidget />
                  </div>
                </div>
              );
            };
            return <DashboardWithFilter />;
          })()}
        {page === "report" && (
          <DailyReportPage
            currentUser={currentUser}
            onSave={saveLogs}
            draft={reportDraft}
            onDraftChange={setReportDraft}
            logs={logs}
          />
        )}
        {page === "log" && (
          <LogListPage
            logs={logs}
            currentUser={currentUser}
            onDelete={deleteLog}
            onSaveManagerComment={saveMgrComment}
            onSaveDayComment={saveDayComment}
            onUpdateMemberComment={updateMemberDayComment}
            onEditLog={editLog}
            onDuplicate={(recs, singleRow) => {
              const today = new Date().toISOString().slice(0, 10);
              const addRows = singleRow
                ? [
                    {
                      ...newRow(),
                      task: singleRow.task,
                      detail: singleRow.detail,
                      start: singleRow.start,
                      end: singleRow.end,
                      cat: singleRow.cat,
                    },
                  ]
                : recs
                    .filter(
                      (r) =>
                        r.user === currentUser.name &&
                        r.task !== "（コメントのみ）",
                    )
                    .map((r) => ({
                      ...newRow(),
                      task: r.task,
                      detail: r.detail,
                      start: r.start,
                      end: r.end,
                      cat: r.cat,
                    }));
              setReportDraft((prev) => {
                const existingRows = prev?.rows ?? [
                  newRow(),
                  newRow(),
                  newRow(),
                ];
                const nonEmpty = existingRows.filter((r) => r.task);
                return {
                  date: today,
                  dayComment: prev?.dayComment ?? "",
                  rows: [...nonEmpty, ...addRows, newRow()],
                };
              });
              setPage("report");
            }}
          />
        )}
        {page === "board" && (
          <BoardPage
            currentUser={currentUser}
            allUsers={users}
            groups={groups}
            boards={boards}
            setBoards={setBoards}
          />
        )}
        {page === "team" && isAdmin && !isSA && (
          <TeamPage
            logs={logs}
            users={users}
            currentUser={currentUser}
            groups={groups}
            onSelectMember={selectMember}
          />
        )}
        {page === "member_detail" && isAdmin && selectedMember && (
          <MemberDetailPage
            member={selectedMember}
            logs={logs}
            currentUser={currentUser}
            onBack={backToTeam}
            onSaveManagerComment={saveMgrComment}
            onSaveDayComment={saveDayComment}
          />
        )}
        {page === "reports" && (
          <ReportPage
            currentUser={currentUser}
            allUsers={users}
            groups={groups}
            isAdmin={isAdmin}
            isSA={isSA}
          />
        )}
        {page === "mypage" && (
          <MyPage
            currentUser={currentUser}
            allUsers={users}
            groups={groups}
            isSA={isSA}
            onUpdateUser={(updated) => setCurrentUser(updated)}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
          />
        )}
        {page === "superadmin" && isSA && (
          <SuperAdminPage
            users={users}
            setUsers={setUsers}
            groups={groups}
            setGroups={setGroups}
            logs={logs}
            onRefreshUsers={refreshUsers}
          />
        )}
        {page === "announcement" && (
          <AnnouncementPage
            currentUser={currentUser}
            groups={groups}
            isSA={isSA}
          />
        )}
        {page === "ranking" && (
          <RankingPage logs={logs} users={users} currentUser={currentUser} />
        )}
        {page === "feedback" && !isSA && (
          <FeedbackPage currentUser={currentUser} />
        )}
        {page === "feedbackAdmin" && isSA && <FeedbackAdminPage />}
        {showInvite && (
          <InviteModal
            onClose={() => setShowInvite(false)}
            currentUserRole={currentUser.role}
          />
        )}
      </div>
    </div>
  );
}
