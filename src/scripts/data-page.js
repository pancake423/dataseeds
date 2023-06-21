// handle file drop 
function dropHandler(e) {
    e.preventDefault();
    const items = e.dataTransfer.items;
    let fileList = [];
    // ensure that all items in drop zone are files of type CSV before passing them to the data loader. otherwise, ignore all files and display a warning message.
    if (items) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === "file") {
                const file = items[i].getAsFile();
                if (file.type === "text/csv") {
                    fileList.push(file)
                } else {
                    showFileWarning("Auto Report Generator only supports CSV files.");
                    return;
                }
            } else {
                showFileWarning("Auto Report Generator only supports CSV files.");
                return;
            }
        }
        // TODO: popup box on mismatched column names (option for only keep overlap, add empty columns, or cancel file upload.)
        addFilesToWorkspace(fileList);
    }
}

// stops browser default dragover behavior for file drop
function dragOverHandler(e) {
    e.preventDefault();
}

//shows a red warning box below the drag and drop area with the specified message m.
function showFileWarning(m) {
    const warnElement = document.getElementsByClassName('d-warning')[0];
    warnElement.style.opacity = 1;
    warnElement.innerHTML = `<p>${m}</p>`;
    window.setTimeout(hideFileWarning, 5000);
}
function hideFileWarning() {
    document.getElementsByClassName('d-warning')[0].style.opacity = 0;
}

// add a visual representation of a file that is currently loaded in the workspace.
function addFileToList(filename) {
    listItem = document.createElement("div");
    listItem .className = "d-list-item";
    listItem .innerHTML = `<p style="width:80%">${filename}</p><button style="border:none;cursor:pointer;background-color:inherit" onclick="removeFileFromList('${filename}')"><img src="src/assets/cross-red.svg" class="d-icon" /></button>`;
    document.getElementById("d-file-list").appendChild(listItem);
}

function findFileListElement(filename) {
    listItems = document.getElementsByClassName('d-list-item')
    for (let i = 0; i < listItems.length; i++) {
        if (listItems[i].children[0].innerHTML === filename) {
            return listItems[i];
        }
    }
}
// remove the visual representation and underlying data for a currently loaded file.
function removeFileFromList(filename) {
    findFileListElement(filename).remove();
    delete WORKSPACE[filename];
}

// adds a new file to the workspace (both a visual element and underlying data frame in WORKSPACE). Asynchronous: file display visual doesn't appear until the data has loaded.
function addFileToWorspace(file) {
    if (!(file.name in WORKSPACE)) {
        WORKSPACE[file.name] = new BudgetDataFrame();
        WORKSPACE[file.name].readCSVFile(file, () => {
            addFileToList(file.name);
            if (checkForColumnMismatch()) showMismatchedHandlePopup();
            DF_UP_TO_DATE = false;
        });
    } else {
        showFileWarning(`Duplicate file name '${file.name}' detected. File not added to workspace.`);
    }
}

// add multiple files at once.
function addFilesToWorkspace(fileList) {
    for (const file of fileList) {
        addFileToWorspace(file)
    }
}

// called by 'Add Files' button. only compatible with chrome and edge. exact same functionality as dropHandler.
function filePickerButtonCSV() {
    // allow user to upload multiple files of type CSV.
    const options = {
        types: [
          {
            description: "CSV Files",
            accept: {
              "text/csv": [".csv"],
            },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: true,
    };
    // promises make my brain tingle in a bad way
    // showOpenFilePicker promises a list of FileSystemFileHandles. for each one, we call getFile, which promises a file, which can then be added to the workspace like normal.
    showOpenFilePicker(options)
    .then((arr) => {
        for (const handle of arr) {
            handle.getFile()
            .then((file) => {
                addFileToWorspace(file);
            })
        }
    });
}
// check that every df in the workspace has finished loading.
function checkWorkspaceLoaded() {
    if (Object.keys(WORKSPACE).length === 0) return false;
    for (const key in WORKSPACE) {
        if (!(WORKSPACE[key].isLoaded())) return false;
    }
    return true;
}

// ensure that every column in the dataspace has matching columns. returns true if there IS column mismatch, otherwise false.
function checkForColumnMismatch() {
    // don't check if workspace isn't fully loaded or if we've already flagged a different mode for handling mismatches.
    if (!checkWorkspaceLoaded() || COLUMN_MISMATCH_HANDLING !== 'flag') return;
    // check that every column label in the first workspace item also exists in every other workspace item.
    let checkCol;
    for (const key in WORKSPACE) {
        if (checkCol === undefined) {
            checkCol = WORKSPACE[key].getColumnList();
            continue;
        }
        currentCol = WORKSPACE[key].getColumnList();
        for (colName of checkCol) {
            if (!currentCol.includes(colName)) return true;
        }
    }
    return false;
}

// shows the user a popup window that allows them to choose a handling mode for mismatched columns.
function showMismatchedHandlePopup() {
    document.getElementById("d-mismatch-popup").className = "no-access-bg shown";
}

// hide the above window.
function hideMismatchedHandlePopup() {
    document.getElementById("d-mismatch-popup").className = "no-access-bg hidden";
}

function handleMismatchPopupAction(option) {
    switch (option) {
        case 'merge':
            COLUMN_MISMATCH_HANDLING = 'merge';
            hideMismatchedHandlePopup();
            break;
        case 'drop':
            COLUMN_MISMATCH_HANDLING = 'drop';
            hideMismatchedHandlePopup();
            break;
        case 'remove':
            removeMismatchedDataFiles();
            hideMismatchedHandlePopup();
            break
    }
}

function removeMismatchedDataFiles() {
    // remove files in reverse order that they were uploaded in (delete most recent file first) until there is no longer a column mismatch.
    const keys = Object.keys(WORKSPACE);
    for (const key of keys.reverse()) {
        removeFileFromList(key);
        if (!checkForColumnMismatch()) return;
    }
}