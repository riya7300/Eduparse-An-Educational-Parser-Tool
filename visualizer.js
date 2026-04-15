const Visualizer = {
    renderproductions: function(prods) {
        let html = "<h4>Productions</h4>";
        html += prods.map((p, i) => {
            const bodyText = p.body.length ? p.body.join(' ') : 'ε';
            return `(${i}) ${p.head} → ${bodyText}`;
        }).join('<br>');

        document.getElementById('AugGrammar').innerHTML = html;
    },

    rendersets: function(nonTerms, first, follow) {
        let html = `<table>
                        <tr>
                            <th>Symbol</th>
                            <th>FIRST</th>
                            <th>FOLLOW</th>
                        </tr>`;

        [...nonTerms].forEach(nt => {
            const firstText = first[nt] ? [...first[nt]].join(', ') : '';
            const followText = follow[nt] ? [...follow[nt]].join(', ') : '';
            html += `<tr>
                        <td>${nt}</td>
                        <td>{ ${firstText} }</td>
                        <td>{ ${followText} }</td>
                    </tr>`;
        });

        html += `</table>`;
        document.getElementById('SetsTable').innerHTML = html;
    },

    renderitemsets: function(states, prods) {
        const container = document.getElementById('ItemSetsDisplay');
        if (!container) return;

        let html = "";

        states.forEach((state, i) => {
            html += `<div class="item-set-card">
                        <strong>State I${i}</strong>
                        <hr style="border:0; border:1px solid #f2f6f5;">`;

            state.forEach(item => {
                const prod = prods[item.pIdx];
                let bodyWithDot = [...prod.body];

                if (bodyWithDot.length === 0) {
                    bodyWithDot = [];
                }

                bodyWithDot.splice(item.dot, 0, '•');

                const bodyText = bodyWithDot.length ? bodyWithDot.join(' ') : '•';
                const lookaheadText = item.lookahead
                    ? `<span style="color:#e91e63; font-weight:bold;"> , ${item.lookahead}</span>`
                    : "";

                html += `<div style="font-family:'Courier New', monospace; font-size:0.95em; margin-bottom:6px;">
                            ${prod.head} → ${bodyText}${lookaheadText}
                        </div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;

        const cards = container.querySelectorAll('.item-set-card');
        cards.forEach((card, index) => {
            setTimeout(() => card.classList.add('show'), index * 120);
        });
    },

    rendertable: function(containerId, headers, tableData) {
        let html = `<table><thead><tr><th>State</th>`;

        headers.forEach(h => {
            html += `<th>${h}</th>`;
        });

        html += `</tr></thead><tbody>`;

        let rowIndex = 0;
        for (let state in tableData) {
            html += `<tr class="animated-row" style="transition-delay:${rowIndex * 0.08}s">
                        <td>${state}</td>`;

            headers.forEach(h => {
                html += `<td>${tableData[state][h] || '-'}</td>`;
            });

            html += `</tr>`;
            rowIndex++;
        }

        html += `</tbody></table>`;
        document.getElementById(containerId).innerHTML = html;

        const rows = document.querySelectorAll(`#${containerId} .animated-row`);
        rows.forEach((row, index) => {
            setTimeout(() => row.classList.add('show'), index * 100);
        });
    },

    renderConflicts: function(conflicts) {
        const box = document.getElementById('ConflictBox');
        if (!box) return;

        if (!conflicts || conflicts.length === 0) {
            box.innerHTML = `
                <div style="padding:12px; background:#d4edda; color:#155724; border-radius:8px;">
                    No conflicts found. Grammar looks safe.
                </div>
            `;
            return;
        }

        let html = `
            <div style="padding:12px; background:#f8d7da; color:#721c24; border-radius:8px; margin-bottom:12px;">
                Conflicts detected. Grammar may be ambiguous or unsuitable for selected parser.
            </div>
        `;

        html += `<table>
                    <thead>
                        <tr>
                            <th>State</th>
                            <th>Symbol</th>
                            <th>Existing Action</th>
                            <th>New Action</th>
                            <th>Conflict Type</th>
                        </tr>
                    </thead>
                    <tbody>`;

        conflicts.forEach(c => {
            html += `<tr>
                        <td>${c.state}</td>
                        <td>${c.symbol}</td>
                        <td>${c.oldAction}</td>
                        <td>${c.newAction}</td>
                        <td>${c.type}</td>
                    </tr>`;
        });

        html += `</tbody></table>`;
        box.innerHTML = html;
    },

    rendertrace: function(trace) {
        let html = `<table>
                        <thead>
                            <tr>
                                <th>Stack</th>
                                <th>Input</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>`;

        trace.forEach((step, index) => {
            html += `<tr class="animated-row" style="transition-delay:${index * 0.10}s">
                        <td>${step[0]}</td>
                        <td>${step[1]}</td>
                        <td>${step[2]}</td>
                    </tr>`;
        });

        html += `</tbody></table>`;
        document.getElementById('TraceDisplay').innerHTML = html;

        const rows = document.querySelectorAll('#TraceDisplay .animated-row');
        rows.forEach((row, index) => {
            setTimeout(() => row.classList.add('show'), index * 120);
        });
    },

    rendertree: function(node, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!node) {
            container.innerHTML = `
                <div style="padding:12px; background:#fff3cd; color:#856404; border-radius:8px;">
                    Parse tree not generated.
                </div>
            `;
            return;
        }

        function createHTML(n) {
            if (!n) return "";

            let html = `<li><div class="tree-node">${n.name}</div>`;

            if (n.children && n.children.length > 0) {
                html += "<ul>";
                n.children.forEach(c => {
                    html += createHTML(c);
                });
                html += "</ul>";
            }

            html += "</li>";
            return html;
        }

        container.innerHTML = `<div class="tree-container"><ul>${createHTML(node)}</ul></div>`;

        const nodes = container.querySelectorAll('.tree-node');
        nodes.forEach((nodeEl, index) => {
            setTimeout(() => nodeEl.classList.add('show'), index * 150);
        });
    }
};