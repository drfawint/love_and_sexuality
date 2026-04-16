const dashboardData = window.BILENDI_DASHBOARD_DATA;

if (!dashboardData || !dashboardData.records || !dashboardData.meta) {
  throw new Error("Dashboard data not found. Run build_dashboard_data.R first.");
}

const { meta, records } = dashboardData;
const outcomeMap = new Map(meta.outcomeVariables.map((item) => [item.key, item]));
const palette = ["#0028A5", "#365DD5", "#1B214A", "#5972C5", "#666666", "#007E2A"];
const identityOutcomeKeys = ["identity", "identityimportance", "identitythink"];
const relationshipOutcomeKeys = ["currentlyinrel", "monoslidercur", "monosliderpast"];
const bivariateVariables = [
  { key: "gender", label: "Geschlecht", categories: meta.genderOptions },
  { key: "ageGroup", label: "Altersgruppe", categories: meta.ageOptions },
  { key: "educationBucket", label: "Bildungsgruppe", categories: meta.educationBucketOptions },
  ...meta.outcomeVariables,
];
const bivariateMap = new Map(bivariateVariables.map((item) => [item.key, item]));

const allEducationBuckets = [...meta.educationBucketOptions];
const allGenderOptions = [...meta.genderOptions];

const state = {
  overallExperienceSort: "prevalence",
  overallIdentityOutcome: identityOutcomeKeys[0],
  overallRelationshipOutcome: relationshipOutcomeKeys[0],
  experienceSort: "gap",
  selectedIdentityOutcome: identityOutcomeKeys[0],
  selectedRelationshipOutcome: relationshipOutcomeKeys[0],
  bivariateRow: "gender",
  bivariateCol: "identity",
  groupA: {
    label: "Frauen",
    genders: ["Weiblich"],
    ageGroup: "all",
    educationBuckets: [...allEducationBuckets],
  },
  groupB: {
    label: "Männer",
    genders: ["Männlich"],
    ageGroup: "all",
    educationBuckets: [...allEducationBuckets],
  },
};

const ui = {
  overallMetricsGrid: document.getElementById("overall-metrics-grid"),
  overallIdentityOutcomeSelect: document.getElementById("overall-identity-outcome-select"),
  overallIdentityQuestionText: document.getElementById("overall-identity-question-text"),
  overallIdentityStackedWrapper: document.getElementById("overall-identity-stacked-wrapper"),
  overallIdentityCategoryTable: document.getElementById("overall-identity-category-table"),
  overallRelationshipOutcomeSelect: document.getElementById("overall-relationship-outcome-select"),
  overallRelationshipQuestionText: document.getElementById("overall-relationship-question-text"),
  overallRelationshipStackedWrapper: document.getElementById("overall-relationship-stacked-wrapper"),
  overallRelationshipCategoryTable: document.getElementById("overall-relationship-category-table"),
  overallExperienceSort: document.getElementById("overall-experience-sort"),
  overallExperienceMeta: document.getElementById("overall-experience-meta"),
  overallExperienceChart: document.getElementById("overall-experience-chart"),
  groupAControls: document.getElementById("group-a-controls"),
  groupBControls: document.getElementById("group-b-controls"),
  metricsGrid: document.getElementById("metrics-grid"),
  experienceMeta: document.getElementById("experience-meta"),
  experienceChart: document.getElementById("experience-chart"),
  identityOutcomeSelect: document.getElementById("identity-outcome-select"),
  identityQuestionText: document.getElementById("identity-question-text"),
  identityStackedWrapper: document.getElementById("identity-stacked-wrapper"),
  identityCategoryTable: document.getElementById("identity-category-table"),
  relationshipOutcomeSelect: document.getElementById("relationship-outcome-select"),
  relationshipQuestionText: document.getElementById("relationship-question-text"),
  relationshipStackedWrapper: document.getElementById("relationship-stacked-wrapper"),
  relationshipCategoryTable: document.getElementById("relationship-category-table"),
  experienceSort: document.getElementById("experience-sort"),
  bivariateRowSelect: document.getElementById("bivariate-row-select"),
  bivariateColSelect: document.getElementById("bivariate-col-select"),
  bivariateRowQuestionText: document.getElementById("bivariate-row-question-text"),
  bivariateColQuestionText: document.getElementById("bivariate-col-question-text"),
  bivariateMeta: document.getElementById("bivariate-meta"),
  bivariateTable: document.getElementById("bivariate-table"),
  heroSampleSize: document.getElementById("hero-sample-size"),
};

function formatPct(value) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

function formatPp(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")} pp`;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function unique(values) {
  return [...new Set(values)];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appendSelectOptions(selectElement, items) {
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.key;
    option.textContent = item.label;
    selectElement.appendChild(option);
  });
}

function appendChildren(parent, children) {
  children.forEach((child) => parent.appendChild(child));
}

function getVariableConfig(key) {
  return bivariateMap.get(key) || outcomeMap.get(key) || null;
}

function renderQuestionText(target, selectedKey, prefix = "Originalfrage") {
  const questionText = getVariableConfig(selectedKey)?.questionText;

  if (!questionText) {
    target.hidden = true;
    target.innerHTML = "";
    return;
  }

  target.hidden = false;
  target.innerHTML = `
    <span class="selected-question-label">${escapeHtml(prefix)}</span>
    ${escapeHtml(questionText)}
  `;
}

function experienceValues(record) {
  if (Array.isArray(record.experiencewith)) {
    return record.experiencewith.filter(Boolean);
  }
  if (typeof record.experiencewith === "string" && record.experiencewith) {
    return [record.experiencewith];
  }
  return [];
}

function describeGroup(group) {
  const parts = [];
  parts.push(group.genders.length === allGenderOptions.length ? "alle Geschlechter" : group.genders.join(" + "));
  parts.push(group.ageGroup === "all" ? "alle Altersgruppen" : group.ageGroup);
  parts.push(group.educationBuckets.length === allEducationBuckets.length ? "alle Bildungsgruppen" : group.educationBuckets.join(" + "));
  return parts;
}

function getGroupLabel(group, fallback) {
  const label = group.label.trim();
  return label || fallback;
}

function matchesGroup(record, group) {
  if (!group.genders.includes(record.gender)) {
    return false;
  }
  if (group.ageGroup !== "all" && record.ageGroup !== group.ageGroup) {
    return false;
  }
  if (!group.educationBuckets.includes(record.educationBucket)) {
    return false;
  }
  return true;
}

function filterRecords(group) {
  return records.filter((record) => matchesGroup(record, group));
}

function valueShares(groupRecords, key, categories) {
  const valid = groupRecords.filter((record) => Boolean(record[key]));
  const denominator = valid.length;
  const shares = categories.map((category) => {
    const count = valid.filter((record) => record[key] === category).length;
    return {
      category,
      count,
      pct: denominator ? (count / denominator) * 100 : 0,
    };
  });
  return { denominator, shares };
}

function experienceShares(groupRecords) {
  const valid = groupRecords.filter((record) => experienceValues(record).length > 0);
  const denominator = valid.length;
  const rows = meta.experienceItems.map((item) => {
    const count = valid.filter((record) => experienceValues(record).includes(item)).length;
    return {
      item,
      count,
      pct: denominator ? (count / denominator) * 100 : 0,
    };
  });
  return { denominator, rows };
}

function renderOverallMetrics(allRecords) {
  const validRelationship = allRecords.filter((record) => Boolean(record.currentlyinrel));
  const inRelationship = validRelationship.filter((record) => ["Ja, eine", "Ja, mehrere"].includes(record.currentlyinrel));
  const inRelationshipShare = validRelationship.length ? (inRelationship.length / validRelationship.length) * 100 : 0;

  const cards = [
    {
      title: "Gesamtstichprobe",
      value: `${meta.sampleSize}`,
      sub: "Fälle ohne Filterung",
    },
    {
      title: "Medianalter",
      value: `${meta.medianAge}`,
      sub: "Jahre",
    },
    {
      title: "Aktuell in Beziehung",
      value: formatPct(inRelationshipShare),
      sub: `Ja, eine oder mehrere Beziehungen | gültige Angaben n = ${validRelationship.length}`,
    },
    {
      title: "Erfasste Beziehungstypen",
      value: `${meta.experienceItems.length}`,
      sub: "Kategorien im Erfahrungsmodul",
    },
  ];

  ui.overallMetricsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <div class="metric-title">${escapeHtml(card.title)}</div>
          <div class="metric-value">${card.value}</div>
          <div class="metric-sub">${escapeHtml(card.sub)}</div>
        </article>
      `
    )
    .join("");
}

function renderSingleOutcomeChart(groupRecords, selectedKey, stackedWrapper, categoryTable, label = "Gesamtstichprobe") {
  const config = outcomeMap.get(selectedKey);
  const distribution = valueShares(groupRecords, config.key, config.categories);

  const segments = distribution.shares
    .map((share, index) => {
      const width = clamp(share.pct);
      const text = width >= 11 ? `<span>${Math.round(width)}%</span>` : "";
      return `<div class="stack-segment" style="width:${width}%; background:${palette[index % palette.length]}" title="${share.category}: ${formatPct(share.pct)}">${text}</div>`;
    })
    .join("");

  stackedWrapper.innerHTML = `
    <article class="stack-card single">
      <h3>${escapeHtml(label)}</h3>
      <div class="stack-bar">${segments}</div>
      <div class="stack-meta">Gültige Angaben n = ${distribution.denominator}</div>
    </article>
  `;

  const rows = config.categories
    .map((category, index) => {
      const share = distribution.shares[index];
      return `
        <div class="category-row single">
          <div class="category-label">
            <span class="swatch" style="background:${palette[index % palette.length]}"></span>
            <span>${escapeHtml(category)}</span>
          </div>
          <div class="numeric">${share.count}</div>
          <div class="numeric">${formatPct(share.pct)}</div>
        </div>
      `;
    })
    .join("");

  categoryTable.innerHTML = `
    <div class="category-header single">
      <div>${escapeHtml(config.label)}</div>
      <div class="numeric">n</div>
      <div class="numeric">Anteil</div>
    </div>
    ${rows}
  `;
}

function renderOverallExperienceChart(allRecords) {
  const overall = experienceShares(allRecords);
  const rows = [...overall.rows];

  rows.sort((left, right) => {
    if (state.overallExperienceSort === "alphabetical") {
      return left.item.localeCompare(right.item, "de");
    }
    return right.pct - left.pct;
  });

  ui.overallExperienceMeta.innerHTML = `
    <span class="chip">Gültige Angaben n = ${overall.denominator}</span>
    <span class="chip">Anteil innerhalb der Fälle mit gültigen Erfahrungangaben</span>
  `;

  ui.overallExperienceChart.innerHTML = rows
    .map(
      (row) => `
        <div class="experience-row overall">
          <div class="experience-label">${escapeHtml(row.item)}</div>
          <div class="bar-track" title="${formatPct(row.pct)}">
            <div class="bar-fill overall" style="width:${clamp(row.pct)}%"></div>
          </div>
          <div class="experience-values">
            <strong>${formatPct(row.pct)}</strong>
            <span>n = ${row.count}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function buildCheckboxGroup(namePrefix, values, selectedValues, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "option-grid";

  values.forEach((value) => {
    const label = document.createElement("label");
    label.className = "option-pill";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = `${namePrefix}-${value}`;
    input.value = value;
    input.checked = selectedValues.includes(value);
    input.addEventListener("change", () => onChange(value, input.checked, input));
    const text = document.createElement("span");
    text.textContent = value;
    appendChildren(label, [input, text]);
    wrapper.appendChild(label);
  });

  return wrapper;
}

function buildAgeToggle(namePrefix, selectedValue, onChange) {
  const options = [
    { value: "all", label: "Alle" },
    { value: meta.ageOptions[0], label: meta.ageOptions[0] },
    { value: meta.ageOptions[1], label: meta.ageOptions[1] },
  ];
  const wrapper = document.createElement("div");
  wrapper.className = "option-grid";

  options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "age-pill";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${namePrefix}-age`;
    input.value = option.value;
    input.checked = selectedValue === option.value;
    input.addEventListener("change", () => onChange(option.value));
    const text = document.createElement("span");
    text.textContent = option.label;
    appendChildren(label, [input, text]);
    wrapper.appendChild(label);
  });

  return wrapper;
}

function renderGroupControls(target, stateKey, fallbackLabel) {
  const group = state[stateKey];
  target.innerHTML = "";

  const form = document.createElement("div");
  form.className = "group-form";

  const labelWrap = document.createElement("div");
  labelWrap.className = "group-section";
  const labelLabel = document.createElement("label");
  const labelHint = document.createElement("span");
  labelHint.className = "control-help";
  labelHint.textContent = "Gruppenname";
  const textInput = document.createElement("input");
  textInput.className = "text-input";
  textInput.type = "text";
  textInput.value = getGroupLabel(group, fallbackLabel);
  textInput.placeholder = fallbackLabel;
  appendChildren(labelLabel, [labelHint, textInput]);
  labelWrap.appendChild(labelLabel);
  textInput.addEventListener("input", (event) => {
    state[stateKey].label = event.target.value;
    renderAll();
  });
  form.appendChild(labelWrap);

  const genderSection = document.createElement("div");
  genderSection.className = "group-section";
  const genderHeader = document.createElement("div");
  genderHeader.className = "group-section-header";
  genderHeader.innerHTML = `<span class="control-help">Geschlecht</span>`;
  const genderAllBtn = document.createElement("button");
  genderAllBtn.className = "select-all-btn";
  genderAllBtn.type = "button";
  genderAllBtn.textContent = "Alle";
  genderAllBtn.addEventListener("click", () => {
    state[stateKey].genders = [...allGenderOptions];
    renderAll();
  });
  genderHeader.appendChild(genderAllBtn);
  genderSection.appendChild(genderHeader);
  genderSection.appendChild(
    buildCheckboxGroup(`${stateKey}-gender`, allGenderOptions, group.genders, (value, checked, input) => {
      const next = checked
        ? unique([...state[stateKey].genders, value])
        : state[stateKey].genders.filter((item) => item !== value);
      if (!next.length) {
        input.checked = true;
        return;
      }
      state[stateKey].genders = next;
      renderAll();
    })
  );
  form.appendChild(genderSection);

  const ageSection = document.createElement("div");
  ageSection.className = "group-section";
  ageSection.innerHTML = `<span class="control-help">Alter</span>`;
  ageSection.appendChild(
    buildAgeToggle(stateKey, group.ageGroup, (value) => {
      state[stateKey].ageGroup = value;
      renderAll();
    })
  );
  form.appendChild(ageSection);

  const educationSection = document.createElement("div");
  educationSection.className = "group-section";
  const educationHeader = document.createElement("div");
  educationHeader.className = "group-section-header";
  educationHeader.innerHTML = `<span class="control-help">Bildung</span>`;
  const educationAllBtn = document.createElement("button");
  educationAllBtn.className = "select-all-btn";
  educationAllBtn.type = "button";
  educationAllBtn.textContent = "Alle";
  educationAllBtn.addEventListener("click", () => {
    state[stateKey].educationBuckets = [...allEducationBuckets];
    renderAll();
  });
  educationHeader.appendChild(educationAllBtn);
  educationSection.appendChild(educationHeader);
  educationSection.appendChild(
    buildCheckboxGroup(`${stateKey}-education`, allEducationBuckets, group.educationBuckets, (value, checked, input) => {
      const next = checked
        ? unique([...state[stateKey].educationBuckets, value])
        : state[stateKey].educationBuckets.filter((item) => item !== value);
      if (!next.length) {
        input.checked = true;
        return;
      }
      state[stateKey].educationBuckets = next;
      renderAll();
    })
  );
  form.appendChild(educationSection);

  const summary = document.createElement("div");
  summary.className = "group-section";
  summary.innerHTML = `<span class="control-help">Aktive Filter</span>`;
  const summaryStack = document.createElement("div");
  summaryStack.className = "summary-stack";
  describeGroup(group).forEach((part) => {
    const pill = document.createElement("span");
    pill.className = "summary-pill";
    pill.textContent = part;
    summaryStack.appendChild(pill);
  });
  summary.appendChild(summaryStack);
  form.appendChild(summary);

  target.appendChild(form);
}

function renderMetrics(groupARecords, groupBRecords) {
  const groupALabel = getGroupLabel(state.groupA, "Gruppe A");
  const groupBLabel = getGroupLabel(state.groupB, "Gruppe B");

  const cards = [
    {
      title: groupALabel,
      value: `${groupARecords.length}`,
      sub: describeGroup(state.groupA).join(" · "),
    },
    {
      title: groupBLabel,
      value: `${groupBRecords.length}`,
      sub: describeGroup(state.groupB).join(" · "),
    },
  ];

  ui.metricsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <div class="metric-title">${escapeHtml(card.title)}</div>
          <div class="metric-value">${card.value}</div>
          <div class="metric-sub">${escapeHtml(card.sub)}</div>
        </article>
      `
    )
    .join("");
}

function renderExperienceChart(groupARecords, groupBRecords) {
  const groupALabel = getGroupLabel(state.groupA, "Gruppe A");
  const groupBLabel = getGroupLabel(state.groupB, "Gruppe B");
  const expA = experienceShares(groupARecords);
  const expB = experienceShares(groupBRecords);

  const rows = meta.experienceItems.map((item, index) => ({
    item,
    pctA: expA.rows[index].pct,
    pctB: expB.rows[index].pct,
    gap: expA.rows[index].pct - expB.rows[index].pct,
  }));

  rows.sort((left, right) => {
    if (state.experienceSort === "prevalence") {
      return Math.max(right.pctA, right.pctB) - Math.max(left.pctA, left.pctB);
    }
    return Math.abs(right.gap) - Math.abs(left.gap);
  });

  ui.experienceMeta.innerHTML = `
    <span class="chip">${escapeHtml(groupALabel)}: gültige Angaben n = ${expA.denominator}</span>
    <span class="chip">${escapeHtml(groupBLabel)}: gültige Angaben n = ${expB.denominator}</span>
    <span class="chip">Anteil innerhalb der jeweiligen Subgruppe</span>
  `;

  ui.experienceChart.innerHTML = rows
    .map(
      (row) => `
        <div class="experience-row">
          <div class="experience-label">${escapeHtml(row.item)}</div>
          <div class="bar-track" title="${escapeHtml(groupALabel)}: ${formatPct(row.pctA)}">
            <div class="bar-fill a" style="width:${clamp(row.pctA)}%"></div>
          </div>
          <div class="bar-track" title="${escapeHtml(groupBLabel)}: ${formatPct(row.pctB)}">
            <div class="bar-fill b" style="width:${clamp(row.pctB)}%"></div>
          </div>
          <div class="experience-values">
            <strong>${formatPp(row.gap)}</strong>
            <span>${formatPct(row.pctA)} vs. ${formatPct(row.pctB)}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function renderOutcomeChart(groupARecords, groupBRecords, selectedKey, stackedWrapper, categoryTable) {
  const config = outcomeMap.get(selectedKey);
  const distA = valueShares(groupARecords, config.key, config.categories);
  const distB = valueShares(groupBRecords, config.key, config.categories);
  const groupALabel = getGroupLabel(state.groupA, "Gruppe A");
  const groupBLabel = getGroupLabel(state.groupB, "Gruppe B");

  const bars = [
    { label: groupALabel, distribution: distA },
    { label: groupBLabel, distribution: distB },
  ];

  stackedWrapper.innerHTML = bars
    .map(({ label, distribution }) => {
      const segments = distribution.shares
        .map((share, index) => {
          const width = clamp(share.pct);
          const text = width >= 11 ? `<span>${Math.round(width)}%</span>` : "";
          return `<div class="stack-segment" style="width:${width}%; background:${palette[index % palette.length]}" title="${share.category}: ${formatPct(share.pct)}">${text}</div>`;
        })
        .join("");

      return `
        <article class="stack-card">
          <h3>${escapeHtml(label)}</h3>
          <div class="stack-bar">${segments}</div>
          <div class="stack-meta">Gültige Angaben n = ${distribution.denominator}</div>
        </article>
      `;
    })
    .join("");

  const rows = config.categories.map((category, index) => {
    const pctA = distA.shares[index].pct;
    const pctB = distB.shares[index].pct;
    const delta = pctA - pctB;
    const deltaClass = delta >= 0 ? "delta-pos" : "delta-neg";
    return `
      <div class="category-row">
        <div class="category-label">
          <span class="swatch" style="background:${palette[index % palette.length]}"></span>
          <span>${escapeHtml(category)}</span>
        </div>
        <div class="numeric">${formatPct(pctA)}</div>
        <div class="numeric">${formatPct(pctB)}</div>
        <div class="numeric ${deltaClass}">${formatPp(delta)}</div>
      </div>
    `;
  });

  categoryTable.innerHTML = `
    <div class="category-header">
      <div>${escapeHtml(config.label)}</div>
      <div class="numeric">${escapeHtml(groupALabel)}</div>
      <div class="numeric">${escapeHtml(groupBLabel)}</div>
      <div class="numeric">Differenz</div>
    </div>
    ${rows.join("")}
  `;
}

function renderBivariateTable(allRecords) {
  const rowConfig = bivariateMap.get(state.bivariateRow);
  const colConfig = bivariateMap.get(state.bivariateCol);
  const validRecords = allRecords.filter((record) => Boolean(record[rowConfig.key]) && Boolean(record[colConfig.key]));

  ui.bivariateMeta.innerHTML = `
    <span class="chip">Gültige Fälle für beide Variablen: n = ${validRecords.length}</span>
    <span class="chip">Zellen zeigen Häufigkeiten und Zeilenprozente</span>
  `;

  if (!validRecords.length) {
    ui.bivariateTable.innerHTML = `<p class="block-copy">Keine gemeinsamen gültigen Angaben für diese Variablenkombination.</p>`;
    return;
  }

  const rowTotals = rowConfig.categories.map(
    (rowCategory) => validRecords.filter((record) => record[rowConfig.key] === rowCategory).length
  );
  const colTotals = colConfig.categories.map(
    (colCategory) => validRecords.filter((record) => record[colConfig.key] === colCategory).length
  );

  const bodyRows = rowConfig.categories
    .map((rowCategory, rowIndex) => {
      const rowSubset = validRecords.filter((record) => record[rowConfig.key] === rowCategory);
      const rowTotal = rowTotals[rowIndex];
      const cells = colConfig.categories
        .map((colCategory) => {
          const count = rowSubset.filter((record) => record[colConfig.key] === colCategory).length;
          const pct = rowTotal ? (count / rowTotal) * 100 : 0;
          const alpha = Math.min(0.88, 0.06 + (pct / 100) * 0.72);
          const textColor = pct >= 52 ? "#ffffff" : "#121212";
          return `
            <td class="bivariate-cell" style="background: rgba(0, 40, 165, ${alpha}); color: ${textColor};">
              <strong>${count}</strong>
              <span>${formatPct(pct)}</span>
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <th scope="row">
            <span class="bivariate-header-label">${escapeHtml(rowCategory)}</span>
            <span class="bivariate-header-sub">n = ${rowTotal}</span>
          </th>
          ${cells}
          <td>
            <strong class="bivariate-total">${rowTotal}</strong>
            <span class="bivariate-total-sub">100,0 %</span>
          </td>
        </tr>
      `;
    })
    .join("");

  const footerTotals = colTotals
    .map((count) => {
      const pct = validRecords.length ? (count / validRecords.length) * 100 : 0;
      return `
        <td>
          <strong class="bivariate-total">${count}</strong>
          <span class="bivariate-total-sub">${formatPct(pct)}</span>
        </td>
      `;
    })
    .join("");

  const headerColumns = colConfig.categories
    .map((category, index) => {
      const pct = validRecords.length ? (colTotals[index] / validRecords.length) * 100 : 0;
      return `
        <th scope="col">
          <span class="bivariate-header-label">${escapeHtml(category)}</span>
          <span class="bivariate-header-sub">n = ${colTotals[index]} | ${formatPct(pct)}</span>
        </th>
      `;
    })
    .join("");

  ui.bivariateTable.innerHTML = `
    <table class="bivariate-table">
      <thead>
        <tr>
          <th scope="col">${escapeHtml(rowConfig.label)} \ ${escapeHtml(colConfig.label)}</th>
          ${headerColumns}
          <th scope="col">Zeilensumme</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Spaltensumme</th>
          ${footerTotals}
          <td>
            <strong class="bivariate-total">${validRecords.length}</strong>
            <span class="bivariate-total-sub">100,0 %</span>
          </td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderAll() {
  renderOverallMetrics(records);
  renderQuestionText(ui.overallIdentityQuestionText, state.overallIdentityOutcome);
  renderQuestionText(ui.overallRelationshipQuestionText, state.overallRelationshipOutcome);
  renderSingleOutcomeChart(
    records,
    state.overallIdentityOutcome,
    ui.overallIdentityStackedWrapper,
    ui.overallIdentityCategoryTable
  );
  renderSingleOutcomeChart(
    records,
    state.overallRelationshipOutcome,
    ui.overallRelationshipStackedWrapper,
    ui.overallRelationshipCategoryTable
  );
  renderOverallExperienceChart(records);

  renderGroupControls(ui.groupAControls, "groupA", "Gruppe A");
  renderGroupControls(ui.groupBControls, "groupB", "Gruppe B");

  const groupARecords = filterRecords(state.groupA);
  const groupBRecords = filterRecords(state.groupB);

  renderMetrics(groupARecords, groupBRecords);
  renderExperienceChart(groupARecords, groupBRecords);
  renderQuestionText(ui.identityQuestionText, state.selectedIdentityOutcome);
  renderQuestionText(ui.relationshipQuestionText, state.selectedRelationshipOutcome);
  renderOutcomeChart(
    groupARecords,
    groupBRecords,
    state.selectedIdentityOutcome,
    ui.identityStackedWrapper,
    ui.identityCategoryTable
  );
  renderOutcomeChart(
    groupARecords,
    groupBRecords,
    state.selectedRelationshipOutcome,
    ui.relationshipStackedWrapper,
    ui.relationshipCategoryTable
  );
  renderQuestionText(ui.bivariateRowQuestionText, state.bivariateRow, "Zeilenfrage");
  renderQuestionText(ui.bivariateColQuestionText, state.bivariateCol, "Spaltenfrage");
  renderBivariateTable(records);
}

function init() {
  ui.heroSampleSize.textContent = `${meta.sampleSize} Fälle`;

  appendSelectOptions(
    ui.overallIdentityOutcomeSelect,
    identityOutcomeKeys.map((key) => outcomeMap.get(key))
  );
  appendSelectOptions(
    ui.overallRelationshipOutcomeSelect,
    relationshipOutcomeKeys.map((key) => outcomeMap.get(key))
  );
  appendSelectOptions(ui.identityOutcomeSelect, identityOutcomeKeys.map((key) => outcomeMap.get(key)));
  appendSelectOptions(
    ui.relationshipOutcomeSelect,
    relationshipOutcomeKeys.map((key) => outcomeMap.get(key))
  );
  appendSelectOptions(ui.bivariateRowSelect, bivariateVariables);
  appendSelectOptions(ui.bivariateColSelect, bivariateVariables);

  ui.overallIdentityOutcomeSelect.value = state.overallIdentityOutcome;
  ui.overallIdentityOutcomeSelect.addEventListener("change", (event) => {
    state.overallIdentityOutcome = event.target.value;
    renderAll();
  });

  ui.overallRelationshipOutcomeSelect.value = state.overallRelationshipOutcome;
  ui.overallRelationshipOutcomeSelect.addEventListener("change", (event) => {
    state.overallRelationshipOutcome = event.target.value;
    renderAll();
  });

  ui.identityOutcomeSelect.value = state.selectedIdentityOutcome;
  ui.identityOutcomeSelect.addEventListener("change", (event) => {
    state.selectedIdentityOutcome = event.target.value;
    renderAll();
  });

  ui.relationshipOutcomeSelect.value = state.selectedRelationshipOutcome;
  ui.relationshipOutcomeSelect.addEventListener("change", (event) => {
    state.selectedRelationshipOutcome = event.target.value;
    renderAll();
  });

  ui.bivariateRowSelect.value = state.bivariateRow;
  ui.bivariateRowSelect.addEventListener("change", (event) => {
    state.bivariateRow = event.target.value;
    renderAll();
  });

  ui.bivariateColSelect.value = state.bivariateCol;
  ui.bivariateColSelect.addEventListener("change", (event) => {
    state.bivariateCol = event.target.value;
    renderAll();
  });

  ui.overallExperienceSort.addEventListener("change", (event) => {
    state.overallExperienceSort = event.target.value;
    renderAll();
  });

  ui.experienceSort.addEventListener("change", (event) => {
    state.experienceSort = event.target.value;
    renderAll();
  });

  renderAll();
}

init();