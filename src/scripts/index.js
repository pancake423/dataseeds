// Global Variables. for the sake of my sanity, they will all be defined in the same place.

let WORKSPACE = {}; //contains data frames for every file currently loaded into the program.
let COLUMN_MISMATCH_HANDLING = 'flag' //how to handle data files with mismatched column names. 'flag', 'merge', or 'drop'. for more info about what each mode does, see BudgetDataFrame append() method.
let CODEBOOK = [];
let CUSTOM_VARIABLES = [];
let REPORT = [];
let UNSAVED_CHANGES = false;
let DF = new BudgetDataFrame(); //data frame containing combined user entries
let DF_UP_TO_DATE = false;
let CODEBOOK_SELECTED = -1; //which codebook element (name) is currently being modified
let REPORT_SELECTED = -1;

// main page UI functions. each sub-page's UI functionality is delegated to a separate file.
function customAlert(message) {
    document.getElementById("global-warning-text").innerText = message;
    document.getElementById("global-warning").style.opacity = 1;
    document.getElementById("global-warning").className = "d-warning shown";
    window.setTimeout(() => {document.getElementById("global-warning").style.opacity = 0; window.setTimeout(() => document.getElementById("global-warning").className = "d-warning hidden", 500)}, 3000);
}
function globalWarningPopup(title, text, okCallback, cancelCallback) {
    document.getElementById("global-confirm-title").innerHTML = title;
    document.getElementById("global-confirm-text").innerHTML = text;
    document.getElementById("global-confirm-popup").className = "no-access-bg shown";

    document.getElementsByClassName("global-confirm-button")[0].onclick = () => {hideGlobalWarningPopup(); okCallback()};
    document.getElementsByClassName("global-confirm-button")[1].onclick = () => {hideGlobalWarningPopup(); cancelCallback()};
}
function hideGlobalWarningPopup() {
    document.getElementById("global-confirm-popup").className = "no-access-bg hidden";
}

// refresh the content on each page whenever a data update is made.
function refreshPageContent() {
    loadCodebookPage();
    loadReportsPage();
}

// tab bar functionality. allows user to switch between tabs
function selectTab(n) {
    // get list of all page and tab elements
    const pages = document.getElementById("page-container").children;
    const tabs = document.getElementById("tab-bar").children;

    // select the nth tab and show the nth page, hide all others
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].className = i === n ? "tab selected" : "tab";
        pages[i].className = i === n ? "page shown" : "page hidden";
    }
    //functions called whenever a tab loads.
    if (checkWorkspaceLoaded()) {
        if (n !== 0) createMergedDF();
        if (n === 1) loadCodebookPage();
    }
    if (n === 3) loadReportsPage();
}

//Data operations
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
        DF.append(WORKSPACE[key]);
    }
}