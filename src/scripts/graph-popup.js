/**
 * external dependencies: 
 * datafilter.js
 * index.js -> customAlert()
 * index.js -> CODEBOOK, CUSTOM_VARIABLES
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
        if (data.name === "") return false;
        // !!! danger, referencing global variables
        if (!(CODEBOOK[0].includes(data.source) || CUSTOM_VARIABLES[0].includes(data.source))) return false;
        // !!! danger ends here
        return true;
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
        {name: "Scatter", value: "scatter", max: 3},
        {name: "line", value: "line", max: 1},
        {name: "table", value: "table", max: 2},
        {name: "pie", value: "pie", max: 2},
    ];
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
    #updateVariableContainer() {
        // ensure that variable container doesn't have over the maximum number of variables for its type.
        const data = this.#getCurrentTypeData();
        while (data.max < this.#variableList.length) {
            this.#removeVariable();
        }
    }
    #getCurrentTypeData() {
        let typeValue = this.#type.value;
        for (const entry of PopupPlot.plotTypes) {
            if (entry.value === typeValue) {
                return entry;
            }
        }
        return -1;
    }
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
    #removeVariable() {
        if (this.#variableList.length > 1) {
            this.#variableList.pop().remove();
        } else {
            // !!! good programming practices strike again
            customAlert("All plots must have at least one variable.");
            // !!! :)
        }
    }
    remove() {
        this.#parentDiv.removeChild(this.#selfDiv);
    }
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
    checkValidData() {
        
    }

}

class PopupGraph {
    constructor() {

    }
}