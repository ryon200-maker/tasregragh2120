import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

/**
 * デモユーザーID（固定UUID）
 * V6で認証実装時に、auth.uid() に置き換える
 */
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * 評価済み作品のIDリストを取得
 * @returns 評価済み作品のwork_idセット
 */
export async function getEvaluatedWorkIds(): Promise<Set<string>> {
  if (!supabase) return new Set();

  try {
    const { data, error } = await supabase
      .from("work_relationships")
      .select("work_id")
      .eq("user_id", DEMO_USER_ID);

    if (error) {
      console.error("Failed to fetch evaluated works:", error);
      return new Set();
    }

    return new Set(data?.map((r: any) => r.work_id) || []);
  } catch (e) {
    console.error("Error fetching evaluated works:", e);
    return new Set();
  }
}

/**
 * 評価を保存（upsert）
 * 同じユーザーの同じ作品は上書きされる
 * @param workId - 作品ID
 * @param workTitle - 作品タイトル
 * @param genre - ジャンル
 * @param relationship - カテゴリ
 * @returns 保存成功の有無
 */
export async function saveEvaluation(
  workId: string,
  workTitle: string,
  genre: string,
  relationship: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("work_relationships")
      .upsert(
        {
          user_id: DEMO_USER_ID,
          work_id: workId,
          work_title: workTitle,
          genre: genre,
          relationship: relationship,
        },
        {
          onConflict: "user_id,work_id", // unique制約を指定
        }
      );

    if (error) {
      console.error("Failed to save evaluation:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error saving evaluation:", e);
    return false;
  }
}

/**
 * 全ての評価を削除（リセット）
 * @returns 削除成功の有無
 */
export async function deleteAllEvaluations(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("work_relationships")
      .delete()
      .eq("user_id", DEMO_USER_ID);

    if (error) {
      console.error("Failed to delete evaluations:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error deleting evaluations:", e);
    return false;
  }
}

/**
 * 全ての評価データを取得（履歴タブ用）
 * @returns 評価レコードの配列
 */
export async function getAllEvaluations(): Promise<
  Array<{
    work_id: string;
    work_title: string;
    genre: string;
    relationship: string;
    created_at: string;
  }>
> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("work_relationships")
      .select("work_id, work_title, genre, relationship, created_at")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch all evaluations:", error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("Error fetching all evaluations:", e);
    return [];
  }
}
