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

if (!('forEach' in Array.prototype)) {
    Array.prototype.forEach = function (action, that /*opt*/) {
        for (var i = 0, n = this.length; i < n; i++)
            if (i in this)
                action.call(that, this[i], i, this);
    };
}
var HQ = {
    store: {
        isChange: function (store) {
            if ((store.getChangedData().Created != undefined && store.getChangedData().Created.length > 1)
                || store.getChangedData().Updated != undefined
                || store.getChangedData().Deleted != undefined) {
                return true;
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
                store.commitChanges();
            }
        },
        getData: function (store, skip) {
            if (Ext.isEmpty(skip)) {
                skip = false;
            }
            return Ext.encode(store.getChangedData({ skipIdForPhantomRecords: skip }));
        },
        findInStore: function (store, fields, values) {
            var data;
            store.data.each(function (item) {
                var intT = 0;
                for (var i = 0; i < fields.length; i++) {
                    if (item.get(fields[i]) == values[i]) {
                        intT++;
                    }
                }
                if (intT == fields.length) {
                    data = item.data;
                    return false;
                }
            });
            return data;
        },
        findRecord: function (store, fields, values) {
            var data;
            store.data.each(function (item) {
                var intT = 0;
                for (var i = 0; i < fields.length; i++) {
                    if (item.get(fields[i]) == values[i]) {
                        intT++;
                    }
                }
                if (intT == fields.length) {
                    data = item;
                    return false;
                }
            });
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
                                if (items[i][fieldsCheck[k]].toString().trim() == "") {
                                    HQ.message.show(15, HQ.common.getLang(fieldsLang == undefined ? fieldsCheck[k] : fieldsLang[k]));
                                    return false;
                                }
                            }
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
                                if (items[i][fieldsCheck[k]].toString().trim() == "") {
                                    HQ.message.show(15, HQ.common.getLang(fieldsLang == undefined ? fieldsCheck[k] : fieldsLang[k]));
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
            return true;
        }
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
                //if (store.currentPage != Math.ceil(store.totalCount / store.pageSize)) {
                store.loadPage(Math.ceil(store.totalCount / store.pageSize), {
                    callback: function () {
                        //HQ.grid.last(grd);
                        setTimeout(function () { grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 }); }, 300);
                    }
                });
                //}
                //else {
                //    HQ.grid.last(grd);
                //    grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });
                //}
                return;
            }
            //if (store.currentPage != Math.ceil(store.totalCount / store.pageSize)) {
            store.loadPage(Math.ceil(store.totalCount / store.pageSize), {
                callback: function () {
                    if (HQ.grid.checkRequirePass(store.getChangedData().Updated, keys)) {
                        HQ.store.insertBlank(store, keys);
                    }
                    //HQ.grid.last(grd);
                    setTimeout(function () { grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 }); }, 300);
                }
            });
            //}
            //else {
            //    if (HQ.grid.checkRequirePass(store.getChangedData().Updated, keys)) {
            //        HQ.store.insertBlank(store, keys);
            //    }
            //    HQ.grid.last(grd);
            //    grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });
            //}
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
            store.reload();
        },
        indexSelect: function (grd) {
            var index = '';
            var arr = grd.getSelectionModel().getSelection();
            arr.forEach(function (itm) {
                index += (itm.index == undefined ? grd.getStore().totalCount : itm.index + 1) + ',';
            });

            return index.substring(0, index.length - 1);
        },
        checkDuplicate: function (grd, row, keys) {
            var found = false;
            var store = grd.getStore();
            if (keys == undefined) keys = row.record.idProperty.split(',');
            if (store.data) {
                for (var i = 0; i < store.data.items.length; i++) {
                    var record = store.data.items[i];
                    var data = '';
                    var rowdata = '';
                    for (var jkey = 0; jkey < keys.length; jkey++) {
                        if (record.data[keys[jkey]] != undefined) {
                            data += record.data[keys[jkey]].toString().toLowerCase() + ',';
                            if (row.field == keys[jkey])
                                rowdata += (row.value == null ? "" : row.value.toString().toLowerCase()) + ',';
                            else
                                rowdata += row.record.data[keys[jkey]].toString().toLowerCase() + ',';
                        }
                    }
                    if (found = (data == rowdata && record.id != row.record.id) ? true : false) {
                        break;
                    };
                }
            }
            else {
                for (var i = 0; i < store.allData.items.length; i++) {
                    var record = store.allData.items[i];
                    var data = '';
                    var rowdata = '';
                    for (var jkey = 0; jkey < keys.length; jkey++) {
                        if (record.data[keys[jkey]] != undefined) {
                            data += record.data[keys[jkey]].toString().toLowerCase() + ',';
                            if (row.field == keys[jkey])
                                rowdata += (row.value == null ? "" : row.value.toString().toLowerCase()) + ',';
                            else
                                rowdata += row.record.data[keys[jkey]].toString().toLowerCase() + ',';
                        }
                    }
                    if (found = (data == rowdata && record.id != row.record.id) ? true : false) {
                        break;
                    };
                }
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
                    if (row.record.data[keys[jkey]] == "") {
                        return false;
                    }
                }
            }
            if (keys.indexOf(row.field) != -1) {
                for (var jkey = 0; jkey < keys.length; jkey++) {
                    if (row.record.data[keys[jkey]] == "") return true;
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
            if (!HQ.isUpdate) return false;
            if (keys.indexOf(e.field) != -1) {
                if (e.record.data.tstamp != "")
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
        checkValidateEdit: function (grd, e, keys) {
            if (keys.indexOf(e.field) != -1) {
                var regex = /^(\w*(\d|[a-zA-Z]))[\_]*$/
                if (!HQ.util.passNull(e.value) == '' && !HQ.util.passNull(e.value).match(regex)) {
                    HQ.message.show(20140811, e.column.text);
                    return false;
                }
                if (HQ.grid.checkDuplicate(grd, e, keys)) {
                    HQ.message.show(1112, e.value);
                    return false;
                }

            }
        },
        checkInsertKey: function (grd, e, keys) {
            if (keys.indexOf(e.field) != -1) {
                if (e.value != '')
                    HQ.store.insertBlank(grd.getStore(), keys);
            }
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
                    }
                });
            } else {
                App.direct.CallMessage(code, parm, fn, {
                    success: function (result) {
                    },
                    failure: function (msg, data) {
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
                        Ext.Msg.alert('Error', obj.result.errorMsg);
                    }
                } else if (obj.responseText != undefined) {
                    var data = Ext.decode(obj.responseText);
                    if (data.type == 'message') {
                        HQ.message.show(data.code, data.parm, data.fn, array);
                    }
                    else if (data.type == "error") {
                        Ext.Msg.alert('Error', obj.errorMsg);
                    }
                    else {
                        Ext.Msg.alert('Error', data);
                    }

                } else if (obj.response.responseText != undefined) {
                    Ext.Msg.alert('Error', obj.response.responseText);
                } else {
                    if (obj.failureType != undefined) {
                        Ext.Msg.alert('Error', HQ.common.getLang("FailedConnectServer"));
                    }
                }
            }
            catch (e) {
                Ext.Msg.alert('Error', errorMsg);
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
                    HQ.common.lockItem(itm, lock);
                });
            }
        },
        changeData: function (isChange, screenNbr) {
            if (parent.App['tab' + screenNbr] != undefined)
                if (isChange)
                    parent.App['tab' + screenNbr].setTitle(HQ.common.getLang(screenNbr) + '(' + screenNbr + ')*');
                else parent.App['tab' + screenNbr].setTitle(HQ.common.getLang(screenNbr) + '(' + screenNbr + ')');
        },
        showBusy: function (busy, waitMsg, form) {
            if (form == undefined) {
                if (busy) {
                    App.frmMain.body.mask(waitMsg);
                } else {
                    App.frmMain.body.unmask();
                }
            } else {
                if (busy) {
                    form.body.mask(waitMsg);
                } else {
                    form.body.unmask();
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
    },
    util: {
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
                HQ.message.show(09112014, '', null);
                return false;
            }
        }
    },
    form: {
        checkRequirePass: function (frm) {
            frm.updateRecord();
            var isValid = true;
            frm.getForm().getFields().each(
                            function (item) {
                                if (!item.isValid()) {
                                    invalidField = item.id;
                                    HQ.message.show(1000, item.fieldLabel, 'HQ.util.focusControl');
                                    isValid = false;
                                    return false;
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
    if (control) {
        var store = control.getStore();
        var value = HQ.util.passNull(control.getValue()).toString();
        if (value.split(',').length > 1) value = '';//value.split(',')[value.split(',').length-1];
        if (value.split(';').length > 1) value = '';//value.split(';')[value.split(',').length - 1];
        if (store) {
            var filtersAux = [];
            // get filter
            store.filters.items.forEach(function (item) {
                if (item.id != control.id + '-query-filter') {
                    filtersAux.push(item);
                }
            });
            store.clearFilter();
            if (control.valueModels == null || control.valueModels.length == 0) {
                store.filterBy(function (record) {
                    if (record) {
                        var isMap = false;
                        stkeyFilter.split(',').forEach(function (key) {
                            if (key) {
                                if ((typeof HQ.util.passNull(value)) == "string") {
                                    if (record.data[key]) {
                                        var fieldData = record.data[key].toString().toLowerCase().indexOf(HQ.util.passNull(value).toLowerCase());
                                        if (fieldData > -1) {
                                            isMap = true;
                                            return record;
                                        }
                                    }
                                }
                            }
                        });
                        if (isMap == true) return record
                    }
                });
            }
            filtersAux.forEach(function (item) {
                store.filter(item.property, item.value);
            });
        }
    }
};
var loadDefault = function (fileNameStore, cbo) {
    if (fileNameStore.data.items.length > 0) {
        cbo.setValue(fileNameStore.getAt(0).get(cbo.valueField));

    }
};
//TrungHT
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
        value = isNaN(value) ? '' : String(Ext.util.Format.number(value, format)).replace('.', me.decimalSeparator);
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
    emptyMsg: HQ.common.getLang("DataEmty")
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