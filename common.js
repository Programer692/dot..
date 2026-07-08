/* =========================================================
   common.js
   모든 페이지(index / about / privacy)에서 공유하는 스크립트.
   - 모바일 내비게이션 토글
   - 푸터 연도 자동 갱신
   새 페이지를 추가할 때도 <script src="common.js">만
   넣으면 헤더/푸터 동작이 동일하게 적용됩니다.
   ========================================================= */
(function () {
  "use strict";

  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // 메뉴 링크 클릭 시 모바일 메뉴 자동 닫기
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var yearEl = document.getElementById("yearNow");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
