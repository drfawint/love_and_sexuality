const dashboardData = window.BILENDI_DASHBOARD_DATA;

if (!dashboardData || !dashboardData.records || !dashboardData.meta) {
  throw new Error("Dashboard data not found. Run build_dashboard_data.R first.");
}

const { meta, records } = dashboardData;
const outcomeMap = new Map(meta.outcomeVariables.map((item) => [item.key, item]));
const palette = ["#df6d3b", "#2f7f7a", "#e0aa3e", "#728a62", "#9d5f80", "#65758b"];

const allEducationBuckets = [...meta.educationBucketOptions];
const allGenderOptions = [...meta.genderOptions];

const state = {
  experienceSort: "gap",
  selectedOutcome: meta.outcomeVariables[0].key,
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
  groupAControls: document.getElementById("group-a-controls"),
  groupBControls: document.getElementById("group-b-controls"),
  metricsGrid: document.getElementById("metrics-grid"),
  insightCard: document.getElementById("insight-card"),
  experienceMeta: document.getElementById("experience-meta"),
  experienceChart: document.getElementById("experience-chart"),
  outcomeSelect: document.getElementById("outcome-select"),
  stackedWrapper: document.getElementById("stacked-wrapper"),
  categoryTable: document.getElementById("category-table"),
  experienceSort: document.getElementById("experience-sort"),
  educationNote: document.getElementById("education-note"),
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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const valid = groupRecords.filter((record) => Array.isArray(record.experiencewith) && record.experiencewith.length > 0);
  const denominator = valid.length;
  const rows = meta.experienceItems.map((item) => {
    const count = valid.filter((record) => record.experiencewith.includes(item)).length;
    return {
      item,
      count,
      pct: denominator ? (count / denominator) * 100 : 0,
    };
  });
  return { denominator, rows };
}

function getLargestExperienceGap(groupARecords, groupBRecords) {
  const expA = experienceShares(groupARecords);
  const expB = experienceShares(groupBRecords);
  const merged = expA.rows.map((row, index) => ({
    item: row.item,
    pctA: row.pct,
    pctB: expB.rows[index].pct,
    gap: row.pct - expB.rows[index].pct,
  }));
  merged.sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap));
  return merged[0];
}

function getLargestOutcomeGap(groupARecords, groupBRecords, key) {
  const config = outcomeMap.get(key);
  const distA = valueShares(groupARecords, key, config.categories);
  const distB = valueShares(groupBRecords, key, config.categories);
  const merged = config.categories.map((category, index) => ({
    category,
    pctA: distA.shares[index].pct,
    pctB: distB.shares[index].pct,
    gap: distA.shares[index].pct - distB.shares[index].pct,
  }));
  merged.sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap));
  return merged[0];
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
    label.append(input, text);
    wrapper.append(label);
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
    label.append(input, text);
    wrapper.append(label);
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
  labelLabel.append(labelHint, textInput);
  labelWrap.append(labelLabel);
  textInput.addEventListener("input", (event) => {
    state[stateKey].label = event.target.value;
    renderAll();
  });
  form.append(labelWrap);

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
  genderHeader.append(genderAllBtn);
  genderSection.append(genderHeader);
  genderSection.append(
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
  form.append(genderSection);

  const ageSection = document.createElement("div");
  ageSection.className = "group-section";
  ageSection.innerHTML = `<span class="control-help">Alter</span>`;
  ageSection.append(
    buildAgeToggle(stateKey, group.ageGroup, (value) => {
      state[stateKey].ageGroup = value;
      renderAll();
    })
  );
  form.append(ageSection);

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
  educationHeader.append(educationAllBtn);
  educationSection.append(educationHeader);
  educationSection.append(
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
  form.append(educationSection);

  const summary = document.createElement("div");
  summary.className = "group-section";
  summary.innerHTML = `<span class="control-help">Aktive Filter</span>`;
  const summaryStack = document.createElement("div");
  summaryStack.className = "summary-stack";
  describeGroup(group).forEach((part) => {
    const pill = document.createElement("span");
    pill.className = "summary-pill";
    pill.textContent = part;
    summaryStack.append(pill);
  });
  summary.append(summaryStack);
  form.append(summary);

  target.append(form);
}

function renderMetrics(groupARecords, groupBRecords) {
  const groupALabel = getGroupLabel(state.groupA, "Gruppe A");
  const groupBLabel = getGroupLabel(state.groupB, "Gruppe B");
  const topGap = getLargestExperienceGap(groupARecords, groupBRecords);
  const topOutcome = getLargestOutcomeGap(groupARecords, groupBRecords, state.selectedOutcome);

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
    {
      title: "Größte Differenz bei Erfahrungen",
      value: formatPp(topGap ? topGap.gap : 0),
      sub: topGap ? topGap.item : "Keine ausreichenden Daten",
    },
    {
      title: "Größte Differenz in der gewählten Variable",
      value: formatPp(topOutcome ? topOutcome.gap : 0),
      sub: topOutcome ? topOutcome.category : "Keine ausreichenden Daten",
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

function renderInsights(groupARecords, groupBRecords) {
  const groupALabel = getGroupLabel(state.groupA, "Gruppe A");
  const groupBLabel = getGroupLabel(state.groupB, "Gruppe B");
  const topGap = getLargestExperienceGap(groupARecords, groupBRecords);
  const topOutcome = getLargestOutcomeGap(groupARecords, groupBRecords, state.selectedOutcome);
  const outcomeConfig = outcomeMap.get(state.selectedOutcome);

  ui.insightCard.innerHTML = `
    <div class="section-head compact">
      <div>
        <p class="section-kicker">Sofort lesbar</p>
        <h2>Automatische Lesart der aktuellen Gegenüberstellung</h2>
      </div>
    </div>
    <div class="insight-grid">
      <div class="insight-box">
        <span class="section-kicker">Stärkste Erfahrungsdifferenz</span>
        <strong>${escapeHtml(topGap ? topGap.item : "Keine ausreichenden Daten")}</strong>
        <p>${escapeHtml(topGap ? `${groupALabel} liegt ${formatPp(topGap.gap)} vor ${groupBLabel}.` : "Für diese Filterung liegen zu wenige gültige Angaben vor.")}</p>
      </div>
      <div class="insight-box">
        <span class="section-kicker">Stärkste Differenz in ${escapeHtml(outcomeConfig.label)}</span>
        <strong>${escapeHtml(topOutcome ? topOutcome.category : "Keine ausreichenden Daten")}</strong>
        <p>${escapeHtml(topOutcome ? `${groupALabel} liegt ${formatPp(topOutcome.gap)} vor ${groupBLabel}.` : "Für diese Variable liegen zu wenige gültige Angaben vor.")}</p>
      </div>
      <div class="insight-box">
        <span class="section-kicker">Subgruppenlogik</span>
        <strong>Medianalter, Geschlecht, Bildung</strong>
        <p>Die Gruppen können frei kombiniert werden, etwa Frauen vs. Männer, junge Frauen vs. junge Männer oder akademisch/studiennah vs. ohne Uni-Abschluss.</p>
      </div>
    </div>
  `;
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

function renderOutcomeChart(groupARecords, groupBRecords) {
  const config = outcomeMap.get(state.selectedOutcome);
  const distA = valueShares(groupARecords, config.key, config.categories);
  const distB = valueShares(groupBRecords, config.key, config.categories);
  const groupALabel = getGroupLabel(state.groupA, "Gruppe A");
  const groupBLabel = getGroupLabel(state.groupB, "Gruppe B");

  const bars = [
    { label: groupALabel, distribution: distA },
    { label: groupBLabel, distribution: distB },
  ];

  ui.stackedWrapper.innerHTML = bars
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

  ui.categoryTable.innerHTML = `
    <div class="category-header">
      <div>${escapeHtml(config.label)}</div>
      <div class="numeric">${escapeHtml(groupALabel)}</div>
      <div class="numeric">${escapeHtml(groupBLabel)}</div>
      <div class="numeric">Differenz</div>
    </div>
    ${rows.join("")}
  `;
}

function applyPreset(presetKey) {
  switch (presetKey) {
    case "women-men":
      state.groupA = {
        label: "Frauen",
        genders: ["Weiblich"],
        ageGroup: "all",
        educationBuckets: [...allEducationBuckets],
      };
      state.groupB = {
        label: "Männer",
        genders: ["Männlich"],
        ageGroup: "all",
        educationBuckets: [...allEducationBuckets],
      };
      break;
    case "young-women-young-men":
      state.groupA = {
        label: "Junge Frauen",
        genders: ["Weiblich"],
        ageGroup: meta.ageOptions[0],
        educationBuckets: [...allEducationBuckets],
      };
      state.groupB = {
        label: "Junge Männer",
        genders: ["Männlich"],
        ageGroup: meta.ageOptions[0],
        educationBuckets: [...allEducationBuckets],
      };
      break;
    case "young-old":
      state.groupA = {
        label: "Jünger / gleich Median",
        genders: [...allGenderOptions],
        ageGroup: meta.ageOptions[0],
        educationBuckets: [...allEducationBuckets],
      };
      state.groupB = {
        label: "Älter als Median",
        genders: [...allGenderOptions],
        ageGroup: meta.ageOptions[1],
        educationBuckets: [...allEducationBuckets],
      };
      break;
    case "academic-nonacademic":
      state.groupA = {
        label: "Uni / studiennah",
        genders: [...allGenderOptions],
        ageGroup: "all",
        educationBuckets: ["Uni-Abschluss / Promotion", "Studiennah / Hochschulzugang"],
      };
      state.groupB = {
        label: "Ohne Uni-Abschluss",
        genders: [...allGenderOptions],
        ageGroup: "all",
        educationBuckets: ["Ohne Uni-Abschluss"],
      };
      break;
    default:
      break;
  }

  renderAll();
}

function renderAll() {
  renderGroupControls(ui.groupAControls, "groupA", "Gruppe A");
  renderGroupControls(ui.groupBControls, "groupB", "Gruppe B");

  const groupARecords = filterRecords(state.groupA);
  const groupBRecords = filterRecords(state.groupB);

  renderMetrics(groupARecords, groupBRecords);
  renderInsights(groupARecords, groupBRecords);
  renderExperienceChart(groupARecords, groupBRecords);
  renderOutcomeChart(groupARecords, groupBRecords);
}

function init() {
  ui.educationNote.textContent = meta.educationNote;
  ui.heroSampleSize.textContent = `${meta.sampleSize} Fälle`;

  meta.outcomeVariables.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.key;
    option.textContent = item.label;
    ui.outcomeSelect.append(option);
  });

  ui.outcomeSelect.value = state.selectedOutcome;
  ui.outcomeSelect.addEventListener("change", (event) => {
    state.selectedOutcome = event.target.value;
    renderAll();
  });

  ui.experienceSort.addEventListener("change", (event) => {
    state.experienceSort = event.target.value;
    renderAll();
  });

  document.querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  renderAll();
}

init();