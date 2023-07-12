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
}

function gItemAdded(list, index) {
    gEditButton(list, index);
}

function gItemDeleted(list, index) {
    saveGraphData();
    setUnsavedChanges();
}

function gItemSelected(list, index) {
    // add preview to window
}

function gItemDeselected(list, index) {
    // remove preview from window
}

function gEditButton(list, index) {
    // open the edit window
}

function addToGraphList() {
    GRAPH_LIST.addItem(-1, "New Custom Graph", undefined, "graph not configured.");
}

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

function saveGraphData() {
    GRAPH_DATA = GRAPH_LIST.getAllData();
}

function loadGraphData() {

}