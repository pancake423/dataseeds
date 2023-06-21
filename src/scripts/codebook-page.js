function loadCodebookPage() {
    // merged df already created if possible
    // check that codebook is loaded
    if (!checkConfigLoaded()) return;
    populateVariableList();
    populateAddDatalist();
}

function populateVariableList() {
    // get var list from DF
    const workspaceVarList = DF.getColumnList();

    // get var list from codebook
    const codebookVarList = CODEBOOK[0];

    // add all variables from codebook to variable list.
    // if the variable isn't in the workspace, add the warning symbol.
    let varList = document.getElementById('c-var-list');
    let contents ="";
    for (const variable of codebookVarList) {
        contents += getVarListElementString(variable);
    }
    varList.innerHTML = contents;
}
function getVarListElementString(variable) {
    const workspaceVarList = DF.getColumnList();
    function addWarningIfNeeded(variable) {
        if (!workspaceVarList.includes(variable)) {
            // add warning symbol
            return "<img title='Variable not loaded in workspace' class='d-icon' src='src/assets/triangle-warning.svg'/>";
        }
        return "";
    }
    return `<div class="c-list-item" onclick="selectVariable('${variable}')">
                <p>${addWarningIfNeeded(variable)}${variable}</p>
                    <button style="border:none;cursor:pointer;background-color:inherit" onclick="removeVariable(event, '${variable}')">
                    <img src="src/assets/cross-red.svg" class="d-icon" />
                </button>
            </div>`
}
function populateAddDatalist() {
    const workspaceVarList = DF.getColumnList();
    const codebookVarList = CODEBOOK[0];
    let dataListContents = "";
    for (const varname of workspaceVarList) {
        if (!codebookVarList.includes(varname)) {
            dataListContents += `<option>${varname}</option>`;
        }
    }
    document.getElementById("c-add-datalist").innerHTML = dataListContents;
}
function addVariableButton() {
    const input = document.getElementById("c-var-name-input");
    const name = input.value;
    if (name === '') return;
    addVariable(name);
    input.value = '';
}
function addVariable(name) {
    // check if duplicate
    // add visual element
    // add to codebook
    // remove from add datalist
    if (CODEBOOK[0].includes(name)) return -1;
    document.getElementById('c-var-list').innerHTML += getVarListElementString(name);
    CODEBOOK[0].push(name);
    CODEBOOK[1].push("none");
    CODEBOOK[2].push({});
    for (const option of document.getElementById('c-add-datalist').children) {
        if (option.innerHTML === name) {option.remove(); break}
    }
    setUnsavedChanges();
}

function removeVariable(event, name) {
    // remove visual
    event.srcElement.parentElement.parentElement.remove();
    // remove from codebook
    const index = CODEBOOK[0].findIndex((e) => e === name);
    if (index !== -1) {
        CODEBOOK[0].splice(index, 1);
        CODEBOOK[1].splice(index, 1);
        CODEBOOK[2].splice(index, 1);
    }
    // unselect if was selected
    if (CODEBOOK_SELECTED === name) {
        CODEBOOK_SELECTED = -1;
        showVarInfoCover();
    }
    // add to datalist
    document.getElementById('c-add-datalist').innerHTML += `<option>${name}</option>`;
    setUnsavedChanges();
}

// TODO: warning prompt
function checkAddAllVariables() {
    globalWarningPopup("Add All Variables?", `Auto-adds all variables detected in the workspace to the current codebook. This action will add ${document.getElementById('c-add-datalist').children.length} variables to the codebook and can't be undone.`, addAllVariables, () => 0);
}
function addAllVariables() {
    for (const option of document.getElementById('c-add-datalist').children) {
        addVariable(option.innerHTML);
        option.remove();
    }
    setUnsavedChanges();
}
// TODO: warn the user what they're about to do :) 
// to be honest, not even sure why this is a button, but past me liked it so ill stick with it
function checkRemoveAllVariables() {
    globalWarningPopup("Remove All Variables?", `Removes all variables from the codebook. This action cannot be undone and will delete ${CODEBOOK[0].length} variables.`, removeAllVariables, () => 0);
}
function removeAllVariables() {
    CODEBOOK = [[], [], []];
    document.getElementById('c-var-list').innerHTML = "";
    setUnsavedChanges();
}

// highlight a variable from the list and set the variable info to match
function selectVariable(name) {
    for (const listItem of document.getElementById('c-var-list').children) {
        if (listItem.getElementsByTagName("p")[0].innerText === name) {
            listItem.className = "c-list-item c-selected";
            CODEBOOK_SELECTED = name;
            setConversionTable();
            hideVarInfoCover();
        } else {
            listItem.className = "c-list-item"
        }
        
    }
}

function hideVarInfoCover() {
    document.getElementById("c-var-cover").className = "no-access-bg hidden";
}
function showVarInfoCover() {
    document.getElementById("c-var-cover").className = "no-access-bg shown";
}
function conversionTableHasData() {
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    if (CODEBOOK[1][index] == "range" && (CODEBOOK[2][index]["min"] != 0 || CODEBOOK[2][index]["max"] != 0)) {
        return true;
    }
    const numKeys = Object.keys(CODEBOOK[2][index]).length;
    if (CODEBOOK[1][index] == "convert" && !(numKeys === 0 || numKeys === 1 && CODEBOOK[2][index][""] === "")) {
       return true
    }
    return false;
}
function checkChangeConversionType() {
    if (conversionTableHasData()) {
        globalWarningPopup("Change Conversion Type?", "This will delete the current conversion table and cannot be undone. Proceed?",
            changeConversionType, setConversionTable);
        return;
    }
    changeConversionType();
}
function changeConversionType() {
    const conv = document.getElementById("c-conversion-type").value;
    // find codebook index
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    clearConversionTable();
    switch (conv) {
        case "range":
            CODEBOOK[1][index] = "range";
            CODEBOOK[2][index] = {min: 0, max: 0};
            // add fixed elements for min and max
            addConvNamedEntry("min");
            addConvNamedEntry("max");
            break;
        case "convert":
            CODEBOOK[1][index] = "convert";
            CODEBOOK[2][index] = {};
            // add element button, row labels
            addConvLabel("Original Value", "New Value");
            break;
        case "none":
            CODEBOOK[1][index] = "range";
            CODEBOOK[2][index] = {};
            // leave blank
            break;
    }
    setUnsavedChanges();
}
function clearConversionTable() {
    document.getElementById("c-conv-table").innerHTML = ""; 
}
function addConvLabel(leftText, rightText) {
    // adds a non-modifiable label to the conversion table.
    let div = document.createElement("div");
    div.className = "c-list-item";
    div.style.backgroundColor = "inherit";
    div.innerHTML = `<div class="d-icon"></div>
                    <p>${leftText}</p>
                    <p>${rightText}</p>
                    <div class="d-icon"></div>`;
    document.getElementById("c-conv-table").appendChild(div);
}
function addConvNamedEntry(name, value) {
    // adds a named entry with one modifiable slot to the conversion table (used for range)
    let div = document.createElement("div");
    div.className = "c-list-item";
    div.style.backgroundColor = "inherit";
    div.innerHTML = `<div class="d-icon"></div>
                    <p>${name}</p>
                    <input class="c-input" style="background-color:white" type="number" value=${value} onchange="saveConversionTable()"></input>
                    <div class="d-icon"></div>`;
    document.getElementById("c-conv-table").appendChild(div);
}
function addConvPair(value1, value2) {
    // adds a pair entry where both key and value can be modified. (used for convert)
    let div = document.createElement("div");
    div.className = "c-list-item";
    div.style.backgroundColor = "inherit";
    div.innerHTML = `<div class="d-icon"></div>
                    <input class="c-input" style="background-color:white" value='${value1 === undefined ? "" : value1}' onchange="saveConversionTable()"></input>
                    <input class="c-input" style="background-color:white" value='${value2 === undefined ? "" : value2}' onchange="saveConversionTable()"></input>
                    <button style="border:none;cursor:pointer;background-color:inherit" onclick="removeConvPair(event)">
                        <img src="src/assets/cross-red.svg" class="d-icon" />
                    </button>`;
    document.getElementById("c-conv-table").appendChild(div);
}

function removeConvPair(e) {
    e.srcElement.parentElement.parentElement.remove();
}

function saveConversionTable() {
    // find index of codebook that is being modified
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    // make dictionary out of conversion table contents
    inputElements = document.getElementById("c-conv-table").getElementsByTagName("input");
    inputValues = [];
    for (i of inputElements) {
        inputValues.push(i.value);
    }
    let codebookEntry = {};
    if (CODEBOOK[1][index] === "range") {
        codebookEntry["min"] = inputValues[0];
        codebookEntry["max"] = inputValues[1];
    } else if (CODEBOOK[1][index] === "convert") {
        for (let i = 0; i < inputValues.length; i += 2) {
            codebookEntry[inputValues[i]] = inputValues[i+1];
        }
    }
    // write to codebook
    CODEBOOK[2][index] = codebookEntry;
    setUnsavedChanges();
}

function setConversionTable() {
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    const convType = CODEBOOK[1][index];
    // set the conversion table display to match the correct stored value.
    document.getElementById("c-conversion-type").value = convType;
    clearConversionTable();
    if (convType === "range") {
        addConvNamedEntry("min", CODEBOOK[2][index]["min"]);
        addConvNamedEntry("max", CODEBOOK[2][index]["max"]);
    } else if (convType === "convert") {
        addConvLabel("Original Value", "New Value");
        for (key in CODEBOOK[2][index]) {
            addConvPair(key, CODEBOOK[2][index][key]);
        }
    }
}

function newEntryButton() {
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    if (CODEBOOK[1][index] === "convert") {
        addConvPair();
    } else {
        customAlert("new entries can only be created for conversion type 'Convert'.")
    }
}

function autoFillButton() {
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    if (!checkWorkspaceLoaded()) customAlert("Auto filling conversion table requires data files to be uploaded.");
    if (CODEBOOK[1][index] === "none") {
        customAlert("Conversion type 'None' does not support auto fill.");
    } else {
        if (conversionTableHasData()) {
            globalWarningPopup("Auto Fill Conversion Table?", "This will delete all data currently in the conversion table and cannot be undone.", autoFillConversionTable, () => 0)
            return;
        }
        autoFillConversionTable();
    }
}
function autoFillConversionTable() {
    const index = CODEBOOK[0].findIndex((e) => e === CODEBOOK_SELECTED);
    const colData = DF.valueCount(CODEBOOK_SELECTED);
    if (CODEBOOK[1][index] === 'range') {
        // find min and max and set values in codebook
        let min = Infinity;
        let max =-Infinity;
        for (key in colData) {
            if (key < min) min = key;
            if (key > max) max = key;
        }
        CODEBOOK[2][index] = {min: min, max: max};
    } else {
        // conversion type must be convert
        // create a blank entry with the original value set and the new value blank.
        let entry = {};
        for (key in colData) {
            entry[key] = "";
        }
        CODEBOOK[2][index] = entry;
    }
    setConversionTable();
}