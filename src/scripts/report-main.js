const BAR_WIDTH_THRESHOLD = 4; //number of elements required to make a bar plot wide
const SCATTER_LINE_WIDTH_THRESHOLD = 15; //number of elements required to make a scatter or line plot wide
const GRAPH_WIDTH_WIDE = 600;
const GRAPH_WIDTH_NORMAL = 300;
const GRAPH_HEIGHT = 300;
const COLOR_LIST = ['rgb(102, 197, 204)', 'rgb(246, 207, 113)', 'rgb(248, 156, 116)', 'rgb(220, 176, 242)', 'rgb(135, 197, 95)', 'rgb(158, 185, 243)', 'rgb(254, 136, 177)', 'rgb(201, 219, 116)', 'rgb(139, 224, 164)', 'rgb(180, 151, 231)', 'rgb(179, 179, 179)'];
let COLOR_INDEX = 0;


window.onload = () => {
    console.log("ready message sent");
    window.opener.postMessage('r', "*");
}
window.onmessage = (e) => {
    console.log(e);
    makeReport(e.data);
};

function makeReport(s) {
    let report = decodeDataURL(s);
    let graphAttachPoint = document.getElementById("page-body");
    for (const item of report) {
        if (item.length === 2) {
            //header section
            addHeader(graphAttachPoint, item[0], item[1]);
        } else if (item.length >= 4 && item.length <= 8) {
            // graph
            addGraph(graphAttachPoint, ...item);
        } else {
            console.log(item.length)
            console.warn(`Bad report item: ${item}`);
        }
    }
}

function addHeader(parent, title, subtitle) {
    const headerDiv = document.createElement('div');
    headerDiv.className = "header-div";
    headerDiv.innerHTML = `<h1>${title}</h1><p>${subtitle}</p><div class="break-line"></div>`;
    parent.appendChild(headerDiv);
}

function addGraph(parent, x, y, type, title, subtitle, xlabel, ylabel, footer) {
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

    Plotly.newPlot(graphBody, data, layout, {staticPlot: true});

    parent.appendChild(graphContainer);
}