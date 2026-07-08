/* =========================================================
   /api/gallery
   GET  : 공개(hidden=false)된 갤러리 게시물 목록을 최신순으로 반환
   POST : 새 작품을 갤러리에 공유(등록)

   Cloudflare Pages 대시보드 > 해당 프로젝트 > Settings > Functions
   > KV namespace bindings 에서 변수 이름 "GALLERY_KV"로
   KV 네임스페이스를 연결해야 동작합니다. (README.md 참고)
   ========================================================= */

const MAX_ITEMS = 60;
const MAX_IMAGE_LENGTH = 4 * 1024 * 1024; // 대략 3MB 원본 이미지에 해당하는 base64 길이 상한
const DAILY_UPLOAD_LIMIT = 10;

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.GALLERY_KV) return jsonError(500, "갤러리 저장소(KV)가 연결되어 있지 않습니다.");

  const list = await env.GALLERY_KV.list({ prefix: "item:" });
  const items = [];

  for (const key of list.keys) {
    const raw = await env.GALLERY_KV.get(key.name);
    if (!raw) continue;
    let obj;
    try { obj = JSON.parse(raw); } catch (e) { continue; }
    if (obj.hidden) continue;
    items.push({
      id: obj.id,
      title: obj.title,
      author: obj.author,
      imageDataUrl: obj.imageDataUrl,
      createdAt: obj.createdAt
    });
  }

  items.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  return jsonOk({ items: items.slice(0, MAX_ITEMS) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.GALLERY_KV) return jsonError(500, "갤러리 저장소(KV)가 연결되어 있지 않습니다.");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError(400, "잘못된 요청 형식입니다.");
  }

  const title = sanitizeText(body.title, 40) || "제목 없음";
  const author = sanitizeText(body.author, 20) || "익명";
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

  if (!imageDataUrl.startsWith("data:image/")) {
    return jsonError(400, "이미지 데이터가 올바르지 않습니다.");
  }
  if (imageDataUrl.length > MAX_IMAGE_LENGTH) {
    return jsonError(413, "이미지 용량이 너무 큽니다. 저장 배율을 낮춰 다시 시도해 주세요.");
  }

  // 간단한 하루 업로드 횟수 제한 (IP 기준)
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const rlKey = "ratelimit:" + ip + ":" + today;
  const rlCountRaw = await env.GALLERY_KV.get(rlKey);
  const rlCount = rlCountRaw ? parseInt(rlCountRaw, 10) : 0;
  if (rlCount >= DAILY_UPLOAD_LIMIT) {
    return jsonError(429, "오늘 공유 가능한 횟수를 초과했습니다. 내일 다시 시도해 주세요.");
  }

  const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const item = {
    id: id,
    title: title,
    author: author,
    imageDataUrl: imageDataUrl,
    createdAt: new Date().toISOString(),
    reports: 0,
    hidden: false
  };

  await env.GALLERY_KV.put("item:" + id, JSON.stringify(item));
  await env.GALLERY_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 60 * 60 * 24 * 2 });

  return jsonOk({ ok: true, id: id });
}

function sanitizeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

function jsonOk(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
