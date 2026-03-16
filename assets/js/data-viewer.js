const datasetList = document.getElementById('datasetList');
const datasetTitle = document.getElementById('datasetTitle');
const datasetDescription = document.getElementById('datasetDescription');
const datasetFileLink = document.getElementById('datasetFileLink');
const datasetStats = document.getElementById('datasetStats');
const datasetTable = document.getElementById('datasetTable');
const tableCaption = document.getElementById('tableCaption');
const xAxisSelect = document.getElementById('xAxisSelect');
const yAxisSelect = document.getElementById('yAxisSelect');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const chartCanvas = document.getElementById('datasetChart');
const datasetPathInput = document.getElementById('datasetPathInput');
const datasetPathButton = document.getElementById('datasetPathButton');

const datasetCache = new Map();
let manifest = [];
let currentDataset = null;
let currentRows = [];
let currentHeaders = [];
let numericColumns = [];
let chart = null;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const splitCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const parseCsv = (csvText) => {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });

  return { headers, rows };
};

const inferNumericColumns = (headers, rows) => {
  return headers.filter((header) => {
    const values = rows.map((row) => row[header]).filter((value) => value !== '');
    return values.length > 0 && values.every((value) => Number.isFinite(Number(value)));
  });
};

const formatValue = (value) => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const updateStats = (entry, rows, headers, activeYKey) => {
  const activeValues = rows
    .map((row) => Number(row[activeYKey]))
    .filter((value) => Number.isFinite(value));

  const minValue = activeValues.length ? Math.min(...activeValues) : NaN;
  const maxValue = activeValues.length ? Math.max(...activeValues) : NaN;
  const averageValue = activeValues.length
    ? activeValues.reduce((total, value) => total + value, 0) / activeValues.length
    : NaN;

  const cards = [
    { label: 'Satir', value: rows.length },
    { label: 'Kolon', value: headers.length },
    { label: 'Sayisal Kolon', value: numericColumns.length },
    { label: `${activeYKey} Ortalama`, value: formatValue(averageValue) },
    { label: `${activeYKey} Min`, value: formatValue(minValue) },
    { label: `${activeYKey} Max`, value: formatValue(maxValue) }
  ];

  datasetStats.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-chip">
          <span class="stat-chip__label">${escapeHtml(card.label)}</span>
          <strong class="stat-chip__value">${escapeHtml(card.value)}</strong>
        </article>
      `
    )
    .join('');

  datasetFileLink.href = entry.path;
  datasetFileLink.textContent = `${entry.path} ac`;
};

const updateTable = (headers, rows) => {
  const previewRows = rows.slice(0, 18);
  const headHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const bodyHtml = previewRows
    .map(
      (row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? '')}</td>`).join('')}</tr>`
    )
    .join('');

  datasetTable.innerHTML = `
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  `;

  tableCaption.textContent = `${rows.length} satirin ilk ${previewRows.length} adedi gosteriliyor.`;
};

const renderChart = (xKey, yKey, chartType) => {
  if (!chartCanvas || !currentRows.length || !yKey) {
    return;
  }

  const xIsNumeric = numericColumns.includes(xKey);
  const useScatter = chartType === 'scatter' && xIsNumeric;

  const labels = currentRows.map((row) => row[xKey]);
  const values = currentRows.map((row) => Number(row[yKey]));
  const filteredScatterData = currentRows
    .map((row) => ({ x: Number(row[xKey]), y: Number(row[yKey]) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(chartCanvas, {
    type: useScatter ? 'scatter' : chartType,
    data: {
      labels: useScatter ? undefined : labels,
      datasets: [
        {
          label: `${yKey} / ${xKey}`,
          data: useScatter ? filteredScatterData : values,
          borderColor: '#4dc7ff',
          backgroundColor: chartType === 'bar' ? 'rgba(77, 199, 255, 0.32)' : 'rgba(57, 230, 190, 0.22)',
          pointBackgroundColor: '#39e6be',
          pointBorderColor: '#dff7ff',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.28
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#d8e9ff'
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xKey,
            color: '#d8e9ff'
          },
          ticks: {
            color: '#a6b5db'
          },
          grid: {
            color: 'rgba(120, 180, 255, 0.12)'
          }
        },
        y: {
          title: {
            display: true,
            text: yKey,
            color: '#d8e9ff'
          },
          ticks: {
            color: '#a6b5db'
          },
          grid: {
            color: 'rgba(120, 180, 255, 0.12)'
          }
        }
      }
    }
  });
};

const populateSelectors = (entry, headers, rows) => {
  currentHeaders = headers;
  currentRows = rows;
  numericColumns = inferNumericColumns(headers, rows);

  if (!headers.length) {
    throw new Error('CSV icinde baslik satiri bulunamadi.');
  }

  if (!numericColumns.length) {
    datasetStats.innerHTML = '<div class="empty-state">Bu veri setinde grafik cizmek icin sayisal kolon bulunamadi.</div>';
    datasetTable.innerHTML = '';
    tableCaption.textContent = 'Ham tablo gosterilemiyor.';
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }

  xAxisSelect.innerHTML = headers
    .map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`)
    .join('');

  yAxisSelect.innerHTML = numericColumns
    .map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`)
    .join('');

  xAxisSelect.value = headers.includes(entry.preferredX) ? entry.preferredX : headers[0] ?? '';
  yAxisSelect.value = numericColumns.includes(entry.preferredY)
    ? entry.preferredY
    : numericColumns.find((header) => header !== xAxisSelect.value) ?? numericColumns[0] ?? '';

  updateStats(entry, rows, headers, yAxisSelect.value || numericColumns[0] || '-');
  updateTable(headers, rows);
  renderChart(xAxisSelect.value, yAxisSelect.value, chartTypeSelect.value);
};

const setActiveDatasetButton = (activeId) => {
  Array.from(document.querySelectorAll('.dataset-button')).forEach((button) => {
    button.classList.toggle('is-active', button.dataset.datasetId === activeId);
  });
};

const buildManualDatasetEntry = (path) => {
  const normalizedPath = path.trim();
  const fileName = normalizedPath.split('/').pop() || normalizedPath;

  return {
    id: `manual-${normalizedPath}`,
    title: fileName,
    path: normalizedPath,
    description: 'Manuel olarak yuklenen CSV dosyasi.',
    preferredX: '',
    preferredY: ''
  };
};

const loadDataset = async (entry) => {
  currentDataset = entry;
  datasetTitle.textContent = entry.title;
  datasetDescription.textContent = entry.description;
  setActiveDatasetButton(entry.id);

  if (datasetPathInput) {
    datasetPathInput.value = entry.path;
  }

  if (!datasetCache.has(entry.id)) {
    const response = await fetch(entry.path);
    if (!response.ok) {
      throw new Error(`${entry.path} dosyasi okunamadi.`);
    }

    const csvText = await response.text();
    datasetCache.set(entry.id, parseCsv(csvText));
  }

  const { headers, rows } = datasetCache.get(entry.id);
  populateSelectors(entry, headers, rows);
};

const renderDatasetList = () => {
  datasetList.innerHTML = manifest
    .map(
      (entry) => `
        <button class="dataset-button" type="button" data-dataset-id="${escapeHtml(entry.id)}">
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(entry.path)}</span>
          <small>${escapeHtml(entry.description)}</small>
        </button>
      `
    )
    .join('');

  datasetList.querySelectorAll('.dataset-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const entry = manifest.find((item) => item.id === button.dataset.datasetId);
      if (entry) {
        await loadDataset(entry);
      }
    });
  });
};

const bindChartControls = () => {
  const updateVisualization = () => {
    if (!currentDataset) {
      return;
    }

    updateStats(currentDataset, currentRows, currentHeaders, yAxisSelect.value);
    renderChart(xAxisSelect.value, yAxisSelect.value, chartTypeSelect.value);
  };

  xAxisSelect.addEventListener('change', updateVisualization);
  yAxisSelect.addEventListener('change', updateVisualization);
  chartTypeSelect.addEventListener('change', updateVisualization);

  if (datasetPathInput && datasetPathButton) {
    const loadManualPath = async () => {
      const manualPath = datasetPathInput.value.trim();
      if (!manualPath) {
        showErrorState('Lutfen gecerli bir CSV yolu girin.');
        return;
      }

      try {
        await loadDataset(buildManualDatasetEntry(manualPath));
      } catch (error) {
        showErrorState(error.message);
      }
    };

    datasetPathButton.addEventListener('click', loadManualPath);
    datasetPathInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadManualPath();
      }
    });
  }
};

const showErrorState = (message) => {
  datasetTitle.textContent = 'Veri yuklenemedi';
  datasetDescription.textContent = message;
  datasetList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  datasetStats.innerHTML = '';
  datasetTable.innerHTML = '';
  tableCaption.textContent = 'Tablo gosterilemiyor.';
};

const init = async () => {
  if (!datasetList) {
    return;
  }

  bindChartControls();

  try {
    const response = await fetch('assets/data/datasets.json');
    if (!response.ok) {
      throw new Error('Veri manifesti okunamadi.');
    }

    manifest = await response.json();
    if (!manifest.length) {
      throw new Error('Manifest icinde veri seti bulunamadi.');
    }

    renderDatasetList();
    await loadDataset(manifest[0]);
  } catch (error) {
    showErrorState(error.message);
  }
};

init();