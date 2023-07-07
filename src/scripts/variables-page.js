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

function vItemDeleted(list, index) {
    saveCustomVariableData();
}

function vEditItem(list, index) {
    showCustomEditPopup(index)
}

function addCustomVariableButton() {
    const index = CV_LIST.addItem(-1, "New Custom Variable");
    CV_LIST.setData(index, ["", "", ""]);
    showCustomEditPopup(index);
}

function clearCustomVariablesButton() {
    const length = CV_LIST.getLength();
    if (length === 0) {
        clearCustomVarsList();
        return;
    }
    globalWarningPopup("Clear Custom Variables?", `This will delete ${length} variables and cannot be undone.`, clearCustomVarsList, () => 0)
}
function clearCustomVarsList() {
    CV_LIST.clear();
}
/**
 * saves the data stored in CV_LIST to CUSTOM_VARIABLES by extracting the data and applying a format conversion.
 */
function saveCustomVariableData() {
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
function calculateHistogramColumn(DF, convTable) {
    const datasource = DF.getColumn(convTable[0]);
    let outCol = [];
    for (const item of datasource) {
        for (let i = 1; i < convTable.length; i++) {
            if (Number(item) >= convTable[i][0] && Number(item) <= convTable[i][1]) {
                if (convTable[i][2]) {
                    outCol.push(convTable[i][2]);
                } else {
                    outCol.push(convTable[i].join("-"));
                }
                break;
            }
        }
    }
    return outCol;
}
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
function calculateCustomDF() {
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

function showCustomEditPopup(index) {
    document.getElementById("v-popup-box").className = "no-access-bg shown";
    const data = CV_LIST.getData(index);
    document.getElementById("v-name-selection").value = data[0];
    document.getElementById("v-type-selection").value = data[1];
    showEditPopupSettings();
    // TODO: load data from list element into popup
    // TODO: add event listeners for cancel and submit buttons that apply data to the correct index.
}

function showEditPopupSettings() {
    const hist = document.getElementById("v-histogram-list");
    const comb = document.getElementById("v-combine-list");
    const merge = document.getElementById("v-merge-list");
    const title = document.getElementById("v-mode-settings-title");

    hist.className = "hidden";
    comb.className = "hidden";
    merge.className = "hidden";

    // TODO: add event listeners to add, remove, clear buttons based on type.

    switch (document.getElementById("v-type-selection").value) {
        case "histogram":
            hist.className = "shown";
            title.innerText = "Histogram Bins";
            break;
        case "combine":
            comb.className = "shown";
            title.innerText = "Combine Sources";
            break;
        case "merge":
            merge.className = "shown";
            title.innerText = "Merge Bins";
            break;
    }
}