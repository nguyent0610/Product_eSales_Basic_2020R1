Ext.net.ResourceMgr.init({
    isMVC: true
});
Ext.onReady(function () {
    Ext.ns("App.direct");
    Ext.apply(App.direct, {
        CallMessageTimeOut: function (config) {
            return Ext.net.DirectMethod.request("CallMessageTimeOut", Ext.applyIf(config || {}, {
                url: "HQ/CallMessageTimeOut"
            }));
        },
        CallMessage: function (code, parm, fn, config) {
            return Ext.net.DirectMethod.request("CallMessage", Ext.applyIf(config || {}, {
                params: {
                    code: code,
                    parm: parm,
                    fn: fn
                },
                url: "HQ/CallMessage"
            }));
        },
        CallMessageArray: function (code, parm, fn, config) {
            return Ext.net.DirectMethod.request("CallMessageArray", Ext.applyIf(config || {}, {
                params: {
                    code: code,
                    parm: parm,
                    fn: fn
                },
                url: "HQ/CallMessageArray"
            }));
        },
        PlayMedia: function (PathVideo, fileVideo, config) {
            return Ext.net.DirectMethod.request("PlayMedia", Ext.applyIf(config || {}, {
                params: {
                    PathVideo: PathVideo,
                    fileVideo: fileVideo
                },
                url: "HQ/PlayMedia"
            }));
        },
        OM10100GetNote: function (branchID, orderNbr, config) {
            return Ext.net.DirectMethod.request("OM10100GetNote", Ext.applyIf(config || {}, {
                params: {
                    branchID: branchID,
                    orderNbr: orderNbr
                },
                url: "OM10100/OM10100GetNote"
            }));
        },
        OM10100UpdateNote: function (branchID, orderNbr, noteText, config) {
            return Ext.net.DirectMethod.request("OM10100UpdateNote", Ext.applyIf(config || {}, {
                params: {
                    branchID: branchID,
                    orderNbr: orderNbr,
                    noteText: noteText
                },
                url: "OM10100/OM10100UpdateNote"
            }));
        }
    });
    Ext.create("Ext.window.Window", {
        id: "winPopup",
        hidden: false,
        renderTo: Ext.getBody(),
        width: 350,
        resizable: false,
        defaultButton: "btnPopupOk",
        items: [{
            id: "cboPopupCpny",
            margin: "10 0 10 0",
            width: 320,
            xtype: "combobox",
            fieldLabel: HQ.common.getLang('BRANCHNAME'),
            labelAlign: "right",
            name: "BranchID",
            allowBlank: false,
            matchFieldWidth: false,
            delimiter: ",",
            displayField: "BranchName",
            forceSelection: true,
            labelWidth: 120,
            listConfig: {
                height: 500,
                tpl: Ext.create("Ext.net.XTemplate", {
                    html: ["<tpl for='.'>", "<tpl if='[xindex] == 1'>", "<table style='table-layout: fixed; max-width:650px !important'>", "<tr>", "<th style='min-width:110px;'>" + HQ.common.getLang('BRANCHID') + "</th>", "<th style='min-width:150px;'>" + HQ.common.getLang('BRANCHNAME') + "</th>", "<th>" + HQ.common.getLang('ADDR') + "</th>", "</tr>", "</tpl>", "<tr class='x-boundlist-item'>", "<td>{BranchID}</td>", "<td>{BranchName}</td>", "<td>{Addr}</td>", "</tr>", "<tpl if='[xcount-xindex] == 0'>", "</table>", "</tpl>", "</tpl>"]
                }),
                itemSelector: ".x-boundlist-item",
                loadingText: HQ.common.getLang('LOADING')
            },
            valueField: "BranchID",
            store: {
                model: Ext.define(Ext.id(), {
                    extend: "Ext.data.Model",
                    fields: [{
                        name: "BranchID",
                        mapping: "BranchID",
                        type: "string"
                    }, {
                        name: "BranchName",
                        mapping: "BranchName",
                        type: "string"
                    }, {
                        name: "Addr",
                        mapping: "Addr",
                        type: "string"
                    }]
                }),
                storeId: "cboPopupCpnyOM10100_pcBranch",
                autoLoad: true,
                readParameters: function (operation) {
                    return {
                        apply: {
                            "param0": HQ.userName,
                            "procName": "OM10100_pcBranch",
                            "procParam": "@UserID,",
                            "sys": "False"
                        }
                    };
                },
                proxy: {
                    type: "ajax",
                    reader: {
                        type: "json",
                        root: "data",
                        totalProperty: "totaldata"
                    },
                    timeout: 2147483647,
                    url: "HQ/GetData",
                    actionMethods: Ext.apply({}, {
                        read: "POST"
                    }, Ext.data.proxy.Ajax.prototype.actionMethods)
                }
            },
            listeners: {
                beforequery: {
                    fn: function (queryEvent) {
                        FilterCombo(this, 'BranchID,BranchName,Addr')
                    }
                }
            }
        }],
        buttons: [{
            id: "btnPopupOk",
            text: HQ.common.getLang('OK'),
            listeners: {
                click: {
                    fn: btnPopupOk_Click
                }
            }
        }],
        title: HQ.common.getLang('SELBRANCHID')
    });
});