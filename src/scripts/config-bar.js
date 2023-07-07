function setConfigStatus(m, ok) {
    //m -> string message
    //ok -> text is green if true, red if false
    const c = document.getElementsByClassName("config-button-icon")[3];
    c.src = ok ? 'src/assets/download-green.svg' : 'src/assets/download-red.svg';
    c.title = `Save current project file (${m})`;
}
function setUnsavedChanges() {
    UNSAVED_CHANGES = true;
    setConfigStatus("Unsaved changes", !UNSAVED_CHANGES);
    addEventListener("beforeunload", beforeUnloadListener, { capture: true });
}
function setNoUnsavedChanges() {
    UNSAVED_CHANGES = false;
    setConfigStatus("No unsaved changes", !UNSAVED_CHANGES);
    removeEventListener("beforeunload", beforeUnloadListener, {capture: true});
}
const beforeUnloadListener = (event) => {
    event.preventDefault();
    return (event.returnValue = "");
  };
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
            text = "Use a config file from your local machine.";
            if (UNSAVED_CHANGES) text += "<br><br> Unsaved changes will be lost if you proceed.";
            if (checkConfigLoaded()) text += "<br><br> The currently loaded project file will be replaced if you proceed.";
            break;
    }

    globalWarningPopup(title, text, () => hideConfigPrompt(type), () => 0);

}
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

function newBlankConfig() {
    CODEBOOK = [[], [], []];
    CUSTOM_VARIABLES = [[], [], []];
    REPORT = [];
    WORKSPACE = [];
    loadCustomVariableData();
    setNoUnsavedChanges();
    hideConfigPageBlockers();
}
function autoGenerateConfig() {
    setUnsavedChanges();
    // auto populate codebook, custom variables, and report (should be fun)
    // ensure that DF has been loaded from workspace
    createMergedDF();
    CUSTOM_VARIABLES = [[], [], []];
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
function addExistingConfig(callback) {
    // prompt user to select JSON file.
    // only if file upload is successful:
    filePickerButtonJSON().then((fileText) => {
        const config = JSON.parse(fileText);
        // ensure config file is valid
        if (!('codebook' in config && 'custom' in config && 'report' in config && 'workspace' in config)) {customAlert("Invalid configuration file."); return -1};
        if (!(config['codebook'].length === 3 && config['custom'].length === 3)) {customAlert("Invalid configuration file."); return -1};
            
        CODEBOOK = config['codebook'];
        CUSTOM_VARIABLES = config['custom'];
        REPORT = config['report'];
        parseWorkspaceObject(config['workspace']);
        loadCustomVariableData();
        setNoUnsavedChanges();
        hideConfigPageBlockers();
        if (callback) {
            callback();
        }
    }).catch((err) => {
            console.error(err);
    });
}
function saveCurrentConfig() {
    if (!checkConfigLoaded()) {
        // no config file
        customAlert("No configuration file to save.");
        return -1;
    }
    // open save dialog
    const opts = {
        types: [
          {
            description: "JSON Config File",
            accept: { "application/json": [".json"] },
          },
        ],
        excludeAcceptAllOption: true,
        suggestedName: SUGGESTED_SAVE_FILE_NAME
      };
      showSaveFilePicker(opts)
      .then((handle) => handle.createWritable())
      .then((writable) => {
        const config = JSON.stringify({codebook: CODEBOOK, custom: CUSTOM_VARIABLES, report: REPORT, workspace: getWorkspaceObject(WORKSPACE)});
        writable.write(config);
        writable.close();
        setNoUnsavedChanges();
      })
      .catch((err) => {
        console.error(err);
    });
    

}
function getWorkspaceObject(w) {
    out = {}
    for (const key in w) {
        out[key] = w[key].exportAsObject();
    }
    return out;
}
function parseWorkspaceObject(w) {
    WORKSPACE = {};
    for (const key in w) {

        WORKSPACE[key] = new BudgetDataFrame();
        WORKSPACE[key].importFromObject(w[key]);
    }
    createMergedDF();
}
function checkConfigLoaded() {
    return CODEBOOK.length === 3 && CUSTOM_VARIABLES.length == 3;
}

function hideConfigPageBlockers() {
    refreshPageContent();
}

// returns a promise that resolves to a string representing user selected JSON data.
function filePickerButtonJSON() {
    // allow user to upload a single JSON file.
    const options = {
        types: [
          {
            description: "JSON Config Files",
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