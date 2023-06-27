/*
Relies on Plotly.js (imported as Plotly)

see Plotly.newPlot() documentation here for configuration options:
https://plotly.com/javascript/plotlyjs-function-reference/
*/

/** @const {int} BAR_WIDTH_THRESHOLD - number of bars required to make a bar plot wide */
const BAR_WIDTH_THRESHOLD = 4;

/** @const {int} SCATTER_LINE_WIDTH_THRESHOLD - number of elements required to make a scatter or line plot wide */
const SCATTER_LINE_WIDTH_THRESHOLD = 15;

/**width of wide graphs (in pixels) */
const GRAPH_WIDTH_WIDE = 600;
/**width of normal graphs (in pixels) */
const GRAPH_WIDTH_NORMAL = 300;
/**height of all graphs (in pixels) */
let GRAPH_HEIGHT = 250;
/**page width (in pixels) */
const PAGE_WIDTH = 1300

/** @const {Array<string>} - Array of color strings (rgb, rgba, hex) representing the color scheme used in graphs. */
const COLOR_LIST = ['rgb(102, 197, 204)', 'rgb(246, 207, 113)', 'rgb(248, 156, 116)', 'rgb(220, 176, 242)', 'rgb(135, 197, 95)', 'rgb(158, 185, 243)', 'rgb(254, 136, 177)', 'rgb(201, 219, 116)', 'rgb(139, 224, 164)', 'rgb(180, 151, 231)', 'rgb(179, 179, 179)'];

// global variables

/** @type {int} controls access position of color list in order to make graphs appear with unique color schemes compared to their neighbors */
let COLOR_INDEX = 0;

/** @type {Node} stores a reference to the css :root selector */
let ROOT;

// event listeners

window.onload = () => {
    window.opener.postMessage('r', "*"); // ask the parent window to send report data once the page loads
    ROOT = document.querySelector(":root");
    setCSSVar("--page-width", PAGE_WIDTH);
    setCSSVar("--graph-normal-width", GRAPH_WIDTH_NORMAL);
    setCSSVar("--graph-wide-width", GRAPH_WIDTH_WIDE);
}

window.onmessage = (e) => {
    makeReport(e.data); // process report data once it is recieved
};

// functions

/**
 * sets the value of a CSS variable.
 * @param {string} propertyName - css property name (prefixed with --)
 * @param {string} propertyValue - css property value
 */
function setCSSVar(propertyName, propertyValue) {
    ROOT.style.setProperty(propertyName, propertyValue);
}

/**
 * takes in an array of report data, parses it, and adds the resulting graphs and headers to the page.
 * @param {Array<Array>} report - array of arrays, each sub-array representing either a graph or a header.
 */
function makeReport(report) {
    console.log(report);
    setPageTitle(report);
    let graphAttachPoint = document.getElementById("page-body");
    
    const addReportItem = (i) => {
        if (i >= report.length) return;
        if (report[i].length === 2) {
            //header section
            addHeader(graphAttachPoint, report[i][0], report[i][1]);
        } else if (report[i].length >= 4 && report[i].length <= 8) {
            // graph
            addGraph(graphAttachPoint, ...report[i]);
        } else {
            console.log(report[i].length)
            console.warn(`Bad report item: ${report[i]}`);
        }
        window.setTimeout(addReportItem(i + 1), 0);
    }
    window.setTimeout(() => addReportItem(0), 0);
    // there was an unsuccessful attempt at making this use setTimeout so that graphs could load one at a time rather than all at once.
}
/**
 * element to append the header to
 * @param {Node} parent - element to append the header to
 * @param {string} title - title of header section
 * @param {string} subtitle - subtitle/body text of header section
 */
function addHeader(parent, title, subtitle) {
    const headerDiv = document.createElement('div');
    headerDiv.className = "header-div";
    headerDiv.innerHTML = `<h1>${title}</h1><p>${subtitle}</p><div class="break-line"></div>`;
    parent.appendChild(headerDiv);
}

/**
 * Adds a graph section to the given parent element.
 * @param {Node} parent - element to append the graph to.
 * @param {Array<string|number>} x - array of x values to graph
 * @param {Array<number} y  - array of y values to graph
 * @param {string} type - pie, bar, scatter, or line. any other values will result in an error
 * @param {string} title - title of graph
 * @param {string} subtitle - subtitle of graph
 * @param {string} xlabel - graph x axis label text
 * @param {string} ylabel - graph y axis label text
 * @param {string} footer - graph footer text 
 * 
 * @returns {null}
 */
function addGraph(parent, x, y, type, title, subtitle, xlabel, ylabel, footer) {
    if (x.length === 0 || y.length === 0) {console.warn(`graph '${title}' has no data`); return}
    const graphContainer = document.createElement("div");
    
    const graphBody = document.createElement("div");

    const titleElement = document.createElement("h2");
    titleElement.innerText = title ===  undefined ? "":title;

    const subtitleElement = document.createElement("p");
    subtitleElement.innerText = subtitle ===  undefined ? "":subtitle;

    const footerElement = document.createElement("p");
    footerElement.innerText = footer ===  undefined ? "":footer;

    let data = [{
        x: x,
        y: y,
        text: y.map(String),
        textposition: 'auto',
    }];
    
    let displayType = "graph-normal"
    switch (type) {
        case "bar":
            if (x.length > BAR_WIDTH_THRESHOLD) displayType = "graph-wide";
            data[0]["type"] = "bar";
            data[0]["marker"] = {color: COLOR_LIST[COLOR_INDEX]};
            COLOR_INDEX ++;
            if (COLOR_INDEX > COLOR_LIST.length) COLOR_INDEX = 0;
            break;
        case "scatter":
            if (x.length > SCATTER_LINE_WIDTH_THRESHOLD) displayType = "graph-wide";
            data[0]["type"] = "scatter";
            data[0]["mode"] = "markers";
            data[0]["marker"] = {color: COLOR_LIST[COLOR_INDEX]};
            COLOR_INDEX ++;
            if (COLOR_INDEX > COLOR_LIST.length) COLOR_INDEX = 0;
            break;
        case "line":
            if (x.length > SCATTER_LINE_WIDTH_THRESHOLD) displayType = "graph-wide";
            data[0]["type"] = "scatter";
            data[0]["mode"] = "lines+markers";
            data[0]["marker"] = {color: COLOR_LIST[COLOR_INDEX]};
            COLOR_INDEX ++;
            if (COLOR_INDEX > COLOR_LIST.length) COLOR_INDEX = 0;
            break;
        case "pie":
            data = [{
                labels: x,
                values: y,
                type: "pie",
                marker: {colors: COLOR_LIST.slice(COLOR_INDEX, COLOR_LIST.length).push(COLOR_LIST.slice(0, COLOR_INDEX))}
            }];
            COLOR_INDEX = (COLOR_INDEX + x.length) % COLOR_LIST.length;
            break;
        default:
            console.warn(`Unknown graph type '${type}'.`);
            break;
    }

    let layout = {
        xaxis: {
          title: xlabel ===  undefined ? "":xlabel,
          showgrid: false,
          zeroline: false,
        },
        yaxis: {
          title: ylabel ===  undefined ? "":ylabel,
          showline: false
        },
        width: displayType === "graph-wide" ? GRAPH_WIDTH_WIDE : GRAPH_WIDTH_NORMAL,
        height: GRAPH_HEIGHT,
        margin: {t:0}
      };
    if (type === "bar") {layout.xaxis["type"] = "category"}

    graphContainer.className = "graph-container " + displayType;
    graphContainer.appendChild(titleElement);
    graphContainer.appendChild(subtitleElement);
    graphContainer.appendChild(graphBody);
    graphContainer.appendChild(footerElement);

    Plotly.newPlot(graphBody, data, layout, {staticPlot: true}); //relies on plotly.js

    parent.appendChild(graphContainer);
}

/**
 * if the first element of the report is a header, set the page title to that header's title.
 * otherwise, set it to Report.
 * @param {Array<Array>} reportData - report format: array of report elements (graphs or headers)
 * @returns {null}
 */
function setPageTitle(reportData) {
    try {
        if (reportData[0].length === 2) {
            document.title = reportData[0][0];
            return;
        }
    } catch {

    }
    document.title = "Report";
}