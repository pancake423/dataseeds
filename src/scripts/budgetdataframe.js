// am I reinventing the wheel? don't care
// an implementation of pandas-like dataframes in javascript for my convenience, since this program was originally concieved in python before moving over to the web.

/**Class representing a Pandas-style data frame, with features being added as I need them. Relies on papaparse being imported as Papa (for csv reading functionality only)*/
class BudgetDataFrame {
    #columns = [];
    #data = [];
    /**
    * builds a new BudgetDataFrame, either empty or with data.

    * if the parameters are undefined, the new data frame will be blank.
    * if the parameters are defined, but incorrectly, an error will be thrown.
    * @param {Array<string>} [columns] - array of column names
    * @param {Array<Array<any>>} [data] - 2d array of data
    */
    constructor(columns, data) {
        this.numColumns = 0;
        this.numRows = 0;
        if (BudgetDataFrame.#checkValidData(columns, data)) {
            this.#columns = columns;
            this.#data = data;
            this.numColumns = this.#data[0].length;
            this.numRows = this.#data.length;
        }
    }
    /**
    * check if the column headers and data passed to the function will make a valid data frame.
    * @param {Array<string>} columns - array of column names
    * @param {Array<Array<any>>} data -2d array of data. must be rectangular and the same width as columns.
    */
    static #checkValidData(columns, data) {
        if (columns === undefined && data === undefined) return false;
        if (!(columns instanceof Array)) throw TypeError("columns passed to BudgetDataFrame must be an array of strings");;
        for (const item of columns) {
            if (!(typeof item === "string")) throw TypeError("columns passed to BudgetDataFrame must be an array of strings.");
        }
        if (!(data instanceof Array)) throw TypeError("data passed to BudgetDataFrame must be a 2d array.");
        const nCol = columns.length;
        for (const row of data) {
            if (!(row instanceof Array)) throw TypeError("data passed to BudgetDataFrame must be a 2d array.");
            if (row.length !== nCol) throw Error(`the width of the 2d data array passed to BudgetDataFrame must be equal to the number of columns.`);
        }
        return true;
    }
    /**
    * helper function for readCSVFile. used to create the callback function that is sent to papaparse.
    * @param {BudgetDataFrame} obj - the data frame that we are creating a callback function for.
    * @param {function} callback - a function to be called after the data frame finishes loading
    * @returns {function} - a callback function for CSV file load.
    */
    static #getParseCallbackFunction(obj, callback) {
        // results is a 2d array of [row][column]
        return function(results, file) {
            obj.#columns = results.data.splice(0, 1)[0]; // mutates array by deleting first row, return value is the deleted row (column headers)
            obj.#data = results.data; // array now only contains data, not headers
            obj.numColumns = obj.#data[0].length;
            obj.numRows = obj.#data.length;
            obj.#cleanData();

            if (typeof callback === 'function') callback();
        }
    }
    /**
     * PapaParse will happily return arrays with incomplete rows, but that causes big problems for BudgetDataFrame. This function is used to clean up data when it loads before it can cause any harm or unexpected errors.
     */
    #cleanData() {
        for (let i = 0; i < this.#data.length; i++) {
            if (this.#data[i].length !== this.numColumns) {
                this.#data.splice(i, 1);
                i--;
                this.numRows--;
            }
        }
    }
    /**
     * reads the contents of a CSV file into the current data frame asynchronously.
     * @param {File} csvFileObject - File (https://developer.mozilla.org/en-US/docs/Web/API/File) containing CSV data
     * @param {function} callback - function to be called once CSV file is loaded
     */
    readCSVFile(csvFileObject, callback) {
        // convert a CSV file into a data frame format, load into current data frame.
        Papa.parse(csvFileObject, {complete: BudgetDataFrame.#getParseCallbackFunction(this, callback)});
    }
    /**
     * returns a deep copy of the current data frame. If for some ungodly reason your actual data elements are not numbers or strings, they will be copied by reference.
     * @returns {BudgetDataFrame} - new data frame containing identical data
     */
    copy() {
        return new BudgetDataFrame(this.getColumnList(), this.#data.map((r) => r.map((i) => i)));
    }
    /**
    * Appends a data frame to the current data frame.

    *    appendType = flag: raises an error if there are mismatched column headers.
    *    appendType = merge: include all columns from both data frames, insert blank cells where a df doesn't have that column type.
    *    appendType = drop: drop all columns that don't exist in both data frames. (WARNING: can result in data loss.)
    * @param {BudgetDataFrame} df - Data frame to append to the parent
    * @param {string} [appendType="flag"] - flag, merge, or drop. any other value for this string will cause an error.
    */
    append(df, appendType = "flag") {
        const appendTypeFinal = appendType === undefined ? 'flag': appendType;

        const selfColumnList = this.getColumnList();
        const otherColumnList = df.getColumnList();

        // find all extra columns in df2
        let extraColumns =[];
        for (const colName of otherColumnList) {
            if (!selfColumnList.includes(colName)) extraColumns.push(colName);
        }
        // find all missing columns in df2
        let missingColumns =[];
        for (const colName of selfColumnList) {
            if (!otherColumnList.includes(colName)) missingColumns.push(colName);
        }
        if (appendTypeFinal === 'flag' && (missingColumns.length != 0 || extraColumns.length != 0)) {
            throw Error("Unable to append data frames. mismatched column names.")
        }
        else if (appendTypeFinal === 'merge') {
            // add all extra columns to df1
            for (const colName of extraColumns) {
                this.addColumn(colName, '');
            }
        }
        else if (appendTypeFinal === 'drop') {
            // drop all missing columns from df1
            for (const colName of missingColumns) {
                this.dropColumn(colName);
            }
        } else if (appendTypeFinal !== 'flag') {
            throw Error(`Unrecognized append type '${appendTypeFinal}'`)
        }
        //map of self column numbers to append df column numbers
        let colMap = []
        for (const col of this.getColumnList()) {
            colMap.push(df.getColumnIndex(col));
        }
        // iterate over every row of df2, reformat it to match df1, and then add it to the end of df1
        for (let i = 0; i < df.numRows; i++) {
            const row = df.getRow(i);
            let outRow = [];
            for (const index of colMap) {
                outRow.push(index === -1 ? '' : row[index]);
            }
            this.addRow(outRow);
        }
    }
    join(df, joinType="flag") {
        if (joinType === "fill") {
            while (df.numRows > this.numRows) {
                this.addRow("");
            }
        }
        console.log(df);
        for (const col of df.getColumnList()) {
            let columnData = df.getColumn(col);
            if (joinType === "flag") {
                if (columnData.length != this.numRows) throw Error("Unable to join data frames. Mismatched number of rows.");
            }
            if (joinType === "fill") {
                while (columnData.length < this.numRows) {
                    columnData.push("");
                }
            }
            this.addColumn(col, columnData);
        }
    }
    /**
     * 
     * @returns {boolean} True if the data frame is not empty, false if the data frame is empty
     */
    isLoaded() {
        return !('numColumns' in self);
    }
    /**
    * get the data value located at a given row and column index.
    * @param {int} col - column index
    * @param {int} row - row index
    * @returns {any} value of the cell at the specified location
    */
    iloc(col, row) {
        return this.#data[row][col];
    }
    /**
    * get the data value located at a given row index and column name.
    * @param {string} columnName - column name
    * @param {int} row - row index
    * @returns {any} value of the cell at the specified location
    */
    loc(columnName, row) {
        const index = this.getColumnIndex(columnName);
        if (index === -1) throw Error("Invalid column name.");
        return this.iloc(index, row);
    }
    /**
     * get the index of a column by name.
     * @param {string} columnName - name of column to locate
     * @returns {int} index of of a given column name if it exists, or -1 if it does not.
     */
    getColumnIndex(columnName) {
        // get the index number of a column name string, or return -1 if invalid.
        for (let i = 0; i < this.#columns.length; i++) {
            if (this.#columns[i] === columnName) {
                return i;
            }
        }
        return -1
    }
    /**
     * returns the data contained in the specified row index.
     * @param {int} row - row index
     * @returns {Array<any>} row data
     */
    getRow(row) {
        return this.#data[row];
    }
    /**
     * drops the specified row from the data frame.
     * @param {int} row 
     * @returns 0
     */
    dropRow(row) {
        this.#data.splice(row, 1);
        this.numRows--;
        return 0;
    }
    /**
     * Adds a row to the data frame. If the length of the data in rowData is not equal to
     * the number of columns in the data frame, the operation will fail.
     * @param {Array<any>|string|number} rowData - Array of data for the row, or a single string/numeric value to fill for every cell in the row.
     * @returns 0 if successful, otherwise -1
     */
    addRow(rowData) {
        if (rowData instanceof Array) {
            if (rowData.length == this.numColumns) {
                this.#data.push(rowData.map((d) => String(d)));
                this.numRows++;
                return 0
            }
            return -1;
        }
        //fill entire row with value of rowData (as a string) if it isn't a list
        //undefined -> ''
        let row = [];
        const fillString = String(rowData === undefined ? '' : rowData);
        for (let i = 0; i < this.numColumns; i++) row.push(fillString);
        this.#data.push(row);
        this.numRows++;
        return 0;
    }
    /**
     * returns the data contained in the specified column (either by name or index)
     * @param {string|int} columnIndexOrName - name(string) or index(int) of column to access.
     * @returns {Array<any>} column data
     */
    getColumn(columnIndexOrName) {
        let columnIndex = (typeof columnIndexOrName === 'number') ? columnIndexOrName : this.getColumnIndex(columnIndexOrName);
        return this.#data.map((r) => r[columnIndex]);
    }
    /**
     * removes the specified column from the data frame.
     * @param {string|int} columnIndexOrName - name(string) or index(int) of column to remove.
     */
    dropColumn(columnIndexOrName) {
        let columnIndex = (typeof columnIndexOrName === 'number') ? columnIndexOrName : this.getColumnIndex(columnIndexOrName);
        this.#columns.splice(columnIndex, 1);
        this.#data.map((r) => r.splice(columnIndex, 1)); //should modify array in-place
        this.numColumns--;
    }
    /**
     * adds a column to the data frame.
     * @param {string} columnName - Name of the column to add. must be unique, or the operation will fail.
     * @param {Array|string|number} columnData - Array of values to add to the data frame. length must be equal to the number of rows or the operation will fail. If columnData is not an array, its value will be filled in for every cell of that column.
     * @returns {int} 0 if the operation was successful, -1 if the operation failed.
     */
    addColumn(columnName, columnData) {
        if (columnData instanceof Array) {
            if (columnData.length !== this.numRows) {
                return -1;
            }
            this.#columns.push(columnName);
            this.numColumns++;
            this.#data.map((e, i) => e.push(columnData[i])) //add elements to data array in place
            return 0;
        }
        //add columnData to the data frame repeatedly if it is a value not an array.
        this.#columns.push(columnName);
        this.numColumns++;
        this.#data.map((e) => e.push(columnData))
        return 0;
    }
    /**
     * returns an object containing the number of occurances of each value in the specified column.
     * @param {string|int} columnIndexOrName 
     * @returns {Object} {<value1> : count, <value2>: count, ...}
     */
    valueCount(columnIndexOrName) {
        const col = this.getColumn(columnIndexOrName);
        let uniqueValues = {};
        for (const item of col) {
            if (item in uniqueValues) {
                uniqueValues[item]++;
                continue;
            }
            uniqueValues[item] = 1;
        }
        return uniqueValues;
    }
    /**
     * returns a safe copy of the column name list.
     * @returns {Array<string>} a list of all column names in the data frame
     */
    getColumnList() {
        return [...this.#columns];
    }
    /**
     * returns a copy of the raw data in the data frame. no column headers included. same as copy(), if for some mysterious reason your individual
     * data values aren't numbers or strings, they will only be copied by reference.
     * @returns {Array<Array<any>>} a copy of the raw data contained in the data frame.
     */
    getData() {
        return this.#data.map((r) => r.map((i) => i))
    }
    /**
     * returns the data frame's instance properties as a plain JS object along with 'dtype': BudgetDataFrame
     * @returns {Object}
     */
    exportAsObject() {
        return {
            "dtype": "BudgetDataFrame",
            "columns": this.#columns,
            "data": this.#data,
            "numColumns": this.numColumns,
            "numRows": this.numRows
        }
    }
    /**
     * loads a data frame object export into the current data frame.
     * @param {Object} obj - object returned by BudgetDataFrameInstance.exportAsObject()
     */
    importFromObject(obj) {
        // type checking
        if (!(obj instanceof Object)) throw TypeError(`Cannot import from '${obj}': not of type Object.`);
        for (const property of ["dtype", "columns", "data", "numColumns", "numRows"]) {
            if (!(property in obj)) throw Error(`Object '${obj}' missing property '${property}'`);
        }
        //set properties (same as constructor)
        if (BudgetDataFrame.#checkValidData(obj["columns"], obj["data"])) {
            this.#columns = obj["columns"];
            this.#data = obj["data"];
            this.numColumns = this.#data[0].length;
            this.numRows = this.#data.length;
        }
    }
    /**
     * sets the value of a single cell of the data frame.
     * @param {} columnIndexOrName 
     * @param {*} row 
     * @param {*} value 
     */
    set(columnIndexOrName, row, value) {
        const columnIndex = (typeof columnIndexOrName === 'number') ? columnIndexOrName : this.getColumnIndex(columnIndexOrName);
        this.#data[columnIndex][row] = value;
    }
    /**
     * filters a data frame according to the following parameters, and returns the data frame containing all entries
     * from the parent that pass the filter.
     * @param {string|int} columnIndexOrName - name or index number of the column to get comparison values from.
     * @param {string} comparison - type of comparison. '>', '<', '=', '>=', '<=', '!=', 'unique'. unique only keeps the first row to have a certain value in the column.
     * @param {string|number} value - value to compare to. strings only support = and != comparison types.
     */
    filter(columnIndexOrName, comparison, value) {
        const out = this.copy();
        const filterColumn = this.getColumn(columnIndexOrName);
        switch (comparison) {
            case '=':
                for (let i = 0; i < filterColumn.length; i++) {
                    if (String(filterColumn[i]) !== String(value)) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    }
                }
                break;
            case '!=':
                for (let i = 0; i < filterColumn.length; i++) {
                    if (String(filterColumn[i]) === String(value)) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    }
                }
                break;
            case ">":
                for (let i = 0; i < filterColumn.length; i++) {
                    if (Number(filterColumn[i]) <= Number(value)) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    }
                }
                break;
            case "<":
                for (let i = 0; i < filterColumn.length; i++) {
                    if (Number(filterColumn[i]) >= Number(value)) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    }
                }
                break;
            case ">=":
                for (let i = 0; i < filterColumn.length; i++) {
                    if (Number(filterColumn[i]) < Number(value)) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    }
                }
                break;
            case "<=":
                for (let i = 0; i < filterColumn.length; i++) {
                    if (Number(filterColumn[i]) > Number(value)) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    }
                }
                break;
            case "unique":
                let found = [];
                for (let i = 0; i < filterColumn.length; i++) {
                    if (found.includes(filterColumn[i])) {
                        out.dropRow(i);
                        filterColumn.splice(i, 1);
                        i--;
                    } else {
                        found.push(filterColumn[i])
                    }
                }
                break;
            default:
                throw Error(`Unknown comparison type '${comparison}'`);
        }
        return out;
    }
}