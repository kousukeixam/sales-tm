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
    name: "山田 太郎",
    email: "yamada@company.com",
    password: "pass123",
    role: "member",
    groupId: 1,
  },
  {
    id: 2,
    name: "鈴木 花子",
    email: "suzuki@company.com",
    password: "pass123",
    role: "member",
    groupId: 1,
  },
  {
    id: 3,
    name: "佐藤 次郎",
    email: "sato@company.com",
    password: "pass123",
    role: "member",
    groupId: 2,
  },
  {
    id: 4,
    name: "田中 上司",
    email: "tanaka@company.com",
    password: "admin123",
    role: "admin",
    groupId: 1,
  },
  {
    id: 5,
    name: "高橋 上司",
    email: "takahashi@company.com",
    password: "admin123",
    role: "admin",
    groupId: 2,
  },
  {
    id: 6,
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
  id: Date.now() + Math.random(),
  task: "",
  detail: "",
  start: "",
  end: "",
  cat: "",
  managerComment: "",
});

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
      .split(" M ")
      .filter(Boolean)
      .map((s, i) => (
        <path
          key={i}
          d={
            i === 0 && !s.startsWith("M") ? s : `M ${s}`.replace(/^M M /, "M ")
          }
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
  const go = async () => {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      setErr("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      onLogin({ ...profile, email: data.user.email });
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
          {loading ? "ログイン中..." : "ログイン"}
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

function SummaryPanel({ logs, subtitle }) {
  const [df, setDf] = useState("2025-01-01");
  const [dt, setDt] = useState("2025-12-31");
  const { cs, md, totM, totC } = useMemo(() => {
    const f = logs.filter((l) => l.date >= df && l.date <= dt);
    const cs = {};
    Object.keys(CATEGORIES).forEach((k) => (cs[k] = { minutes: 0, count: 0 }));
    f.forEach((l) => {
      cs[l.cat].minutes += l.minutes;
      cs[l.cat].count += 1;
    });
    const md = Array.from({ length: 12 }, () => {
      const o = { total: 0 };
      Object.keys(CATEGORIES).forEach((k) => (o[k] = 0));
      return o;
    });
    f.forEach((l) => {
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

function DailyReportPage({ currentUser, onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [dayComment, setDayComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState(() => [newRow(), newRow(), newRow()]);
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
  const handleSave = async () => {
    const valid = rows.filter(
      (r) => r.task && r.start && r.end && r.cat && getMins(r.start, r.end) > 0,
    );
    if (!valid.length) return;
    
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
      day_comment: dayComment,
    }));

    const { error } = await supabase.from("logs").insert(newLogs);
    
    if (error) {
      alert("保存に失敗しました: " + error.message);
      return;
    }

    onSave(valid.map((r) => ({
      date,
      task: r.task,
      detail: r.detail,
      start: r.start,
      end: r.end,
      minutes: getMins(r.start, r.end),
      cat: r.cat,
      user: currentUser.name,
      managerComment: "",
      managerDayComment: "",
      dayComment,
    })));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <button
          onClick={handleSave}
          style={{ ...BP, boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}
        >
          {saved ? (
            <>
              <Icon name="check" size={16} />
              保存しました！
            </>
          ) : (
            <>
              <Icon name="save" size={16} />
              記録を転記
            </>
          )}
        </button>
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
    {row.cat ? `${row.cat}: ${CATEGORIES[row.cat].label}` : "区分を選択 ▼"}
  </button>
  {row._showCat && (
    <div style={{
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
    }}>
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
          onMouseEnter={(e) => e.currentTarget.style.background = v.bg}
          onMouseLeave={(e) => e.currentTarget.style.background = row.cat === k ? v.bg : "#fff"}
        >
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: v.color,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: v.color }}>{k}</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>{v.label}</span>
        </div>
      ))}
    </div>
  )}
</div>
                {rows.length > 1 && (
                  <button
                    onClick={() => delRow(row.id)}
                    style={{
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#cbd5e1",
                      padding: "4px 6px",
                      borderRadius: 6,
                      display: "flex",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#EF4444")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#cbd5e1")
                    }
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
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
                  <input
                    value={row.task}
                    onChange={(e) => upd(row.id, "task", e.target.value)}
                    placeholder="業務タイトル"
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
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
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
                  <textarea
                    value={row.detail}
                    onChange={(e) => upd(row.id, "detail", e.target.value)}
                    placeholder="場所・相手・内容・目的など詳細を入力..."
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
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
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

function LogCard({ rec, canEdit, isAdmin, onDelete, onSaveManagerComment }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rec.managerComment || "");
  const cat = CATEGORIES[rec.cat];
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
            {rec.task}
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
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
}) {
  const [editDay, setEditDay] = useState(false);
  const [dayDraft, setDayDraft] = useState(recs[0]?.managerDayComment || "");
  const isAdmin =
    currentUser.role === "admin" || currentUser.role === "superadmin";
  const totMins = recs.reduce((s, r) => s + r.minutes, 0);
  const memberDayComment = recs[0]?.dayComment || "";
  const managerDayComment = recs[0]?.managerDayComment || "";
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
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            メンバーの振り返り
          </div>
          {memberDayComment ? (
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

function LogListPage({
  logs,
  currentUser,
  onDelete,
  onSaveManagerComment,
  onSaveDayComment,
  filterUser,
}) {
  const targetLogs = filterUser
    ? logs.filter((l) => l.user === filterUser)
    : logs.filter((l) => l.user === currentUser.name);
  const [fd, setFd] = useState("");
  const [fc, setFc] = useState("");
  const filtered = useMemo(
    () =>
      targetLogs
        .filter((l) => !fd || l.date === fd)
        .filter((l) => !fc || l.cat === fc)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) || a.start.localeCompare(b.start),
        ),
    [targetLogs, fd, fc],
  );
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((l) => {
      if (!g[l.date]) g[l.date] = [];
      g[l.date].push(l);
    });
    return g;
  }, [filtered]);
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
        {(fd || fc) && (
          <button
            onClick={() => {
              setFd("");
              setFc("");
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
        <div style={{ marginLeft: "auto", fontSize: 13 }}>
          <b style={{ color: "#1e293b" }}>{filtered.length}件</b>
        </div>
      </div>
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
      ) : (
        Object.entries(grouped).map(([date, recs]) => (
          <DateGroup
            key={date}
            date={date}
            recs={recs}
            currentUser={currentUser}
            onDelete={onDelete}
            onSaveManagerComment={onSaveManagerComment}
            onSaveDayComment={onSaveDayComment}
          />
        ))
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
    return u.groupId === myGroupId && u.role === "member";
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
        ml.forEach((l) => catCount[l.cat]++);
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
  const save = () => {
    if (!title.trim()) return;
    onSave({ ...card, title: title.trim(), desc, prio, due, comments });
    onClose();
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
                disabled={!title.trim()}
                style={{ ...BP, opacity: title.trim() ? 1 : 0.4 }}
              >
                <Icon name="save" size={14} />
                保存
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

function KanbanCard({ card, isOwner, onOpen }) {
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
  return (
    <div
      draggable={isOwner}
      onDragStart={(e) => e.dataTransfer.setData("cardId", String(card.id))}
      onClick={() => onOpen(card)}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#e2e8f0";
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

function KanbanColumn({ col, cards, isOwner, onAddCard, onOpenCard, onDrop }) {
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
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(parseInt(e.dataTransfer.getData("cardId")), col.id);
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
      u.groupId === currentUser.groupId &&
      u.role !== "superadmin" &&
      u.id !== currentUser.id,
  );
  const [viewId, setViewId] = useState(currentUser.id);
  const [modal, setModal] = useState(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [filterPrio, setFilterPrio] = useState("");
  const isOwner = viewId === currentUser.id;
  const viewUser = allUsers.find((u) => u.id === viewId);
  const board = boards[viewId] || { cols: [], cards: [] };
  const visibleCards = useMemo(
    () => board.cards.filter((c) => !filterPrio || c.prio === filterPrio),
    [board.cards, filterPrio],
  );
  const colCards = (cId) => visibleCards.filter((c) => c.col === cId);
  const totalByStatus = useMemo(() => {
    const all = Object.entries(boards)
      .filter(([uid]) =>
        allUsers.find(
          (u) => u.id === parseInt(uid) && u.groupId === currentUser.groupId,
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
            ...board,
            cards: [...board.cards, { ...updated, id: data.id }],
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
            ...board,
            cards: board.cards.map((c) => (c.id === updated.id ? updated : c)),
          },
        }));
      }
    }
  };
  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("kanban_cards")
      .delete()
      .eq("id", id);
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
    const { error } = await supabase
      .from("kanban_cols")
      .insert({
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
          ["Todo", totalByStatus.todo, "#64748b"],
          ["In Progress", totalByStatus.prog, "#3B82F6"],
          ["Done", totalByStatus.done, "#10B981"],
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
          ボードを選択：
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
          マイボード
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
              {isOwner ? "マイボード" : `${viewUser?.name} のボード`}
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

function SuperAdminPage({ users, setUsers, groups, logs }) {
  const [tab, setTab] = useState("users");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
    groupId: "",
  });
  const [editId, setEditId] = useState(null);
  const [ok, setOk] = useState("");
  const saveUser = () => {
    if (!form.name || !form.email || !form.password) return;
    const gid = form.groupId ? parseInt(form.groupId) : null;
    if (editId) {
      setUsers((p) =>
        p.map((u) => (u.id === editId ? { ...u, ...form, groupId: gid } : u)),
      );
    } else {
      setUsers((p) => [...p, { ...form, id: Date.now(), groupId: gid }]);
    }
    setForm({ name: "", email: "", password: "", role: "member", groupId: "" });
    setEditId(null);
    setOk(editId ? "更新しました" : "追加しました");
    setTimeout(() => setOk(""), 2000);
  };
  const deleteUser = (id) => {
    if (window.confirm("このユーザーを削除しますか？"))
      setUsers((p) => p.filter((u) => u.id !== id));
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
              <button onClick={saveUser} style={BP}>
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
                        onClick={() => {
                          setForm({
                            name: u.name,
                            email: u.email,
                            password: u.password,
                            role: u.role,
                            groupId: u.groupId || "",
                          });
                          setEditId(u.id);
                        }}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 16,
          }}
        >
          {groups.map((g) => {
            const members = users.filter((u) => u.groupId === g.id);
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
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("date", { ascending: false });
      if (!error && data) {
        setLogs(data.map((l) => ({
          id: l.id,
          date: l.date,
          task: l.task,
          detail: l.detail,
          start: l.start_time,
          end: l.end_time,
          minutes: l.minutes,
          cat: l.cat,
          user: l.user_name,
          managerComment: l.manager_comment || "",
          managerDayComment: l.manager_day_comment || "",
          dayComment: l.day_comment || "",
        })));
      }
    };
    if (currentUser) fetchLogs();
  }, [currentUser]);
  const [users, setUsers] = useState(INIT_USERS);
  const [groups] = useState(INIT_GROUPS);
  const [boards, setBoards] = useState({});
  useEffect(() => {
    const fetchBoards = async () => {
      const { data: cards } = await supabase.from("kanban_cards").select("*");
      const { data: cols } = await supabase.from("kanban_cols").select("*").order("position");

      if (!cards || !cols) return;

      const newBoards = {};

      // デフォルトカラムを設定
      const allUsers = await supabase.from("profiles").select("*");
      if (allUsers.data) {
        allUsers.data.forEach((u) => {
          const userCols = cols.filter((c) => c.user_id === u.id);
          newBoards[u.id] = {
            cols: userCols.length > 0
  ? userCols.map((c) => ({ id: c.col_id, name: c.name }))
  : await (async () => {
      const defaultCols = [
        { col_id: "todo", name: "未着手", position: 0 },
        { col_id: "prog", name: "進行中", position: 1 },
        { col_id: "done", name: "完了", position: 2 },
      ];
      await supabase.from("kanban_cols").insert(
        defaultCols.map((c) => ({ ...c, user_id: u.id }))
      );
      return defaultCols.map((c) => ({ id: c.col_id, name: c.name }));
    })(),
            cards: cards
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
        });
      }
      setBoards(newBoards);
    };
    if (currentUser) fetchBoards();
  }, [currentUser]);
  const [selectedMember, setSelectedMember] = useState(null);
  const login = (u) => {
    setCurrentUser(u);
    setPage("dashboard");
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setPage("dashboard");
    setSelectedMember(null);
  };
  const saveLogs = (nl) =>
    setLogs((p) => [
      ...p,
      ...nl.map((l, i) => ({ ...l, id: p.length + i + 1 })),
    ]);
  const deleteLog = (id) => setLogs((p) => p.filter((l) => l.id !== id));
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
    ...(isSA
      ? [{ id: "superadmin", label: "システム管理", icon: "settings" }]
      : []),
    { id: "board", label: "ボード", icon: "board" },
  ];
  const titles = {
    dashboard: "ダッシュボード",
    report: "日報入力",
    log: "自分の記録",
    board: "ボード",
    team: "部下の記録",
    member_detail: selectedMember ? `${selectedMember.name} の記録` : "",
    superadmin: "システム管理",
  };
  const subs = {
    dashboard: isAdmin
      ? "チーム全体の業務集計"
      : "自分の業務集計を確認できます",
    report: "業務内容を入力します（行追加・詳細入力・高さ調整対応）",
    log: "自分の記録を確認できます（行をクリックで詳細・上司コメント表示）",
    board: "マイボードと部署メンバーのボードを確認できます",
    team: "部下を選んで記録・ダッシュボードを確認できます",
    member_detail:
      "ダッシュボードと記録一覧・コメント入力を切り替えて確認できます",
    superadmin: "ユーザー・グループ管理・CSVエクスポート（管理者専用）",
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "'Noto Sans JP','Helvetica Neue',-apple-system,sans-serif",
        display: "flex",
      }}
    >
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
                  setPage(item.id);
                  if (item.id !== "team") setSelectedMember(null);
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
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.3)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                e.currentTarget.style.color = "#FCA5A5";
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
          marginLeft: 224,
          flex: 1,
          padding: 24,
          minHeight: "100vh",
          maxWidth: "calc(100vw - 224px)",
          overflowX: "hidden",
        }}
      >
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
        </div>
        {page === "dashboard" && (
          <SummaryPanel
            logs={
              isSA
                ? logs
                : isAdmin
                  ? logs
                  : logs.filter((l) => l.user === currentUser.name)
            }
            subtitle={isAdmin ? "チーム全体" : null}
          />
        )}
        {page === "report" && (
          <DailyReportPage currentUser={currentUser} onSave={saveLogs} />
        )}
        {page === "log" && (
          <LogListPage
            logs={logs}
            currentUser={currentUser}
            onDelete={deleteLog}
            onSaveManagerComment={saveMgrComment}
            onSaveDayComment={saveDayComment}
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
        {page === "superadmin" && isSA && (
          <SuperAdminPage
            users={users}
            setUsers={setUsers}
            groups={groups}
            logs={logs}
          />
        )}
      </div>
    </div>
  );
}
