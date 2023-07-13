function newProjectButton() {
    newBlankConfig();
    hideStartScreen();
}

function existingProjectButton() {
    addExistingConfig(() => hideStartScreen());
}

function hideStartScreen() {
    initGraphsPage();
    refreshPageContent();
    document.getElementById("start-page").style.opacity = 0;
    window.setTimeout(() => {document.getElementById("start-page").style.display = "none"}, 500);
}