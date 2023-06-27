/**
 * calls all of the functions needed to prepare the report tab when it is loaded.
 * @returns {null}
 */
function loadReportsPage() {
    if (!checkConfigLoaded()) return;
    populateDataSourceDropdown();
    loadReportFromCodebook();
    blockSettingsPanels();
}
/**
 * populates the dropdown for 'data source' under 'graph settings' with all of the current variables in the codebook. Depends on CODEBOOK.
 */
function populateDataSourceDropdown() {
    let contents = "";
    for (const varName of CODEBOOK[0]) {
        contents += `<option value='${varName}'>`
    }
    document.getElementById("r-source-datalist").innerHTML = contents;
}
/**
 * reads all of the values stored in REPORT and populates the report structure list. Depends on REPORT and modifies REPORT_SELECTED
 */
function loadReportFromCodebook() {
    REPORT_SELECTED = -1;
    document.getElementById("r-report-list").innerHTML = "";
    for (let i = 0; i < REPORT.length; i++) {
        /*
        HERE LIES:
        45 minutes of my time

        I spent nearly an hour trying to figure out why this function was hanging. It was because I was using 'addHeaderItem' and 'addGraphItem' to populate the list,
        and totally forgot that those functions ADD AN ITEM to the report list, meaning the list grew infinitely as it tried to populate all the items.

        This memorial has been placed in hopes that immediate-future William is more careful and that long-term-future William avoids mutable states like the plague.
        pure functional programming would have saved me here.
        */
        if (REPORT[i].length === 2) {
            // header
            addHeaderItem(REPORT[i][0], -1, REPORT[i], true);
        } else {
            // graph
            addGraphItem(REPORT[i][2], -1, REPORT[i], true);
        }
    }
}
/**
 * returns a div representing a list element for report structure.
 * @param {string} title - title of report element
 * @param {string} iconSrc - path to icon for the report element
 * @returns {Node} - report list item div.
 */
function buildBaseListElement(title, iconSrc) {
    const div = document.createElement("div");
    div.className = "c-list-item";
    div.onclick = selectReportItem;
    div.ondrop = recieveDroppedReportItem;
    div.ondrag = reportDragStart;
    div.ondragover = (event) => event.preventDefault();
    div.draggable = true;
    
    const typeIcon = document.createElement("img");
    typeIcon.src = iconSrc;
    typeIcon.className = "d-icon";

    const name = document.createElement("p");
    name.innerHTML = title;

    const closeButton = document.createElement("button");
    closeButton.style = "border:none;cursor:pointer;background-color:inherit";
    closeButton.innerHTML = "<img src='src/assets/cross-red.svg' class='d-icon' />"
    closeButton.onclick = removeReportItem;

    div.appendChild(typeIcon);
    div.appendChild(name);
    div.appendChild(closeButton);

    return div;
}
/**
 * adds a header item to the report structure list, and to the underlying REPORT data structure.
 * @param {string} title 
 * @param {int} index - the position at which to insert the header item in the list. -1 for end.
 * @param {Array<string>} values - the data of the header item to append.
 */
function addHeaderItem(title, index, values, alreadyExistsInCodebook = false) {
    const itemToAdd = values === undefined ? [title, ""] : values;
    setUnsavedChanges();
    const div = buildBaseListElement(title, "src/assets/heading.svg");
    if (index === -1) {
        document.getElementById("r-report-list").appendChild(div);
        if (alreadyExistsInCodebook) return;
        REPORT.push(itemToAdd);
    } else {
        const nodeList = document.getElementById("r-report-list").children;
        const referenceNode = index < nodeList.length ? nodeList[index] : null;
        document.getElementById("r-report-list").insertBefore(div, referenceNode);
        if (alreadyExistsInCodebook) return;
        REPORT.splice(index, 0, itemToAdd);
    }
}

/**
 * adds a graph item to the report structure list, and to the underlying REPORT data structure.
 * @param {string} title 
 * @param {int} index - the position at which to insert the graph item in the list. -1 for end.
 * @param {Array<string>} values - the data of the graph item to append.
 */
function addGraphItem(title, index, values, alreadyExistsInCodebook = false) {
    const itemToAdd = values === undefined ? ["", "", title, "", "", "", ""] : values;
    setUnsavedChanges();
    let newGraphTitle = ""
    if (!CODEBOOK[0].includes(itemToAdd[0])) {
        newGraphTitle += `<img title="Data source '${itemToAdd[0]}' not found in codebook" class="d-icon" src="src/assets/triangle-warning.svg">`;
    }
    newGraphTitle += title;
    const div = buildBaseListElement(newGraphTitle, "src/assets/stats.svg")
    if (index === -1) {
        document.getElementById("r-report-list").appendChild(div);
        if (alreadyExistsInCodebook) return;
        REPORT.push(itemToAdd);
    } else {
        const nodeList = document.getElementById("r-report-list").children;
        const referenceNode = index < nodeList.length ? nodeList[index] : null;
        document.getElementById("r-report-list").insertBefore(div, referenceNode);
        if (alreadyExistsInCodebook) return;
        REPORT.splice(index, 0, itemToAdd);
    }
}

/**
 * takes in a pointer to a div and returns its position within the report list, or -1 if it isn't present.
 * @param {Node} div - div element of report item
 * @returns {int} index of report item, or -1 if not found.
 */
function getReportItemIndex(div) {
    // takes in a pointer to a div and returns its position within the report list
    const reportList = document.getElementById("r-report-list").children;
    for (let i = 0; i < reportList.length; i++) {
        if (div === reportList[i]) {
            return i;
        }
    }
    return -1;
}
/**
 * deletes the report item (and underlying data) that is responsible for raising the event. Modifies REPORT and REPORT_SELECTED.
 * @param {Event} e - click event of the 'X' button of a report item
 */
function removeReportItem(e) {
    e.stopPropagation();
    const index = getReportItemIndex(e.srcElement.parentElement.parentElement);
    document.getElementById("r-report-list").children[index].remove();
    REPORT.splice(index, 1);
    if (index === REPORT_SELECTED) {
        REPORT_SELECTED = -1;
        blockSettingsPanels();
    }
    if (index > REPORT_SELECTED) {
        REPORT_SELECTED -= 1;
    }
}
/**
 * selects the report item that raised the event, and opens the correct settings panel to modify it. Modifies REPORT_SELECTED.
 * @param {Event} e - click event of the 'X' button of a report item
 */
function selectReportItem(e) {
    const index = e.srcElement.nodeName === "DIV" ? getReportItemIndex(e.srcElement) : getReportItemIndex(e.srcElement.parentElement);
    const reportList = document.getElementById("r-report-list").children;
    for (let i = 0; i < reportList.length; i++) {
        if (i === index && index !== REPORT_SELECTED) {
            reportList[i].className = "c-list-item c-selected";
            continue;
        }
        reportList[i].className = "c-list-item";
    }
    if (REPORT_SELECTED === index ) {
        REPORT_SELECTED = -1;
        blockSettingsPanels();
    } else {
        REPORT_SELECTED = index;
        unblockCorrectSettingsPanel()
    }
}
/**
 * unblocks the correct settings panel based on the type of the currently selected report. Depends on REPORT and REPORT_SELECTED.
 */
function unblockCorrectSettingsPanel() {
    blockSettingsPanels();
    if (REPORT[REPORT_SELECTED].length === 2) {
        unblockHeaderSettings();
    } else {
        unblockGraphSettings();
    }
}
/**
 * unblocks the graphs settings panel. Depends on REPORT and REPORT_SELECTED.
 */
function unblockGraphSettings() {
    document.getElementById("r-graph-settings").className = "r-settings-item";
    const graphSettingsList = document.getElementById("r-graph-settings").getElementsByClassName("c-input");
    for (let i = 0; i < graphSettingsList.length; i++) {
        graphSettingsList[i].value = REPORT[REPORT_SELECTED][i];
    }
}
/**
 * unblocks the header settings panel. Depends on REPORT and REPORT_SELECTED.
 */
function unblockHeaderSettings() {
    document.getElementById("r-header-settings").className = "r-settings-item";
    const headerSettingsList = document.getElementById("r-header-settings").getElementsByClassName("r-textarea");
    for (let i = 0; i < headerSettingsList.length; i++) {
        headerSettingsList[i].value = REPORT[REPORT_SELECTED][i];
    }
}
/**
 * Blocks both the graph settings and header settings panels.
 */
function blockSettingsPanels() {
    document.getElementById("r-graph-settings").className = "r-settings-item invisible";
    document.getElementById("r-header-settings").className = "r-settings-item invisible";
}
/**
 * saves changes to the graph input elements to the selected element of REPORT. Also sets the report list item's text to match the current title. Depends on REPORT, CODEBOOK, and REPORT_SELECTED.
 */
function saveChangesToGraph() {
    setUnsavedChanges();
    const graphSettingsList = document.getElementById("r-graph-settings").getElementsByClassName("c-input");
    let outValues = [];
    for (const input of graphSettingsList) {
        outValues.push(input.value)
    }
    REPORT[REPORT_SELECTED] = outValues;
    // make the corresponding div's <p> element text change to the new title
    // warn if the graph's data source doesn't exist.
    let newGraphTitle = ""
    if (!CODEBOOK[0].includes(outValues[0])) {
        newGraphTitle += `<img title="Data source '${outValues[0]}' not found in codebook" class="d-icon" src="src/assets/triangle-warning.svg">`;
    }
    newGraphTitle += outValues[2];

    document.getElementById("r-report-list").children[REPORT_SELECTED].children[1].innerHTML = newGraphTitle;
}
/**
 * saves changes to the header input elements to the selected element of REPORT. Also sets the report list item's text to match the current title. Depends on REPORT and REPORT_SELECTED.
 */
function saveChangesToHeader() {
    setUnsavedChanges();
    const graphSettingsList = document.getElementById("r-header-settings").getElementsByClassName("r-textarea");
    let outValues = [];
    for (const input of graphSettingsList) {
        outValues.push(input.value)
    }
    REPORT[REPORT_SELECTED] = outValues;
    // make the corresponding div's <p> element text change to the new title
    document.getElementById("r-report-list").children[REPORT_SELECTED].children[1].innerText = outValues[0];
}
/**
 * rearranges the report list (and corresponding data entry) by moving one item to a new position. The item is spliced, and then re-inserted at the new position (not swapped).
 * depends on and modifies REPORT and REPORT_SELECTED.
 * @param {int} itemToMove - index of report item to relocate
 * @param {int} newPosition - index that report item should be relocated to
 * @returns {null}
 */
function rearrangeReportList(itemToMove, newPosition) {
    if (newPosition < 0 || newPosition >= REPORT.length) throw Error("New item index out of range.");
    if (itemToMove < 0 || itemToMove >= REPORT.length) throw Error("item to move index out of range");
    if (itemToMove === newPosition) return;

    // unselect current item if selected
    let sel = REPORT_SELECTED;
    if (REPORT_SELECTED !== -1) {
        document.getElementById("r-report-list").children[REPORT_SELECTED].click();
    }

    // pull report item (data) out of REPORT list.
    const itemData = REPORT.splice(itemToMove, 1)[0];

    // delete visual item from r-report-list
    const itemToDelete = document.getElementById("r-report-list").children[itemToMove];
    document.getElementById("r-report-list").removeChild(itemToDelete);

    // re insert item
    const insertIndex = newPosition;

    if (itemData.length === 2) {
        // header
        addHeaderItem(itemData[0], insertIndex, itemData);
    } else {
        // graph
        addGraphItem(itemData[2], insertIndex, itemData);
    }

    // re select previously selected item
    if (sel !== -1) {
        if (sel > itemToMove && sel <= newPosition) {
            sel--;
        }else if (sel >= newPosition && sel < itemToMove) {
            sel++;
        } else if (sel === itemToMove) {
            sel = newPosition;
        }
        document.getElementById("r-report-list").children[sel].click();
    }

}
/**
 * rearranges report list in the correct way based on which item was picked up and where it was dropped. Depends on and modifies REPORT_DRAG_SOURCE.
 * @param {Event} e - Event called when dragged report item is dropped on an existing report item.
 */
function recieveDroppedReportItem(e) {
    e.preventDefault();
    let targetPos = getReportItemIndex(e.target);
    if (targetPos === -1) targetPos = getReportItemIndex(e.target.parentElement); //in case the event comes from an element nested in the list item div
    if (targetPos === -1) return; //if it still doesn't work cancel the operation
    const sourcePos = REPORT_DRAG_SOURCE;
    REPORT_DRAG_SOURCE = -1;
    rearrangeReportList(sourcePos, targetPos);
}
/**
 * sets REPORT_DRAG_SOURCE to the index of the item being dragged.
 * @param {Event} e - Event called when report item is being dragged.
 */
function reportDragStart(e) {
    REPORT_DRAG_SOURCE = getReportItemIndex(e.target);
}

/**
 * Button called by report structure 'remove all' button. Removes all child elements of r-report-list, if the user confirms that they want to delete them.
 */
function reportRemoveAllButton() {
    const reportList = document.getElementById("r-report-list");
    if (reportList.children.length !== 0) {
        globalWarningPopup("Remove all report elements?",
            `This will delete ${reportList.children.length} items and cannot be undone.`,
            () => {document.getElementById("r-report-list").innerHTML = ""; blockSettingsPanels(); REPORT = []},
            () => 0
        );
    }
}