import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
};

export type MovieAction = "watch_later" | "liked" | "disliked" | "watching";

export type MovieActionState = {
  watchLaterIds: number[];
  likedItemIds: number[];
  dislikedItemIds: number[];
  watchingItemIds: number[];
};

export const emptyMovieActionState: MovieActionState = {
  watchLaterIds: [],
  likedItemIds: [],
  dislikedItemIds: [],
  watchingItemIds: [],
};

function getDisplayName(user: User) {
  const metadataName = user.user_metadata?.name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();

  return emailPrefix || "Пользователь";
}

export function mapSupabaseUser(user: User): CurrentUser {
  return {
    id: user.id,
    name: getDisplayName(user),
    email: user.email || "",
  };
}

export async function getCurrentSupabaseUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function loadMovieActions(): Promise<MovieActionState> {
  const user = await getCurrentSupabaseUser();

  if (!user) {
    return emptyMovieActionState;
  }

  const { data, error } = await supabase
    .from("user_movie_actions")
    .select("movie_id, action")
    .eq("user_id", user.id);

  if (error || !data) {
    console.error("Не удалось загрузить действия пользователя:", error?.message);
    return emptyMovieActionState;
  }

  const nextState: MovieActionState = {
    watchLaterIds: [],
    likedItemIds: [],
    dislikedItemIds: [],
    watchingItemIds: [],
  };

  data.forEach((row) => {
    const movieId = Number(row.movie_id);

    if (!Number.isFinite(movieId)) {
      return;
    }

    if (row.action === "watch_later") {
      nextState.watchLaterIds.push(movieId);
    }

    if (row.action === "liked") {
      nextState.likedItemIds.push(movieId);
    }

    if (row.action === "disliked") {
      nextState.dislikedItemIds.push(movieId);
    }

    if (row.action === "watching") {
      nextState.watchingItemIds.push(movieId);
    }
  });

  return nextState;
}

export async function syncMovieAction(
  movieId: number,
  action: MovieAction,
  shouldEnable: boolean,
) {
  const user = await getCurrentSupabaseUser();

  if (!user) {
    return;
  }

  if (shouldEnable) {
    const { error } = await supabase
      .from("user_movie_actions")
      .upsert(
        {
          user_id: user.id,
          movie_id: movieId,
          action,
        },
        { onConflict: "user_id,movie_id,action" },
      );

    if (error) {
      console.error("Не удалось сохранить действие:", error.message);
    }

    return;
  }

  const { error } = await supabase
    .from("user_movie_actions")
    .delete()
    .eq("user_id", user.id)
    .eq("movie_id", movieId)
    .eq("action", action);

  if (error) {
    console.error("Не удалось удалить действие:", error.message);
  }
}

export async function clearMovieActions() {
  const user = await getCurrentSupabaseUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("user_movie_actions")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Не удалось очистить списки:", error.message);
  }
}
