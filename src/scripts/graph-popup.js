/**
 * external dependencies: 
 * datafilter.js
 * index.js -> customAlert()
 * index.js -> CODEBOOK, CUSTOM_VARIABLES
 * report-url-gen.js -> getReportSettings()
 * random css scattered across the program (I know, great practice)
 */
class PopupVariable {
    #selfDiv;
    #nameField;
    #sourceField;
    #filterButton;
    #filter;
    #parentDiv;

    static #dataSource;
    /**
     * static initialization block creates a one-time event listener that sets up the datalist for PopupVariable instances.
     */
    static {
        window.addEventListener("load", () => {
            PopupVariable.#dataSource = document.createElement("datalist");
            document.body.appendChild(PopupVariable.#dataSource);
            PopupVariable.#dataSource.setAttribute("id", "g-source-datalist");
            PopupVariable.#dataSource.innerHMTL = '<option value="test" />';
        }, {once: true});
    }
    /**
     * creates a PopupVariable user interface and underlying data structure.
     * @param {Node} parentDiv - parent element that the PopupVariable instance should place itself in
     */
    constructor(parentDiv) {
        this.#filter = [];

        this.#parentDiv = parentDiv;

        this.#selfDiv = document.createElement("div");
        this.#selfDiv.className = "g-var-div";

        this.#nameField = document.createElement("input");
        this.#nameField.className = "c-input";

        this.#sourceField = document.createElement("input");
        this.#sourceField.className = "c-input";
        // bind source field to datalist (codebook + custom)
        this.#sourceField.setAttribute("list", "g-source-datalist");

        this.#filterButton = document.createElement("button");
        this.#filterButton.className = "c-button";
        this.#filterButton.innerHTML = "Filter";
        // use filter popup onclick;
        this.#filterButton.onclick = () => {
            // !!! references external state/functions
            if (CODEBOOK[0].length === 0) {
                customAlert("Codebook must have data in order to use filters.");
                return;
            }
            // !!! end of danger zone
            DataFilter.getFilterList(this.#filter)
            .then((v) => this.#filter = v)
            .catch(() => console.warn("user aborted filter request."));
        }

        const nameLabel = document.createElement("label");
        nameLabel.innerText = "Name:";
        nameLabel.style.marginRight = "var(--page-margin)";

        const sourceLabel = document.createElement("label");
        sourceLabel.innerText = "Source: ";
        sourceLabel.style.marginRight = "var(--page-margin)";

        const nameGroup = document.createElement("div");
        nameGroup.className = "g-var-div";

        const sourceGroup = document.createElement("div");
        sourceGroup.className = "g-var-div";

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(this.#nameField);

        sourceGroup.appendChild(sourceLabel);
        sourceGroup.appendChild(this.#sourceField);

        this.#selfDiv.appendChild(nameGroup);
        this.#selfDiv.appendChild(sourceGroup);
        this.#selfDiv.appendChild(this.#filterButton);

        parentDiv.appendChild(this.#selfDiv);

        // !!! more danger
        PopupVariable.updateDataSourceDropdown([...CODEBOOK[0], ...CUSTOM_VARIABLES[0]]);
        /// !!! end danger
    }
    /**
     * sets the valid options for the data source dropdown for all PopupVariables.
     * @param {Array<string>} list - list of acceptable values for popup variable source field.
     */
    static updateDataSourceDropdown(list) {
        let contents = "";
        for (const varName of list) {
            contents += `<option value='${varName}'>`;
        }
        document.getElementById("g-source-datalist").innerHTML = contents;
    }
    /**
     * @typedef PopupVariableData
     * @param {string} name - name of variable
     * @param {string} source - name of source field
     * @param {Array<Array<string>>} filter - describes how to filter the data. empty array for no filter.
     */
    /**
     * returns the underlying data for the current variable entry.
     * @returns {PopupVariableData}
     */
    getData() {
        return {
            name: this.#nameField.value,
            source: this.#sourceField.value,
            filter: this.#filter
        }
    }
    /**
     * check if the data contained in the 
     * @returns {Boolean} - true if the data is valid, otherwise false.
     */
    checkValidData() {
        const data = this.getData();
        if (data.name === "") {this.#alertBadData("Variable must have a name."); return false};
        // !!! danger, referencing global variables
        if (!(CODEBOOK[0].includes(data.source) || CUSTOM_VARIABLES[0].includes(data.source))) {this.#alertBadData("Invalid/missing data source (not found in codebook or custom variables)."); return false};
        // !!! danger ends here
        return true;
    }
    #alertBadData(m) {
        this.#selfDiv.style.backgroundColor = "lightcoral";
        this.#selfDiv.scrollIntoView();
        window.setTimeout(() => {this.#selfDiv.style.backgroundColor = "var(--color-background)";}, 1000);
        customAlert(m); // !!! L
    }
    /**
     * applies popup variable data to the current instance.
     * @param {PopupVariableData} data 
     */
    setData(data) {
        if (data.name !== undefined) this.#nameField.value = data.name;
        if (data.source !== undefined) this.#sourceField.value = data.source;
        if (data.filter !== undefined) this.#filter = data.filter;
    }
    /**
     * remove the PopupVariableInstance from its parent container.
     */
    remove() {
        this.#parentDiv.removeChild(this.#selfDiv);
    }
}

class PopupPlot {
    #selfDiv;
    #type;
    #variableContainer;
    #addButton;
    #variableList;
    #parentDiv;
    static fields = [
        {name: "Subtitle:", value: "subtitle"},
        {name: "X Axis Label:", value: "xlabel"},
        {name: "Y Axis Label:", value: "ylabel"},
        {name: "Footer:", value: "footer"},
    ];
    static plotTypes = [
        {name: "Bar (standard)", value: "bar", max: 4},
        {name: "Bar (stacked)", value: "barstack", max: 4},
        {name: "Scatter", value: "scatter", max: 2},
        {name: "Line", value: "line", max: 4}, // plot multiple lines
        {name: "Table", value: "table", max: 2},
        {name: "Pie", value: "pie", max: 1},
    ];
    /**
     * creates a popup plot settings editor and binds it to the parent div.
     * @param {Node} parentDiv - div to place popup plot in.
     */
    constructor(parentDiv) {
        this.#parentDiv = parentDiv;

        this.#selfDiv = document.createElement("div");
        this.#selfDiv.className = "g-plot-div";

        const plotDivider = document.createElement("div");
        plotDivider.className = "g-plot-divider";
        this.#selfDiv.appendChild(plotDivider);

        const title = document.createElement("h3");
        title.innerText = "Plot Settings";
        this.#selfDiv.appendChild(title);

        // add fields to plot div
        for (const f of PopupPlot.fields) {
            const entryContainer = document.createElement("div");
            entryContainer.className = "c-horiz-bar";

            const label = document.createElement("label");
            label.style.width = "10em";
            label.innerText = f.name;

            const input = document.createElement("input");
            input.className = "c-input";

            entryContainer.appendChild(label);
            entryContainer.appendChild(input);

            this.#selfDiv.appendChild(entryContainer);
        }

        // add type select dropdown to plot div
        this.#type = document.createElement("select");
        this.#type.className = "c-input";
        for (const type of PopupPlot.plotTypes) {
            const opt = document.createElement("option");
            opt.value = type.value;
            opt.innerHTML = type.name;
            this.#type.appendChild(opt);
        }
        const container = document.createElement("div");
        container.className = "c-horiz-bar";

        const label = document.createElement("label");
        label.style.width = "10em";
        label.innerText = "Type:";

        container.appendChild(label);
        container.appendChild(this.#type);
        
        this.#selfDiv.appendChild(container);
        this.#type.onchange = () => this.#updateVariableContainer();

        // add variables container to plot div
        const vContainerLabel = document.createElement("h3");
        vContainerLabel.innerText = "Plot Variables";
        this.#variableContainer = document.createElement("div");
        this.#variableContainer.className = "g-var-container";
        this.#variableContainer.appendChild(vContainerLabel);
        this.#selfDiv.appendChild(this.#variableContainer);

        this.#variableList = [new PopupVariable(this.#variableContainer)];

        // add 'add variable' and 'remove variable' button to plot div
        const varButtonDiv = document.createElement("div");
        varButtonDiv.className = "c-horiz-bar";

        const removeButton = document.createElement("button");
        removeButton.className = "c-button";
        removeButton.innerText = "Remove";
        removeButton.onclick = () => this.#removeVariable();

        const addButton = document.createElement("button");
        addButton.className = "c-button";
        addButton.innerText = "Add";
        addButton.onclick = () => this.#addVariable();

        varButtonDiv.appendChild(addButton);
        varButtonDiv.appendChild(removeButton);
        this.#selfDiv.appendChild(varButtonDiv);

        this.#selfDiv.appendChild(plotDivider.cloneNode());

        parentDiv.appendChild(this.#selfDiv);
    }
    /**
     * ensures that the variable container doesn't have over the maximum number of variables for its type.
     */
    #updateVariableContainer() {
        const data = this.#getCurrentTypeData();
        while (data.max < this.#variableList.length) {
            this.#removeVariable();
        }
    }
    /**
     * returns the PopupPlot.plotTypes object representing the currently selected plot type.
     * @returns {Object} {name, value, max}
     */
    #getCurrentTypeData() {
        let typeValue = this.#type.value;
        for (const entry of PopupPlot.plotTypes) {
            if (entry.value === typeValue) {
                return entry;
            }
        }
        return -1;
    }
    /**
     * adds a variable (if permitted by the current type) to the variable container.
     */
    #addVariable() {
        const data = this.#getCurrentTypeData();
        if (data.max > this.#variableList.length) {
            // able to add another variable
            this.#variableList.push(new PopupVariable(this.#variableContainer));
        } else {
            // !!! bad will
            customAlert(`The maximum number of variables for graph type '${data.name}' is ${data.max}.`);
            // !!! thats all
        }
    }
    /**
     * removes a variable (if there are more than one) from the variable container.
     */
    #removeVariable() {
        if (this.#variableList.length > 1) {
            this.#variableList.pop().remove();
        } else {
            // !!! good programming practices strike again
            customAlert("All plots must have at least one variable.");
            // !!! :)
        }
    }
    /**
     * removes the popup plot visual from its parent.
     */
    remove() {
        this.#parentDiv.removeChild(this.#selfDiv);
    }
    /**
     * @typedef PopupPlotData
     * @param {string} subtitle - sub title of plot
     * @param {string} xlabel - x axis label of plot
     * @param {string} ylabel - y axis label of plot
     * @param {string} footer - footer text of plot
     * @param {string} type - plot type (see PopupPlot.plotTypes)
     * @param {Array<PopupVariableData>} variables - plotted variable data
     */
    /**
     * gets the data represented by the current plot popup
     * @returns {PopupPlotData}
     */
    getData() {
        let obj = {};
        const inputList = this.#selfDiv.getElementsByTagName("input");
        for (let i = 0; i < PopupPlot.fields.length; i++) {
            obj[PopupPlot.fields[i].value] = inputList[i].value;
        }
        obj.type = this.#type.value;
        obj.variables = this.#variableList.map((v) => v.getData());
        return obj;
    }
    /**
     * loads a data object into the current popup plot.
     * @param {PopupPlotData} data 
     */
    setData(data) {
        const inputList = this.#selfDiv.getElementsByTagName("input");
        for (let i = 0; i < PopupPlot.fields.length; i++) {
            inputList[i].value = data[PopupPlot.fields[i].value] ;
        }
        this.#type.value = data.type;
        // clear variable list
        this.#variableList = [];
        for (let i = this.#variableContainer.children.length - 1; i >= 0; i--) {
            this.#variableContainer.removeChild(this.#variableContainer.children[i]);
        }
        for (const v of data.variables) {
            this.#variableList.push(new PopupVariable(this.#variableContainer));
            this.#variableList[this.#variableList.length -1].setData(v);
        }
    }
    /**
     * checks if all data in the current plot is valid.
     * @returns {Boolean} whether or not the current plot contains valid data.
     */
    checkValidData() {
        for (const v of this.#variableList) {
            if (!v.checkValidData()) {
                return false;
            }
        }
        return true;
    }
    /**
     * temporarily hides the current plot from view.
     */
    hide() {
        this.#selfDiv.style.display = "none";
    }
    /**
     * makes the current plot visible.
     */
    show() {
        this.#selfDiv.style.display = "flex";
    }

}

class PopupGraph {
    #selfDiv;
    #graphTitle;
    #numPlots;
    #plot1;
    #p2Title;
    #plot2;
    /**
     * creates a graph popup and binds it to the parent div.
     * @param {Node} parentDiv -div to bind popup graph to.
     * @param {Function} submitCallback - function to call when user successfully submits data.
     * @param {*} cancelCallback - function to call when user cancels data submission.
     */
    constructor(parentDiv, submitCallback, cancelCallback) {
        this.submitCallback = submitCallback;
        this.cancelCallback = cancelCallback;

        this.#selfDiv = document.createElement("div");
        this.#selfDiv.className = "g-plot-div g-graph-div";

        // header
        const header = document.createElement("h2");
        header.innerText = "Edit Graph";
        this.#selfDiv.appendChild(header);

        // graph title control
        const graphTitleBar = document.createElement("div");
        graphTitleBar.className = "c-horiz-bar";
        const graphTitleLabel = document.createElement("label");
        graphTitleLabel.innerText = "Graph Title:";
        graphTitleLabel.style.width = "10em";
        this.#graphTitle = document.createElement("input");
        this.#graphTitle.className = "c-input";
        graphTitleBar.appendChild(graphTitleLabel);
        graphTitleBar.appendChild(this.#graphTitle);
        this.#selfDiv.appendChild(graphTitleBar);


        // number of plots control
        const viewBar = document.createElement("div");
        viewBar.className = "c-horiz-bar";
        const viewLabel = document.createElement("label");
        viewLabel.innerText = "View Mode: ";
        viewLabel.style.width = "10em";
        this.#numPlots = document.createElement("select");
        this.#numPlots.innerHTML = "<option value='1'>Single Plot</option><option value='2'>Double Plot</option>";
        this.#numPlots.className = "c-input";
        this.#numPlots.onchange = () => this.#updateNumPlots();
        viewBar.appendChild(viewLabel);
        viewBar.appendChild(this.#numPlots);
        this.#selfDiv.appendChild(viewBar);

        // plot 1
        const p1Title = document.createElement("h2");
        p1Title.innerText = "Plot 1";
        this.#selfDiv.appendChild(p1Title);
        this.#plot1 = new PopupPlot(this.#selfDiv);

        // plot 2
        this.#p2Title = document.createElement("h2");
        this.#p2Title.innerText = "Plot 2";
        this.#selfDiv.appendChild(this.#p2Title);
        this.#plot2 = new PopupPlot(this.#selfDiv);

        this.#updateNumPlots();


        // missing data reporting controls
        // now this is what I call saving time: instead of duplicating the missing data reporting options from 'report', just re-use their data and make the user
        // switch tabs if they want to change it. :')
        const missingDataNote = document.createElement("p");
        missingDataNote.innerText = "Note: missing data handling follows the same convention as the 'Reports' page. To adjust how missing data is handled, use the controls on that page."
        this.#selfDiv.appendChild(missingDataNote);


        // cancel and submit buttons
        const navButtonBar = document.createElement("div");
        navButtonBar.className = "g-submit-bar";
        const submitButton = document.createElement("button");
        submitButton.className = "c-button";
        submitButton.innerText = "Submit";
        submitButton.onclick = () => this.#submitButton(this.submitCallback);
        const cancelButton = document.createElement("button");
        cancelButton.className = "c-button";
        cancelButton.innerText = "Cancel";
        cancelButton.onclick = () => this.cancelCallback();
        cancelButton.style.backgroundColor = "var(--color-background)";
        navButtonBar.appendChild(submitButton);
        navButtonBar.appendChild(cancelButton);

        //bottom spacer
        const spacer = document.createElement("div");
        spacer.className = "g-spacer";
        this.#selfDiv.appendChild(spacer);


        parentDiv.appendChild(this.#selfDiv);
        parentDiv.appendChild(navButtonBar);

    }
    /**
     * checks if the data entered into the graph popup is valid.
     * also calls customAlerts to explain the cause of invalid data to the user.
     * @returns {Boolean} true if data is valid, false if data is invalid.
     */
    #checkValidData() {
        //check that title exists
        if (this.#graphTitle.value === "") {
            customAlert("Graph must have a title.");
            return false;
        }
        //check subplots
        if (!this.#plot1.checkValidData()) {return false;}
        if (this.#getNumPlots() === 2) {
            if (!this.#plot1.checkValidData()) {return false;}
        }
        return true;
    }
    /**
     * @typedef PopupGraphData
     * @param {string} title - Title of graph
     * @param {ReportSettings} missing - how to handle missing data in graph
     * @param {Array<PopupPlotData>} data - subplot data
     */
    /**
     * returns the data object representing the current graph configuration.
     * @returns {PopupGraphData}
     */
    #getData() {
        let data = {};
        data.title = this.#graphTitle.value;
        data.data = [this.#plot1.getData()];
        if (this.#getNumPlots() === 2) data.data.push(this.#plot2.getData());
        data.missing = getReportSettings(); // !!! this is probably a war crime to be honest.
        return data;
    }
    /**
     * loads a data object into the popup.
     * @param {PopupGraphData} data 
     */
    setData(data) {
        //clear the values of plot1 and plot2
        this.#plot1.setData({subtitle: "", xlabel: "", ylabel: "", footer: "", type: "bar", variables: [{name: "", source: "", filter: []}]});
        this.#plot2.setData({subtitle: "", xlabel: "", ylabel: "", footer: "", type: "bar", variables: [{name: "", source: "", filter: []}]});
        //ignores data.missing due to the compromise of stealing the settings from 'report'
        PopupVariable.updateDataSourceDropdown([...CODEBOOK[0], ...CUSTOM_VARIABLES[0]]);
        this.#graphTitle.value = data.title;
        this.#plot1.setData(data.data[0]);
        if (data.data.length === 2) this.#plot2.setData(data.data[1]);
        this.#numPlots.value = data.data.length;
        this.#updateNumPlots();
    }
    /**
     * called when the user clicks the submit button at the bottom of the popup. checks that all data entered is valid, and if it is, calls the callback function with the popup's data passed as a parameter.
     * @param {Function} callback - callback function if submit operation is successful.
     * @returns 
     */
    #submitButton(callback) {
        // check valid data
        if (!this.#checkValidData()) return;
        // get data
        // callback(data)
        callback(this.#getData());

    }
    /**
     * reads the value of the 'View Mode' dropdown.
     * @returns {int} number of plots to show (1 or 2)
     */
    #getNumPlots() {
        return Number(this.#numPlots.value);
    }
    /**
     * reads the value of the 'View Mode' option and shows or hides plot 2 accordingly.
     */
    #updateNumPlots() {
        if (this.#getNumPlots() === 1) {
            // single plot (hide plot 2)
            this.#p2Title.style.display = "none";
            this.#plot2.hide();
        } else {
            // double plot (show plot 2)
            this.#p2Title.style.display = "block";
            this.#plot2.show();
        }
    }
}