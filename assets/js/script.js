const topbar = document.querySelector(".topbar");
const hero = document.getElementById("inicio");

if (topbar && hero) {
  const setTopbarVisibility = (isVisible) => {
    topbar.classList.toggle("is-visible", isVisible);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setTopbarVisibility(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(hero);
  } else {
    const toggleTopbar = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      setTopbarVisibility(heroBottom <= 0);
    };

    toggleTopbar();
    window.addEventListener("scroll", toggleTopbar, { passive: true });
    window.addEventListener("resize", toggleTopbar, { passive: true });
  }
}
