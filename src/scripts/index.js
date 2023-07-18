// Global Variables. for the sake of my sanity, they will all be defined in the same place.

let WORKSPACE = {}; //contains data frames for every file currently loaded into the program.
let COLUMN_MISMATCH_HANDLING = 'flag' //how to handle data files with mismatched column names. 'flag', 'merge', or 'drop'. for more info about what each mode does, see BudgetDataFrame append() method.

// stores the data unpacked from the config file.
let CODEBOOK = [];

let CUSTOM_VARIABLES = [];

let REPORT = [];
let REPORT_SELECTED = -1; //which report element (id) is currently selected
let REPORT_DRAG_SOURCE = -1; //used for tracking the source id for report drag/drop rearrange actions.

let UNSAVED_CHANGES = false; // whether or not the current config has unsaved changes.

let DF = new BudgetDataFrame(); //data frame containing combined user entries
let DF_UP_TO_DATE = false; // used to track whether or not DF needs to be updated (to save on computation)
let DF_CUSTOM = new BudgetDataFrame(); //data frame used to store columns calculated from CUSTOM_VARIABLES

//CustomList object bindings
let DATA_FILE_LIST;
let CB_LIST;
let CV_LIST;
let GRAPH_LIST;

let GRAPH_DATA = []; // stores data about custom user graphs.
let GRAPH_POPUP;
let GRAPH_RENDERER;

let SUGGESTED_SAVE_FILE_NAME = "New Project";

window.onload = init;

function init() {
    initDataFilesPage();
    initCodebookPage();
    initCustomVariablesPage();
}

// main page UI functions. each sub-page's functionality is delegated to a separate file.

/**
 * Raises a custom alert, appearing as a red box in the top-center of the page, that lasts for 5 seconds.
 * used as a replacement for window.alert() that is non-blocking.
 * @param {string} message - text content of the box
 */
function customAlert(message) {
    document.getElementById("global-warning-text").innerText = message;
    document.getElementById("global-warning").style.opacity = 1;
    document.getElementById("global-warning").className = "d-warning shown";
    window.setTimeout(() => {document.getElementById("global-warning").style.opacity = 0; window.setTimeout(() => document.getElementById("global-warning").className = "d-warning hidden", 500)}, 3000);
}

/**
 * opens the global warning popup, which blocks access to any of the page functionality until the user selects one of the two buttons (ok or cancel).
 * used as a replacement for window.confirm()
 * @param {string} title - title of prompt
 * @param {string} text - body text of prompt
 * @param {function} okCallback - function that is called if the user clicks the 'OK' button
 * @param {function} cancelCallback - function that is called if the user clicks the 'Cancel' button
 */
function globalWarningPopup(title, text, okCallback, cancelCallback) {
    document.getElementById("global-confirm-title").innerHTML = title;
    document.getElementById("global-confirm-text").innerHTML = text;
    document.getElementById("global-confirm-popup").className = "no-access-bg shown";

    document.getElementsByClassName("global-confirm-button")[0].onclick = () => {document.getElementById("global-confirm-popup").className = "no-access-bg hidden"; okCallback()};
    document.getElementsByClassName("global-confirm-button")[1].onclick = () => {document.getElementById("global-confirm-popup").className = "no-access-bg hidden"; cancelCallback()};
}

/**
 * refreshes the content on each page. called whenever a data update is made (such as uploading a codebook, loading a new data file, etc.)
 */
function refreshPageContent() {
    refreshFileList();
    loadCodebookPage();
    loadReportsPage();
    loadCustomVariablesPage();
    loadGraphData();
    PopupVariable.updateDataSourceDropdown([...CODEBOOK[0], ...CUSTOM_VARIABLES[0]]);
}

/**
 * selects the nth tab from page-container. highlights that tab in the tab bar and shows the corresponding page content, while hiding all other pages.
 * also calls special functions for some tabs that need to be run on load.
 * @param {int} n - id of tab being selected.
 */
function selectTab(n) {
    // get list of all page and tab elements
    const pages = document.getElementById("page-container").children;
    const tabs = document.getElementById("tab-bar").children;
    let prev_tab = -1;

    // select the nth tab and show the nth page, hide all others
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].className === "tab selected") {prev_tab = i}
        if (i === n) {
            tabs[i].className = "tab selected";
            pages[i].className = "page shown";
        } else {
            tabs[i].className = "tab";
            pages[i].className = "page hidden";
        }
    }
    
    if (n === prev_tab) return; //don't call tab load functions if we don't change tabs.


    //functions called whenever a tab loads.
    if (checkWorkspaceLoaded()) {
        if (n !== 0) createMergedDF();
    }
    if (n === 0) refreshFileList();
    if (n === 1) loadCodebookPage();
    if (n === 3) loadReportsPage();
    if (n == 4) {loadGraphData(); PopupVariable.updateDataSourceDropdown([...CODEBOOK[0], ...CUSTOM_VARIABLES[0]]);}
}

//Data operations

/**
 * Dependent on DF, DF_UP_TO_DATE, WORKSPACE, COLUMN_MISMATCH_HANDLING
 * 
 * if the current global data frame (DF) is out of date, update it by appending the contents of all files listed in WORKSPACE.
 * the append method is COLUMN_MISMATCH_HANDLING.
 * modifies DF, DF_UP_TO_DATE.
 * @returns {int|null} 0 if df up to date otherwise null
 */
function createMergedDF() {
    if (DF_UP_TO_DATE) return 0;
    DF_UP_TO_DATE = true;
    // populates the DF global variable with all the dataframes contained in workspace.
    DF = new BudgetDataFrame();
    for (key in WORKSPACE) {
        if (DF.numColumns === 0) {
            DF = WORKSPACE[key].copy();
            continue;
        }
        DF.append(WORKSPACE[key], COLUMN_MISMATCH_HANDLING);
    }
}