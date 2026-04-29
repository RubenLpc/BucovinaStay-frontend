import { apiFetch } from "./client";

export async function sendChatMessage(message, history = []) {
  return apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}
