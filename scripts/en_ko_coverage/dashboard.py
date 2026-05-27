"""Generate a self-contained interactive HTML report from JSONL + summary stats."""

from __future__ import annotations

import json
from pathlib import Path

from .compare import iter_jsonl


def build_dashboard_html(
    *,
    jsonl_path: Path,
    summary: dict,
    title: str = "English coverage: WordNet → Korean (NIKL)",
) -> str:
    records = list(iter_jsonl(jsonl_path))
    payload = {
        "title": title,
        "summary": summary,
        "records": [
            {
                "word": r.word,
                "group": r.group,
                "wordnet_found": r.wordnet_found,
                "korean_found": r.korean_found,
                "datasets": r.datasets,
                "definition_count": r.definition_count,
            }
            for r in records
        ],
    }
    data_json = json.dumps(payload, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    :root {{
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --found: #3dd68c;
      --missing: #f07178;
      --warn: #ebc06d;
      --accent: #6cb6ff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }}
    header {{
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #2d3a4f;
      background: var(--panel);
    }}
    h1 {{ margin: 0 0 0.25rem; font-size: 1.35rem; }}
    .sub {{ color: var(--muted); font-size: 0.9rem; }}
    main {{ padding: 1.25rem 1.5rem; max-width: 1200px; margin: 0 auto; }}
    .cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }}
    .card {{
      background: var(--panel);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      border: 1px solid #2d3a4f;
    }}
    .card .label {{ color: var(--muted); font-size: 0.75rem; }}
    .card .value {{ font-size: 1.35rem; font-weight: 600; }}
    .toolbar {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }}
    input[type="search"] {{
      flex: 1;
      min-width: 200px;
      padding: 0.55rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #2d3a4f;
      background: var(--panel);
      color: var(--text);
    }}
    select {{
      padding: 0.55rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #2d3a4f;
      background: var(--panel);
      color: var(--text);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }}
    th, td {{
      text-align: left;
      padding: 0.5rem 0.65rem;
      border-bottom: 1px solid #2d3a4f;
    }}
    th {{ color: var(--muted); font-weight: 500; position: sticky; top: 0; background: var(--bg); }}
    .badge {{
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
    }}
    .badge.wordnet_and_korean {{ background: rgba(61, 214, 140, 0.2); color: var(--found); }}
    .badge.wordnet_only {{ background: rgba(235, 192, 109, 0.2); color: var(--warn); }}
    .badge.wordnet_missing {{ background: rgba(240, 113, 120, 0.2); color: var(--missing); }}
    .dataset-tag {{
      display: inline-block;
      margin-right: 0.35rem;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      background: rgba(108, 182, 255, 0.15);
      color: var(--accent);
      font-size: 0.75rem;
    }}
    #table-wrap {{ max-height: 65vh; overflow: auto; border: 1px solid #2d3a4f; border-radius: 8px; }}
    footer {{ margin-top: 1.5rem; color: var(--muted); font-size: 0.8rem; }}
  </style>
</head>
<body>
  <header>
    <h1 id="title"></h1>
    <p class="sub">Step 1: WordNet (wordnet.ts) · Step 2: NIKL English equivalents (영어) only when WordNet has a definition</p>
  </header>
  <main>
    <div class="cards" id="cards"></div>
    <div class="toolbar">
      <input type="search" id="search" placeholder="Filter by word…" />
      <select id="group-filter">
        <option value="all">All groups</option>
        <option value="wordnet_missing">No WordNet definition</option>
        <option value="wordnet_only">WordNet only (no Korean)</option>
        <option value="wordnet_and_korean">WordNet + Korean</option>
      </select>
      <select id="dataset-filter">
        <option value="">Any dataset</option>
        <option value="krdict">krdict</option>
        <option value="opendict">opendict</option>
        <option value="stdict">stdict</option>
      </select>
    </div>
    <div id="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Word</th>
            <th>Group</th>
            <th>WordNet defs</th>
            <th>Datasets</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
    <footer id="footer"></footer>
  </main>
  <script>
    const DATA = {data_json};

    document.getElementById("title").textContent = DATA.title;

    const cards = document.getElementById("cards");
    const s = DATA.summary;
    const bg = s.by_group || {{}};
    const cardData = [
      ["Checked", s.checked],
      ["WordNet found", s.wordnet_found ?? "—"],
      ["WordNet missing", s.wordnet_missing ?? bg.wordnet_missing ?? "—"],
      ["WordNet + Korean", bg.wordnet_and_korean ?? "—"],
      ["WordNet only", bg.wordnet_only ?? "—"],
      ["Korean missing (among WordNet)", s.korean_missing_among_wordnet ?? bg.wordnet_only ?? "—"],
    ];
    cardData.forEach(([label, value]) => {{
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `<div class="label">${{label}}</div><div class="value">${{value}}</div>`;
      cards.appendChild(el);
    }});

    const search = document.getElementById("search");
    const groupFilter = document.getElementById("group-filter");
    const datasetFilter = document.getElementById("dataset-filter");
    const tbody = document.getElementById("rows");

    const groupLabel = {{
      wordnet_missing: "No WordNet",
      wordnet_only: "WordNet only",
      wordnet_and_korean: "WordNet + Korean",
    }};

    function render() {{
      const q = search.value.trim().toLowerCase();
      const group = groupFilter.value;
      const ds = datasetFilter.value;
      tbody.innerHTML = "";
      let shown = 0;
      for (const r of DATA.records) {{
        if (group !== "all" && r.group !== group) continue;
        if (ds && (!r.datasets || !r.datasets.includes(ds))) continue;
        if (q && !r.word.includes(q)) continue;
        const tr = document.createElement("tr");
        const badge = `<span class="badge ${{r.group}}">${{groupLabel[r.group] || r.group}}</span>`;
        const tags = (r.datasets || [])
          .map((d) => `<span class="dataset-tag">${{d}}</span>`)
          .join("") || "—";
        const defCount = r.wordnet_found ? (r.definition_count || "—") : "—";
        tr.innerHTML = `<td>${{r.word}}</td><td>${{badge}}</td><td>${{defCount}}</td><td>${{tags}}</td>`;
        tbody.appendChild(tr);
        shown++;
      }}
      document.getElementById("footer").textContent =
        `Showing ${{shown}} of ${{DATA.records.length}} rows.`;
    }}

    search.addEventListener("input", render);
    groupFilter.addEventListener("change", render);
    datasetFilter.addEventListener("change", render);
    render();
  </script>
</body>
</html>
"""


def write_dashboard(html: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
