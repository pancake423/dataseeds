// project files were originally called config files and many of the internal names still call them config files.

/**
 * sets the status of the 'save file icon'.
 * @param {string} m - message to include in icon tooltip
 * @param {boolean} ok - true -> icon is green, false -> icon is red
 */
function setConfigStatus(m, ok) {
    //m -> string message
    //ok -> text is green if true, red if false
    const c = document.getElementsByClassName("config-button-icon")[3];
    c.src = ok ? 'src/assets/download-green.svg' : 'src/assets/download-red.svg';
    c.title = `Save current project file (${m})`;
}
/**
 * shows that there are unsaved changes and adds a warning on page leave.
 */
function setUnsavedChanges() {
    UNSAVED_CHANGES = true;
    setConfigStatus("Unsaved changes", !UNSAVED_CHANGES);
    addEventListener("beforeunload", beforeUnloadListener, { capture: true });
}
/**
 * sets the program state to have no unsaved changes and removes the page leave event.
 */
function setNoUnsavedChanges() {
    UNSAVED_CHANGES = false;
    setConfigStatus("No unsaved changes", !UNSAVED_CHANGES);
    removeEventListener("beforeunload", beforeUnloadListener, {capture: true});
}
/**
 * beforeUnloadListener prevents the page from automatically leaving. As a security feature we can't actually include a message in this prompt any more.
 * @param {Event} event 
 */
const beforeUnloadListener = (event) => {
    event.preventDefault();
    return (event.returnValue = "");
};
/**
 * opens a warning prompt indicating to the user what type of operation they selected from the config bar.
 * @param {string} type - blank, auto, or existing
 * @returns 
 */
function showConfigPrompt(type) {
    let title;
    let text;
    switch (type) {
        case 'blank':
            title = "New Blank Project";
            text = "sets the current project to a blank project.";
            if (UNSAVED_CHANGES) text += "<br><br> Unsaved changes will be lost if you proceed.";
            if (checkConfigLoaded()) text += "<br><br> All currently loaded data will be overwritten.";
            break;
        case 'auto':
            if (Object.keys(WORKSPACE).length === 0) {
                customAlert("At least one data file must be added in order to auto generate a project file.");
                return;
            }
            title = "Auto Generate Project";
            text = "Auto generate a basic codebook and report based on the CSV files that are uploaded.";
            if (UNSAVED_CHANGES || checkConfigLoaded()) text += "<br><br> All data in 'Codebook' and 'Report' will be overwritten if you proceed.";
            break;
        case 'existing':
            title = "Add Existing Configuration";
            text = "Use a project file from your local machine.";
            if (UNSAVED_CHANGES) text += "<br><br> Unsaved changes will be lost if you proceed.";
            if (checkConfigLoaded()) text += "<br><br> The currently loaded project file will be replaced if you proceed.";
            break;
    }

    globalWarningPopup(title, text, () => hideConfigPrompt(type), () => 0);

}
/**
 * triggered when the user confirms the config prompt, calls the correct function based on the type.
 * @param {string} res blank, auto, existing
 */
function hideConfigPrompt(res) {
    switch (res) {
        case 'blank':
            newBlankConfig();
            break;
        case 'auto':
            autoGenerateConfig();
            break;
        case 'existing':
            addExistingConfig();
            break;
        default:
            break;
    }
    refreshPageContent();
    
}
/**
 * creates a new blank configuration
 */
function newBlankConfig() {
    CODEBOOK = [[], [], []];
    CUSTOM_VARIABLES = [[], [], []];
    REPORT = [];
    WORKSPACE = [];
    GRAPH_DATA = [];
    loadCustomVariableData();
    setNoUnsavedChanges();
    hideConfigPageBlockers();
}
/**
 * automatically generates a codebook and report based on the contents of DF.
 */
function autoGenerateConfig() {
    setUnsavedChanges();
    // auto populate codebook and report (should be fun)
    // ensure that DF has been loaded from workspace
    createMergedDF();
    CODEBOOK = [[], [], []];
    let reportSubtitle = "Data Sources:<br>";
    for (key in WORKSPACE) {
        reportSubtitle += key + '<br>'
    }
    REPORT = [['Report', reportSubtitle]];
    // populate codebook
    const cols = DF.getColumnList();
    CODEBOOK[0] = cols;
    for (col of cols) {
        CODEBOOK[1].push('none');
        CODEBOOK[2].push({});
        REPORT.push([col, 'bar', col, "", "", "", ""]);
    }
    hideConfigPageBlockers();

}
/**
 * starts an asynchronous file upload operation.
 * @param {Function} callback - callback function when async operation finishes
 */
function addExistingConfig(callback) {
    // prompt user to select JSON file.
    // only if file upload is successful:
    filePickerButtonJSON().then((fileText) => {
        const config = JSON.parse(fileText);
        // ensure config file is valid
        if (!('codebook' in config && 'custom' in config && 'report' in config && 'workspace' in config && 'graphs' in config)) {customAlert("Invalid configuration file."); return -1};
        if (!(config['codebook'].length === 3 && config['custom'].length === 3)) {customAlert("Invalid configuration file."); return -1};
            
        CODEBOOK = config['codebook'];
        CUSTOM_VARIABLES = config['custom'];
        REPORT = config['report'];
        GRAPH_DATA = config['graphs'];
        parseWorkspaceObject(config['workspace']);
        refreshPageContent();
        setNoUnsavedChanges();
        hideConfigPageBlockers();
        if (callback) {
            callback();
        }
    }).catch((err) => {
            console.error(err);
    });
}
/**
 * Starts an asynchronous file download operation for the current project file.
 */
function saveCurrentConfig() {
    if (!checkConfigLoaded()) {
        // no config file
        customAlert("No project file to save.");
        return -1;
    }
    // open save dialog
    const opts = {
        types: [
          {
            description: "JSON Project File",
            accept: { "application/json": [".json"] },
          },
        ],
        excludeAcceptAllOption: true,
        suggestedName: SUGGESTED_SAVE_FILE_NAME
      };
      showSaveFilePicker(opts)
      .then((handle) => handle.createWritable())
      .then((writable) => {
        const config = JSON.stringify({codebook: CODEBOOK, custom: CUSTOM_VARIABLES, report: REPORT, workspace: getWorkspaceObject(WORKSPACE), graphs: GRAPH_DATA});
        writable.write(config);
        writable.close();
        setNoUnsavedChanges();
      })
      .catch((err) => {
        console.error(err);
    });
}
/**
 * convert the object of CustomDataFrames to a standard JSON-convertable object.
 * @param {Object} w - Object where every entry is a CustomDataFrame.
 * @returns {Object}
 */
function getWorkspaceObject(w) {
    out = {}
    for (const key in w) {
        out[key] = w[key].exportAsObject();
    }
    return out;
}
/**
 * loads an object of standard objects back into WORKSPACE as data frames.
 * @param {Object} w - object of standard objects (read directly from project file)
 */
function parseWorkspaceObject(w) {
    WORKSPACE = {};
    for (const key in w) {

        WORKSPACE[key] = new BudgetDataFrame();
        WORKSPACE[key].importFromObject(w[key]);
    }
    createMergedDF();
}
/**
 * checks if a project file has been loaded at all.
 * @returns {Boolean} - whether or not the config file is loaded
 */
function checkConfigLoaded() {
    return CODEBOOK.length === 3 && CUSTOM_VARIABLES.length == 3;
}
/**
 * before there was a start screen, some of the pages were blocked 
 */
function hideConfigPageBlockers() {
    refreshPageContent();
}

// returns a promise that resolves to a string representing user selected JSON data.
function filePickerButtonJSON() {
    // allow user to upload a single JSON file.
    const options = {
        types: [
          {
            description: "JSON Project Files",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
    };
    // the bad tingling is getting a little quieter
    return showOpenFilePicker(options)
    .then((arr) => arr[0].getFile())
    .then((f) => {SUGGESTED_SAVE_FILE_NAME = f.name.slice(0, -5); return f.text()});
}