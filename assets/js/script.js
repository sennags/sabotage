const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const revealItems = document.querySelectorAll(".reveal");

if (header) {
  const syncHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
}

if (menuToggle && header && siteNav) {
  const navLinks = siteNav.querySelectorAll("a");

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
      if (window.innerWidth <= 860) {
        setMenuState(false);
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
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

const soundcloudEmbeds = document.querySelectorAll("[data-soundcloud-embed]");

soundcloudEmbeds.forEach((wrapper) => {
  const iframe = wrapper.querySelector("iframe");
  const fallback = wrapper.querySelector(".soundcloud-fallback");

  if (!iframe || !fallback) {
    return;
  }

  let settled = false;
  const markFailed = () => {
    if (settled) {
      return;
    }
    settled = true;
    wrapper.classList.add("is-failed");
    fallback.hidden = false;
  };

  const markLoaded = () => {
    if (settled) {
      return;
    }
    settled = true;
    wrapper.classList.add("is-loaded");
    fallback.hidden = true;
  };

  const timeout = window.setTimeout(markFailed, 6000);

  iframe.addEventListener("load", () => {
    window.clearTimeout(timeout);
    markLoaded();
  });

  iframe.addEventListener("error", () => {
    window.clearTimeout(timeout);
    markFailed();
  });
});
