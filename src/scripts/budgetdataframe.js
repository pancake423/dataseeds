// am I reinventing the wheel? don't care
// an implementation of pandas-like dataframes in javascript for my convenience, since this program was originally concieved in python before moving over to the web.

class BudgetDataFrame {
    #columns = [];
    #data = [];
    constructor(columns, data) {
        this.numColumns = 0;
        this.numRows = 0;
        // UNSAFE: constructor does zero value/length checking of arguments for validity
        if (columns instanceof Array && data instanceof Array && data.length > 0 && data[0] instanceof Array) {
            this.#columns = columns;
            this.#data = data;
            this.numColumns = this.#data[0].length;
            this.numRows = this.#data.length;
        }
    }
    static #getParseCallbackFunction(obj, callback) {
        // results is a 2d array of [row][column]
        return function(results, file) {
            obj.#columns = results.data.splice(0, 1)[0]; // mutates array by deleting first row, return value is the deleted row (column headers)
            obj.#data = results.data; // array now only contains data, not headers
            obj.numColumns = obj.#data[0].length;
            obj.numRows = obj.#data.length;

            if (typeof callback === 'function') callback();
        }
    }
    readCSVFile(csvFileObject, callback) {
        // convert a CSV file into a data frame format, load into current data frame.
        Papa.parse(csvFileObject, {complete: BudgetDataFrame.#getParseCallbackFunction(this, callback)});
    }
    copy() {
        // returns a proper deep copy of the df.
        return new BudgetDataFrame(this.getColumnList(), this.#data.map((r) => r.map((i) => i)))
    }
    append(df, appendType) {
        // append a data frame to the parent df.
        // append type flag: raises an error if there are mismatched column headers.
        // append type merge: include all columns from both data frames, insert blank cells where a df doesn't have that column type.
        // append type drop: drop all columns that don't exist in both data frames. (WARNING: can result in data loss.)
        const appendTypeFinal = appendType === undefined ? 'flag': appendType;

        const selfColumnList = this.getColumnList();
        const otherColumnList = df.getColumnList();

        // find all extra columns in df2
        let extraColumns =[];
        for (const olName of otherColumnList) {
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
        for (const col of selfColumnList) {
            colMap.push(df.getColumnIndex(col));
        }
        // iterate over every row of df2, reformat it to match df1, and then add it to the end of df1
        for (let i = 0; i < df.numRows; i++) {
            const row = df.getRow(i);
            let outRow = [];
            for (const index of colMap) {
                outRow.push(row[index] === -1 ? '' : row[index]);
            }
            this.addRow(outRow);
        }

        
    }
    isLoaded() {
        // I am a hater of asynchronous functions at times (due to the fact that I'm still learning them) so this is my workaround to check if a dataframe has loaded.
        return !('numColumns' in self);
    }
    iloc(col, row) {
        return this.#data[row][col];
    }
    loc(columnName, row) {
        const index = this.getColumnIndex(columnName);
        if (index === -1) return -1;
        return this.iloc(index, row);
    }
    getColumnIndex(columnName) {
        // get the index number of a column name string, or return -1 if invalid.
        for (let i = 0; i < this.#columns.length; i++) {
            if (this.#columns[i] === columnName) {
                return i;
            }
        }
        return -1
    }
    getRow(row) {
        return this.#data[row];
    }
    dropRow(row) {
        this.#data.splice(r, 1);
        this.numRows--;
        return 0;
    }
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
    getColumn(columnIndexOrName) {
        let columnIndex = (typeof columnIndexOrName === 'number') ? columnIndexOrName : this.getColumnIndex(columnIndexOrName);
        return this.#data.map((r) => r[columnIndex]);
    }
    dropColumn(columnIndexOrName) {
        let columnIndex = (typeof columnIndexOrName === 'number') ? columnIndexOrName : this.getColumnIndex(columnIndexOrName);
        this.#columns.splice(columnIndex, 1);
        this.#data.map((r) => r.splice(columnIndex, 1)); //should modify array in-place
        this.numColumns--;
    }
    addColumn(columnName, columnData) {
        if (columnData.length !== this.numRows) {
            return -1;
        }
        this.#columns.push(columnName);
        this.numColumns++;
        this.#data.map((e, i) => e.push(columnData[i])) //add elements to data array in place
        return 0;
    }
    valueCount(columnIndexOrName) {
        const col = this.getColumn(columnIndexOrName);
        let uniqueValues = {};
        for (const item of col) {
            if (item in uniqueValues) {
                uniqueValues[item]++;
                continue;
            }
            uniqueValues[item] = 0;
        }
        return uniqueValues;
    }
    getColumnList() {
        return [...this.#columns];
    }
}