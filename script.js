const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const form = document.getElementById("bookingForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");

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

if (form && formMessage) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formMessage.textContent =
      "Thank you! A&A TIRES LTD will contact you shortly to confirm your appointment.";
    form.reset();
  });
}
