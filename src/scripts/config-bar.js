function setConfigStatus(m, ok) {
    //m -> string message
    //ok -> text is green if true, red if false
    const c = document.getElementById('config-status-text');
    c.className = ok ? 'green' : 'red';
    c.innerText = m;
}
function setUnsavedChanges() {
    UNSAVED_CHANGES = true;
    setConfigStatus("Unsaved changes", !UNSAVED_CHANGES);
}
function setNoUnsavedChanges() {
    UNSAVED_CHANGES = false;
    setConfigStatus("No unsaved changes", !UNSAVED_CHANGES);

}
function showConfigPrompt(type) {
    let title;
    let text;
    switch (type) {
        case 'blank':
            title = "New Blank Configuration";
            text = "Creates a new blank file with no information in it.";
            break;
        case 'auto':
            if (Object.keys(WORKSPACE).length === 0) {
                customAlert("At least one data file must be added in order to auto generate a config file.");
                return;
            }
            title = "Auto Generate Configuration";
            text = "Auto generate a basic codebook and report based on the CSV files that are uploaded.";
            break;
        case 'existing':
            title = "Add Existing Configuration";
            text = "Use a config file from your local machine.";
            break;
    }
    if (UNSAVED_CHANGES) text += "<br><br> You have unsaved changes that will be lost if you proceed.";
    if (checkConfigLoaded()) text += "<br><br> The currently loaded config file will be replaced if you proceed.";

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
    UNSAVED_CHANGES = false;
    CODEBOOK = [[], [], []];
    CUSTOM_VARIABLES = [[], [], []];
    REPORT = [];
    setConfigStatus("No unsaved changes", !UNSAVED_CHANGES);
    hideConfigPageBlockers();
}
function autoGenerateConfig() {
    UNSAVED_CHANGES = true;
    setConfigStatus("Unsaved changes", !UNSAVED_CHANGES);
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
function addExistingConfig() {
    // prompt user to select JSON file.
    // only if file upload is successful:
    filePickerButtonJSON().then((fileText) => {
        const config = JSON.parse(fileText);
        // ensure config file is valid
        if (!('codebook' in config && 'custom' in config && 'report' in config)) {customAlert("Invalid configuration file."); return -1};
        if (!(config['codebook'].length === 3 && config['custom'].length === 3 && config['report'].length >= 2)) {alert("Invalid configuration file."); return -1};
            
        CODEBOOK = config['codebook'];
        CUSTOM_VARIABLES = config['custom'];
        REPORT = config['report'];
        UNSAVED_CHANGES = false;
        setConfigStatus("No unsaved changes", !UNSAVED_CHANGES);
        hideConfigPageBlockers();
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
        suggestedName: 'config'
      };
      showSaveFilePicker(opts)
      .then((handle) => handle.createWritable())
      .then((writable) => {
        const config = JSON.stringify({codebook: CODEBOOK, custom: CUSTOM_VARIABLES, report: REPORT});
        writable.write(config);
        writable.close();
        UNSAVED_CHANGES = false;
        setConfigStatus("No unsaved changes", !UNSAVED_CHANGES);
      })
      .catch((err) => {
        console.error(err);
    });
    

}
function checkConfigLoaded() {
    return CODEBOOK.length === 3 && CUSTOM_VARIABLES.length == 3;
}

function hideConfigPageBlockers() {
    const pageBlockers = [
    document.getElementById("r-no-config"),
    document.getElementById("v-no-config"),
    document.getElementById("c-no-config"),
    document.getElementById("g-no-config"),
    ];
    pageBlockers.map((e) => {e.className = "no-access-bg hidden"});
    // make sure the underlying pages get loaded when blockers are removed
    refreshPageContent();
}

// returns a promise that resolves to a string representing user selected JSON data.
function filePickerButtonJSON() {
    // allow user to upload multiple files of type CSV.
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
    .then((f) => f.text());
}