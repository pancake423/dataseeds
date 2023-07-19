let GRAPH_RENDERER;
let GRAPH_RENDERER_PRINT;

window.onload = init;
window.onmessage = drawGraph;

function init() {
    GRAPH_RENDERER = new GraphRenderer(document.getElementById("graph-parent"));
    GRAPH_RENDERER_PRINT = new GraphRenderer(document.getElementById("graph-parent-print"));
    window.opener.postMessage('g', "*"); //request graph data from the parent window
}

function drawGraph(e) {
    document.title = "Graph: " + e.data.title;
    GRAPH_RENDERER.draw(e.data.title, e.data.plotlyJSCalls);
    GRAPH_RENDERER_PRINT.draw(e.data.title, e.data.plotlyJSCalls);
}