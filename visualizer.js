const Visualizer = {
    renderproductions: function(prods) {
        let html = prods.map((p, i) => `(${i}) ${p.head} → ${p.body.join(' ')}`).join('<br>');
        document.getElementById('AugGrammar').innerHTML = "<h4>Productions-</h4>" + html;
    },
    rendersets: function(nonTerms, first, follow) {
        let html = `<table><tr><th>Symbol</th><th>First</th><th>Follow</th></tr>`;
        nonTerms.forEach(nt => {
            html += `<tr><td>${nt}</td><td>{ ${[...first[nt]].join(', ')}</td><td>{ ${[...follow[nt]].join(', ')} }</td></tr>`;
        });
        document.getElementById('SetsTable').innerHTML = html + `</table>`;
    },

    renderitemsets: function(states) {
        const container = document.getElementById('ItemSetsDisplay');
        if (!container) return;

        let html = "";
        states.forEach((state, i) => {
            html += `<div class="item-set-card">
                        <strong style="color: #00796b;">State I${i}</strong><hr style="border:0; border: 1px solid #f2f6f5;">`;
            state.forEach(item => {
                let bodyWithDot = [...item.body];
                bodyWithDot.splice(item.dot, 0, '•');
                //clr(1) lookahead
                let lookaheadText = item.lookahead ? `<span style="color:#e91e63; font-weight :bold;">, ${item.lookahead}</span>` : "";

                html += `<div style="font-family: 'Courier New', Courier, monospace; font-size: 0.95em; margin-bottomL 5px;">
                            ${item.head} → ${bodyWithDot.join(' ')}${lookaheadText}
                        </div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html;
    },

    rendertable: function(containerId, headers, tableData) {
        let html = `<table><thead><tr><th>State</th>`;
        headers.forEach(h => html += `<th>${h}</th>`);
        html += `</tr></thead><tbody>`;
        for (let state in tableData) {
            html += `<tr><td>${state}</td>`;
            headers.forEach(h => html += `<td>${tableData[state][h] || '-'}</td>`);
            html += `</tr>`;
        }
        document.getElementById(containerId).innerHTML = html + `</tbody></table>`;
    },

    rendertrace: function(trace) {
        let html = `<table><thead><tr><th>Stack</th><th>Input</th><th>Action</th></tr></thead><tbody>`;
        trace.forEach(step => {
            html += `<tr><td>${step[0]}</td><td>${step[1]}</td><td>${step[2]}</td></tr>`;
});
        document.getElementById('TraceDisplay').innerHTML = html + `</tbody></table>`;
    },

    rendertree: function(node, containerId) {
        const container = document.getElementById(containerId);
        const actualroot = Array.isArray(node) ? node[0] : node; 
        //root=rootnode

        function createHTML(n) {
            if (!n) return "";
            let html = `<li><div class="tree-node">${n.name}</div>`;
            if (n.children && n.children.length > 0) {
                html += "<ul>";
                n.children.forEach(c => html += createHTML(c));
                html += "</ul>";
            }
            return html + "</li>";

        }
        container.innerHTML = `<div  class="tree-container"><ul>${createHTML(actualroot)}</ul></div`;
    }
};