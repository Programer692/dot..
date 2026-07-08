/* =========================================================
   /api/report
   POST : 게시물 id를 신고 처리. 신고 누적 횟수가 임계값을
   넘으면 자동으로 hidden=true 처리되어 목록에서 제외됩니다.
   ========================================================= */

const REPORT_THRESHOLD = 3;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.GALLERY_KV) return jsonError(500, "갤러리 저장소(KV)가 연결되어 있지 않습니다.");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError(400, "잘못된 요청 형식입니다.");
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return jsonError(400, "id가 필요합니다.");

  const key = "item:" + id;
  const raw = await env.GALLERY_KV.get(key);
  if (!raw) return jsonError(404, "게시물을 찾을 수 없습니다.");

  let item;
  try {
    item = JSON.parse(raw);
  } catch (e) {
    return jsonError(500, "게시물 데이터를 읽을 수 없습니다.");
  }

  item.reports = (item.reports || 0) + 1;
  if (item.reports >= REPORT_THRESHOLD) item.hidden = true;

  await env.GALLERY_KV.put(key, JSON.stringify(item));

  return jsonOk({ ok: true, hidden: item.hidden, reports: item.reports });
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
