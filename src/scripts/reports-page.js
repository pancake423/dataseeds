function loadReportsPage() {
    if (!checkConfigLoaded()) return;
    populateDataSourceDropdown();
    loadReportFromCodebook();
    blockSettingsPanels();
}

function populateDataSourceDropdown() {
    let contents = "";
    for (const varName of CODEBOOK[0]) {
        contents += `<option value='${varName}'>${varName}</option>`
    }
    document.getElementById("r-data-source").innerHTML = contents;
}
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
            document.getElementById("r-report-list").appendChild(buildBaseListElement(REPORT[i][0], "src/assets/heading.svg"));
        } else {
            // graph
            document.getElementById("r-report-list").appendChild(buildBaseListElement(REPORT[i][2], "src/assets/stats.svg"));
        }
    }
}
function buildBaseListElement(title, iconSrc) {
    const div = document.createElement("div");
    div.className = "c-list-item";
    div.onclick = selectReportItem;
    
    const typeIcon = document.createElement("img");
    typeIcon.src = iconSrc;
    typeIcon.className = "d-icon";

    const name = document.createElement("p");
    name.innerText = title;

    const closeButton = document.createElement("button");
    closeButton.style = "border:none;cursor:pointer;background-color:inherit";
    closeButton.innerHTML = "<img src='src/assets/cross-red.svg' class='d-icon' />"
    closeButton.onclick = removeReportItem;

    div.appendChild(typeIcon);
    div.appendChild(name);
    div.appendChild(closeButton);

    return div;
}
function addHeaderItem(title, index, ) {
    setUnsavedChanges();
    const div = buildBaseListElement(title, "src/assets/heading.svg");
    if (index === -1) {
        document.getElementById("r-report-list").appendChild(div);
        REPORT.push([title, ""]);
    } else {
        const nodeList = document.getElementById("r-report-list").children;
        const referenceNode = index + 1 < nodeList.length ? nodeList[index + 1] : null;
        document.getElementById("r-report-list").insertBefore(div, referenceNode);
        REPORT.splice([title, ""]);
    }
}

function addGraphItem(title, index) {
    setUnsavedChanges();
    const div = buildBaseListElement(title, "src/assets/stats.svg")
    if (index === -1) {
        document.getElementById("r-report-list").appendChild(div);
        REPORT.push(["", "", title, "", "", "", ""]);
    } else {
        const nodeList = document.getElementById("r-report-list").children;
        const referenceNode = index + 1 < nodeList.length ? nodeList[index + 1] : null;
        document.getElementById("r-report-list").insertBefore(div, referenceNode);
        REPORT.splice(index, 0, ["", "", title, "", "", "", ""]);
    }
}

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
function removeReportItem(e) {
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
function unblockCorrectSettingsPanel() {
    blockSettingsPanels();
    if (REPORT[REPORT_SELECTED].length === 2) {
        unblockHeaderSettings();
    } else {
        unblockGraphSettings();
    }
}
function unblockGraphSettings() {
    document.getElementById("r-graph-cover").className = "no-access-bg hidden";
    const graphSettingsList = document.getElementById("r-graph-settings").getElementsByClassName("c-input");
    for (let i = 0; i < graphSettingsList.length; i++) {
        graphSettingsList[i].value = REPORT[REPORT_SELECTED][i];
    }
}
function unblockHeaderSettings() {
    document.getElementById("r-header-cover").className = "no-access-bg hidden";
    const headerSettingsList = document.getElementById("r-header-settings").getElementsByClassName("r-textarea");
    for (let i = 0; i < headerSettingsList.length; i++) {
        headerSettingsList[i].value = REPORT[REPORT_SELECTED][i];
    }
}
function blockSettingsPanels() {
    document.getElementById("r-graph-cover").className = "no-access-bg shown";
    document.getElementById("r-header-cover").className = "no-access-bg shown";
}

function saveChangesToGraph() {
    setUnsavedChanges();
    const graphSettingsList = document.getElementById("r-graph-settings").getElementsByClassName("c-input");
    let outValues = [];
    for (const input of graphSettingsList) {
        outValues.push(input.value)
    }
    REPORT[REPORT_SELECTED] = outValues;
    // make the corresponding div's <p> element text change to the new title
}
function saveChangesToHeader() {
    setUnsavedChanges();
    const graphSettingsList = document.getElementById("r-header-settings").getElementsByClassName("r-textarea");
    let outValues = [];
    for (const input of graphSettingsList) {
        outValues.push(input.value)
    }
    REPORT[REPORT_SELECTED] = outValues;
    // make the corresponding div's <p> element text change to the new title
}