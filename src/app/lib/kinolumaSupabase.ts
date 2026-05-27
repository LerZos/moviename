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

const SUPABASE_AUTH_TIMEOUT_MS = 4500;
const SUPABASE_QUERY_TIMEOUT_MS = 6000;

function withTimeout<T, F>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: F,
  label: string,
): Promise<T | F> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<F>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`${label} занял больше ${ms} мс. Использую безопасный fallback.`);
      resolve(fallback);
    }, ms);
  });

  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
}

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

export function saveCurrentUserToStorage(user: CurrentUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("kinoluma-current-user", JSON.stringify(user));
}

export function removeCurrentUserFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("kinoluma-current-user");
}

export async function getCurrentSupabaseUser() {
  const sessionResponse = await withTimeout(
    supabase.auth.getSession(),
    SUPABASE_AUTH_TIMEOUT_MS,
    null,
    "Supabase getSession",
  ).catch((error) => {
    console.error("Не удалось прочитать сессию Supabase:", error?.message || error);
    return null;
  });

  if (sessionResponse?.data.session?.user) {
    return sessionResponse.data.session.user;
  }

  if (sessionResponse?.error) {
    console.error(
      "Не удалось прочитать сессию Supabase:",
      sessionResponse.error.message,
    );
  }

  const userResponse = await withTimeout(
    supabase.auth.getUser(),
    SUPABASE_AUTH_TIMEOUT_MS,
    null,
    "Supabase getUser",
  ).catch((error) => {
    console.error("Не удалось получить пользователя Supabase:", error?.message || error);
    return null;
  });

  if (userResponse?.error || !userResponse?.data.user) {
    return null;
  }

  return userResponse.data.user;
}

export async function loadMovieActions(): Promise<MovieActionState> {
  const user = await getCurrentSupabaseUser();

  if (!user) {
    return emptyMovieActionState;
  }

  const response = await withTimeout(
    supabase
      .from("user_movie_actions")
      .select("movie_id, action")
      .eq("user_id", user.id),
    SUPABASE_QUERY_TIMEOUT_MS,
    null,
    "Загрузка действий пользователя",
  ).catch((error) => {
    console.error("Не удалось загрузить действия пользователя:", error?.message || error);
    return null;
  });

  if (!response?.data) {
    if (response?.error) {
      console.error(
        "Не удалось загрузить действия пользователя:",
        response.error.message,
      );
    }

    return emptyMovieActionState;
  }

  const nextState: MovieActionState = {
    watchLaterIds: [],
    likedItemIds: [],
    dislikedItemIds: [],
    watchingItemIds: [],
  };

  response.data.forEach((row) => {
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
