class ParserEngine {
    constructor(grammarStr, parserType) {
        this.type = parserType;
        this.prods = [];
        this.nonTerms = new Set();
        this.terms = new Set();
        this.first = {};
        this.follow = {};
        this.states = [];
        this.table = {};
        this.init(grammarStr);
    }

    init(str) {
        const lines = str.trim().split('\n');
        const firstHead = lines[0].split('->')[0].trim();

        //Augmented grammar
        this.prods.push({ head: firstHead + "'", body: [firstHead] });
        this.nonTerms.add(firstHead + "'");

        lines.forEach(line => {
            const [head, bodystr] = line.split('->').map(s => s.trim());
            this.nonTerms.add(head);
            bodystr.split('|').forEach(b => {
                const symbols = b.trim().split(/\s+/);
                this.prods.push({ head, body: symbols });
                symbols.forEach(s => {
                    if (!s.match(/^[A-Z]/)) this.terms.add(s);
                    else this.nonTerms.add(s);
                });
            });
        });
        this.terms.add('$'); 
        this.computeFirst();
        this.computeFollow();
    }

    computeFirst() {
        this.nonTerms.forEach(nt => this.first[nt] = new Set());
        let changed = true;
        while (changed) {
            changed = false;
            this.prods.forEach(p => {
                let beforesize = this.first[p.head].size;
                let firstSym = p.body[0];
                if (!this.nonTerms.has(firstSym)) {
                    this.first[p.head].add(firstSym);
                } else {
                    this.first[firstSym].forEach(f => this.first[p.head].add(f));
                }
                if (this.first[p.head].size > beforesize) changed = true;
            
            });
        }
    }

    computeFollow() {
        this.nonTerms.forEach(nt => this.follow[nt] = new Set());
        this.follow[this.prods[0].head].add('$');
        let changed = true;
        while (changed) {
            changed = false;
            this.prods.forEach(p => {
                for (let i = 0; i < p.body.length; i++) {
                    let B = p.body[i];
                    if (this.nonTerms.has(B)) {
                        let beforesize = this.follow[B].size;
                        let next = p.body[i + 1];
                        if (next) {
                            if (!this.nonTerms.has(next)) this.follow[B].add(next);
                            else this.first[next].forEach(f => this.follow[B].add(f));
                        } else {
                            this.follow[p.head].forEach(f => this.follow[B].add(f));
                        } 
                        if (this.follow[B].size > beforesize) changed = true;
                    }
                }
            });
        }
    }

    getSLRClosure(items) {
        let closure = [...items];
        let changed = true;
        while (changed) {
            changed = false;
            closure.forEach(item => {
                let B = item.body[item.dot];
                if (this.nonTerms.has(B)) {
                    this.prods.forEach((p, idx) => {
                        if (p.head === B && !closure.some(c => c.pIdx === idx && c.dot === 0)) {
                            closure.push({pIdx: idx, head: p.head, body: p.body, dot: 0 });
                            changed = true;
                        }
                    });
                }
            });
        }
        return closure;
    }

    getCLRClosure(items) {
        let closure = [...items];
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < closure.length; i++) {
                let item = closure[i];
                let B = item.body[item.dot];
                if (this.nonTerms.has(B)) {
                    let beta = item.body.slice(item.dot + 1);
                    let lookaheads = new Set();
                    if (beta.length > 0) {
                        let firstBeta = !this.nonTerms.has(beta[0]) ? new Set([beta[0]]) : this.first[beta[0]];
                        firstBeta.forEach(la => lookaheads.add(la));
                    } else {
                        lookaheads.add(item.lookahead);

                    }
                    this.prods.forEach((p, idx) => {
                        if (p.head === B) {
                            lookaheads.forEach(la => {
                                if (!closure.some(c => c.pIdx === idx && c.dot === 0 && c.lookahead === la)) {
                                    closure.push({ pIdx: idx, head: p.head, body: p.body, dot: 0, lookahead: la });
                                    changed = true;
                                }
                            });
                        }
                    });
                }
            }
        }
        return closure;
    }

    buildtable() {
        let i0;
        if (this.type === "SLR") {
            i0 = this.getSLRClosure([{ pIdx: 0, head: this.prods[0].head, body: this.prods[0].body, dot: 0 }]);
        }
        else {
            i0 = this.getCLRClosure([{ pIdx: 0, head: this.prods[0].head, body: this.prods[0].body, dot: 0, lookahead: '$' }]);
        }
        this.states.push(i0);

        for (let i = 0; i < this.states.length; i++) {
            this.table[i] = {};
            [...this.terms, ...this.nonTerms].forEach(sym => {
                let moved = []
                this.states[i].forEach(item => {
                    if (item.body[item.dot] === sym) {
                        moved.push({ ...item, dot: item.dot + 1 });
                    }
                });
                if (moved.length > 0) {
                    let next = (this.type === "SLR") ? this.getSLRClosure(moved) : this.getCLRClosure(moved);
                    let idx = this.states.findIndex(s => JSON.stringify(s) === JSON.stringify(next));
                    if (idx === -1) {
                        idx = this.states.length;
                        this.states.push(next);
                    }
                    this.table[i][sym] = this.terms.has(sym) ? "s" + idx : idx;
                }
            });

            this.states[i].forEach(item => {
                if (item.dot === item.body.length) {
                    if (item.pIdx === 0) {
                        this.table[i]['$'] = 'acc';
                    } else if (this.type === "SLR") {
                        this.follow[item.head].forEach(t => this.table[i][t] = "r" + item.pIdx);
                    } else {
                        this.table[i][item.lookahead] = "r" + item.pIdx;
                    }
                }
            });
        }
    }

    parsestringandbuildtree(inputstr) {
        const tokens = inputstr.trim().split(/\s+/).concat('$');
        let stack = [0];
        let nodestack = [];
        let i = 0;
        let trace = [];
        

        while (true) {
            let state = stack[stack.length - 1];
            let sym = tokens[i];
            let action = this.table[state] ? this.table[state][sym] : null;
            if (!action) throw new Error(`Syntax error at "${sym}"`);
            if (action === 'acc') {
                trace.push([stack.join(' '), tokens.slice(i).join(' '), "Accept"]);
                return { tree: nodestack, trace: trace };
            }
            if (typeof action === 'string' && action.startsWith('s')) {
                let nextState = parseInt(action.substring(1));
                trace.push([stack.join(' '), tokens.slice(i).join(' '), "Shift" + nextState]);
                stack.push(sym, nextState);
                nodestack.push({ name: sym, children: [] });
                i++;
            }

            else if (typeof action === 'string' && action.startsWith('r')) {
                let pIdx = parseInt(action.substring(1));
                let p = this.prods[pIdx];
                trace.push([stack.join(' '), tokens.slice(i).join(' '), `reduce by ${p.head} → ${p.body.join(' ')}`]);
                let children = [];
                for (let j = 0 ; j < p.body.length ; j++) {
                    stack.pop(); stack.pop()
                    children.unshift(nodestack.pop());
                }
                let prevState = stack[stack.length - 1];
                stack.push(p.head, this.table[prevState][p.head]);
                nodestack.push({ name: p.head, children: children });
            }
        }
    }

}