HQ.Role;
var _prevHideColumns = '';
var _Source = 0;
var _maxSource = 3;
var _masterSource = 0;
var _maxMasterSource = 6;
var _imageType = '';
var _selOrderNbr = '';
var _docBranchID = '';
var _loadData = true;
var _firstSelTabHis = true;
var _firstSelTabCalcPromo = true;
var _indexOrd = 0;
var _calcID = 0;
var _isApproveAll = false;
var _isAllManualPromoOrDisplay = false;
HQ.currOrder;
var _confirmed = false;
var _isShowedPopupWinOrder = false;
var lstSelected = [];
var kmTienDu = 'KMTienDu';
var _budgetStatus = 0;
var _askOrderNbr = '';
var _lstInvt = [];
var _lstFree = [];
var _payMethod = '';
var _calcPromo = false;
var changeQty = false;
var _recordOrder = null;
var _slsperID = "";
var _custID = "";
var _orderDate = new Date();
var _totalAmt = 0;
var _orderNbr = "";
var _isManual = false;
var Process = {

    getCheckedOrder: function (grid) {
        var orders = [];
        grid.store.each(function (item) {
            if (item.data.Selected) {
                orders.push(item.data.OrderNbr);
            }
        });
        return orders.join(",");
    },
    processOrderDet: function (recordOrderNbr, remove) {
        var storeDet = App.stoDet4Save;
        if (!remove) {
            storeDet.data.each(function (item) {
                if (item.data.OrderNbr == recordOrderNbr.OrderNbr) {
                    var qtyShip1 = 0, qtyShip2 = 0, qtyShip = 0;
                    if (recordOrderNbr.EditColumn.split(',')[0] == 'QtyShip') {
                        qtyShip = item.data[recordOrderNbr.CheckQty];
                        qtyShip1 = item.data[recordOrderNbr.CheckQty + '1'];
                        qtyShip2 = item.data[recordOrderNbr.CheckQty + '2'];
                    }
                    else {
                        qtyShip = item.data[recordOrderNbr.CheckQty] - item.data.QtyShipped;
                        qtyShip1 = item.data[recordOrderNbr.CheckQty + '1'] - item.data.QtyShipped1;
                        qtyShip2 = item.data[recordOrderNbr.CheckQty + '2'] - item.data.QtyShipped2;
                    }
                    item.set(recordOrderNbr.EditColumn.split(',')[0], qtyShip);
                    item.set(recordOrderNbr.EditColumn.split(',')[0] + '1', qtyShip1);
                    item.set(recordOrderNbr.EditColumn.split(',')[0] + '2', qtyShip2);
                    if (qtyShip1 > 0 || qtyShip2 > 0) {
                        item.set("Selected", 1);
                    }
                    else {
                        item.set("Selected", 0);
                    }

                    item.commit();
                }
            });
        }
        else {
            storeDet.data.each(function (item) {
                if (item.data.OrderNbr == recordOrderNbr.OrderNbr) {
                    item.set("Selected", 0);
                    item.commit();
                }
            });
            if (App.stoHisOrdCalcPromo.data.length > 0) {
                App.stoHisOrdCalcPromo.data.each(function (item) {
                    item.set("SelOrder", 0);
                    item.commit();
                });
            }
        } 
    }
    , deleteData : function (item) {
        if (item == "yes") {
            var objToStatus=HQ.store.findRecord(App.stoOrder,['Selected','ToStatus'],[true,'C']);
            if (objToStatus) {//RELEASE MOI POP CHO CHON THONG TIN
                App.cboDelivery.setValue('');
                App.dteShipDate.setValue(HQ.bussinessDate);
                App.dteARDocDate.setValue(HQ.bussinessDate);
                App.chkAddStock.setValue(false);
                App.winOrder.show();
            } else {
                save();
            }
        }
    }
    , calcHeader: function (objH) {
          
    }
    , calcHeaderHis: function (objH) {
        
    }
};
var tabInfo_TabChange = function (obj) {
    if (_firstSelTabHis && HQ.Role && obj.activeTab.id == "tabHist") {
        _firstSelTabHis = false;
        if (HQ.Role.ShowDfltSOUnitStkUnit) {
            HQ.grid.hide(App.grdHisOrd, ['OrdQty']);
            HQ.grid.hide(App.grdHisDet, ['LineQty', 'SlsUnit']);
            HQ.grid.show(App.grdHisOrd, ['OrdQty1', 'OrdQty2']);
            HQ.grid.show(App.grdHisDet, ['LineQty1', 'LineQty2']);
        } else {

            HQ.grid.show(App.grdHisOrd, ['OrdQty']);
            HQ.grid.show(App.grdHisDet, ['LineQty','SlsUnit']);
            HQ.grid.hide(App.grdHisOrd, ['OrdQty1', 'OrdQty2']);
            HQ.grid.hide(App.grdHisDet, ['LineQty1', 'LineQty2']);
        }
    }
    if (_firstSelTabCalcPromo && HQ.Role && obj.activeTab.id == "tabHistCalcPromo") {
        _firstSelTabCalcPromo = false;
        if (HQ.Role.ShowDfltSOUnitStkUnit) {
            HQ.grid.hide(App.grdHisOrdCalcPromo, ['OrdQty']);
            HQ.grid.hide(App.grdHisDetCalcPromo, ['LineQty', 'SlsUnit']);
            HQ.grid.show(App.grdHisOrdCalcPromo, ['OrdQty1', 'OrdQty2']);
            HQ.grid.show(App.grdHisDetCalcPromo, ['LineQty1', 'LineQty2']);
        } else {
            HQ.grid.show(App.grdHisOrdCalcPromo, ['OrdQty']);
            HQ.grid.show(App.grdHisDetCalcPromo, ['LineQty', 'SlsUnit']);
            HQ.grid.hide(App.grdHisOrdCalcPromo, ['OrdQty1', 'OrdQty2']);
            HQ.grid.hide(App.grdHisDetCalcPromo, ['LineQty1', 'LineQty2']);
        }
    }
}
var Store = {
    stoOrder_load: function (sto, records, successful, eOpts) {
        if (sto.data.length == 0 || App.stoOrder.data.length == 0) {
            HQ.common.showBusy(false);
        }
        if (App.stoOrder.data.length != 0) {
            if (_indexOrd < App.stoOrder.data.length && _indexOrd > -1) {
                App.slmOrder.select(_indexOrd);
            } else {
                App.slmOrder.select(0);
            }
        }
        if (_loadData) {
            App.stoDoc.reload();
            _loadData = false;
            App.stoDet4Save.removeAll();                
        }
        App.stoDet.removeAll();
        App.grdDet.view.refresh();
        App.dteShipDate.setValue(HQ.bussinessDate);
        App.dteARDocDate.setValue(HQ.bussinessDate);

        App.stoOrderCheck.data.items.forEach(function (item) {
            var record = HQ.store.findRecord(App.stoOrder, ["BranchID", "OrderNbr"], [item.data.BranchID, item.data.OrderNbr]);
            if (record != undefined) {
                record.set("Selected", true);
            }
        });
        setTimeout(function () {
            App.stoOrderCheck.removeAll();
        }, 200);

       
    }, 

    stoDet_load: function (sto, records, successful, eOpts) {       
        var recordOrder = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [_selOrderNbr]);
        if (recordOrder) {
            for (var i = 0; i < sto.data.length; i++) {
                if (recordOrder.data.OutOfStockLineRef.indexOf(sto.data.items[i].data.LineRef) >= 0) {
                    sto.data.items[i].data.OutOfStockColor = true;
                }                
                App.stoDet4Save.add(sto.data.items[i]);
            }
            Process.processOrderDet(recordOrder.data, !recordOrder.data.Selected);
        }
        App.frmMain.unmask();
        setTimeout(function () {
            if (_isManual) {
                var record = HQ.store.findRecord(App.stoOrder, ["BranchID", "OrderNbr"], [_recordOrder.data.BranchID, _recordOrder.data.OrderNbr]);
                if (record != undefined) {
                    record.set("Selected", true);
                    record.set("ForceCalcPromo", true);
                    message = "";
                    listApproveOrder = getAllData(App.stoOrder, ["Selected"], [true]);
                    Process.processOrderDet(recordOrder.data, !recordOrder.data.Selected);
                    setTimeout(function () {
                        saveOrder(true);
                    }, 100);
                    
                }
            }
            HQ.common.showBusy(false);
        }, 200);
      
    },

    stoDoc_load: function (sto, records, successful, eOpts) {

    },
    stoHisOrd_load: function (sto, records, successful, eOpts) {
        
        if (sto.getCount()) {
            App.slmHisOrd.select(0);
        } else {
            HQ.common.showBusy(false);
        }
    },
    stoHisDet_load: function (sto, records, successful, eOpts) {
        HQ.common.showBusy(false);
    },
    stoRole_load: function (sto, records, successful, eOpts) {
        HQ.Role = sto.data.items[0].data;
        App.cboStatus.setValue(HQ.Role.DefaultStatus.replace(new RegExp(',', 'g'), ',').split(','));

        if (HQ.Role.ShowDfltSOUnitStkUnit) {
            HQ.grid.hide(App.grdOrder, ['OrdQty']);
            HQ.grid.show(App.grdOrder, ['OrdQty1', 'OrdQty2']);
        } else {

            HQ.grid.show(App.grdOrder, ['OrdQty']);
            HQ.grid.hide(App.grdOrder, ['OrdQty1', 'OrdQty2']);
        }
    }

    , checkLoad : function (sto) {
        _Source += 1;
        if (_Source == _maxSource) {            
            _Source = 0;            
            HQ.common.showBusy(false);
        }
    }
    , checkMasterLoad: function (sto) {
        _masterSource += 1;
        if (_masterSource == _maxMasterSource) {
            _masterSource = 0;
            HQ.common.showBusy(false);
        }
    }

    , stoDet4Save_load: function (sto, records, successful, eOpts) {       
    }

    , stoHisOrdCalcPromo_load: function (sto, records, successful, eOpts) {       
        if (sto.getCount()) {
            App.slmOrderCalcPromo.select(0);
        } else {
            HQ.common.showBusy(false);
        }
    }
    , stoHisDetCalcPromo_load: function (sto, records, successful, eOpts) {
        if (sto.data.length && App.grdHisOrdCalcPromo.selModel.selected.items[0] && App.grdHisOrdCalcPromo.selModel.selected.items[0].data.SelOrder) {
            var recordOrderNbr = App.grdOrder.selModel.selected.items[0].data;///HQ.store.findInStore(App.grdOrder.store, ["Selected"], [true]);
            if (!updateQty(App.grdHisOrdCalcPromo.selModel.selected.items[0], recordOrderNbr)) {
                HQ.message.show(35);
                App.grdHisOrdCalcPromo.selModel.selected.items[0].set('SelOrder', false);
            }
        }
        HQ.common.showBusy(false);
    },
    stoHasDelivery_load: function (sto, records, successful, eOpts) {
        if (sto.data.items[0] != undefined) {
            if (sto.data.items[0].data.HasDelivery == 1) {                
                HQ.grid.show(App.grdOrder, ['DeliveryUnit', 'ShipDate', 'ShiftID', 'PayMethod', 'PayType']);
            }
            else {
                HQ.grid.hide(App.grdOrder, ['DeliveryUnit', 'ShipDate', 'ShiftID', 'PayMethod', 'PayType']);
            }
        }
        
    },


};
var Event = {
    menuClick: function (command) {
        switch (command) {
            case "save":

                var isShowWinOrder = false;
                _isShowedPopupWinOrder = false;
                var recordOrder = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
                if (recordOrder != undefined) {
                    var errorOrder = '';
                    var errorOrderImp = '';
                    var allData = App.stoDet4Save.data;
                    var storeOrder = App.stoOrder.snapshot;
                    for (var i = 0; i < storeOrder.length > 0; i++) {
                        if (storeOrder.items[i].data.Selected == true) {
                            var totalOrdAmt = 0.0;
                            if (App.stoHasDelivery.data.items[0].data.HasDelivery == 1) {
                                if (storeOrder.items[i].data.DeliveryUnit == '') {
                                    var fieldLang = findColumnNameByIndex(App.grdOrder.columns, 'DeliveryUnit');
                                    var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'OrderNbr') + ': ' + storeOrder.items[i].data.OrderNbr;
                                    HQ.message.show(1111, [orderLang, fieldLang], '', true);
                                    App.slmOrder.select(App.stoOrder.indexOf(storeOrder.items[i]));
                                    return false;
                                }
                                if (storeOrder.items[i].data.ShipDate == '') {
                                    var fieldLang = findColumnNameByIndex(App.grdOrder.columns, 'ShipDate');
                                    var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'OrderNbr') + ': ' + storeOrder.items[i].data.OrderNbr;
                                    HQ.message.show(1111, [orderLang, fieldLang], '', true);
                                    App.slmOrder.select(App.stoOrder.indexOf(storeOrder.items[i]));
                                    return false;
                                }
                                if (storeOrder.items[i].data.ShiftID == '') {
                                    var fieldLang = findColumnNameByIndex(App.grdOrder.columns, 'ShiftID');
                                    var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'OrderNbr') + ': ' + storeOrder.items[i].data.OrderNbr;
                                    HQ.message.show(1111, [orderLang, fieldLang], '', true);
                                    App.slmOrder.select(App.stoOrder.indexOf(storeOrder.items[i]));
                                    return false;
                                }
                                if (storeOrder.items[i].data.PayMethod == '') {
                                    var fieldLang = findColumnNameByIndex(App.grdOrder.columns, 'PayMethod');
                                    var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'OrderNbr') + ': ' + storeOrder.items[i].data.OrderNbr;
                                    HQ.message.show(1111, [orderLang, fieldLang], '', true);
                                    App.slmOrder.select(App.stoOrder.indexOf(storeOrder.items[i]));
                                    return false;
                                }
                                if (storeOrder.items[i].data.PayType == '') {
                                    var fieldLang = findColumnNameByIndex(App.grdOrder.columns, 'PayType');
                                    var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'PayType') + ': ' + storeOrder.items[i].data.OrderNbr;
                                    HQ.message.show(1111, [orderLang, fieldLang], '', true);
                                    App.slmOrder.select(App.stoOrder.indexOf(storeOrder.items[i]));
                                    return false;
                                }                               
                            }
                            allData.each(function (item) {
                                if (item.data.Selected == true && item.data.OrderNbr == recordOrder.data.OrderNbr && item.data.InvtID != '') {                                
                                    totalOrdAmt += (item.data.LineAmt * item.data.QtyShip / item.data.LineQty);                                                                                                           
                                }
                            })
                            if (totalOrdAmt < storeOrder.items[i].data.RewardAmt) {
                                errorOrder += storeOrder.items[i].data.OrderNbr + '; ';
                                continue;
                            }
                            if (storeOrder.items[i].data.ToStatus == 'C') {
                                isShowWinOrder = true;
                            }
                            if (storeOrder.items[i].data.OrderNbrImp && storeOrder.items[i].data.ForceCalcPromo) {
                                errorOrderImp += storeOrder.items[i].data.OrderNbr + '; ';
                            }
                        }
                    }
                    if (errorOrderImp != '')
                    {
                        errorOrderImp = errorOrderImp.substring(0, errorOrderImp.length - 2);
                        var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'OrderNbr') + ': ' + errorOrderImp;
                        HQ.message.show(2020050601, [orderLang], '', true);//Đơn hàng Import bắt buộc tính lại KM trc khi duyệt
                        return false;
                    }
                    if (errorOrder.length > 0) {
                        errorOrder = errorOrder.substring(0, errorOrder.length - 2);
                        HQ.message.show(2016101303, [errorOrder], '', true);
                        return false;
                    } else {
                        listApproveOrder = getAllData(App.stoOrder, ["Selected"], [true]);
                        if (isShowWinOrder) {//RELEASE MOI POP CHO CHON THONG TIN
                            checksaveOrder();                            
                        } else {
                            save();
                        }
                    }                    
                }
                break;
            default:
        }
    },
    Form: {

        frmMain_boxReady: function (frm, width, height, eOpts) {
            HQ.common.showBusy(true, HQ.waitMsg);
            
            App.stoDoc.addListener('load', Store.checkLoad);
            App.stoOrder.addListener('load', Store.checkLoad);
            App.stoDet.addListener('load', Store.checkLoad);            
            App.cboTerritory.store.addListener('load', Store.checkMasterLoad);
            App.cboChannel.store.addListener('load', Store.checkMasterLoad);
            App.cboRemarkOrd.store.addListener('load', Store.checkMasterLoad);            
            App.cboDateFilterBy.store.addListener('load', Store.checkMasterLoad);
            App.cboStatus.store.addListener('load', Store.checkMasterLoad);
            App.cboDeliveryUnit.store.addListener('load', Store.checkMasterLoad);
            HQ.util.checkAccessRight();
            App.dteStartDate.setValue(HQ.bussinessDate);
            App.dteEndDate.setValue(HQ.bussinessDate);
            App.cboCpnyID.store.load(function (records, operation, success) {
                var record = HQ.store.findRecord(App.cboCpnyID.store, ["BranchID"], [HQ.cpnyID]);
                if (record != undefined) {
                    App.cboTerritory.setValue(record.data.Territory);
                    App.cboState.setValue(record.data.State);
                    App.cboCpnyID.setValue(HQ.cpnyID);
                }
            });
        },
        cboTerritory_Collapse: function (cbo, newValue, oldValue, eOpts) {
            //App.cboState.clearValue();
            //App.cboDistrict.clearValue();
            //App.cboDistrict.store.clearData();
            //App.cboCpnyID.clearValue();
            //setTimeout(function () {
            //    App.cboCpnyID.store.reload()
            //}, 10);
            //if (App.cboTerritory.getValue() == "") {
            //    App.cboState.store.reload();
            //}
        },
        cboTerritory_Change: function (cbo, newValue, oldValue, eOpts) {
            App.cboState.store.reload();            
        },
        cboTerritory_Bur: function (cbo, newValue, oldValue, eOpts) {
            setTimeout(function () {
                App.cboState.store.reload()
            }, 10);
        },
        cboTerritory_Click: function (cbo, newValue, oldValue, eOpts) {
            App.cboTerritory.clearValue();
            App.cboState.setValue('');
            App.cboCpnyID.setValue('');
            App.cboCpnyID.store.reload();
            App.cboState.store.reload();
        },
        cboState_Collapse: function (cbo, newValue, oldValue, eOpts) {
            //App.cboDistrict.clearValue();
            //App.cboDistrict.store.reload();
            //App.cboCpnyID.clearValue();
            //App.cboCpnyID.store.reload();
        },

        cboState_Blur: function (cbo, newValue, oldValue, eOpts) {
            setTimeout(function () {
                App.cboDistrict.store.reload()
            }, 10);
        },
        cboState_Click: function (cbo, newValue, oldValue, eOpts) {
            App.cboState.clearValue();
            App.cboCpnyID.setValue('');
            App.cboCpnyID.store.reload();
        },
        cboDistrict_Change: function (cbo, newValue, oldValue, eOpts) {
        
        },
        cboCpnyID_change: function (cbo, newValue, oldValue, eOpts) {
            App.txtSlsperId.setValue('');
            if (Ext.isEmpty(newValue) || App.cboCpnyID.valueModels != undefined && App.cboCpnyID.valueModels.length > 0) {
                App.grdSlsperID.store.reload();
                App.cboDelivery.store.reload();
                App.cboStatus.store.reload();
                App.stoHasDelivery.reload();
            }

        },
        cboCpnyID_Blur: function(){
            if (!Ext.isEmpty(App.cboCpnyID.getValue())) {
                var rec = HQ.store.findRecord(App.cboCpnyID.store, ["BranchID"], [App.cboCpnyID.getValue()]);
                if (rec != undefined) {
                    App.cboTerritory.setValue(rec.data.Territory);
                    App.cboState.setValue(rec.data.State);
                    App.cboCpnyID.setValue(rec.data.BranchID);
                }
            }
        },
        cboCpnyID_Expand: function(){
            App.cboCpnyID.store.reload();
        },

        btnLoad_click: function (btn, e) {
            if (HQ.form.checkRequirePass(App.frmMain)) {
                _loadData = true;
                App.chkSelectHeaderOrder.setValue(false);
                App.stoDoc.removeAll();
                App.stoHisOrd.removeAll();
                App.stoHisDet.removeAll()
                App.stoHisOrdCalcPromo.removeAll();
                App.stoHisDetcalcPromo.removeAll();
                App.stoOrder.reload();
                changeQty = false;
            }
        },

        btnClose_click: function (btn, e) {
            var flat = false;
            var store = App.stoOrder.data;
            store.each(function (record) {
                if (record.data.Selected == true) {
                    flat = true;                 
                }
            })
            if (flat) {
                App.winCloseOrder.show();
                App.cboReasonCode.clearValue();
            }
            else {
                HQ.message.show(2017110701);
            }
        },
       
        btnCloseOk_Click: function (btn, e) {
            if (Ext.isEmpty(App.cboReasonCode.getValue())) {
                HQ.message.show(15, App.cboReasonCode.fieldLabel, '');
                return;
            }
            Event.Form.ClosePO('yes');
        },
        ClosePO: function (item) {
            if (item == 'yes') {
                if (App.frmMain.isValid()) {
                    App.frmMain.submit({
                        waitMsg: HQ.common.getLang('Processing') + '...',
                        url: 'OM20500/ClosePO',
                        timeout: 1000000,
                        params: {
                            lstOrderChange: HQ.store.getData(App.grdOrder.store),
                            ReasonCode: App.cboReasonCode.getValue()
                        },
                        success: function (action, data) {
                            if (data.result.msgCode) {
                                HQ.message.show(data.result.msgCode, data.result.msgParam, '', true);
                            }
                            else {
                                HQ.message.show(201405071);
                            }
                            App.grdOrder.store.reload();
                        },
                        failure: function (errorMsg, data) {
                            if (data.result.msgCode) {
                                HQ.message.show(data.result.msgCode);
                            }
                            else {
                                HQ.message.process(msg, data, true);
                            }
                        }
                    });
                }
            }
            App.winCloseOrder.hide();
        },
        btnDelOrdNbrImp_click: function (btn, e) {
            var lstOrdNotImp = '';
            var flat = false;
            var store = App.stoOrder.data;
            store.each(function (record) {
                if (!record.data.OrderNbrImp && record.data.Selected)
                {
                    lstOrdNotImp = record.data.OrderNbr + ', ';
                }
                if (record.data.Selected == true) {
                    flat = true;
                }
            })
            if(lstOrdNotImp != '')
            {
                lstOrdNotImp = lstOrdNotImp.substring(0, lstOrdNotImp.length - 2);
                var orderLang = findColumnNameByIndex(App.grdOrder.columns, 'OrderNbr') + ': ' + lstOrdNotImp;
                HQ.message.show(2020050602, [orderLang], '', true);//Đơn hàng không phải đơn Import trạng thái H ko xóa được
                return false;
            }
            if (flat) {
                HQ.message.show(2020050604, [], "Event.Form.DelOrdNbrImp", true);//Bạn có muốn xóa đơn hàng
            }
            else
            {
                HQ.message.show(2020050603);//Phải chọn đơn hàng cần xóa
            }
        },
        DelOrdNbrImp: function (item) {
            if(item == 'yes')
            {
                if (App.frmMain.isValid()) {
                    App.frmMain.submit({
                        waitMsg: HQ.common.getLang('Processing') + '...',
                        url: 'OM20500/DelOrdNbrImp',
                        timeout: 1000000,
                        params: {
                            lstOrderChange: HQ.store.getData(App.grdOrder.store)
                        },
                        success: function (action, data) {
                            if (data.result.msgCode) {
                                HQ.message.show(data.result.msgCode, data.result.msgParam, '', true);
                            }
                            else {
                                HQ.message.show(201405071);
                            }
                            App.grdOrder.store.reload();
                        },
                        failure: function (errorMsg, data) {
                            if (data.result.msgCode) {
                                HQ.message.show(data.result.msgCode);
                            }
                            else {
                                HQ.message.process(msg, data, true);
                            }
                        }
                    });
                }
            }
        },
        showEditDetail: function (record) {
            if (App.slmOrder.selected.items.length>0 && record.data.OrderNbr != App.slmOrder.selected.items[0].data.OrderNbr) return;
            App.stoEditDetail.clearData();
            App.grdDetail.view.refresh();
            App.txtOrderNbr.setValue(record.data.OrderNbr);
            App.stoDet.snapshot.each(function (item) {
                if (item.data.DiscID == "KMTAY" && item.data.BranchID == record.data.BranchID && item.data.OrderNbr == record.data.OrderNbr) {
                    var Detail = HQ.store.findRecord(App.stoEditDetail, ['BranchID', 'OrderNbr', 'LineRef'], [item.data.BranchID, item.data.OrderNbr, item.data.LineRef]);
                    if (Ext.isEmpty(Detail)) {
                        Detail = Ext.create('App.mdlDetail');
                        Detail.data.BranchID = item.data.BranchID;
                        Detail.data.OrderNbr = item.data.OrderNbr;
                        Detail.data.LineRef = item.data.LineRef;
                        Detail.data.DiscType = item.data.DiscType;
                        Detail.data.Code = item.data.DiscCode;
                        Detail.data.InvtID = item.data.InvtID;
                        Detail.data.Descr = item.data.Descr;
                        Detail.data.Qty = item.data.QtyShip;
                        Detail.data.Edit = false;
                        App.stoEditDetail.data.add(Detail);
                    }                  
                    Detail.commit();
                }
            });
            App.winDetail.show();
            App.grdDetail.view.refresh();
        }
        , showImage: function (record, type) {
            _imageType = type;
            App.grdImage.store.removeAll();
            App.frmImage.loadRecord(record);
            App.grdImage.store.reload();
            App.winImage.show();
        }
    },
    Popup:
        {
            btnOK_click: function (btn, e) {
                if (Ext.isEmpty(App.dteShipDate.getValue())) {
                    HQ.message.show(15, App.dteShipDate.fieldLabel, '');
                    return;
                }
                if (!App.dteShipDate.isValid()) {
                    HQ.message.show(2017120604, App.dteShipDate.fieldLabel, '');
                    return;
                }
                if (Ext.isEmpty(App.dteARDocDate.getValue())) {
                    HQ.message.show(15, App.dteARDocDate.fieldLabel, '');
                    return;
                }
                if (!App.dteARDocDate.isValid()) {
                    HQ.message.show(2017120604, App.dteARDocDate.fieldLabel, '');
                    return;
                }
                save();
            },
            btnCancel_click: function (btn, e) {
                App.cboDelivery.setValue('');
                App.winOrder.hide();
            },
            btnOKSave_click: function (btn, e) {
                if (Ext.isEmpty(App.dteShipDateSave.getValue())) {
                    HQ.message.show(15, App.dteShipDateSave.fieldLabel, '');
                    return;
                }
                if (!App.dteShipDateSave.isValid()) {
                    HQ.message.show(2017120604, App.dteShipDateSave.fieldLabel, '');
                    return;
                }
                if (Ext.isEmpty(App.dteARDocDateSave.getValue())) {
                    HQ.message.show(15, App.dteARDocDateSave.fieldLabel, '');
                    return;
                }
                if (!App.dteARDocDateSave.isValid()) {
                    HQ.message.show(2017120604, App.dteARDocDateSave.fieldLabel, '');
                    return;
                }
                saveDate();
            },
            btnCancelSave_click: function (btn, e) {
                App.cboDeliverySave.setValue('');
                App.winOrderSave.hide();
            },
        },
    Grid: {
        renderRowNumberDetail: function (value, meta, record) {
            return App.stoDet.data.indexOf(record) + 1;
        },
        salesPromoMark_render: function (value) {
            var record = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [value]);
            var val = '0/0';
            
            if (record) {
                val = Ext.util.Format.number(record.data.SalesMark, '0,000') + '/' + Ext.util.Format.number(record.data.PromoMark, '0,000');
            }
            return val;
        },
        slmOrder_BeforeSelect: function(){
            HQ.common.showBusy(true, HQ.common.getLang('loadingData'));
        },
        slmOrder_select: function (slm, selRec, idx, eOpts) {
            if (_isManual) {
                App.stoDet4Save.removeAll();
            }
            setTimeout(function () {
                _payMethod = selRec.data.PayMethod;
                App.grdHisDet.store.clearData();
                App.grdHisDet.view.refresh();
                App.grdHisOrd.store.reload();
                App.grdHisDetCalcPromo.store.clearData();
                App.grdHisDetCalcPromo.view.refresh();
                App.grdHisOrdCalcPromo.store.reload();
                Ext.each(App.grdDet.headerCt.getGridColumns(), function (column) {
                    column.show();
                });
                HQ.grid.hide(App.grdDet, selRec.data.HiddenColumn.split(','));
                HQ.recordOrderNbr = selRec;
                _selOrderNbr = selRec.data.OrderNbr;
                App.grdDet.store.clearData();
                if (!selRec.data.IsSelected) {
                    selRec.set('IsSelected', true);
                    App.grdDet.store.reload();
                } else {
                    App.stoDet.suspendEvents();
                    App.stoDet4Save.data.each(function (item) {
                        if (item.data.OrderNbr == _selOrderNbr) {
                            App.stoDet.data.add(item);
                        }                        
                    });
                    App.stoDet.resumeEvents();
                    App.grdDet.view.refresh();
                }
                App.grdDoc.getFilterPlugin().clearFilters();
                App.grdDoc.getFilterPlugin().getFilter('OrdNbr').setValue([_selOrderNbr, '']);
                App.grdDoc.getFilterPlugin().getFilter('OrdNbr').setActive(true);
                HQ.common.showBusy(false);

            }, 50);
        },

        slmDet_select: function (slm, selRec, idx, eOpts) {
            var item = slm.selected.items[0].data;
            App.stoItemSite.load({
                params: { siteID: item.SiteID, invtID: item.InvtID },
                callback: function () {
                    var site = HQ.store.findInStore(App.stoItemSite, ['InvtID', 'SiteID'], [item.InvtID, item.SiteID]);
                    if (!Ext.isEmpty(site)) {
                        App.lblQtyAvail.setText(item.InvtID + " - " + HQ.common.getLang('qtyavail') + ":" + site.QtyAvail);
                    }
                    else {
                        App.lblQtyAvail.setText(item.InvtID + " - " + HQ.common.getLang('qtyavail') + ":" + 0);
                    }
                },
            });
        },

        slmDoc_select: function (slm, selRec, idx, eOpts) {
            
        },
        chkSelectHeaderOrder_change: function (chk, newValue, oldValue, eOpts) {
            var stoOrder = App.stoOrder.snapshot;
            App.stoOrder.suspendEvents();
            App.stoDet.suspendEvents();
            App.stoDet4Save.suspendEvents();
            var ishow = false ;
            stoOrder.each(function (record) {
                if (chk.value) {
                    var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
                    if (recordOrderDate != undefined) {
                        if (recordOrderDate.data.OrderDate.toDateString() != record.data.OrderDate.toDateString()) {
                            if (!ishow) {
                                HQ.message.show(201710192, [record.data.OrderNbr, Ext.Date.format(record.data.OrderDate, HQ.formatDateJS), Ext.Date.format(recordOrderDate.data.OrderDate, HQ.formatDateJS)], "", true);
                                ishow = true;
                            }
                            return;
                        }
                    }
                }
                if (record.data.EditColumn!='') {
                    record.set("Selected", chk.value);
                    if (record.data.Selected == true) {
                        if (record.data.Editable != true) {
                            record.set("Selected", false);
                        } else {
                            Process.processOrderDet(record.data);
                        }                        
                    }
                    else {
                        Process.processOrderDet(record.data, true);

                    }
                }
            });
            App.stoDet4Save.resumeEvents();
            App.stoDet.resumeEvents();
            App.grdDet.view.refresh();
            App.stoOrder.resumeEvents();            
            App.grdOrder.view.refresh();
        },
        grdOrder_beforeEdit: function (editor, e)
        {
            if (e.field == "ForceCalcPromo") {
                if (e.record.data.Selected == false) {
                    return false;
                }
            }

            var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
            if (recordOrderDate != undefined && recordOrderDate.data.OrderNbr != e.record.data.OrderNbr) {
                if (recordOrderDate.data.OrderDate.toDateString() != e.record.data.OrderDate.toDateString()){
                    HQ.message.show(201710191, [e.record.data.OrderNbr, Ext.Date.format(e.record.data.OrderDate, HQ.formatDateJS), Ext.Date.format(recordOrderDate.data.OrderDate, HQ.formatDateJS)], "", true);
                    return false;
                }
            }
            if (e.record.data.EditColumn == '') {
                return false;
            }
            if (e.record.data.Editable != true) {
                return false;
            }
            if (e.field == 'DeliveryUnit' && e.record.data.Status != 'H') {
                return false;
            }
            if (e.field == "PayType") {
                _payMethod = e.record.data.PayMethod;
                setTimeout(function () {
                    App.cboPayType.store.reload();
                }, 100);                
            }
            if (e.field == "ShipDate") {
                var date = new Date();
                App.colShipDate.setMinValue(e.record.data.OrderDate);
                App.colShipDate.setMaxValue(date);
            }
        },
        grdOrder_validateEdit: function (editor, e) {
            if (e.record.data.Editable != true) {
                e.record.set("Selected", false);
                return false;
            }
            if (e.field == "InvcNbr") {
                var regexNbr = /^(\w*(\d|[a-zA-Z]|[\_\(\)\\/\-\.]))*$/;
                if (!HQ.util.passNull(e.value) == '' && !HQ.util.passNull(e.value.toString()).match(regexNbr)) {
                    HQ.message.show(2019091369, App.colInvcNbr.text);
                    e.record.set("InvcNbr", '');
                    return false;
                }
            }
            else if (e.field == "InvcNote") {
                var regexNbr = /^(\w*(\d|[a-zA-Z]|[\_\(\)\\/\-\.]))*$/;
                if (!HQ.util.passNull(e.value) == '' && !HQ.util.passNull(e.value.toString()).match(regexNbr)) {
                    HQ.message.show(2019091369, App.colInvcNote.text);
                    e.record.set("InvcNote", '');
                    return false;
                }
            }
        },
        grdOrder_edit: function (editor, e) {
            if (e.field == "Selected") {
                if (e.record.data.Selected == false) {
                    e.record.set("ForceCalcPromo", false);
                }
                App.slmOrder.select(e.rowIdx);
                setTimeout(function () {
                    App.stoDet.suspendEvents();
                    App.stoDet4Save.suspendEvents();
                    if (e.record.data.Selected) {
                        Process.processOrderDet(e.record.data);
                    }
                    else {
                        Process.processOrderDet(e.record.data, true);
                    }
                    App.stoDet4Save.resumeEvents();
                    App.stoDet.resumeEvents();
                    App.grdDet.view.refresh();
                }, 500);                
            }      
        },
        chkSelectHeaderDet_change: function (chk, newValue, oldValue, eOpts) {
            App.stoDet.suspendEvents();
            App.stoDet4Save.suspendEvents();
            App.stoDet.each(function (record) {
                var recordOrder = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [record.data.OrderNbr]);                
                if(recordOrder.data.EditColumn != '')
                {                   
                    var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
                    if (recordOrderDate != undefined) {
                        if (recordOrderDate.data.OrderDate.toDateString() != recordOrder.data.OrderDate.toDateString()) {
                            HQ.message.show(201710191, [recordOrder.data.OrderNbr, Ext.Date.format(recordOrder.data.OrderDate, HQ.formatDateJS), Ext.Date.format(recordOrderDate.data.OrderDate, HQ.formatDateJS)], "", true);
                            return false;
                        }
                    }                   

                    record.data.Selected = chk.value;
                    if (chk.value) {
                        Process.processOrderDet(recordOrder.data);
                        var record = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [record.data.OrderNbr]);
                        record.set("Selected", true);                    
                    }
                    else {
                        Process.processOrderDet(recordOrder.data, true);
                        var record = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [record.data.OrderNbr]);
                        record.set("Selected", false);
                    }
                }
            });
            App.stoDet4Save.resumeEvents();
            App.stoDet.resumeEvents();
            App.grdDet.view.refresh();
        },
        grdDet_beforeEdit: function (editor, e) {            
            var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
            var recordOrder = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [e.record.data.OrderNbr]);
            if (recordOrder) {
                var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
                if (recordOrderDate != undefined) {
                    if (recordOrderDate.data.OrderDate.toDateString() != recordOrder.data.OrderDate.toDateString()) {
                        HQ.message.show(201710191, [recordOrder.data.OrderNbr, Ext.Date.format(recordOrder.data.OrderDate, HQ.formatDateJS), Ext.Date.format(recordOrderDate.data.OrderDate, HQ.formatDateJS)], "", true);
                        return false;
                    }
                }

                if (recordOrder.data.EditColumn == '' || recordOrder.data.Editable != true) {
                    return false;
                }
                if (e.record.data.DiscID != '' || e.record.data.DiscCode != '' && e.field != 'Selected') {
                    return false;
                }

                if (!checkEditableColumnDet(e.field, recordOrder.data.EditColumn, e.record) && e.field != 'Selected') {
                    return false;
                }
            }
        },
        grdDet_edit: function (editor, e) {
            var recordOrderNbr = HQ.recordOrderNbr;
            if (e.field == "Selected") {
                if (e.record.data.Selected) {
                    item = e.record;
                    var qtyShip1 = 0, qtyShip2 = 0, qtyShip = 0;
                    if (recordOrderNbr.data.EditColumn.split(',')[0] == 'QtyShip') {
                        qtyShip = item.data[recordOrderNbr.data.CheckQty];
                        qtyShip1 = item.data[recordOrderNbr.data.CheckQty + '1'];
                        qtyShip2 = item.data[recordOrderNbr.data.CheckQty + '2'];
                    }
                    else {
                        qtyShip = item.data[recordOrderNbr.data.CheckQty] - item.data.QtyShipped;
                        qtyShip1 = item.data[recordOrderNbr.data.CheckQty + '1'] - item.data.QtyShipped1;
                        qtyShip2 = item.data[recordOrderNbr.data.CheckQty + '2'] - item.data.QtyShipped2;
                    }
                    item.set(recordOrderNbr.data.EditColumn.split(',')[0], qtyShip);
                    item.set(recordOrderNbr.data.EditColumn.split(',')[0] + '1', qtyShip1);
                    item.set(recordOrderNbr.data.EditColumn.split(',')[0] + '2', qtyShip2);
                    if (qtyShip1 > 0 || qtyShip2 > 0) {
                        item.set("Selected", 1);
                    }
                    else {
                        item.set("Selected", 0);
                    }                    
                }               
            }
            else if (e.field == recordOrderNbr.data.EditColumn.split(',')[0]) {           
                e.record.set("Mark", e.record.data.MMark * (e.record.data.QtyShipped + e.record.data.QtyShip));
                Process.calcHeader(e.record);
            }           
            
            if (e.field == "Qty1" || e.field == "Qty2" || e.field == 'Qty') {
                if (e.record.data.Qty > e.record.data.LineQty) {
                    e.record.set("Qty", e.record.data.LineQty);
                }
                if (e.record.data.Qty != 0) {
                    e.record.set("Selected", true);
                }
                else {
                    e.record.set("Selected", false);
                }
            }
            else if (e.field == "QtyShip1" || e.field == "QtyShip2" || e.field == "QtyShip") {
                if (e.record.data.QtyShip != 0) {
                    e.record.set("Selected", true);
                }
                else {
                    e.record.set("Selected", false);
                }
            }

            var record = HQ.store.findRecord(App.stoDet4Save, ["OrderNbr", "Selected"], [e.record.data.OrderNbr, true]);
            var recordOrder = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [e.record.data.OrderNbr]);
            if (record != undefined) {
                recordOrder.set("Selected", true);
            }
            else {
                recordOrder.set("Selected", false);
                if (App.stoHisOrdCalcPromo.data.length > 0) {
                    App.stoHisOrdCalcPromo.data.each(function (item) {
                        item.set("SelOrder", 0);
                        item.commit();
                    });
                }
            }

            if (checkSelectFreeItem(recordOrderNbr)) {
                setSelectFreeItem(recordOrderNbr);
            } else {
                setDeselectFreeItem(recordOrderNbr);
            }
            if ((e.field != 'Selected' && e.value != e.originalValue || e.field == 'Selected' && e.value == false && e.originalValue == true) && e.record.data.FreeItem == false) {
                recordOrder.set("Edited", true);
            }
            var lstDetails = App.stoDet4Save.snapshot || App.stoDet4Save.allData || App.stoDet4Save.data;
            if (lstDetails != undefined) {
                for (var i = 0; i < lstDetails.length; i++) {
                    if (lstDetails.items[i].data.FreeItem == false) {
                        if (lstDetails.items[i].raw != undefined) {
                            if (lstDetails.items[i].data.QtyShip != lstDetails.items[i].raw.QtyShip) {
                                changeQty = true;
                                break;
                            }
                            else {
                                changeQty = false;
                            }
                        }
                    }
                }
            }
            App.grdDet.view.refresh();
        },

        grdDet_validateEdit: function (editor, e) {
            var recordOrderNbr = HQ.recordOrderNbr;
            var editCoumn = recordOrderNbr.data.EditColumn.split(',')[0];
            var qtyShip = 0;
            if (e.field == editCoumn || e.field == (editCoumn + '1') || e.field == (editCoumn + '2')) {
                if (recordOrderNbr.data.EditColumn.split(',')[0] == 'QtyShip') {
                    qtyShip = e.record.data[recordOrderNbr.data.CheckQty];
                }
                else {
                    qtyShip = e.record.data[recordOrderNbr.data.CheckQty] - e.record.data.QtyShipped;
                }
                var val = 0;
                if (e.field == (editCoumn + '1')) {
                    val = e.value * e.record.data.UnitRate1 + e.record.data[editCoumn + '2'];
                } else if (e.field == (editCoumn + '2')) {
                    val = e.value + e.record.data.UnitRate1 * e.record.data[editCoumn + '1'];
                } else if (e.field == editCoumn) {
                    val = e.value;
                }
                if (val > qtyShip && e.record.data.DiscID != 'KMTAY') {
                    return false;
                } else {
                    e.record.set(editCoumn, val);
                }
            }
            var isChange = false;
            if (e.field == "Qty1" && e.value != e.record.data.Qty1 ||
                e.field == "Qty2" && e.value != e.record.data.Qty2 ||
                e.field == "QtyShip1" && e.value != e.record.data.QtyShip1 || 
                e.field == "QtyShip2"&& e.value != e.record.data.QtyShip2 ||
                e.field == "Qty" && e.value != e.record.data.Qty ||
                e.field == "QtyShip" && e.value != e.record.data.QtyShip) {                
                for (var i = 0; i < App.stoDoc.data.length; i++) {
                    if (App.stoDoc.data.items[i].data.OrdNbr == e.record.data.OrderNbr) {
                        if (App.stoDoc.data.items[i].data.MaxDocBal != 0) {
                            App.stoDoc.data.items[i].set('DocBalApproved', 0);
                            App.stoDoc.data.items[i].set('DocBalPay', 0)
                        }
                    }
                }
            }
        },

        grdDoc_beforeEdit: function (editor, e) {
            var recordOrder = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [e.record.data.OrdNbr]);
            if (e.record.data.Editable != true || recordOrder.data.Editable != true || recordOrder.data.Selected != true) {
                return false;
            }
        },
        grdDoc_edit: function (editor, e) {
            if (e.field == "DocBalApproved" ) {                
                e.record.set("DocBalPay", e.record.data.DocBalApproved);
            }           
        },

        grdDoc_validateEdit: function (editor, e) {
            if (e.field == "DocBalApproved") {
                if (e.value != e.record.data.DocBalApproved) {
                    if (e.value > e.record.data.MaxDocBal) {
                        HQ.message.show(2017031502, '', '', false);
                        return false;
                    } else {
                        var totalAmt = 0;
                        var recordOrder = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [e.record.data.OrdNbr]);
                        var editColumn = 'Qty';
                        if (recordOrder.data.EditColumn.split(',')[0] == 'Qty') {
                            editColumn = 'Qty';
                        } else {
                            editColumn = 'QtyShip';
                        }
                        for (var i = 0; i < App.stoDet.data.length; i++) {
                            var obj = App.stoDet.data.items[i].data;
                            if (obj.FreeItem != true && obj.Selected == true) {
                                totalAmt += obj[editColumn] * obj.SlsPrice;
                            }
                        }
                        if (e.value > totalAmt) {
                            HQ.message.show(2017031501, [Ext.util.Format.number(totalAmt, '0,000')], '', true); //HQ.message.show(2017031501, totalAmt, '', false);
                            return false;
                        } else {
                            var totalDocBalApproved = 0;
                            for (var i = 0; i < App.grdDoc.store.data.length; i++) {
                                if (e.rowIdx != i) {
                                    totalDocBalApproved += App.grdDoc.store.data.items[i].data.DocBalApproved;
                                } else {
                                    totalDocBalApproved += e.value;
                                }
                            }
                            if (totalDocBalApproved > totalAmt) {
                                HQ.message.show(2017031501, [Ext.util.Format.number(totalAmt, '0,000')], '', true);
                                return false;
                            }
                        }
                    }
                }
            }
        },

        slmHisOrd_select: function (slm, selRec, idx, eOpts) {
            App.grdHisDet.store.reload();
        },

        grd_Reject: function (record, grid) {
            HQ.grid.checkReject(record, grid);

            if (record.data.tstamp == '') {
                grid.getStore().remove(record);
                grid.getView().focusRow(grid.getStore().getCount() - 1);
                grid.getSelectionModel().select(grid.getStore().getCount() - 1);
            } else {
                record.reject();
            }
        },
        grdOrder_color: function (record) {
            if (record.data.Color == '1') {
                return 'hightlight-row';
            }
            else if (record.data.Color == '2') {
                return 'hightlight-rowyellow';
            }
        },
        grdDoc_color : function (record) {
            if (record.data.MaxDocBal == 0) {
                return 'hightlight-rowDocColor';
            }
        }
        , salesPromoMarkHis_render: function (value) {
            var record = HQ.store.findRecord(App.stoHisOrd, ["OrderNbr"], [value]);
            var val = '0/0';
            if (record) {
                val = Ext.util.Format.number(record.data.SalesMark, '0,000') + '/' + Ext.util.Format.number(record.data.PromoMark, '0,000');
            }
            return val;
        },

        slmOrderCalcPromo_select: function (value) {
            App.grdHisDetCalcPromo.store.reload();
        }
    }
};

//EVENT////////////////
var grdChoiceHeader_SelectionChange = function (item, selected) {
    App.stoChoice.clearFilter();
    var lst = App.stoChoice.snapshot || App.stoChoice.allData || App.stoChoice.data;
    if (lst != undefined) {
        for (var i = 0; i < lst.length; i++) {

            if (_lstFree.indexOf(lst.items[i].data.FreeItemID) == -1) {
                _lstFree.push(lst.items[i].data.FreeItemID);
                _lstInvt.push({
                    key: lst.items[i].data.FreeItemID,
                    QtyFree: lst.items[i].data.ToTalQtyFreeItem,
                    QtyBudget: lst.items[i].data.TotalBudget,
                });
            }

        }
    }
    if (!Ext.isEmpty(selected)) {
        App.stoChoice.filterBy(function (item) {
            if (item.data.Index == selected[0].data.Index) {
                return item;
            }
        });

        if (selected[0].data.DonateGroupProduct == true) {
            App.txtMaxQtyInGroup.setText(HQ.common.getLang('MaxQtyInGroup'));
            App.txtFreeItemQty.setText(HQ.common.getLang('FreeItemQty'));
            HQ.grid.show(App.grdChoice, ['MaxQtyInGroup', 'Priority', 'GroupItem']);
            HQ.grid.hide(App.grdChoice, ['FreeItemQtyBase', 'TotQty', 'PromoPrice', 'PromoLineAmt']);
        } else if (selected[0].data.ConvertDiscAmtToFreeItem) {
            App.txtMaxQtyInGroup.setText(HQ.common.getLang('OM10100QTYMAX'));
            App.txtFreeItemQty.setText(HQ.common.getLang('FreeItemQty'));
            HQ.grid.show(App.grdChoice, [, 'PromoPrice', 'PromoLineAmt', 'MaxQtyInGroup']);
            HQ.grid.hide(App.grdChoice, ['FreeItemQtyBase', 'TotQty', 'Priority', 'GroupItem']);
        } else {
            App.txtFreeItemQty.setText(HQ.common.getLang('SOSUAT'));
            HQ.grid.show(App.grdChoice, ['FreeItemQtyBase', 'TotQty']);
            HQ.grid.hide(App.grdChoice, ['MaxQtyInGroup', 'Priority', 'GroupItem', 'PromoPrice', 'PromoLineAmt']);
        }
        var commit = false;
        if (lstSelected.indexOf(App.grdChoiceHeader.selModel.selected.items[0].data.Index) == -1) {
            lstSelected.push(App.grdChoiceHeader.selModel.selected.items[0].data.Index);
            commit = true;
        }
        App.stoChoice.sort('PromoPrice', 'ASC');
        setTimeout(function () {
            CalcMaxQty(selected[0], commit);
        }, 50);
    };
}

function CalcMaxQty(header, commit, timeOut) {
    if (header.data.ConvertDiscAmtToFreeItem) {
        var totalAmtUsed = 0.0;
        App.stoChoice.data.each(function (choice) {
            if (choice.data.Sel) {
                totalAmtUsed += choice.data.PromoLineAmt;
            }
        });
        App.lblChoiceAmtUsed.setText(HQ.common.getLang("OM10100AmtAvail") + ': ' + (header.data.PromoBonusAmt - totalAmtUsed).format(0, 3, ',', '.'));
        var qtyAvail = header.data.PromoAmt - totalAmtUsed;
        App.stoChoice.data.each(function (choice) {
            var qty = 0;            
            if (choice.data.Sel && choice.data.FreeItemQty > 0) {
                qty = choice.data.FreeItemQty;
            } else {
                qty = HQ.util.mathFloor(qtyAvail / choice.data.PromoPrice, 0);
                qty = qty > choice.data.QtyAvail ? choice.data.QtyAvail : qty;
            }
            choice.set('MaxQtyInGroup', qty);
            if (commit) {
                choice.commit();
            }
        });
        App.grdChoice.view.refresh();
    }
}
var grdChoice_ValidateEdit = function (item, e) {
    if (e.field == "FreeItemQty") {
        if (e.value > e.record.data.MaxQty) {
            return false;
        }
    }
}

var grdChoice_Edit = function (item, e) {
    var key = e.field;
    if (Object.keys(e.record.modified).length > 0) {
        if (e.record.data.Sel) {
            App.stoChoice.data.each(function (choice) {
                if (choice.data.DiscID != e.record.data.DiscID || choice.data.DiscSeq != e.record.data.DiscSeq) {
                    choice.data.Sel = false;
                }
            });
        }
    }
    if (e.field == 'Sel') {
        var qty = 0;
        if (e.value == true) {
            if (App.grdChoiceHeader.selModel.selected.length > 0 && App.grdChoiceHeader.selModel.selected.items[0].data.ConvertDiscAmtToFreeItem) {
                qty = HQ.util.mathFloor(App.grdChoiceHeader.selModel.selected.items[0].data.PromoAmt / e.record.data.PromoPrice, 0);
                if (qty > e.record.data.QtyAvail) {
                    qty = e.record.data.QtyAvail;
                }
                qty = e.record.data.MaxQtyInGroup < qty ? e.record.data.MaxQtyInGroup : qty;

            } else {
                qty = (App.grdChoiceHeader.selModel.selected.length > 0 && App.grdChoiceHeader.selModel.selected.items[0].data.DonateGroupProduct == true) ? e.record.data.MaxQtyInGroup : e.record.data.MaxQty;
                if (qty > e.record.data.QtyAvail) {
                    qty = e.record.data.QtyAvail;
                }
            }
            if (qty == 0) {
                e.record.set('Sel', false);
            }
        }
        if (e.originalValue != e.value) {
            e.record.set('FreeItemQty', qty);
            e.record.set('TotQty', e.record.data.FreeItemQtyBase * e.record.data.FreeItemQty);
            e.record.set('PromoLineAmt', e.record.data.FreeItemQty * e.record.data.PromoPrice);
        }
    }
    else if (e.field == 'FreeItemQty') {
        if (e.record.data.FreeItemQty == '') {
            e.record.set('FreeItemQty', 0);
        }
        if (App.grdChoiceHeader.selModel.selected.length > 0 && App.grdChoiceHeader.selModel.selected.items[0].data.ConvertDiscAmtToFreeItem) {
            var totalAmtUsed = 0.0;
            App.stoChoice.data.each(function (choice) {
                if (choice.data.Sel && choice.data.FreeItemID != e.record.data.FreeItemID) {
                    totalAmtUsed += choice.data.PromoLineAmt;
                }
            });
            var crrAmt = App.grdChoiceHeader.selModel.selected.items[0].data.PromoAmt - totalAmtUsed;
            if (e.record.data.FreeItemQty * e.record.data.PromoPrice > crrAmt) {
                e.record.set('FreeItemQty', HQ.util.mathFloor(crrAmt / e.record.data.PromoPrice, 0));
            }
            if (e.record.data.FreeItemQty > e.record.data.QtyAvail) {
                e.record.set('FreeItemQty', e.record.data.QtyAvail);
            }
        }
        if (e.originalValue != e.value) {
            if (e.value > e.record.data.QtyAvail) {
                e.record.set('FreeItemQty', e.record.data.QtyAvail);
            } else if (App.grdChoiceHeader.selModel.selected.length > 0 && App.grdChoiceHeader.selModel.selected.items[0].data.DonateGroupProduct == true && e.record.data.FreeItemQty > e.record.data.MaxQtyInGroup) {
                e.record.set('FreeItemQty', e.record.data.MaxQtyInGroup);
            }
            e.record.set('TotQty', e.record.data.FreeItemQtyBase * e.record.data.FreeItemQty);
            e.record.set('PromoLineAmt', e.record.data.FreeItemQty * e.record.data.PromoPrice);
        }
        e.record.set('Sel', e.record.data.FreeItemQty > 0);
    }
    if (e.field == 'Sel') {
        for (var i = 0; i < _lstInvt.length; i++) {
            if (e.record.data.FreeItemID == _lstInvt[i].key && e.record.data.Sel == true) {
                var a = Number(_lstInvt[i].QtyFree) - Number(e.record.data.QtyAvail)
                if (a < 0) {
                    e.record.set("Sel", false);
                    HQ.message.show("2019081660");
                }
                else {
                    _lstInvt[i].QtyFree = a;
                }

                if (e.record.data.BudgetID != "") {
                    var b = Number(_lstInvt[i].QtyBudget) - Number(e.record.data.QtyAvail)
                    if (b < 0) {
                        e.record.set("Sel", false);
                        HQ.message.show("2019081661");
                    }
                    else {
                        _lstInvt[i].QtyFree = b;
                    }
                }
            }
            else if (e.record.data.FreeItemID == _lstInvt[i].key && e.record.data.Sel == false) {
                var a = Number(_lstInvt[i].QtyFree) + Number(e.record.data.QtyAvail);

                _lstInvt[i].QtyFree = a;


                if (e.record.data.BudgetID != "") {
                    var b = Number(_lstInvt[i].QtyBudget) + Number(e.record.data.QtyAvail)

                    _lstInvt[i].QtyFree = b;

                }
            }
        }
    }
    CalcMaxQty(App.grdChoiceHeader.selModel.selected.items[0], false);
    App.grdChoice.view.refresh();
};

var btnChoiceOk_Click = function () {
    var invalid = [];
    var isValidSelWithoutQty = [];
    var isvalidQty = [];
    var isvalidGroupQty = [];
    var isValidExceedAmt = [];
    var isValidMissAmt = [];
    var errIndex = 0;
    var item = null;
    var minPrice = 0.0;
    var totalAmtUsed = 0.0;
    var totalHeaderPromoAmt = 0.0;
    var totalHeaderBonusPromoAmt = 0.0;
    var totalHeaderAmtUsed = 0.0;
    var objChoiceDetBonus;
    var objChoiceHeaderBonus;
    var headerMinPrice = 10000000000000000000.0;
    var headerMinPrice4NextChoice = 10000000000000000000.0;
    App.stoChoiceHeader.data.each(function (header) {
        errIndex++;
        var flat = false;
        var isQtyError = false;
        var isSelWithoutQty = false;
        var selectQty = parseInt(0);
        var donateGroupProduct = header.data.DonateGroupProduct;
        var convertDiscAmtToFreeItem = header.data.ConvertDiscAmtToFreeItem;
        var dict = []; // create an empty array      
        totalAmtUsed = 0.0;
        minPrice = 0.0;
        headerMinPrice4NextChoice = 10000000000000000000.0;
        App.stoChoice.clearFilter();

        App.stoChoice.filterBy(function (item) {
            if (item.data.DiscID == header.data.DiscID
                && item.data.DiscSeq == header.data.DiscSeq
                && item.data.InvtID == header.data.InvtID
                && (item.data.MaxQty == header.data.MaxQty && item.data.Index != kmTienDu || item.data.Index == kmTienDu)
                && item.data.LineRef == header.data.LineRef
                && item.data.DiscLineRef == header.data.DiscLineRef) {
                return item;
            }
        });

        App.stoChoice.data.each(function (choice) {
            if (choice.data.Sel) {
                flat = true;
                if (choice.data.FreeItemQty == 0) {
                    isSelWithoutQty = true;
                }
                if (donateGroupProduct == true) {
                    var found = -1;
                    if (dict.length > 0) {
                        for (var i = 0; i < dict.length; i++) {
                            if (dict[i].key == choice.data.GroupItem) {
                                found = i;
                            }
                        }
                    }
                    if (found == -1) {
                        dict.push({
                            key: choice.data.GroupItem,
                            value: choice.data.FreeItemQty,
                            maxQtyInGroup: choice.data.MaxQtyInGroup
                        });
                    } else {
                        dict[found].value += choice.data.FreeItemQty;
                    }
                } else if (convertDiscAmtToFreeItem) {
                    totalAmtUsed += choice.data.FreeItemQty * choice.data.PromoPrice;
                    if (minPrice == 0 || choice.data.PromoPrice < minPrice && choice.data.MaxQtyInGroup > 0) {
                        minPrice = choice.data.PromoPrice;
                    }
                } else {
                    selectQty = selectQty + parseInt(choice.data.FreeItemQty);
                }
            } else {
                if (donateGroupProduct == true) {
                    var found = -1;
                    if (dict.length > 0) {
                        for (var i = 0; i < dict.length; i++) {
                            if (dict[i].key == choice.data.GroupItem) {
                                found = i;
                            }
                        }
                    }
                    if (found == -1) {
                        dict.push({
                            key: choice.data.GroupItem,
                            value: 0,
                            maxQtyInGroup: choice.data.MaxQtyInGroup
                        });
                    }
                } else if (convertDiscAmtToFreeItem) {
                    if (minPrice == 0 || choice.data.PromoPrice < minPrice && choice.data.MaxQtyInGroup > 0) {
                        minPrice = choice.data.PromoPrice;
                    }
                }
            }
            if (convertDiscAmtToFreeItem && headerMinPrice > choice.data.PromoPrice && choice.data.QtyAvail > choice.data.MaxQtyInGroup) {
                headerMinPrice = choice.data.PromoPrice;
                objChoiceDetBonus = choice;
            }
            if (convertDiscAmtToFreeItem && headerMinPrice4NextChoice > choice.data.PromoPrice) {
                headerMinPrice4NextChoice = choice.data.PromoPrice;
            }
        });
        if (!flat) {
            invalid.push(errIndex);
            item = header;
        }
        if (donateGroupProduct == true) {
            var iserrorGroup = false;
            for (var i = 0; i < dict.length; i++) {
                if (dict[i].value != dict[i].maxQtyInGroup) {
                    iserrorGroup = true;
                    item = header;
                }
            }
            if (iserrorGroup) {
                isvalidGroupQty.push(errIndex);
            }
        } else if (convertDiscAmtToFreeItem) {

            if (header.data.PromoAmt - totalAmtUsed > minPrice && header.data.PromoBonusAmt - totalAmtUsed > minPrice) {
                App.stoChoice.data.each(function (choice) {
                    if (header.data.PromoBonusAmt - totalAmtUsed > choice.data.PromoPrice
                        && (choice.data.Sel && choice.data.QtyAvail > choice.data.FreeItemQty || !choice.data.Sel && choice.data.QtyAvail > 0)) {
                        isValidMissAmt.push(errIndex);
                        HQ.message.show(2018062501, [errIndex, (header.data.PromoBonusAmt - totalAmtUsed).format(0, 3, ',', '.'), choice.data.PromoPrice.format(0, 3, ',', '.')], '', true);
                        item = header;
                        return false;
                    }
                });
                if (isValidMissAmt.length > 0) {
                    return false;
                }
            } else if (header.data.PromoAmt < totalAmtUsed && header.data.PromoBonusAmt < totalAmtUsed) {
                HQ.message.show(2018062502, [errIndex, totalAmtUsed.format(0, 3, ',', '.'), (totalAmtUsed - header.data.PromoBonusAmt).format(0, 3, ',', '.')], '', true);
                isValidExceedAmt.push(errIndex);
                item = header;
                return false;
            }
            if (header.data.PromoBonusAmt - totalAmtUsed < headerMinPrice4NextChoice) {
                totalHeaderPromoAmt += header.data.PromoBonusAmt;
                totalHeaderBonusPromoAmt += header.data.PromoBonusAmt;
                totalHeaderAmtUsed += totalAmtUsed;
            }
        } else {
            if (selectQty != header.data.MaxQty) {
                isvalidQty.push(errIndex);
                item = header;
            }
        }

        if (isSelWithoutQty) {
            isValidSelWithoutQty.push(errIndex);
            item = header;
        }
        if (!Ext.isEmpty(item)) {
            return false;
        }
    });
    if (!Ext.isEmpty(item)) {
        App.smlChoiceHeader.select(App.stoChoiceHeader.indexOf(item));
    }
    if (invalid.length > 0) {
        if (isvalidQty.length == 0 && isValidMissAmt.length == 0) {
            HQ.message.show(2017030303, [invalid.join()], '', true);
        }
    } else if (isvalidGroupQty.length > 0 && isvalidQty.length > 0) {
        HQ.message.show(2018031302, [isvalidGroupQty.join(), isvalidQty.join()], '', true);
    } else if (isvalidGroupQty.length > 0) {
        HQ.message.show(2018031301, [isvalidGroupQty.join()], '', true);
    } else if (isvalidQty.length > 0) {
        HQ.message.show(2017030301, [isvalidQty.join()], '', true);
    } else if (isValidSelWithoutQty.length > 0) {
        HQ.message.show(2017030302, [isValidSelWithoutQty.join()], '', true);
    } else if (isValidMissAmt.length > 0 || isValidExceedAmt.length > 0) {

    }
    else {
        _lstInvt = [];
        _lstFree = [];
        App.stoChoice.clearFilter();
        saveOrder(App.winChoice.calcPromoOnly);
        App.winChoice.autoRefresh = false;
        App.winChoice.hide();
    }
};
var AddChoiceBonus = function (item, headerPromoBonusAmt) {
    App.stoChoice.clearFilter();
    App.stoChoiceHeader.filterBy(function (it) {
        if (it.data.Index == kmTienDu) {
            return it;
        }
    });
    App.stoChoice.sort('PromoPrice', 'ASC');
    var lstInvtID = [];
    App.stoChoice.data.each(function (it) {
        var choice = it.data;

        if (lstInvtID.indexOf(choice.FreeItemID) == -1 && choice.ConvertDiscAmtToFreeItem && choice.PromoPrice <= headerPromoBonusAmt) {
            var newChoice = Ext.create('App.mdlChoice');
            newChoice.data.Index = kmTienDu;
            newChoice.data.DiscID = kmTienDu;
            newChoice.data.DiscSeq = kmTienDu;
            newChoice.data.DiscLineRef = '00001';
            newChoice.data.Qty = item.Qty;
            newChoice.data.InvtID = '';
            newChoice.data.Unit = choice.Unit;
            newChoice.data.LineRef = item.LineRef;
            newChoice.data.Descr = choice.Descr;
            newChoice.data.DiscDescr = choice.DiscDescr;
            newChoice.data.Sel = false;
            newChoice.data.LevelID = '00001';
            newChoice.data.FreeItemID = choice.FreeItemID;
            newChoice.data.FreeSiteID = choice.FreeSiteID;
            newChoice.data.FreeItemUnit = choice.FreeItemUnit;
            newChoice.data.FreeItemQty = 0;
            newChoice.data.FreeItemQtyBase = 1;
            newChoice.data.TotQty = 1;
            newChoice.data.FreeItemDescr = choice.FreeItemDescr;
            newChoice.data.MaxQty = HQ.util.mathFloor(headerPromoBonusAmt / choice.PromoPrice, 0);
            newChoice.data.BudgetID = '';
            newChoice.data.GroupItem = choice.GroupItem;
            newChoice.data.Priority = choice.Priority;
            newChoice.data.MaxQtyInGroup = HQ.util.mathFloor(headerPromoBonusAmt / choice.PromoPrice, 0);
            newChoice.data.QtyAvail = choice.QtyAvail;
            newChoice.data.PromoPrice = choice.PromoPrice;
            newChoice.data.PromoLineAmt = newChoice.data.FreeItemQty * choice.PromoPrice;
            newChoice.data.QtyAvail -= choice.FreeItemQty;
            newChoice.commit();
            App.stoChoice.data.add(newChoice);
            lstInvtID.push(choice.FreeItemID);
        } else if (choice.Sel && lstInvtID.indexOf(choice.FreeItemID) != -1 && choice.QtyAvail - choice.FreeItemQty > 0) {
            var objChoiced = HQ.store.findRecord(App.stoChoice, ['Index', 'FreeItemID'], [kmTienDu, choice.FreeItemID]);
            if (objChoiced) {
                objChoiced.data.QtyAvail -= choice.FreeItemQty;
                objChoiced.data.MaxQtyInGroup = objChoiced.data.QtyAvail < objChoiced.data.MaxQtyInGroup ? objChoiced.data.QtyAvail : objChoiced.data.MaxQtyInGroup;
            }
        }
    });
    App.grdChoice.view.refresh();
    var totalRow = 0;
    var stoChoiceLength = App.stoChoice.data.length;
    for (var i = stoChoiceLength - 1; i > -1; i--) {
        if (App.stoChoice.data.items[i].data.Index == kmTienDu) {
            if (App.stoChoice.data.items[i].data.QtyAvail <= 0) {
                App.stoChoice.remove(App.stoChoice.data.items[i]);
            } else {
                totalRow++;
            }
        }
    }
    if (totalRow > 0) {
        HQ.message.show(2018080601, [headerPromoBonusAmt.format(0, 3, ',', '.')], '', true);
        var newChoiceHeader = Ext.create('App.mdlChoiceHeader');
        newChoiceHeader.data.Index = kmTienDu;
        newChoiceHeader.data.DiscID = kmTienDu;
        newChoiceHeader.data.DiscSeq = kmTienDu;
        newChoiceHeader.data.DiscDescr = 'KM tiền dư';
        newChoiceHeader.data.Qty = item.Qty;
        newChoiceHeader.data.InvtID = '';
        newChoiceHeader.data.Unit = '';
        newChoiceHeader.data.LineRef = item.LineRef;
        newChoiceHeader.data.Descr = '';
        newChoiceHeader.data.LevelID = '00001';
        newChoiceHeader.data.DiscLineRef = '00001';
        newChoiceHeader.data.MaxQty = 1;
        newChoiceHeader.data.DonateGroupProduct = false;
        newChoiceHeader.data.PromoAmt = headerPromoBonusAmt;
        newChoiceHeader.data.PromoBonusAmt = headerPromoBonusAmt;
        newChoiceHeader.data.SubBreakType = item.SubBreakType;
        newChoiceHeader.data.BreakBoundType = item.BreakBoundType;
        newChoiceHeader.data.ConvertDiscAmtToFreeItem = true;
        newChoiceHeader.commit();
        App.stoChoiceHeader.data.add(newChoiceHeader);
        setTimeout(function () {
            App.stoChoice.filterBy(function (item) {
                if (item.data.Index == kmTienDu) {
                    return item;
                }
            });
            if (App.stoChoiceHeader.data.items.length > 0) {
                App.smlChoiceHeader.select(App.stoChoiceHeader.data.items[0]);
            }
        }, 200);
        App.grdChoiceHeader.view.refresh();
    } else {
        App.stoChoice.filterBy(function (item) {
            if (item.data.Index == '@@') {
                return item;
            }
        });
        App.stoChoice.clearFilter();
        saveOrder(App.winChoice.calcPromoOnly);
        App.winChoice.autoRefresh = false;
        App.winChoice.hide();
    }
}

var btnChoiceClose_Click = function () {   
    App.stoChoice.clearFilter();
    App.stoChoice.clearData();
    App.stoChoiceHeader.clearData();
    listApproveOrder.splice(0, 1)
    saveOrder();
    App.winChoice.hide();
}

function btnFindSlsperId_Click() {
    App.winSlsperID.show();
}
var grdSlsperID_CellDblClick = function (grid, row, col, rec) {
    App.winSlsperID.hide();
}
function chkSelectHeader_change  (chk, newValue, oldValue, eOpts) {
    var alldata = App.stoSlsperID.allData || App.stoSlsperID.data;
    App.stoSlsperID.suspendEvents();
    alldata.each(function (record) {
        record.set("Selected", chk.value);
    });    
    App.stoSlsperID.resumeEvents();
    App.grdSlsperID.view.refresh();
}
function btnOKSlsperID_Click() {
    var strSlsperID='';
    var alldata = App.stoSlsperID.allData || App.stoSlsperID.data;
    alldata.each(function (record) {
        if (record.data.Selected) strSlsperID += record.data.SlsperId + ',';
    });
    App.txtSlsperId.setValue(strSlsperID.endsWith(',') ? strSlsperID.substring(0, strSlsperID.length - 1) : strSlsperID);
    App.winSlsperID.hide();
}
function btnCancelSlsperID_Click() {
    App.winSlsperID.hide();
}
//DATA/////////////////
var saveDate = function () {
    var lstOrder = App.stoOrder.snapshot || App.stoOrder.allData || App.stoOrder.data;
    if (lstOrder != undefined) {
        lstOrder.items.forEach(function (item) {
            if (item.data.Selected) {
                var record = HQ.store.findRecord(App.stoOrderCheck, ["BranchID", "OrderNbr"], [item.data.BranchID, item.data.OrderNbr]);
                if (record == undefined) {
                    App.stoOrderCheck.add(item);
                }
            }
        })
    }
    App.frmMain.submit({
        waitMsg: HQ.common.getLang('SavingData'),
        method: 'POST',
        url: 'OM20500/SaveDate',
        timeout: 1800000,
        params: {
            lstDet: HQ.store.getAllData(App.stoOrder),
            shipDate: App.dteShipDateSave.value.toDateString(),
            deliveryID: App.cboDeliverySave.getValue(),
            ARDocDate: App.dteARDocDateSave.value.toDateString(),
        },
        success: function (msg, data) {
            App.winOrderSave.hide();
            Event.Form.btnLoad_click();
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
            return;
        }
    });
}

var save = function () {
    message = "";
    if (App.frmMain.isValid()) {       
        saveOrder();
    }
}
var saveOrder = function (calcPromoOnly) {
    calcPromoOnly = calcPromoOnly == undefined ? false : calcPromoOnly;

    if (listApproveOrder.length > 0) {
        var order = listApproveOrder.splice(0, 1)[0];
        if (calcPromoOnly) {
            _indexOrd = App.slmOrder.selected.items[0].index;
        } else {
            _indexOrd = 0;
        }
        if (App.lblChoiceAmtUsed) {
            App.lblChoiceAmtUsed.setText('');
        }
        // console.log(order.OrderNbr);
        var url = order.ToStatus == 'W' ? 'OM20500/SaveToW' : 'OM20500/Save';
        var tmp = [];
        tmp.push(order);
        App.frmMain.submit({
            waitMsg: HQ.common.getLang('SavingData'),
            method: 'POST',
            url: url,
            timeout: 1800000,
            params: {
                lstDet: HQ.store.getAllData(App.stoDet4Save, ["OrderNbr"], [order.OrderNbr]),
                lstOrder: Ext.encode(tmp),
                delivery: App.cboDelivery.getValue(),
                shipDate: Ext.Date.format(App.dteShipDate.getValue(), 'm-d-Y'),
                aRDocDate: Ext.Date.format(App.dteARDocDate.getValue(), 'm-d-Y'),
                isAddStock: App.chkAddStock.getValue(),
                lstChoice: Ext.encode(App.stoChoice.getRecordsValues()),
                lstDoc: Ext.encode(App.stoDoc.getRecordsValues()),
                calcPromoOnly: calcPromoOnly,
                confirmed: _confirmed,
                calcID: _calcID,
                isApproveAll : _isApproveAll,
                isAllManualPromoOrDisplay: _isAllManualPromoOrDisplay,
                budgetStatus: _budgetStatus,
                qtyChange: changeQty
            },
            success: function (msg, data) {
                App.winChoice.calcPromoOnly = calcPromoOnly;
                App.stoChoice.clearData();
                App.stoChoiceHeader.clearData();

                if (this.result.data != undefined && this.result.data.choice != undefined) {
                    this.result.choice = this.result.data.choice;
                }
                if (this.result.choice != undefined) {
                    listApproveOrder.splice(0, 0, order);               
                    App.winChoice.setTitle(HQ.common.getLang("ORDERNBR") + ': ' +order.OrderNbr);
                    App.stoChoice.clearData();
                    App.stoChoiceHeader.clearData();
                    var isHideInvtID = false;
                    this.result.choice.forEach(function (item) {
                        var newChoice = Ext.create('App.mdlChoice');
                        for (var key in newChoice.data) {
                            newChoice.data[key] = item[key];
                        }
                        newChoice.data.TotQty = item.FreeItemQtyBase * item.FreeItemQty;
                        newChoice.commit();

                        var choiceHeader = HQ.store.findInStore(App.stoChoiceHeader, ["Index"], [item.Index]);
                        if (Ext.isEmpty(choiceHeader)) {
                            var newChoiceHeader = Ext.create('App.mdlChoiceHeader');
                            for (var headerKey in newChoiceHeader.data) {
                                newChoiceHeader.data[headerKey] = item[headerKey];
                            }
                            newChoiceHeader.commit();
                            App.stoChoiceHeader.data.add(newChoiceHeader);
                        }
                        App.stoChoice.data.add(newChoice);

                        if (Ext.isEmpty(item.InvtID)) {
                            isHideInvtID = true;
                        }
                    });
                    HQ.common.showBusy(false);
                    App.stoChoice.filterBy(function (item) {
                        if (item.data.Index != kmTienDu) {
                            return item;
                        }
                    });
                    App.stoChoiceHeader.filterBy(function (item) {
                        if (item.data.Index != kmTienDu) {
                            return item;
                        }
                    });
                    if (isHideInvtID) {
                        HQ.grid.hide(App.grdChoiceHeader, ['InvtID', 'Unit', 'Descr']);
                    } else {
                        HQ.grid.show(App.grdChoiceHeader, ['InvtID', 'Unit', 'Descr']);
                    }


                    App.stoChoice.filterBy(function (item) {
                        if (item.data.LineRef == "####") {
                            return item;
                        }
                    });

                    App.grdChoice.view.refresh();
                    App.smlChoiceHeader.clearSelections();
                    App.grdChoiceHeader.view.refresh();
                    App.winChoice.show();
                } else {
                    if (data.result.message) {
                        message += data.result.message + "<br>";
                    }
                    if (data.result.messMinPrice) {
                        message += data.result.messMinPrice + "<br>";
                    }
                    if (data.result.messageCode == '2019033001') {
                        if (App.grdHisOrdCalcPromo.selModel.selected.length) {
                            App.grdHisOrdCalcPromo.selModel.deselectAll();
                        }
                        App.grdHisOrdCalcPromo.store.reload();                        
                        _indexOrd = App.slmOrder.selected.items[0].index;
                        App.tabInfo.setActiveTab(3);
                        _askOrderNbr = data.result.askOrderNbr;
                        _budgetStatus = 2;
                        HQ.message.show(2019033002, [message], 'askSaveWithoutBudget', true);
                    } else {
                        _budgetStatus = 0;
                        _askOrderNbr = '';
                        if (calcPromoOnly) {
                            if (message != '') {
                                HQ.message.show(20410, [message], "", true);
                            }
                            if (Ext.isEmpty(data.result.message)) {
                                App.tabInfo.setActiveTab(3);
                                checksaveOrder();
                            }
                        } else {
                            checksaveOrder();
                        } 
                    }
                }
                App.winOrder.hide();
                _isManual = false;
            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
                return;
                App.winOrder.hide();
            }
        });
    } else {
        if (message) {
            HQ.message.show(20410, [message], "", true);
        } else {
            HQ.message.show(8009, [message], "", true);
        }
        Event.Form.btnLoad_click();
    }
}

function askSaveWithoutBudget(item) {
    if (item === 'yes') {
        listApproveOrder = getAllData(App.stoOrder, ["OrderNbr"], [_askOrderNbr]);
        checksaveOrder(true);
    } else {
        _askOrderNbr = '';
        _budgetStatus = 0;
        Event.Form.btnLoad_click();
    }
}
//FUNCTION/////////////
var getAllData = function (store, fields, values, isEqual) {
    var lstData = [];
    if (isEqual == undefined || isEqual == true) {
        if (store.snapshot != undefined) {
            store.snapshot.each(function (item) {
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
            return lstData;
        } else {
            store.data.each(function (item) {
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
            return lstData;
        }
    } else {
        if (store.snapshot != undefined) {
            store.snapshot.each(function (item) {
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
            return lstData;
        } else {
            store.data.each(function (item) {
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
            return lstData;
        }
    }
}

var findColumnIndex = function (columns, dataIndex) {
    var index;
    for (index = 0; index < columns.length; ++index) {
        if (columns[index].dataIndex == dataIndex) {
            break;
        }
    }
    return index == columns.length ? -1 : index;
}

var renderDiscType = function (value) {
    var r = HQ.store.findInStore(App.cboDiscType.getStore(), ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return value;
    }
    return r.Descr;
}
var renderCodeProgram = function (value) {
    var r = HQ.store.findInStore(App.stoCodeProgram, ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return value;
    }
    return r.Descr;
}
var renderInvtID = function (value,e) {
    var r = HQ.store.findInStore(App.cboInvtID.getStore(), ['InvtID'], [e.record.data.InvtID]);
    if (Ext.isEmpty(r)) {
        return e.record.data.Descr;
    }
    e.record.set('Descr', r.Descr);
    if (!e.record.data.SlsUnit) e.record.set('SlsUnit', r.StkUnit);
    return r.Descr;
}

var PopupwinDetail = {
    btnDelete_Click: function () {
        if (HQ.isDelete &&  App.smlDetail.selected.items.length>0 && App.smlDetail.selected.items[0].data.Edit == true) {
            App.grdDetail.deleteSelected();
        }       
    },
    btnAddnew_Click: function () {
        if (HQ.isInsert) {
          
            var flat = true;
            App.stoEditDetail.each(function (item) {
                if (item.data.InvtID == '') {
                    flat = false;
                    return false;
                }
            });
            if (flat) {
                Detail = Ext.create('App.mdlDetail');
                Detail.data.Edit = true;
                App.stoEditDetail.data.add(Detail);
                App.grdDetail.view.refresh();
            }
        }
    },
    btnDetailOK_Click: function () {
        App.stoEditDetail.each(function (item) {
            if (Ext.isEmpty(item.data.Code) || Ext.isEmpty(item.data.DiscType) || Ext.isEmpty(item.data.InvtID) || item.data.Qty == 0) {
            }
            else {
                var findRecord = HQ.store.findRecord(App.stoDet, ['BranchID', 'OrderNbr', 'LineRef'], [App.slmOrder.selected.items[0].data.BranchID, App.slmOrder.selected.items[0].data.OrderNbr, item.data.Code + ',' + item.data.DiscType + ',' + item.data.InvtID]);
                if (findRecord) {
                    findRecord.set("QtyShip", item.data.Qty);
                    findRecord.set("Selected", true);
                }
                else {
                    Detail = Ext.create('App.mdlDet');
                    Detail.data.Selected = true;
                    Detail.data.BranchID = App.slmOrder.selected.items[0].data.BranchID;
                    Detail.data.OrderNbr = App.slmOrder.selected.items[0].data.OrderNbr;
                    Detail.data.LineRef = item.data.Code + ',' + item.data.DiscType + ',' + item.data.InvtID;
                    Detail.data.InvtID = item.data.InvtID;
                    Detail.data.Descr = item.data.Descr;
                    Detail.data.FreeItem = true;
                    Detail.data.LineQty = item.data.Qty;
                    Detail.data.Qty = item.data.Qty;
                    Detail.data.QtyShip = item.data.Qty;
                    Detail.data.QtyShipped = 0;
                    Detail.data.SlsUnit = item.data.SlsUnit;
                    Detail.data.SlsPrice = 0;
                    Detail.data.DiscAmt = 0;
                    Detail.data.LineAmt = 0;
                    Detail.data.DiscCode = item.data.Code;
                    Detail.data.SiteID = App.slmOrder.selected.items[0].data.DiscSite;
                    Detail.data.DiscType = item.data.DiscType;
                    Detail.data.TaxID = '';
                    Detail.data.DiscID = 'KMTAY';                    
                    App.stoDet.add(Detail);
                    Detail.commit();
                }
            }
        });       
        App.winDetail.hide();
        App.grdDet.view.refresh();
    },
    
    renderRowNumberDetail: function (value, meta, record) {
        return App.stoEditDetail.data.indexOf(record) + 1;
    }
    , grdDetail_beforeEdit: function (editor, e) {
        if ((e.field == "DiscType" || e.field == "Code" || e.field == "InvtID") && e.record.data.Edit == false) {
            return false;
        }
        
       
    }
    , grdDetail_validateEdit: function (editor, e) {
        if (e.field == "Qty") {           
            e.record.set("Qty", e.value);
        }       
        else if (e.field == "DiscType") {
            if(e.record.data.DiscType!=e.value)
            {
                e.record.set("Code", '');
                var flat = true;
                App.stoEditDetail.each(function (item) {
                    if (item.data.DiscType == e.value && item.data.Code == e.record.data.Code && item.data.InvtID == e.record.data.InvtID)
                    {
                        flat = false;
                        return false;
                    }
                });
                if (flat) e.record.set("DiscType", e.value);
                else return false;
            }
        }
        else if (e.field == "Code") {
            if (e.record.data.Code != e.value) {
                var flat = true;
                App.stoEditDetail.each(function (item) {
                    if (item.data.Code == e.value && item.data.DiscType == e.record.data.DiscType && item.data.InvtID == e.record.data.InvtID) {
                        flat = false;
                        return false;
                    }
                });
                if (flat) e.record.set("Code", e.value);
                else return false;
            }
            e.record.set("Code", e.value);
        }
        else if (e.field == "InvtID") {
            if (e.record.data.Code != e.value) {
                var flat = true;
                App.stoEditDetail.each(function (item) {
                    if (item.data.InvtID == e.value && item.data.Code == e.record.data.Code && item.data.DiscType == e.record.data.DiscType) {
                        flat = false;
                        return false;
                    }
                });
                if (flat) e.record.set("InvtID", e.value);
                else return false;
            }
            e.record.set("InvtID", e.value);
        }
        App.grdDetail.view.refresh();
    }
    , cboCode_expand: function (item) {
        App.cboCode.store.filterBy(function (record) {
            if (record.data.DiscType == App.smlDetail.selected.items[0].data.DiscType) {
                return record;
            }
        }); 
    }
}

var checkSelectFreeItem = function (recordOrderNbr) {
    var equal = true;
    App.grdDet.store.data.each(function (item) {
        if (item.data.OrderNbr == recordOrderNbr.data.OrderNbr) {
            if (item.data.DiscID == '' && item.data.DiscCode == '' && item.data.FreeItem == false) { //  || item.data.DiscID == 'KMTAY' && item.data.DiscCode != ''
                if (item.data.Selected == false || item.data[recordOrderNbr.data.EditColumn.split(',')[0]] != item.data[recordOrderNbr.data.CheckQty]) {
                    equal = false;
                    return false;
                }
            }
        }
    });
    return equal;
}

var setSelectFreeItem = function (recordOrderNbr) {
    App.grdDet.store.data.each(function (item) {
        if (item.data.OrderNbr == recordOrderNbr.data.OrderNbr) {
            if (item.data.DiscID != '' && item.data.FreeItem && item.data.DiscCode == '') { // Ktra dòng bán
                
                var qtyShip1 = 0, qtyShip2 = 0, qtyShip = 0;
                if (recordOrderNbr.data.EditColumn.split(',')[0] == 'QtyShip') {
                    qtyShip = item.data[recordOrderNbr.data.CheckQty];
                    qtyShip1 = item.data[recordOrderNbr.data.CheckQty + '1'];
                    qtyShip2 = item.data[recordOrderNbr.data.CheckQty + '2'];
                }
                else {
                    qtyShip = item.data[recordOrderNbr.data.CheckQty] - item.data.QtyShipped;
                    qtyShip1 = item.data[recordOrderNbr.data.CheckQty + '1'] - item.data.QtyShipped1;
                    qtyShip2 = item.data[recordOrderNbr.data.CheckQty + '2'] - item.data.QtyShipped2;
                }
                item.set(recordOrderNbr.data.EditColumn.split(',')[0], qtyShip);
                item.set(recordOrderNbr.data.EditColumn.split(',')[0] + '1', qtyShip1);
                item.set(recordOrderNbr.data.EditColumn.split(',')[0] + '2', qtyShip2);
                if (qtyShip > 0 || qtyShip1 > 0 || qtyShip2 > 0) {
                    item.set("Selected", 1);
                }
            }
        }
    });
}

var setDeselectFreeItem = function (recordOrderNbr) {
    
    App.grdDet.store.data.each(function (item) {
        if (item.data.OrderNbr == recordOrderNbr.data.OrderNbr) {
            if (item.data.DiscID != '' && item.data.FreeItem && item.data.DiscCode == '') {
                item.set("Selected", 0);
            }
        }
    });
};

var renderDiscType = function (value) {
    var r = HQ.store.findInStore(App.cboDiscType.getStore(), ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return value;
    }
    return r.Descr;
}
var renderCodeProgram = function (value) {
    var r = HQ.store.findInStore(App.stoCodeProgram, ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return value;
    }
    return r.Descr;
}
var renderInvtID = function (value,e) {
    var r = HQ.store.findInStore(App.cboInvtID.getStore(), ['InvtID'], [e.record.data.InvtID]);
    if (Ext.isEmpty(r)) {
        return e.record.data.Descr;
    }
    e.record.set('Descr', r.Descr);
    if (!e.record.data.SlsUnit) e.record.set('SlsUnit', r.StkUnit);
    return r.Descr;
}

var findColumnIndex = function(columns, dataIndex) {
    var index;
    for (index = 0; index < columns.length; ++index) {
        if (columns[index].dataIndex == dataIndex) {
            break;
        }
    }
     return index == columns.length ? -1 : index;
}
var findColumnNameByIndex = function (columns, dataIndex) {
    var index = HQ.grid.findColumnIndex(columns, dataIndex);
    return index != -1 ? columns[index].text : dataIndex;
}

var stringFilter = function (record) {
    if (this.dataIndex == 'DeliveryUnit') {
        App.cboDeliveryUnit.store.clearFilter();
        return HQ.grid.filterComboDescr(record, this, App.cboDeliveryUnit.store, "Code", "Descr");
    }
    else return HQ.grid.filterString(record, this);
};

var joinParams = function (multiCombo) {
    var returnValue = "";
    if (multiCombo.value && multiCombo.value.length) {
        returnValue = multiCombo.value.join();
    }
    else {
        if (multiCombo.getValue()) {
            returnValue = multiCombo.rawValue;
        }
    }
    return returnValue;
}

var chkSelected_BeforeCheckChange = function (check, rowIndex, checked, eOpts) {
    var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["Selected"], [true]);
    if (recordOrderDate != undefined && App.grdOrder.store.data.items[rowIndex].data.OrderNbr != recordOrderDate.data.OrderNbr) {
        if (recordOrderDate.data.OrderDate.toDateString() != checked.data.OrderDate.toDateString()) {
            HQ.message.show(201710191, [checked.data.OrderNbr, Ext.Date.format(checked.data.OrderDate, HQ.formatDateJS), Ext.Date.format(recordOrderDate.data.OrderDate, HQ.formatDateJS)], "", true);
            return false;
        }
    }

    if (checked.data.EditColumn == '') {
        return false;
    }
    if (checked.data.Editable != true) {
        return false;
    }    
    App.stoDet.suspendEvents();
    App.stoDet4Save.suspendEvents();
    if (eOpts) {
        Process.processOrderDet(checked.data);
    }
    else {
        Process.processOrderDet(checked.data, true);
    }
    App.stoDet4Save.resumeEvents();
    App.stoDet.resumeEvents();
    App.grdDet.view.refresh();
   
};

var cboDeliveryUnit_Expand = function () {
    if (App.grdOrder.selModel.selected.length > 0 && App.grdOrder.selModel.selected.items[0].data.Status != "H") {
        App.cboDeliveryUnit.collapse();
    }
}
var cboDeliveryUnit_Change = function () {
    if (App.grdOrder.selModel.selected.length > 0 && App.grdOrder.selModel.selected.items[0].data.Status == "H") {
        App.grdOrder.selModel.selected.items[0].set('DeliveryUnit', App.cboDeliveryUnit.getValue());
    }
}

var checkEditableColumnDet = function (field, editColumns, record) {
    var data = editColumns.split(',')[0];
    var edit = false;   
    if ((data + '1') == field) {
        if (record.data.SlsUnit == record.data.DfltSOUnit || record.data.SlsUnit == record.data.StkUnit && record.data.StkUnit != record.data.DfltSOUnit) {
            edit = true;
        }        
    } else if ((data + '2') == field) {
        if (record.data.SlsUnit == record.data.StkUnit || record.data.SlsUnit == record.data.DfltSOUnit && record.data.StkUnit == record.data.DfltSOUnit) {
            edit = true;
        }
    } else if (field == data) {
        edit = true;
    }
    return edit;
}

var renderHeaderNumberColor = function (value, meta, record) {
    var newvalue;
    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='text-align:right !important;color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + Ext.util.Format.number(value, '0,000') + "</span>";
    }
    else {
        newvalue = Ext.util.Format.number(value, '0,000');
    }
    return newvalue;
}

var renderHeaderColor = function (value, meta, record) {
    var newvalue;
    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + value + "</span>";
    }
    else {
        newvalue = value;
    }
    return newvalue;
}

var renderDateColor = function (value, metaData, record, rowIndex, colIndex, store) {
    var newvalue;
    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + Ext.Date.format(value, HQ.formatDateJS + ' H:i:s') + "</span>";
    }
    else {
        newvalue = Ext.Date.format(value, HQ.formatDateJS + ' H:i:s');
    }
    return newvalue;
}
var renderOrderDateColor = function (value, metaData, record, rowIndex, colIndex, store) {
    var newvalue;
    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + Ext.Date.format(value, HQ.formatDateJS) + "</span>";
    }
    else {
        newvalue = Ext.Date.format(value, HQ.formatDateJS);
    }
    return newvalue;
}

var renderDeliveryUnit = function (value, metaData, record, row, col, store, gridView) {
    var r = HQ.store.findInStore(App.cboDeliveryUnit.store, ['Code'], [value]);
    var val = value;
    var newvalue = '';
    if (!Ext.isEmpty(r)) {
        val = r.Descr;
    }

    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + val + "</span>";
    }
    else {
        newvalue = val;
    }
    return newvalue;
}

var renderShiftID = function (value, metaData, record, row, col, store, gridView) {
    var r = HQ.store.findInStore(App.cboShiftID.store, ['Code'], [value]);
    var val = value;
    var newvalue = '';
    if (!Ext.isEmpty(r)) {
        val = r.Descr;
    }

    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + val + "</span>";
    }
    else {
        newvalue = val;
    }
    return newvalue;
}

var renderPayMethod = function (value, metaData, record, row, col, store, gridView) {
    var r = HQ.store.findInStore(App.cboPayMethod.store, ['Code'], [value]);
    var val = value;
    var newvalue = '';
    if (!Ext.isEmpty(r)) {
        val = r.Descr;
    }

    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + val + "</span>";
    }
    else {
        newvalue = val;
    }
    return newvalue;
}
var renderPayType = function (value, metaData, record, row, col, store, gridView) {
    var r = HQ.store.findInStore(App.cboPayType.store, ['Code'], [value]);
    var val = value;
    var newvalue = '';
    if (!Ext.isEmpty(r)) {
        val = r.Descr;
    }

    if (record.data.OutOfStockLineRef != '') {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockHeaderColor + "'>" + val + "</span>";
    }
    else {
        newvalue = val;
    }
    return newvalue;
}


var renderNumberColor = function (value, meta, record) {
    var newvalue;
    if (record.data.OutOfStockColor == true) {
        newvalue = "<span style='text-align:right !important;color:#" + HQ.Role.OutOfStockColor + "'>" + Ext.util.Format.number(value, '0,000') + "</span>";
    }
    else {
        newvalue = Ext.util.Format.number(value, '0,000');
    }
    return newvalue;
}

var renderColor = function (value, meta, record) {
    var newvalue;
    if (record.data.OutOfStockColor == true) {
        newvalue = "<span style='color:#" + HQ.Role.OutOfStockColor + "'>" + value + "</span>";
    }
    else {
        newvalue = value;
    }
    return newvalue;
}

var setUOM = function (invtID, classID, stkUnit, fromUnit) {
    if (!Ext.isEmpty(fromUnit)) {
        var data = HQ.store.findInStore(App.stoUnitConversion, ['UnitType', 'ClassID', 'InvtID', 'FromUnit', 'ToUnit'], ["3", "*", invtID, fromUnit, stkUnit]);
        if (!Ext.isEmpty(data)) {
            return data;
        }

        data = HQ.store.findInStore(App.stoUnitConversion, ['UnitType', 'ClassID', 'InvtID', 'FromUnit', 'ToUnit'], ["2", classID, "*", fromUnit, stkUnit]);
        if (!Ext.isEmpty(data)) {
            return data;
        }

        data = HQ.store.findInStore(App.stoUnitConversion, ['UnitType', 'ClassID', 'InvtID', 'FromUnit', 'ToUnit'], ["1", "*", "*", fromUnit, stkUnit]);
        if (!Ext.isEmpty(data)) {
            return data;
        }
        HQ.message.show(2525, [invtID], '', true);
        return null;
    }
    return null;
};

var rendererMaxQty = function (value, metaData, record, rowIndex, colIndex, store, view) {
    var newVal = record.data.ConvertDiscAmtToFreeItem ? '' : value;;
    return Ext.util.Format.number(newVal, '0,000');
}

var linkRenderer = function (value, meta, record) {            
     meta.style = "color:blue !IMPORTANT; text-decoration: underline; cursor:pointer";
     return HQ.common.getLang("CalcPromo");
}
var grdOrder_CellClick = function (Grid, td, cellIndex, record, tr, rowIndex, e, eOpts) {
    var colIndex = HQ.grid.findColumnIndex(App.grdOrder.columns, 'CalcPromoOnly');
    if (cellIndex == colIndex) {       
        if (record.data.Selected && record.data.ForceCalcPromo) {
            message = "";
            //if (record.data.OrdDiscAmt > 0) {
            //    
            //    HQ.message.show(2019120560, [record.data.OrderNbr], '', true);
            //    return false;
            //}
            listApproveOrder = getAllData(App.stoOrder, ["OrderNbr"], [record.data.OrderNbr]);
            saveOrder(true);
        } else {

        }
    }   
};

var linkApprovalOrderRenderer = function (value, meta, record) {
    meta.style = "color:blue !IMPORTANT; text-decoration: underline; cursor:pointer";
    return HQ.common.getLang("ApprovalOrder");
}

var grdHisOrdCalcPromo_CellClick = function (Grid, td, cellIndex, record, tr, rowIndex, e, eOpts) {
    var colIndex = HQ.grid.findColumnIndex(App.grdHisOrdCalcPromo.columns, 'ApprovalOrder');
    if (cellIndex == colIndex && record.data.SelOrder) {
        
    }
};

var grdHisOrdCalcPromo_beforeEdit = function (sender, e) {
    App.slmOrderCalcPromo.select(e.rowIdx);
    
    if (e.field == 'SelOrder') {
        if (App.grdOrder.selModel.selected.length > 0) {

            setTimeout(function () {
                var recordOrderNbr = App.grdOrder.selModel.selected.items[0].data;// HQ.store.findInStore(App.grdOrder.store, ["Selected"], [true]);
                if (recordOrderNbr != undefined) {
                    var recordHistOrd = HQ.store.findInStore(App.grdHisOrdCalcPromo.store, ["SelOrder"], [true]);
                    if (recordHistOrd != undefined && recordHistOrd.ID != e.record.data.ID) { // Chi dc chon 1 dong
                        return false;
                    }
                } else {
                    return false;
                }
            }, 500);
        }
    }
}

var grdHisOrdCalcPromo_ValidateEdit = function (sender, e) {
    if (e.field == 'SelOrder' && App.grdOrder.selModel.selected.length > 0) {

        var recordOrderNbr = App.grdOrder.selModel.selected.items[0].data;
        if (recordOrderNbr != undefined) {
            var recordHistOrd = HQ.store.findInStore(App.grdHisOrdCalcPromo.store, ["SelOrder"], [true]);
            if (recordHistOrd != undefined && recordHistOrd.ID != e.record.data.ID) { // Chi dc chon 1 dong
                return false;
            }            
        }

        if (recordOrderNbr == undefined) {
            return false;
        }
        if (e.value) {
            if (!updateQty(e.record, recordOrderNbr)) {
                HQ.message.show(2018020301);// Sl vượt quá cho phép xuất chưa rls
                return false;
            } else {
                if (!recordOrderNbr.Selected) {
                    App.grdOrder.selModel.selected.items[0].set('Selected', true);
                }
            }
        }
    }
}

var checkBeforeUpdate = function () {
    var storeDet = App.stoDet4Save;
    var recordOrderNbr = App.grdOrder.selModel.selected.items[0].data
    
    if (recordOrderNbr == undefined) {
        return false;
    }
    var isOk = true;
    storeDet.data.each(function (item) {
        if (item.data.OrderNbr == recordOrderNbr.OrderNbr) {
            if (!item.data.FreeItem || (item.data.FreeItem && Ext.isEmpty(item.data.DiscCode) || Ext.isEmpty(item.data.DisplayID))) {            
                var obj = HQ.store.findRecord(App.grdHisDetCalcPromo.store, ["LineRef"], [item.data.LineRef]);
                if (obj) {
                    var qtyShip1 = obj.data.LineQty1, qtyShip2 = obj.data.LineQty2, qtyShip = obj.data.LineQty;
                    if (item.data[recordOrderNbr.CheckQty.split(',')[0]] < qtyShip) {
                        isOk = false;
                        return false;
                    }
                }                
            }
        }
    });
    return isOk;
};

var updateQty = function (record, recordOrderNbr) {
    if (App.stoHisDetcalcPromo.data.items[0] && App.stoHisDetcalcPromo.data.items[0].data.ID == record.data.ID) {
        if (checkBeforeUpdate()) {
            var storeDet4Save = App.stoDet4Save;
            storeDet4Save.data.each(function (item) {
                if (item.data.OrderNbr == recordOrderNbr.OrderNbr) {
                    if (!item.data.FreeItem || (item.data.FreeItem && Ext.isEmpty(item.data.DiscCode) || Ext.isEmpty(item.data.DisplayID))) {
                        var obj = HQ.store.findRecord(App.grdHisDetCalcPromo.store, ["LineRef"], [item.data.LineRef]);
                        if (obj) {
                            var qtyShip1 = obj.data.LineQty1, qtyShip2 = obj.data.LineQty2, qtyShip = obj.data.LineQty;
                            item.set(recordOrderNbr.EditColumn.split(',')[0], qtyShip);
                            item.set(recordOrderNbr.EditColumn.split(',')[0] + '1', qtyShip1);
                            item.set(recordOrderNbr.EditColumn.split(',')[0] + '2', qtyShip2);
                            if (qtyShip1 > 0 || qtyShip2 > 0) {
                                item.set("Selected", 1);
                            }
                            else {
                                item.set("Selected", 0);
                            }
                        } else {
                            item.set("Selected", 0);
                        }

                        item.commit();
                    }
                }
            });
            var storeDet = App.stoDet;
            storeDet.data.each(function (item) {
                if (item.data.OrderNbr == recordOrderNbr.OrderNbr) {
                    var obj = HQ.store.findRecord(App.grdHisDetCalcPromo.store, ["LineRef"], [item.data.LineRef]);
                    if (obj) {
                        var qtyShip1 = obj.data.LineQty1, qtyShip2 = obj.data.LineQty2, qtyShip = obj.data.LineQty;
                        item.set(recordOrderNbr.EditColumn.split(',')[0], qtyShip);
                        item.set(recordOrderNbr.EditColumn.split(',')[0] + '1', qtyShip1);
                        item.set(recordOrderNbr.EditColumn.split(',')[0] + '2', qtyShip2);
                        if (qtyShip1 > 0 || qtyShip2 > 0) {
                            item.set("Selected", 1);
                        }
                        else {
                            item.set("Selected", 0);
                        }
                    } else {
                        item.set("Selected", 0);
                    }
                    item.commit();
                }
            });
            App.grdDet.view.refresh();
        } else {            
            return false;

        }
    }
    return true;
}

var checksaveOrder = function (isSaveWithOutBudget) {
    _calcID = 0;
    _isApproveAll = false;
    _confirmed = false;
    _isAllManualPromoOrDisplay = false;
    if (listApproveOrder.length > 0) {
        var order = listApproveOrder[0];
        // console.log(order.OrderNbr);
        var tmp = [];
        tmp.push(order);
        HQ.currOrder = order;
        App.frmMain.submit({
            waitMsg: HQ.waitMsg,
            method: 'POST',
            url: 'OM20500/CheckCalcPromo',
            timeout: 1800000,
            params: {
                lstDet: HQ.store.getAllData(App.stoDet4Save, ["OrderNbr"], [order.OrderNbr]),
                lstOrder: Ext.encode(tmp),
                isSaveWithOutBudget: isSaveWithOutBudget == undefined ? false : true
            },
            success: function (msg, data) {
                if (this.result) {
                    if (this.result.message != undefined) {
                        HQ.message.show(20410, [this.result.message], '', true);
                        return false;
                    }
                    _calcID = this.result.calcID;
                    _isApproveAll = this.result.calcDisc;
                    _isAllManualPromoOrDisplay = this.result.isAllManualPromoOrDisplay;
                    if (this.result.outOfStock > 0) {
                        HQ.message.show(2019060501, [order.OrderNbr], 'cancelApprove', true);
                    } else {
                        if (_isApproveAll) {
                            if (!order.ForceCalcPromo && order.Edited != true && (_calcID > 0 || _calcID == 0 && this.result.totalHisRow == 0 || _isAllManualPromoOrDisplay)) {
                                askCalcPromo('yes', false);
                            } else {
                                if (_calcPromo) {
                                    saveOrder(true);
                                }
                                else {
                                    HQ.message.show(2018012402, [order.OrderNbr], 'askCalcPromo', true);
                                }
                                
                            }
                        } else {
                            if (_calcID == 0) {
                                HQ.message.show(2018012402, [order.OrderNbr], 'askCalcPromo', true);
                            } else {
                                askCalcPromo('yes', false);
                            }
                        }
                    }
                } 
            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
            }
        });
    } else {
        if (message) {
            HQ.message.show(20410, [message], "", true);
        } else {
            _calcPromo = false;
            HQ.message.show(8009, [message], "", true);
            //_recordOrder.items.forEach(function(item))
        }
        Event.Form.btnLoad_click();
    }
}

var askCalcPromo = function (item, notConfirm) {
    _confirmed = false;
    if (item == 'yes') {
        if (notConfirm != undefined) {
            _confirmed = false;
        } else {
            _confirmed = true;
        }
        
        //var recordOrderDate = HQ.store.findRecord(App.stoOrder, ["OrderNbr"], [HQ.currOrder.OrderNbr]);
        //if (!_isShowedPopupWinOrder) {
        //    App.cboDelivery.setValue('');
        //    App.dteShipDate.setValue(HQ.bussinessDate);
        //    App.dteARDocDate.setValue(HQ.bussinessDate);

        //    App.dteShipDate.setMaxValue(HQ.bussinessDate);
        //    App.dteARDocDate.setMaxValue(HQ.bussinessDate);


        //    if (recordOrderDate != undefined) {
        //        App.dteShipDate.setMinValue(recordOrderDate.data.OrderDate);
        //        App.dteARDocDate.setMinValue(recordOrderDate.data.OrderDate);
        //    }
        //    _isShowedPopupWinOrder = true;
        //    App.chkAddStock.setValue(false);
        //    App.winOrder.show();           
        //} else {
            save();
        //}        
    } else {
        Event.Form.btnLoad_click();
    }
}
function cancelApprove(item) {
    //if (listApproveOrder.length > 1) {
        Event.Form.btnLoad_click();
    //}
}
var winChoice_Close = function () {
    clearChoice();
    if (App.winChoice.autoRefresh == undefined) {
        Event.Form.btnLoad_click();
    }
    App.winChoice.autoRefresh = undefined;
};

var clearChoice = function () {
    // clear choice & popup
    App.stoChoice.clearFilter();
    App.stoChoice.clearData();
    App.stoChoiceHeader.clearFilter();
    App.stoChoiceHeader.clearData();    
}
var grdHisOrdCalcPromo_color = function (record) {
    if (record.data.OutOfStockBudget != 0) {
        return 'hightlight-IsOutOfStockBudget';
    }
}

//Import
function btnDeliveryID_Click() {
    var lstOrder = App.grdOrder.store.snapshot || App.grdOrder.store.alldata || App.grdOrder.store.data;
    var checkOrder = false;
    var checkStatusOrder = true;
    if (lstOrder != undefined) {
        for (var i = 0; i < lstOrder.length; i++) {
            if (lstOrder.items[i].data.Selected == true) {
                checkOrder = true;
            }
            if (lstOrder.items[i].data.Status == 'C' || lstOrder.items[i].data.Status == 'E') {
                checkStatusOrder = false;
            }
        }
    }
    if (checkOrder == false) {
        HQ.message.show(2020052860);
        return false;
    }
    if (checkStatusOrder == false) {
        HQ.message.show(2020052861);
        return false;
    }

    App.dteShipDateSave.setValue(HQ.bussinessDate);
    App.dteARDocDateSave.setValue(HQ.bussinessDate);

    App.dteShipDateSave.setMaxValue(HQ.bussinessDate);
    App.dteARDocDateSave.setMaxValue(HQ.bussinessDate);
    var recordOrderDate = App.grdOrder.selModel.selected.items;
    if (recordOrderDate.length > 0) {
        App.dteShipDateSave.setMinValue(recordOrderDate[0].data.OrderDate);
        App.dteARDocDateSave.setMinValue(recordOrderDate[0].data.OrderDate);
    }


    App.cboDeliverySave.store.reload();

    App.winOrderSave.show();
}
var btnImport_Click = function (sender, e) {
    var fileName = sender.getValue();
    var ext = fileName.split(".").pop().toLowerCase();
    if (ext == "xls" || ext == "xlsx") {
        App.frmMain.submit({
            waitMsg: "Importing...",
            url: 'OM20500/Import',
            timeout: 18000000,
            clientValidation: false,
            method: 'POST',
            params: {

            },
            success: function (msg, data) {
                if (this.result.data && !Ext.isEmpty(this.result.data.message)) {
                    HQ.message.show('2013103001', [this.result.data.message], '', true);
                }
                else {
                    HQ.message.process(msg, data, true);
                    Event.Form.btnLoad_click();
                }

            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
                sender.reset();
            }
        });
    }
    else {
        HQ.message.show('2014070701', '', '');
        sender.reset();
    }
};
//Export
var btnExport_Click = function () {
    App.frmMain.submit({
        url: 'OM20500/ExportExcel',
        type: 'POST',
        timeout: 1000000,
        clientValidation: false,
        params: {

        },
        success: function (msg, data) {
            
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
        }
    });
};
var btnDiscManual_Click = function () {
    var countSelected = 0;
    var lst = App.grdOrder.store.snapshot || App.grdOrder.store.allData || App.grdOrder.store.data;
    if (lst != undefined) {
        lst.items.forEach(function (item) {
            if (item.data.Selected == true) {
                _recordOrder = item;
                countSelected++;
            }
        })
    }
    if (countSelected > 1) {
        HQ.message.show(2020120260);
    }
    else if (countSelected == 1) {
        
        App.winManualPromo.show();
        _slsperID = _recordOrder.data.SlsperID;
        _custID = _recordOrder.data.CustID;
        _orderDate = _recordOrder.data.OrderDate;
        _totalAmt = _recordOrder.data.OrdAmt;
        _orderNbr = _recordOrder.data.OrderNbr;
        setTimeout(function () {
            App.stoManualPromo.reload();
        }, 500);
        
    }
}

var btnForceCalcPromo_Click = function () {
    _calcPromo = true;
    var lst = App.grdOrder.store.snapshot || App.grdOrder.store.allData || App.grdOrder.store.data;
    if (lst != undefined) {
        lst.items.forEach(function (item) {
            if (item.data.Selected == true) {
                var record = HQ.store.findRecord(App.grdOrder.store, ["OrderNbr"], [item.data.OrderNbr]);
                if (record != undefined) {
                    record.set("ForceCalcPromo", true);
                }
                message = "";
                //if (item.data.OrdDiscAmt > 0) {
                //    
                //    HQ.message.show(2019120560, [item.data.OrderNbr], '', true);
                //    return false;
                //}

            }
        })
        listApproveOrder = getAllData(App.stoOrder, ["Selected"], [true]);
        var lstOrder = App.stoOrder.snapshot || App.stoOrder.allData || App.stoOrder.data;
        if (lstOrder != undefined) {
            lstOrder.items.forEach(function (item) {
                if (item.data.Selected) {                    
                    App.stoOrderCheck.add(item);
                }
            })
        }
        
        saveOrder(true);
    }
   
}
var grdManualPromo_BeforeEdit = function(editor, e){
    if (e.field == "Discount" && e.record.data.FreeItemID != "") return false;
}

var grdManualPromo_Edit = function (editor, e) {
    if (e.field == "Discount") {
        e.record.set("TotalDiscout", e.record.data.Discount);
    }
    if (e.field == "Selected" && e.record.data.Selected == true) {
        if (e.record.data.FreeItemID == "") {
            e.record.set("TotalDiscout", e.record.data.Discount);
        }
    }
}

var grdManualPromo_ValidateEdit = function (editor, e) {
    
}

var btnManualOk_Click = function () {
    var lstManual = App.grdManualPromo.store.snapshot || App.grdManualPromo.store.allData || App.grdManualPromo.store.data;
    var totalDiscCount = 0;
    if (lstManual != undefined) {
        lstManual.items.forEach(function (item) {
            if (item.data.Selected == true) {
                totalDiscCount += item.data.TotalDiscout;
            }
        });
    }
    if (_recordOrder.data.OrdAmt < totalDiscCount) {
        HQ.message.show(2020120261);
        return false;
    }

    App.frmMain.submit({
        waitMsg: HQ.common.getLang('SavingData'),
        url: 'OM20500/SaveManual',
        timeout: 18000000,
        clientValidation: false,
        method: 'POST',
        params: {
            lstManual: Ext.encode(App.grdManualPromo.store.getRecordsValues()),
            branchID: _recordOrder.data.BranchID,
            orderNbr: _recordOrder.data.OrderNbr,
            slsperID: _recordOrder.data.SlsperID
        },
        success: function (msg, data) {
            _isManual = true;
            App.stoOrder.reload();
            App.winManualPromo.hide();           
            //HQ.message.show(8009, [], "", true);
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
        }
    });
}