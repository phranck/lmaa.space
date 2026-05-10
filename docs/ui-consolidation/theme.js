(function () {
  const STORAGE_KEY = "dashboard-theme";
  const VALID_THEMES = new Set(["light", "dark", "system"]);
  const MEDIA_QUERY = "(prefers-color-scheme: dark)";

  const icons = {
    light: `
      <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"></path>
        <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"></path>
      </svg>`,
    dark: `
      <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M210.69,158.18A88,88,0,1,1,97.82,45.31,96.08,96.08,0,0,0,192,160,96.78,96.78,0,0,0,210.69,158.18Z" opacity="0.2"></path>
        <path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"></path>
      </svg>`,
    system: `
      <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M224,64v88H32V64A16,16,0,0,1,48,48H208A16,16,0,0,1,224,64Z" opacity="0.2"></path>
        <path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24h72v16H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V200h72a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40ZM48,56H208a8,8,0,0,1,8,8v80H40V64A8,8,0,0,1,48,56ZM208,184H48a8,8,0,0,1-8-8V160H216v16A8,8,0,0,1,208,184Z"></path>
      </svg>`,
  };

  const selectIcons = {
    down: `
      <svg class="dashboard-custom-select-caret" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path>
      </svg>`,
    up: `
      <svg class="dashboard-custom-select-caret" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"></path>
      </svg>`,
  };

  let customSelectDocumentBound = false;
  let selectedTheme = readTheme();

  function getSystemTheme() {
    const query = window.matchMedia?.(MEDIA_QUERY);
    return query?.matches ? "dark" : "light";
  }

  function readTheme() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return VALID_THEMES.has(stored) ? stored : "system";
    } catch {
      return "system";
    }
  }

  function writeTheme(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
  }

  function effectiveTheme(value) {
    return value === "system" ? getSystemTheme() : value;
  }

  function applyThemeClass() {
    const effective = effectiveTheme(selectedTheme);
    document.documentElement.classList.toggle("dark", effective === "dark");
    document.documentElement.dataset.dashboardTheme = selectedTheme;
    document.documentElement.dataset.dashboardEffectiveTheme = effective;
  }

  function themeSwitchMarkup() {
    return `
      <div class="theme-rail">
        <span class="theme-label">Dashboard Theme</span>
        <div class="theme-segmented" role="group" aria-label="Darstellungsmodus" data-theme-switch data-value="${selectedTheme}">
          <span class="theme-pill" aria-hidden="true"></span>
          <button class="theme-button" type="button" aria-label="Light Mode" title="Light Mode" data-theme-value="light">${icons.light}</button>
          <button class="theme-button" type="button" aria-label="Dark Mode" title="Dark Mode" data-theme-value="dark">${icons.dark}</button>
          <button class="theme-button" type="button" aria-label="System Mode" title="System Mode" data-theme-value="system">${icons.system}</button>
        </div>
      </div>`;
  }

  function syncThemeSwitches() {
    for (const control of document.querySelectorAll("[data-theme-switch]")) {
      control.dataset.value = selectedTheme;
      for (const button of control.querySelectorAll("[data-theme-value]")) {
        const active = button.dataset.themeValue === selectedTheme;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      }
    }
  }

  function setTheme(value) {
    if (!VALID_THEMES.has(value)) return;
    selectedTheme = value;
    writeTheme(value);
    applyThemeClass();
    syncThemeSwitches();
  }

  function renderThemeSlots() {
    for (const slot of document.querySelectorAll("[data-dashboard-theme-slot]")) {
      if (slot.dataset.rendered === "true") continue;
      slot.innerHTML = themeSwitchMarkup();
      slot.dataset.rendered = "true";
    }
  }

  function bindThemeSwitches() {
    for (const button of document.querySelectorAll("[data-theme-value]")) {
      if (button.dataset.bound === "true") continue;
      button.dataset.bound = "true";
      button.addEventListener("click", () => setTheme(button.dataset.themeValue));
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }

  function optionElements(root) {
    return Array.from(root.querySelectorAll("[data-select-option]"));
  }

  function selectedValue(root, sourceSelect) {
    return sourceSelect ? sourceSelect.value : root.dataset.value;
  }

  function optionLabel(option) {
    return (
      option.querySelector(".dashboard-custom-select-option-label")?.textContent.trim() ||
      option.textContent.trim()
    );
  }

  function updateCustomSelectCaret(root, open) {
    const caret = root.querySelector("[data-custom-select-caret]");
    if (!caret) return;
    caret.innerHTML = open ? selectIcons.up : selectIcons.down;
  }

  function syncCustomSelect(root, sourceSelect) {
    const options = optionElements(root);
    const currentValue = selectedValue(root, sourceSelect);
    const selectedOption =
      options.find((option) => option.dataset.value === currentValue) || options[0] || null;

    if (selectedOption && !sourceSelect) {
      root.dataset.value = selectedOption.dataset.value;
    }

    for (const option of options) {
      const selected = option === selectedOption;
      option.setAttribute("aria-selected", String(selected));
      option.classList.remove("is-highlighted");
    }

    const label = root.querySelector("[data-custom-select-label]");
    if (label && selectedOption) {
      label.textContent = optionLabel(selectedOption);
    }
  }

  function setCustomSelectHighlight(root, index) {
    const options = optionElements(root);
    if (options.length === 0) return;
    const nextIndex = (index + options.length) % options.length;
    for (const option of options) {
      option.classList.remove("is-highlighted");
    }
    options[nextIndex].classList.add("is-highlighted");
    options[nextIndex].scrollIntoView({ block: "nearest" });
    root.dataset.highlightIndex = String(nextIndex);
  }

  function closeCustomSelect(root) {
    const trigger = root.querySelector(".dashboard-custom-select-trigger");
    const panel = root.querySelector(".dashboard-custom-select-panel");
    if (!trigger || !panel) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    updateCustomSelectCaret(root, false);
  }

  function closeOtherCustomSelects(currentRoot) {
    for (const root of document.querySelectorAll("[data-custom-select]")) {
      if (root !== currentRoot) {
        closeCustomSelect(root);
      }
    }
  }

  function openCustomSelect(root, sourceSelect) {
    const trigger = root.querySelector(".dashboard-custom-select-trigger");
    const panel = root.querySelector(".dashboard-custom-select-panel");
    if (!trigger || !panel) return;
    closeOtherCustomSelects(root);
    syncCustomSelect(root, sourceSelect);
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    updateCustomSelectCaret(root, true);
    const options = optionElements(root);
    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.getAttribute("aria-selected") === "true"),
    );
    setCustomSelectHighlight(root, currentIndex);
  }

  function selectCustomOption(root, option, sourceSelect) {
    const value = option.dataset.value;
    if (sourceSelect) {
      if (sourceSelect.value !== value) {
        sourceSelect.value = value;
        sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      root.dataset.value = value;
      root.dispatchEvent(
        new CustomEvent("dashboard-select-change", { bubbles: true, detail: { value } }),
      );
    }
    syncCustomSelect(root, sourceSelect);
    closeCustomSelect(root);
  }

  function handleCustomSelectKeydown(event, root, sourceSelect) {
    const trigger = root.querySelector(".dashboard-custom-select-trigger");
    const panel = root.querySelector(".dashboard-custom-select-panel");
    const options = optionElements(root);
    if (!trigger || !panel || options.length === 0) return;

    const open = trigger.getAttribute("aria-expanded") === "true";
    const selectedIndex = Math.max(
      0,
      options.findIndex((option) => option.getAttribute("aria-selected") === "true"),
    );
    const highlightIndex =
      Number.isFinite(Number(root.dataset.highlightIndex)) && root.dataset.highlightIndex !== ""
        ? Number(root.dataset.highlightIndex)
        : selectedIndex;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openCustomSelect(root, sourceSelect);
        } else {
          setCustomSelectHighlight(root, highlightIndex + 1);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openCustomSelect(root, sourceSelect);
        } else {
          setCustomSelectHighlight(root, highlightIndex - 1);
        }
        break;
      case "Home":
        if (!open) return;
        event.preventDefault();
        setCustomSelectHighlight(root, 0);
        break;
      case "End":
        if (!open) return;
        event.preventDefault();
        setCustomSelectHighlight(root, options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          openCustomSelect(root, sourceSelect);
        } else {
          selectCustomOption(root, options[highlightIndex] || options[selectedIndex], sourceSelect);
        }
        break;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        closeCustomSelect(root);
        trigger.focus();
        break;
    }
  }

  function bindCustomSelect(root, sourceSelect = null) {
    if (root.dataset.customSelectBound === "true") return;
    const trigger = root.querySelector(".dashboard-custom-select-trigger");
    const panel = root.querySelector(".dashboard-custom-select-panel");
    if (!trigger || !panel) return;

    root.dataset.customSelectBound = "true";
    root.dataset.customSelect = "true";
    updateCustomSelectCaret(root, false);
    syncCustomSelect(root, sourceSelect);

    trigger.addEventListener("click", () => {
      const open = trigger.getAttribute("aria-expanded") === "true";
      if (open) {
        closeCustomSelect(root);
      } else {
        openCustomSelect(root, sourceSelect);
      }
    });

    trigger.addEventListener("keydown", (event) =>
      handleCustomSelectKeydown(event, root, sourceSelect),
    );

    for (const option of optionElements(root)) {
      option.addEventListener("click", () => selectCustomOption(root, option, sourceSelect));
      option.addEventListener("mouseenter", () => {
        const index = optionElements(root).indexOf(option);
        setCustomSelectHighlight(root, index);
      });
    }

    if (sourceSelect) {
      sourceSelect.addEventListener("change", () => syncCustomSelect(root, sourceSelect));
    }

    bindCustomSelectDocumentEvents();
  }

  function bindCustomSelectDocumentEvents() {
    if (customSelectDocumentBound) return;
    customSelectDocumentBound = true;

    document.addEventListener("click", (event) => {
      const currentRoot = event.target.closest?.("[data-custom-select]");
      closeOtherCustomSelects(currentRoot || null);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeOtherCustomSelects(null);
    });
  }

  function nativeSelectOptionMarkup(option, index, selected) {
    const value = escapeHtml(option.value);
    const label = escapeHtml(option.textContent.trim());
    return `
      <button
        type="button"
        role="option"
        id="${escapeHtml(option.parentElement.id || "select")}-option-${index}"
        class="dashboard-custom-select-option"
        data-select-option
        data-value="${value}"
        aria-selected="${String(selected)}"
      >
        <span class="dashboard-custom-select-option-label">${label}</span>
      </button>`;
  }

  function hydrateNativeSelect(select) {
    if (select.dataset.customSelectHydrated === "true" || select.closest("[data-custom-select]")) {
      return;
    }

    const computedHeight = window.getComputedStyle(select).height;
    const controlHeight =
      computedHeight && computedHeight !== "0px"
        ? computedHeight
        : select.dataset.customSelectHeight || "36px";
    const selectedOption = select.options[select.selectedIndex] || select.options[0];
    const label =
      select.getAttribute("aria-label") || select.labels?.[0]?.textContent?.trim() || "Auswahl";
    const root = document.createElement("div");
    const listboxId = `${select.id || "dashboard-select"}-custom-listbox`;

    root.className = "dashboard-custom-select";
    root.dataset.customSelect = "true";
    root.dataset.value = select.value;
    root.style.setProperty("--dashboard-custom-select-height", controlHeight);
    root.innerHTML = `
      <button
        class="dashboard-custom-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls="${escapeHtml(listboxId)}"
        aria-label="${escapeHtml(label)}"
      >
        <span class="dashboard-custom-select-label" data-custom-select-label>${escapeHtml(
          selectedOption?.textContent?.trim() || "",
        )}</span>
        <span data-custom-select-caret aria-hidden="true"></span>
      </button>
      <div class="dashboard-custom-select-panel" id="${escapeHtml(listboxId)}" role="listbox" hidden>
        <div class="dashboard-custom-select-options">
          ${Array.from(select.options)
            .map((option, index) => nativeSelectOptionMarkup(option, index, option.selected))
            .join("")}
        </div>
      </div>`;

    select.insertAdjacentElement("afterend", root);
    select.dataset.customSelectHydrated = "true";
    select.classList.add("native-control-hidden");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;
    bindCustomSelect(root, select);
  }

  function hydrateCustomSelects() {
    for (const select of document.querySelectorAll("select:not([data-native-select])")) {
      hydrateNativeSelect(select);
    }

    for (const root of document.querySelectorAll("[data-custom-select]")) {
      bindCustomSelect(root);
    }
  }

  function initDemoButtonFeedback() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".demo-button");
      if (!button || button.disabled) return;
      button.classList.add("is-clicked");
      window.clearTimeout(button.__demoClickTimer);
      button.__demoClickTimer = window.setTimeout(() => {
        button.classList.remove("is-clicked");
      }, 260);
    });
  }

  function init() {
    renderThemeSlots();
    bindThemeSwitches();
    applyThemeClass();
    syncThemeSwitches();
    hydrateCustomSelects();
    initDemoButtonFeedback();
  }

  applyThemeClass();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  const mediaQuery = window.matchMedia?.(MEDIA_QUERY);
  mediaQuery?.addEventListener?.("change", () => {
    if (selectedTheme === "system") {
      applyThemeClass();
      syncThemeSwitches();
    }
  });
})();
