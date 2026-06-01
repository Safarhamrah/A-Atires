const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const year = document.getElementById("year");
const appointmentFrame = document.getElementById("JotFormIFrame-261509274962060");
const appointmentLoading = document.getElementById("appointmentLoading");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation");
    }
  });
}

appointmentFrame?.addEventListener("load", () => {
  appointmentLoading?.classList.add("is-hidden");
});

window.addEventListener("load", () => {
  if (typeof window.jotformEmbedHandler === "function") {
    window.jotformEmbedHandler(
      "iframe[id='JotFormIFrame-261509274962060']",
      "https://form.jotform.com/"
    );
  }
});
