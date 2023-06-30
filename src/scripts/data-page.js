/**
 * sets up DATA_FILE_LIST to point to a CustomList object
 */
function initDataFilesPage() {
    DATA_FILE_LIST = new CustomList(
        document.getElementById("d-file-list"),
        [undefined, fItemDeleted]
    );
}
/**
 * updates the contents of DATA_FILE_LIST (display list for files loaded) to reflect the contents of WORKSPACE (data list)
 */
function refreshFileList() {
    DATA_FILE_LIST.clear();
    for (key in WORKSPACE) {
        addFileToList(key);
    }
}
/**
 * removes a file from the visual list and data list based on name.
 * @param {string} fname - name of file
 */
function removeFileFromList(fname) {
    delete WORKSPACE[fname];
    const search = DATA_FILE_LIST.getAllData();
    DATA_FILE_LIST.removeElement(search.findIndex((v) => v === fname));
    setUnsavedChanges();
}


/**
 * recieves dropped files from drag and drop target. Uploads them to the workspace and visual list.
 * @param {Event} e - fileDrop event that triggered the drop handler.
 */
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
                    showFileWarning("dataseeds only supports CSV files.");
                    return;
                }
            } else {
                showFileWarning("dataseeds only supports CSV files.");
                return;
            }
        }
        // TODO: popup box on mismatched column names (option for only keep overlap, add empty columns, or cancel file upload.)
        addFilesToWorkspace(fileList);
    }
}

/**
 * stops browser default dragover behavior for file drop
 * @param {Event} e - dragover event
 */
function dragOverHandler(e) {
    e.preventDefault();
}


/**
 * shows a red warning box below the drag and drop area with the specified message m.
 * @param {string} m - warning message
 */
function showFileWarning(m) {
    const warnElement = document.getElementsByClassName('d-warning')[0];
    warnElement.style.opacity = 1;
    warnElement.innerHTML = `<p>${m}</p>`;
    window.setTimeout(hideFileWarning, 5000);
}
/**
 * hides the file warning box.
 */
function hideFileWarning() {
    document.getElementsByClassName('d-warning')[0].style.opacity = 0;
}

/**
 * add a visual representation of a file that is currently loaded in the workspace.
 * @param {string} filename - file name
 */
function addFileToList(filename) {
    const index = DATA_FILE_LIST.addItem(-1, filename);
    DATA_FILE_LIST.setData(index, filename);
}

/**
 * adds a new file to the workspace (both a visual element and underlying data frame in WORKSPACE). Asynchronous: file display visual doesn't appear until the data has loaded.
 * @param {File} file - File to add to workspace
 */
function addFileToWorspace(file) {
    if (!(file.name in WORKSPACE)) {
        WORKSPACE[file.name] = new BudgetDataFrame();
        WORKSPACE[file.name].readCSVFile(file, () => {
            addFileToList(file.name);
            if (checkForColumnMismatch()) showMismatchedHandlePopup();
            DF_UP_TO_DATE = false;
            setUnsavedChanges();
        });
    } else {
        showFileWarning(`Duplicate file name '${file.name}' detected. File not added to workspace.`);
    }
}

/**
 * adds multiple files to the workspace at once.
 * @param {Array<File>} fileList - list of files to add to workspace
 */
function addFilesToWorkspace(fileList) {
    for (const file of fileList) {
        addFileToWorspace(file)
    }
}

/**
 * callback from DATA_FILE_LIST when an item is deleted. deletes the corresponding data.
 * @param {CustomList} [list] - the list that the event originated from
 * @param {int} [index] - the index of the deleted item within the list
 * @param {CustomListItem} [deletedItem] - the deleted list item itself
 */
function fItemDeleted(list, index, deletedItem) {
    delete WORKSPACE[deletedItem.selfText.innerText];
}

/**
 * called by 'Add Files' button. only compatible with chrome and edge. exact same functionality as dropHandler.
 * allows the user to pick multiple CSV files from their machine to upload to the program.
 */
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
/**
 * checks to see if every uploaded file has loaded fully.
 * @returns {boolean} whether or not the workspace is fully loaded.
 */
function checkWorkspaceLoaded() {
    if (Object.keys(WORKSPACE).length === 0) return false;
    for (const key in WORKSPACE) {
        if (!(WORKSPACE[key].isLoaded())) return false;
    }
    return true;
}

/**
 * ensure that every dataframe in the workspace has matching columns. (every column that exists in one df exists in every other)
 * @returns {boolean} true if there IS column mismatch, otherwise false.
 */
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

/**shows the user a popup window that allows them to choose a handling mode for mismatched columns. */
function showMismatchedHandlePopup() {
    document.getElementById("d-mismatch-popup").className = "no-access-bg shown";
}

/**
 * hides the mismatch handling popup window.
 */
function hideMismatchedHandlePopup() {
    document.getElementById("d-mismatch-popup").className = "no-access-bg hidden";
}

/**
 * sets COLUMN_MISMATCH_HANDLING based on the option selected.
 * merge and drop correspond to BudgetDataFrame.append() flag modes (see that documentation).
 * remove simply drops data files until there isn't column mismatch anymore.
 * @param {string} option - merge, drop, or remove. 
 */
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
/**
 * remove files in reverse order that they were uploaded in (delete most recent file first) until there is no longer a column mismatch.
 */
function removeMismatchedDataFiles() {
    const keys = Object.keys(WORKSPACE);
    for (const key of keys.reverse()) {
        removeFileFromList(key);
        if (!checkForColumnMismatch()) return;
    }
}