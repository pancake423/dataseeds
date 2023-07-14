class GraphRenderer {
    #parentDiv;
    #title;
    #graphContainer;
    #graphTotalWidth;
    #graphTotalHeight;
    #drawCall;
    static colorList = ['rgb(102, 197, 204)', 'rgb(246, 207, 113)', 'rgb(248, 156, 116)', 'rgb(220, 176, 242)', 'rgb(135, 197, 95)', 'rgb(158, 185, 243)', 'rgb(254, 136, 177)', 'rgb(201, 219, 116)', 'rgb(139, 224, 164)', 'rgb(180, 151, 231)', 'rgb(179, 179, 179)'];
    static colorIndex = 0;
    /**
     * binds a GraphRenderer to a div where it should display content.
     * @param {Node} parentDiv - div to bind graph to
     */
    constructor(parentDiv) {
        this.#parentDiv = parentDiv;
        this.#title = document.createElement("h2");
        this.#title.style="margin:0;text-align:center;padding:0.5rem;";

        
        this.#graphContainer = document.createElement("div");
        this.#graphContainer.style = "display:flex;flex-direction:row";
        
        this.#parentDiv.innerHTML = "";
        this.#parentDiv.appendChild(this.#title);
        this.#parentDiv.appendChild(this.#graphContainer);

        this.#graphTotalWidth = this.#parentDiv.clientWidth;
        this.#title.width = this.#graphTotalWidth;
    }
    /**
     * gets the correct data for a single variable to graph.
     * @param {PopupVariableData} varInfo - configuration options of variable
     * @param {BudgetDataFrame} DF - data frame to pull data from
     * @param {Boolean} agg - whether or not to include the aggregated column in the output.
     * @returns 
     */
    static #extractColumn(varInfo, DF, agg=false) {
        // filter DF
        // extract column
        // name column
        let filteredDF = DF;
        for (const f of varInfo.filter) {
            filteredDF = DF.filter(...f);
        }
        return {
           name: varInfo.name,
           raw: filteredDF.getColumn(varInfo.source),
           agg: agg ? filteredDF.valueCount(varInfo.source) : undefined 
        }
    }
    static #getRenderInfo(plotInfo) {
        let colorPalatte = [];
        let footer = plotInfo.footer //TODO: calculate if other stuff needs to get appended to the footer
        for (const c of plotInfo.variables) {
            colorPalatte.push(GraphRenderer.colorList[GraphRenderer.colorIndex]);
            GraphRenderer.colorIndex++;
            GraphRenderer.colorIndex %= GraphRenderer.colorList.length;
        }
        console.log(colorPalatte);
        let data = [];
        let layout = {
            title: {
                text: plotInfo.subtitle
            },
            colorway: colorPalatte, //array of colors
            xaxis: {title: plotInfo.xlabel},
            yaxis: {title: plotInfo.ylabel},
        };
        let config = {
            staticPlot: true
        };
        switch (plotInfo.type) {
            case "bar":
                // standard bar graph

                break;
            case "barstack":
                // stacked bar graph
                break;
            case "scatter":
                break;
            case "pie":
                break;
            case "table":
                // plotly does tables too!
                break;
            
            
        }
        return [footer, data, layout, config];
    }
    /**
     * renders the specified graph in the parent div.
     * @param {PopupGraphData} data - object describing how to get and display graph data.
     * @param {BudgetDataFrame} DF - data frame containing source data.
     */
    render(data, DF) {
        this.draw(data.title, data.data.map((v) => GraphRenderer.#getRenderInfo(v)));
    }
    draw(title, plotlyJSCalls) {
        // save draw call for passing to new window (when popped out)
        this.#drawCall = {
            title: title,
            plotlyJSCalls: plotlyJSCalls
        }
        // set graph title
        this.#title.innerText = title;

        //draw plots
        this.#graphContainer.innerHTML = "";
        this.#graphTotalWidth = this.#parentDiv.clientWidth;
        this.#graphTotalHeight = this.#parentDiv.clientHeight - this.#title.offsetHeight - 32; //32px bottom margin for padding
        const w = this.#graphTotalWidth / plotlyJSCalls.length;
        const h = this.#graphTotalHeight;
        for (const call of plotlyJSCalls) {
            const div = document.createElement("div");
            div.style.width = w;
            div.style.height = h;
            this.#graphContainer.appendChild(div);
            Plotly.newPlot(div, ...call.slice(1)); // first element of each call is the footer text, everything else goes to plotly.
        }
    }
    /**
     * opens the currently rendered graph in a new tab.
     */
    popout() {

    }
}