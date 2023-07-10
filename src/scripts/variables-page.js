/**
 * initializes the global variable CV_LIST to be an instance of CustomList bound to the div v-var-list, configured so that it has an edit button.
 */
function initCustomVariablesPage() {
    CV_LIST = new CustomList(
        document.getElementById("v-var-list"),
        [undefined, vItemDeleted],
        [
            {type: true, text: "edit", callback: vEditItem}
        ]
    );
}
/**
 * called when the page content needs to be refreshed. ensures that the UI, dataframe, and popup all match the data in CUSTOM_VARIABLES.
 */
function loadCustomVariablesPage() {
    loadCustomVariableData();
    calculateCustomDF();
    document.getElementById("v-popup-box").className = "no-access-bg hidden";
}
/**
 * callback function for when an item is deleted from the custom variables list. saves the changes to CUSTOM_VARIABLES, and then updates the dataframe to match.
 * @param {any} [list]
 * @param {any} [index]
 */
function vItemDeleted(list, index) {
    saveCustomVariableData();
    calculateCustomDF();
}
/**
 * opens the custom edit popup box, bound to the correct element index.
 * @param {any} [list] - provided by CustomList but not used.
 * @param {*} index - element's position within the custom list.
 */
function vEditItem(list, index) {
    showCustomEditPopup(index)
}
/**
 * adds a custom variable to the list and opens the edit popup.
 */
function addCustomVariableButton() {
    const index = CV_LIST.addItem(-1, "New Custom Variable");
    CV_LIST.setData(index, ["", "", ""]);
    showCustomEditPopup(index);
}
/**
 * opens a warning propmpt asking the user if they want to delete all custom variables. if they say yes, the variables are deleted.
 */
function clearCustomVariablesButton() {
    const length = CV_LIST.getLength();
    if (length === 0) {
        clearCustomVarsList();
        return;
    }
    globalWarningPopup("Clear Custom Variables?", `This will delete ${length} variables and cannot be undone.`, clearCustomVarsList, () => 0)
}
/**
 * clears the list.
 */
function clearCustomVarsList() {
    CV_LIST.clear();
}
/**
 * saves the data stored in CV_LIST to CUSTOM_VARIABLES by extracting the data and applying a format conversion.
 */
function saveCustomVariableData() {
    setUnsavedChanges();
    CUSTOM_VARIABLES = CV_LIST.getAllData().reduce(
        (accumulator, currentValue) => {
            // don't include empty/unset custom variables
            if (currentValue.includes("")) return accumulator;
            currentValue.map((v, i) => accumulator[i].push(v)); // I read somewhere that using map to mutate an array (and not using the return value) is a bad idea.
            return accumulator;
        },
        [[], [], []]
    );
}
/**
 * loads the data stored in CUSTOM_VARIABLES to the CV_LIST
 */
function loadCustomVariableData() {
    clearCustomVarsList();
    for (let i = 0; i < CUSTOM_VARIABLES[0].length; i++) {
        const index = CV_LIST.addItem(-1, CUSTOM_VARIABLES[0][i]);
        CV_LIST.setData(index, [CUSTOM_VARIABLES[0][i], CUSTOM_VARIABLES[1][i], CUSTOM_VARIABLES[2][i]]);
    }
}
/**
 * returns a calculated column based on the data in the conversion table.
 * @param {BudgetDataFrame} DF - data frame to pull data from
 * @param {Array<Array<string|number>|string>} convTable - histogram specification
 * @returns {Array<string>}
 */
function calculateHistogramColumn(DF, convTable) {
    const datasource = DF.getColumn(convTable[0]);
    let outCol = [];
    for (const item of datasource) {
        let found = false;
        for (let i = 1; i < convTable.length; i++) {
            if (Number(item) >= convTable[i][0] && Number(item) <= convTable[i][1]) {
                if (convTable[i][2]) {
                    outCol.push(convTable[i][2]);
                    found = true;
                } else {
                    outCol.push(convTable[i].join("-"));
                    found = true;
                }
                break;
            }
        }
        if(!found) outCol.push('');
    }
    return outCol;
}
/**
 * returns a calculated column based on the data in the conversion table.
 * @param {BudgetDataFrame} DF - data frame to pull data from
 * @param {Array<string>} convTable - combine column specification
 * @returns {Array<string>}
 */
function calculateCombineColumn(DF, convTable) {
    // list of data sources to combine
    let outCol = [];
    let sources = [];
    for (const item of convTable) {
        sources.push(DF.getColumn(item));
    }
    for (let i = 0; i < sources[0].length; i++) {
        let outItem = "";
        for (let j = 0; j < sources.length; j++) {
            outItem += sources[j][i];
            if (j + 1 != sources.length) {
                outItem += ", ";
            }
        }
        outCol.push(outItem);
    }
    return outCol;
}
/**
 * returns a calculated column based on the data in the conversion table.
 * @param {BudgetDataFrame} DF - data frame to pull data from
 * @param {Array<Array<string>>} convTable - merge specification
 * @returns {Array<string>}
 */
function calculateMergeColumn(DF, convTable) {
    // [[source, comparison, value, mapTo], ...]
    let outCol = [];
    const comparisonFunctions = {
        "=": (a, b) => a === b,
        "!=": (a, b) => a !== b,
        ">": (a, b) => a > b,
        "<": (a, b) => a < b,
        ">=": (a, b) => a >= b,
        "<=": (a, b) => a <= b,
    }
    for (let i = 0; i < DF.length; i++) outCol.push('');
    for (const mergeSource of convTable) {
        let sourceCol = DF.getColumn(mergeSource[0]);
        for (let i = 0; i < sourceCol.length; i++) {
            if(comparisonFunctions[mergeSource[1]](sourceCol[i], mergeSource[2])) {
                outCol[i] = mergeSource[3];
            }
        }
    }
    return outCol;
}
/**
 * calculates a data frame based on the custom variables stored in CUSTOM_VARIABLES. the result is stored in DF_CUSTOM.
 */
function calculateCustomDF() {
    // it's very inefficient to recalculate the entire data frame every time we add or edit a column, but at the scale of data this program is designed for,
    // that problem is pushed to the back burner.
    createMergedDF();
    saveCustomVariableData();
    // initialize DF to have the correct dimensions.
    DF_CUSTOM = new BudgetDataFrame();
    for (let i = 0; i < DF.numRows; i++) {
        DF_CUSTOM.addRow();
    }
    // iterate over every variable in custom and add it to df
    for (let i = 0; i < CUSTOM_VARIABLES[0].length; i++) {
        const convTable = CUSTOM_VARIABLES[2][i];
        switch (CUSTOM_VARIABLES[1][i]) {
            case "histogram":
                DF_CUSTOM.addColumn(CUSTOM_VARIABLES[0][i], calculateHistogramColumn(DF, convTable));
                break;
            case "combine":
                DF_CUSTOM.addColumn(CUSTOM_VARIABLES[0][i], calculateCombineColumn(DF, convTable));
                break;
            case "merge":
                DF_CUSTOM.addColumn(CUSTOM_VARIABLES[0][i], calculateMergeColumn(DF, convTable));
                break;
        }
    }
}
/**
 * shows the custom variable editor popup.
 * @param {int} index - index of the variable that is being edited.
 */
function showCustomEditPopup(index) {
    document.getElementById("v-popup-box").className = "no-access-bg shown";
    const data = CV_LIST.getData(index);
    document.getElementById("v-name-selection").value = data[0];
    document.getElementById("v-type-selection").value = data[1];
    showEditPopupSettings();

    populateCustomVariableDatalist();
    populateCustomEditPopup(data[1], data[2]);

    
    const buttons = document.getElementById("v-bottom-button-bar").children;
    buttons[0].onclick = () => cancelCustomEditPopup(index);
    buttons[1].onclick = () => submitCustomEditPopup(index);

}
/**
 * populates the custom variable editor popup with the correct data from the variable that is being edited.
 * @param {string} type - histogram, combine, or merge
 * @param {Array<any>} convTable - variable specification
 */
function populateCustomEditPopup(type, convTable) {
    clearCustomVarsPopup("histogram");
    clearCustomVarsPopup("combine");
    clearCustomVarsPopup("merge");

    switch (type) {
        case "histogram":
            document.getElementById("v-hist-source").value = convTable[0];
            for (let i = 1; i < convTable.length; i++) {
                addCustomVarsElement("histogram", convTable[i]);
            }
            break;
        case "combine":
            for (let i = 0; i < convTable.length; i++) {
                addCustomVarsElement("combine", [convTable[i]]);
            }
            break;
        case "merge":
            for (let i = 0; i < convTable.length; i++) {
                addCustomVarsElement("combine", convTable[i]);
            }
            break;
    }
}
/**
 * populates the datalist element "v-source-datalist" with the available source options from the codebook.
 */
function populateCustomVariableDatalist() {
    const dl = document.getElementById("v-source-datalist");
    dl.innerHMTL = "";
    for (const name of CODEBOOK[0]) {
        const opt = document.createElement("option");
        opt.value = name;
        dl.appendChild(opt);
    }
    console.log(dl);
}
/**
 * cancel button of popup. makes no changes to the element, if it's already got data, or deletes it if it's blank.
 * @param {int} index - position of element currently being editied within the list
 */
function cancelCustomEditPopup(index) {
    // cancel should make no changes to the element, if it's already got data, or delete it if it's blank.
    const data = CV_LIST.getData(index);
    if (data.includes("")) {
        CV_LIST.removeElement(index);
    }
    document.getElementById("v-popup-box").className = "no-access-bg hidden";
}
/**
 * submit button of popup. Ensures that all data is valid, and if it isn't, raises a warning prompt to the user and aborts. Saves data to the list, CUSTOM_VARS, and DF_CUSTOM.
 * @param {int} index - position of element currently being editied within the list
 * @returns 
 */
function submitCustomEditPopup(index) {
    // submit should check that data is valid, and if not warn the user about it.
    // it should then save changes, including calculating customDF.
    const name = document.getElementById("v-name-selection").value;
    // check valid name
    if (name === "") {
        customAlert("Variable name cannot be blank.");
        return -1;
    }
    if (CODEBOOK.includes(name) || CUSTOM_VARIABLES.includes(name)) {
        customAlert(`Error: the variable name ${name} is already in use.`);
        return -1;
    }
    const type = document.getElementById("v-type-selection").value;
    let convTable = [];
    let list;
    let binNames = [];
    switch (type) {
        case "histogram":
            const src = document.getElementById("v-hist-source").value;
            if (!CODEBOOK[0].includes(src)) {customAlert(`Error: could not find data source '${src}' in codebook.`); return -1;}
            convTable.push(src);
            list = document.getElementById("v-histogram-list").children;
            for (let i = 1; i < list.length; i++) {
                const l = list[i].children;
                const min = Number(l[0].value);
                const max = Number(l[1].value);
                const binName = l[2].value;
                if (max < min) {customAlert(`Error in bin ${i}: max must be >= min.`); return -1;}
                if (binName === "") {
                    convTable.push([min, max]);
                } else {
                    if (binNames.includes(binName)) {
                        customAlert(`Error in bin ${i}: every bin name (if provided) must be unique.`);
                        return -1;
                    } else {
                        binNames.push(binName);
                    }
                    convTable.push([min, max, binName]);
                }
            }
            break;
        case "combine":
            list = document.getElementById("v-combine-list").children;
            for (let i = 1; i < list.length; i++) {
                const src = list[i].children[0].value;
                if (!CODEBOOK[0].includes(src)) {customAlert(`Error in row ${i}: could not find data source '${src}' in codebook.`); return -1;}
                convTable.push(src);
            }
            break;
        case "merge":
            list = document.getElementById("v-merge-list").children;
            for (let i = 1; i < list.length; i++) {
                const l = list[i].children;
                const src = l[0].value;
                const comp = l[1].value;
                const val = l[2].value;
                const binName = l[3].value;
                if (!CODEBOOK[0].includes(src)) {customAlert(`Error in bin ${i}: could not find data source '${src}' in codebook.`); return -1;}
                if (binNames.includes(binName)) {
                    customAlert(`Error in bin ${i}: every bin name must be unique.`);
                    return -1;
                } else {
                    binNames.push(binName);
                }
                convTable.push([src, comp, val, binName]);
            }
            break;
        default:
            customAlert("Please select a variable type.");
            return -1;
    }
    CV_LIST.setElementText(index, name);
    CV_LIST.setData(index, [name, type, convTable]);
    saveCustomVariableData();
    calculateCustomDF();
    document.getElementById("v-popup-box").className = "no-access-bg hidden";
    return 0;
}
/**
 * shows the correct sub-panel based on the currently selected type from the dropdown menu.
 */
function showEditPopupSettings() {
    const hist = document.getElementById("v-histogram-list");
    const comb = document.getElementById("v-combine-list");
    const merge = document.getElementById("v-merge-list");
    const title = document.getElementById("v-mode-settings-title");
    const buttonList = document.getElementById("v-edit-bar").children;
    const type = document.getElementById("v-type-selection").value

    hist.className = "hidden";
    comb.className = "hidden";
    merge.className = "hidden";

    // TODO: add event listeners to add, remove, clear buttons based on type.
    
    buttonList[0].onclick = () => addCustomVarsElement(type);
    buttonList[1].onclick = () => removeCustomVarsElement(type);
    buttonList[2].onclick = () => clearCustomVarsPopup(type);

    switch (type) {
        case "histogram":
            hist.className = "shown";
            title.innerHTML = "Histogram Bins (source: <input class='c-input v-input' id='v-hist-source' list='v-source-datalist'></input>)";
            break;
        case "combine":
            comb.className = "shown";
            title.innerHTML = "Combine Sources";
            break;
        case "merge":
            merge.className = "shown";
            title.innerHTML = "Merge Bins";
            break;
        default:
            title.innerText = "Select a Type";
    }
}
/**
 * clears the popup sub-menu of the specified type.
 * @param {string} type - histogram, combine, or merge
 */
function clearCustomVarsPopup(type) {
    let parent
    switch (type) {
        case "histogram":
            parent = document.getElementById("v-histogram-list");
            break;
        case "combine":
            parent = document.getElementById("v-combine-list");
            break;
        case "merge":
            parent = document.getElementById("v-merge-list");
            break;
        default:
            return;
    }
    let removeList = parent.getElementsByTagName("li");
    for (let i = removeList.length - 1; i > 0; i--) {
        parent.removeChild(removeList[i]);
    }
}
/**
 * adds a list element of the specified type to the correct sub-panel.
 * @param {string} type - histogram, combine, or merge
 * @param {Array} [values] - optional parameter to specify element data.
 */
function addCustomVarsElement(type, values) {
    let parent;
    let item = document.createElement("li");
    // what's up with switch statements giving a syntax error when a variable is redefined in a different case? I thought each case would be its own code block.
    let binName;
    let src;

    item.className = "v-list-item";
    switch (type) {
        case "histogram":
            parent = document.getElementById("v-histogram-list");
            let min = document.createElement("input");
            min.className = "c-input v-input";
            min.type = "number";
            let max = document.createElement("input");
            max.className = "c-input v-input";
            max.type = "number";
            binName = document.createElement("input");
            binName.className = "c-input v-input";

            if (values !== undefined) {
                min.value = values[0];
                max.value = values[1];
                binName.value = values[2];
            }

            item.appendChild(min);
            item.appendChild(max);
            item.appendChild(binName);
            break;
        case "combine":
            parent = document.getElementById("v-combine-list");
            src = document.createElement("input");
            src.className = "c-input v-input";
            src.list = "v-source-datalist";

            if (values !== undefined) {
                src.value = values[0];
            }

            item.appendChild(src);
            break;
        case "merge":
            parent = document.getElementById("v-merge-list");
            src = document.createElement("input");
            src.className = "c-input v-input";
            src.list = "v-source-datalist";
            let comp = document.createElement("select");
            comp.innerHTML = "<option value='='>=</option><option value='!='>!=</option><option value='>'>&gt;</option><option value='<'>&lt;</option><option value='>='>&gt;=</option><option value='<='>&lt;=</option>";
            comp.className = "c-input v-input";
            let value = document.createElement("input");
            value.className = "c-input v-input";
            binName = document.createElement("input");
            binName.className = "c-input v-input";

            if (values !== undefined) {
                src.value = values[0];
                comp.value = values[1];
                value.value = values[2];
                binName.value = values[3];
            }

            item.appendChild(src);
            item.appendChild(comp);
            item.appendChild(value);
            item.appendChild(binName);
            break;
        default:
            return;
    }
    parent.appendChild(item);
}
/**
 * removes a single element from the editor sub-panel of the specified type.
 * @param {string} type - histogram, combine, or merge.
 */
function removeCustomVarsElement(type) {
    let removeList;
    let parent;
    switch (type) {
        case "histogram":
            parent = document.getElementById("v-histogram-list");
            break;
        case "combine":
            parent = document.getElementById("v-combine-list");
            break;
        case "merge":
            parent = document.getElementById("v-merge-list");
            break;
        default:
            return;
    }
    removeList = parent.getElementsByTagName("li");
    if (removeList.length > 1) {
        parent.removeChild(removeList[removeList.length - 1]);
    }
}