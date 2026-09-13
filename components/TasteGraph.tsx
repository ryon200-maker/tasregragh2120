"use client";
import { useEffect, useMemo, useState } from "react";
import { works, type Work } from "@/lib/works";
import {
  supabase,
  getEvaluatedWorkIds,
  saveEvaluation,
  deleteAllEvaluations,
} from "@/lib/supabase";

type Relationship =
  | "rewatch_always"
  | "rewatch"
  | "watched"
  | "dropped"
  | "unwatched"
  | "want_to_watch";

const labels: Record<Relationship, string> = {
  rewatch_always: "何度でも見たい",
  rewatch: "もう一度見たい",
  watched: "見た",
  dropped: "途中離脱",
  unwatched: "見てない",
  want_to_watch: "見たい",
};

const hints: Record<Relationship, string> = {
  rewatch_always: "何度見てもいい、繰り返し触れたい",
  rewatch: "また見たいと思える",
  watched: "視聴したことがある",
  dropped: "最後まで見られなかった",
  unwatched: "見る予定がない",
  want_to_watch: "いつか見てみたい",
};

const choices: Relationship[] = [
  "rewatch_always",
  "rewatch",
  "watched",
  "dropped",
  "unwatched",
  "want_to_watch",
];

const STORAGE_KEY = "tastegraph-v5-session";

export default function TasteGraph() {
  // === State ===
  const [tab, setTab] = useState<"rate" | "graph" | "history">("rate");
  const [isLoading, setIsLoading] = useState(true);
  const [evaluatedIds, setEvaluatedIds] = useState<Set<string>>(new Set());
  const [recordedData, setRecordedData] = useState<Record<string, Relationship>>(
    {}
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === Computed ===
  const unevaluatedWorks = useMemo(
    () => works.filter((w) => !evaluatedIds.has(w.id)),
    [evaluatedIds]
  );

  const currentWork = unevaluatedWorks.length > 0 ? unevaluatedWorks[0] : null;

  const counts = useMemo(
    () =>
      choices.map((k) => ({
        key: k,
        label: labels[k],
        count: Object.values(recordedData).filter((v) => v === k).length,
      })),
    [recordedData]
  );

  const progress = useMemo(
    () => ({
      evaluated: Object.keys(recordedData).length,
      total: works.length,
      percentage:
        works.length > 0
          ? Math.round(
              (Object.keys(recordedData).length / works.length) * 100
            )
          : 0,
    }),
    [recordedData]
  );

  // === Effects ===
  // 初期化: Supabseから評価済み作品を読み込み
  useEffect(() => {
    (async () => {
      try {
        const evaluated = await getEvaluatedWorkIds();
        setEvaluatedIds(evaluated);

        // ローカルストレージから前回のセッションデータを復元
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setRecordedData(JSON.parse(saved));
        }

        setError(null);
      } catch (e) {
        console.error("Initialization error:", e);
        setError("初期化に失敗しました");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // セッションデータをローカルストレージに自動保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordedData));
  }, [recordedData]);

  // === Handlers ===
  const handleSelect = async (k: Relationship) => {
    if (!currentWork) return;

    setIsSelecting(true);
    setError(null);

    try {
      // 1. ローカル状態を即座に更新（UI即応性）
      setRecordedData((d) => ({ ...d, [currentWork.id]: k }));

      // 2. Supabaseに保存
      const success = await saveEvaluation(
        currentWork.id,
        currentWork.title,
        currentWork.genre,
        k
      );

      if (success) {
        // 3. 成功時：evaluatedIdsを更新 → useMemo が再計算 → currentWork が自動遷移
        setEvaluatedIds((prev) => new Set([...prev, currentWork.id]));
      } else {
        // 4. エラー時：ローカルの変更をロールバック
        setRecordedData((d) => {
          const newData = { ...d };
          delete newData[currentWork.id];
          return newData;
        });
        setError("保存に失敗しました。ネットワークを確認してください。");
      }
    } catch (e) {
      console.error("Error in handleSelect:", e);
      setRecordedData((d) => {
        const newData = { ...d };
        delete newData[currentWork.id];
        return newData;
      });
      setError("エラーが発生しました。");
    } finally {
      setIsSelecting(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "すべてのデータをリセットしますか？\nこの操作は取り消せません。"
      )
    ) {
      return;
    }

    setIsSelecting(true);
    setError(null);

    try {
      // 1. Supabaseから全削除
      const success = supabase ? await deleteAllEvaluations() : true;

      if (success) {
        // 2. ローカル削除
        setRecordedData({});
        setEvaluatedIds(new Set());
        localStorage.removeItem(STORAGE_KEY);
        // 成功通知は画面の状態変化で十分
      } else {
        setError("リセットに失敗しました。もう一度試してください。");
      }
    } catch (e) {
      console.error("Error in handleReset:", e);
      setError("リセット中にエラーが発生しました。");
    } finally {
      setIsSelecting(false);
    }
  };

  // === Render ===
  if (isLoading) {
    return (
      <main className="shell">
        <header>
          <div>
            <div className="eyebrow">TASTEGRAPH / V5</div>
            <h1>
              作品を、点数ではなく<span>言葉</span>で捉える。
            </h1>
          </div>
        </header>
        <p style={{ textAlign: "center", marginTop: "2rem", color: "#999" }}>
          読み込み中...
        </p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div>
          <div className="eyebrow">TASTEGRAPH / V5</div>
          <h1>
            作品を、点数ではなく<span>言葉</span>で捉える。
          </h1>
          <p className="lead">
            「好き度」を数字ではなく、あなたとの関係で表現する実験的なアプリ
          </p>
        </div>
      </header>

      <nav>
        {(
          [
            ["rate", "記録する"],
            ["graph", "Taste Graph"],
            ["history", "履歴"],
          ] as const
        ).map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
            disabled={isLoading || isSelecting}
          >
            {v}
          </button>
        ))}
      </nav>

      {/* === エラー表示 === */}
      {error && (
        <div
          style={{
            background: "#8B0000",
            color: "#fff",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* === "記録する" タブ === */}
      {tab === "rate" && (
        <section className="workspace">
          {currentWork ? (
            <>
              {/* 作品カード */}
              <div className="card poster">
                <img src={currentWork.image} alt={currentWork.title} />
                <div className="overlay">
                  <span>{currentWork.year}</span>
                  <span>{currentWork.genre}</span>
                </div>
              </div>

              {/* 作品情報 */}
              <div className="card">
                <p className="eyebrow">未評価の作品</p>
                <h2>{currentWork.title}</h2>
                <p className="muted">{currentWork.description}</p>

                {/* プログレス */}
                <div style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span>進捗</span>
                    <span>
                      {progress.evaluated} / {progress.total}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "#444",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.percentage}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                {/* カテゴリ選択ボタン */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "0.75rem",
                    marginTop: "1.5rem",
                  }}
                >
                  {choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => handleSelect(choice)}
                      disabled={isSelecting}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "2px solid #444",
                        background: "#1a1d24",
                        color: "#f4f4f5",
                        cursor: isSelecting ? "not-allowed" : "pointer",
                        opacity: isSelecting ? 0.6 : 1,
                        transition: "all 0.2s",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelecting) {
                          (e.target as HTMLButtonElement).style.borderColor =
                            "#7c3aed";
                          (e.target as HTMLButtonElement).style.background =
                            "#2a2d34";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor =
                          "#444";
                        (e.target as HTMLButtonElement).style.background =
                          "#1a1d24";
                      }}
                      title={hints[choice]}
                    >
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        {labels[choice]}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#999" }}>
                        {hints[choice]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* === 完了画面 === */
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "2rem",
                background: "linear-gradient(135deg, #1a1d24 0%, #2a2d34 100%)",
              }}
            >
              <p className="eyebrow">🎉 評価完了</p>
              <h2 style={{ fontSize: "1.8rem", marginTop: "1rem" }}>
                すべての作品を評価しました！
              </h2>
              <p className="muted" style={{ marginTop: "1rem", fontSize: "1rem" }}>
                全 {works.length} 作品の評価が完了しました。
                <br />
                <span style={{ fontSize: "0.9rem" }}>
                  新しい作品が追加されたら、また記録していくことができます。
                </span>
              </p>

              <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    border: "2px solid #7c3aed",
                    background: "#1a1d24",
                    color: "#f4f4f5",
                    cursor: isSelecting ? "not-allowed" : "pointer",
                    opacity: isSelecting ? 0.6 : 1,
                    fontWeight: 600,
                  }}
                  disabled={isSelecting}
                >
                  🔄 リセット
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* === "Taste Graph" タブ === */}
      {tab === "graph" && (
        <section className="card graph">
          <p className="eyebrow">TASTE GRAPH</p>
          <h2>あなたの作品との関係</h2>
          <p className="muted">
            ここではカテゴリを点数化しません。あくまで関係性を可視化しています。
          </p>

          {/* カテゴリ別集計 */}
          <div style={{ marginTop: "1.5rem" }}>
            {counts.map(({ key, label, count }) => (
              <div key={key} style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "0.95rem" }}>{label}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#00d4ff",
                      fontSize: "0.95rem",
                    }}
                  >
                    {count}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#444",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width:
                        count > 0 ? `${(count / works.length) * 100}%` : "0%",
                      height: "100%",
                      background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p
            className="muted"
            style={{
              marginTop: "2rem",
              fontSize: "0.9rem",
              paddingTop: "1rem",
              borderTop: "1px solid #444",
            }}
          >
            📊 合計: {progress.evaluated} / {progress.total} (
            {progress.percentage}%)
          </p>
        </section>
      )}

      {/* === "履歴" タブ === */}
      {tab === "history" && (
        <section className="card graph">
          <p className="eyebrow">RELATIONSHIP HISTORY</p>
          <h2>記録した作品</h2>

          {Object.entries(recordedData).length === 0 ? (
            <p className="empty" style={{ marginTop: "1.5rem", color: "#999" }}>
              まだ記録がありません
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "1rem",
                marginTop: "1.5rem",
              }}
            >
              {Object.entries(recordedData).map(([workId, relationship]) => {
                const work = works.find((w) => w.id === workId);
                return (
                  <div
                    key={workId}
                    style={{
                      border: "1px solid #444",
                      borderRadius: "0.5rem",
                      padding: "1rem",
                      background: "#1a1d24",
                      transition: "all 0.2s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#7c3aed";
                      (e.currentTarget as HTMLElement).style.background =
                        "#2a2d34";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#444";
                      (e.currentTarget as HTMLElement).style.background =
                        "#1a1d24";
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {work?.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.25rem" }}>
                      {work?.genre}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#00d4ff",
                        marginTop: "0.75rem",
                        fontWeight: 500,
                      }}
                    >
                      {labels[relationship]}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <footer>
        v5 · 未評価作品のみ表示 · 数値評価を保存しないTasteGraph
      </footer>
    </main>
  );
}
