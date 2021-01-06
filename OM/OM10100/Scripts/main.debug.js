var tabCurrent;
var isClose = false;

function loadHomeScreen() {
    if (HQ.homeScreenNbr != '') {
        if (HQ.homeType == 'S') {
            App.direct.ScreenLoad(HQ.homeScreenNbr, HQ.common.getLang(HQ.homeScreenNbr), {
                success: function (result) {

                },
                failure: function (errorMsg) {

                }
            });
        }
        else {
            App.direct.ReportLoad(HQ.homeScreenNbr, HQ.common.getLang(HQ.homeScreenNbr), {
                success: function (result) {

                },
                failure: function (errorMsg) {

                }
            });
        }
    }
};

var beforeClose = function (tab) {
    if (tab.title.indexOf('*') !=-1 && !isClose) {
        tabCurrent = tab;
        HQ.message.show(5, '', 'closeTab');
        return false;
    }
    else {
        return true;
    }
    return false;
};

var closeTab = function (item) {
    if (item == "no" || item == "ok") {
        isClose = true;
        tabCurrent.close();
    }
    else isClose = false;
};

var moduleCat_Collapse = function (item) {
    item.removeAll(true);
};

var nodeClick = function (item, record, node, index, e) {
    var tab = App.tabMain;
    if (tab!=undefined && tab.items.keys.indexOf('tab' + record.data.ScreenNumber) == -1) {
        if (record.data.ScreenType == "S") {
            if (HQ.openScreens <= tab.items.keys.length) {
                HQ.message.show(754, '', '', true);
                return;
            }
            App.direct.ScreenLoad(record.data.ScreenNumber, record.data.text, {
                success: function (result) {

                },
                failure: function (errorMsg) {

                }
            });
        }

        else if (record.data.ScreenType == "R") {
            App.direct.ReportLoad(record.data.ScreenNumber, record.data.text, {
                success: function (result) {

                },
                failure: function (errorMsg) {

                }
            });
        }
    }
    else if (tab != undefined && tab.items.keys.indexOf('tab' + record.data.ScreenNumber) != -1)
        {
        tab.setActiveTab('tab' + record.data.ScreenNumber);
    }
};
var addTab = function (tabPanel, id, url, menuItem) {
    var tab = tabPanel.getComponent(id);
    if (!tab) {
        tab = tabPanel.add({
            id: id,
            title: url,
            closable: true,
            menuItem: menuItem,
            loader: {
                url: url,
                renderer: "frame",
                loadMask: {
                    showMask: true,
                    msg: "Loading " + url + "..."
                }
            }
        });

        tab.on("activate", function (tab) {
        });
    }

    tabPanel.setActiveTab(tab);
};

var jump = function (e) {


    var targetEl = Ext.get(e.target.id), targetCmp = Ext.getCmp(e.target.id), fieldEl = targetEl.up('[class=x-form-item ]') || {};
    if (!targetCmp.isXType('field') || targetCmp == null || (!e.shiftKey && targetCmp.isXType('textarea')))
        return;
    var next = fieldEl.next('[class=x-form-item ]');
    // focus the next field if it exists                   
    if (next && next.child('.x-form-field')) {
        e.stopEvent();
        next.child('.x-form-field').focus();
    }
};


var btnLogin_Click = function (e) {
    if (e.up('form').getForm().isValid()) {

        e.setDisabled(true);
        return true;
    }
    return false;
};

var lblOnlineUser_AfterRender = function () {
    var user = $.connection.userOnlineHub;
    user.client.onlineUsers = function (count) {
        App.lblOnlineUser.setText(count);
    };
    user.client.signOut = function () {
        App.btnSignOut.fireEvent('click', App.btnSignOut);
    };
    user.client.close = function () {
        App.viewMain.removeAll();
        window.close();
    };
    $.connection.hub.start().done(function () {

    });
};

var btnAbout_Click = function () {
    App.winAbout.show();
};