export const makeId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
export const cloneValue = (v) => typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
export const clampInt = (v, min, max) => { const n = parseInt(v, 10); return isNaN(n) ? min : Math.max(min, Math.min(max, n)); };
export const clampFloat = (v, min, max, f = 2) => { const n = parseFloat(v); return isNaN(n) ? min : Number(Math.max(min, Math.min(max, n)).toFixed(f)); };

export function readStorage(k, fb) { try { const r = localStorage.getItem(k); return r === null ? cloneValue(fb) : JSON.parse(r); } catch { return cloneValue(fb); } }
export function readStorageMaybe(k) { try { const r = localStorage.getItem(k); return r === null ? undefined : JSON.parse(r); } catch { return undefined; } }

export function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const getTodayKey = (date = new Date()) => formatDateKey(date);
export const isValidDateKey = (val) => /^\d{4}-\d{2}-\d{2}$/.test(String(val));
export const sanitizeDateKey = (val, fb) => isValidDateKey(val) ? String(val) : fb;

export function escapeHtml(val) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(val).replace(/[&<>"']/g, (c) => map[c]);
}

export function markdownToHtml(markdown) {
  const safe = escapeHtml(markdown);
  const lines = safe.split(/\r?\n/);
  const output = [];
  let inList = false;
  
  const closeList = () => { if (inList) { output.push("</ul>"); inList = false; } };
  const inline = (v) => v.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  lines.forEach((line) => {
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    const checklist = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)/);
    
    if (heading) {
      closeList();
      output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (checklist) {
      if (!inList) { output.push('<ul class="md-check">'); inList = true; }
      const marker = checklist[1].toLowerCase() === "x" ? "☑" : "☐";
      output.push(`<li>${marker} ${inline(checklist[2])}</li>`);
    } else if (!line.trim()) {
      closeList();
    } else {
      closeList();
      output.push(`<p>${inline(line)}</p>`);
    }
  });
  closeList();
  return output.join("");
}

export function readViewContext() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("ivoryWindowRole") === "wallpaper" ? "wallpaper" : "editor";
  return {
    role, isEditor: role === "editor",
    monitorIndex: Number.parseInt(params.get("ivoryMonitorIndex") || "0", 10) || 0
  };
}