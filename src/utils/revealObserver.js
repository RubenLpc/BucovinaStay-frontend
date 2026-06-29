let obs = null;

function getObserver() {
  if (obs) return obs;

  obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;

        if (el.hasAttribute("data-reveal-stagger")) {
          Array.from(el.children).forEach((child, i) => {
            child.style.setProperty("--ri", i);
          });
        }

        el.classList.add("is-revealed");
        obs.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -28px 0px" }
  );

  return obs;
}

export function observeRevealEls(root = document) {
  const observer = getObserver();
  root.querySelectorAll("[data-reveal]:not(.is-revealed), [data-reveal-stagger]:not(.is-revealed)").forEach((el) => {
    observer.observe(el);
  });
}
