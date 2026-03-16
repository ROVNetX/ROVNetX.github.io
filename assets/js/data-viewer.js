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
const hullViewerSubtitle = document.getElementById('hullViewerSubtitle');
const hullPrevButton = document.getElementById('hullPrev');
const hullNextButton = document.getElementById('hullNext');
const hullPageIndicator = document.getElementById('hullPageIndicator');
const hullMeta = document.getElementById('hullMeta');
const hullCanvas = document.getElementById('hullCanvas');
const hullViewerCard = document.getElementById('hullViewerCard');

const datasetCache = new Map();
let manifest = [];
let currentDataset = null;
let currentRows = [];
let currentHeaders = [];
let numericColumns = [];
let chart = null;
const MAX_CHART_POINTS = 320;
const hullViewerState = {
  records: [],
  index: 0,
  initialized: false
};

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

const sampleRowsForChart = (rows, maxPoints = MAX_CHART_POINTS) => {
  if (rows.length <= maxPoints) {
    return rows;
  }

  const sampledRows = [];
  const step = (rows.length - 1) / (maxPoints - 1);

  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round(index * step);
    sampledRows.push(rows[sourceIndex]);
  }

  return sampledRows;
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
  const previewRows = rows.slice(0, 8);
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

  const chartRows = sampleRowsForChart(currentRows);

  const xIsNumeric = numericColumns.includes(xKey);
  const useScatter = chartType === 'scatter' && xIsNumeric;

  const labels = chartRows.map((row) => row[xKey]);
  const values = chartRows.map((row) => Number(row[yKey]));
  const filteredScatterData = chartRows
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
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      normalized: true,
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

const sortOrtamId = (a, b) => {
  const getNumericPart = (value) => {
    const match = String(value).match(/Ortam-(\d+)/i);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };

  return getNumericPart(a) - getNumericPart(b);
};

const normalizeHullRecords = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload
      .filter((record) => record && typeof record === 'object')
      .map((record, index) => ({
        ...record,
        ortam_id: record.ortam_id || `Ortam-${index}`,
        kayit_index: 1,
        kayit_sayisi: 1
      }));
  }

  if (typeof payload !== 'object') {
    return [];
  }

  const records = [];
  const ortamKeys = Object.keys(payload).sort(sortOrtamId);

  ortamKeys.forEach((ortamKey) => {
    const value = payload[ortamKey];
    const ortamRecords = Array.isArray(value) ? value : [value];

    ortamRecords
      .filter((record) => record && typeof record === 'object')
      .forEach((record, recordIndex) => {
        records.push({
          ...record,
          ortam_id: record.ortam_id || ortamKey,
          kayit_index: recordIndex + 1,
          kayit_sayisi: ortamRecords.length
        });
      });
  });

  return records;
};

const getRovXY = (pozisyon) => {
  if (Array.isArray(pozisyon) && pozisyon.length >= 2) {
    const x = Number(pozisyon[0]);
    const y = Number(pozisyon[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  }

  if (pozisyon && typeof pozisyon === 'object') {
    const x = Number(pozisyon.x);
    const y = Number(pozisyon.y);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  }

  return null;
};

const depthToColor = (depthValue) => {
  const depth = Number(depthValue);
  if (!Number.isFinite(depth)) {
    return 'rgba(140, 149, 164, 0.6)';
  }

  if (depth > -10) {
    return 'rgba(130, 90, 60, 0.78)';
  }

  const minDepth = -50;
  const maxDepth = 0;
  const t = Math.max(0, Math.min(1, (depth - minDepth) / (maxDepth - minDepth)));
  const shade = Math.round(56 + t * 160);
  return `rgba(${shade}, ${shade}, ${shade}, 0.72)`;
};

const drawHullMessage = (message) => {
  if (!hullCanvas) {
    return;
  }

  const width = hullCanvas.clientWidth || 320;
  const height = hullCanvas.clientHeight || 220;
  const dpr = window.devicePixelRatio || 1;

  hullCanvas.width = Math.floor(width * dpr);
  hullCanvas.height = Math.floor(height * dpr);

  const context = hullCanvas.getContext('2d');
  if (!context) {
    return;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, hullCanvas.width, hullCanvas.height);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  context.fillStyle = 'rgba(7, 15, 34, 0.88)';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#9db2dc';
  context.font = '600 14px "Space Grotesk", sans-serif';
  context.textAlign = 'center';
  context.fillText(message, width / 2, height / 2);
};

const drawMarker = (context, x, y, color, radius = 5) => {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
};

const drawDiamond = (context, x, y, size, color) => {
  context.beginPath();
  context.moveTo(x, y - size);
  context.lineTo(x + size, y);
  context.lineTo(x, y + size);
  context.lineTo(x - size, y);
  context.closePath();
  context.fillStyle = color;
  context.fill();
};

const drawCross = (context, x, y, size, color) => {
  context.beginPath();
  context.moveTo(x - size, y - size);
  context.lineTo(x + size, y + size);
  context.moveTo(x + size, y - size);
  context.lineTo(x - size, y + size);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
};

const drawTriangle = (context, x, y, size, color) => {
  context.beginPath();
  context.moveTo(x, y - size);
  context.lineTo(x + size, y + size);
  context.lineTo(x - size, y + size);
  context.closePath();
  context.fillStyle = color;
  context.fill();
};

const drawStar = (context, x, y, radius, color) => {
  const spikes = 5;
  const innerRadius = radius * 0.45;
  let rotation = Math.PI / 2 * 3;

  context.beginPath();
  context.moveTo(x, y - radius);

  for (let index = 0; index < spikes; index += 1) {
    context.lineTo(x + Math.cos(rotation) * radius, y + Math.sin(rotation) * radius);
    rotation += Math.PI / spikes;
    context.lineTo(x + Math.cos(rotation) * innerRadius, y + Math.sin(rotation) * innerRadius);
    rotation += Math.PI / spikes;
  }

  context.closePath();
  context.fillStyle = color;
  context.fill();
};

const buildHullBounds = (record) => {
  const xs = [];
  const ys = [];

  const registerPoint = (point) => {
    if (!Array.isArray(point) || point.length < 2) {
      return;
    }

    const x = Number(point[0]);
    const y = Number(point[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  };

  (record.hull_samples || []).forEach(registerPoint);
  (record.ada_ve_engel_noktalar || []).forEach(registerPoint);
  (record.engel_bulutu_3d || []).forEach(registerPoint);

  const hullCenter = record.hull_center;
  if (Array.isArray(hullCenter) && hullCenter.length >= 2) {
    registerPoint(hullCenter);
  }

  const formasyonBilgisi = record.formasyon_information || {};
  const formasyonMerkez = formasyonBilgisi.merkez || record.formasyon_merkez;
  if (Array.isArray(formasyonMerkez) && formasyonMerkez.length >= 2) {
    registerPoint(formasyonMerkez);
  }

  const formasyonHedefleri = record.formasyon_rov_pozisyonlari || {};
  Object.values(formasyonHedefleri).forEach(registerPoint);

  const rovlar = record.grup_bilgisi?.rovlar || [];
  rovlar.forEach((rov) => {
    const xy = getRovXY(rov?.pozisyon);
    if (xy) {
      registerPoint(xy);
    }
  });

  if (!xs.length || !ys.length) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return {
    minX: minX - spanX * 0.12,
    maxX: maxX + spanX * 0.12,
    minY: minY - spanY * 0.12,
    maxY: maxY + spanY * 0.12
  };
};

const renderHullRecord = () => {
  if (!hullCanvas || !hullViewerState.records.length) {
    return;
  }

  const record = hullViewerState.records[hullViewerState.index];
  if (!record) {
    drawHullMessage('Gosterilecek ortam bulunamadi.');
    return;
  }

  const width = hullCanvas.clientWidth || 320;
  const height = hullCanvas.clientHeight || 220;
  const dpr = window.devicePixelRatio || 1;

  hullCanvas.width = Math.floor(width * dpr);
  hullCanvas.height = Math.floor(height * dpr);

  const context = hullCanvas.getContext('2d');
  if (!context) {
    return;
  }

  const bounds = buildHullBounds(record);
  const pad = 34;
  const plotWidth = Math.max(20, width - pad * 2);
  const plotHeight = Math.max(20, height - pad * 2);

  const project = (x, y) => {
    const px = pad + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * plotWidth;
    const py = height - pad - ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * plotHeight;
    return [px, py];
  };

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, hullCanvas.width, hullCanvas.height);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  context.fillStyle = 'rgba(2, 10, 24, 0.9)';
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(80, 135, 220, 0.18)';
  context.lineWidth = 1;
  for (let index = 0; index <= 6; index += 1) {
    const x = pad + (index / 6) * plotWidth;
    const y = pad + (index / 6) * plotHeight;
    context.beginPath();
    context.moveTo(x, pad);
    context.lineTo(x, height - pad);
    context.stroke();

    context.beginPath();
    context.moveTo(pad, y);
    context.lineTo(width - pad, y);
    context.stroke();
  }

  context.strokeStyle = 'rgba(133, 184, 255, 0.36)';
  context.strokeRect(pad, pad, plotWidth, plotHeight);

  const hullSamples = (record.hull_samples || []).filter((point) => Array.isArray(point) && point.length >= 2);
  if (hullSamples.length >= 3) {
    context.beginPath();
    hullSamples.forEach((point, pointIndex) => {
      const [px, py] = project(Number(point[0]), Number(point[1]));
      if (pointIndex === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    });
    context.closePath();
    context.fillStyle = 'rgba(45, 214, 255, 0.18)';
    context.fill();
    context.strokeStyle = 'rgba(45, 214, 255, 0.92)';
    context.lineWidth = 1.8;
    context.stroke();
  }

  const engelBulutu = (record.engel_bulutu_3d || []).filter((point) => Array.isArray(point) && point.length >= 2);
  engelBulutu.forEach((point) => {
    const [px, py] = project(Number(point[0]), Number(point[1]));
    drawMarker(context, px, py, depthToColor(point[2]), 2.6);
  });

  const adaEngelNoktalari = (record.ada_ve_engel_noktalar || []).filter((point) => Array.isArray(point) && point.length >= 2);
  adaEngelNoktalari.forEach((point) => {
    const [px, py] = project(Number(point[0]), Number(point[1]));
    drawCross(context, px, py, 4, '#ffb347');
  });

  const formasyonHedefleri = record.formasyon_rov_pozisyonlari || {};
  Object.entries(formasyonHedefleri).forEach(([rovId, point]) => {
    if (!Array.isArray(point) || point.length < 2) {
      return;
    }
    const [px, py] = project(Number(point[0]), Number(point[1]));
    drawDiamond(context, px, py, 4.5, '#5ca8ff');
    context.fillStyle = '#82bdff';
    context.font = '700 10px "Rajdhani", sans-serif';
    context.fillText(`T${rovId}`, px + 5, py - 6);
  });

  const rovlar = record.grup_bilgisi?.rovlar || [];
  rovlar.forEach((rov) => {
    const xy = getRovXY(rov?.pozisyon);
    if (!xy) {
      return;
    }

    const [px, py] = project(xy[0], xy[1]);
    drawMarker(context, px, py, '#ff5d6c', 5);
    context.fillStyle = '#ffdce0';
    context.font = '700 10px "Rajdhani", sans-serif';
    context.fillText(`R${rov?.rov_id ?? '?'}`, px + 6, py - 6);
  });

  const hullCenter = Array.isArray(record.hull_center) ? record.hull_center : null;
  if (hullCenter && hullCenter.length >= 2) {
    const [px, py] = project(Number(hullCenter[0]), Number(hullCenter[1]));
    drawStar(context, px, py, 8, '#52e59f');
  }

  const formasyonBilgisi = record.formasyon_information || {};
  const formasyonMerkez = formasyonBilgisi.merkez || record.formasyon_merkez;
  if (Array.isArray(formasyonMerkez) && formasyonMerkez.length >= 2) {
    const [px, py] = project(Number(formasyonMerkez[0]), Number(formasyonMerkez[1]));
    drawTriangle(context, px, py, 7, '#ff6a5c');
  }

  const ortamId = record.ortam_id || `Ortam-${hullViewerState.index}`;
  if (hullViewerSubtitle) {
    hullViewerSubtitle.textContent = `${ortamId} goruntuleniyor. Sol/sağ ok ile ortamlari degistirebilirsiniz.`;
  }

  if (hullPageIndicator) {
    hullPageIndicator.textContent = `${hullViewerState.index + 1} / ${hullViewerState.records.length}`;
  }

  if (hullMeta) {
    const formasyonId = record.formasyon_information?.formasyon_id || record.formasyon_id || 'N/A';
    const rovSayisi = record.grup_bilgisi?.rovlar?.length || record.grup_bilgisi?.rov_sayisi || 0;

    hullMeta.innerHTML = [
      { label: 'Ortam', value: ortamId },
      { label: 'Kayit', value: `${record.kayit_index || 1} / ${record.kayit_sayisi || 1}` },
      { label: 'Hull Nokta', value: (record.hull_samples || []).length },
      { label: 'ROV / Formasyon', value: `${rovSayisi} / ${formasyonId}` }
    ]
      .map(
        (item) => `
          <article class="hull-meta-chip">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </article>
        `
      )
      .join('');
  }
};

const stepHullRecord = (direction) => {
  const total = hullViewerState.records.length;
  if (!total) {
    return;
  }

  hullViewerState.index = (hullViewerState.index + direction + total) % total;
  renderHullRecord();
};

const initHullViewer = async () => {
  if (hullViewerState.initialized) {
    return;
  }

  hullViewerState.initialized = true;

  if (!hullCanvas || !hullPrevButton || !hullNextButton) {
    return;
  }

  drawHullMessage('Hull ortamlari yukleniyor...');

  hullPrevButton.addEventListener('click', () => stepHullRecord(-1));
  hullNextButton.addEventListener('click', () => stepHullRecord(1));

  window.addEventListener('resize', () => {
    if (hullViewerState.records.length) {
      renderHullRecord();
    }
  });

  try {
    const response = await fetch('Datas/hull_information.json');
    if (!response.ok) {
      throw new Error('hull_information.json dosyasi okunamadi.');
    }

    const payload = await response.json();
    const records = normalizeHullRecords(payload);

    if (!records.length) {
      throw new Error('Hull verisi icinde gosterilecek kayit bulunamadi.');
    }

    hullViewerState.records = records;
    hullViewerState.index = 0;
    renderHullRecord();
  } catch (error) {
    if (hullViewerSubtitle) {
      hullViewerSubtitle.textContent = error.message;
    }
    if (hullPageIndicator) {
      hullPageIndicator.textContent = '0 / 0';
    }
    if (hullMeta) {
      hullMeta.innerHTML = '';
    }
    drawHullMessage('Hull verisi gosterilemiyor.');
  }
};

const initHullViewerWhenVisible = () => {
  if (!hullViewerCard) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    void initHullViewer();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries.find((entry) => entry.isIntersecting);
      if (visibleEntry) {
        observer.disconnect();
        void initHullViewer();
      }
    },
    {
      threshold: 0.08
    }
  );

  observer.observe(hullViewerCard);
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

  initHullViewerWhenVisible();
};

init();