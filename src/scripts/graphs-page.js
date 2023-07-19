/**
 * initializes GRAPH_LIST to be a CustomList with an edit button.
 * initializes GRAPH_POPUP to be a PopupGraph.
 */
function initGraphsPage() {
    GRAPH_LIST = new CustomList(
        document.getElementById("g-item-list"),
        [gItemAdded, gItemDeleted, gItemSelected, gItemDeselected, () => 0],
        [
            {
                type: true,
                text: "edit",
                callback: gEditButton
            }
        ]
    );
    GRAPH_POPUP = new PopupGraph(document.getElementById("g-popup"));
    GRAPH_RENDERER = new GraphRenderer(document.getElementById("g-graph-viewer"));
}

/**
 * function called when a new item is added to GRAPH_LIST. sets its data to a temporary value and opens the graph editor prompt.
 * @param {CustomList} list - customList originating the event.
 * @param {int} index - index of element that was added to the list.
 */
function gItemAdded(list, index) {
    list.setData(
        index, 
        // default "empty" graph data object following format specification
        {
            title: "",
            data: [{
                subtitle: "",
                xlabel: "",
                ylabel: "",
                footer: "",
                type: "bar",
                variables: [{
                    name: "",
                    source: "",
                    filter: []
                }]
            }]
        }
    );
    gEditButton(list, index);
    list.setData(index, "unset");
}
/**
 * function called when a graph list item is deleted. Saves the state change to GRAPH_DATA to reflect the deletion.
 * @param {CustomList} [list]
 * @param {int} [index]
 */
function gItemDeleted(list, index) {
    saveGraphData();
    setUnsavedChanges();
}

/**
 * UNDER CONSTRUCTION: COMING SOON :)
 * @param {CustomList} list 
 * @param {int} index 
 */
function gItemSelected(list, index) {
    // add preview to window
    let joinedDF = DF.copy();
    joinedDF.join(DF_CUSTOM);
    GRAPH_RENDERER.render(GRAPH_DATA[index], joinedDF, CODEBOOK);
}
/**
 * UNDER CONSTRUCTION: COMING SOON :)
 * @param {CustomList} list 
 * @param {int} index 
 */
function gItemDeselected(list, index) {
    GRAPH_RENDERER.hide();
}
/**
 * Function called when the user clicks the 'edit' button on a list entry. Opens the 'edit graph' popup and configures it to display and edit the correct data.
 * @param {CustomList} list - CustomList originating the event
 * @param {int} index - index of list item originating the event.
 */
function gEditButton(list, index) {
    // open the edit window
    document.getElementById("g-popup-bg").className = "no-access-bg shown";
    GRAPH_POPUP.setData(list.getData(index));
    GRAPH_POPUP.submitCallback = (data) => gPopupSubmit(index, data);
    GRAPH_POPUP.cancelCallback = () => gPopupCancel(index);
}
/**
 * callback for 'cancel' button on graph edit popup. Hides the edit popup. If the corresponding list item has no data, deletes it, otherwise does nothing else.
 * @param {int} index - index of list item that opened the popup
 */
function gPopupCancel(index) {
    document.getElementById("g-popup-bg").className = "no-access-bg hidden";
    // figure out if element has been modified or not
    if (GRAPH_LIST.getData(index) === "unset") {
        if (!UNSAVED_CHANGES) window.setTimeout(() => setNoUnsavedChanges(), 0);
        GRAPH_LIST.removeElement(index);
    }
}
/**
 * callback for 'submit' button on graph edit popup. saves the returned data to the correct list item and updates the program's state accordingly.
 * @param {*} index - index of list item that opened the popup.
 * @param {PopupGraphData} data - data object returned by PopupGraph
 */
function gPopupSubmit(index, data) {
    document.getElementById("g-popup-bg").className = "no-access-bg hidden";
    GRAPH_LIST.setData(index, data);
    GRAPH_LIST.setElementWarning(index, false);
    GRAPH_LIST.setElementText(index, data.title);
    saveGraphData();
    setUnsavedChanges();
    if (GRAPH_LIST.getSelected() === index) {
        let joinedDF = DF.copy();
        joinedDF.join(DF_CUSTOM);
        GRAPH_RENDERER.render(GRAPH_DATA[index], joinedDF, CODEBOOK);
    }; //refresh preview on popup submission (if active)
}
/**
 * add a new item to the graph list.
 */
function addToGraphList() {
    GRAPH_LIST.addItem(-1, "New Custom Graph", undefined, "graph not configured.");
}
/**
 * remove all items from the graph list if the user confirms that they want to delete everything.
 */
function clearGraphList() {
    const len = GRAPH_LIST.getLength();
    if (len > 0) {
        globalWarningPopup(
            "Clear Custom Graphs List?",
            `This will delete ${len} items and cannot be undone. Proceed?`,
            () => {GRAPH_LIST.clear(); saveGraphData(); setUnsavedChanges();},
            () => 0
        );
    }
}
/**
 * saves all data from GRAPH_LIST (visual representation) back into GRAPH_DATA (state data).
 */
function saveGraphData() {
    GRAPH_DATA = GRAPH_LIST.getAllData();
}
/**
 * loads data from GRAPH_DATA (underlying state representation) into GRAPH_LIST (visual representation)
 */
function loadGraphData() {
    if (GRAPH_LIST === undefined) return;
    // check if graphs already loaded, prevents the popup from being closed when you switch tabs.
    const gl = GRAPH_LIST.getAllData();
    if (gl[gl.length - 1] === "unset") gl.pop(); // if the user is currently creating a graph, it will be the last item and shouldn't be included in loaded checks.
    if (JSON.stringify(gl) === JSON.stringify(GRAPH_DATA)) return;

    GRAPH_LIST.clear();
    if (GRAPH_DATA.length === 0) return;
    for (const g of GRAPH_DATA) {
        const i = GRAPH_LIST.addItem(-1);
        GRAPH_LIST.setData(i, g);
        GRAPH_LIST.setElementText(i, g.title);
    }
    //hide edit prompt since it opens itself every time an item is added :)
    gPopupCancel(0)
}

function graphPopoutButton() {
    GRAPH_RENDERER.popout();
}