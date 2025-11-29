/* CONFIG */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwnpf8Cz4NSRiROS7sne6TL7AOxBHy1sCg5__Lqd6jZ_VGffGvcPyyStGIM9dRG4CgeTA/exec";
const WEB_APP_TOKEN = "YN_API_5f92a1c7b3"; // keep in sync with your Apps Script token

/* DOM */
const weeksEl = document.getElementById("weeks");
const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const dayFilterEl = document.getElementById("dayFilter");
const weekFilterEl = document.getElementById("weekFilter");
const searchBoxEl = document.getElementById("searchBox");
const applyBtn = document.getElementById("applyBtn");
const resetBtn = document.getElementById("resetBtn");
const refreshBtn = document.getElementById("refreshBtn");
const addBtn = document.getElementById("addBtn");

/* Modal elements */
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const rowNumber = document.getElementById("rowNumber");
const fld = {
  WEEK: document.getElementById("fld_WEEK"),
  Date: document.getElementById("fld_Date"),
  DAY: document.getElementById("fld_DAY"),
  '1st': document.getElementById("fld_1st"),
  '2nd': document.getElementById("fld_2nd"),
  ASANA: document.getElementById("fld_ASANA"),
  PRANAYAMA: document.getElementById("fld_PRANAYAMA"),
  Remarks: document.getElementById("fld_Remarks")
};
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

/* State */
let allRows = [];

/* Utility: default date range today -> +7d */
function setDefaultDates(){
  const today = new Date();
  const to = new Date(); to.setDate(today.getDate()+7);
  fromDateEl.value = today.toISOString().slice(0,10);
  toDateEl.value = to.toISOString().slice(0,10);
}

/* Fetch rows from web app */
async function fetchRows(params = {}){
  try {
    const url = new URL(WEB_APP_URL);
    url.searchParams.set('action','get');
    url.searchParams.set('token', WEB_APP_TOKEN);
    if (params.start) url.searchParams.set('start', params.start);
    if (params.end) url.searchParams.set('end', params.end);
    if (params.day) url.searchParams.set('day', params.day);
    if (params.week) url.searchParams.set('week', params.week);
    if (params.search) url.searchParams.set('search', params.search);

    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error('Network error: ' + resp.status);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    // If backend returns { rows: [...] } or plain array
    return data.rows || data;
  } catch (err){
    console.error('fetchRows error', err);
    throw err;
  }
}

/* Render weeks -> days grouped by WEEK */
function renderWeeks(rows){
  weeksEl.innerHTML = '';
  if (!rows || rows.length === 0){
    weeksEl.innerHTML = '<div class="muted">No records found for selected range/filters.</div>';
    return;
  }

  // Ensure DateISO for sorting
  rows.forEach(r => {
    if (!r.DateISO && r.Date) r.DateISO = formatDateISO(r.Date);
  });

  // group by WEEK
  const groups = {};
  rows.forEach(r=>{
    const wk = (r.WEEK === undefined || r.WEEK === '') ? 'Unassigned' : String(r.WEEK);
    groups[wk] = groups[wk] || [];
    groups[wk].push(r);
  });

  // sort group keys numerically when possible
  const keys = Object.keys(groups).sort((a,b)=>{
    const na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  keys.forEach(k=>{
    const list = groups[k].sort((a,b)=>{
      if (a.DateISO && b.DateISO) return new Date(a.DateISO) - new Date(b.DateISO);
      return 0;
    });

    const card = document.createElement('section');
    card.className = 'week-card';

    const header = document.createElement('div');
    header.className = 'week-header';
    const title = document.createElement('div');
    title.innerHTML = `<div class="week-title">Week ${k}</div><div class="week-sub">${list.length} day(s)</div>`;
    header.appendChild(title);

    const headerActions = document.createElement('div');
    const expandAllBtn = document.createElement('button');
    expandAllBtn.className = 'btn ghost';
    expandAllBtn.textContent = 'Expand all';
    expandAllBtn.addEventListener('click', ()=> toggleAll(card, true));
    const collapseAllBtn = document.createElement('button');
    collapseAllBtn.className = 'btn ghost';
    collapseAllBtn.textContent = 'Collapse all';
    collapseAllBtn.addEventListener('click', ()=> toggleAll(card,false));
    headerActions.appendChild(expandAllBtn);
    headerActions.appendChild(collapseAllBtn);
    header.appendChild(headerActions);

    card.appendChild(header);

    // accordion container
    const acc = document.createElement('div');
    acc.className = 'accordion';

    list.forEach(r=>{
      const dayRow = document.createElement('div');
      dayRow.className = 'day-row';

      const summary = document.createElement('div');
      summary.className = 'day-summary';
      const label = document.createElement('div');
      label.innerHTML = `<div class="day-label">${r.DAY || '—'} <span class="muted">(${r.DateISO || r.Date || '—'})</span></div>`;
      const right = document.createElement('div');
      right.innerHTML = `<button class="btn ghost" data-row="${r._row}">Edit</button>`;
      summary.appendChild(label);
      summary.appendChild(right);

      const details = document.createElement('div');
      details.className = 'detail-grid';
      details.style.display = 'none'; // collapsed by default

      details.innerHTML = `
        <div><strong>1ˢᵗ Demo:</strong> ${escapeHtml(r['1ˢᵗ Demo'] || r['1st'] || '')}</div>
        <div><strong>2ⁿᵈ Demo:</strong> ${escapeHtml(r['2ⁿᵈ Demo'] || r['2nd'] || '')}</div>
        <div><strong>ASANA/KRIYA:</strong> ${escapeHtml(r['ASANA/KRIYA'] || r.ASANA || '')}</div>
        <div><strong>PRANAYAMA:</strong> ${escapeHtml(r['PRANAYAMA NAME'] || r.PRANAYAMA || '')}</div>
        <div><strong>Remarks:</strong> ${escapeHtml(r.Remarks || '')}</div>
      `;

      // toggle details
      summary.addEventListener('click', (ev)=>{
        // if clicked edit button ignore here
        if (ev.target && ev.target.tagName === 'BUTTON') return;
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
      });

      // edit button
      right.querySelector('button').addEventListener('click', (e)=>{
        e.stopPropagation();
        openModalForEdit(r._row);
      });

      dayRow.appendChild(summary);
      dayRow.appendChild(details);
      acc.appendChild(dayRow);
    });

    card.appendChild(acc);
    weeksEl.appendChild(card);
  });
}

/* toggle all accordions in a card */
function toggleAll(card, expand){
  card.querySelectorAll('.detail-grid').forEach(d=> d.style.display = expand ? 'block' : 'none');
}

/* escape */
function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* format ISO date helper (input may be string or Date) */
function formatDateISO(v){
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) return v;
  // try parse "3-Nov" or other formats — return as-is
  return v;
}

/* Fetch + render with filters */
async function fetchAndRender(){
  try {
    const rows = await fetchRows({
      start: fromDateEl.value,
      end: toDateEl.value,
      day: dayFilterEl.value,
      week: weekFilterEl.value,
      search: searchBoxEl.value
    });
    allRows = rows;
    renderWeeks(rows);
  } catch (err){
    console.error(err);
    alert('Error loading data: ' + (err.message || err));
  }
}

/* Modal functions (create/edit/delete) */
function openModalForCreate(){
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden','false');
  modalTitle.textContent = 'Create New Record';
  rowNumber.value = '';
  Object.keys(fld).forEach(k => fld[k].value = '');
  deleteBtn.style.display = 'none';
}
async function openModalForEdit(row){
  // find record
  const all = await fetchRows({ start:'1900-01-01', end:'9999-12-31' });
  const rec = all.find(r => String(r._row) === String(row));
  if(!rec){ alert('Record not found'); return; }
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden','false');
  modalTitle.textContent = 'Edit Record (Row ' + row + ')';
  rowNumber.value = row;
  fld.WEEK.value = rec.WEEK || '';
  fld.Date.value = rec.DateISO || rec.Date || '';
  fld.DAY.value = rec.DAY || '';
  fld['1st'].value = rec['1ˢᵗ Demo'] || rec['1st'] || '';
  fld['2nd'].value = rec['2ⁿᵈ Demo'] || rec['2nd'] || '';
  fld.ASANA.value = rec['ASANA/KRIYA'] || rec.ASANA || '';
  fld.PRANAYAMA.value = rec['PRANAYAMA NAME'] || rec.PRANAYAMA || '';
  fld.Remarks.value = rec.Remarks || '';
  deleteBtn.style.display = 'inline-block';
}

saveBtn.addEventListener('click', async ()=>{
  const payload = {
    action: rowNumber.value ? 'update' : 'create',
    token: WEB_APP_TOKEN,
    row: rowNumber.value ? Number(rowNumber.value) : undefined,
    record: {
      WEEK: fld.WEEK.value,
      Date: fld.Date.value,
      DAY: fld.DAY.value,
      '1ˢᵗ Demo': fld['1st'].value,
      '2ⁿᵈ Demo': fld['2nd'].value,
      'ASANA/KRIYA': fld.ASANA.value,
      'PRANAYAMA NAME': fld.PRANAYAMA.value,
      Remarks: fld.Remarks.value
    }
  };

  try {
    await postAction(payload);
    closeModal();
    await fetchAndRender();
  } catch (err) {
    alert('Save failed: ' + (err.message||err));
  }
});

deleteBtn.addEventListener('click', async ()=>{
  if (!rowNumber.value) return;
  if (!confirm('Delete this record? This cannot be undone.')) return;
  try {
    await postAction({ action:'delete', token:WEB_APP_TOKEN, row: Number(rowNumber.value) });
    closeModal();
    await fetchAndRender();
  } catch (err){
    alert('Delete failed: ' + (err.message||err));
  }
});

closeModalBtn.addEventListener('click', closeModal);

function closeModal(){
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden','true');
}

/* POST helper (JSON) */
async function postAction(body){
  const resp = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('Network error: ' + resp.status);
  const j = await resp.json();
  if (j.error) throw new Error(j.error);
  return j;
}

/* UI event wiring */
applyBtn.addEventListener('click', fetchAndRender);
resetBtn.addEventListener('click', ()=>{
  dayFilterEl.value=''; weekFilterEl.value=''; searchBoxEl.value=''; setDefaultDates(); fetchAndRender();
});
refreshBtn.addEventListener('click', fetchAndRender);
addBtn.addEventListener('click', openModalForCreate);

/* init */
setDefaultDates();
fetchAndRender();

/* keyboard: esc to close modal */
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeModal(); });
/* close clicking outside */
modal.addEventListener('click',(ev)=>{ if(ev.target===modal) closeModal(); });
