/**
 * makes a ReportSettings object based on the values of the inputs in the 'Generate Report' column.
 * @returns {ReportSettings}
 */
function getReportSettings() {
    return {
        missing: document.getElementById("r-report-missing-data").checked ? true : false,
        missingValue: document.getElementById("r-display-missing").value,
        range: document.getElementById("r-report-unmatched-data").checked ? true : false,
        rangeValue: document.getElementById("r-display-unmatched").value,
        footer: document.getElementById("r-report-footer").checked ? true : false,
    }
}

/**
 * @typedef {Object} ReportSettings
 * @property {boolean} missing - whether or not to report missing data
 * @property {string} missingValue - value to list for missing data
 * @property {boolean} range - whether or not to report out-of-range or unmatched data
 * @property {string} rangeValue - value to list for out-of-range data
 * @property {boolean} footer - if true, report missing/out of range data in the graph footer rather than as a data point.
 */
/**
 * takes in a dataframe containing raw data, a codebook describing how to encode that data, and a report variable describing how to display the data.
 * processes all the data and returns an object describing how to display the report.
 * @param {BudgetDataFrame} DF - Dataframe with all data to be included in the report
 * @param {Array<Array>} CODEBOOK - Codebook describing how to decode each column of the data frame
 * @param {Array<Array>} REPORT - Report structure: how to lay out and display each variable.
 * @param {ReportSettings} settings
 * @returns {Array<Array>} a list of report items that can  be passed to report.html
 */
function generateReportObject(DF, CODEBOOK, REPORT, settings) {
    let out = [];

    for (const item of REPORT) {
        if (item.length === 2) {
            // item type header
            out.push(item);
            continue;
        }
        // item type graph
        const valueCount = DF.valueCount(item[0]);
        let x = Object.keys(valueCount);
        let y = Object.values(valueCount);
        // get codebook index
        const codebookIndex = CODEBOOK[0].findIndex((i) => i === item[0]);
        //apply codeboook
        switch (CODEBOOK[1][codebookIndex]) {
            case "none":
                break;
            case "range":
                for (let i = 0; i < x.length; i++) {
                    if (Number.isNaN(Number(x[i])) || Number(x[i]) < Number(CODEBOOK[2][codebookIndex]["min"]) || Number(x[i]) > Number(CODEBOOK[2][codebookIndex]["max"])) {
                        if (settings.range) {
                            if (x.includes(settings.rangeValue)) {
                                y[x.findIndex((v) => v === settings.rangeValue)] += y[i];
                                x.splice(i, 1);
                                y.splice(i, 1);
                                i--;
                            } else {
                                x[i] = settings.rangeValue;
                            }
                        } else {
                            x.splice(i, 1);
                            y.splice(i, 1);
                            i--;
                        }
                    }
                }
                break;
            case "convert":
                for (let i = 0; i < x.length; i++) {
                    if (x[i] in CODEBOOK[2][codebookIndex]) {
                        x[i] = CODEBOOK[2][codebookIndex][x[i]];
                    } else {
                        if (settings.range) {
                            if (x.includes(settings.rangeValue)) {
                                y[x.findIndex((v) => v === settings.rangeValue)] += y[i];
                                x.splice(i, 1);
                                y.splice(i, 1);
                                i--;
                            } else {
                                x[i] = settings.rangeValue;
                            }
                        } else {
                            x.splice(i, 1);
                            y.splice(i, 1);
                            i--;
                        }
                    }
                }
                break;
        }
        for (let i = 0; i < x.length; i++) {
            if (x[i] === "") {
                if (settings.missing) {
                    x[i] = settings.missingValue;
                } else {
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                }
            }
        }
        // sorting of x and y should happen here
        let d = x.map((v, i) => {return {x: x[i], y: y[i]}});
        const sortByX = true;
        d.sort((a, b) => {
            const va = sortByX ? a.x : a.y;
            const vb = sortByX ? b.x : b.y;
            const na = !Number.isNaN(Number(va));
            const nb = !Number.isNaN(Number(vb));
            if (na && !nb) return -1;
            if (!na && nb) return 1;
            if (na && nb) {
                return Number(va) - Number(vb);
            }
            if (!na && !nb) {
                if (va < vb) return -1;
                if (va < vb) return 1;
            }
            return 0;
        });
        [x, y] = [d.map((v) => v.x), d.map((v) => v.y)]

        if (settings.footer) {
            // remove <blank> and <out of range> from data set
            // new footer text
            let newFooterText = item[6];
            for (let i = 0; i < x.length; i++) {
                if (x[i] === settings.missingValue) {
                    if (!(newFooterText === "" || newFooterText === undefined)) {
                        newFooterText += "<br>";
                    }
                    newFooterText += `${settings.missingValue}: ${y[i]} entries.`;
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                } else if (x[i] === settings.rangeValue) {
                    if (!(newFooterText === "" || newFooterText === undefined)) {
                        newFooterText += "<br>";
                    }
                    newFooterText += `${settings.rangeValue}: ${y[i]} entries.`;
                    x.splice(i, 1);
                    y.splice(i, 1);
                    i--;
                }
            }


            out.push([
                x,// x array
                y,// y array
                item[1], // graph type
                item[2],// title
                item[3],// subtitle
                item[4],// xaxis label
                item[5],// yaxis label
                newFooterText
            ]);
        } else {
            out.push([
                x,// x array
                y,// y array
                item[1], // graph type
                item[2],// title
                item[3],// subtitle
                item[4],// xaxis label
                item[5],// yaxis label
                item[6],// footer
            ]);
        }
    }
    return out
}