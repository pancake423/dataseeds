class DataFilter {
    /**
     * prompt the user to create or edit a filter. returns a promise that resolves to the filter that the user creates. has a whole bunch of really ugly dependencies (aka future bugs): reports-page.js -> populateDataSourceDropdown(), DF, CODEBOOK, and CUSTOM_VARIABLES.
     * @param {Array<Array<string>>} [s] - existing filter list.
     * @returns {Promise} - resolves to the new filter list if the user hits 'OK', or rejects with an Error if the user cancels the request and no filter list is provided.
     */
    static getFilterList(s) {
        populateDataSourceDropdown() // from reports-page.js, populates r-report-datalist. we use this to populate the dropdown for 'column name'.

        // return a promise that resolves when the user interacts with the popup that the function calls.
        
        // create and show popup window
        function hidePopup() {document.body.removeChild(popupBg)}
        function addTableRow(data) {
            const row = document.createElement("li");

            const colName = document.createElement("input");
            colName.className = "datafilter-input";
            colName.onchange = checkRowValid;

            const comp = document.createElement("select");
            comp.innerHTML = `
            <option>=</option>
            <option>!=</option>
            <option>&lt;</option>
            <option>&lt;=</option>
            <option>&gt;</option>
            <option>&gt;=</option>
            <option>unique</option>
            `;
            comp.className = "datafilter-input";
            comp.onchange = disableValueIfUnique;

            const value = document.createElement("input");
            value.className = "datafilter-input";

            const removeButton = document.createElement("button");
            removeButton.style = "border:none;cursor:pointer;background-color:inherit";
            removeButton.innerHTML = '<img src="src/assets/cross-red.svg" class="d-icon"></img>';
            removeButton.onclick = removeSelfRow;

            row.appendChild(colName);
            row.appendChild(comp);
            row.appendChild(value);
            row.appendChild(removeButton);

            filterList.appendChild(row);
            colName.setAttribute("list", "r-source-datalist");

            //data = [name, src, value]
            if (data instanceof Array && data.length === 3) {
                colName.value = data[0];
                comp.value = data[1];
                value.value = data[2];
            }
        }
        function removeSelfRow(e) {
            e.stopPropagation();
            let li = e.srcElement.parentElement;
            if (li.tagName === "BUTTON") {
                li = li.parentElement;
            }
            filterList.removeChild(li);
        }
        function clearTable() {filterList.innerHTML = "<li><p>column name</p><p>comparison</p><p>value</p><p></p></li>";};
        function convertTableToFilter() {
            let out = [];
            for (let i = 1; i < filterList.children.length; i++) {
                const items = filterList.children[i].getElementsByClassName("datafilter-input");
                const outItem = [
                    items[0].value,
                    items[1].value,
                    items[2].value,
                ];
                if (CODEBOOK[0].includes(outItem[0]) || CUSTOM_VARIABLES[0].includes(outItem[0])) {
                    out.push(outItem);
                }
            }
            return out;
        };
        function checkRowValid(e) {
            if (CODEBOOK[0].includes(e.srcElement.value) || CUSTOM_VARIABLES[0].includes(e.srcElement.value)) {
                // valid
                e.srcElement.parentElement.className = "";
            } else {
                // invalid
                e.srcElement.parentElement.className = "datafilter-invalid";
            }
        }
        function disableValueIfUnique(e) {
            const valueField = e.srcElement.parentElement.getElementsByClassName("datafilter-input")[2];
            if (e.srcElement.value === "unique") {
                // disable value field
                valueField.value = "";
                valueField.disabled = true;
                valueField.style.cursor = "not-allowed";
            } else {   
                // enable value field
                valueField.disabled = false;
                valueField.style.cursor = "inherit";
            }
        }

        const popupBg = document.createElement("div");
        popupBg.className = "no-access-bg";
        
        const popupDiv = document.createElement("div");
        popupDiv.className = "popup-box";
        popupDiv.style.height = "75vh";
        popupDiv.style.width = "75vh";
        popupDiv.innerHTML = `<h2>${s === undefined ? "Create" : "Edit"} Filter</h2>`;

        const bottomButtonBar = document.createElement("div");
        bottomButtonBar.className = "c-horiz-bar";

        const okButton = document.createElement("button");
        okButton.innerText = "OK";
        okButton.className = "global-confirm-button accent";

        const cancelButton = document.createElement("button");
        cancelButton.innerText = "Cancel";
        cancelButton.className = "global-confirm-button bg";

        const topButtonBar = document.createElement("div");
        topButtonBar.className = "c-horiz-bar";

        const addButton = document.createElement("button");
        addButton.innerText = "Add";
        addButton.className = "global-confirm-button accent";
        addButton.onclick = addTableRow;

        const clearButton = document.createElement("button");
        clearButton.innerText = "Clear";
        clearButton.className = "global-confirm-button accent";
        clearButton.onclick = clearTable;

        const filterList = document.createElement("ul");
        filterList.className = "datafilter-list";
        filterList.innerHTML = "<li><p>column name</p><p>comparison</p><p>value</p><p></p></li>";

        const descr = document.createElement("p");
        descr.innerText = "Filters allow you to examine a sub-set of the data in the workspace. Each filter entry is applied sequentially. Each entry consists of the column to pull data from, the type of comparison to apply, and the value to compare to. The available comparison types are the logical comparison operators, plus 'unique', which filters out entries that have the same value as a previous entry in the column.";

        bottomButtonBar.appendChild(okButton);
        bottomButtonBar.appendChild(cancelButton);

        topButtonBar.appendChild(addButton);
        topButtonBar.appendChild(clearButton);

        popupDiv.appendChild(topButtonBar);
        popupDiv.appendChild(descr);
        popupDiv.appendChild(filterList);
        popupDiv.appendChild(bottomButtonBar);

        popupBg.appendChild(popupDiv);

        document.body.appendChild(popupBg);

        if (s instanceof Array && s.length > 0) {
            for (const fItem of s) {
                addTableRow(fItem);
            }
        }

        //return promise that resolves from popup window buttons being clicked.

        return new Promise((resolve, reject) => {
            okButton.onclick = () => {hidePopup(); resolve(convertTableToFilter())};
            cancelButton.onclick = () => {
                hidePopup();
                if (s) {
                    resolve(s);
                } else {
                    reject(Error("User aborted the request."));
                }
            };
        });

    }
    /**
     * Filters a data frame according to the provided filter.
     * @param {BudgetDataFrame} df - input data frame.
     * @param {Array<Array<string>>} f - filter list (as returned by DataFilter.getFilterList)
     * @returns {BudgetDataFrame} - filtered data frame.
     */
    static applyFilter(df, f) {
        // apply a filter to budgetDataFrame, return the filtered data frame.
        let out = df;
        for (const filterItem of f) {
            out = out.filter(...filterItem);
        }
        return out;
    }
}