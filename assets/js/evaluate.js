(() => {
  const form = document.querySelector("[data-step-one-form]");
  const summary = document.querySelector("[data-step-one-summary]");
  const intakeSection = document.querySelector("#evaluation-intake");
  const openIntakeButton = document.querySelector("[data-open-intake]");

  if (!form || !summary) {
    return;
  }

  const STORAGE_KEY = "evaluateStepOneDraft";

  const summaryTargets = {
    basics: summary.querySelector("[data-summary-basics]"),
    risks: summary.querySelector("[data-summary-risks]"),
    social: summary.querySelector("[data-summary-social]"),
    monitoring: summary.querySelector("[data-summary-monitoring]"),
    focus: summary.querySelector("[data-summary-focus]"),
  };

  function getValues(name) {
    return Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map((input) => input.value);
  }

  function getValue(name) {
    const field = form.elements[name];
    return field ? field.value.trim() : "";
  }

  function saveDraft() {
    const payload = {
      projectName: getValue("projectName"),
      island: getValue("island"),
      nbsType: getValue("nbsType"),
      climateHazards: getValues("climateHazards"),
      socialChallenges: getValues("socialChallenges"),
      monitoringLevel: getValue("monitoringLevel"),
      projectContext: getValue("projectContext"),
      evaluationGoal: getValue("evaluationGoal"),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function restoreDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([key, value]) => {
        const field = form.elements[key];
        if (!field || value == null) {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((entry) => {
            const option = form.querySelector(`[name="${key}"][value="${CSS.escape(entry)}"]`);
            if (option) {
              option.checked = true;
            }
          });
          return;
        }

        if (field instanceof RadioNodeList) {
          const option = form.querySelector(`[name="${key}"][value="${CSS.escape(value)}"]`);
          if (option) {
            option.checked = true;
          }
          return;
        }

        field.value = value;
      });

      return data;
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function toList(items, emptyText) {
    if (!items.length) {
      return `<p>${emptyText}</p>`;
    }

    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function monitoringMessage(level) {
    if (level === "Long-term dataset") {
      return "You already have a strong evidence base. Step 2 can focus on structuring relationships and choosing higher-resolution indicators.";
    }

    if (level === "Ongoing monitoring") {
      return "You have an active monitoring foundation. Step 2 should map where current observations already cover the system and where gaps remain.";
    }

    if (level === "Some records") {
      return "You have partial evidence to build from. Step 2 should identify which relationships are already trackable and which need new indicators.";
    }

    return "You are starting from a light monitoring base. Step 2 should stay simple and focus on the most decision-relevant parts of the system first.";
  }

  function focusMessage(data) {
    const hazards = data.climateHazards.length ? data.climateHazards.join(", ") : "the risks you selected";
    const goal = data.evaluationGoal || "your current evaluation goal";

    return `
      <p>Before Step 2, focus your system map around <strong>${hazards}</strong> and the actors, places, and assets most tied to <strong>${goal}</strong>.</p>
      <p>Start with the core relationships you can actually observe or discuss with partners now. You do not need a complete system map on the first pass.</p>
    `;
  }

  function renderSummary(data) {
    summaryTargets.basics.innerHTML = `
      <dl>
        <div><dt>Project</dt><dd>${data.projectName || "Not provided yet"}</dd></div>
        <div><dt>Island / location</dt><dd>${data.island || "Not selected yet"}</dd></div>
        <div><dt>NBS type</dt><dd>${data.nbsType || "Not selected yet"}</dd></div>
        <div><dt>Evaluation goal</dt><dd>${data.evaluationGoal || "Not selected yet"}</dd></div>
      </dl>
    `;

    summaryTargets.risks.innerHTML = toList(
      data.climateHazards,
      "No climate hazards selected yet."
    );

    summaryTargets.social.innerHTML = toList(
      data.socialChallenges,
      "No social challenges selected yet."
    );

    summaryTargets.monitoring.innerHTML = `
      <p><strong>${data.monitoringLevel || "Not selected yet"}</strong></p>
      <p>${monitoringMessage(data.monitoringLevel)}</p>
    `;

    summaryTargets.focus.innerHTML = focusMessage(data);

    summary.hidden = false;
  }

  function openIntake() {
    if (!intakeSection) {
      return;
    }

    intakeSection.hidden = false;
    intakeSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateSelections() {
    if (!getValues("climateHazards").length) {
      window.alert("Please select at least one climate hazard.");
      return false;
    }

    return true;
  }

  form.addEventListener("change", saveDraft);
  form.addEventListener("input", saveDraft);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity() || !validateSelections()) {
      return;
    }

    const data = saveDraft();
    renderSummary(data);
    summary.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (openIntakeButton) {
    openIntakeButton.addEventListener("click", openIntake);
  }

  const restored = restoreDraft();
  if (restored && restored.projectName) {
    if (intakeSection) {
      intakeSection.hidden = false;
    }
    renderSummary(restored);
  }
})();
