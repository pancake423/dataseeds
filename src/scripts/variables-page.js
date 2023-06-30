function initCustomVariablesPage() {
    CV_LIST = new CustomList(
        document.getElementById("v-var-list"),
        [vItemAdded, vItemDeleted, vItemSelected, vItemDeselected, vRearrange],
        [
            {type: true, text: "edit", callback: vEditItem}
        ]
    );
}

function vItemAdded(list, index) {
    console.log(list, index);
}

function vItemSelected(list, index) {
    console.log(list, index);
}

function vItemDeselected(list, index) {
    console.log(list, index);
}

function vItemDeleted(list, index) {
    console.log(list, index);
}

function vEditItem(list, index) {
    console.log(list, index);
}

function vRearrange(list, index) {
    console.log(list, index);
}