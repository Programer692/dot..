/* =========================================================
   gallery.js
   gallery.html 전용. /api/gallery(GET)로 공유된 작품 목록을
   불러와 그리드로 표시하고, 다운로드·신고 기능을 연결합니다.
   실제 데이터 저장/조회는 functions/api/gallery.js,
   functions/api/report.js (Cloudflare Pages Functions + KV)가 담당합니다.
   ========================================================= */
(function () {
  "use strict";

  var statusEl = document.getElementById("galleryStatus");
  var gridEl = document.getElementById("galleryGrid");
  if (!statusEl || !gridEl) return;

  loadGallery();

  function loadGallery() {
    statusEl.textContent = "불러오는 중...";
    statusEl.style.display = "block";
    gridEl.innerHTML = "";

    fetch("/api/gallery")
      .then(function (res) {
        if (!res.ok) throw new Error("서버 응답 오류 (" + res.status + ")");
        return res.json();
      })
      .then(function (json) {
        var items = (json && json.items) || [];
        if (items.length === 0) {
          statusEl.textContent = "아직 공유된 작품이 없어요. 첫 번째 작품을 공유해보세요!";
          return;
        }
        statusEl.style.display = "none";
        items.forEach(renderCard);
      })
      .catch(function (err) {
        console.error(err);
        statusEl.textContent = "갤러리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      });
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0");
    } catch (e) {
      return "";
    }
  }

  function renderCard(item) {
    var card = document.createElement("article");
    card.className = "gallery-card";

    var thumbWrap = document.createElement("div");
    thumbWrap.className = "gallery-thumb";
    var img = document.createElement("img");
    img.src = item.imageDataUrl;
    img.alt = (item.title || "이용자가 공유한 도트 아트") ;
    img.loading = "lazy";
    thumbWrap.appendChild(img);
    card.appendChild(thumbWrap);

    var title = document.createElement("h3");
    title.textContent = item.title || "제목 없음";
    card.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "gallery-meta";
    meta.textContent = "by " + (item.author || "익명") + " · " + formatDate(item.createdAt);
    card.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "gallery-actions";

    var downloadBtn = document.createElement("a");
    downloadBtn.className = "btn-ghost small";
    downloadBtn.href = item.imageDataUrl;
    downloadBtn.download = "dotpress-" + (item.id || "art") + ".jpg";
    downloadBtn.textContent = "⬇ 다운로드";
    actions.appendChild(downloadBtn);

    var reportBtn = document.createElement("button");
    reportBtn.type = "button";
    reportBtn.className = "btn-ghost small btn-danger";
    reportBtn.textContent = "🚩 신고";
    reportBtn.addEventListener("click", function () {
      handleReport(item.id, reportBtn);
    });
    actions.appendChild(reportBtn);

    card.appendChild(actions);
    gridEl.appendChild(card);
  }

  function handleReport(id, btn) {
    if (!id) return;
    if (!window.confirm("이 작품을 부적절한 게시물로 신고할까요?")) return;

    btn.disabled = true;
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("신고 처리 실패");
        return res.json();
      })
      .then(function (json) {
        btn.textContent = json && json.hidden ? "숨김 처리됨" : "신고 접수됨";
      })
      .catch(function (err) {
        console.error(err);
        btn.disabled = false;
        window.alert("신고 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }
})();
