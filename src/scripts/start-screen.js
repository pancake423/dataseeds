function newProjectButton() {
    newBlankConfig();
    hideStartScreen();
}

function existingProjectButton() {
    addExistingConfig(() => hideStartScreen());
}

function hideStartScreen() {
    document.getElementById("start-page").style.opacity = 0;
    window.setTimeout(() => {document.getElementById("start-page").style.display = "none"}, 500);
}