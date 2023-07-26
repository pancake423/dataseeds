class GraphRenderer {
    #parentDiv;
    #title;
    #graphContainer;
    #graphTotalWidth;
    #graphTotalHeight;
    #drawCall;
    #footerContainer;
    static colorList = ['rgb(102, 197, 204)', 'rgb(246, 207, 113)', 'rgb(248, 156, 116)', 'rgb(220, 176, 242)', 'rgb(135, 197, 95)', 'rgb(158, 185, 243)', 'rgb(254, 136, 177)', 'rgb(201, 219, 116)', 'rgb(139, 224, 164)', 'rgb(180, 151, 231)', 'rgb(179, 179, 179)'];
    static colorIndex = 0;
    static SCATTER_MIN = 5;
    static SCATTER_MAX = 30;
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

        this.#footerContainer = document.createElement("div");
        this.#footerContainer.style = "display:flex;flex-direction:row";
        
        this.#parentDiv.innerHTML = "";
        this.#parentDiv.appendChild(this.#title);
        this.#parentDiv.appendChild(this.#graphContainer);
        this.#parentDiv.appendChild(this.#footerContainer);

        this.#graphTotalWidth = this.#parentDiv.clientWidth;
        this.#title.width = this.#graphTotalWidth;
    }
    /**
     * gets the correct data for a single variable to graph.
     * @param {PopupVariableData} varInfo - configuration options of variable
     * @param {BudgetDataFrame} DF - data frame to pull data from
     * @param {Array} CODEBOOK- codebook describing conversions applied to standard variables.
     * @param {Boolean} agg - whether or not to include the aggregated column in the output.
     * @returns {Object} {name: variable name, raw: array of column raw data, agg: (if requested) value count of column}
     */
    static #extractColumn(varInfo, DF, CODEBOOK, missingData, agg=false) {
        // filter DF
        // extract column
        // name column
        let filteredDF = DataFilter.applyFilter(DF, varInfo.filter);
        let col = filteredDF.getColumn(varInfo.source);
        //apply codebook to column
        const codebookIndex = CODEBOOK[0].findIndex((i) => i === varInfo.source);
        const missingReplacement = missingData.missing ? missingData.missingValue : "";
        const rangeReplacement = missingData.range ? missingData.rangeValue : "";
        if (codebookIndex !== -1) {
            switch (CODEBOOK[1][codebookIndex]) {
                case "range":
                    const min = CODEBOOK[2][codebookIndex].min;
                    const max = CODEBOOK[2][codebookIndex].max;
                    for (let i = 0; i < col.length; i++) {
                        if (col[i] === "") {
                            // missing data
                            col[i] = missingReplacement;
                            continue;
                        }
                        let v = Number(col[i]);
                        if (Number.isNaN(v) || v < min || v > max) {
                            // unmatched data
                            col[i] = rangeReplacement;
                            continue;
                        }
                        col[i] = v;
                    }
                    break;
                case "convert":
                    for (let i = 0; i < col.length; i++) {
                        if (col[i] === "") {
                            // missing data
                            col[i] = missingReplacement;
                            continue;
                        }
                        if (col[i] in CODEBOOK[2][codebookIndex]) {
                            col[i] = CODEBOOK[2][codebookIndex][col[i]];
                        } else {
                            // unmatched data
                            col[i] = rangeReplacement;
                            continue;
                        }
                    }
                    break;
                case "none":
                    for (let i = 0; i < col.length; i++) {
                        if (col[i] === "") {
                            // missing data
                            col[i] = missingReplacement;
                        }
                    }
                    break;
                default:
                    throw Error("How did you get here?");
            }
        } else {
            // custom variable. gets the same treatment as conversion type "none".
            for (let i = 0; i < col.length; i++) {
                if (col[i] === "") {
                    // missing data
                    col[i] = missingReplacement;
                }
            }
        }
        return {
           name: varInfo.name,
           raw: col,
           agg: agg ? GraphRenderer.#valueCount(col) : undefined 
        }
    }
    /**
     * count the number of instances of each unique value in an array.
     * @param {Array} arr 
     * @returns {Object} object whose keys represent unique values in the array, and whose values represent the number of occurances of that array value.
     */
    static #valueCount(arr) {
        let uniqueValues = {};
        for (const item of arr) {
            if (item in uniqueValues) {
                uniqueValues[item]++;
                continue;
            }
            uniqueValues[item] = 1;
        }
        return uniqueValues;
    }
    /**
     * counts the number of unique (a, b) pairs in the arrays a and b.
     * @param {Array} a -first array
     * @param {Array} b -second array
     * @returns {Array<Array>} first array represents the item from a of each unique pair, the second represents the item from b of each unique pair, and the third represents the value count of each pair.
     */
    static #valueCount2d(a, b) {
        const getIndex = (a1, a2, v1, v2) => {
            for (let i = 0; i < a1.length; i++) {
                if (a1[i] === v1 && a2[i] === v2) return i;
            }
            return -1;
        }
        let aout = [], bout = [], vcount = []
        for (let i = 0; i < a.length; i++) {
            const outputIndex = getIndex(aout, bout, a[i], b[i]);
            if (outputIndex === -1) {
                aout.push(a[i]);
                bout.push(b[i]);
                vcount.push(1);
            } else {
                vcount[outputIndex]++;
            }
        }
        return [aout, bout, vcount];
    }
    /**
     * converts popup plot data into the corresponding plotly.js calls.
     * @param {PopupPlotData} plotInfo
     * @param {BudgetDataFrame} DF - DF containing data to parse
     * @param {Array} CODEBOOK- codebook describing conversions applied to standard variables.
     * @param {Object} missingData - missing data object describing how to handle missing data.
     * @returns {Array} - [footer text, data, layout, config]
     */
    static #getRenderInfo(plotInfo, DF, CODEBOOK, missingData) {
        let colorPalatte = [];
        let footer = plotInfo.footer + "<br>";
        let numColors = plotInfo.variables.length;
        if (plotInfo.type === "pie") {numColors = GraphRenderer.colorList.length};
        for (let i = 0; i < numColors; i++) {
            colorPalatte.push(GraphRenderer.colorList[GraphRenderer.colorIndex]);
            GraphRenderer.colorIndex++;
            GraphRenderer.colorIndex %= GraphRenderer.colorList.length;
        }

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
                for (const v of plotInfo.variables) {
                    const variableData = GraphRenderer.#extractColumn(v, DF, CODEBOOK, missingData, true);
                    let [x, y, f] = GraphRenderer.#parseAggregatedData(variableData, missingData);
                    footer += f;
                    data.push({
                        type: "bar",
                        x: x,
                        y: y,
                        text: y.map(String),
                        textposition: "outside",
                        name: variableData.name
                    });
                }
                layout.xaxis["type"] = "category";
                break;
            case "barstack":
                // stacked bar graph
                for (const v of plotInfo.variables) {
                    const variableData = GraphRenderer.#extractColumn(v, DF, CODEBOOK, missingData, true);
                    let [x, y, f] = GraphRenderer.#parseAggregatedData(variableData, missingData);
                    footer += f;
                    data.push({
                        type: "bar",
                        x: x,
                        y: y,
                        text: y.map(String),
                        textposition: "outside",
                        name: variableData.name,
                    });
                }
                layout.xaxis["type"] = "category";
                layout["barmode"] = "stack";
                break;
            case "line":
                for (const v of plotInfo.variables) {
                    const variableData = GraphRenderer.#extractColumn(v, DF, CODEBOOK, missingData, true);
                    let [x, y, f] = GraphRenderer.#parseAggregatedData(variableData, missingData);
                    footer += f;
                    data.push({
                        type: "scatter",
                        x: x,
                        y: y,
                        name: variableData.name,
                        mode: "lines+markers"
                    });
                }
                break;
            case "scatter":
                // just like line when 1 variable, plot raw data w/ two variables.
                if (plotInfo.variables.length === 1) {
                    const variableData = GraphRenderer.#extractColumn(plotInfo.variables[0], DF, CODEBOOK, missingData, true);
                    let [x, y, f] = GraphRenderer.#parseAggregatedData(variableData, missingData);
                    footer += f;
                    data.push({
                        type: "scatter",
                        x: x,
                        y: y,
                        name: variableData.name,
                        mode: "markers"
                    });
                } else {
                    // two variables, plot v1 as x and v2 as y.
                    // do a 2d count of x, y pairs, the count is the marker size.
                    let [x, y, size] = GraphRenderer.#valueCount2d(
                        GraphRenderer.#extractColumn(plotInfo.variables[0], DF, CODEBOOK, missingData).raw,
                        GraphRenderer.#extractColumn(plotInfo.variables[1], DF, CODEBOOK, missingData).raw
                    );
                    // scale size to fit between a min and max marker size.
                    let [max, min] = [Math.max(...size), Math.min(...size)];
                    size = size.map((v) => GraphRenderer.SCATTER_MIN + (GraphRenderer.SCATTER_MAX - GraphRenderer.SCATTER_MIN) * ((v - min) / (max - min)));
                    data.push({
                        type: "scatter",
                        x: x,
                        y: y,
                        marker: {
                            size: size,
                        },
                        mode: "markers"
                    });
                }
                break;
            case "pie":
                // stacked bar graph
                for (const v of plotInfo.variables) {
                    const variableData = GraphRenderer.#extractColumn(v, DF, CODEBOOK, missingData, true);
                    let x, y, f;
                    [x, y, f] = GraphRenderer.#parseAggregatedData(variableData, missingData);
                    footer += f;
                    data.push({
                        type: "pie",
                        labels: x,
                        values: y,
                        text: y.map(String),
                        textposition: "outside",
                        name: variableData.name,
                        rotation: 180,
                        sort: false
                    });
                    GraphRenderer.colorIndex += x.length;
                    GraphRenderer.colorIndex %= GraphRenderer.colorList.length;
                }
                break;
            case "table":
                // plotly does tables too!
                if (plotInfo.variables.length === 1) {
                    const variableData = GraphRenderer.#extractColumn(plotInfo.variables[0], DF, CODEBOOK, missingData, true);
                    let [x, y, f] = GraphRenderer.#parseAggregatedData(variableData, missingData);
                    footer += f;
                    data.push({
                        type: "table",
                        header: {
                            values: [plotInfo.xlabel, plotInfo.ylabel],
                            align: "center",
                            fill: {color: "#f5f0f0"},
                            font: {size: 16}
                        },
                        cells: {
                            values: [x, y],
                            align: "center",
                            font: {size: 16},
                            height: 28
                        }

                    });
                } else {
                    // two variables, plot v1 as x and v2 as y.
                    // do a 2d count of x, y pairs
                    let [c1, c2] = [GraphRenderer.#extractColumn(plotInfo.variables[0], DF, CODEBOOK, missingData), GraphRenderer.#extractColumn(plotInfo.variables[1], DF, CODEBOOK, missingData)];
                    let [th, td] = GraphRenderer.#constructTableData(c1.raw, c2.raw);
                    data.push({
                        type: "table",
                        header: {
                            values: th,
                            align: "center",
                            fill: {color: "#f5f0f0"},
                            font: {size: 16}
                        },
                        cells: {
                            values: td,
                            align: "center",
                            font: {size: 16},
                            height: 28,
                            fill: {color: ["#f5f0f0", "white"]}
                        }
                    });
                }
                break;
            
            
        }
        return [footer, data, layout, config];
    }
    /**
     * helper function for #getRenderInfo for type 'table'. Constructs a frequency table for two linked arrays.
     * @param {Array} a 
     * @param {Array} b 
     */
    static #constructTableData(a, b) {
        const sortFn = (a, b) => {
            const na = !Number.isNaN(Number(a));
            const nb = !Number.isNaN(Number(b));
            if (na && !nb) return -1;
            if (!na && nb) return 1;
            if (na && nb) {
                return Number(a) - Number(b);
            }
            if (!na && !nb) {
                if (a < b) return -1;
                if (a < b) return 1;
            }
            return 0;
        }
        let v1keys = Object.keys(GraphRenderer.#valueCount(a));
        let v2keys = Object.keys(GraphRenderer.#valueCount(b));
        v1keys.sort(sortFn);
        v2keys.sort(sortFn);


        let td = new Array(v1keys.length).fill(() => new Array(v2keys.length).fill(0)).map((v) => v()); // kind of a funny way to make a 2d array since fill normally passes arrays by reference

        for (let i = 0; i < a.length; i++) {
            td[v1keys.findIndex((v) => v == a[i])][v2keys.findIndex((v) => v == b[i])]++;
        }
        

        return [["", ...v1keys], [v2keys, ...td]];
    }
    /**
     * helper function for #getRenderInfo, used to further parse data that is being used for aggregated columns (such as in bar graphs).
     * @param {Object} dataObj - object containing aggregated data.
     * @param {Object} missingData - object describing how to report missing data.
     */
    static #parseAggregatedData(dataObj, missingData, sortByX = true) {
        let footerText = "";
        let x = Object.keys(dataObj.agg);
        let y = Object.values(dataObj.agg);
        // apply missing data rules
        for (let i = 0; i < x.length; i++) {
            if (x[i] === missingData.missingValue) {
                if (!missingData.missing) {
                    // remove from dataset
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                    continue;
                } else if (missingData.footer) {
                    // report in footer
                    footerText += `Missing data for '${dataObj.name}': ${y[i]} entries<br>`;
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                    continue;
                }
            }
            if (x[i] === missingData.rangeValue) {
                if (!missingData.range) {
                    // remove from dataset
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                    continue;
                } else if (missingData.footer) {
                    // report in footer
                    footerText += `Out-of-range data for '${dataObj.name}': ${y[i]} entries<br>`;
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                    continue;
                }
            }
        }
        // sort x and y
        let d = x.map((v, i) => {return {x: x[i], y: y[i]}});
        d.sort((a, b) => {
            const va = sortByX ? a.x : a.y;
            const vb = sortByX ? b.x : b.y;
            const na = !Number.isNaN(Number(va));
            const nb = !Number.isNaN(Number(vb));
            if (na && !nb) return -1;
            if (!na && nb) return 1;
            if (na && nb) {
                return Number(va) - Number(vb);
            }
            if (!na && !nb) {
                if (va < vb) return -1;
                if (va < vb) return 1;
            }
            return 0;
        });
        return [d.map((v) => v.x), d.map((v) => v.y), footerText];
    }
    /**
     * renders the specified graph in the parent div.
     * @param {PopupGraphData} data - object describing how to get and display graph data.
     * @param {BudgetDataFrame} DF - data frame containing source data.
     */
    render(data, DF, CODEBOOK) {
        this.draw(data.title, data.data.map((v) => GraphRenderer.#getRenderInfo(v, DF, CODEBOOK, data.missing)));
    }
    /**
     * draws a graph consisting of multiple plots based on a set of plot calls for plotlyjs.
     * @param {string} title - graph title
     * @param {Array<Array<>>} plotlyJSCalls - array of arrays, [footer text, data object, layout object, config object]
     */
    draw(title, plotlyJSCalls) {
        this.show();
        // save draw call for passing to new window (when popped out)
        this.#drawCall = {
            title: title,
            plotlyJSCalls: plotlyJSCalls
        }
        // set graph title
        this.#title.innerText = title;

        // append all footers- calculate plot height (bases on tallest footer)
        this.#graphTotalWidth = this.#parentDiv.clientWidth;
        const w = this.#graphTotalWidth / plotlyJSCalls.length;

        this.#footerContainer.innerHTML = "";
        for (const call of plotlyJSCalls) {
            const p = document.createElement("p");
            p.innerHTML = call[0];
            p.style.width = w;
            p.style.textAlign = "center";
            this.#footerContainer.appendChild(p);
        }


        //draw plots
        this.#graphContainer.innerHTML = "";
        this.#graphTotalHeight = this.#parentDiv.clientHeight - this.#title.offsetHeight - this.#footerContainer.offsetHeight - 16; //16px bottom margin for padding
        const h = this.#graphTotalHeight;
        for (const call of plotlyJSCalls) {
            const div = document.createElement("div");
            div.style.width = w;
            div.style.height = h;
            this.#graphContainer.appendChild(div);
            Plotly.newPlot(div, ...call.slice(1)); // first element of each call is the footer text, everything else goes to plotly.
        }
        window.onresize = () => this.resize();
    }
    /**
     * opens the currently rendered graph in a new tab.
     */
    popout() {
        const reportWindow = window.open(
            `src/graph.html`,//URL
            "_blank" //open in new tab
        );
        window.addEventListener(
            "message",
            (e) => {
                console.log(e);
                if (e.data === "g") {
                    reportWindow.postMessage(this.#drawCall, "*");
                }
            },
            {once: true}
        );
    }
    /**
     * hide the currently rendered graph.
     */
    hide() {
        const i = [
            this.#graphContainer,
            this.#footerContainer,
            this.#title
        ];
        i.forEach((v) => v.style.opacity = 0);
    }
    /**
     * show the currently rendered graph.
     */
    show() {
        const i = [
            this.#graphContainer,
            this.#footerContainer,
            this.#title
        ];
        i.forEach((v) => v.style.opacity = 1);
    }
    resize() {
        // recalculate total witdth and height available and resize plotly divs accordingly.
        this.#graphTotalWidth = this.#parentDiv.clientWidth;
        const w = this.#graphTotalWidth / this.#drawCall.plotlyJSCalls.length;

        // resize footers to calc footer height
        for (const f of this.#footerContainer.children) {
            f.style.width = w;
        }

        this.#graphTotalHeight = this.#parentDiv.clientHeight - this.#title.offsetHeight - this.#footerContainer.offsetHeight - 16; //16px bottom margin for padding
        const h = this.#graphTotalHeight;

        // call plotly.relayout on each div
        for (const c of this.#graphContainer.children) {
            Plotly.relayout(c, {width: w, height: h});
        }
    }
}