const NEED_BG_VERSION = 15

let bgPage = null
let boxes = {}
let tab_ins = {}

let sec_color_boxes = null
let sec_color_history = null
let sec_content = null

ready(init)

function ready(fn) {
    if (document.readyState != 'loading') {
        fn()
    } else {
        document.addEventListener('DOMContentLoaded', fn)
    }
}


function init() {
    console.group('popup init')
    console.info('document ready')

    var pickColorBtn = chrome.i18n.getMessage("color_pick_btn");
    document.getElementById("colBtn").innerHTML = pickColorBtn;

    var selectedColorText = chrome.i18n.getMessage("selected_color");
    document.getElementById("selectedCol").innerHTML = selectedColorText;

    var dominantColorText = chrome.i18n.getMessage("dominant_color");
    document.getElementById("dominantCol").innerHTML = dominantColorText;

    initExternalLinks()

    console.info('getting background page')
    chrome.runtime.getBackgroundPage((backgroundPage) => {
        gotBgPage(backgroundPage)
    })

    console.groupEnd('popup init');

    sec_content = document.getElementById('content')
    sec_color_boxes = document.getElementById('color-boxes')
}

function initExternalLinks() {
    for (let n of document.getElementsByClassName('ed-external')) {
        if (n.dataset.url) {
            n.onclick = () => {
                chrome.tabs.create({
                    url: n.dataset.url
                })
            }
        }
    }
    console.info('external links initialized')
}


function gotBgPage(backgroundPage) {
    bgPage = backgroundPage

    if (bgPage.bg.version === undefined || bgPage.bg.version < NEED_BG_VERSION) {
        chrome.runtime.sendMessage({
            type: "reload-background"
        })
        setTimeout(bgPageReady, 1000)
    } else {
        bgPageReady()
    }
}

function bgPageReady() {
    chrome.tabs.getSelected(null, (tab) => {
        initPickButton(tab)
    })

    initColorBoxes()
}

function initPickButton(tab) {
    let pickEnabled = true;
    let message = ''

    if (tab.url === undefined || tab.url.indexOf('chrome') == 0) {
        message = "Chrome doesn't allow <i>extensions</i> to play with special Chrome pages like this one. <pre>chrome://...</pre>";
        pickEnabled = false;
    }
    else if (tab.url.indexOf('https://chrome.google.com/webstore') == 0) {
        message = "Chrome doesn't allow its <i>extensions</i> to play on Web Store.";
        pickEnabled = false;
    }
    else if (tab.url.indexOf('file') == 0) {
        message = "Chrome doesn't allow its <i>extensions</i> to play with your local pages.";
        pickEnabled = false;
    }

    let pick_el = document.getElementById('pick')
    if (pickEnabled) {
        pick_el.onclick = () => {
            bgPage.bg.useTab(tab)
            bgPage.bg.activate()
            window.close()
        }
    } else {
        let message_el = document.getElementById('pick-message')
        message_el.innerHTML = `<h3 class="normal">Can't pick from this page</h3>`
        message_el.style.display = 'block'
        pick_el.style.display = 'none'
    }
}

function initColorBoxes() {
    boxes = {
        current: document.getElementById('box-current'),
        dominant: document.getElementById('box-dominant'),
    }

    drawColorBoxes()
}

function drawColorBoxes() {
    colorBox('current', bgPage.bg.getColor())
    colorBox('dominant', bgPage.bg.dominant_color)
}

function loadTab(tabId) {
    console.group("tabSwitch")
    let content_found = false
    for (let n of document.getElementsByClassName('content-page')) {
        console.info(`found tab content ${n.id}`)
        if (n.id === `${tabId}-content`) {
            n.style.display = 'block'
            content_found = true
            console.info(`Found content for ${n.id}, switching.`)
        } else {
            n.style.display = 'none'
            console.info(`Hiding content for tab ${n.id}`)
        }
    }

    if (!content_found) {
        console.info("XMLHttp: No content found, loading through AJAX")
        let request = new XMLHttpRequest()
        request.open('GET', `/html/${tabId}.html`)
        request.onload = () => {
            if (request.status >= 200 && request.status < 400) {
                sec_content.insertAdjacentHTML('afterend', request.responseText)

                initExternalLinks()

            } else {
                console.error(`Error loading ${tab.id} content through AJAX: ${request.status}`)
            }
        }

        request.send()
    }
    console.groupEnd('tabSwitch')
}

function colorBox(type, color) {
    if (boxes[type]) {
        color = pusher.color(color)

        let formats = [color.hex6(), color.hex3(), color.html('keyword'), color.html('hsl'), color.html('rgb')];

        let html = ''
        html += `<span class="mr1 mb1 dib"><code style="border-radius: 20px;">${formats[0]}</code></span>`
        html += `<span class="mr1 mb1 dib"><code style="border-radius: 20px;">${formats[3]}</code></span>`
        html += `<span class="mr1 mb1 dib"><code style="border-radius: 20px;">${formats[4]}</code></span>`
        boxes[type].innerHTML = html

        boxes[type].style = `background: ${color.hex6()}`
    }
}

function colorSquare(color) {
    return `<div class="fl dib dim mr1 br1 mb1 ba b--gray colors-history-square" data-color="${color}" style="background-color: ${color}">&nbsp;</div>`
}