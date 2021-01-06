// Add event listener offline to detect network loss.


//// Add event listener online to detect network recovery.
//window.addEventListener("online", function (e) {
//    Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('FailedConnectServer'));
//});
var SummaryMess = function (mess, respone, store) {
    Ext.Msg.show({
        title: "Error"
                       , buttons: { cancel: 'Ok', yes: 'ShowDetail' }
                       , msg: 'Sorry, an error occurred while processing your request.'
                       , fn: function (buttonId, text) {
                           switch (buttonId) {
                               case "yes": showDetailError(mess, respone, store)
                           }
                       }
    });
}
var showDetailError = function (mess, response, store) {
    if (store) {
        var bodySize = Ext.getBody().getViewSize(),
          width = (bodySize.width < 500) ? bodySize.width - 50 : 500,
          height = (bodySize.height < 300) ? bodySize.height - 50 : 300,
          win;
        win = new Ext.window.Window({
            id: "winError",
            modal: true,
            width: width,
            height: height,
            title: "Request Failure",
            layout: "fit",
            maximizable: false, //default is true
            closable: true, //default is true
            items: [{
                xtype: "container",
                layout: {
                    type: "vbox",
                    align: "stretch"
                },
                items: [
                    {
                        xtype: "container",
                        height: 42,
                        layout: "absolute",
                        defaultType: "label",
                        items: [
                            {
                                xtype: "component",
                                x: 5,
                                y: 5,
                                html: '<div class="x-message-box-error" style="width:32px;height:32px"></div>'
                            },
                            {
                                x: 42,
                                y: 6,
                                html: "<b>Status Code: </b>"
                            },
                            {
                                x: 125,
                                y: 6,
                                text: response.status
                            },
                            {
                                x: 42,
                                y: 25,
                                html: "<b>Status Text: </b>"
                            },
                            {
                                x: 125,
                                y: 25,
                                text: response.statusText
                            }
                        ]
                    },
                    {
                        flex: 1,
                        itemId: "__ErrorMessageEditor",
                        xtype: "htmleditor",
                        value: mess,
                        readOnly: true,
                        enableAlignments: false,
                        enableColors: false,
                        enableFont: false,
                        enableFontSize: false,
                        enableFormat: false,
                        enableLinks: false,
                        enableLists: false,
                        enableSourceEdit: false
                    }
                ]
            }]
        });

        win.show();
    } else {
        Ext.Msg.alert(HQ.common.getLang('Error'), mess);
    }
}
Ext.data.AbstractStore.override({
    onProxyException: function (proxy, response, operation) {
        if (response != undefined && response.responseText != undefined && response.responseText.indexOf('SESSIONTIMEOUT') > -1) {
            if (parent != null) {
                parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                if (App.frmMain) App.frmMain.unmask();
            }
            else {
                Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                if (App.frmMain) App.frmMain.unmask();
            }
        }
        else {
            var error = operation.getError(),
                message;

            if (!Ext.isDefined(error)) {
                error = Ext.decode(response.responseText).message;
            }

            message = Ext.isString(error) ? error : ("(" + error.status + ")" + error.statusText);

            this.fireEvent("exception", proxy, response, operation);

            if (Ext.net.DirectEvent.fireEvent("ajaxrequestexception", response, { "errorMessage": message }, null, null, null, null, operation) !== false) {
                if (this.showWarningOnFailure !== false) {
                    SummaryMess(response.responseText, response, true);
                    //HQ.message.show('1712181724', response.responseText, '', false);
                    //Ext.net.DirectEvent.showFailure(response, response.responseText);
                }
            }
        }
    }
});
Ext.override(Ext.net.DirectEvent, {
    showFailure: function (response, errorMsg) {
        var bodySize = Ext.getBody().getViewSize(),
            width = (bodySize.width < 500) ? bodySize.width - 50 : 500,
            height = (bodySize.height < 300) ? bodySize.height - 50 : 300,
            win;
        if (Ext.isEmpty(errorMsg)) {
            errorMsg = response.responseText;
        }
        if (response.responseText.indexOf('SESSIONTIMEOUT') > -1) {
            if (parent != null)
                parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
            else Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
        }
        else
            if (response.status == 500 || response.status == 0) {
                //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('ErrorConnectServer'));		
                SummaryMess(response.responseText, response, true);
            }
            else {
                win = new Ext.window.Window({
                    id: "winError",
                    modal: true,
                    width: width,
                    height: height,
                    title: "Request Failure",
                    layout: "fit",
                    maximizable: false, //default is true
                    closable: true, //default is true
                    items: [{
                        xtype: "container",
                        layout: {
                            type: "vbox",
                            align: "stretch"
                        },
                        items: [
                            {
                                xtype: "container",
                                height: 42,
                                layout: "absolute",
                                defaultType: "label",
                                items: [
                                    {
                                        xtype: "component",
                                        x: 5,
                                        y: 5,
                                        html: '<div class="x-message-box-error" style="width:32px;height:32px"></div>'
                                    },
                                    {
                                        x: 42,
                                        y: 6,
                                        html: "<b>Status Code: </b>"
                                    },
                                    {
                                        x: 125,
                                        y: 6,
                                        text: response.status
                                    },
                                    {
                                        x: 42,
                                        y: 25,
                                        html: "<b>Status Text: </b>"
                                    },
                                    {
                                        x: 125,
                                        y: 25,
                                        text: response.statusText
                                    }
                                ]
                            },
                            {
                                flex: 1,
                                itemId: "__ErrorMessageEditor",
                                xtype: "htmleditor",
                                value: errorMsg,
                                readOnly: true,
                                enableAlignments: false,
                                enableColors: false,
                                enableFont: false,
                                enableFontSize: false,
                                enableFormat: false,
                                enableLinks: false,
                                enableLists: false,
                                enableSourceEdit: false
                            }
                        ]
                    }]
                });

                win.show();
            }
    }
});
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (elt /*, from*/) {
        var len = this.length >>> 0;

        var from = Number(arguments[1]) || 0;
        from = (from < 0)
             ? Math.ceil(from)
             : Math.floor(from);
        if (from < 0)
            from += len;

        for (; from < len; from++) {
            if (from in this &&
                this[from] === elt)
                return from;
        }
        return -1;
    };
}

if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    }
}
String.prototype.trimRight = function (charlist) {
    if (charlist === undefined)
        charlist = "\s";

    return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

if (typeof String.prototype.unsign !== 'function') {
    String.prototype.unsign = function () {
        return this.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a").replace(/\ /g, '-').replace(/đ/g, "d").replace(/đ/g, "d").replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y").replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u").replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o").replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e").replace(/ì|í|ị|ỉ|ĩ/g, "i").replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e").replace(/ì|í|ị|ỉ|ĩ/g, "i").replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a").replace(/ý|ỳ|ỷ|ỹ|ỵ/g, "y").replace(/ú|ù|ủ|ũ|ụ|ứ|ừ|ử|ữ|ự/g, "u").replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/g, "o")
    }
}

if (!('forEach' in Array.prototype)) {
    Array.prototype.forEach = function (action, that /*opt*/) {
        for (var i = 0, n = this.length; i < n; i++)
            if (i in this)
                action.call(that, this[i], i, this);
    };
}

Date.prototype.addDays = function (days) {
    this.setDate(this.getDate() + days);
    return this;
};
Date.prototype.equal = function (days) {
    if (Ext.Date.format(this, 'Y-m-d') == Ext.Date.format(days, 'Y-m-d'))
        return true;
    else return false;
};
Date.prototype.less = function (days) {
    if (Ext.Date.format(this, 'Y-m-d') < Ext.Date.format(days, 'Y-m-d'))
        return true;
    else return false;
};
Date.prototype.greater = function (days) {
    if (Ext.Date.format(this, 'Y-m-d') > Ext.Date.format(days, 'Y-m-d'))
        return true;
    else return false;

};
Date.prototype.greaterOrEqual = function (days) {
    if (Ext.Date.format(this, 'Y-m-d') >= Ext.Date.format(days, 'Y-m-d'))
        return true;
    else return false;

};
Date.prototype.lessOrEqual = function (days) {
    if (Ext.Date.format(this, 'Y-m-d') <= Ext.Date.format(days, 'Y-m-d'))
        return true;
    else return false;

};
Date.prototype.getFromFormat = function (format) {
    var yyyy = this.getFullYear().toString();
    format = format.replace(/yyyy/g, yyyy)
    var mm = (this.getMonth() + 1).toString();
    format = format.replace(/MM/g, (mm[1] ? mm : "0" + mm[0]));
    var dd = this.getDate().toString();
    format = format.replace(/dd/g, (dd[1] ? dd : "0" + dd[0]));
    var hh = this.getHours().toString();
    format = format.replace(/hh/g, (hh[1] ? hh : "0" + hh[0]));
    var ii = this.getMinutes().toString();
    format = format.replace(/mm/g, (ii[1] ? ii : "0" + ii[0]));
    var ss = this.getSeconds().toString();
    format = format.replace(/ss/g, (ss[1] ? ss : "0" + ss[0]));
    return format;
};

Number.prototype.format = function (n, x, s, c) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
        num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};
///vi du 
//12345678.9.format(2, 3, '.', ',');  // "12.345.678,90"
//123456.789.format(4, 4, ' ', ':');  // "12 3456:7890"
//12345678.9.format(0, 3, '-');       // "12-345-679"
var HQ = {
    store: {
        isChange: function (store) {
            if ((store.getChangedData().Created != undefined && store.getChangedData().Created.length > 1)
                || store.getChangedData().Updated != undefined) {
                return true;
            } else if (store.getChangedData().Deleted != undefined) {
                for (var i = 0; i < store.getChangedData().Deleted.length; i++) {
                    if (store.getChangedData().Deleted[i].tstamp != '') return true;
                }
                return false;
            }
            else {
                return false;
            }
        },
        isGridChange: function (store, keys) { // Kiểm tra dòng thêm mới đã đủ key thì đánh dấu là đã thay đổi
            if (store.getChangedData().Updated != undefined) {
                return true;
            }
            else if (store.getChangedData().Deleted != undefined) {
                for (var i = 0; i < store.getChangedData().Deleted.length; i++) {
                    if (store.getChangedData().Deleted[i].tstamp != '') return true;
                }
            }
            if (store.getChangedData().Created != undefined) {
                if (store.getChangedData().Created.length > 1) {
                    return true;
                }
                else {
                    var itmCount = keys.length;
                    var match = 0;
                    for (var idx = 0; idx < itmCount; idx++) {
                        if (store.getChangedData().Created[0][keys[idx]]) {
                            match++;
                        }
                    }
                    if (match == itmCount) {
                        return true;
                    }
                    return false;
                }
            } else {
                return false;
            }
        },
        insertBlank: function (store, keys) {
            if (keys == undefined) {
                store.insert(store.getCount(), Ext.data.Record());
            } else {
                var flat = store.findBy(function (record, id) {
                    if (keys.constructor === Array) {
                        for (var i = 0; i < keys.length; i++) {
                            if (!record.get(keys[i])) {
                                return true;
                            }
                        }
                    }
                    else if (!record.get(keys)) {
                        return true;
                    }
                    return false;
                });

                if (flat == -1) {
                    store.insert(store.getCount(), Ext.data.Record());
                }
            }
        },
        // Commit record
        insertRecord: function (store, keys, newRecord, commit) {
            var flat = store.findBy(function (record, id) {
                if (keys.constructor === Array) {
                    for (var i = 0; i < keys.length; i++) {
                        if (!record.get(keys[i])) {
                            return true;
                        }
                    }
                }
                else if (!record.get(keys)) {
                    return true;
                }
                return false;
            });

            if (flat == -1) {
                store.insert(store.getCount(), newRecord);
            }
            if (commit != undefined && commit == true) {
                store.data.items[store.data.length - 1].commit();
            }
        },
        getData: function (store, skip) {
            if (Ext.isEmpty(skip)) {
                skip = false;
            }
            return Ext.encode(store.getChangedData({ skipIdForPhantomRecords: skip }));
        },
        getAllData: function (store, fields, values, isEqual) {
            var lstData = [];
            if (isEqual == undefined || isEqual == true) {
                var allData = store.snapshot || store.allData || store.data;
                allData.each(function (item) {
                    var isb = true;
                    if (fields != null) {
                        for (var i = 0; i < fields.length; i++) {
                            if (item.data[fields[i]] != values[i]) {
                                isb = false;
                                break;
                            }
                        }
                    }
                    if (isb) lstData.push(item.data);
                });
                return Ext.encode(lstData);
            } else {
                var allData = store.snapshot || store.allData || store.data;
                allData.each(function (item) {
                    var isb = true;
                    if (fields != null) {
                        for (var i = 0; i < fields.length; i++) {
                            if (item.data[fields[i]] == values[i]) {
                                isb = false;
                                break;
                            }
                        }
                    }
                    if (isb) lstData.push(item.data);
                });
                return Ext.encode(lstData);
            }
        },
        findInStore: function (store, fields, values) {
            var data;
            var allData = store.snapshot || store.allData || store.data;
            if (allData) {
                allData.each(function (item) {
                    var intT = 0;
                    for (var i = 0; i < fields.length; i++) {
                        var tmp1 = item.get(fields[i]);
                        var tmp2 = values[i];
                        var val1 = (tmp1 == undefined || tmp1 == null) ? '' : tmp1;
                        var val2 = (tmp2 == undefined || tmp2 == null) ? '' : tmp2;
                        if (val1.toString() == val2.toString()) {
                            intT++;
                        }
                    }
                    if (intT == fields.length) {
                        data = item.data;
                        return false;
                    }
                });
            }
            return data;
        },
        findRecord: function (store, fields, values) {
            var data;
            var allData = store.snapshot || store.allData || store.data;
            if (allData) {
                allData.each(function (item) {
                    var intT = 0;
                    for (var i = 0; i < fields.length; i++) {
                        var tmp1 = item.get(fields[i]);
                        var tmp2 = values[i];
                        var val1 = (tmp1 == undefined || tmp1 == null) ? '' : tmp1;
                        var val2 = (tmp2 == undefined || tmp2 == null) ? '' : tmp2;
                        if (val1.toString() == val2.toString()) {
                            intT++;
                        }
                    }
                    if (intT == fields.length) {
                        data = item;
                        return false;
                    }
                });
            }
            return data;
        },
        // TinhHV using for auto gen the LineRef
        lastLineRef: function (store) {
            var num = 0;
            for (var j = 0; j < store.data.length; j++) {
                var item = store.data.items[j];

                if (!Ext.isEmpty(item.data.LineRef) && parseInt(item.data.LineRef) > num) {
                    num = parseInt(item.data.LineRef);
                }
            };
            num++;
            var lineRef = num.toString();
            var len = lineRef.length;
            for (var i = 0; i < 5 - len; i++) {
                lineRef = "0" + lineRef;
            }
            return lineRef;
        },
        //kiem tra key da nhap du chua
        isAllValidKey: function (items, keys) {
            if (items != undefined) {
                for (var i = 0; i < items.length; i++) {
                    for (var j = 0; j < keys.length; j++) {
                        if (items[i][keys[j]] == '' || items[i][keys[j]] == undefined)
                            return false;
                    }
                }
                return true;
            } else {
                return true;
            }
        },
        checkRequirePass: function (store, keys, fieldsCheck, fieldsLang) {
            items = store.getChangedData().Created;
            if (items != undefined) {
                for (var i = 0; i < items.length; i++) {
                    for (var jkey = 0; jkey < keys.length; jkey++) {
                        if (items[i][keys[jkey]]) {
                            for (var k = 0; k < fieldsCheck.length; k++) {
                                if (HQ.util.passNull(items[i][fieldsCheck[k]]).toString().trim() == "") {
                                    HQ.message.show(15, HQ.common.getLang(fieldsLang == undefined ? fieldsCheck[k] : fieldsLang[k]));
                                    return false;
                                }
                            }
                            break; // Check data one time
                        }
                    }
                }
            }

            items = store.getChangedData().Updated;
            if (items != undefined) {
                for (var i = 0; i < items.length; i++) {
                    for (var jkey = 0; jkey < keys.length; jkey++) {
                        if (items[i][keys[jkey]]) {
                            for (var k = 0; k < fieldsCheck.length; k++) {
                                if (HQ.util.passNull(items[i][fieldsCheck[k]]).toString().trim() == "") {
                                    HQ.message.show(15, HQ.common.getLang(fieldsLang == undefined ? fieldsCheck[k] : fieldsLang[k]));
                                    return false;
                                }
                            }
                            break; // Check data one time
                        }
                    }
                }
            }
            return true;
        },
        filterStore: function (store, field, value) {
            store.filterBy(function (record) {
                if (record) {
                    if (record.data[field].toString().toLowerCase() == (HQ.util.passNull(value).toLowerCase())) {
                        return record;
                    }
                }
            });
        },
        checkData: function (store, fields, values) {
            var bData = false;
            var allData = store.snapshot || store.allData || store.data;
            for (var j = 0; j < allData.items.length; j++) {
                item = allData.items[j];
                var isb = false;
                if (fields != null) {
                    for (var i = 0; i < fields.length; i++) {
                        if (item.data[fields[i]] != values[i]) {
                            isb = true;
                            break;
                        }
                    }
                }
                bData = isb;
                return bData;
            }
            return bData;
        },
    },
    combo: {
        first: function (cbo, isChange) {
            if (isChange) {
                HQ.message.show(150, '', '');
            }
            else {
                var value = cbo.store.getAt(0);
                if (value) {
                    cbo.setValue(value.data[cbo.valueField]);
                }
            }
        },
        prev: function (cbo, isChange) {
            if (isChange) {
                HQ.message.show(150, '', '');
            }
            else {
                var v = cbo.getValue();
                var record = cbo.findRecord(cbo.valueField || cbo.displayField, v);
                var index = cbo.store.indexOf(record);
                var value = cbo.store.getAt(index - 1);
                if (value) {
                    cbo.setValue(value.data[cbo.valueField]);
                }
                else HQ.combo.first(cbo);
            }
        },
        next: function (cbo, isChange) {
            if (isChange) {
                HQ.message.show(150, '', '');
            }
            else {
                var v = cbo.getValue();
                var record = cbo.findRecord(cbo.valueField || cbo.displayField, v);
                var index = cbo.store.indexOf(record);
                var value = cbo.store.getAt(index + 1);
                if (value) {
                    cbo.setValue(value.data[cbo.valueField]);
                }
                else HQ.combo.last(cbo);
            }
        },
        last: function (cbo, isChange) {
            if (isChange) {
                HQ.message.show(150, '', '');
            }
            else {
                var value = cbo.store.getAt(cbo.store.getCount() - 1);
                if (value) {
                    cbo.setValue(value.data[cbo.valueField]);
                }
            }

        },
        expand: function (cbo, delimiter) {
            if (cbo.getValue())
                cbo.setValue(cbo.getValue().toString().replace(new RegExp(delimiter, 'g'), ',').split(','));
        },
        expandScrollToItem: function (combo) {
            var val = combo.getValue();
            if (val !== null) {
                var rec = combo.findRecordByValue(combo.getValue()),
                  node = combo.picker.getNode(rec);
                if (node != null) {
                    combo.picker.highlightItem(node);
                    combo.picker.listEl.scrollChildIntoView(node, false);
                }
                //$(combo.picker.listEl.dom).scrollTop($(combo.picker.listEl.dom).scrollTop() + $(node).position().top);
            }

        },
        selectAll: function (cbo) {
            var value = [];
            cbo.setValue('');
            cbo.store.data.each(function (item) {
                value.push(item.data[cbo.valueField]);
            })
            cbo.setValue(value);
        }
    },
    date: {
        expand: function (dte, eOpts) {
            //dte.picker.setHeight(300);
            //dte.picker.monthEl.setHeight(300);
        }
    },
    grid: {
        showBusy: function (grd, isBusy) {
            if (isBusy)
                grd.view.loadMask.show();
            else grd.view.loadMask.hide();
        },
        insert: function (grd, keys) {
            var store = grd.getStore();
            var createdItems = store.getChangedData().Created;
            if (createdItems != undefined) {
                if (store.currentPage != Math.ceil(store.totalCount / store.pageSize) && store.totalCount != 0) {
                    store.loadPage(Math.ceil(store.totalCount / store.pageSize), {
                        callback: function () {
                            HQ.grid.last(grd);
                            setTimeout(function () {
                                //grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });
                                if (grd.editingPlugin) {
                                    grd.editingPlugin.startEditByPosition({
                                        row: store.getCount() - 1,
                                        column: 1
                                    });
                                }
                                else {
                                    grd.lockedGrid.editingPlugin.startEditByPosition({
                                        row: store.getCount() - 1,
                                        column: 1
                                    });
                                }
                            }, 300);
                        }
                    });
                }
                else {
                    HQ.grid.last(grd);
                    if (grd.editingPlugin) {
                        grd.editingPlugin.startEditByPosition({
                            row: store.getCount() - 1,
                            column: 1
                        });
                    }
                    else {
                        grd.lockedGrid.editingPlugin.startEditByPosition({
                            row: store.getCount() - 1,
                            column: 1
                        });
                    }
                }
                return;
            }
            if (store.currentPage != Math.ceil(store.totalCount / store.pageSize)) {
                store.loadPage(Math.ceil(store.totalCount / store.pageSize), {
                    callback: function () {
                        if (HQ.grid.checkRequirePass(store.getChangedData().Updated, keys)) {
                            var record = HQ.store.findRecord(store, keys, ['']);
                            if (record != undefined) {
                                store.remove(record);
                            }
                            HQ.store.insertBlank(store, keys);
                        }
                        HQ.grid.last(grd);
                        setTimeout(function () {
                            // grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });
                            if (grd.editingPlugin) {
                                grd.editingPlugin.startEditByPosition({
                                    row: store.getCount() - 1,
                                    column: 1
                                });
                            }
                            else {
                                grd.lockedGrid.editingPlugin.startEditByPosition({
                                    row: store.getCount() - 1,
                                    column: 1
                                });
                            }
                        }, 300);
                    }
                });
            }
            else {
                if (HQ.grid.checkRequirePass(store.getChangedData().Updated, keys)) {
                    var record = HQ.store.findRecord(store, keys, ['']);
                    if (record != undefined) {
                        store.remove(record);
                    }
                    HQ.store.insertBlank(store, keys);
                }
                HQ.grid.last(grd);
                //grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });

                if (grd.editingPlugin) {
                    grd.editingPlugin.startEditByPosition({
                        row: store.getCount() - 1,
                        column: 1
                    });
                }
                else {
                    grd.lockedGrid.editingPlugin.startEditByPosition({
                        row: store.getCount() - 1,
                        column: 1
                    });
                }
            }
        },

        insertAndFocusBlankRow: function (grid, fields, values, focusColumnIndex) {
            var record;
            var allData = grid.store.snapshot || grid.store.allData || grid.store.data;
            var idx = -1;
            if (allData) {
                allData.each(function (item) {
                    var intT = 0;
                    idx++;
                    for (var i = 0; i < fields.length; i++) {
                        var tmp1 = item.get(fields[i]);
                        var tmp2 = values[i];
                        var val1 = (tmp1 == undefined || tmp1 == null) ? '' : tmp1;
                        var val2 = (tmp2 == undefined || tmp2 == null) ? '' : tmp2;
                        if (val1.toString() == val2.toString()) {
                            intT++;
                        }
                    }
                    if (intT == fields.length) {
                        record = item;
                        return false;
                    }
                });
            }
            if (!record) {
                HQ.store.insertBlank(grid.store, fields);
            } else {
                var page = Math.floor(idx / grid.store.pageSize) + 1;
                if (page > 0) {
                    grid.store.loadPage(page);
                }
            }
            index = 1;
            if (focusColumnIndex != undefined) {
                var index = HQ.grid.findColumnIndex(grid.columns, focusColumnIndex);
                if (index == -1) {
                    index = 1;
                }
            }
            setTimeout(function () {
                if (grid.store.data.length > 0) {
                    grid.editingPlugin.startEditByPosition({
                        row: grid.store.data.length - 1,
                        column: index
                    });
                }
            }, 400);
        },

        first: function (grd) {
            grd.getSelectionModel().select(0);
        },
        prev: function (grd) {
            grd.getSelectionModel().selectPrevious();
        },
        next: function (grd) {
            grd.getSelectionModel().selectNext();
        },
        last: function (grd) {
            grd.getSelectionModel().select(grd.getStore().getCount() - 1);
        },
        onPageSelect: function (combo) {
            var store = combo.up("gridpanel").getStore();
            store.pageSize = parseInt(combo.getValue(), 10);
            store.loadPage(1);
        },

        indexSelect: function (grd) {
            var index = '';
            var allData = grd.store.allData || grd.store.data;
            var arr = grd.getSelectionModel().selected.items;
            arr.forEach(function (itm) {
                index += (allData.indexOfKey(itm.internalId) + 1) + ',';
            });
            return index.substring(0, index.length - 1);
        },

        checkDuplicate: function (grd, row, keys) {
            var found = false;
            var store = grd.getStore();
            if (keys == undefined) keys = row.record.idProperty.split(',');
            var allData = grd.store.allData || grd.store.data;
            for (var i = 0; i < allData.items.length; i++) {
                var record = allData.items[i];
                var data = '';
                var rowdata = '';
                for (var jkey = 0; jkey < keys.length; jkey++) {
                    if (record.data[keys[jkey]] != undefined) {
                        data += record.data[keys[jkey]].toString().toLowerCase() + ',';
                        if (row.field == keys[jkey])
                            rowdata += (row.value == null ? "" : row.value.toString().toLowerCase()) + ',';
                        else
                            rowdata += (row.record.data[keys[jkey]] != undefined ? row.record.data[keys[jkey]].toString().toLowerCase() : '') + ',';
                    }
                }
                if (found = (data == rowdata && record.id != row.record.id) ? true : false) {
                    break;
                };
            }
            return found;
        },
        //TrungHT d�ng cho ph�n trang
        checkDuplicateAll: function (grd, row, keys) {
            return HQ.grid.checkDuplicate(grd, row, keys);
        },
        //D�ng trong ham before edit cua grid
        //Neu cac key da duoc nhap roi thi moi nhap cac field khac duoc
        //Cot nao la key thi khoa lai khi da co du lieu
        checkInput: function (row, keys) {
            if (keys.indexOf(row.field) == -1) {

                for (var jkey = 0; jkey < keys.length; jkey++) {
                    if (!row.record.data[keys[jkey]]) {
                        return false;
                    }
                }
            }
            if (keys.indexOf(row.field) != -1) {
                for (var jkey = 0; jkey < keys.length; jkey++) {
                    if (!row.record.data[keys[jkey]]) return true;
                }
                return false;
            }
            return true;
        },
        //Kiem tra khi check require bo qua cac dong la new 
        checkRequirePass: function (items, keys) {
            if (items != undefined && keys != undefined)
                for (var jkey = 0; jkey < keys.length; jkey++) {
                    if (items[keys[jkey]]) {
                        return false;
                    }
                }
            return true;
        },
        checkBeforeEdit: function (e, keys) {
            if (!HQ.isUpdate && e.record.data.tstamp) return false;
            if (!HQ.isInsert && !e.record.data.tstamp) return false;
            if (keys.indexOf(e.field) != -1) {
                if (e.record.data.tstamp)
                    return false;
            }
            return HQ.grid.checkInput(e, keys);
        },
        checkReject: function (record, grd) {
            if (record.data.tstamp == '') {
                grd.getStore().remove(record, grd);
                grd.getView().focusRow(grd.getStore().getCount() - 1);
                grd.getSelectionModel().select(grd.getStore().getCount() - 1);
            } else {
                record.reject();
            }
        },
        checkValidateEdit: function (grd, e, keys, isCheckSpecialChar) {
            if (keys.indexOf(e.field) != -1) {
                var regex = /^(\w*(\d|[a-zA-Z]|[\_\-.#\\]))*$/
                if (isCheckSpecialChar == undefined) isCheckSpecialChar = true;
                if (isCheckSpecialChar) {
                    if (e.value)
                        if (!HQ.util.passNull(e.value) == '' && !HQ.util.passNull(e.value.toString()).match(regex)) {
                            HQ.message.show(20140811, e.column.text);
                            return false;
                        }
                }
                if (HQ.grid.checkDuplicate(grd, e, keys)) {
                    if (e.column.xtype == "datecolumn")
                        HQ.message.show(1112, Ext.Date.format(e.value, e.column.format));
                    else HQ.message.show(1112, e.value);
                    return false;
                }

            }
        },

        checkValidateEditDG: function (grd, e, keys) {
            if (keys.indexOf(e.field) != -1) {
                if (HQ.grid.checkDuplicate(grd, e, keys)) {
                    if (e.column.xtype == "datecolumn")
                        HQ.message.show(1112, Ext.Date.format(e.value, e.column.format));
                    else HQ.message.show(1112, e.value);
                    return false;
                }
            }
        },

        checkInsertKey: function (grd, e, keys) {
            if (keys.indexOf(e.field) != -1) {
                if (e.value != '')
                    HQ.store.insertBlank(grd.getStore(), keys);
            }
        },
        hide: function (grd, arrcolumnName) {
            var columns = grd.columns;
            arrcolumnName.forEach(function (itm) {
                var index = HQ.grid.findColumnIndex(columns, itm);
                if (index != -1)
                    grd.columns[index].hide();

            });
        },
        show: function (grd, arrcolumnName) {
            var columns = grd.columns;
            arrcolumnName.forEach(function (itm) {
                var index = HQ.grid.findColumnIndex(columns, itm);
                if (index != -1)
                    grd.columns[index].show();
            });
        },
        findColumnIndex: function (columns, dataIndex) {
            var index;
            for (index = 0; index < columns.length; ++index) {
                if (columns[index].dataIndex == dataIndex) { break; }
            }
            return index == columns.length ? -1 : index;
        },
        // Get column text by dataIndex
        findColumnNameByIndex: function (columns, dataIndex) {
            var index = HQ.grid.findColumnIndex(columns, dataIndex);
            return index != -1 ? columns[index].text : dataIndex;
        },

        filterStore: function (store, field, value) {
            store.filterBy(function (record) {
                if (record) {
                    if (record.data[field].toString().toLowerCase() == (HQ.util.passNull(value).toLowerCase())) {
                        return record;
                    }
                }
            });
        },
        filterString: function (record, item) {
            var val = record.get(item.dataIndex);
            if (typeof val != 'string') {
                return (item.getValue().length === 0);
            }
            return val.toLowerCase().unsign().indexOf(item.getValue().toLowerCase().unsign()) > -1;
        },
        filterStringExact: function (record, item) {
            if (item) {
                var val = record.get(item.dataIndex);
                if (typeof val != 'string') {
                    return (item.getValue().length === 0);
                }
                if (item.getValue().constructor === Array) {
                    return val.toLowerCase().unsign() == (item.getValue()[0].toLowerCase().unsign());
                }
                else
                    return val.toLowerCase().unsign() == (item.getValue().toLowerCase().unsign());
            } return false;
        },
        filterComboDescr: function (record, item, store, code, descr) {
            var val = record.get(item.dataIndex);
            if (typeof val != 'string') {
                return (item.getValue().length === 0);
            }
            store.clearFilter();
            var obj = store.findRecord(code, val);
            if (obj) {
                return obj.data[descr].toLowerCase().unsign().indexOf(item.getValue().toLowerCase().unsign()) > -1;
            }
            return val.toLowerCase().unsign().indexOf(item.getValue().toLowerCase().unsign()) > -1;
        },
        headerclickCheckColumn: function (idCol, id, grd, str) {
            if (idCol.events.headerclick.name == undefined) {
                idCol.addListener('headerclick', function (record, item) {
                    if (item.id === "chkActive") {
                        var clazz = $('#chkActive_All').attr('class');
                        var checked = false;

                        if (clazz.indexOf('checkbox-header-checked') != -1) {
                            checked = false;
                            $(id).removeClass('checkbox-header-checked')
                        } else {
                            checked = true;
                            $(id).addClass('checkbox-header-checked')
                        }

                        var store = grd.store;
                        var allRecords = store.allData || store.data;
                        store.suspendEvents();
                        allRecords.each(function (record) {
                            record.set('Check', checked);
                        });
                        store.resumeEvents();

                        grd.view.refresh();
                        if (checked == false) {
                            str = [];
                        }
                    }
                });
            }
            $(id).removeClass('checkbox-header-checked');
        }


    },
    message: {
        show: function (code, parm, fn, array) {
            parm = parm != null ? parm : '';
            if (array == true) {
                App.direct.CallMessageArray(code, parm, fn, {
                    success: function (result) {
                    },
                    failure: function (msg, data) {
                        if (msg.indexOf('SESSIONTIMEOUT') > -1) {
                            if (parent != null)
                                parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                            else Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                            //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        }
                    }
                });
            } else {
                App.direct.CallMessage(code, parm, fn, {
                    success: function (result) {
                    },
                    failure: function (msg, data) {
                        if (msg.indexOf('SESSIONTIMEOUT') > -1) {
                            if (parent != null)
                                parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                            else Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                            //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        }
                    }
                });
            }
        },
        process: function (errorMsg, obj, array) {
            try {
                if (array == null) array = false;
                if (obj.result != undefined) {

                    if (obj.result.type == 'message') {
                        HQ.message.show(obj.result.code, obj.result.parm, obj.result.fn, array);
                    }
                    else if (obj.result.type == "error") {
                        if (obj.result.errorMsg.indexOf("Timeout") > -1)
                            Ext.Msg.alert('Error', HQ.common.getLang("TimeoutSQL"));
                        else SummaryMess(obj.result.errorMsg);
                        //HQ.message.show('1712181724', [obj.result.errorMsg]);
                        //Ext.Msg.alert('99', obj.result.errorMsg);
                    }
                    else if (obj.response.responseText.indexOf('SESSIONTIMEOUT') > -1) {
                        if (parent != null)
                            parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        else Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                    }
                } else if (obj.responseText != undefined) {
                    var data = Ext.decode(obj.responseText);
                    if (obj.responseText.indexOf('SESSIONTIMEOUT') > -1) {
                        if (parent != null)
                            parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        else Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                    }
                    else if (data.type == 'message') {
                        HQ.message.show(data.code, data.parm, data.fn, array);
                    }
                    else if (data.type == "error") {
                        if (obj.errorMsg.indexOf("Timeout") > -1)
                            Ext.Msg.alert('Error', HQ.common.getLang("TimeoutSQL"));
                        else SummaryMess(obj.errorMsg);
                        //HQ.message.show('1712181724', [obj.errorMsg]);
                        //Ext.Msg.alert('99', obj.errorMsg);
                    }
                    else {
                        //Ext.Msg.alert('Error', data);
                        SummaryMess(obj.errorMsg);
                        //HQ.message.show('1712181724', [obj.errorMsg]);
                    }

                } else if (obj.response.responseText != undefined && obj.response.responseText != '') {
                    if (obj.response.responseText.indexOf('SESSIONTIMEOUT') > -1) {
                        if (parent != null)
                            parent.Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        else Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                        //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('SESSIONTIMEOUT'));
                    }
                    else if (obj.response.responseText.indexOf('Blocked a frame with origin') > -1) {
                        SummaryMess(obj.response.responseText);
                        //HQ.message.show('1712181724', [obj.response.responseText]);
                        //Ext.Msg.alert(HQ.common.getLang('Error'), HQ.common.getLang('FailedConnectServer'));
                    }
                    else Ext.Msg.alert('Error', obj.response.responseText);
                } else {
                    if (obj.failureType != undefined) {
                        //Ext.Msg.alert('99', obj.response.responseText);
                        //HQ.message.show('99', obj.response.responseText);
                    }
                }
            }
            catch (e) {
                SummaryMess(errorMsg);

            }

        }
    },
    common: {
        close: function (app) {
            if (app["parentAutoLoadControl"] != undefined) {
                app["parentAutoLoadControl"].close();
            }
        },
        getLang: function (key) {
            if (HQLang[key.toUpperCase()]) {
                return HQLang[key.toUpperCase()];
            } else {
                return key;
            }
        },
        setLang: function (ctr) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (itm.getXType() == "grid") {
                        for (var i = 0; i < itm.columns.length; i++) {
                            if (itm.columns[i].getXType() == "commandcolumn") {
                                itm.columns[i].commands[0].text = HQ.common.getLang(itm.columns[i].commands[0].text);
                            } else {
                                itm.columns[i].setText(HQ.common.getLang(itm.columns[i].text));
                            }
                        }
                    }
                    else if (itm.getXType() == "combobox") {
                        itm.setFieldLabel(HQ.common.getLang(itm.fieldLabel));
                    }
                    else if (itm.getXType() == "textfield") {
                        itm.setFieldLabel(HQ.common.getLang(itm.fieldLabel));
                    }
                    else if (itm.getXType() == "checkbox") {
                        itm.setBoxLabel(HQ.common.getLang(itm.boxLabel));
                    }
                    else if (itm.getXType() == "numberfield") {
                        itm.setFieldLabel(HQ.common.getLang(itm.fieldLabel));
                    }
                    else if (itm.getXType() == "panel") {
                        itm.setTitle(HQ.common.getLang(itm.title));
                    }
                    HQ.common.setLang(itm);
                });
            }

        },
        lockItem: function (ctr, lock) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (typeof (itm.setReadOnly) != "undefined") {
                        if (itm.getTag() != "X")
                            itm.setReadOnly(lock)

                    }
                    else if (typeof (itm.disable) != "undefined" && itm.xtype == 'button') {
                        if (itm.getTag() != "X")
                            if (lock)
                                itm.disable()
                            else itm.enable()
                    }
                    HQ.common.lockItem(itm, lock);
                });
            }
        },
        changeData: function (isChange, screenNbr) {
            if (parent.App['tab' + screenNbr] != undefined)
                if (isChange)
                    parent.App['tab' + screenNbr].setTitle(HQ.common.getLang(screenNbr) + '*');
                else parent.App['tab' + screenNbr].setTitle(HQ.common.getLang(screenNbr));
        },
        showBusy: function (busy, waitMsg, form) {
            if (form == undefined) {
                if (busy) {
                    App.frmMain.body.mask(waitMsg);
                    HQ.isBusy = true;
                } else {
                    App.frmMain.body.unmask();
                    HQ.isBusy = false;
                }
            } else {
                if (busy) {
                    form.body.mask(waitMsg);
                    HQ.isBusy = true;
                } else {
                    form.body.unmask();
                    HQ.isBusy = false;
                }
            }

        },
        setRequire: function (ctr) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (typeof (itm.allowBlank) != "undefined") {
                        itm.validate();
                    }
                    HQ.common.setRequire(itm);
                });
            }
        },
        control_render: function (control, itemfocus) {
            control.getEl().on("click", function () {
                HQ.focus = itemfocus;
            });
        },
        setForceSelection: function (ctr, isForceSelection, cboex) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (typeof (itm.forceSelection) != "undefined") {
                        itm.store.clearFilter();
                        if (cboex != undefined) {
                            if (!HQ.common.contains(cboex.split(','), itm.id)) itm.forceSelection = isForceSelection == undefined ? false : isForceSelection;
                        } else itm.forceSelection = isForceSelection == undefined ? false : isForceSelection;
                    }

                    HQ.common.setForceSelection(itm, isForceSelection, cboex);
                });
            }
        },
        contains: function (a, obj) {
            for (var i = 0; i < a.length; i++) {
                if (a[i] === obj) {
                    return true;
                }
            }
            return false;
        }
        , findControlByDataIndex: function (ctr, value) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (itm.dataIndex == value) {
                        HQ.findItem = itm;
                        return HQ.findItem;
                    }
                    else HQ.common.findControlByDataIndex(itm, value);
                });
            }
            return HQ.findItem;
        }
    },
    util: {
        checkSpecialChar: function (value) {
            var regex = /^[a-zA-Z0-9_-]+$/; //var regex = /^(\w*(\d|[a-zA-Z]))[\_]*$/ 20160913: Cho phép nhập ký tự '-'
            if (!HQ.util.passNull(value.toString()).match(regex))
                return false;
            for (var i = 0, n = value.length; i < n; i++) {
                if (value.charCodeAt(i) > 127) {
                    return false;
                }
            }
            return true;
        },
        checkAccessRight: function () {
            if (HQ.isInsert == false && App.menuClickbtnNew)
                App.menuClickbtnNew.disable();
            if (HQ.isDelete == false && App.menuClickbtnDelete)
                App.menuClickbtnDelete.disable();
            if (HQ.isInsert == false && HQ.isDelete == false && HQ.isUpdate == false && App.menuClickbtnSave)
                App.menuClickbtnSave.disable();
        },
        toBool: function (parm) {
            if (parm.toLowerCase() == 'false') {
                return false;
            } else if (parm.toLowerCase() == 'true') {
                return true;
            } else {
                return false;
            }
        },
        dateToString: function dateToString(date, format) {
            if (date == null) return '';
            if (format == 'm/d/y') {
                return (date.getMonth() + 1).toString() + '/' + date.getDate().toString() + '/' + date.getFullYear().toString();
            }
            return ''

        },
        hexToRGB: function (hex) {
            var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, function (m, r, g, b) {
                return r + r + g + g + b + b;
            });

            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        passNull: function (str) {
            if (str == null) {
                return "";
            } else return str;
        },
        focusControl: function () {
            if (App[invalidField] && !App[invalidField].hasFocus) {
                var tab = App[invalidField].findParentByType('tabpanel');
                if (tab == undefined) {
                    App[invalidField].focus();
                }
                else {
                    HQ.util.focusControlInTab(tab, invalidField);
                }
            }
        },
        focusControlInTab: function (ctr, field) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (typeof (ctr.setActiveTab) != "undefined" && !App[field].hasFocus) {
                        ctr.setActiveTab(App[itm.id]);
                    }
                    if (itm.id == field) {
                        App[field].focus();
                        return true;
                    }
                    HQ.util.focusControlInTab(itm, field);
                });
            }
        },
        checkEmail: function (value) {
            var regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
            if ((HQ.util.passNull(value)).match(regex)) {
                return true;
            } else {
                HQ.message.show(9112014, '', null);
                return false;
            }
        },
        mathRound: function (value, exp) {
            return decimalAdjust('round', value, exp);
        },
        mathFloor: function (value, exp) {
            return decimalAdjust('floor', value, exp);
        },
        mathCeil: function (value, exp) {
            return decimalAdjust('ceil', value, exp);
        },

        checkStrUnicode: function (str) {
            for (var i = 0, n = str.length; i < n; i++) {
                if (str.charCodeAt(i) > 127) {
                    return true;
                }
            }
            return false;
        }

    },
    form: {
        checkRequirePass: function (frm) {
            //frm.updateRecord();
            var isValid = true;
            frm.getForm().getFields().each(
                            function (item) {
                                if (!item.isValid()) {
                                    invalidField = item.id;
                                    HQ.message.show(1000, item.fieldLabel, 'HQ.util.focusControl');
                                    isValid = false;
                                    return false;
                                }
                                else {//PhucHD check value có chứa mã HTML
                                    if (item.value) {
                                        var regex = /<[/a-zA-Z][\s\S]*>/
                                        if (HQ.util.passNull(item.value.toString()).match(regex)) {
                                            invalidField = item.id;
                                            HQ.message.show(2016101010, item.fieldLabel, 'HQ.util.focusControl');
                                            isValid = false;
                                            return false;
                                        }
                                    }
                                }
                            })
            return isValid;
        },
        lockButtonChange: function (isChange, frmMain) {
            frmMain.menuClickbtnFirst.setDisabled(isChange);
            frmMain.menuClickbtnNext.setDisabled(isChange);
            frmMain.menuClickbtnLast.setDisabled(isChange);
            frmMain.menuClickbtnPrev.setDisabled(isChange);
            frmMain.menuClickbtnNew.setDisabled(isChange);
            frmMain.menuClickbtnDelete.setDisabled(isChange);
        }
    },
    tooltip: {
        // TinhHV: show the tootip in grid
        showOnGrid: function (toolTip, grid, isHtmlEncode) {
            var view = grid.getView(),
            store = grid.getStore(),
            record = view.getRecord(view.findItemByChild(toolTip.triggerElement)),
            column = view.getHeaderByCell(toolTip.triggerElement),
            data = record.get(column.dataIndex);

            if (data) {
                if (isHtmlEncode) {
                    toolTip.update(Ext.util.Format.htmlEncode(data));
                }
                else {
                    toolTip.update(data);
                }
            }
            else {
                toolTip.hide();
            }
        }
    }
};

HQ.waitMsg = HQ.common.getLang('waitMsg');
var FilterCombo = function (control, stkeyFilter) {
    var filtersAux = [];
    if (control) {
        control.suspendEvents();
        var store = control.getStore();
        store.suspendEvents();
        var valueArray = HQ.util.passNull(control.getRawValue()).toString().split(control.delimiter);
        var value = '';
        if (valueArray.length > 0) value = valueArray[valueArray.length - 1];//value.split(',')[value.split(',').length-1];
        if (store) {
            // get filter
            store.filters.items.forEach(function (item) {
                if (item.id != control.id + '-query-filter') {
                    if (item.property && item.value)
                        filtersAux.push(item);
                }
            });
            store.clearFilter();
            filtersAux.forEach(function (item) {
                store.filter(item.property, item.value);
            });
            if (control.valueModels == null || control.valueModels.length == 0) {
                store.filter(function (record, id) {
                    var isMap = false;
                    var strFind = '';
                    if (record) {
                        stkeyFilter.split(',').forEach(function (key) {
                            if (key) {
                                if ((typeof HQ.util.passNull(value)) == "string") {
                                    if (record.data[key]) {
                                        strFind += record.data[key].toString().toLowerCase().unsign();
                                    }
                                }
                            }
                        });
                        var valuearr = value.split(':');
                        isMap = true;
                        for (var i = 0; i < valuearr.length; i++) {
                            var fieldData = strFind.indexOf(HQ.util.passNull(valuearr[i]).toLowerCase().unsign());
                            if (fieldData < 0) {
                                isMap = false;
                                return;
                            }
                        }
                        return isMap;
                    }
                    else return false;
                });
            }

        }
        store.resumeEvents();
        control.resumeEvents();
        control.getPicker().refresh();
        control.expand();
    }
};

function FilterCombo_BeforeSelect(control, itemselect) {
    if (control.multiSelect && control.hasFocus)//gán lại giá trị đã chọn
    {
        var filtersAux = [];
        var store = control.store;
        store.suspendEvents();
        // get filter
        if (store.filters)
            store.filters.items.forEach(function (item) {
                if (item.id != control.id + '-query-filter') {
                    filtersAux.push(item);
                }
            });
        store.clearFilter();
        filtersAux.forEach(function (item) {
            store.filter(item._id, item._filterValue);
        });
        var allData = store.allData || store.data;
        var valueArray = HQ.util.passNull(control.getRawValue()).toString().split(control.delimiter);
        var lstRecordSelect = [];
        allData.each(function (item) {
            var index = valueArray.indexOf(item.data[control.displayField]);
            if (index > -1) {
                lstRecordSelect.push(item.data[control.valueField]);
                valueArray.splice(index, 1);
                if (valueArray.length == 0) return;
            }
        });
        lstRecordSelect.push(itemselect.data[control.valueField]);
        control.setValue(lstRecordSelect);
        store.resumeEvents();
    }
}
var loadDefault = function (fileNameStore, cbo) {
    if (fileNameStore.data.items.length > 0) {
        cbo.setValue(fileNameStore.getAt(0).get(cbo.valueField));

    }
};
//MathRound 2015-03-24
// Closure
function decimalAdjust(type, value, exp) {
    exp = exp * -1;
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

//TrungHT override control ext
Ext.define("NumbercurrencyPrecision", {
    override: "Ext.util.Format.Number",
    currencyPrecision: 0
});
Ext.define("ThousandSeparatorNumberField", {
    override: "Ext.form.field.Number",

    /**
    * @cfg {Boolean} useThousandSeparator
    */
    useThousandSeparator: true,
    selectOnFocus: true,
    style: 'text-align: right',
    fieldStyle: "text-align:right;",
    /**
     * @inheritdoc
     */
    //dung cho page

    toRawNumber: function (value) {
        this.decimalPrecision = this.cls == "x-tbar-page-number" ? 0 : this.decimalPrecision;
        return String(value).replace(this.decimalSeparator, '.').replace(new RegExp(Ext.util.Format.thousandSeparator, "g"), '');
    },

    /**
     * @inheritdoc
     */
    getErrors: function (value) {
        if (!this.useThousandSeparator)
            return this.callParent(arguments);
        var me = this,
            errors = Ext.form.field.Text.prototype.getErrors.apply(me, arguments),
            format = Ext.String.format,
            num;

        value = Ext.isDefined(value) ? value : this.processRawValue(this.getRawValue());

        if (value.length < 1) { // if it's blank and textfield didn't flag it then it's valid
            return errors;
        }

        value = me.toRawNumber(value);

        if (isNaN(value.replace(Ext.util.Format.thousandSeparator, ''))) {
            errors.push(format(me.nanText, value));
        }

        num = me.parseValue(value);

        if (me.minValue === 0 && num < 0) {
            errors.push(this.negativeText);
        }
        else if (num < me.minValue) {
            errors.push(format(me.minText, me.minValue));
        }

        if (num > me.maxValue) {
            errors.push(format(me.maxText, me.maxValue));
        }

        return errors;
    },

    /**
     * @inheritdoc
     */
    valueToRaw: function (value) {
        if (!this.useThousandSeparator)
            return this.callParent(arguments);
        var me = this;

        var format = "000,000";
        for (var i = 0; i < me.decimalPrecision; i++) {
            if (i == 0)
                format += ".";
            format += "0";
        }
        value = me.parseValue(Ext.util.Format.number(value, format));
        value = me.fixPrecision(value);
        value = Ext.isNumber(value) ? value : parseFloat(me.toRawNumber(value));
        value = isNaN(value) ? '' : String((value < 0 ? '-' : '') + Ext.util.Format.number(value < 0 ? value * -1 : value, format)).replace('.', me.decimalSeparator);
        return value;
    },

    /**
     * @inheritdoc
     */
    getSubmitValue: function () {
        if (!this.useThousandSeparator)
            return this.callParent(arguments);
        var me = this,
            value = me.callParent();

        if (!me.submitLocaleSeparator) {
            value = me.toRawNumber(value);
        }
        return value;
    },

    /**
     * @inheritdoc
     */
    setMinValue: function (value) {
        if (!this.useThousandSeparator)
            return this.callParent(arguments);
        var me = this,
            allowed;

        me.minValue = Ext.Number.from(value, Number.NEGATIVE_INFINITY);
        me.toggleSpinners();

        // Build regexes for masking and stripping based on the configured options
        if (me.disableKeyFilter !== true) {
            allowed = me.baseChars + '';

            if (me.allowExponential) {
                allowed += me.decimalSeparator + 'e+-';
            }
            else {
                allowed += Ext.util.Format.thousandSeparator;
                if (me.allowDecimals) {
                    allowed += me.decimalSeparator;
                }
                if (me.minValue < 0) {
                    allowed += '-';
                }
            }

            allowed = Ext.String.escapeRegex(allowed);
            me.maskRe = new RegExp('[' + allowed + ']');
            if (me.autoStripChars) {
                me.stripCharsRe = new RegExp('[^' + allowed + ']', 'gi');
            }
        }
    },

    /**
     * @private
     */
    parseValue: function (value) {
        if (!this.useThousandSeparator)
            return this.callParent(arguments);
        value = parseFloat(this.toRawNumber(value));
        return isNaN(value) ? null : value;
    }
});

Ext.define("Ext.locale.vn.toolbar.Paging", {
    override: "Ext.PagingToolbar",
    lable: HQ.common.getLang("PageSize"),
    beforePageText: HQ.common.getLang("Page"),
    afterPageText: HQ.common.getLang("of") + " {0}",
    firstText: HQ.common.getLang("PageFirst"),
    prevText: HQ.common.getLang("PagePrev"),
    nextText: HQ.common.getLang("PageNext"),
    lastText: HQ.common.getLang("PageLast"),
    refreshText: HQ.common.getLang("PageRefresh"),
    displayMsg: HQ.common.getLang("Displaying") + " {0} - {1} " + HQ.common.getLang("of") + " {2}",
    emptyMsg: HQ.common.getLang("DataEmpty")
});
Ext.define("HQRowNumberer", {
    override: "Ext.grid.column.RowNumberer",
    width: 35
});
Ext.define("HQCheckboxModel", {
    override: "Ext.selection.CheckboxModel",
    headerWidth:30
});
Ext.define('HQFieldBase', {
    override: 'Ext.form.field.Base',

    initLabelable: function () {
        this.callParent(arguments);
        if (this.fieldLabel) {
            this.labelSeparator = '&nbsp';
        }
    },
});
//window.onresize = function () {
//    if ((window.outerHeight - window.innerHeight) > 100) {
//        alert('Docked inspector was opened');
//        if (parent != undefined)
//            parent.location = 'Login';
//        else window.location = 'Login';

//    }
//};
//window.onload = function () {
//    if ((window.outerHeight - window.innerHeight) > 100) {
//        alert('Docked inspector was opened');
//        if (parent != undefined)
//            parent.location = 'Login';
//        else window.location = 'Login';

//    }
//};