class ParserEngine {
    constructor(grammarStr, parserType = "slr1") {
        this.grammarStr = grammarStr;
        this.parserType = parserType;

        this.prods = [];
        this.displayProds = [];
        this.nonTerms = [];
        this.terms = [];
        this.first = {};
        this.follow = {};
        this.states = [];
        this.gotoMap = {};
        this.table = {};
        this.startSymbol = "";
        this.augmentedStart = "";
        this.augIndex = -1;
        this.conflicts = [];
        this.isAmbiguous = false;

        this.parseGrammar();
        this.computeFirst();
        this.computeFollow();
    }

    parseGrammar() {
        const lines = this.grammarStr
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);

        lines.forEach((line, index) => {
            const parts = line.split("->");
            if (parts.length !== 2) return;

            const head = parts[0].trim();

            if (index === 0) {
                this.startSymbol = head;
            }

            if (!this.nonTerms.includes(head)) {
                this.nonTerms.push(head);
            }
        });

        this.augmentedStart = this.startSymbol + "'";

        if (!this.nonTerms.includes(this.augmentedStart)) {
            this.nonTerms.unshift(this.augmentedStart);
        }

        // Original productions in exact user-written order
        lines.forEach(line => {
            const parts = line.split("->");
            if (parts.length !== 2) return;

            const head = parts[0].trim();
            const alternatives = parts[1].split("|");

            alternatives.forEach(alt => {
                const trimmed = alt.trim();
                let tokens = [];

                if (trimmed === "" || trimmed === "ε") {
                    tokens = ["ε"];
                } else {
                    tokens = trimmed.split(/\s+/);
                }

                this.prods.push({
                    head: head,
                    body: tokens
                });
            });
        });

        // Save display order before adding augmented production
        this.displayProds = this.prods.map(p => ({
            head: p.head,
            body: [...p.body]
        }));

        // Add augmented production at the end internally
        this.augIndex = this.prods.length;
        this.prods.push({
            head: this.augmentedStart,
            body: [this.startSymbol]
        });

        this.prods.forEach(prod => {
            prod.body.forEach(sym => {
                if (
                    sym !== "ε" &&
                    !this.nonTerms.includes(sym) &&
                    !this.terms.includes(sym)
                ) {
                    this.terms.push(sym);
                }
            });
        });

        if (!this.terms.includes("$")) {
            this.terms.push("$");
        }
    }

    computeFirst() {
        this.first = {};

        [...this.nonTerms, ...this.terms, "ε"].forEach(sym => {
            this.first[sym] = new Set();
        });

        this.terms.forEach(t => {
            this.first[t].add(t);
        });

        this.first["ε"].add("ε");

        let changed = true;

        while (changed) {
            changed = false;

            this.prods.forEach(prod => {
                const head = prod.head;
                const body = prod.body;

                if (!this.first[head]) {
                    this.first[head] = new Set();
                }

                if (body.length === 1 && body[0] === "ε") {
                    if (!this.first[head].has("ε")) {
                        this.first[head].add("ε");
                        changed = true;
                    }
                    return;
                }

                let nullable = true;

                for (let i = 0; i < body.length; i++) {
                    const symbol = body[i];

                    if (!this.first[symbol]) {
                        this.first[symbol] = new Set();
                    }

                    this.first[symbol].forEach(val => {
                        if (val !== "ε" && !this.first[head].has(val)) {
                            this.first[head].add(val);
                            changed = true;
                        }
                    });

                    if (!this.first[symbol].has("ε")) {
                        nullable = false;
                        break;
                    }
                }

                if (nullable) {
                    if (!this.first[head].has("ε")) {
                        this.first[head].add("ε");
                        changed = true;
                    }
                }
            });
        }
    }

    computeFollow() {
        this.follow = {};

        this.nonTerms.forEach(nt => {
            this.follow[nt] = new Set();
        });

        this.follow[this.startSymbol].add("$");
        this.follow[this.augmentedStart].add("$");

        let changed = true;

        while (changed) {
            changed = false;

            this.prods.forEach(prod => {
                const head = prod.head;
                const body = prod.body;

                if (!this.follow[head]) {
                    this.follow[head] = new Set();
                }

                for (let i = 0; i < body.length; i++) {
                    const B = body[i];

                    if (!this.nonTerms.includes(B)) continue;

                    let nullableSuffix = true;

                    for (let j = i + 1; j < body.length; j++) {
                        const next = body[j];

                        if (!this.first[next]) {
                            this.first[next] = new Set();
                        }

                        this.first[next].forEach(val => {
                            if (val !== "ε" && !this.follow[B].has(val)) {
                                this.follow[B].add(val);
                                changed = true;
                            }
                        });

                        if (!this.first[next].has("ε")) {
                            nullableSuffix = false;
                            break;
                        }
                    }

                    if (i === body.length - 1 || nullableSuffix) {
                        this.follow[head].forEach(val => {
                            if (!this.follow[B].has(val)) {
                                this.follow[B].add(val);
                                changed = true;
                            }
                        });
                    }
                }
            });
        }
    }

    firstOfSequence(sequence, lookahead = "$") {
        let result = new Set();

        if (!sequence || sequence.length === 0) {
            result.add(lookahead);
            return result;
        }

        let nullable = true;

        for (let i = 0; i < sequence.length; i++) {
            const symbol = sequence[i];

            if (!this.first[symbol]) {
                this.first[symbol] = new Set();
            }

            this.first[symbol].forEach(val => {
                if (val !== "ε") {
                    result.add(val);
                }
            });

            if (!this.first[symbol].has("ε")) {
                nullable = false;
                break;
            }
        }

        if (nullable) {
            result.add(lookahead);
        }

        return result;
    }

    getClosure(items) {
        let closure = [...items];
        let changed = true;

        while (changed) {
            changed = false;

            for (let k = 0; k < closure.length; k++) {
                const item = closure[k];
                const prod = this.prods[item.pIdx];
                const symbol = prod.body[item.dot];

                if (this.nonTerms.includes(symbol)) {
                    this.prods.forEach((p, idx) => {
                        if (p.head !== symbol) return;

                        let lookaheads = new Set(["$"]);

                        if (this.parserType === "clr1" || this.parserType === "lalr1") {
                            const beta = prod.body.slice(item.dot + 1);
                            lookaheads = this.firstOfSequence(beta, item.lookahead || "$");
                        }

                        lookaheads.forEach(la => {
                            const newItem = {
                                pIdx: idx,
                                dot: 0,
                                lookahead: (this.parserType === "clr1" || this.parserType === "lalr1") ? la : undefined
                            };

                            const exists = closure.some(c =>
                                c.pIdx === newItem.pIdx &&
                                c.dot === newItem.dot &&
                                c.lookahead === newItem.lookahead
                            );

                            if (!exists) {
                                closure.push(newItem);
                                changed = true;
                            }
                        });
                    });
                }
            }
        }

        return closure;
    }

    goto(items, symbol) {
        let moved = [];

        items.forEach(item => {
            const prod = this.prods[item.pIdx];

            if (prod.body[item.dot] === symbol) {
                moved.push({
                    pIdx: item.pIdx,
                    dot: item.dot + 1,
                    lookahead: item.lookahead
                });
            }
        });

        if (moved.length === 0) return [];
        return this.getClosure(moved);
    }

    sameState(a, b) {
        if (a.length !== b.length) return false;

        return a.every(itemA =>
            b.some(itemB =>
                itemA.pIdx === itemB.pIdx &&
                itemA.dot === itemB.dot &&
                itemA.lookahead === itemB.lookahead
            )
        );
    }

    sameCore(a, b) {
        if (a.length !== b.length) return false;

        return a.every(itemA =>
            b.some(itemB =>
                itemA.pIdx === itemB.pIdx &&
                itemA.dot === itemB.dot
            )
        );
    }

    findAcceptState() {
        for (let i = 0; i < this.states.length; i++) {
            const state = this.states[i];

            for (let j = 0; j < state.length; j++) {
                const item = state[j];
                const prod = this.prods[item.pIdx];

                if (
                    item.pIdx === this.augIndex &&
                    prod.head === this.augmentedStart &&
                    prod.body.length === 1 &&
                    prod.body[0] === this.startSymbol &&
                    item.dot === 1
                ) {
                    return i;
                }
            }
        }
        return -1;
    }

    forceAcceptStateToOne() {
        const acceptIndex = this.findAcceptState();

        if (acceptIndex === -1 || acceptIndex === 1 || this.states.length < 2) {
            return;
        }

        let order = [];
        for (let i = 0; i < this.states.length; i++) {
            order.push(i);
        }

        const temp = order[1];
        order[1] = order[acceptIndex];
        order[acceptIndex] = temp;

        let oldToNew = {};
        for (let newIndex = 0; newIndex < order.length; newIndex++) {
            oldToNew[order[newIndex]] = newIndex;
        }

        let newStates = new Array(this.states.length);
        for (let oldIndex = 0; oldIndex < this.states.length; oldIndex++) {
            const newIndex = oldToNew[oldIndex];
            newStates[newIndex] = this.states[oldIndex];
        }

        let newGotoMap = {};
        for (let key in this.gotoMap) {
            const parts = key.split("_");
            const oldFrom = parseInt(parts[0]);
            const symbol = parts.slice(1).join("_");
            const oldTo = this.gotoMap[key];

            const newFrom = oldToNew[oldFrom];
            const newTo = oldToNew[oldTo];

            newGotoMap[`${newFrom}_${symbol}`] = newTo;
        }

        this.states = newStates;
        this.gotoMap = newGotoMap;
    }

    buildStates() {
        this.states = [];
        this.gotoMap = {};

        const startItem = {
            pIdx: this.augIndex,
            dot: 0,
            lookahead: (this.parserType === "clr1" || this.parserType === "lalr1") ? "$" : undefined
        };

        const startState = this.getClosure([startItem]);
        this.states.push(startState);

        for (let i = 0; i < this.states.length; i++) {
            const state = this.states[i];
            const symbols = [...this.terms.filter(t => t !== "$"), ...this.nonTerms];

            symbols.forEach(sym => {
                const nextState = this.goto(state, sym);

                if (nextState.length === 0) return;

                let existingIndex = this.states.findIndex(s => this.sameState(s, nextState));

                if (existingIndex === -1) {
                    this.states.push(nextState);
                    existingIndex = this.states.length - 1;
                }

                this.gotoMap[`${i}_${sym}`] = existingIndex;
            });
        }

        if (this.parserType === "lalr1") {
            this.mergeLALRStates();
        }

        this.forceAcceptStateToOne();
    }

    mergeLALRStates() {
        let groups = [];
        let stateToGroup = new Array(this.states.length).fill(-1);

        for (let i = 0; i < this.states.length; i++) {
            let found = -1;

            for (let g = 0; g < groups.length; g++) {
                if (this.sameCore(this.states[i], groups[g][0])) {
                    found = g;
                    break;
                }
            }

            if (found === -1) {
                groups.push([this.states[i]]);
                stateToGroup[i] = groups.length - 1;
            } else {
                groups[found].push(this.states[i]);
                stateToGroup[i] = found;
            }
        }

        let mergedStates = groups.map(group => {
            let combined = [];

            group.forEach(state => {
                state.forEach(item => {
                    const exists = combined.some(c =>
                        c.pIdx === item.pIdx &&
                        c.dot === item.dot &&
                        c.lookahead === item.lookahead
                    );

                    if (!exists) {
                        combined.push({ ...item });
                    }
                });
            });

            return combined;
        });

        let newGotoMap = {};

        for (let oldKey in this.gotoMap) {
            const parts = oldKey.split("_");
            const oldFrom = parseInt(parts[0]);
            const sym = parts.slice(1).join("_");
            const oldTo = this.gotoMap[oldKey];

            const newFrom = stateToGroup[oldFrom];
            const newTo = stateToGroup[oldTo];

            newGotoMap[`${newFrom}_${sym}`] = newTo;
        }

        this.states = mergedStates;
        this.gotoMap = newGotoMap;
    }

    recordConflict(state, symbol, oldAction, newAction) {
        let type = "Unknown";

        if (
            (oldAction.startsWith("s") && newAction.startsWith("r")) ||
            (oldAction.startsWith("r") && newAction.startsWith("s"))
        ) {
            type = "Shift-Reduce";
        } else if (
            oldAction.startsWith("r") && newAction.startsWith("r")
        ) {
            type = "Reduce-Reduce";
        }

        this.conflicts.push({
            state,
            symbol,
            oldAction,
            newAction,
            type
        });

        this.isAmbiguous = true;
    }

    buildtable() {
        this.conflicts = [];
        this.isAmbiguous = false;
        this.table = {};

        this.buildStates();

        this.states.forEach((state, i) => {
            this.table[i] = {};
        });

        this.states.forEach((state, i) => {
            state.forEach(item => {
                const prod = this.prods[item.pIdx];
                const nextSym = prod.body[item.dot];

                if (nextSym && this.terms.includes(nextSym) && nextSym !== "$") {
                    const toState = this.gotoMap[`${i}_${nextSym}`];

                    if (toState !== undefined) {
                        const action = "s" + toState;

                        if (this.table[i][nextSym] && this.table[i][nextSym] !== action) {
                            this.recordConflict(i, nextSym, this.table[i][nextSym], action);
                        } else {
                            this.table[i][nextSym] = action;
                        }
                    }
                }

                const isEpsilonProd = (prod.body.length === 1 && prod.body[0] === "ε");
                const isComplete = item.dot === prod.body.length || isEpsilonProd;

                if (isComplete) {
                    if (item.pIdx === this.augIndex) {
                        this.table[i]["$"] = "acc";
                    } else {
                        let reduceSymbols = [];

                        if (this.parserType === "lr0") {
                            reduceSymbols = this.terms;
                        } else if (this.parserType === "clr1" || this.parserType === "lalr1") {
                            reduceSymbols = [item.lookahead || "$"];
                        } else {
                            reduceSymbols = [...this.follow[prod.head]];
                        }

                        reduceSymbols.forEach(sym => {
                            const action = "r" + item.pIdx;

                            if (this.table[i][sym] && this.table[i][sym] !== action) {
                                this.recordConflict(i, sym, this.table[i][sym], action);
                            } else {
                                this.table[i][sym] = action;
                            }
                        });
                    }
                }
            });

            this.nonTerms.forEach(nt => {
                if (nt === this.augmentedStart) return;

                const toState = this.gotoMap[`${i}_${nt}`];
                if (toState !== undefined) {
                    this.table[i][nt] = toState;
                }
            });
        });
    }

    parsestringandbuildtree(input) {
        if (this.conflicts.length > 0) {
            return {
                accepted: false,
                error: "Parsing stopped because grammar contains conflicts.",
                conflicts: this.conflicts,
                trace: [],
                tree: null
            };
        }

        const tokens = input.trim().length ? input.trim().split(/\s+/) : [];
        tokens.push("$");

        let stack = [0];
        let trace = [];
        let nodeStack = [];

        while (true) {
            const state = stack[stack.length - 1];
            const current = tokens[0];
            const action = this.table[state] ? this.table[state][current] : undefined;

            trace.push([
                stack.join(" "),
                tokens.join(" "),
                action || "error"
            ]);

            if (!action) {
                return {
                    accepted: false,
                    error: "Invalid string",
                    trace,
                    tree: null
                };
            }

            if (action === "acc") {
                return {
                    accepted: true,
                    trace,
                    tree: nodeStack.length > 0 ? nodeStack[0] : null
                };
            }

            if (action.startsWith("s")) {
                const nextState = parseInt(action.slice(1));

                nodeStack.push({
                    name: current,
                    children: []
                });

                stack.push(current);
                stack.push(nextState);
                tokens.shift();
            } else if (action.startsWith("r")) {
                const prodIndex = parseInt(action.slice(1));
                const prod = this.prods[prodIndex];

                let children = [];

                if (!(prod.body.length === 1 && prod.body[0] === "ε")) {
                    for (let i = 0; i < prod.body.length; i++) {
                        stack.pop();
                        stack.pop();
                        children.unshift(nodeStack.pop());
                    }
                } else {
                    children.push({
                        name: "ε",
                        children: []
                    });
                }

                const newNode = {
                    name: prod.head,
                    children: children
                };

                const topState = stack[stack.length - 1];
                const gotoState = this.table[topState][prod.head];

                if (gotoState === undefined) {
                    return {
                        accepted: false,
                        error: "Goto state missing after reduction",
                        trace,
                        tree: null
                    };
                }

                stack.push(prod.head);
                stack.push(gotoState);
                nodeStack.push(newNode);
            }
        }
    }
}