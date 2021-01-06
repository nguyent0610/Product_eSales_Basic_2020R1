
var HQ = {

    control: {
        useThousand: function () {
            //TrungHT 
            Ext.define("ThousandSeparatorNumberField", {
                override: "Ext.form.field.Number",

                /**
                * @cfg {Boolean} useThousandSeparator
                */
                useThousandSeparator: true,
                //decimalPrecision: 0,
                style: 'text-align: right',
                fieldStyle: "text-align:right;",
                /**
                 * @inheritdoc
                 */
                toRawNumber: function (value) {
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



        }
    },
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
        insertBlank: function (store, key) {
            if (key == undefined) {
                store.insert(store.getCount(), Ext.data.Record());
            } else {
                var flat = store.findBy(function (record, id) {
                    if (!record.get(key)) {
                        return true;
                    }
                    return false;
                });

                if (flat == -1) {
                    store.insert(store.getCount(), Ext.data.Record());
                }
            }
        },
        insertRecord: function (store, key, newRecord) {
            var flat = store.findBy(function (record, id) {
                if (!record.get(key)) {
                    return true;
                }
                return false;
            });

            if (flat == -1) {
                store.insert(store.getCount(), newRecord);
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
        }
    },
    grid: {
        insert: function (grd) {
            var store = grd.getStore();
            var createdItems = store.getChangedData().Created;
            if (createdItems != undefined) {
                store.loadPage(Math.ceil(store.totalCount / store.pageSize), {
                    callback: function () {
                        HQ.grid.last(grd);
                        grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });
                    }
                });
                return;
            }
            store.loadPage(Math.ceil(store.totalCount / store.pageSize), {
                callback: function () {
                    HQ.store.insertBlank(store);
                    HQ.grid.last(grd);
                    grd.editingPlugin.startEditByPosition({ row: store.getCount() - 1, column: 1 });
                }
            });
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
        checkDuplicate: function (grd, row, keys) {
            var found = false;
            var store = grd.getStore();
            if (keys == undefined) keys = row.record.idProperty.split(',');
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
            return found;
        }
    },
    message: {
        show: function (code, parm, fn, array) {
            if (array == true) {
                App.direct.CallMessageArray(code, Ext.encode(parm), fn, {
                    success: function (result) {
                    },
                    failure: function (msg, data) {
                    }
                });
            } else {
                App.direct.CallMessage(code, Ext.encode(parm), fn, {
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
            if (HQLang[key] != undefined) {
                return HQLang[key];
            } else {
                return key;
            }
        },
        lockItem: function (ctr, lock) {
            if (typeof (ctr.items) != "undefined") {
                ctr.items.each(function (itm) {
                    if (typeof (itm.setReadOnly) != "undefined") {
                        itm.setReadOnly(lock)

                    }
                    lockItem(itm, lock);
                });
            }
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
        if (store) {
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
        }
    }
};