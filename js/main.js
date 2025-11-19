// плавный скролл по data-scroll
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-scroll]");
  if (!target) return;
  const selector = target.getAttribute("data-scroll");
  const el = document.querySelector(selector);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
});

// кнопка "Launch full-screen demo"
const openMvpBtn = document.getElementById("openMvpBtn");
if (openMvpBtn) {
  openMvpBtn.addEventListener("click", () => {
    // когда зальёшь файл, путь вот такой:
    // /mvp-demo/lvs_demo_full.html
    window.open("mvp-demo/lvs_demo_full.html", "_blank");
  });
}
