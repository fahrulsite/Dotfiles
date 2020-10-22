const BG_VERSION = 15
const DEFAULT_COLOR = "#b48484"

function $(id) {
    return document.getElementById(id)
}


function inArray(value, array) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == value) return i
    }
    return -1
}

var bg = {
    tab: 0,
    tabs: [],
    version: BG_VERSION,
    screenshotData: '',
    screenshotFormat: 'png',
    canvas: document.createElement("canvas"),
    canvasContext: null,
    debugImage: null,
    debugTab: 0,
    history: {
        version: BG_VERSION,
        last_color: DEFAULT_COLOR,
        current_palette: 'default',
        palettes: [],
        backups: []
    },
    dominant_color: '#FFFFFF',
    defaultSettings: {
        autoClipboard: false,
        autoClipboardNoGrid: false,
        enableColorToolbox: true,
        enableColorTooltip: true,
        enableRightClickDeactivate: true,
        dropperCursor: 'default',
    },
    settings: {},
    edCb: null,

    useTab(tab) {
        bg.tab = tab
        bg.screenshotData = ''
        bg.canvas = document.createElement("canvas")
        bg.canvasContext = null
    },

    checkDropperScripts() {
        bg.sendMessage({
            type: 'edropper-version'
        }, function(res) {
            if (res) {
                bg.pickupActivate()
            } else {
                bg.injectDropper()
            }
            if(chrome.runtime.lastError) {
                return;
            }
        })
    },

    injectDropper() {
        chrome.tabs.executeScript(bg.tab.id, {
            allFrames: false,
            file: "jquery.js"
        }, function() {
            chrome.tabs.executeScript(bg.tab.id, {
                allFrames: false,
                file: "inc/jquery.scrollstop.js"
            }, function() {
                chrome.tabs.executeScript(bg.tab.id, {
                    allFrames: false,
                    file: "inc/shortcut.js"
                }, function() {
                    chrome.tabs.executeScript(bg.tab.id, {
                        allFrames: false,
                        file: "colorPicker.js"
                    }, function() {
                        bg.pickupActivate()
                    })
                })
            })
        })
    },

    refreshDropper() {
        chrome.tabs.executeScript(bg.tab.id, {
            allFrames: true,
            file: "colorPicker.js"
        }, function() {
            console.log('bg: colorPicker updated')
            bg.pickupActivate()
        })
    },

    sendMessage(message, callback) {
        chrome.tabs.sendMessage(bg.tab.id, message, callback)
    },

    shortcutListener() {
        chrome.commands.onCommand.addListener(function(command) {
            switch (command) {
                case 'activate':
                    bg.activate2()
                    break
            }
        })
    },

    messageListener() {
        chrome.runtime.onMessage.addListener(function(req, sender, sendResponse) {
            switch (req.type) {
                case 'activate-from-hotkey':
                    bg.activate2()
                    sendResponse({})
                    break
                case 'reload-background':
                    window.location.reload()
                    sendResponse({})
                    break
                case 'get_screenshot':
                    bg.get_screenshot();
                    sendResponse({})
                    break
                case 'update_badge':
                    bg.dominant_color = req.data
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: req.data
                    })
                    sendResponse({})
                    break
            }
        })

        chrome.extension.onConnect.addListener(function(port) {
            port.onMessage.addListener(function(req, sender) {
                switch (req.type) {
                    case 'screenshot':
                        bg.capture()
                        break
                    case 'debug-tab':
                        console.info('Received debug tab request')
                        bg.debugImage = req.image
                        bg.createDebugTab()
                        break
                    case 'set-color':
                        console.log(sender.sender)
                        bg.setColor(`#${req.color.rgbhex}`, true, 1, sender.sender.url)
                        break
                }
            })
        })
    },

    inject(file, tab) {
        if (tab == undefined)
            tab = bg.tab.id

        chrome.tabs.executeScript(tab, {
            allFrames: false,
            file: file
        }, function() {})
    },

    setBadgeColor(color) {
        console.info(`Setting badge color to ${color}`)
        chrome.browserAction.setBadgeBackgroundColor({
            color: [parseInt(color.substr(1, 2), 16), parseInt(color.substr(3, 2), 16), parseInt(color.substr(5, 2), 16), 255]
        })
    },
    setColor(color, history = true, source = 1, url = null) {
        console.group('setColor')
        console.info(`Received color ${color}, history: ${history}`)
        if (!color || !color.match(/^#[0-9a-f]{6}$/)) {
            console.error('error receiving color from dropper')
            console.groupEnd('setColor')
            return
        }

        bg.setBadgeColor(color) // Обновлять badge при пике цвета
        bg.history.last_color = color

        bg.copyToClipboard(color)

        // if (bg.settings.autoClipboard) {
        //     bg.copyToClipboard(color)
        // }

        console.groupEnd('setColor')
    },

    copyToClipboard(color) {
        bg.edCb.value = color
        // bg.edCb.value = bg.settings.autoClipboardNoGrid ? color.substring(1) : color
        bg.edCb.select()
        document.execCommand("copy", false, null)
    },

    activate2() {
        chrome.tabs.getSelected(null, function(tab) {
            bg.useTab(tab)
            bg.activate()
        })
    },

    activate() {
        bg.checkDropperScripts()
    },

    pickupActivate() {
        bg.sendMessage({
            type: 'pickup-activate',
            options: {
                cursor: bg.settings.dropperCursor,
                enableColorToolbox: bg.settings.enableColorToolbox,
                enableColorTooltip: bg.settings.enableColorTooltip,
                enableRightClickDeactivate: bg.settings.enableRightClickDeactivate
            }
        }, null)
    },

    get_screenshot() {
        try {
            chrome.tabs.captureVisibleTab(null, {
                    format: 'png'
                }, function(data) {
                    if(chrome.runtime.lastError) {
                        return;
                    }
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {type: "image_data", data: data}, null);
                    });
                })
        } catch (e) {
            chrome.tabs.captureVisibleTab(null, function(data) {
                if(chrome.runtime.lastError) {
                    return;
                }
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "image_data", data: data}, null);
                });
            })
        }
    },

    capture() {
        try {
            chrome.tabs.captureVisibleTab(null, {
                    format: 'png'
                }, bg.doCapture)
        } catch (e) {
            chrome.tabs.captureVisibleTab(null, bg.doCapture)
        }
    },

    getColor() {
        return bg.history.last_color
    },

    doCapture(data) {
        if (data) {
            bg.sendMessage({
                type: 'update-image',
                data: data
            }, null)
        } else {
            console.error('bg: did not receive data from captureVisibleTab')
        }
    },
    tabOnChangeListener() {
        chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
            if (bg.tab.id == tabId)
                bg.sendMessage({
                    type: 'pickup-deactivate'
                }, null)
        })

    },
    loadSettings() {
        console.info("Loading settings from storage")
        chrome.storage.sync.get('settings', (items) => {
            if (items.settings) {
                console.info("Settings loaded")
                bg.settings = items.settings
            } else {
                bg.tryConvertOldSettings()
            }
        })
    },

    saveSettings() {
        chrome.storage.sync.set({
            'settings': bg.settings
        }, () => {
            console.info("Settings synced to storage")
        })
    },
    
    tryConvertOldSettings() {
        bg.settings = bg.defaultSettings

        bg.settings.autoClipboard = (window.localStorage.autoClipboard === "true") ? true : false
        bg.settings.autoClipboardNoGrid = (window.localStorage.autoClipboardNoGrid === "true") ? true : false
        bg.settings.enableColorToolbox = (window.localStorage.enableColorToolbox === "false") ? false : true
        bg.settings.enableColorTooltip = (window.localStorage.enableColorTooltip === "false") ? false : true
        bg.settings.enableRightClickDeactivate = (window.localStorage.enableRightClickDeactivate === "false") ? false : true
        bg.settings.dropperCursor = (window.localStorage.dropperCursor === 'crosshair') ? 'crosshair' : 'default'

        bg.saveSettings()

        let setting_keys = ['autoClipboard', 'autoClipboardNoGrid', 'enableColorTooltip', 'enableColorToolbox', 'enableRightClickDeactivate', 'dropperCursor']
        for (let setting_name of setting_keys) {
            localStorage.removeItem(setting_name)
        }
        console.info("Removed old settings from locale storage.")
    },

    init() {
        console.group("init")
        bg.edCb = document.getElementById('edClipboard')
        bg.loadSettings()
        chrome.browserAction.setBadgeText({
            text: ' '
        })
        bg.messageListener()
        bg.tabOnChangeListener()
        bg.shortcutListener()
        console.groupEnd('init')
    }
}

document.addEventListener('DOMContentLoaded', function() {
    bg.init()
})

chrome.tabs.onActivated.addListener(function(info) {
    bg.get_screenshot();
});