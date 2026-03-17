document.getElementById("runbtn").addEventListener('click', () => {
    try {
        const grammar = document.getElementById("GrammarInput").value;
        const inputstr = document.getElementById("StringInput").value;

        const parserType = document.getElementById("ParserChoice").value;

        const engine = new ParserEngine(grammar, parserType);
        engine.buildtable();

        document.getElementById('results').style.display = "block";
        document.getElementById('emptystate').style.display = "none";

        Visualizer.renderproductions(engine.prods);
        Visualizer.rendersets(engine.nonTerms, engine.first, engine.follow);

        Visualizer.renderitemsets(engine.states);

        const headers = [...engine.terms, ...engine.nonTerms];
        Visualizer.rendertable('TableDisplay', headers, engine.table)

        const result = engine.parsestringandbuildtree(inputstr);

        Visualizer.rendertrace(result.trace);
        Visualizer.rendertree(result.tree, 'TreeDisplay');

    } catch (e) {
        alert("Error: " + e.message);
        console.error(e);
    }   

});

document.getElementById("clearbtn").onclick = () => location.reload();