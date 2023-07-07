/**Class implementing custom lists which have items that can be created, rearranged, selected, and deleted.
 * Bound to an existing HTML div on creation.
 */
class CustomList {
    #items = [];
    #idCounter = 0;
    #selected = -1;
    #dragStartIndex = -1;
    #selectionEnabled = false;
    #rearrangingEnabled = false;
    #removingEnabled = false;
    #itemAddedCallback = 0;
    #itemSelectedCallback = 0;
    #itemDeletedCallback = 0;
    #itemDeselectedCallback = 0;
    #listRearrangedCallback = 0;
    #extraButtons =[];
    /**
     * @typedef {Object} listItemButton
     * @property {boolean} type - true = standard button, false = icon button
     * @property {string} text - text content for standard buttons or icon path for icon buttons
     * @property {function} callback - callback function when button is clicked. recieves a reference to the CustomList and the index of the list element raising the event.
     */
    /**
     * new CustomList() returns a CustomList object.
     * @param {Node} parentDiv -
     * @param {Function} itemAddedCallback - callback function for when an item is created. recieves 1 parameter, the index of the newly created item.
     * @param {Function} [itemDeletedCallback] - callback function for when an item is deleted. recieves 1 parameter, the index of the deleted item.
     * @param {Function} [itemSelectedCallback] - callback function for when an item is selected. recieves 1 parameter, the index of the selected item.
     * @param {Function} [itemDeselectedCallback] - callback function for when an item is deselected. recieves 1 parameter, the index of the deselected item.
     * @param {Function} [listRearrangedCallback] - callback function for when the list is rearranged (drag and drop). Recieves two parameters, the start index and the  end index of the drag operation. (source and destination respectively)
     * @param {Array<listItemButton>} [extraButtons] - list of listItemButtons that can be passed to add extra buttons to the list element.
     */
    constructor(parentDiv, [itemAddedCallback, itemDeletedCallback, itemSelectedCallback, itemDeselectedCallback, listRearrangedCallback], extraButtons) {
        // type checking
        if (!(parentDiv instanceof Node)) throw TypeError("parentDiv must be a reference to a div.");
        if (!(parentDiv.tagName.toUpperCase() === "DIV")) throw TypeError("parentDiv must be a reference to a div.");
        if (!(itemAddedCallback instanceof Function || itemAddedCallback === undefined)) throw TypeError("ItemAddedCallback must be a function if it is provided.");
        if (!(itemDeletedCallback instanceof Function || itemDeletedCallback === undefined)) throw TypeError("ItemDeletedCallback must be a function if it is provided.");
        if (!(itemSelectedCallback instanceof Function || itemSelectedCallback === undefined)) throw TypeError("ItemSelectedCallback must be a function if it is provided.");
        if (!(itemDeselectedCallback instanceof Function || itemDeselectedCallback === undefined)) throw TypeError("ItemDeselectedCallback must be a function if it is provided.");
        if (!(listRearrangedCallback instanceof Function || listRearrangedCallback === undefined)) throw TypeError("listRearrangedCallback must be a function if it is provided.");
        if (!(extraButtons instanceof Array || extraButtons === undefined)) throw TypeError("extraButtons must be a list of listItemButton objects if it is defined.");

        // assign object properties
        this.parent = parentDiv;
        this.parent.innerHTML = "";
        
        this.#selected = -1;
        this.#items = [];
        this.#idCounter = 0;
        this.#dragStartIndex = -1;
        this.#extraButtons = extraButtons;

        // all optional features are disabled by default
        this.#selectionEnabled = false;
        this.#rearrangingEnabled = false;
        this.#removingEnabled = false;

        this.#itemAddedCallback = itemAddedCallback;

        // enable optional features (selection, rearranging, removing) if a callback was provided
        if (itemSelectedCallback) {
            this.#itemSelectedCallback = itemSelectedCallback;
            this.#itemDeselectedCallback = itemDeselectedCallback;
            this.#selectionEnabled = true;
        }
        if (itemDeletedCallback) {
            this.#itemDeletedCallback = itemDeletedCallback;
            this.#removingEnabled = true;
        }
        if (listRearrangedCallback) {
            this.#listRearrangedCallback = listRearrangedCallback;
            this.#rearrangingEnabled = true;
        }
    }
    /**
     * adds an item to the CustomList
     * @param {int} index - index to insert the item at, or -1 for the end.
     * @param {string} [text] - text content of list item.
     * @param {string} [icon] - path to icon image.
     * @param {string} [warning] - hover text of warning icon (also shows the warning icon if provided)
     * 
     * @returns {int} actual index that item was inserted at.
     */
    addItem(index, text, icon, warning) {
        const li = new CustomListItem(this.#idCounter, this, this.#selectionEnabled, this.#removingEnabled, this.#rearrangingEnabled);
        if (index < 0 || index > this.#items.length) {
            this.#items.push(li);
            this.parent.appendChild(li.selfDiv);
        } else {
            this.#items.splice(index, 0, li);
            this.parent.insertBefore(li.selfDiv, this.parent.childNodes[index]);
        }

        const realIndex = this.#items.findIndex((i) => i.id === this.#idCounter);
        this.#idCounter++;

        if (text) this.setElementText(realIndex, text);
        if (icon) this.setElementIcon(realIndex, icon);
        if (warning) this.setElementWarning(realIndex, true, warning);
        if (this.#extraButtons) {
            for (const button of this.#extraButtons) {
                li.addExtraButton(button);
            }
        }
        if (this.#itemAddedCallback) {
            this.#itemAddedCallback(this, realIndex);
        }
        return realIndex;
    }
    /**
     * @returns {int} the index of the currently selected element, or -1 if no element is selected.
     */
    getSelected() {
        return this.#selected;
    }
    /**
     * sets a list item's data object.
     * @param {int} index - index of list item to set
     * @param {Object} data - data object to store
     */
    setData(index, data) {
        this.#items[index].data = data;
    }
    /**
     * returns the stored data object for a specified index
     * @param {int} index - index of item
     * @returns 
     */
    getData(index) {
        return this.#items[index].data;
    }
    /**
     * @returns an array of all data objects in the list, in order.
     */
    getAllData() {
        return this.#items.map((v) => v.data);
    }
    /**
     * clears all elements from the list.
     */
    clear() {
        this.#selected = -1;
        this.#items = [];
        this.parent.innerHTML = "";
    }

    /**
     * used by CustomListItem to send event listeners back to the list parent.
     * @param {int} sourceID - id of the CustomListItem originating the event
     * @param {string|function} type - one-letter string representing the type of event. if it is a function instead, that function is used as the callback.
     */
    eventCallback(sourceID, type) {
        const sourceIndex = this.#items.findIndex((i) => i.id === sourceID);
        if (type instanceof Function) {
            type(this, sourceIndex);
        }
        switch (type) {
            case "r":
                this.removeElement(sourceIndex);
                break; // remove element
            case "s":
                this.#selectElement(sourceIndex);
                break; // select element
            case "p":
                this.#rearrangeElements(this.#dragStartIndex, sourceIndex);
                break; // drop element
            case "d":
                this.#dragStartIndex = sourceIndex;
                break; // start drag element
        }
    }
    /**
     * rearranges the element list, moving the element at position <source> to position <destination> by removing it from the list and then re inserting.
     * @param {int} source - location of element to move
     * @param {int} destination - final location of element
     */
    #rearrangeElements(source, destination) {
        console.log(`moving element ${source} to position ${destination}.`);
        if (source === destination) return;
        
        // unselect current item if selected
        let sel = this.#selected;
        if (sel !== -1) {
            this.#items[sel].selfDiv.className = "c-list-item";
            this.#selected = sel;
        }

        // delete visual item from r-report-list
        const insItem = this.#items.splice(source, 1)[0];
        this.parent.removeChild(insItem.selfDiv);

        // re-insert item
        const targetDiv = destination === this.#items.length ? null : this.#items[destination].selfDiv;
        this.parent.insertBefore(insItem.selfDiv, targetDiv);
        this.#items.splice(destination, 0, insItem);

        // re select previously selected item
        if (sel !== -1) {
            if (sel > source && sel <= destination) {
                sel--;
            }else if (sel >= destination && sel < source) {
                sel++;
            } else if (sel === source) {
                sel = destination;
            }
            this.#items[sel].selfDiv.className = "c-list-item c-selected";
            this.#selected = sel;
        }

        this.#listRearrangedCallback(this, source, destination);
    }
    /**
     * selects (or deselects, if already selected) a list element.
     * @param {int} index - index of element to select
     */
    #selectElement(index) {
        if (index === -1) return;
        if (this.#selected === index) {
            this.#items[index].selfDiv.className = "c-list-item"; //deselect self
            this.#selected = -1;
            if (this.#itemDeselectedCallback) {
                this.#itemDeselectedCallback(this, index);
            }
            return;
        }
        if (this.#selected !== -1) this.#items[this.#selected].selfDiv.className = "c-list-item"; // deselect old element
        this.#items[index].selfDiv.className = "c-list-item c-selected"; //select new element
        this.#selected = index;
        this.#itemSelectedCallback(this, index);
    }
    /**
     * removes an element from the list.
     * @param {int} index - index of element to remove
     */
    removeElement(index) {
        if (this.#selected === index) {
            this.#selected = -1;
        }
        this.parent.removeChild(this.#items[index].selfDiv);
        const deletedItem = this.#items.splice(index, 1)[0];
        this.#itemDeletedCallback(this, index, deletedItem);
    }
    /**
     * set the text content of a list element
     * @param {int} index - index of element to update
     * @param {string} s - text content of element
     */
    setElementText(index, s) {
        this.#items[index].setTextContent(s)
    }
    /**
     * gets the text content of the specified list element.
     * @param {int} index - index of the element to read from
     * @returns {string} the text content of the element
     */
    getElementText(index) {
        return this.#items[index].selfText.innerText;
    }
    /**
     * enable or disable the warning marker for an element.
     * @param {int} index - index of element to update
     * @param {boolean} enabled - true to enable warning, false to disable warning
     * @param {string} m - message to display if the user hovers over the warning sign
     */
    setElementWarning(index, enabled, m) {
        this.#items[index].setWarning(enabled, m);
    }
    /**
     * update or set the image icon for a list element. use a blank path to remove the icon.
     * @param {int} index - index of element to update
     * @param {string} path - path to icon image
     */
    setElementIcon(index, path) {
        this.#items[index].setIcon(path);
    }
    /**
     * returns the length of the custom list.
     * @returns {int} Number of items currently in the custom list.
     */
    getLength() {
        return this.#items.length;
    }
}
/**sub-class used by CustomList for each item. */
class CustomListItem {
    /**
     * 
     * @param {int} id - unique ID number for each list item of a parent.
     * @param {CustomList} parentList - parent list that the element belongs to.
     * @param {boolean} selectable - whether or not the list item can be selected.
     * @param {boolean} removable - whether or not the list item can be removed.
     * @param {boolean} rearrangable - whether or not the list item can be rearranged.
     */
    constructor(id, parentList, selectable = false, removable = false, rearrangable = false) {
        this.id = id;
        this.selfDiv = document.createElement("div");
        this.selfDiv.className = "c-list-item";
        this.parentList = parentList;
        this.data = undefined;
        if (selectable) this.selfDiv.onclick = () => parentList.eventCallback(this.id, "s");
        if (rearrangable) {
            this.selfDiv.ondragover = (e) => {e.preventDefault()};
            this.selfDiv.ondragstart = (e) => {parentList.eventCallback(this.id, "d")};
            this.selfDiv.ondrop = (e) =>  {parentList.eventCallback(this.id, "p")};
            this.selfDiv.draggable = true;
        }

        this.selfIcon = document.createElement("img");
        this.selfIcon.className = 'd-icon';

        this.selfText = document.createElement("p");
        this.selfDiv.appendChild(this.selfText);

        if (!selectable) {
            this.selfDiv.style.cursor = "default";
        }

        if (removable) {
            this.selfRemoveButton = document.createElement("button");
            this.selfRemoveButton.style = "border:none;cursor:pointer;background-color:inherit";
            this.selfRemoveButton.innerHTML = '<img src="src/assets/cross-red.svg" class="d-icon"></img>';
            this.selfDiv.appendChild(this.selfRemoveButton);
            this.selfRemoveButton.onclick = (e) => {e.stopPropagation();parentList.eventCallback(this.id, "r")};
        }

        this.warning = false;
        this.warningText = "";
    }
    /**
     * sets the text content of an element
     * @param {string} s - text content of element
     */
    setTextContent(s) {
        let contents = "";
        if (this.warning) {
            contents += `<img src="src/assets/triangle-warning.svg" class="d-icon" title="${this.warningText}"></img>`;
        }
        contents += s;
        this.selfText.innerHTML = contents;
    }
    /**
     * set the warning symbol on the element.
     * @param {boolean} enabled - whether or not to show the warning symbol
     * @param {string} m - message to show on hover
     */
    setWarning(enabled, m) {
        this.warning = enabled;
        this.warningText = m;
        this.setTextContent(this.selfText.innerText);
    }
    /**
     * sets the item's icon image. use empty string for no image.
     * @param {string} path - path to icon image
     */
    setIcon(path) {
        if (path === "") {
            try {
                this.selfDiv.removeChild(this.selfIcon);
            } catch {}
        } else {
            this.selfDiv.appendChild(this.selfIcon);
        }
        this.selfIcon.src = path;
    }
    /**
     * 
     * @param {listItemButton} b - button to add to the current element.
     */
    addExtraButton(b) {
        const button = document.createElement("button");
        if (b.type) {
            // normal button
            button.className = "c-button";
            button.style.backgroundColor = "var(--color-background)";
            button.innerHTML = b.text;
        } else {
            // icon button
            button.style ="border:none;cursor:pointer;background-color:inherit";
            button.innerHTML = `<img class="d-icon" src="${b.text}"></img>`;
        }
        button.onclick = (e) => {e.stopPropagation(); this.parentList.eventCallback(this.id, b.callback)};
        const target = this.selfRemoveButton === undefined ? null : this.selfRemoveButton;
        this.selfDiv.insertBefore(button, target);
    }
}