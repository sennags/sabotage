const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const revealItems = document.querySelectorAll(".reveal");
const mobileMenuBreakpoint = 860;

if (header) {
  const syncHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
}

if (menuToggle && header && siteNav) {
  const navLinks = siteNav.querySelectorAll("a");
  const isMobileMenu = () => window.innerWidth <= mobileMenuBreakpoint;

  const setMenuState = (isOpen) => {
    header.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobileMenu()) {
        setMenuState(false);
      }
    });
  });

  window.addEventListener("resize", () => {
    if (!isMobileMenu()) {
      setMenuState(false);
    }
  });
}

if ("IntersectionObserver" in window && revealItems.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
