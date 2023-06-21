const ENCODING_itemsep = "|";
const ENCODING_liststart="[";
const ENCODING_listend ="]";
function generateReportString(DF, CODEBOOK, REPORT) {
    // takes in a dataframe containing raw data, a codebook describing how to encode that data, and a report variable describing how to display the data.
    // returns a URL string that contains all of the report data.
    let out = ENCODING_liststart;

    for (const item of REPORT) {
        if (item.length === 2) {
            // item type header
            out += encodeList(item, ENCODING_itemsep, ENCODING_liststart, ENCODING_listend)  + ENCODING_itemsep;
            continue;
        }
        // item type graph
        const valueCount = DF.valueCount(item[0]);
        const x = Object.keys(valueCount);
        const y = Object.values(valueCount);
        // get codebook index
        const codebookIndex = CODEBOOK[0].findIndex((i) => i === item[0]);
        //apply codeboook
        switch (CODEBOOK[1][codebookIndex]) {
            case "none":
                break;
            case "range":
                for (let i = 0; i < x.length; i++) {
                    if (Number(x[i]) < Number(CODEBOOK[2][codebookIndex]["min"]) || Number(x[i]) > Number(CODEBOOK[2][codebookIndex]["max"])) {
                        x.splice(i, 1);
                        y.splice(i, 1);
                        i--;
                    }
                }
                break;
            case "convert":
                console.log(CODEBOOK[2][codebookIndex]);
                for (let i = 0; i < x.length; i++) {
                    if (x[i] in CODEBOOK[2][codebookIndex]) {
                        x[i] = CODEBOOK[2][codebookIndex][x[i]];
                    } else {
                        x.splice(i, 1);
                        y.splice(i, 1);
                        i--;
                    }
                }
                break;
        }
        // handle blank values **TODO: make this dynamic**
        const BLANK_REPLACEMENT = "<blank>";
        for (let i = 0; i < x.length; i++) {
            if (x[i] === "") {
                x[i] = BLANK_REPLACEMENT;
            }
        }

        out += encodeList([
            x,// x array
            y,// y array
            item[1], // graph type
            item[2],// title
            item[3],// subtitle
            item[4],// xaxis label
            item[5],// yaxis label
            item[6],// footer
        ], ENCODING_itemsep, ENCODING_liststart, ENCODING_listend) + ENCODING_itemsep;
    }
    if (REPORT.length) {
        out = out.substring(0, out.length - 1);
    }
    return out + ENCODING_listend;
}

function encodeList(l, itemsep, liststart, listend) {
    let out = liststart;
    for (const item of l) {
        if (item instanceof Array) {
            out += encodeList(item, itemsep, liststart, listend);
        } else {
            for (const char of String(item)) {
                if (char !== itemsep && char !== liststart && char !== listend) {
                    out += char;
                }
            }
        }
        out += itemsep;
    }
    if (l.length) {
        out = out.substring(0, out.length - 1);
    }
    out += listend;
    return out;
}
function openReport(DF, CODEBOOK, REPORT) {
    const reportWindow = window.open(
        `src/report.html`,//URL
        "_blank"
    );
    window.onmessage = (e) => {
        if (e.data === "r") {
            reportWindow.postMessage(generateReportString(DF, CODEBOOK, REPORT), "*");
        }
    };
}
function decodeDataURL(s) {
    return parseDataString(s, ENCODING_itemsep, ENCODING_liststart, ENCODING_listend);
}
function parseDataString(s, itemsep, liststart, listend) {
    if (checkHasSublist(s, liststart, listend)) {
        let depth = 0;
        let out = [];
        let value = "";
        for (let i = 1; i < s.length - 1; i++) {
            if (s[i] === liststart) {depth++; value += s[i]; continue;}
            if (s[i] === listend) {
                depth--;
                value += s[i];
                if (depth === 0) {
                    out.push(value);
                    value = "";
                    i++; //accounts for itemsep between lists
                }
                continue;}
            if (s[i] === itemsep && depth === 0) {
                out.push(value);
                value = "";
                continue;
            }
            value += s[i];
        }
        return out.map((str) => parseDataString(str, itemsep, liststart, listend));
    } else if (checkIsList(s, liststart)) {
        return s.substring(1, s.length - 1).split(itemsep);
    } else {
        return s;
    }
}
function checkHasSublist(s, liststart, listend) {
    let depth = 0;
    for (const char of s) {
        if (char === liststart) depth++;
        if (char === listend) depth--;
        if (depth > 1) return true
    }
    return false;
}
function checkIsList(s, liststart) {
    return s[0] === liststart;
}