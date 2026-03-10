(function () {
  var meta = document.querySelector('meta[name="color-scheme"]');
  var storedTheme = localStorage.getItem("dashboard-theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var dark = storedTheme === "dark" || (storedTheme !== "light" && prefersDark);

  if (!dark) {
    return;
  }

  document.documentElement.classList.add("dark");

  if (meta) {
    meta.setAttribute("content", "dark");
  }
})();
