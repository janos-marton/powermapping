import { cookies } from "next/headers";
import { HttpError } from "./http";

export const USER_COOKIE = "dream_user";
export const MAX_NAME_LENGTH = 40;

export async function getUserName(): Promise<string | null> {
  const value = (await cookies()).get(USER_COOKIE)?.value?.trim().slice(0, MAX_NAME_LENGTH);
  return value || null;
}

export async function requireUser(): Promise<string> {
  const name = await getUserName();
  if (!name) throw new HttpError(401, "Enter your name first");
  return name;
}
