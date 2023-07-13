class GraphRenderer {
    #data;
    #parentDiv;
    /**
     * binds a GraphRenderer to a div where it should display content.
     * @param {Node} parentDiv - div to bind graph to
     */
    constructor(parentDiv) {
        this.#data = {};
        this.#parentDiv = parentDiv;

    }
    /**
     * renders the specified graph in the parent div.
     * @param {PopupGraphData} data - object describing how to get and display graph data.
     * @param {BudgetDataFrame} DF - data frame containing source data.
     */
    draw(data, DF) {
        this.#data = data;
    }
    /**
     * opens the currently rendered graph in a new tab.
     */
    popout() {

    }
}