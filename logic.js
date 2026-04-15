document.getElementById("runbtn").addEventListener("click", async () => {
    try {
        const grammar = document.getElementById("GrammarInput").value.trim();
        const inputstr = document.getElementById("StringInput").value.trim();
        const parserType = document.getElementById("ParserChoice").value;

        if (grammar === "") {
            alert("Please enter grammar first.");
            return;
        }

        const engine = new ParserEngine(grammar, parserType);
        engine.buildtable();

        document.getElementById("results").style.display = "block";
        document.getElementById("emptystate").style.display = "none";

        document.querySelectorAll(".animate-section").forEach(sec => {
            sec.classList.remove("show");
        });

        Visualizer.renderproductions(engine.prods);
        Visualizer.rendersets(engine.nonTerms, engine.first, engine.follow);
        await showSection(0);

        Visualizer.renderitemsets(engine.states, engine.prods);
        await showSection(1);

        const headers = [...engine.terms, ...engine.nonTerms];
        Visualizer.rendertable("TableDisplay", headers, engine.table);
        await showSection(2);

        Visualizer.renderConflicts(engine.conflicts);
        await showSection(3);

        const result = engine.parsestringandbuildtree(inputstr);
        Visualizer.rendertrace(result.trace || []);
        await showSection(4);

        if (result.conflicts && result.conflicts.length > 0) {
            Visualizer.renderConflicts(result.conflicts);
        }

        Visualizer.rendertree(result.tree, "TreeDisplay");
        await showSection(5);

        if (!result.accepted && result.error) {
            console.warn(result.error);
        }

    } catch (e) {
        alert("Error: " + e.message);
        console.error(e);
    }
});

function showSection(index) {
    return new Promise(resolve => {
        const sections = document.querySelectorAll(".animate-section");
        if (sections[index]) {
            sections[index].classList.add("show");
        }
        setTimeout(resolve, 500);
    });
}

document.getElementById("clearbtn").addEventListener("click", () => {
    location.reload();
});