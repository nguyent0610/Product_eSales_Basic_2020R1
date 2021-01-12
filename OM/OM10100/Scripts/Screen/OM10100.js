HQ.recentRecord = null;
HQ.focus = 'order';
HQ.objOrder = null;
HQ.objCust = null;
HQ.objType = null;
HQ.objIN = null;
HQ.objOM = null;
HQ.objUser = null;
HQ.false = false;
var _OldOrder = 'OO';
var _ReturnOrder = 'IR';
var _INOrder = "IN";
var _ordNbr = '';
var _selOrderType = '';
var _displayIDs = '';
var _discSite = '';
var _OMSite = '';
var _OMWhseLoc = '';
var _BKOrderType = '';
var _BKOrderNbr = '';
var _selSiteID = '';
var lstSelected = [];
var _isChangeShipDate = true; 
var kmTienDu = 'KMTienDu';
var _lstInvt = [];
var _lstFree = [];
var changeQty = false;
var _totalAmt = 0;
//// Store ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
var stoHandle_Load = function () {
    App.cboHandle.setValue('N');
    App.stoManualPromo.reload();
};

var stoOM10100_pdDocBal_Load = function (sto) {
    var number = 0.0;
    if (sto.data.getCount() > 0) {
        number = sto.data.items[0].data.DocBal;
        if (!number) {
            number = 0.0;
        }
    }
    App.txtDocBal.setValue(number);
};

var stoData_Load = function () {
    HQ.numSource++;
    checkSetDefault();
};

var stoOrder_Load = function () {
    var record = App.stoOrder.getById(App.cboOrderNbr.getValue());
    if (record) {
        bindOrder(record);
    }
};

var stoDetail_Load = function () {
    checkSourceDetail();
    var existRecordEmpty = HQ.store.findRecord(App.stoOrdDet, ["InvtID"], [""]);
    if (existRecordEmpty == undefined) {
        var newRow = Ext.create('App.mdlOrdDet');
        newRow.data.BOType = 'S';
        HQ.store.insertRecord(App.stoOrdDet, "InvtID", newRow, true);
    }  

    App.smlOrdDet.select(0);
};

var stoOrdDet_BeforeLoad = function () {
    App.grdOrdDet.view.loadMask.disable();
};

var stoTaxTrans_BeforeLoad = function () {
    if (!Ext.isEmpty(App.grdTaxTrans.view.loadMask.disable)) {
        App.grdTaxTrans.view.loadMask.disable();
    }
};

var stoOrdDisc_BeforeLoad = function () {
    if (!Ext.isEmpty(App.grdDisc.view.loadMask.disable)) {
        App.grdDisc.view.loadMask.disable();
    }
};

var stoUserDefault_Load = function () {
    _discSite = '';
    _OMSite = '';
    if (App.stoUserDefault.data.items.length == 0) {
        if (HQ.false == false) {
            HQ.false = true;
            HQ.message.show(8006, '', '', true);
            App.frmMain.setDisabled(true);
            HQ.common.showBusy(false);
        }
    } else {
        HQ.objUser = App.stoUserDefault.data.items[0].data;
        _discSite = HQ.objUser.DiscSite;
        _OMSite = HQ.objUser.OMSite;
    }
};

var stoINSetup_Load = function () {
    if (App.stoINSetup.data.items.length == 0) {
        if (HQ.false == false) {
            HQ.false = true;
            HQ.message.show(8006, '', '', true);
            App.frmMain.setDisabled(true);
            HQ.common.showBusy(false);
        }
    } else {
        HQ.objIN = App.stoINSetup.data.items[0].data;
        HQ.numSource++;
        checkSetDefault();
    }
};

var stoOMSetup_Load = function () {
    if (App.stoOMSetup.data.items.length == 0) {
        if (HQ.false == false) {
            HQ.false = true;
            HQ.message.show(8006, '', '', true);
            App.frmMain.setDisabled(true);
            HQ.common.showBusy(false);
        }
    } else {
        HQ.objOM = App.stoOMSetup.data.items[0].data;
        HQ.numSource++;
        checkSetDefault();
    }
};

var stoSearchBackOrder_BeforeLoad = function () {
    HQ.common.showBusy(true, HQ.common.getLang('loadingdata'), App.winSearchBackOrder);
}

var stoSearchBackOrder_Load = function () {
    HQ.common.showBusy(false, HQ.common.getLang('loadingdata'), App.winSearchBackOrder);
}

var loadCust = function (custID, orderDate, shipToID, isSelect) {
    if (isSelect) {
        HQ.numCust = 0;
        HQ.maxCust = 5;
        App.stoPrice.load({
            params: { custID: custID, orderDate: orderDate, branchID: App.txtBranchID.getValue() }, callback: checkSelectCust
        });
        App.stoCustomer.load({
            params: { custID: custID, branchID: App.txtBranchID.getValue() }, callback: checkSelectCust
        });
        App.stoShipToID.load({
            params: { custID: custID, branchID: App.txtBranchID.getValue() }, callback: checkSelectCust
        });
        App.stoSOAddress.load({
            params: { custID: custID, branchID: App.txtBranchID.getValue(), shipToID: shipToID }, callback: checkSelectCust
        });
        App.cboMarkOrderOM10100_pcMarkOrder.reload();
    } else {
        HQ.numCust = 0;
        HQ.maxCust = 4;
        App.stoPrice.load({
            params: { custID: custID, orderDate: orderDate, branchID: App.txtBranchID.getValue() }, callback: checkSelectCust
        });
        App.stoCustomer.load({
            params: { custID: custID, branchID: App.txtBranchID.getValue() }, callback: checkSelectCust
        });
        App.stoShipToID.load({
            params: { custID: custID, branchID: App.txtBranchID.getValue() }, callback: checkSelectCust
        });
        App.cboMarkOrderOM10100_pcMarkOrder.reload();
    }
};

var checkSelect = function (records, options, success) {
    HQ.numSelectDet++;
    if (HQ.numSelectDet == HQ.maxSelectDet) {
        App.grdOrdDet.view.loadMask.hide();
        App.grdOrdDet.view.loadMask.setDisabled(false)
        getQtyAvail(options.row);
    }
};

var checkSelectLot = function (records, options, success) {
    HQ.numSelectLot++;
    if (HQ.numSelectLot == HQ.maxSelectLot) {
        App.grdLot.view.loadMask.hide();
        App.grdLot.view.loadMask.setDisabled(false)
        getLotQtyAvail(options.row);
    }
};

var checkSetDefault = function () {
    if (HQ.numSource == HQ.maxSource) {
        App.cboReport.store.reload();
        defaultOnNew();
    }
};

var checkSourceEdit = function (records, options, success) {
    HQ.numDet++;
    if (HQ.numDet == HQ.maxDet) {
        checkExitEdit(options.row);
    }
};

var checkSourceEditLot = function (records, options, success) {
    HQ.numLot++;
    if (HQ.numLot == HQ.maxLot) {
        checkExitEditLot(options.row);
    }
};

var checkSourceDetail = function (records, options, success) {
    HQ.numDetail++;
    if (HQ.numDetail == HQ.maxDetail) {
        App.stoEditDetail.reload();
        bindDetail();
        calcSalesPromoMark();
    }
};

var calcSalesPromoMark = function () {
    var length = App.stoOrdDet.data.length;
    var salesMark = 0.0;
    var promoMark = 0.0;
    App.stoOrdDet.suspendEvents();
    for (var i = 0; i < length; i++) {
        if (App.stoOrdDet.data.items[i].data.FreeItem == true) {
            promoMark += App.stoOrdDet.data.items[i].data.Mark;
        } else {
            salesMark += App.stoOrdDet.data.items[i].data.Mark;
        }
    }
    App.txtPromoMark.setValue(promoMark);
    App.txtSalesMark.setValue(salesMark);
    App.stoOrdDet.resumeEvents();
};

var checkSelectCust = function (records, options, success) {
    HQ.numCust++;
    if (HQ.numCust == HQ.maxCust) {
        bindCust();
    }
};
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

//// Event ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

var frmMain_BoxReady = function () {
    App.txtDocBal.setReadOnly(true);
    HQ.numSource = 0;
    HQ.maxSource = 14;

    HQ.numDetail = 0;
    HQ.maxDetail = 5;

    App.btnBackOrder.setVisible(!HQ.IsNewBackOrder);
    App.btnSearchBackOrder.setVisible(HQ.IsNewBackOrder);
    App.cboOrderNbr.key = true;
    App.txtBranchID.setValue(HQ.cpnyID);

    App.cboStatus.getStore().addListener('load', stoData_Load);
    App.cboSlsPerID.getStore().addListener('load', stoData_Load);
    App.cboDeliveryID.getStore().addListener('load', stoData_Load);

    App.cboDetBOType.getStore().addListener('load', stoData_Load);
    //App.cboDetSiteID.getStore().addListener('load', stoData_Load);
    App.cboDetBudgetID.getStore().addListener('load', stoData_Load);
    App.cboDetTaxCat.getStore().addListener('load', stoData_Load);
    App.cboReport.getStore().addListener('load', stoData_Load);

    App.cboOrderType.getStore().addListener('load', function () {
        Ext.each(App.cboOrderType.getStore().getRange(), function (record) {
            var newRecordData = Ext.clone(record.copy().data);
            var model = new App.stoBKOrderType.model(newRecordData, newRecordData.id);
            App.stoBKOrderType.add(model);
        });
        HQ.numSource++;
        checkSetDefault();
    });

    App.cboReasonCode.getStore().addListener('load', function () {
        Ext.each(App.cboReasonCode.getStore().getRange(), function (record) {
            var newRecordData = Ext.clone(record.copy().data);
            var model = new App.stoBKReasonCode.model(newRecordData, newRecordData.id);
            App.stoBKReasonCode.add(model);
        });
        HQ.numSource++;
        checkSetDefault();
    });

    App.stoUnitConversion.addListener('load', function () {
        //Ext.each(App.stoUnitConversion.getRange(), function (record) {
        //    var newRecordData = Ext.clone(record.copy().data);
        //    var model = new App.stoUnitConversion.model(newRecordData, newRecordData.id);
        //    App.stoUnit.add(model);
        //});
        HQ.numSource++;
        checkSetDefault();
    });

    App.cboMarkOrderOM10100_pcMarkOrder.addListener('load', function () {
        checkSelectCust();
    });

    App.stoInvt.addListener('load', stoData_Load);
    App.stoTax.addListener('load', stoData_Load);
    App.stoUserDefault.addListener('load', stoUserDefault_Load);
    App.stoINSetup.addListener('load', stoINSetup_Load);
    App.stoOMSetup.addListener('load', stoOMSetup_Load);
    App.cboHandle.getStore().addListener('load', stoHandle_Load);
    App.stoOrderType = App.cboOrderType.getStore();
    App.stoBOType = App.cboDetBOType.getStore();
    App.stoDisc = App.cboDetDiscCode.getStore();
    App.stoBudget = App.cboDetBudgetID.getStore();
    App.stoINSetup.load();
    App.stoOMSetup.load();
    App.stoUserDefault.load();
    App.stoUnitConversion.load();
    App.stoInvt.load();
    App.stoTax.load();
    App.cboBKReasonCode.lastQuery = '';
    App.cboBKOrderType.lastQuery = '';
    App.cboDetTaxID.lastQuery = '';
    App.cboDetUnitDesc.lastQuery = '';
    App.cboLotUnitDesc.lastQuery = '';
    App.btnImport.setVisible(HQ.allowImport);
    App.txtCodeHT.setVisible(HQ.ShowLTTContractNbr);
    App.chkCreditHold.setVisible(HQ.ShowCreditHold);
    App.txtDocBal.setVisible(HQ.ShowDocBal);
    
    HQ.common.showBusy(true, HQ.waitMsg);
   
};

var frmMain_FieldChange = function (item, field, newValue, oldValue) {
    if (field.key != undefined || !App.cboDetInvtID.submitValue) {
        return;
    }
    if (App.frmMain.getRecord() != undefined) {
        App.frmMain.updateRecord();
    }
    if (Object.keys(App.stoOrder.getChangedData()).length > 0 || App.grdOrdDet.isChange) {
        setChange(true);
    } else {
        setChange(false);
    }
};

var menuClick = function (command) {
    switch (command) {
        case "first":
            if (HQ.focus == 'order') {
                if (HQ.isChange || App.grdOrdDet.isChange) {
                    HQ.message.show(150, '', '', true);
                } else {
                    App.frmMain.loadRecord(App.stoOrder.first());
                }
            } else if (HQ.focus == 'det') {
                HQ.grid.first(App.grdOrdDet);
            }
            break;
        case "next":
            if (HQ.focus == 'order') {
                if (HQ.isChange || App.grdOrdDet.isChange) {
                    HQ.message.show(150, '', '', true);
                } else {
                    var index = App.stoOrder.indexOf(App.stoOrder.getById(App.cboOrderNbr.getValue()));
                    App.cboOrderNbr.setValue(App.stoOrder.getAt(index + 1).get('OrderNbr'));
                }
            } else if (HQ.focus == 'det') {
                HQ.grid.next(App.grdOrdDet);
            }
            break;
        case "prev":
            if (HQ.focus == 'order') {
                if (HQ.isChange || App.grdOrdDet.isChange) {
                    HQ.message.show(150, '', '', true);
                } else {
                    var index = App.stoOrder.indexOf(App.stoOrder.getById(App.cboOrderNbr.getValue()));
                    App.cboOrderNbr.setValue(App.stoOrder.getAt(index - 1).get('OrderNbr'));
                }
            } else if (HQ.focus == 'det') {
                HQ.grid.prev(App.grdOrdDet);
            }
            break;
        case "last":
            if (HQ.focus == 'order') {
                if (HQ.isChange || App.grdOrdDet.isChange) {
                    HQ.message.show(150, '', '', true);
                } else {
                    App.frmMain.loadRecord(App.stoOrder.last());
                }
            } else if (HQ.focus == 'det') {
                HQ.grid.last(App.grdOrdDet);
            }
            break;
        case "save":
            if (App.grdOrdDet.view.loadMask.isVisible()) {
                return;
            }
            save();
            break;
        case "delete":
            if (HQ.isDelete > 0) {
                if (HQ.focus == 'order') {
                    if (App.cboOrderNbr.value) {
                    
                        if (App.cboStatus.getValue() != 'N') {
                            HQ.message.show(2015020805, [App.cboOrderNbr.value], '', true);
                        } else {
                            HQ.message.show(11, '', 'deleteHeader');
                        }                   
                    } else {
                        menuClick('new');
                    }
                } else if (HQ.focus == 'det') {
                    // && 
                    var lstOrdDet = App.grdOrdDet.store.snapshot || App.grdOrdDet.store.allData || App.grdOrdDet.store.data;
                    if (App.cboOrderType.getValue() == _ReturnOrder) {
                        lstOrdDet = App.grdOrdDet.store.data;
                    }
                    var countNotFreeItem = 0;
                    if (lstOrdDet != undefined) {
                        lstOrdDet.items.forEach(function (item) {
                            if (item.data.FreeItem == false && item.data.InvtID!= "") {
                                countNotFreeItem++;
                            }
                        })
                    }
                    if ((App.cboOrderNbr.value && HQ.isUpdate) || (!App.cboOrderNbr.value && HQ.isInsert)) {
                        if (App.cboStatus.getValue() != "N") {
                            HQ.message.show(2015020805, [App.cboOrderNbr.value], '', true);
                            return;
                        }
                        if (_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder) {// không cho xoá dòng ở đơn trả hàng
                            if (HQ.DeleteRow == 1 || HQ.DeleteRow == 2) {
                                if (App.smlOrdDet.selected.items.length != 0) {
                                    //Bo ra theo yeu cau anh Suong 10/11/2016 (cho xoa hang co check KM)
                                    if (!Ext.isEmpty(App.smlOrdDet.selected.items[0].data.InvtID)) {
                                        if (countNotFreeItem <= 1) {
                                            HQ.message.show(2020062260);
                                            return false;
                                        }
                                        else {
                                            HQ.message.show(2015020806, [App.smlOrdDet.selected.items[0].data.InvtID], 'deleteDet', true);
                                        }                                                                            
                                    }
                                }
                            }
                        }
                        else {
                            if (App.smlOrdDet.selected.items.length != 0) {
                                //Bo ra theo yeu cau anh Suong 10/11/2016 (cho xoa hang co check KM)
                                if (!Ext.isEmpty(App.smlOrdDet.selected.items[0].data.InvtID)) {
                                    if (App.smlOrdDet.selected.items[0].data.FreeItem && Ext.isEmpty(App.smlOrdDet.selected.items[0].data.DiscCode) && App.cboOrderType.getValue() != "IR") {
                                        return;//KM tu dong khong cho xoa
                                    }
                                    else {
                                        if (countNotFreeItem <= 1) {
                                            HQ.message.show(2020062260);
                                            return false;
                                        }
                                        else {
                                            HQ.message.show(2015020806, [App.smlOrdDet.selected.items[0].data.InvtID], 'deleteDet', true);
                                        }
                                    }
                                   
                                }
                            }
                        }
                    }
                }
            } else {
                HQ.message.show(728, '', '', true);
            }
            break;
        case "close":
            if (App.frmMain.getRecord() != undefined) App.frmMain.updateRecord();
            if (HQ.isChange || App.grdOrdDet.isChange) {
                HQ.message.show(5, '', 'askClose');
            } else {
                HQ.common.close(this);
            }
            break;
        case "new":
            if ((HQ.isChange || App.grdOrdDet.isChange) && !Ext.isEmpty(App.cboOrderNbr.getValue())) {
                HQ.message.show(2015030201, '', "askNew", true);
            } else {                
                defaultOnNew();
            }
            break;
        case "refresh":
            _ordNbr = App.cboOrderNbr.getValue();
            if (!Ext.isEmpty(App.cboOrderNbr.getValue())) {
                clearBKPopupData();
                App.stoOrder.reload();
            } else {
                defaultOnNew();
            }
            changeQty = false;
            App.stoOM10100_pdDocBal.reload();
            break;
        case "print":
            if (!Ext.isEmpty(App.cboOrderNbr.getValue()) && App.cboStatus.value != "N") {
                App.winReport.show();
            }
            break;
        default:
    }
};

var btnNote_Click = function () {
    if (Ext.isEmpty(App.cboOrderNbr.getValue())) return;
    HQ.common.showBusy(true, HQ.waitMsg);
    App.direct.OM10100GetNote(App.txtBranchID.getValue(), App.cboOrderNbr.getValue(), {
        success: function (result) {
            App.txtNote.setValue(result);
            App.winNote.show();
            App.txtNote.setReadOnly(App.cboStatus.getValue() != 'N');
            HQ.common.showBusy(false);
        }
    });
};

var btnNoteOK_Click = function () {
    HQ.common.showBusy(true, HQ.waitMsg);
    App.direct.OM10100UpdateNote(App.txtBranchID.getValue(), App.cboOrderNbr.getValue(), App.txtNote.getValue(), {
        success: function (result) {
            App.winNote.hide();
            HQ.common.showBusy(false);
        }
    });
};

var btnImport_Click = function (sender, e) {
    var fileName = sender.getValue();
    var ext = fileName.split(".").pop().toLowerCase();
    if (ext == "xls" || ext == "xlsx") {
        App.frmMain.submit({
            waitMsg: "Importing...",
            url: 'OM10100/Import',
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
                    menuClick('refresh');
                }               
            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
            }
        });
    }
    else {
        HQ.message.show('2014070701', '', '');
        sender.reset();
    }
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
                    if (found == -1){
                        dict.push({
                            key:   choice.data.GroupItem,
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
                    selectQty = selectQty + choice.data.FreeItemQty;
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

    } else if (totalHeaderAmtUsed < totalHeaderPromoAmt && totalHeaderPromoAmt - totalHeaderAmtUsed > headerMinPrice) {
        var dt = objChoiceDetBonus.data;
        AddChoiceBonus(dt, totalHeaderPromoAmt - totalHeaderAmtUsed);
    }
    else {
        _lstInvt = [];
        _lstFree = [];
        saveChoice();
    }
}

var AddChoiceBonus = function (item, headerPromoBonusAmt) {
    App.stoChoice.clearFilter();
    App.stoChoiceHeader.filterBy(function (it) {
        if (it.data.Index == kmTienDu) {
            return it;
        }
    });

    //HQ.message.show(2018080601, [headerPromoBonusAmt.format(0, 3, ',', '.')], '', true);
    App.stoChoice.sort('PromoPrice', 'ASC');
    var lstInvtID = [];   
    //item.MaxQty = HQ.util.mathFloor(headerPromoBonusAmt / item.PromoPrice, 0);
    App.stoChoice.data.each(function (it) {
        debugger
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
            newChoice.CnvFact = choice.CnvFact;
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
    for (var i = stoChoiceLength -1; i > -1; i--) {
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
        var _lstInvt = [];
        var _lstFree = [];
        saveChoice();
    }
   
}
var btnLot_Click = function () {
    if (Ext.isEmpty(this.record.invt)) {
        this.record.invt = HQ.store.findInStore(App.stoInvt, ['InvtID'], [this.record.data.InvtID]);
    }

    if (this.record.invt != undefined && !Ext.isEmpty(this.record.invt.LotSerTrack) && this.record.invt.LotSerTrack != 'N' && !Ext.isEmpty(this.record.data.SlsUnit)) {
        showLot(this.record, true);
    }
};

var btnLotOK_Click = function () {
    if (!App.grdLot.isLock) {
        var det = App.winLot.record.data;
        var flat = null;
        App.stoLotTrans.data.each(function (item) {
            if (!Ext.isEmpty(item.data.LotSerNbr)) {
                if (item.data.Qty == 0) {
                    HQ.message.show(1000, [HQ.common.getLang('qty')], '', true);
                    flat = item;
                    return false;
                }

                if (Ext.isEmpty(item.data.UnitDesc)) {
                    HQ.message.show(1000, [HQ.common.getLang('unit')], '', true);
                    flat = item;
                    return false;
                }

                if (Ext.isEmpty(item.data.UnitMultDiv)) {
                    HQ.message.show(2525, [invtID], '', true);
                    flat = item;
                    return false;
                }
            }
        });
        if (!Ext.isEmpty(flat)) {
            App.smlLot.select(App.stoLotTrans.indexOf(flat));
            return;
        }

        var qty = 0;
        App.stoLotTrans.data.each(function (item) {
            if (!Ext.isEmpty(item.data.LotSerNbr)) {
                if (item.data.SiteID == det.SiteID && item.data.InvtID == det.InvtID && item.data.OMLineRef == det.LineRef) {
                    qty += item.data.UnitMultDiv == "M" ? item.data.Qty * item.data.CnvFact : item.data.Qty / item.data.CnvFact;
                }
            }

        });

        var lineQty = (det.UnitMultDiv == "M" ? qty / det.UnitRate : det.LineQty * det.UnitRate)
        if (lineQty % 1 > 0) {
            App.winLot.record.data.LineQty = qty;            
            App.winLot.record.data.SlsUnit = App.winLot.record.invt.StkUnit;
            App.winLot.record.data.UnitRate = 1;
            App.winLot.record.data.UnitMultDiv = "M";
            if (HQ.objOM.DfltSalesPrice == "I") {
                price = Math.round(unitMultDiv == "M" ? App.winLot.record.invt.SOPrice * cnvFact : App.winLot.record.invt.SOPrice / cnvFact);
                App.winLot.record.data.SlsPrice = price;
            } else {
                var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [App.winLot.record.data.InvtID, App.winLot.record.data.SlsUnit]);
                if (!Ext.isEmpty(price)) price = price.Price;
                else price = 0;
                App.winLot.record.data.SlsPrice = price;
            }
        } else {
            App.winLot.record.data.LineQty = Math.round(lineQty);
        }
        if (App.winLot.record.data.FreeItem == true) {
            var tam = HQ.store.findRecord(App.stoManualPromo, ['FreeItemID', 'Selected', 'DiscCode'], [App.winLot.record.data.InvtID, true, App.winLot.record.data.DiscCode]);
            if (tam != undefined) {
                tam.set("FreeItemQty", App.winLot.record.data.LineQty);
                App.grdManualPromo.view.refresh();
            }
        }

        App.winLot.record.commit();        
        App.grdOrdDet.view.refresh();
        checkExitEdit(App.winLot);
        checkSubDisc(App.winLot.record);
        checkTaxInGrid("LineQty", App.winLot.record);

        calcDet();

        for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
            if (Ext.isEmpty(App.stoLotTrans.data.items[i].data.LotSerNbr)) {
                App.stoLotTrans.data.removeAt(i);
            }
        }
    }


    App.winLot.hide();
    if (App.grdOrdDet.selModel.selected.length > 0) {
        HQ.focus = 'det';
    }
};

var btnLotDel_Click = function () {
    if ((App.cboOrderNbr.value && HQ.isUpdate) || (!App.cboOrderNbr.value && HQ.isInsert)) {
        if (App.cboStatus.getValue() != "N") {
            HQ.message.show(2015020805, [App.cboOrderNbr.value], '', true);
            return;
        }
        if (App.smlLot.selected.items.length != 0) {
            if (!Ext.isEmpty(App.smlLot.selected.items[0].data.LotSerNbr)) {
                HQ.message.show(2015020806, [App.smlLot.selected.items[0].data.InvtID + ' ' + App.smlLot.selected.items[0].data.LotSerNbr], 'deleteLot', true);
            }
        }
    }
};

var btnBackOrder_Click = function () {
    if ((HQ.objType.ARDocType == "CM" || HQ.objType.ARDocType == "CC" || HQ.objType.INDocType == "CM") && !Ext.isEmpty(App.cboCustID.getValue()) && Ext.isEmpty(App.cboOrderNbr.getValue())) {
        clearBKPopupData();
        App.cboBKOrderType.validate();
        App.cboBKReasonCode.validate();
        App.cboBKOrderNbr.validate();
        App.winBackOrder.show();
    }
};

var btnSearchBackOrder_Click = function () {
    if ((HQ.objType.ARDocType == "CM" || HQ.objType.ARDocType == "CC" || HQ.objType.INDocType == "CM") && Ext.isEmpty(App.cboOrderNbr.getValue())) {
        clearBKPopupData();
        //App.cboBKOrderType.validate();
        //App.cboBKReasonCode.validate();
        //App.cboBKOrderNbr.validate();
        if (Ext.isEmpty(App.dteFromDate.getValue())) {
            App.dteFromDate.setValue(HQ.businessDate);
        }
        if (Ext.isEmpty(App.dteToDate.getValue())) {
            App.dteToDate.setValue(HQ.businessDate);
        }
        App.stoSearchBackOrder.loadData([], false);
        App.stoSearchBackOrder.removeAll();
        App.grdBackOrder.view.refresh();
        App.winSearchBackOrder.show();
    }
};
var dteFromDate_change = function () {
    App.dteToDate.setMinValue(App.dteFromDate.getValue());
    if (App.dteToDate.getValue() < App.dteFromDate.getValue()) {
        App.dteToDate.setValue(App.dteFromDate.getValue());
    }
}

var btnLoad_Click = function () {
    //if (Ext.isEmpty(App.cboSearchSlsperID.getValue())) {
    //    HQ.message.show(1000, App.cboSearchSlsperID.fieldLabel);
    //    return false;
    //}
    //if (Ext.isEmpty(App.cboSearchCustID.getValue())) {
    //    HQ.message.show(1000, App.cboSearchCustID.fieldLabel);
    //    return false;
    //}

    if (Ext.isEmpty(App.dteFromDate.getValue())) {
        HQ.message.show(1000, App.dteFromDate.fieldLabel);
        return false;
    }
    if (Ext.isEmpty(App.dteToDate.getValue())) {
        HQ.message.show(1000, App.dteToDate.fieldLabel);
        return false;
    }
    App.stoSearchBackOrder.reload();
}

var winSearchBackOrder_BeforeShow = function () {
    App.frmMain.mask();
    var height = App.frmMain.getHeight() > 450 ? 450 : App.frmMain.getHeight();
    var width = App.frmMain.getWidth() > 850 ? 850 : App.frmMain.getWidth();
    App.winSearchBackOrder.setHeight(height);
    App.winSearchBackOrder.setWidth(width);
    //App.cboSearchCustID.validate();
    //App.cboSearchSlsperID.validate();
    //App.cboSearchSlsperID.clearValue();
    App.cboSearchSlsperID.store.loadData(App.cboSlsPerID.store.data.items);
}

var btnSearchBackOrderOK_click = function () {
    
    if (App.grdBackOrder.selModel.selected.length == 0) {
        return;
    }
    HQ.common.showBusy(true, HQ.waitMsg);
    var oldOrd = App.grdBackOrder.selModel.selected.items[0].data;
    HQ.objCustSelect = App.grdBackOrder.selModel.selected.items[0].data;
    _BKOrderType = _INOrder;
    _BKOrderNbr = oldOrd.OrderNbr;

    App.cboCustID.setValue(oldOrd.CustID);
    App.txtOrderDate.setValue(oldOrd.OrderDate);
    App.winSearchBackOrder.mask();

    App.cboReasonCode.setValue("");
    App.stoOldOrdDet.load({
        params: { orderNbr: _BKOrderNbr, branchID: App.txtBranchID.getValue() },
        callback: function () {
            App.stoOldOrdDisc.load({
                params: { orderNbr: _BKOrderNbr, branchID: App.txtBranchID.getValue() },
                callback: function () {
                    App.stoOldLotTrans.load({
                        params: { orderNbr: _BKOrderNbr, branchID: App.txtBranchID.getValue() },
                        callback: function () {
                            // Store Return 
                            App.stoRewardAmtReturn.load({
                                params: { orderNbr: _BKOrderNbr, branchID: App.txtBranchID.getValue() },
                                callback: function () {
                                    App.stoOrdDet.clearData();
                                    App.stoTaxTrans.clearData();
                                    App.stoOrdDisc.clearData();
                                    App.stoTaxDoc.clearData();
                                    App.stoLotTrans.clearData();
                                    if (App.stoLotTrans.snapshot != undefined) {
                                        App.stoLotTrans.snapshot.clear();
                                    }
                                    App.grdLot.view.refresh();

                                    App.stoOldOrdDisc.data.each(function (item) {
                                        var newOrd = Ext.create('App.mdlOrdDisc');
                                        newOrd.data.BranchID = item.data.BranchID;
                                        newOrd.data.DiscID = item.data.DiscID;
                                        newOrd.data.DiscSeq = item.data.DiscSeq;
                                        newOrd.data.OrderNbr = "";
                                        newOrd.data.LineRef = item.data.LineRef;
                                        newOrd.data.BreakBy = item.data.BreakBy;
                                        newOrd.data.BudgetID = item.data.BudgetID;
                                        newOrd.data.DiscAmt = item.data.DiscAmt;
                                        newOrd.data.DiscFor = item.data.DiscFor;
                                        newOrd.data.DisctblAmt = item.data.DisctblAmt;
                                        newOrd.data.DisctblQty = item.data.DisctblQty;
                                        newOrd.data.DiscType = item.data.DiscType;
                                        newOrd.data.DiscUOM = item.data.DiscUOM;
                                        newOrd.data.FreeItemBudgetID = item.data.FreeItemBudgetID;
                                        newOrd.data.FreeItemID = item.data.FreeItemID;
                                        newOrd.data.FreeItemQty = item.data.FreeItemQty;
                                        newOrd.data.OrigFreeItemQty = item.data.OrigFreeItemQty;
                                        newOrd.data.SlsPerID = item.data.SlsPerID;
                                        newOrd.data.SOLineRef = item.data.SOLineRef;
                                        newOrd.data.UserOperationLog = item.data.UserOperationLog;
                                        newOrd.data.DiscBreakLineRef = item.data.DiscBreakLineRef;
                                        newOrd.data.RefLineRef = item.data.RefLineRef;
                                        newOrd.data.GroupRefLineRef = item.data.GroupRefLineRef;
                                        newOrd.commit();
                                        App.stoOrdDisc.data.add(newOrd);

                                    })
                                    App.stoOrdDisc.commitChanges();
                                    App.grdDisc.view.refresh();

                                    App.stoOldOrdDet.data.each(function (item) {
                                        var newDet = Ext.create('App.mdlOrdDet');
                                        newDet.data.BranchID = item.data.BranchID;
                                        newDet.data.LineRef = item.data.LineRef;
                                        newDet.data.Descr = item.data.Descr;
                                        newDet.data.DiscPct = item.data.DiscPct;
                                        newDet.data.TaxCat = item.data.TaxCat;
                                        newDet.data.TaxID = item.data.TaxID;
                                        newDet.data.BOCustID = item.data.BOCustID;
                                        newDet.data.BOType = item.data.BOType;
                                        newDet.data.BarCode = item.data.BarCode;
                                        newDet.data.BudgetID1 = item.data.BudgetID1;
                                        newDet.data.BudgetID2 = item.data.BudgetID2;
                                        newDet.data.CostID = item.data.CostID;
                                        newDet.data.DiscAmt = item.data.DiscAmt;
                                        newDet.data.DiscAmt1 = item.data.DiscAmt1;
                                        newDet.data.DiscAmt2 = item.data.DiscAmt2;
                                        newDet.data.DiscCode = item.data.DiscCode;
                                        newDet.data.DiscID1 = item.data.DiscID1;
                                        newDet.data.DiscID2 = item.data.DiscID2;
                                        newDet.data.DiscPct1 = item.data.DiscPct1;
                                        newDet.data.DiscPct2 = item.data.DiscPct2;
                                        newDet.data.DiscSeq1 = item.data.DiscSeq1;
                                        newDet.data.DiscSeq2 = item.data.DiscSeq2;
                                        newDet.data.DocDiscAmt = item.data.DocDiscAmt;
                                        newDet.data.SumDiscInvoice = item.data.SumDiscInvoice;
                                        newDet.data.FreeItem = item.data.FreeItem;
                                        newDet.data.FreeItemQty1 = item.data.FreeItemQty1;
                                        newDet.data.FreeItemQty2 = item.data.FreeItemQty2;
                                        newDet.data.GroupDiscAmt1 = item.data.GroupDiscAmt1;
                                        newDet.data.GroupDiscAmt2 = item.data.GroupDiscAmt2;
                                        newDet.data.GroupDiscID1 = item.data.GroupDiscID1;
                                        newDet.data.GroupDiscID2 = item.data.GroupDiscID2;
                                        newDet.data.GroupDiscPct1 = item.data.GroupDiscPct1;
                                        newDet.data.GroupDiscPct2 = item.data.GroupDiscPct2;
                                        newDet.data.GroupDiscSeq1 = item.data.GroupDiscSeq1;
                                        newDet.data.GroupDiscSeq2 = item.data.GroupDiscSeq2;
                                        newDet.data.InvtID = item.data.InvtID;
                                        newDet.data.ItemPriceClass = item.data.ItemPriceClass;
                                        newDet.data.LineAmt = item.data.LineAmt;
                                        newDet.data.LineQty = item.data.LineQty;
                                        newDet.data.ManuDiscAmt = item.data.ManuDiscAmt;
                                        newDet.data.OrderType = App.cboOrderType.getValue();
                                        newDet.data.OrigOrderNbr = item.data.OrigOrderNbr;
                                        newDet.data.QtyBO = item.data.QtyBO;
                                        newDet.data.QtyInvc = item.data.QtyInvc;
                                        newDet.data.QtyOpenShip = item.data.QtyOpenShip;
                                        newDet.data.QtyShip = item.data.QtyShip;
                                        newDet.data.SOFee = item.data.SOFee;
                                        newDet.data.ShipStatus = item.data.ShipStatus;
                                        newDet.data.SiteID = item.data.SiteID;
                                        newDet.data.SlsPrice = item.data.SlsPrice;
                                        newDet.data.SlsUnit = item.data.SlsUnit;
                                        newDet.data.StkQty = item.data.StkQty;
                                        newDet.data.TaxAmt00 = item.data.TaxAmt00;
                                        newDet.data.TaxAmt01 = item.data.TaxAmt01;
                                        newDet.data.TaxAmt02 = item.data.TaxAmt02;
                                        newDet.data.TaxAmt03 = item.data.TaxAmt03;
                                        newDet.data.TaxId00 = item.data.TaxId00;
                                        newDet.data.TaxId01 = item.data.TaxId01;
                                        newDet.data.TaxId02 = item.data.TaxId02;
                                        newDet.data.TaxId03 = item.data.TaxId03;
                                        newDet.data.TxblAmt00 = item.data.TxblAmt00;
                                        newDet.data.TxblAmt01 = item.data.TxblAmt01;
                                        newDet.data.TxblAmt02 = item.data.TxblAmt02;
                                        newDet.data.TxblAmt03 = item.data.TxblAmt03;
                                        newDet.data.UnitMultDiv = item.data.UnitMultDiv;
                                        newDet.data.UnitRate = item.data.UnitRate;
                                        newDet.data.UnitWeight = item.data.UnitWeight;
                                        newDet.data.DumyLineQty = item.data.DumyLineQty;
                                        newDet.data.Mark = item.data.Mark;
                                        newDet.data.MMark = item.data.MMark;
                                        newDet.data.DisplayID = item.data.DisplayID;
                                        newDet.data.DisplayPeriodID = item.data.DisplayPeriodID;
                                        newDet.data.POSM = item.data.POSM;
                                        newDet.data.ClassID = item.data.ClassID;
                                        newDet.commit();
                                        App.stoOrdDet.data.add(newDet);
                                    });


                                    App.stoOldLotTrans.data.each(function (item) {
                                        var newLot = Ext.create('App.mdlLotTrans');
                                        newLot.data.BranchID = App.txtBranchID.getValue();
                                        newLot.data.LotSerNbr = item.data.LotSerNbr;
                                        newLot.data.ExpDate = item.data.ExpDate;

                                        newLot.data.OMLineRef = item.data.OMLineRef;
                                        newLot.data.SiteID = item.data.SiteID;
                                        newLot.data.InvtID = item.data.InvtID;
                                        newLot.data.InvtMult = 1;
                                        newLot.data.TranDate = item.data.TranDate;
                                        newLot.data.WarantyDate = item.data.WarrantyDate;
                                        newLot.data.CnvFact = item.data.CnvFact;
                                        newLot.data.UnitMultDiv = item.data.UnitMultDiv;
                                        newLot.data.Qty = item.data.Qty;
                                        newLot.data.UnitDesc = item.data.UnitDesc;
                                        newLot.data.UnitPrice = item.data.UnitPrice;
                                        newLot.data.UnitCost = item.data.UnitCost;

                                        newLot.commit();
                                        App.stoLotTrans.insert(App.stoLotTrans.getCount(), newLot);
                                    });

                                    App.stoLotTrans.commitChanges();
                                    App.grdLot.view.refresh();

                                    var newRow = Ext.create('App.mdlOrdDet');
                                    newRow.data.BOType = 'S';
                                    HQ.store.insertRecord(App.stoOrdDet, "InvtID", newRow, true);

                                    App.stoOrdDet.commitChanges();
                                    App.grdOrdDet.view.refresh();

                                    App.txtOrigOrderNbr.setValue(_BKOrderNbr);

                                    for (i = 0; i < App.stoOrdDet.data.length; i++) {
                                        calcTax(App.stoOrdDet.data.items[i]);
                                    }
                                    calcTaxTotal();
                                    calcDet();
                                    
                                    if (oldOrd) { // L add 20160829
                                        App.cboSlsPerID.setValue(oldOrd.SlsPerID);
                                        App.cboDeliveryID.setValue(oldOrd.DeliveryID);
                                        App.txtOrderDate.setValue(oldOrd.OrderDate);
                                        App.txtVolDiscPct.setValue(oldOrd.ManualDiscPct);
                                        App.txtOrdDiscAmt.setValue(oldOrd.ManualDiscAmt);
                                        App.txtFreightAmt.setValue(oldOrd.FreightAmt);
                                        App.cboMarkOrder.forceSelection = false;
                                        App.cboMarkOrder.setValue(oldOrd.StationID);
                                        App.cboMarkOrder.forceSelection = true;
                                        App.txtVolDiscAmt.setValue(oldOrd.VolDiscAmt);
                                        App.txtCuryLineDiscAmt.setValue(oldOrd.CuryLineDiscAmt);
                                    }

                                    calcDet();
                                    setTimeout(function () {
                                        HQ.common.showBusy(false, HQ.waitMsg);
                                        App.winSearchBackOrder.unmask();
                                    }, 2000);
                                    var valReturn = 0.0;
                                    _displayIDs = '';
                                    if (App.stoRewardAmtReturn.data.length > 0) {
                                        valReturn = App.stoRewardAmtReturn.data.items[0].data.RewardAmt;
                                        _displayIDs = App.stoRewardAmtReturn.data.items[0].data.RewardID;
                                    }
                                    App.txtRewardAmt.setValue(valReturn);
                                    App.cboMarkOrder.setReadOnly(true);
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    _selOrderType = _INOrder;
    _ordNbr = _BKOrderNbr;
    App.stoOM10100_pdDocBal.load({
        callback: function () {

        }
    });
    App.winSearchBackOrder.hide();
    setReadOnly();
};


var btnShowReport_Click = function () {
    var reportNbr = '';
    var reportName  = '';
    var valueReport = HQ.store.findRecord(App.cboReport.store, ['Code'], [App.cboReport.value]);
    if (valueReport != undefined) {
        reportNbr = valueReport.data.ReportNbr;
        reportName = valueReport.data.ReportCap;
    }

    App.frmMain.submit({
        waitMsg: HQ.waitMsg,
        method: 'POST',
        url: 'OM10100/Report',
        timeout: 180000,
        params: {
            type: App.cboReport.value,
            ReportNbr: reportNbr,
            ReportName: reportName
        },
        success: function (msg, data) {
            if (this.result.reportID != null) {
                window.open('Report?ReportName=' + this.result.reportName + '&_RPTID=' + this.result.reportID, '_blank');
            }
            App.winReport.close();
            HQ.message.process(msg, data, true);
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
        }
    });

};

var btnBKOk_Click = function () {
    if (Ext.isEmpty(App.cboBKOrderNbr.getValue())) {
        HQ.message.show(1000, [HQ.common.getLang('OrderNbr')], "", true);
        return;
    }
    if (Ext.isEmpty(App.cboBKReasonCode.getValue())) {
        HQ.message.show(1000, [HQ.common.getLang('ReasonCD')], "", true);
        return;
    }
    if (App.cboBKOrderType.getValue() == _OldOrder && App.cboBKOrderNbr.getValue().length > 30) {
        return;
    }
    App.cboReasonCode.setValue(App.cboBKReasonCode.getValue());

    HQ.common.showBusy(true, HQ.waitMsg);
    App.stoOldOrdDet.load({
        params: { orderNbr: App.cboBKOrderNbr.getValue(), branchID: App.txtBranchID.getValue() },
        callback: function () {
            App.stoOldOrdDisc.load({
                params: { orderNbr: App.cboBKOrderNbr.getValue(), branchID: App.txtBranchID.getValue() },
                callback: function () {
                    App.stoOldLotTrans.load({
                        params: { orderNbr: App.cboBKOrderNbr.getValue(), branchID: App.txtBranchID.getValue() },
                        callback: function () {
                            // Store Return 
                            App.stoRewardAmtReturn.load({
                                params: { orderNbr: App.cboBKOrderNbr.getValue(), branchID: App.txtBranchID.getValue() },
                                callback: function () {

                                    App.stoOrdDet.clearData();
                                    App.stoTaxTrans.clearData();
                                    App.stoOrdDisc.clearData();
                                    App.stoTaxDoc.clearData();

                                    App.stoOldOrdDet.data.each(function (item) {
                                        var newDet = Ext.create('App.mdlOrdDet');
                                        newDet.data.OrderType = App.cboOrderType.getValue();

                                        newDet.data.BranchID = item.data.BranchID;
                                        newDet.data.LineRef = item.data.LineRef;
                                        newDet.data.Descr = item.data.Descr;
                                        newDet.data.DiscPct = item.data.DiscPct;
                                        newDet.data.TaxCat = item.data.TaxCat;
                                        newDet.data.TaxID = item.data.TaxID;
                                        newDet.data.BOCustID = item.data.BOCustID;
                                        newDet.data.BOType = item.data.BOType;
                                        newDet.data.BarCode = item.data.BarCode;
                                        newDet.data.BudgetID1 = item.data.BudgetID1;
                                        newDet.data.BudgetID2 = item.data.BudgetID2;
                                        newDet.data.CostID = item.data.CostID;
                                        newDet.data.DiscAmt = item.data.DiscAmt;
                                        newDet.data.DiscAmt1 = item.data.DiscAmt1;
                                        newDet.data.DiscAmt2 = item.data.DiscAmt2;
                                        newDet.data.DiscCode = item.data.DiscCode;
                                        newDet.data.DiscID1 = item.data.DiscID1;
                                        newDet.data.DiscID2 = item.data.DiscID2;
                                        newDet.data.DiscPct1 = item.data.DiscPct1;
                                        newDet.data.DiscPct2 = item.data.DiscPct2;
                                        newDet.data.DiscSeq1 = item.data.DiscSeq1;
                                        newDet.data.DiscSeq2 = item.data.DiscSeq2;
                                        newDet.data.DocDiscAmt = item.data.DocDiscAmt;
                                        newDet.data.SumDiscInvoice = item.data.SumDiscInvoice;
                                        newDet.data.FreeItem = item.data.FreeItem;
                                        newDet.data.FreeItemQty1 = item.data.FreeItemQty1;
                                        newDet.data.FreeItemQty2 = item.data.FreeItemQty2;
                                        newDet.data.GroupDiscAmt1 = item.data.GroupDiscAmt1;
                                        newDet.data.GroupDiscAmt2 = item.data.GroupDiscAmt2;
                                        newDet.data.GroupDiscID1 = item.data.GroupDiscID1;
                                        newDet.data.GroupDiscID2 = item.data.GroupDiscID2;
                                        newDet.data.GroupDiscPct1 = item.data.GroupDiscPct1;
                                        newDet.data.GroupDiscPct2 = item.data.GroupDiscPct2;
                                        newDet.data.GroupDiscSeq1 = item.data.GroupDiscSeq1;
                                        newDet.data.GroupDiscSeq2 = item.data.GroupDiscSeq2;
                                        newDet.data.InvtID = item.data.InvtID;
                                        newDet.data.ItemPriceClass = item.data.ItemPriceClass;
                                        newDet.data.LineAmt = item.data.LineAmt;
                                        newDet.data.LineQty = item.data.LineQty;
                                        newDet.data.ManuDiscAmt = item.data.ManuDiscAmt;
                                        
                                        newDet.data.OrigOrderNbr = item.data.OrigOrderNbr;
                                        newDet.data.QtyBO = item.data.QtyBO;
                                        newDet.data.QtyInvc = item.data.QtyInvc;
                                        newDet.data.QtyOpenShip = item.data.QtyOpenShip;
                                        newDet.data.QtyShip = item.data.QtyShip;
                                        newDet.data.SOFee = item.data.SOFee;
                                        newDet.data.ShipStatus = item.data.ShipStatus;
                                        newDet.data.SiteID = item.data.SiteID;
                                        newDet.data.SlsPrice = item.data.SlsPrice;
                                        newDet.data.SlsUnit = item.data.SlsUnit;
                                        newDet.data.StkQty = item.data.StkQty;
                                        newDet.data.TaxAmt00 = item.data.TaxAmt00;
                                        newDet.data.TaxAmt01 = item.data.TaxAmt01;
                                        newDet.data.TaxAmt02 = item.data.TaxAmt02;
                                        newDet.data.TaxAmt03 = item.data.TaxAmt03;
                                        newDet.data.TaxId00 = item.data.TaxId00;
                                        newDet.data.TaxId01 = item.data.TaxId01;
                                        newDet.data.TaxId02 = item.data.TaxId02;
                                        newDet.data.TaxId03 = item.data.TaxId03;
                                        newDet.data.TxblAmt00 = item.data.TxblAmt00;
                                        newDet.data.TxblAmt01 = item.data.TxblAmt01;
                                        newDet.data.TxblAmt02 = item.data.TxblAmt02;
                                        newDet.data.TxblAmt03 = item.data.TxblAmt03;
                                        newDet.data.UnitMultDiv = item.data.UnitMultDiv;
                                        newDet.data.UnitRate = item.data.UnitRate;
                                        newDet.data.UnitWeight = item.data.UnitWeight;
                                        newDet.data.DumyLineQty = item.data.DumyLineQty;
                                        newDet.data.Mark = item.data.Mark;
                                        newDet.data.MMark = item.data.MMark;
                                        newDet.data.DisplayID = item.data.DisplayID;
                                        newDet.data.DisplayPeriodID = item.data.DisplayPeriodID;
                                        newDet.commit();
                                        App.stoOrdDet.data.add(newDet);
                                    });


                                    App.stoOldLotTrans.data.each(function (item) {
                                        var newLot = Ext.create('App.mdlLotTrans');
                                        newLot.data.BranchID = App.txtBranchID.getValue();
                                        newLot.data.LotSerNbr = item.data.LotSerNbr;
                                        newLot.data.ExpDate = item.data.ExpDate;

                                        newLot.data.OMLineRef = item.data.OMLineRef;
                                        newLot.data.SiteID = item.data.SiteID;
                                        newLot.data.InvtID = item.data.InvtID;
                                        newLot.data.InvtMult = 1;
                                        newLot.data.TranDate = item.data.TranDate;
                                        newLot.data.WarantyDate = item.data.WarrantyDate;
                                        newLot.data.CnvFact = item.data.CnvFact;
                                        newLot.data.UnitMultDiv = item.data.UnitMultDiv;
                                        newLot.data.Qty = item.data.Qty;
                                        newLot.data.UnitDesc = item.data.UnitDesc;
                                        newLot.data.UnitPrice = item.data.UnitPrice;
                                        newLot.data.UnitCost = item.data.UnitCost;

                                        newLot.commit();
                                        App.stoLotTrans.insert(App.stoLotTrans.getCount(), newLot);
                                    });

                                    App.stoLotTrans.commitChanges();

                                    var newRow = Ext.create('App.mdlOrdDet');
                                    newRow.data.BOType = 'S';
                                    HQ.store.insertRecord(App.stoOrdDet, "InvtID", newRow, true);

                                    App.stoOrdDet.commitChanges();
                                    App.grdOrdDet.view.refresh();

                                    App.txtOrigOrderNbr.setValue(App.cboBKOrderNbr.getValue());

                                    for (i = 0; i < App.stoOrdDet.data.length; i++) {
                                        calcTax(App.stoOrdDet.data.items[i]);
                                    }
                                    calcTaxTotal();
                                    calcDet();
                                    
                                    var oldOrd = HQ.store.findInStore(App.cboBKOrderNbr.getStore(), ['OrderNbr'], [App.cboBKOrderNbr.getValue()]);
                                    if (oldOrd) { // L add 20160829
                                        App.cboSlsPerID.setValue(oldOrd.SlsPerID);
                                        App.cboDeliveryID.setValue(oldOrd.DeliveryID);
                                        _isChangeShipDate = false;
                                        App.txtOrderDate.setValue(oldOrd.OrderDate);
                                        //App.txtVolDiscPct.setValue(oldOrd.VolDiscAmt); 
                                        //App.txtOrdDiscAmt.setValue(oldOrd.OrdDiscAmt);
                                        App.txtVolDiscPct.setValue(oldOrd.ManualDiscPct);
                                        App.txtOrdDiscAmt.setValue(oldOrd.ManualDiscAmt);
                                        App.txtFreightAmt.setValue(oldOrd.FreightAmt);
                                        App.cboMarkOrder.forceSelection = false;
                                        App.cboMarkOrder.setValue(oldOrd.StationID);
                                        App.cboMarkOrder.forceSelection = true;
                                        App.txtShipDate.setValue(oldOrd.ShipDate);
                                        App.txtARDocDate.setValue(oldOrd.ARDocDate);
                                    }
                                    calcDet();
                                    HQ.common.showBusy(false);
                                    var valReturn = 0.0;
                                    _displayIDs = '';
                                    if (App.stoRewardAmtReturn.data.length > 0) {
                                        valReturn = App.stoRewardAmtReturn.data.items[0].data.RewardAmt;
                                        _displayIDs = App.stoRewardAmtReturn.data.items[0].data.RewardID;
                                    }
                                    App.txtRewardAmt.setValue(valReturn);
                                    App.cboMarkOrder.setReadOnly(true);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
    _selOrderType = App.cboBKOrderType.getValue();
    _ordNbr = App.cboBKOrderNbr.getValue();
    App.stoOM10100_pdDocBal.load({
        callback: function () {

        }
    });
    App.winBackOrder.hide();
    setReadOnly();
};

var cboOrderNbr_Change = function (item, newValue, oldValue) {
    App.stoManualPromo.reload();
    App.cboReport.store.reload();
    if (App.cboReport.store.data.length > 0) {
        App.cboReport.setValue('S');
    }
    App.txtRewardAmt.setValue(0);
    _displayIDs = '';
    var record = App.stoOrder.getById(newValue);
    if (record) {
        bindOrder(record);
        App.txtRewardAmt.setValue(record.data.RewardAmt);
        _displayIDs = record.data.RewardID;
    }
    _ordNbr = newValue;
    App.stoOM10100_pdDocBal.load({
        callback: function () {

        }
    });
    HQ.recentRecord = record;
    setReadOnly();
    
    App.stoOrdDet.reload();
    if (App.cboStatus.getValue() == "N") {
        checkReadOnlyOrderDate();
    }
    
};


var cboOrderType_Change = function (item, newValue, oldValue) {
    if (item.valueModels[0] && item.valueModels.length > 0) {
        HQ.objType = item.valueModels[0].data;
        if (item.valueModels[0].data.ARDocType == "CM") {
            App.btnManualPromo.hide();
        } else {
            App.btnManualPromo.show();
        }
    } else {
        HQ.objType = App.create('App.mdlOrderType').data;
    }
    App.stoOrder.reload();
    defaultOnNew();
};

var cboStatus_Change = function (item, newValue, oldValue) {
    App.cboHandle.store.reload();
};

var cboCustID_Change = function (item, newValue, oldValue) {
    if (!App.cboOrderNbr.getValue()) {
        App.txtRewardAmt.setValue(0);
        _displayIDs = '';
    }
    if (newValue) {
        HQ.common.showBusy(true, HQ.waitMsg);
        loadCust(App.cboCustID.getValue(), App.txtOrderDate.getValue(), HQ.objCustSelect.DfltShipToID, true);
    } else {
        App.stoCustomer.clearData();
        App.stoSOAddress.clearData();
        App.stoShipToID.loadData([], false);
        App.cboShiptoID.setValue('');
        HQ.objCust = Ext.create('App.mdlCustomer');
        bindAddress();
    }
    App.stoManualPromo.reload();
    if (App.cboStatus.getValue() == "N") {
        checkReadOnlyOrderDate();
    }
   

};

var cboShiptoID_Change = function (item, newValue, oldValue) {
    if (item.valueModels.length > 0) {
        App.stoSOAddress.load({
            params: { custID: App.cboCustID.getValue(), branchID: App.txtBranchID.getValue(), shipToID: App.cboShiptoID.getValue() }, callback: function () {
                bindAddress();
            }
        });
    }
    else {
        App.stoSOAddress.clearData();
        bindAddress();
    }

};

var cboSlsPerID_Change = function (item, newValue, oldValue) {
    App.stoUserDefault.reload();

    if (item.valueModels.length > 0) {
        App.cboDeliveryID.setValue(item.valueModels[0].data.DeliveryID);
        _discSite = !Ext.isEmpty(item.valueModels[0].data.DiscSite) ? item.valueModels[0].data.DiscSite : HQ.objUser.DiscSite;
        _OMSite = !Ext.isEmpty(item.valueModels[0].data.OMSite) ? item.valueModels[0].data.OMSite : HQ.objUser.OMSite;
    }
    else {
        App.cboDeliveryID.setValue('');
        if (HQ.objUser) {
            _discSite = HQ.objUser.DiscSite;
            _OMSite = HQ.objUser.OMSite;
        }        
    }
    App.cboDetSiteID.store.reload();
};

var cboBKOrderType_Change = function (item, newvalue, oldValue) {
    if (!Ext.isEmpty(App.cboBKOrderType.getValue())) {
        App.cboBKOrderNbr.getStore().reload();
    }
    else {
        App.cboBKOrderNbr.getStore().clearData();
    }
    App.cboBKOrderNbr.forceSelection = App.cboBKOrderType.getValue() != _OldOrder;
    if (App.cboBKOrderType.getValue() == _OldOrder) {
        App.cboBKOrderNbr.maxLength = 30;
        //App.cboBKOrderNbr.enforceMaxLength = true;
    } else {
        App.cboBKOrderNbr.maxLength = 10000;
        //App.cboBKOrderNbr.enforceMaxLength = true;
    }
};

var txtOrderDate_Change = function () {

    if (App.txtOrderDate.isValid()) {
        HQ.common.showBusy(true, HQ.waitMsg);
        if (_isChangeShipDate) {
            App.txtARDocDate.setValue(App.txtOrderDate.getValue());
            App.txtShipDate.setValue(App.txtOrderDate.getValue());
        } else {
            _isChangeShipDate = true;
        }
        App.stoUserDefault.reload();
        App.stoPrice.load({
            params: { custID: App.cboCustID.getValue(), orderDate: App.txtOrderDate.getValue(), branchID: App.txtBranchID.getValue() }, callback: function () {
                HQ.common.showBusy(false);
            }
        });
    } else {
        App.stoPrice.clearData();
    }

    App.stoManualPromo.reload();

};

var txtFreightAmt_Change = function () {
    calcDet();
};

var txtMiscAmt_Change = function () {
    calcDet();
};

var txtVolDiscPct_Change = function () {
    if (!Ext.isEmpty(HQ.objType)) {
        updateDistPctAmt();
        calcDet();
    }
};

var txtOrdDiscAmt_Change = function () {
    
    App.txtVolDiscPct.events['change'].suspend();
    if ((App.txtCuryLineAmt.getValue() - App.txtVolDiscAmt.getValue()) != 0) {
        if (HQ.objOM.InlcSOFeeDisc) {
            if (App.txtVolDiscAmt.getValue() == 0) {
                if (HQ.objType.TaxFee)
                    App.txtVolDiscPct.setValue(+((App.txtOrdDiscAmt.getValue() / (App.txtCuryLineAmt.getValue() + App.txtSOFeeTot.getValue() * 1.1 - App.txtVolDiscAmt.getValue())) * 100).toFixed(2));
                else
                    App.txtVolDiscPct.setValue(+((App.txtOrdDiscAmt.getValue() / (App.txtCuryLineAmt.getValue() + App.txtSOFeeTot.getValue() - App.txtVolDiscAmt.getValue())) * 100).toFixed(2));
            } else {
                App.txtVolDiscPct.setValue(+((App.txtOrdDiscAmt.getValue() / (App.txtCuryLineAmt.getValue() - App.txtVolDiscAmt.getValue())) * 100).toFixed(2));
            }
        } else
            App.txtVolDiscPct.setValue(+((App.txtOrdDiscAmt.getValue() / (App.txtCuryLineAmt.getValue() - App.txtVolDiscAmt.getValue())) * 100).toFixed(2));
    } else {
        App.txtVolDiscPct.setValue(0);
    }
    calcDet();
    App.txtVolDiscPct.events['change'].resume();

};

var txtTxblAmt_Change = function () {
    if (App.cboStatus.getValue() == "N") {
        var total = App.txtTxblAmt.getValue() + App.txtCuryTaxAmt.getValue();
        var lstManual = App.grdManualPromo.store.snapshot || App.grdManualPromo.store.allData || App.grdManualPromo.data;
        var totalAmtManual = 0;
        if (lstManual != undefined) {
            for (var i = 0; i < lstManual.length; i++) {
                if (lstManual.items[i].data.Selected == true) {
                    if (lstManual.items[i].data.PromoType == "P") {
                        totalAmtManual += Math.round((lstManual.items[i].data.Discount * total)/100);
                    }
                    else if (lstManual.items[i].data.PromoType == "A") {
                        totalAmtManual += lstManual.items[i].data.Discount;
                    }
                    
                }
            }
        }
        
        App.txtOrdDiscAmt.setValue(totalAmtManual);
        if (total == 0) {
            App.txtOrdDiscAmt.setValue(0);
        }
    }
    
}

var grdOrdDet_BeforeEdit = function (sender, e) {
    if (e.field == "FreeItem" && App.cboOrderType.getValue() != "R") return false;
    if (e.record.data.DiscCode != ""){
        if (e.field != "LineQty") {
            return false;
        }
    }
    if (e.field != "LineQty" && App.cboOrderType.getValue() == "R") return false;

    if (e.field == "BudgetID1" || e.field == "DiscCode") return false;

    if (App.grdOrdDet.isLock) {
        return false;
    }
    //if (App.cboOrderType.getValue() == _ReturnOrder && !App.cboBKOrderNbr.getValue() && !HQ.objOrder.data.OrigOrderNbr) {
    //    return false;
    //}
    //if (_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder) {
    //    return false;
    //}    
    if (Ext.isEmpty(App.cboCustID.getValue())) {
        HQ.message.show(1000, [HQ.common.getLang('CustID')], '', true);
        return false;
    }

    if (Ext.isEmpty(App.cboSlsPerID.getValue())) {
        HQ.message.show(1000, [HQ.common.getLang('SlsperID')], '', true);
        return false;
    }

    if (!App.txtOrderDate.validate()) {
        HQ.message.show(1000, [HQ.common.getLang('OrderDate')], '', true);
        return false;
    }

    var key = e.field;
    var record = e.record;

    if (e.field == 'DiscPct' && e.record.data.DocDiscAmt != 0
     //  || e.field == 'DiscAmt' && e.record.data.DiscPct != 0
       || e.field == 'DiscCode' && (e.record.data.POSM != '' || e.record.data.ClassID == "POSM")
       || (e.field == "POSM" && (e.record.data.ClassID != "POSM" || e.record.data.DiscCode != ''))
       || (e.field == 'LineAmt' && (e.record.data.ClassID == 'POSM' || e.record.data.DiscCode != ''))) {
        return false;
    }

    if ((e.field == "DiscAmt" || e.field == 'DiscPct' || e.field == 'ManuDiscAmt') && e.record.data.LineAmt == 0) {
        return false;
    }
    if (key == 'BOType' && !Ext.isEmpty(record.data.BOType)) {
        return false;
    }
    if (key == 'InvtID' && !Ext.isEmpty(record.data.InvtID)) {
        return false;
    }
    if (key != 'InvtID' && key != 'BOType' && (Ext.isEmpty(e.record.data.BOType) || Ext.isEmpty(e.record.data.InvtID))) {
        return false;
    }
    if (key == "FreeItem" && (HQ.objType.SalesType == "PRO" || e.record.data.ClassID == "POSM")) {
        return false;
    }
    if (key == "QtyBO" && record.data.BOType != "S" && record.data.BOType != "0") {
        return false;
    }
    if (key == "BOCustID" && record.data.BOType != "B" && record.data.BOType != "0") {
        return false;
    }
    if (record.data.FreeItem && (!Ext.isEmpty(record.data.DiscID1) || !Ext.isEmpty(record.data.GroupDiscID1)) && App.cboOrderType.getValue() != "IR") {
        return false;
    }
    if ((record.data.FreeItem || record.data.BOType == "R") && (key == "SlsPrice" || key == "DiscAmt" || key == "DiscPct")) {
        if (key == "SlsPrice") {
            if (!HQ.objOM.EditableSlsPrice) {
                return false;
            }
        } else {
            return false;
        }
    }
    else {
        if ((key == "SlsPrice" || key == "LineAmt") && !HQ.objOM.EditableSlsPrice) {
            return false;
        }
        if (HQ.objType.ARDocType != "NA" && HQ.objType.ARDocType != "CM" && HQ.objType.ARDocType != "CC" && !Ext.isEmpty(record.data.DiscID1) && (key == "DiscAmt" || key == "DiscPct" || key == "DiscCode")) {
            return false;
        }
    }

    if (key == "DiscCode") {
        App.stoDisc.load({
            params: { orderNbr: App.cboOrderNbr.getValue(), orderDate: App.txtOrderDate.getValue(), branchID: App.txtBranchID.getValue() }
        });
    }
    else if (key == "SlsUnit") {
        debugger
        if (e.record.invt == undefined) {
            e.record.invt = HQ.store.findInStore(App.stoInvt, ['InvtID'], [e.record.data.InvtID]);
        }
        var ITEM = [];
        allData = App.stoUnitConversion.snapshot || App.stoUnitConversion.allData || App.stoUnitConversion.data;
        App.stoUnit.removeAll();

        allData.each(function (item) {
            //if (item.data.ToUnit == record.invt.StkUnit && (item.data.InvtID == "*" || item.data.InvtID == record.invt.InvtID) && (item.data.ClassID == "*" || item.data.ClassID == record.invt.ClassID)) {
            if (item.data.InvtID == record.invt.InvtID) {
                if (ITEM.indexOf(item.data.FromUnit) == -1) {
                    ITEM.push(item.data.FromUnit);
                    App.stoUnit.insert(0, Ext.create("App.mdlUnit", {
                        FromUnit: item.data.FromUnit
                    }));
                }
            }
        });
    }
    else if (key == "POSM") {
        if (e.record.invt == undefined) {
            e.record.invt = HQ.store.findInStore(App.stoInvt, ['InvtID'], [e.record.data.InvtID]);
        }
        var ITEMPOSM = [];
        allData = App.stoPrice.snapshot || App.stoPrice.allData || App.stoPrice.data;
        App.stoPOSMID.removeAll();
        allData.each(function (item) {
            if (item.data.InvtID == e.record.data.InvtID)
                if (ITEMPOSM.indexOf(item.data.POSMID) == -1) {
                    ITEMPOSM.push(item.data.POSMID);
                    App.stoPOSMID.insert(0, Ext.create("App.mdlPOSMID", {
                        POSMID: item.data.POSMID
                    }));
                }
        });
    } else if (key == 'WhseLoc') {
        _selSiteID = e.record.data.SiteID;
        App.cboDetWhseLoc.store.reload();
    }

    if (Ext.isEmpty(record.data.TaxID)) {
        record.data.TaxID = '*';
    }

    if (Ext.isEmpty(record.data.LineRef)) {
        record.data.LineRef = lastLineRef();
        record.data.BranchID = App.txtBranchID.getValue();
        record.data.OrderNbr = Ext.isEmpty(App.cboOrderNbr.getValue()) ? '' : App.cboOrderNbr.getValue();
    }

    record.commit();

    App.cboDetUnitDesc.setValue('');
};

var grdOrdDet_SelectionChange = function (item, selected) {
    HQ.focus = 'det';
    if (selected.length > 0) {
        if (!Ext.isEmpty(selected[0].data.InvtID)) {
            HQ.numSelectDet = 0;
            HQ.maxSelectDet = 2;
            App.grdOrdDet.view.loadMask.show();
            App.stoItemSite.load({
                params: { siteID: selected[0].data.SiteID, invtID: selected[0].data.InvtID, branchID: App.txtBranchID.getValue(), slsperID: App.cboSlsPerID.getValue(), whseLoc: selected[0].data.WhseLoc },
                callback: checkSelect,
                row: selected[0]
            });
            App.stoOldOrdDet.load({
                params: { orderNbr: App.cboOrderNbr.getValue(), branchID: App.txtBranchID.getValue() },
                callback: checkSelect,
                row: selected[0]
            });
        } else {
            App.lblQtyAvail.setText('');
        }
    }
};

var grdOrdDet_Edit = function (item, e) {
    HQ.focus = 'det';
    var key = e.field;
    if (Object.keys(e.record.modified).length > 0) {
        App.grdOrdDet.isChange = true;
        if (e.record.invt == undefined) {
            e.record.invt = HQ.store.findInStore(App.stoInvt, ['InvtID'], [e.record.data.InvtID]);
        }
        var invt = e.record.invt;
        if (!Ext.isEmpty(invt)) {

            if ((key == 'InvtID' || key == 'BarCode') && Ext.isEmpty(e.record.data.SlsUnit)) {
                var cnv = setUOM(invt.InvtID, invt.ClassID, invt.StkUnit, invt.StkUnit);
                if (!Ext.isEmpty(cnv)) {
                    e.record.data.SlsUnit = invt.DfltSOUnit;
                    e.record.data.UnitRate = cnv.CnvFact == 0 ? 1 : cnv.CnvFact;
                    e.record.data.UnitMultDiv = cnv.MultDiv;
                    e.record.data.ClassID = invt.ClassID;// Dùng để ktra InvtID là POSM hay ko
                    e.record.data.StkUnit = invt.StkUnit;
                    e.record.data.StkItem = invt.StkItem;
                    e.record.data.StkWt = invt.StkWt;
                } else {
                    return;
                }
            }

            if (key == 'InvtID' || key == 'BarCode' || key == 'SiteID' || key == 'SlsUnit' || key == 'WhseLoc') {
                App.grdOrdDet.view.loadMask.show();
                HQ.numDet = 0;
                HQ.maxDet = 1;
                App.stoItemSite.load({
                    params: { siteID: e.record.data.SiteID, invtID: e.record.data.InvtID, branchID: App.txtBranchID.getValue(), slsperID: App.cboSlsPerID.getValue(), whseLoc: e.record.data.WhseLoc }, callback: checkSourceEdit, row: e
                });
            } else {
                checkExitEdit(e);
            }
            App.grdOrdDet.view.refresh();
            App.grdOrdDet.getView().scrollRowIntoView(e.rowIdx);
        }
    }

    if (App.cboStatus.getValue() == "N") {
        checkReadOnlyOrderDate();
    }

};

function checkReadOnlyOrderDate(){
    var lstOrdDet = App.grdOrdDet.store.snapshot || App.grdOrdDet.store.allData || App.grdOrdDet.store.data;
    var readOnly = false;
    if (lstOrdDet != undefined) {
        for (var i = 0; i < lstOrdDet.length; i++) {
            if (lstOrdDet.items[i].data.InvtID != "") {
                readOnly = true;
            }
        }
    }

    App.txtOrderDate.setReadOnly(readOnly);
}

var grdOrdDet_ValidateEdit = function (item, e) {
    //if (e.field == 'DiscCode' && HQ.util.passNull(e.value) == '' && e.record.data.FreeItem && Ext.isEmpty(e.record.data.DiscID1) && Ext.isEmpty(e.record.GroupDiscID1)) {
    //    HQ.message.show(746, '', '', true);
    //    return false;
    //}
};

var grdLot_BeforeEdit = function (sender, e) {
    if (App.grdLot.isLock) {
        return false;
    }    
    if (_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder) {
       return false;        
    }
    var key = e.field;
    var record = e.record;
    if (key != 'LotSerNbr' && Ext.isEmpty(e.record.data.LotSerNbr)) return false;
    if (key == 'LotSerNbr' && !Ext.isEmpty(record.data.LotSerNbr)) return false;

    if (key == "UnitDesc") {
        var ITEM = [];
        allData = App.stoUnitConversion.snapshot || App.stoUnitConversion.allData || App.stoUnitConversion.data;
        App.stoUnit.removeAll();

        allData.each(function (item) {
            if (item.data.ToUnit == App.winLot.record.invt.StkUnit && (item.data.InvtID == "*" || item.data.InvtID == App.winLot.record.invt.InvtID) && (item.data.ClassID == "*" || item.data.ClassID == App.winLot.record.invt.ClassID)) {
                if (ITEM.indexOf(item.data.FromUnit) == -1) {
                    ITEM.push(item.data.FromUnit);
                    App.stoUnit.insert(0, Ext.create("App.mdlUnit", {
                        FromUnit: item.data.FromUnit
                    }));
                }
            }
        });

    }

    if (Ext.isEmpty(record.data.InvtID)) {
        record.data.InvtID = App.winLot.record.data.InvtID;
        record.data.SiteID = App.winLot.record.data.SiteID;
    }
    if (key == "UnitDesc") {
        return false;
    }
    record.commit();
    App.cboLotUnitDesc.setValue('');
};

var grdLot_SelectionChange = function (item, selected) {
    HQ.focus = 'lot';
    if (selected.length > 0) {
        if (!Ext.isEmpty(selected[0].data.InvtID)) {
            HQ.numSelectLot = 0;
            HQ.maxSelectLot = 1;
            App.grdLot.view.loadMask.show();
            App.stoItemLot.load({
                params: { siteID: selected[0].data.SiteID, whseLoc: selected[0].data.WhseLoc, invtID: selected[0].data.InvtID, branchID: App.txtBranchID.getValue(), lotSerNbr: selected[0].data.LotSerNbr, orderNbr: App.cboOrderNbr.getValue() },
                callback: checkSelectLot,
                row: selected[0]
            });
        } else {
            App.lblLotQtyAvail.setText('');
        }
    }
};

var grdLot_Edit = function (item, e) {
    HQ.focus = 'lot';
    var key = e.field;
    var lot = e.record.data;
    var record = e.record;
    if (Object.keys(e.record.modified).length > 0) {
        if (key == "Qty" || key == "UnitDesc") {
            checkExitEditLot(e);
        } else if (key == "LotSerNbr") {
            App.grdLot.view.loadMask.show();
            HQ.numLot = 0;
            HQ.maxLot = 1;
            App.stoItemLot.load({
                params: { siteID: lot.SiteID, whseLoc: lot.WhseLoc, invtID: lot.InvtID, branchID: App.txtBranchID.getValue(), lotSerNbr: lot.LotSerNbr },
                callback: checkSourceEditLot,
                row: e
            });
        }
        setTimeout(function () {
            if (e.record.data.LotSerNbr != "") {
                var totalQty = 0;
                App.grdLot.store.data.items.forEach(function (item) {
                    totalQty += item.data.Qty;
                });
                App.winLot.setTitle(record.data.InvtID + ' ' + formatNumber(totalQty) + ' ' + record.data.UnitDesc);
            }           
        }, 500);
       
    }
};
var grdLot_ValidateEdit = function (item, e) {
    return HQ.grid.checkValidateEdit(App.grdLot, e, ['OMLineRef', 'LotSerNbr']);
}

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
            if (item.data.Index == selected[0].data.Index)
            {
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
    } 
};

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
var smlChoice_Select = function (slm, selRec, idx, eOpts) {
    HQ.common.showBusy(true, HQ.common.getLang("loading"), App.winChoice);
        App.stoItemSiteChoice.load({
            params: { siteID: selRec.data.FreeSiteID, invtID: selRec.data.FreeItemID, branchID: App.txtBranchID.getValue(), slsperID: App.cboSlsPerID.getValue(), whseLoc: "" },
            callback: setQtyChoice(selRec),
        });
    
    
}
var setQtyChoice = function (selRec) {
    setTimeout(function () {
        var site = HQ.store.findInStore(App.stoItemSiteChoice, ['InvtID', 'SiteID', 'WhseLoc'], [selRec.data.FreeItemID, selRec.data.FreeSiteID, ""]);
        var qty = 0;
        if (!Ext.isEmpty(site)) {
            qty = site.QtyAvail;
            if (qty < 0) {
                HQ.message.show("1043", [selRec.data.FreeItemID, selRec.data.FreeSiteID], "", true);
                App.lblChoiceQtyAvail.setText(selRec.data.FreeItemID + " - " + HQ.common.getLang('qtyavail') + ": " + "0" + " - " + selRec.data.Unit);
                return false;
            }
        }
        App.lblChoiceQtyAvail.setText(selRec.data.FreeItemID + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((selRec.data.FeeItemUnitMultDiv == "M" ? (qty / selRec.data.CnvFact) : (qty * selRec.data.CnvFact)), 2)) + " - " + selRec.data.Unit);
        HQ.common.showBusy(false, HQ.common.getLang("loading"), App.winChoice);
    }, 1000);
}
function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
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
                qty = HQ.util.mathFloor(App.grdChoiceHeader.selModel.selected.items[0].data.PromoAmt  / e.record.data.PromoPrice, 0);
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
            if ((e.record.data.FreeItemQtyBase * e.record.data.FreeItemQty) % 1 > 0) {
                HQ.message.show(2020061860);
                return false;
            }
            e.record.set('TotQty', HQ.util.mathFloor(e.record.data.FreeItemQtyBase * e.record.data.FreeItemQty,0));
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
            if ((e.record.data.FreeItemQtyBase * e.record.data.FreeItemQty) % 1 > 0) {
                HQ.message.show(2020061860);
                return false;
            }
            e.record.set('TotQty', HQ.util.mathFloor(e.record.data.FreeItemQtyBase * e.record.data.FreeItemQty,0));
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

var btnFindCust_Click = function (item, e) {
    App.grdCustID.store.addListener('load', function () {
        HQ.common.showBusy(false, HQ.waitMsg, App.winCustID);
    });
    App.winCustID.show();
}
var btnSearch_Click = function (item, e) {
    HQ.common.showBusy(true, HQ.waitMsg, App.winCustID);
    App.grdCustID.store.reload();
}
var grdCustID_CellDblClick = function (grid, row, col, rec) {
    HQ.objCustSelect = rec.data;
    App.cboCustID.setValue(rec.data.CustID);

    App.winCustID.hide();
}
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

//// Function ////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

///// data ///////////////////////
var bindTran = function () {
    if (App.stoTrans.data.items.length > 0) {
        var first = App.stoTrans.data.items[0].data;
        App.SiteID.setValue(first.SiteID);
        App.SlsperID.setValue(first.SlsperID);

        App.TrnsferNbr.events['change'].suspend();
        if (first.TranType == "TR" && first.InvtMult == 1) {
            App.TrnsferNbr.forceSelection = false;
            App.TrnsferNbr.setValue(first.RefNbr);
            HQ.isTransfer = true;
        } else {
            HQ.isTransfer = false;
            App.TrnsferNbr.setValue('');
        }
    } else {
        App.TrnsferNbr.setValue('');
        HQ.isTransfer = false;
    }
    App.lblQtyAvail.setText('');
    App.TrnsferNbr.events['change'].resume();

    HQ.store.insertRecord(App.stoTrans, "InvtID", Ext.create('App.mdlTrans'), true);

    App.TrnsferNbr.setReadOnly(!Ext.isEmpty(App.cboOrderNbr.getValue()));
    checkTransAdd();
    calculate();
    App.grdOrdDet.isChange = false;
    HQ.common.showBusy(false, HQ.waitMsg);
    setChange(false);
};

var bindOrder = function (record) {
    HQ.objOrder = record;
    _selOrderType = HQ.objOrder.data.ReturnFrom;
    App.cboOrderType.events['change'].suspend();
    App.cboOrderNbr.events['change'].suspend();
    App.cboCustID.events['change'].suspend();
    App.cboSlsPerID.events['change'].suspend();
    App.txtOrderDate.events['change'].suspend();
    App.txtOrdDiscAmt.events['change'].suspend();
    App.txtVolDiscPct.events['change'].suspend();
    App.cboShiptoID.events['change'].suspend();
    App.cboMarkOrder.forceSelection = false;
    App.frmMain.loadRecord(record);
    App.cboMarkOrder.forceSelection = true;
    App.cboShiptoID.events['change'].resume();
    App.cboOrderType.events['change'].resume();
    App.cboOrderNbr.events['change'].resume();
    App.cboCustID.events['change'].resume();
    App.cboSlsPerID.events['change'].resume();
    App.txtOrderDate.events['change'].resume();
    App.txtOrdDiscAmt.events['change'].resume();
    App.txtVolDiscPct.events['change'].resume();

    var item = App.cboSlsPerID;
    if (item.valueModels.length > 0) {
        _discSite = !Ext.isEmpty(item.valueModels[0].data.DiscSite) ? item.valueModels[0].data.DiscSite : HQ.objUser.DiscSite;
        _OMSite = !Ext.isEmpty(item.valueModels[0].data.OMSite) ? item.valueModels[0].data.OMSite : HQ.objUser.OMSite;
    }
    else {
        if (HQ.objUser) {
            _discSite = HQ.objUser.DiscSite;
            _OMSite = HQ.objUser.OMSite;
        }
    }
    App.cboDetSiteID.store.reload();

    setStatusForm();

    App.txtNote.setValue(record.data.Note);

    HQ.common.showBusy(true, HQ.waitMsg);

    if (!Ext.isEmpty(App.cboOrderNbr.getValue())) {
        HQ.numDetail = 0;
        loadCust(record.data.CustID, record.data.OrderDate, '', false);
    } else {
        HQ.objCust = null;
        App.stoLotTrans.clearFilter();
        App.stoOrdDet.clearData();
        App.stoLotTrans.clearData();
        App.stoTaxTrans.clearData();
        App.stoOrdDisc.clearData();
        App.stoOrdAddr.clearData();
        App.grdOrdDet.store.reload();
        App.grdOrdDet.view.refresh();        
        App.grdTaxTrans.view.refresh();
        App.grdDisc.view.refresh();
        bindDetail();
    }
    App.stoChoice.clearData();
    App.stoChoiceHeader.clearData();
    App.cboHandle.setValue('N');
    //Them vao ngay 09/11/2016
    if (record.data.OrderNbr) {
        var month = record.data.OrderDate.getMonth() + 1;
        month = month > 9 ? month : "0" + month;
        var monthYear = "-" + month.toString() + record.data.OrderDate.getFullYear();
    }
    if (record.data.OrigOrderNbr) {
        var month = record.data.OrigOrderDate.getMonth() + 1;
        month = month > 9 ? month : "0" + month;
        var monthYear = "-" + month.toString() + record.data.OrigOrderDate.getFullYear();
        App.txtOrdFormat2.setValue(App.txtBranchID.getValue() + monthYear + App.txtOrigOrderNbr.getValue());
    }
};

var bindDetail = function () {

    if (Ext.isEmpty(HQ.objCust)) {
        HQ.objCust = Ext.create('App.mdlCustomer')
    }

    var addr = App.stoOrdAddr.first();
    if (addr == undefined) {
        addr = Ext.create('App.mdlOrdAddr');
    }

    App.cboShiptoID.events['change'].suspend();
    App.cboShiptoID.setValue(Ext.isEmpty(addr.data.ShiptoID) ? HQ.objCust.data.DfltShipToId : addr.data.ShiptoID);
    App.cboShiptoID.events['change'].resume();


    if (Ext.isEmpty(HQ.objCust.data.BillAddr1)) {
        App.txtCustAddr.setValue(HQ.objCust.data.BillAddr2)
    } else {
        App.txtCustAddr.setValue(HQ.objCust.data.BillAddr1 + (Ext.isEmpty(HQ.objCust.data.BillAddr2) ? "" : " - " + HQ.objCust.data.BillAddr2));
    }

    App.txtCustName.setValue(HQ.objCust.data.BillName);

    App.txtCodeHT.setValue(HQ.objCust.data.LTTContractNbr);

    App.txtBillName.setValue(addr.data.BillName);
    App.txtBillAttn.setValue(addr.data.BillAttn);
    App.txtBillAddrLine1.setValue(addr.data.BillAddrLine1);
    App.txtBillAddrLine2.setValue(addr.data.BillAddrLine2);
    App.txtBillZip.setValue(addr.data.BillZip);
    App.txtBillPhone.setValue(addr.data.BillPhone);
    App.txtBillFax.setValue(addr.data.BillFax);
    App.txtBillStateID.setValue(addr.data.BillStateID);
    App.txtBillCntryID.setValue(addr.data.BillCntryID);
    App.txtTaxRegNbr.setValue(addr.data.TaxRegNbr);

    App.txtShipName.setValue(addr.data.ShipName);
    App.txtShipAttn.setValue(addr.data.ShipAttn);
    App.txtShipAddrLine1.setValue(addr.data.ShipAddrLine1);
    App.txtShipAddrLine2.setValue(addr.data.ShipAddrLine2);
    App.txtShipFax.setValue(addr.data.ShipFax);
    App.txtShipPhone.setValue(addr.data.ShipPhone);
    App.txtShipZip.setValue(addr.data.ShipZip);
    App.txtShipStateID.setValue(addr.data.ShipStateID);
    App.txtShipCntryID.setValue(addr.data.ShipCntryID);

    var newRow = Ext.create('App.mdlOrdDet');
    newRow.data.BOType = 'S';
    HQ.store.insertRecord(App.stoOrdDet, "InvtID", newRow, true);

    calcDet();
    calcTaxTotal();

    checkDetAdd();

    setChange(false);

    HQ.common.showBusy(false);
   App.grdOrdDet.view.loadMask.setDisabled(false);
};

var bindCust = function () {

    HQ.objCust = App.stoCustomer.first();
    if (Ext.isEmpty(HQ.objCust)) {
        HQ.objCust = Ext.create('App.mdlCustomer')
    }
    App.stoTax.clearFilter();
    App.stoTax.filterBy(function (record) {
        if (record.data.TaxID == HQ.objCust.data.TaxID00 || record.data.TaxID == HQ.objCust.data.TaxID01 || record.data.TaxID == HQ.objCust.data.TaxID02 || record.data.TaxID == HQ.objCust.data.TaxID03) {
            return record;
        }
    });

    if (Ext.isEmpty(App.cboOrderNbr.getValue())) {

        App.cboTerms.setValue(HQ.objCust.data.Terms);
        App.cboSlsPerID.setValue(HQ.objCust.data.SlsperId);
        App.txtTaxRegNbr.setValue(HQ.objCust.data.TaxRegNbr);

        App.cboShiptoID.events['change'].suspend();
        App.cboShiptoID.setValue(HQ.objCust.data.DfltShipToId);
        App.cboShiptoID.events['change'].resume();
        bindAddress();
        HQ.common.showBusy(false);       
    } else {
        App.stoOrdDet.reload();
        App.stoLotTrans.reload();
        App.stoTaxTrans.reload();
        App.stoOrdDisc.reload();
        App.stoOrdAddr.reload();
    }
};

var bindAddress = function () {

    var addr = App.stoSOAddress.first();

    if (Ext.isEmpty(addr)) {
        addr = Ext.create('App.mdlSOAddress');
    }

    if (Ext.isEmpty(HQ.objCust.data.BillAddr1)) {
        App.txtCustAddr.setValue(HQ.objCust.data.BillAddr2)
    } else {
        App.txtCustAddr.setValue(HQ.objCust.data.BillAddr1 + (Ext.isEmpty(HQ.objCust.data.BillAddr2) ? "" : " - " + HQ.objCust.data.BillAddr2));
    }

    App.txtCustName.setValue(HQ.objCust.data.BillName);
    App.txtCodeHT.setValue(HQ.objCust.data.LTTContractNbr);

    App.txtShipName.setValue(addr.data.SOName);
    App.txtShipAttn.setValue(addr.data.Attn);
    App.txtShipAddrLine1.setValue(addr.data.Addr1);
    App.txtShipAddrLine2.setValue(addr.data.Addr2);
    App.txtShipStateID.setValue(addr.data.State);
    App.txtShipCntryID.setValue(addr.data.Country);
    App.txtShipZip.setValue(addr.data.Zip);
    App.txtShipPhone.setValue(addr.data.Phone);
    App.txtShipFax.setValue(addr.data.Fax);

    App.txtBillAddrLine1.setValue(HQ.objCust.data.BillAddr1);
    App.txtBillAddrLine2.setValue(HQ.objCust.data.BillAddr2);
    App.txtBillAttn.setValue(HQ.objCust.data.BillAttn);
    App.txtBillCntryID.setValue(HQ.objCust.data.BillCountry);
    App.txtBillFax.setValue(HQ.objCust.data.BillFax);
    App.txtBillName.setValue(HQ.objCust.data.BillName);
    App.txtBillPhone.setValue(HQ.objCust.data.BillPhone);
    App.txtBillStateID.setValue(HQ.objCust.data.BillState);
    App.txtBillZip.setValue(HQ.objCust.data.BillZip);
    App.txtShipPriority.setValue("A");        
};

var getTotalAmt = function () {    
    var totReward = App.txtRewardAmt.getValue() ? App.txtRewardAmt.getValue() : 0;
    var totalCuryLineAmt = App.txtCuryOrdAmt.getValue() ? App.txtCuryOrdAmt.getValue() : 0;
    //if (App.cboOrderType.getValue() == 'IN') {
        App.txtTotAmt.setValue(totalCuryLineAmt - totReward);
    //} else {
    //    App.txtTotAmt.setValue(totalCuryLineAmt + totReward);
    //}
};

var save = function () {

    if ((App.cboOrderNbr.getValue() && !HQ.isUpdate) || (Ext.isEmpty(App.cboOrderNbr.getValue()) && !HQ.isInsert)) {
        HQ.message.show(728, '', '', true);
        return;
    }
    if (App.cboStatus.getValue() != "N" && (App.cboHandle.getValue() == "N" || Ext.isEmpty(App.cboHandle.getValue()))) {
        HQ.message.show(2015020803, '', '', true);
        return;
    }

    if (App.stoOrdDet.data.items.length <= 1) {
        HQ.message.show(2015020804, [App.cboOrderNbr.getValue()], '', true);
        return;
    }
    if (Ext.isEmpty(App.cboShiptoID.getValue())) {
        HQ.message.show(1000, [HQ.common.getLang('shiptoid')], '', true);
        return;
    }

    var flat = null;
    App.stoLotTrans.clearFilter();
    var row = 0;
    App.stoOrdDet.data.each(function (item) {
        row++;
        if (!Ext.isEmpty(item.data.InvtID)) {
            if (item.data.LineQty == 0) {
                HQ.message.show(1000, [HQ.common.getLang('qty')], '', true);
                flat = item;
                return false;
            }

            if (Ext.isEmpty(item.data.SiteID)) {
                HQ.message.show(1000, [HQ.common.getLang('siteid')], '', true);
                flat = item;
                return false;
            }
            //if (Ext.isEmpty(item.data.WhseLoc)) {
            //    HQ.message.show(1000, [HQ.common.getLang('WhseLoc')], '', true);
            //    flat = item;
            //    return false;
            //}
            if (Ext.isEmpty(item.data.SlsUnit)) {
                HQ.message.show(1000, [HQ.common.getLang('unit')], '', true);
                flat = item;
                return false;
            }

            if (Ext.isEmpty(item.data.UnitMultDiv)) {
                HQ.message.show(2525, [invtID], '', true);
                flat = item;
                return false;
            }


            if (item.data.FreeItem && item.data.LineAmt != 0) {
                HQ.message.show(703, '', '', true);
                flat = item;
                return false;
            }
            if (!item.data.FreeItem && item.data.BOType != "R" && item.data.LineAmt == 0 && item.data.QtyBO == 0 
                && item.data.ClassID != 'POSM' && item.data.DiscCode == '' // Không ktra khi nó là POSM or có Mã KM
            ) {
                HQ.message.show(703, '', '', true);
                flat = item;
                return false;
            }
            if (item.data.ClassID == 'POSM' && !item.data.POSM && item.data.DiscSeq1 == '') {
                HQ.message.show(2016033001, [row], '', true);
                flat = item;
                return false;
            }
            if (HQ.objType.BO) {
                if (item.data.BOType != "O" && item.data.LineQty == 0 && item.data.QtyBO == 0) {
                    HQ.message.show(233, '', '', true);
                    flat = item;
                    return false;
                }
            }
            else {
                if (item.data.LineQty == 0 && item.data.QtyBO == 0) {
                    HQ.message.show(233, '', '', true);
                    flat = item;
                    return false;
                }
            }
            if (item.data.SlsPrice == 0 && !item.data.FreeItem && item.data.ClassID != 'POSM' && item.data.DiscCode == '') {
                HQ.message.show(726, '', '', true);
                flat = item;
                return false;
            }
            //if (HQ.objOM.ReqDiscID && Ext.isEmpty(item.data.DiscCode) && Ext.isEmpty(item.data.DiscID1) && Ext.isEmpty(item.GroupDiscID1) && item.data.FreeItem) {
            //    HQ.message.show(746, '', '', true);
            //    flat = item;
            //    return false;
            //}
            if (!Ext.isEmpty(item.data.DiscCode) && Ext.isEmpty(item.data.DiscID1) && Ext.isEmpty(item.GroupDiscID1) && !item.data.FreeItem) {
                HQ.message.show(2017012001, [App.grdOrdDet.columns[HQ.grid.findColumnIndex(App.grdOrdDet.columns, 'FreeItem')].text], '', true);
                flat = item;
                return false;                
            }

            if (item.data.BOType == "B" && Ext.isEmpty(item.data.BOCustID)) {
                HQ.message.show(734, '', '', true);
                flat = item;
                return false;
            }
            if (Ext.isEmpty(item.invt)) {
                item.invt = HQ.store.findInStore(App.stoInvt, ['InvtID'], [item.data.InvtID]);
            }
            if (item.invt.LotSerTrack != "N" && !Ext.isEmpty(item.invt.LotSerTrack)) {
                var lotQty = 0;
                var lotFlat = false;
                App.stoLotTrans.data.each(function (item2) {
                    if (item.data.LineRef == item2.data.OMLineRef && !Ext.isEmpty(item2.data.LotSerNbr)) {
                        if (item.data.InvtID != item2.data.InvtID) {
                            HQ.message.show(2015040501, [item.data.InvtID], "", true);
                            lotFlat = true;
                            return false;
                        }

                        if (item.data.SiteID != item2.data.SiteID) {
                            HQ.message.show(2015040501, [item.data.InvtID], "", true);
                            lotFlat = true;
                            return false;
                        }

                        lotQty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty / item2.data.CnvFact;
                    }
                });
                if (lotFlat) {
                    flat = item;
                    return false;
                }

                var detQty = Math.round(item.data.UnitMultDiv == "M" ? item.data.LineQty * item.data.UnitRate : item.data.LineQty / item.data.UnitRate);
                if (detQty != lotQty) {
                    HQ.message.show(2015040502, [item.data.InvtID], "", true);
                    flat = item;
                    return false;
                }
            }

        }
        if (App.cboStatus.getValue() == "N") {
            if (!calcTax(item)) {
                flat = item;
                return false;
            }
        }
       
    });
    if (!Ext.isEmpty(flat)) {
        App.smlOrdDet.select(App.stoOrdDet.indexOf(flat));
        return;
    }
    //if ((_selOrderType == 'IN' || (App.cboOrderType.getValue() == _ReturnOrder && HQ.objOrder.data.OrigOrderNbr)) 
    //    && App.txtCuryOrdAmt.getValue() > App.txtDocBal.getValue()) {
    //    HQ.message.show(2016082902);
    //    return;
    //}
    if (App.txtRewardAmt.getValue() > App.txtCuryOrdAmt.getValue()) {
        HQ.message.show(2016101502);
        return;
    }


    // check co duoc chon don bu khong
    var flatMark = false;
    App.stoOrdDet.data.each(function (item) {
        if (Ext.isEmpty(item.data.DiscCode) && !Ext.isEmpty(item.data.InvtID)) {
            flatMark = true;
        }
    });

    if (flatMark && !Ext.isEmpty(App.cboMarkOrder.getValue())) {
        HQ.message.show(2017021603);
        return;
    }

    if (HQ.form.checkRequirePass(App.frmMain)) {
        if (HQ.isShowMess && App.cboOrderType.getValue() == _ReturnOrder) {
            HQ.message.show(2016082901, "", "confirmSaveData", true);
        } else if (App.cboStatus.getValue() == "N" && App.cboOrderType.getValue() == "IN" && App.txtSalesMark.getValue() != App.txtPromoMark.getValue()) {
            HQ.message.show(2016101501, '', 'isSaveData', true);
        }
        else {
            saveData();
        }
    }    
};

var saveData = function () {
    var amtAReward = App.txtTotAmt.value.toString();
    var selDet = App.grdOrdDet.selModel.selected.items[0];
    if (App.lblChoiceAmtUsed) {
        App.lblChoiceAmtUsed.setText('');
    }    
    App.frmMain.submit({
        waitMsg: HQ.waitMsg,
        method: 'POST',
        url: 'OM10100/Save',
        timeout: 180000,
        params: {
            lstOrdDet: Ext.encode(App.stoOrdDet.getRecordsValues()),
            lstLot: Ext.encode(App.stoLotTrans.getRecordsValues()),
            lstTax: Ext.encode(App.stoTaxTrans.getRecordsValues()),
            lstDisc: Ext.encode(App.stoOrdDisc.getRecordsValues()),
            lstGift: Ext.encode(App.stoEditDetail.getRecordsValues()),
            lstChoice: Ext.encode(App.stoChoice.getRecordsValues()),
            lstManualPromo: Ext.encode(App.stoManualPromo.getRecordsValues()),
            note: Ext.encode(App.txtNote.getValue()),
            rewardID: _displayIDs,
            amtAReward: amtAReward,
            selOrderType: _selOrderType,
            qtyChange: changeQty
        },
        success: function (msg, data) {
            var orderNbr = '';
            if (this.result.data != undefined && this.result.data.choice != undefined) {
                this.result.choice = this.result.data.choice;
            }
           // console.log(this.result.choice);
            if (this.result.choice != undefined) {
                App.stoChoice.clearData();
                App.stoChoiceHeader.clearData();
                var isHideInvtID = false;
                setChoiceData(this.result.choice, isHideInvtID);
                HQ.common.showBusy(false);

                App.stoChoice.filterBy(function (item) {
                    if (item.data.LineRef == "####") {
                        return item;
                    }
                });

                App.grdChoice.view.refresh();
                App.smlChoiceHeader.clearSelections();
                App.grdChoiceHeader.view.refresh();
                App.winChoice.isSave = true;
                App.winChoice.show();
                if (isHideInvtID) {
                    HQ.grid.hide(App.grdChoiceHeader, ['InvtID', 'Unit', 'Descr']);
                } else {
                    HQ.grid.show(App.grdChoiceHeader, ['InvtID', 'Unit', 'Descr']);
                }               
                App.smlOrdDet.select(selDet);
            } else {
                if (this.result.data != undefined && this.result.data.orderNbr != null) {
                    orderNbr = this.result.data.orderNbr
                }
                if (!Ext.isEmpty(orderNbr)) {
                    App.cboOrderNbr.forceSelection = false
                    App.cboOrderNbr.events['change'].suspend();
                    App.cboOrderNbr.setValue(orderNbr);
                    App.cboOrderNbr.events['change'].resume();
                    if (Ext.isEmpty(HQ.recentRecord)) {
                        HQ.recentRecord = orderNbr;
                    }
                }                
                App.smlOrdDet.select(selDet);
                menuClick('refresh');
            }
            if (this.result.data != undefined) {
                if (this.result.data.messError != undefined && this.result.data.messError != '') {
                    HQ.message.show(20410, [this.result.data.messError], "", true);
                }
                else if (this.result.data.messBudget != undefined && this.result.data.messBudget != '' && this.result.data.messSite != undefined && this.result.data.messSite != '') {
                    HQ.message.show(2017103001, [this.result.data.messBudget, this.result.data.messSite], "", true);
                }
                else if (this.result.data.messBudget != undefined && this.result.data.messBudget != '') {
                    HQ.message.show(2017032201, [this.result.data.messBudget], "", true);
                }
                else if (this.result.data.messSite != undefined && this.result.data.messSite != '') {
                    HQ.message.show(20171002, [this.result.data.messSite], "", true);
                }
            } else {
                HQ.message.process(msg, data, true);
            }
            setTimeout(function () {
                App.smlOrdDet.select(0);
                App.stoManualPromo.reload();
            }, 1000);
            changeQty = false;
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
            console.log('Save failure');
        }
    });
};

var saveChoice = function () {

    App.stoChoice.clearFilter();

    if (App.winChoice.isSave) {
        saveData();
    } else {
        deleteDet('yes');
    }
    App.winChoice.hide();
}

var calcLot = function (record) {
    if (!Ext.isEmpty(record.invt) && !Ext.isEmpty(record.invt.LotSerTrack) && record.invt.LotSerTrack != 'N' && !Ext.isEmpty(record.data.SlsUnit)) {
        var flat = false;
        var det = record.data;

        App.stoLotTrans.clearFilter();
        App.stoLotTrans.data.each(function (item) {
            if (item.data.OMLineRef == det.LineRef && !Ext.isEmpty(item.data.LotSerNbr)) {
                flat = true;
            }
        });
        var back = !(record.data.BOType != "B" && HQ.objType.INDocType != "CM" && HQ.objType.INDocType != "DM" && HQ.objType.INDocType != "NA" && HQ.objType.INDocType != "RC");
        if (!flat && !back) {
            HQ.common.showBusy(true, HQ.waitMsg);
            App.stoCalcLot.load({
                params: {
                    siteID: det.SiteID,
                    invtID: det.InvtID,
                    whseLoc: det.WhseLoc,
                    showWhseLoc: HQ.showWhseLoc,
                    branchID: App.txtBranchID.getValue(),
                    orderNbr: App.cboOrderNbr.getValue(),
                    all: back,
                    cnvFact: det.UnitRate,
                    unitDesc: det.SlsUnit,
                    unitMultDiv: det.UnitMultDiv
                },
                det: record.data,
                row: record,
                callback: function (records, options, success) {

                    var det = options.det;
                    var needQty = Math.round(det.UnitMultDiv == "M" ? det.LineQty * det.UnitRate : det.LineQty / det.UnitRate);

                    App.stoLotTrans.clearFilter();
                    App.stoCalcLot.data.each(function (item) {
                        var newQty = 0;
                        var curQty = 0;

                        App.stoLotTrans.data.each(function (item2) {
                            if (item2.data.LotSerNbr == item.data.LotSerNbr && item2.data.InvtID == item.data.InvtID && item2.data.SiteID == item.data.SiteID) {
                                curQty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
                            }
                        });

                        if (Math.round(item.data.QtyAvail - curQty) == 0) return true;
                        if ((item.data.QtyCnvFact * det.UnitRate) > (item.data.QtyAvail - curQty)) {
                            newQty = -1;
                        }
                        else {
                            if ((item.data.QtyAvail - curQty) >= needQty) {
                                newQty = needQty;
                                needQty = 0;
                            }
                            else {
                                newQty = (item.data.QtyAvail - curQty);
                                needQty -= (item.data.QtyAvail - curQty);
                                item.data.QtyAvail = 0;
                            }
                        }                      

                        if (newQty > 0) {
                            var newLot = Ext.create('App.mdlLotTrans');
                            newLot.data.BranchID = App.txtBranchID.getValue();
                            newLot.data.OrderNbr = App.cboOrderNbr.getValue();
                            newLot.data.LotSerNbr = item.data.LotSerNbr;
                            newLot.data.ExpDate = item.data.ExpDate;

                            newLot.data.OMLineRef = det.LineRef;
                            newLot.data.SiteID = det.SiteID;
                            newLot.data.InvtID = det.InvtID;
                            newLot.data.InvtMult = -1;
                            //if ((det.UnitMultDiv == "M" ? newQty / det.UnitRate : newQty * det.UnitRate) % 1 > 0) {
                            //    newLot.data.CnvFact = 1;
                            //    newLot.data.UnitMultDiv = 'M';
                            //    newLot.data.Qty = newQty;
                            //    newLot.data.UnitDesc = options.row.invt.StkUnit;
                            //    if (HQ.objOM.DfltSalesPrice == "I") {
                            //        price = Math.round(newLot.data.UnitMultDiv == "M" ? options.row.invt.SOPrice * newLot.data.CnvFact : options.row.invt.SOPrice / newLot.data.CnvFact);
                            //        newLot.data.UnitPrice = price;
                            //        newLot.data.UnitCost = price;
                            //    } else {
                            //        var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [det.InvtID, options.row.invt.StkUnit]);
                            //        if (!Ext.isEmpty(price)) price = price.Price;
                            //        else price = 0;
                            //        newLot.data.UnitPrice = price;
                            //        newLot.data.UnitCost = price;
                            //    }

                            //} else {
                            //    newLot.data.Qty = Math.round(det.UnitMultDiv == "M" ? newQty / det.UnitRate : newQty * det.UnitRate);
                            //    newLot.data.CnvFact = det.UnitRate;
                            //    newLot.data.UnitMultDiv = det.UnitMultDiv;
                            //    newLot.data.UnitPrice = det.SlsPrice;
                            //    newLot.data.UnitCost = det.SlsPrice;
                            //    newLot.data.UnitDesc = det.SlsUnit;
                            //}
                            if (options.row.invt.StkUnit != det.UnitDesc) {
                                newLot.data.Qty = Math.round(det.UnitMultDiv == "M" ? newQty / det.UnitRate : newQty * det.UnitRate);
                                newLot.data.CnvFact = det.UnitRate;
                                newLot.data.UnitMultDiv = det.UnitMultDiv;
                                newLot.data.UnitPrice = det.SlsPrice;
                                newLot.data.UnitCost = det.SlsPrice;
                                newLot.data.UnitDesc = det.SlsUnit;
                            }
                            else {
                                newLot.data.CnvFact = 1;
                                newLot.data.UnitMultDiv = 'M';
                                newLot.data.Qty = newQty;
                                newLot.data.UnitDesc = det.SlsUnit;
                                newLot.data.UnitPrice = det.SlsPrice;
                                newLot.data.UnitCost = det.SlsPrice;
                            }
                            newLot.commit();
                            App.stoLotTrans.insert(App.stoLotTrans.getCount(), newLot);
                        }



                        if (needQty == 0) return false;
                    });
                    App.stoLotTrans.commitChanges();
                    HQ.common.showBusy(false);
                    showLot(options.row, false);
                }
            });
        } else {
            App.stoLotTrans.data.each(function (item) {
                if (item.data.OMLineRef == det.LineRef) {
                    item.data.Qty = 0;
                    item.data.CnvFact = det.UnitRate;
                    item.data.UnitMultDiv = det.UnitMultDiv;
                    item.data.UnitPrice = det.SlsPrice;
                    item.data.UnitCost = det.SlsPrice;
                    item.data.UnitDesc = det.SlsUnit;
                }
            });
            showLot(record, true);
        }
    }
};

var showLot = function (record, loadCombo) {

    var lock = !((App.cboOrderNbr.value && HQ.isUpdate) || (!App.cboOrderNbr.value && HQ.isInsert)) || App.cboStatus.getValue() != "N" || record.data.FreeItem;
    App.grdLot.isLock = lock;
    if (loadCombo) {
        var back = !(record.data.BOType != "B" && HQ.objType.INDocType != "CM" && HQ.objType.INDocType != "DM" && HQ.objType.INDocType != "NA" && HQ.objType.INDocType != "RC");
        App.stoCalcLot.load({
            params: {
                siteID: record.data.SiteID,
                invtID: record.data.InvtID,
                whseLoc: record.data.WhseLoc,
                showWhseLoc: HQ.showWhseLoc,
                branchID: App.txtBranchID.getValue(),
                orderNbr: App.cboOrderNbr.getValue(),
                all: back,
                cnvFact: record.data.UnitRate,
                unitDesc: record.data.SlsUnit,
                unitMultDiv: record.data.UnitMultDiv
            }
        });
    }


    App.stoLotTrans.clearFilter();
    App.stoLotTrans.filter('OMLineRef', record.data.LineRef);

    var newRow = Ext.create('App.mdlLotTrans');
    newRow.data.OMLineRef = record.data.LineRef;
    HQ.store.insertRecord(App.stoLotTrans, "LotSerNbr", newRow, true);

    App.winLot.record = record;
    App.grdLot.view.refresh();
    App.winLot.setTitle(record.data.InvtID + ' ' + formatNumber(record.data.LineQty) + ' ' + record.data.SlsUnit);
    //getLotQtyAvail(record);
    App.winLot.show();
    setTimeout(function () {
        App.grdLot.selModel.select(0);
    }, 500);
};

var deleteHeader = function (item) {
    if (item == 'yes') {
        if (Ext.isEmpty(App.cboOrderNbr.getValue())) {
            menuClick('new');
        } else {
            App.frmMain.submit({
                waitMsg: HQ.waitMsg,
                method: 'POST',
                url: 'OM10100/Delete',
                timeout: 180000,
                params: {
                    lstOrdDet: Ext.encode(App.stoOrdDet.getRecordsValues()),
                    lstTax: Ext.encode(App.stoTaxTrans.getRecordsValues()),
                    lstDisc: Ext.encode(App.stoOrdDisc.getRecordsValues())
                },
                success: function (msg, data) {
                    var record = App.stoOrder.getById(App.cboOrderNbr.getValue());
                    if (!Ext.isEmpty(record)) {
                        App.stoOrder.remove(record);
                    }
                    setChange(false);
                    HQ.message.process(msg, data, true);
                    menuClick('new');
                    App.stoOrdDet.reload();
                    App.stoManualPromo.reload();
                },
                failure: function (msg, data) {
                    HQ.message.process(msg, data, true);
                }
            });
        }
    }
};

var deleteDet = function (item) {
    if (item == 'yes') {
        var dataDelManual = App.smlOrdDet.selected.items[0].data;
        var recordManual = HQ.store.findRecord(App.stoManualPromo, ["FreeItemID", "DiscCode"], [dataDelManual.InvtID, dataDelManual.DiscCode]);
        if (recordManual != undefined) {
            recordManual.set("Selected", false);
        }

        if (Ext.isEmpty(App.smlOrdDet.selected.items[0].data.tstamp)) {
            HQ.message.show(2015032101, "", "", true);
            delTax(App.smlOrdDet.selected.items[0]);
            calcTaxTotal();

            var det = App.smlOrdDet.selected.items[0].data;
            App.stoLotTrans.clearFilter();
            for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
                if (det.LineRef == App.stoLotTrans.data.items[i].data.OMLineRef) {
                    App.stoLotTrans.data.removeAt(i);
                }
            }
            var itemDel = App.smlOrdDet.selected.items[0];
            App.grdOrdDet.deleteSelected();
            if (HQ.DeleteRow == 2) {
                if (_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder && itemDel.data.InvtID != '' && itemDel.data.FreeItem == false) {
                    for (var i = App.grdOrdDet.store.data.length - 1; i >= 0; i--) {
                        var data = App.grdOrdDet.store.data.items[i].data;
                        if (data.FreeItem == true && data.DiscCode == '' && data.DisplayID == '') // Xóa KM tự động
                        {
                            App.smlOrdDet.select(i);
                            App.grdOrdDet.deleteSelected();
                        }
                    }
                }
            }
            App.grdTaxTrans.view.refresh();
            calcDet();
            if (App.cboStatus.getValue() == "N") {
                checkReadOnlyOrderDate();
            }
        } else {
            var isDelPromo = false;
            if (HQ.DeleteRow == 2) {
                var itemDel = App.smlOrdDet.selected.items[0];
                if (_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder && itemDel.data.InvtID != '' && itemDel.data.FreeItem == false) {
                    isDelPromo = true;
                }
            }
            App.stoLotTrans.clearFilter();
            App.frmMain.submit({
                waitMsg: HQ.waitMsg,
                method: 'POST',
                url: 'OM10100/DeleteDet',
                timeout: 180000,
                params: {
                    lstOrdDet: Ext.encode(App.stoOrdDet.getRecordsValues()),
                    lstLot: Ext.encode(App.stoLotTrans.getRecordsValues()),
                    lineRef: App.grdOrdDet.getSelectionModel().selected.items[0].data.LineRef,
                    lstTax: Ext.encode(App.stoTaxTrans.getRecordsValues()),
                    lstDisc: Ext.encode(App.stoOrdDisc.getRecordsValues()),
                    lstGift: Ext.encode(App.stoEditDetail.getRecordsValues()),
                    lstChoice: Ext.encode(App.stoChoice.getRecordsValues()),
                    lstManualPromo: Ext.encode(App.stoManualPromo.getRecordsValues()),
                    isDelPromo: isDelPromo
                },
                success: function (msg, data) {
                    if (this.result.choice != undefined) {
                        if (this.result.data!=undefined &&  this.result.data.choice != undefined) {
                            this.result.choice = this.result.data.choice;
                        }
                        App.stoChoice.clearData();
                        App.stoChoiceHeader.clearData();
                        var isHideInvtID = false;
                        setChoiceData(this.result.choice, isHideInvtID);

                        HQ.common.showBusy(false);

                        App.stoChoice.filterBy(function (item) {
                            if (item.data.InvtID == "####") {
                                return item;
                            }
                        });
                        App.grdChoice.view.refresh();
                        App.smlChoiceHeader.clearSelections();
                        App.grdChoiceHeader.view.refresh();
                        App.winChoice.show();
                        if (isHideInvtID) {
                            HQ.grid.hide(App.grdChoiceHeader, ['InvtID', 'Unit', 'Descr']);
                        } else {
                            HQ.grid.show(App.grdChoiceHeader, ['InvtID', 'Unit', 'Descr']);
                        }

                        App.winChoice.isSave = false;
                        App.winChoice.show();
                        HQ.message.process(msg, data, true);
                    } else {
                        HQ.message.process(msg, data, true);
                        App.grdOrdDet.deleteSelected();
                        App.stoOrder.load();
                    }
                    if (App.cboStatus.getValue() == "N") {
                        checkReadOnlyOrderDate();
                    }
                },
                failure: function (msg, data) {
                    HQ.message.process(msg, data, true);
                }
            });
        }
    }
};

var deleteLot = function (item) {
    if (item == 'yes') {
        App.grdLot.deleteSelected();
    }
};

var report = function () {
    App.frmMain.submit({
        waitMsg: HQ.waitMsg,
        clientValidation: false,
        method: 'POST',
        url: 'IN10100/Report',
        timeout: 180000,
        success: function (msg, data) {
            if (this.result.reportID != null) {
                window.open('Report?ReportName=' + this.result.reportName + '&_RPTID=' + this.result.reportID, '_blank');
            }
            processMessage(msg, data, true);
        },
        failure: function (msg, data) {
            processMessage(msg, data, true);
        }
    });
};

var setChoiceData = function (choice, isHideInvtID) {
    debugger
    choice.forEach(function (item) {
        var newChoice = Ext.create('App.mdlChoice');
        for (var key in newChoice.data) {
            newChoice.data[key] = item[key];
        }
        newChoice.data.TotQty = item.FreeItemQtyBase * item.FreeItemQty;
        newChoice.commit();
        
        var choiceHeader = HQ.store.findInStore(App.stoChoiceHeader, ['Index'], [item.Index]);
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
}
//////////////////////////////////
var checkExitEdit = function (row) {
    var key = row.field == undefined ? "StkQty" : row.field;
    var det = row.record.data;
    var invt = row.record.invt;
    var record = row.record;
    var qtyTot = 0, editQty = 0, stkQty = 0, lineQty = 0;

    if (key == "LineQty" || key == "UnitRate" || "StkQty") {
        det.StkQty = det.UnitMultDiv == "D" ? det.LineQty / det.UnitRate : det.LineQty * det.UnitRate;
        det.DumyLineQty = det.LineQty;        
    }

    if (det.FreeItem == true && key == "LineQty") {
        var tam = HQ.store.findRecord(App.stoManualPromo, ['FreeItemID', 'Selected', 'DiscCode'], [det.InvtID, true, det.DiscCode]);
        if (tam != undefined) {
            tam.set("FreeItemQty", det.LineQty);
            App.grdManualPromo.view.refresh();
        }
    }

    if (key == "LineQty" || key == "QtyBO" || key == "SlsPrice" || key == "DiscAmt" || key == "DiscPct" || key == "ManuDiscAmt") {

        if (key == "LineQty") {
            var budgetID = "";
            var discCode = "";
            var discID = "";
            var discSeg = "";
            var mannualDisc = false;
            var firstCal = true;
            var invtRCord = HQ.store.findRecord(App.stoOM10100_pdInvtMark, ['InvtID', 'FreeItem'], [det.InvtID, det.FreeItem]);
            if (invtRCord) {
                det.MMark = invtRCord.data.Mark;
            } else {
                det.MMark = 0;
            }
            det.Mark = det.MMark * det.LineQty;
            calcSalesPromoMark();

            if (!Ext.isEmpty(det.DiscCode) && det.FreeItem) {
                var objDisc = HQ.store.findInStore(App.stoDisc, ['DiscCode'], [det.DiscCode]);
                if (!Ext.isEmpty(objDisc)) {
                    budgetID = objDisc.BudgetID;
                    discCode = objDisc.DiscCode;
                    discID = discCode;
                    discSeg = "";
                    mannualDisc = true;
                    firstCal = true;
                }
            }
            else if (!Ext.isEmpty(det.BudgetID1) && det.FreeItem) {
                budgetID = det.BudgetID1;
                discID = det.DiscID1;
                discSeg = det.DiscSeq1;
                firstCal = true;
            }
            else if (!Ext.isEmpty(det.BudgetID2) && det.FreeItem) {
                budgetID = det.BudgetID2;
                discID = det.DiscID2;
                discSeg = det.DiscSeq2;
                firstCal = false;
            }

            if (HQ.objOM.DfltSalesPrice == "I") {
                det.SlsPrice = det.UnitMultDiv == "M" ? invt.SOPrice * det.UnitRate : invt.SOPrice / det.UnitRate;
            }
            else {

                if (HQ.objType.INDocType == "II" || HQ.objType.INDocType == "RC") {
                    var itemSite = HQ.store.findInStore(App.stoItemSite, ['SiteID', 'InvtID', 'WhseLoc'], [det.SiteID, det.InvtID, det.WhseLoc]);
                    if (det.UnitMultDiv == "M")
                        det.SlsPrice = itemSite.AvgCost * itemSite.UnitRate;
                    else
                        det.SlsPrice = itemSite.AvgCost / (det.UnitRate == 0 ? 1 : det.UnitRate);
                }
                else {

                    var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [det.InvtID, det.SlsUnit]);
                    if (!Ext.isEmpty(price)) det.SlsPrice = price.Price;
                    else det.SlsPrice = 0;

                    if (det.UnitMultDiv == "M")
                        stkQty = det.LineQty * (det.UnitRate == 0 ? 1 : det.UnitRate);
                    else
                        stkQty = det.LineQty / (det.UnitRate == 0 ? 1 : det.UnitRate);

                    if (det.FreeItem) {
                        if (HQ.objOM.InlcSOFeeProm) {
                            det.SOFee = Math.round(invt.SOFee * stkQty);
                        }
                        else
                            det.SOFee = 0;
                    }
                    else
                        det.SOFee = Math.round(invt.SOFee * stkQty);
                }
            }


        } else if (key == "SlsPrice") {
            if (!det.FreeItem && det.BOType != "R" 
                && det.DiscCode == '' && det.ClassID != 'POSM' // Không tính Thành Tiền khi là POSM hoặc KM
            ) {

                var soFee = 0;

                if (HQ.objOM.InlcSOFeeDisc)
                    soFee = det.SOFee;
                else
                    soFee = 0;

                if (det.DiscAmt != 0) det.ManuDiscAmt = 0;

                if (det.BOType == "O" && det.DiscAmt1 == 0 && det.DiscAmt2 == 0) {
                    det.DiscAmt2 = Math.round((soFee + det.LineQty * det.SlsPrice) * (det.DiscPct / 100));
                    det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
                else if (det.DiscAmt1 == 0 && det.DiscAmt2 == 0) {
                    det.DiscAmt2 = Math.round((soFee + det.LineQty * det.SlsPrice) * (det.DiscPct / 100));
                    det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }

            }
        } else if (key == "QtyBO") {
            if (det.DiscAmt != 0) det.ManuDiscAmt = 0;
            if (det.BOType == "O" && det.DiscAmt1 == 0 && det.DiscAmt2 == 0) {
                det.DiscAmt2 = Math.round(det.LineQty * det.SlsPrice * (det.DiscPct / 100));
                det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
            }
        } else if (key == "DiscAmt" && det.LineQty != 0 && det.SlsPrice != 0) {
            if (!det.FreeItem && det.BOType != "R"
                && det.DiscCode == '' && det.ClassID != 'POSM' // Không tính Thành Tiền khi là POSM hoặc KM
            ) {
                var soFee = 0;
                if (HQ.objOM.InlcSOFeeDisc)
                    soFee = det.SOFee;
                else
                    soFee = 0;

                det.DiscAmt1 = det.DiscAmt;

                if (det.BOType == "O") {
                    det.DiscPct = +((det.DiscAmt * 100) / ((det.LineQty) * det.SlsPrice + soFee - det.ManuDiscAmt)).toFixed(2);
                    det.LineAmt = Math.round((det.LineQty) * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
                else {
                    det.DiscPct = +((det.DiscAmt * 100) / (det.LineQty * det.SlsPrice + soFee - det.ManuDiscAmt)).toFixed(2);
                    det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
            }
        } else if (key == "DiscPct") {
            if (!det.FreeItem && det.BOType != "R"
                && det.DiscCode == '' && det.ClassID != 'POSM' // Không tính Thành Tiền khi là POSM hoặc KM
            ) {
                var soFee = 0;
                if (HQ.objOM.InlcSOFeeDisc)
                    soFee = det.SOFee;
                else
                    soFee = 0;

                det.DiscAmt1 = det.DiscAmt;

                if (det.BOType == "O") {
                    det.DiscAmt = Math.round((soFee - det.ManuDiscAmt + (det.LineQty) * det.SlsPrice) * (det.DiscPct / 100));
                    det.LineAmt = Math.round((det.LineQty) * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
                else {
                    det.DiscAmt = Math.round((soFee - det.ManuDiscAmt + det.LineQty * det.SlsPrice) * (det.DiscPct / 100));
                    det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
            }
        } else if (key == "ManuDiscAmt") {
            if (!det.FreeItem && det.BOType != "R"
                && det.DiscCode == '' && det.ClassID != 'POSM' // Không tính Thành Tiền khi là POSM hoặc KM
            ) {
                var soFee = 0;
                if (HQ.objOM.InlcSOFeeDisc)
                    soFee = det.SOFee;
                else
                    soFee = 0;

                if (det.BOType == "O") {
                    if (det.ManuDiscAmt == 0) {
                        //det.DiscAmt = Math.Round((soFee + (det.LineQty + det.QtyBO) * det.SlsPrice) * (det.DiscPct / 100), 0);
                        det.DiscAmt = Math.round((soFee + (det.LineQty) * det.SlsPrice) * (det.DiscPct / 100));
                    }
                    //det.LineAmt = Math.Round((det.LineQty + det.QtyBO) * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt, 0);
                    det.LineAmt = Math.round((det.LineQty) * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
                else {
                    if (det.ManuDiscAmt == 0)
                        det.DiscAmt = Math.round((soFee + det.LineQty * det.SlsPrice) * (det.DiscPct / 100));
                    det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                }
            }
        }

        var lstDetails = App.stoOrdDet.snapshot || App.stoOrdDet.allData || App.stoOrdDet.data;
        if (lstDetails != undefined) {
            for (var i = 0; i < lstDetails.length; i++) {
                if (lstDetails.items[i].data.FreeItem == false) {
                    if (lstDetails.items[i].raw != undefined) {
                        if (lstDetails.items[i].data.LineQty != lstDetails.items[i].raw.LineQty) {
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

        
        record.commit();
        getQtyAvail(row.record);
        if (key == "LineQty") {
            calcLot(record);
        }
        checkSubDisc(record);
        checkTaxInGrid(key, record);
        calcDet();


    } else if (key == "LineAmt") {
        var soFee = 0;
        if (HQ.objOM.InlcSOFeeDisc)
            soFee = det.SOFee;
        else
            soFee = 0;

        det.ManuDiscAmt = 0;

        if (det.BOType == "O") {
            det.SlsPrice = Math.round((det.DiscAmt + det.LineAmt) / (det.LineQty));
            det.DiscPct = +((det.DiscAmt * 100) / ((det.LineQty) * det.SlsPrice + soFee)).toFixed(2);
        }
        else {
            det.SlsPrice = Math.round((det.DiscAmt + det.LineAmt) / det.LineQty);
            det.DiscPct = +((det.DiscAmt * 100) / (det.LineQty * det.SlsPrice + soFee)).toFixed(2);
        }
        record.commit();

    } else if (key == "SiteID") {
        var price = 0;

        if (HQ.objOM.DfltSalesPrice == "I") {
            price = Math.round(det.UnitMultDiv == "M" ? invt.SOPrice * det.UnitRate : invt.SOPrice / det.UnitRate);
            det.SlsPrice = price;
        }
        else {

            var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [det.InvtID, det.SlsUnit]);

            if (!Ext.isEmpty(price)) det.SlsPrice = price.Price;
            else det.SlsPrice = 0;
        }
        det.LineAmt = 0;
        det.LineQty = 0;
        det.QtyBO = 0;
        det.DiscPct = 0;
        App.stoLotTrans.clearFilter();
        for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
            if (App.stoLotTrans.data.items[i].data.OMLineRef == det.LineRef) {
                App.stoLotTrans.data.removeAt(i);
            }
        }

        calcDet();
        record.commit();
        getQtyAvail(row.record);
        checkTaxInGrid(key, record);

    } else if (key == "SlsUnit") {
        var price = 0;
        var cnvFact = 0;
        var unitMultDiv = "";

        var cnv = setUOM(invt.InvtID, invt.ClassID, invt.StkUnit, det.SlsUnit);
        if (!Ext.isEmpty(cnv)) {
            cnvFact = cnv.CnvFact;
            unitMultDiv = cnv.MultDiv;
            det.UnitRate = cnvFact;
            det.UnitMultDiv = unitMultDiv;
        } else {
            det.UnitMultDiv = '';
            det.UnitPrice = 0;
            det.SlsUnit = '';
            record.commit();
            App.grdOrdDet.view.loadMask.hide();
            App.grdOrdDet.view.loadMask.setDisabled(false);
            return;
        }

        if (HQ.objOM.DfltSalesPrice == "I") {
            price = Math.round(unitMultDiv == "M" ? invt.SOPrice * cnvFact : invt.SOPrice / cnvFact);
            det.SlsPrice = price;
        }
        else {

            var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [det.InvtID, det.SlsUnit]);

            if (!Ext.isEmpty(price)) det.SlsPrice = price.Price;
            else det.SlsPrice = 0;
        }
        det.LineQty = 0;
        det.QtyBO = 0;
        det.SOFee = 0;
        det.LineAmt = 0;
        record.commit();

        calcDet();
        getQtyAvail(row.record);
        calcLot(row.record);
        checkTaxInGrid(key, record);

    } else if (key == "FreeItem") {
        if (det.FreeItem) {
            var promoSite = (_discSite == undefined || _discSite == '') ? det.BranchID + 'M' : _discSite;
            var existSiteID = HQ.store.findRecord(App.cboDetSiteID.store, ['SiteID'], [promoSite]);
            if (existSiteID) {
                det.SiteID = promoSite;

                var price = 0;

                if (HQ.objOM.DfltSalesPrice == "I") {
                    price = Math.round(det.UnitMultDiv == "M" ? invt.SOPrice * det.UnitRate : invt.SOPrice / det.UnitRate);
                    det.SlsPrice = price;
                }
                else {

                    var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [det.InvtID, det.SlsUnit]);

                    if (!Ext.isEmpty(price)) det.SlsPrice = price.Price;
                    else det.SlsPrice = 0;
                }

                //det.LineQty = 0;
                //det.QtyBO = 0;

                App.stoLotTrans.clearFilter();
                for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
                    if (App.stoLotTrans.data.items[i].data.OMLineRef == det.LineRef) {
                        App.stoLotTrans.data.removeAt(i);
                    }
                }
                
                record.commit();
                getQtyAvail(row.record);
                checkTaxInGrid(key, record);
            }//Them vao khi chon FreeItem tu dong chon SiteID KM
            det.DiscPct = 0;
            det.DiscAmt = 0;
            det.LineAmt = 0;
            det.ManuDiscAmt = 0;

            if (HQ.objOM.InlcSOFeeProm) {
                det.SOFee = Math.round(invt.SOFee * det.StkQty);
            }
            else {
                det.SOFee = 0;
            }
            checkTaxInGrid(key, record);
            calcDet();
        }
        else {
            det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
            checkTaxInGrid(key, record);
            calcDet();
        }
        record.commit();
        var invtRCord = HQ.store.findRecord(App.stoOM10100_pdInvtMark, ['InvtID', 'FreeItem'], [det.InvtID, det.FreeItem]);
        if (invtRCord) {
            det.MMark = invtRCord.data.Mark;
        } else {
            det.MMark = 0;
        }
        det.Mark = det.MMark * det.LineQty;
        calcSalesPromoMark();
    } else if (key == "CostID" && invt.ValMthd == "S") {

    } else if (key == "SOFee") {
        var soFee = 0;
        if (HQ.objOM.InlcSOFeeDisc) soFee = det.SOFee;
        else soFee = 0;

        if (det.BOType != "R" && !det.FreeItem) {
            if (det.DiscAmt != 0) {
                record.data.ManuDiscAmt = 0;
            }
            record.data.DiscAmt = Math.round((soFee + det.LineQty * det.SlsPrice) * (det.DiscPct / 100));
            record.data.DiscPct = +((det.DiscAmt * 100) / (det.LineQty * det.SlsPrice + soFee)).toFixed(2);
            record.data.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
        }

        record.commit();
        calcDet();

    } else if (key == "DiscCode") {
        var budgetID = "";
        var discCode = "";
        var tmp = "";
        var tmplineQty = det.LineQty;

        var objDisc = HQ.store.findInStore(App.stoDisc, ['DiscCode'], [det.DiscCode]);

        if (!Ext.isEmpty(objDisc)) {
            det.BudgetID1 = objDisc.BudgetID;
        }
        else {
            det.BudgetID1 = "";
        }
        if (det.DiscCode != '') {
            det.Qty = 0;
            det.SlsPrice = 0;
            det.DiscPct = 0;
            det.DiscAmt = 0;
            det.LineAmt = 0;
            det.ManuDiscAmt = 0;
        } else {
            det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
        }
        record.commit();
        checkTaxInGrid(key, record);
        calcDet();
    } else if (key == "InvtID" || key == "BarCode") {
        var invt = row.record.invt;
        if (key == "BarCode") {
            det.InvtID = invt.InvtID;
        }

        if (key == "InvtID") {
            det.BarCode = invt.BarCode;
        }

        var site = HQ.store.findInStore(App.stoItemSite, ['SiteID', 'InvtID', 'WhseLoc'], [_OMSite, det.InvtID, _OMWhseLoc]);

        if (!Ext.isEmpty(site)) {
            det.SiteID = _OMSite;
            det.WhseLoc = _OMWhseLoc;
        }
        else {
            site = HQ.store.findInStore(App.stoItemSite, ['SiteID', 'InvtID', 'WhseLoc'], [invt.DfltSite, det.InvtID, det.WhseLoc]);
            if (Ext.isEmpty(site)) {
                site = Ext.create('App.mdlItemSite');
            }
        }

        var cnvFact = 0;
        var unitMultDiv = "";

        var cnv = setUOM(invt.InvtID, invt.ClassID, invt.StkUnit, invt.DfltSOUnit);

        if (!Ext.isEmpty(cnv)) {
            cnvFact = cnv.CnvFact;
            unitMultDiv = cnv.MultDiv;
            det.SlsUnit = invt.DfltSOUnit;
            det.UnitRate = cnvFact;
            det.UnitMultDiv = unitMultDiv;
            det.SiteID = site.SiteID;
            
            det.Descr = invt.Descr;
            det.TaxCat = invt.TaxCat;
            det.ItemPriceClass = invt.PriceClassID;
        }
        else {
            det.UnitMultDiv = '';
            det.UnitPrice = 0;
            det.SlsUnit = '';
            det.InvtID = '';
            det.BarCode = '';
            record.commit();
            return;
        }

        var price = 0;
        var price1 = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [det.InvtID, det.SlsUnit]);
        if (HQ.objOM.DfltSalesPrice == "I") {
            price = unitMultDiv == "M" ? invt.SOPrice * cnvFact : invt.SOPrice / cnvFact;
            record.data.SlsPrice = price;
        }
        else {
         
            if (!Ext.isEmpty(price1)) det.SlsPrice = price1.Price;
            else det.SlsPrice = 0;
        }

        det.POSM = det.POSM == '' ? (!Ext.isEmpty(price1) ? price1.POSMID : det.POSM) : det.POSM;
        det.LineQty = 0;
        det.QtyBO = 0;
        det.SOFee = 0;
        det.LineAmt = 0;
        det.DiscPct = 0;
        det.DiscAmt = 0;
        det.ManuDiscAmt = 0;

        record.commit();

        checkDetAdd();

        calcDet();
        getQtyAvail(row.record);
        checkTaxInGrid(key, record);


        if ((key == 'InvtID' && !Ext.isEmpty(det.InvtID)) || (key == 'BarCode' && !Ext.isEmpty(det.BarCode))) {
            var newRow = Ext.create('App.mdlOrdDet');
            newRow.data.BOType = 'S';
            HQ.store.insertRecord(App.stoOrdDet, key, newRow, true);
        }
    }
    if ((det.LineQty == 0 || key == 'LineQty' || key == 'SlsUnit' || key == 'FreeItem' || key == 'DiscCode' || key == 'SiteID' || key == 'LineAmt' || key == 'SlsPrice'))//(det.SumDiscInvoice > 0) && 
    {
        var docDiscAmt = det.SumDiscInvoice;
        det.DiscPct = 0;
        det.DiscAmt = 0;
        det.DocDiscAmt = 0;
        det.SumDiscInvoice = 0;
        det.GroupDiscAmt1 = 0;
        det.GroupDiscAmt2 = 0;
        record.commit();
        calcDet();
        if (App.txtVolDiscAmt.value > docDiscAmt) {
            App.txtVolDiscAmt.setValue(App.txtVolDiscAmt.value - docDiscAmt);
        } else {
            App.txtVolDiscAmt.setValue(0);
        }
        
        checkTaxInGrid(key, record);
        calcDet();
        getQtyAvail(row.record);
    }    
    App.grdOrdDet.view.loadMask.hide();
    App.grdOrdDet.view.loadMask.setDisabled(false)
};

var checkExitEditLot = function (row) {
    var key = row.field;
    var record = row.record;
    var lot = row.record.data;
    if (key == "Qty") {
        getLotQtyAvail(record);
    } else if (key == "UnitDesc") {
        var price = 0;
        var cnvFact = 0;
        var unitMultDiv = "";
        var cnv = setUOM(App.winLot.record.invt.InvtID, App.winLot.record.invt.ClassID, App.winLot.record.invt.StkUnit, lot.UnitDesc);
        if (!Ext.isEmpty(cnv)) {
            cnvFact = cnv.CnvFact;
            unitMultDiv = cnv.MultDiv;
            lot.CnvFact = cnvFact;
            lot.UnitMultDiv = unitMultDiv;
        } else {
            lot.CnvFact = 1;
            lot.UnitMultDiv = '';
            lot.UnitPrice = 0;
            lot.SlsUnit = '';
            record.commit();
            App.grdLot.view.loadMask.hide();
            App.grdLot.view.loadMask.setDisabled(false)
            return;
        }

        if (HQ.objOM.DfltSalesPrice == "I") {
            price = Math.round(unitMultDiv == "M" ? App.winLot.record.invt.SOPrice * cnvFact : App.winLot.record.invt.SOPrice / cnvFact);
            lot.UnitPrice = lot.UnitCost = price;
        }
        else {

            var price = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [App.winLot.record.invt.InvtID, lot.UnitDesc]);

            if (!Ext.isEmpty(price)) lot.UnitPrice = lot.UnitCost = price.Price;
            else lot.UnitPrice = lot.UnitCost = 0;
        }

        getLotQtyAvail(record);
    } else if (key == "LotSerNbr") {
        var flat = false;
        //App.stoLotTrans.data.each(function (item) {
        //    if (item.data.LotSerNbr == lot.LotSerNbr && item.id != record.id) {
        //        flat = true;
        //        return false;
        //    }
        //});
        if (flat) {
            HQ.message.show(219, "", "", true);
            lot.LotSerNbr = "";
            App.grdLot.view.loadMask.hide();
            App.grdLot.view.loadMask.setDisabled(false)
            record.commit();
            return;
        }
        lot.UnitDesc = App.winLot.record.data.SlsUnit;
        lot.UnitPrice = lot.UnitCost = App.winLot.record.data.SlsPrice;
        lot.UnitMultDiv = App.winLot.record.data.UnitMultDiv;
        lot.CnvFact = App.winLot.record.data.UnitRate;
        var itemLot = HQ.store.findInStore(App.stoItemLot, ['InvtID', 'SiteID', 'LotSerNbr'], [lot.InvtID, lot.SiteID, lot.LotSerNbr]);
        if (!Ext.isEmpty(itemLot)) {
            lot.ExpDate = itemLot.ExpDate;
        }

        if (!Ext.isEmpty(lot.LotSerNbr)) {
            var newRow = Ext.create('App.mdlLotTrans');
            newRow.data.OMLineRef = lot.OMLineRef;
            HQ.store.insertRecord(App.stoLotTrans, key, newRow, true);
        }
        getLotQtyAvail(record);
    }
    record.commit();
    App.grdLot.view.loadMask.hide();
    App.grdLot.view.loadMask.setDisabled(false)
};

var checkSubDisc = function (record) {

    var det = record.data;
    if (!det.FreeItem && det.BOType != "R"
        && det.DiscCode == '' && det.ClassID != 'POSM' // Không tính Thành Tiền khi là POSM hoặc KM
        ) {
        if (det.DiscAmt != 0) det.ManuDiscAmt = 0;
        if (det.BOType == "O") {
            det.DiscAmt = Math.round(det.LineQty * det.SlsPrice * (det.DiscPct / 100));
            det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
        }
        else {
            det.DiscAmt = Math.round(det.LineQty * det.SlsPrice * (det.DiscPct / 100));
            det.LineAmt = Math.round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
        }
    }
    App.stoOrdDisc.data.each(function (item) {
        var disc = item.data;
        if (det.FreeItem && !Ext.isEmpty(det.DiscID1) && disc.FreeItemID == det.InvtID && disc.SOLineRef == det.LineRef) {
            disc.FreeItemQty = det.LineQty;
            disc.UserOperationLog = "User Changed Free Item Qty";
        }
    });

    App.stoOrdDisc.commitChanges();
    App.grdDisc.view.refresh();
};

var calcDet = function () {
    if (Ext.isEmpty(HQ.objType)) return;

    var taxAmt00 = 0;
    var taxAmt01 = 0;
    var taxAmt02 = 0;
    var taxAmt03 = 0;

    var soFee = 0;
    var curyLineDiscAmt = 0;
    var ordQty = 0;


    var curyLineAmt = 0;

    App.stoOrdDet.data.each(function (det) {
        taxAmt00 += det.data.TaxAmt00;
        taxAmt01 += det.data.TaxAmt01;
        taxAmt02 += det.data.TaxAmt02;
        taxAmt03 += det.data.TaxAmt03;
        soFee += det.data.SOFee;
        curyLineAmt += det.data.LineAmt;
        curyLineDiscAmt += det.data.DiscAmt + det.data.ManuDiscAmt;
        ordQty += det.data.LineQty;
    });




    App.txtSOFeeTot.setValue(Math.round(soFee));
    App.txtCuryTaxAmt.setValue(Math.round(taxAmt00 + taxAmt01 + taxAmt02 + taxAmt03));
    App.txtCuryLineDiscAmt.setValue(Math.round(curyLineDiscAmt));
    App.txtCuryLineAmt.setValue(Math.round(curyLineAmt));


    if (HQ.objType.DiscType == "B")
        App.txtTxblAmt.setValue(curyLineAmt);
    else {
        if (HQ.objType.TaxFee) {
            App.txtTxblAmt.setValue(curyLineAmt - App.txtCuryTaxAmt.getValue() +
                               App.txtSOFeeTot.getValue() * 0.1);
        }
        else {
            App.txtTxblAmt.setValue(curyLineAmt - App.txtCuryTaxAmt.getValue());
        }
    }

    App.txtCuryOrdAmt.setValue(Math.round(App.txtTxblAmt.getValue() + App.txtFreightAmt.getValue() +
                                        App.txtMiscAmt.getValue() + App.txtCuryTaxAmt.getValue() +
                                        App.txtSOFeeTot.getValue() - App.txtVolDiscAmt.getValue() -
                                        App.txtOrdDiscAmt.getValue()))
    App.txtOrdQty.setValue(Math.round(ordQty));
};

var updateDistPctAmt = function () {
    //App.txtOrdDiscAmt.events['change'].suspend();
    //if (HQ.objOM.InlcSOFeeDisc) {
    //    if (App.txtVolDiscAmt.getValue() == 0) {
    //        if (HQ.objType.TaxFee)
    //            App.txtOrdDiscAmt.setValue(Math.round((App.txtVolDiscPct.getValue() * (App.txtCuryLineAmt.getValue() + App.txtSOFeeTot.getValue() * 1.1 - App.txtVolDiscAmt.getValue())) / 100));
    //        else
    //            App.txtOrdDiscAmt.setValue(Math.round((App.txtVolDiscPct.getValue() * (App.txtCuryLineAmt.getValue() + App.txtSOFeeTot.getValue() - App.txtVolDiscAmt.getValue())) / 100));
    //    }
    //    else
    //        App.txtOrdDiscAmt.setValue(Math.round((App.txtVolDiscPct.getValue() * (App.txtCuryLineAmt.getValue() - App.txtVolDiscAmt.getValue())) / 100));
    //} else {
    //    App.txtOrdDiscAmt.setValue(Math.round((App.txtVolDiscPct.getValue() * (App.txtCuryLineAmt.getValue() - App.txtVolDiscAmt.getValue())) / 100));
    //}
    //App.txtOrdDiscAmt.events['change'].resume();
};

var defaultOnNew = function () {
    clearBKPopupData();
    var record = Ext.create('App.mdlOrder');

    if (Ext.isEmpty(App.cboOrderType.getValue())) {
        App.cboOrderType.events['change'].suspend();
        App.cboOrderType.setValue('IN');
        App.cboOrderType.events['change'].resume();
        record.data.OrderType = 'IN';
    } else {
        record.data.OrderType = App.cboOrderType.getValue();
    }
    orderTypeContrainst();
    formatGrid();

    record.data.DoNotCalDisc = App.chkDoNotCalDisc.getValue();
    record.data.BranchID = HQ.cpnyID;
    record.data.Status = 'N';
    record.data.OrderDate = HQ.businessDate;
    record.data.ARDocDate = HQ.businessDate;
    record.data.ShipDate = HQ.businessDate;
    record.data.ExpiryDate = HQ.businessDate;

    App.txtRewardAmt.setValue(0);
    _displayIDs = '';
    App.txtDocBal.setValue(0);

    App.frmMain.validate();

    bindOrder(record);
    App.stoManualPromo.reload();
    if (App.cboStatus.getValue() == "N") {
        checkReadOnlyOrderDate();
    }
};

var orderTypeContrainst = function () {
    
    if (Ext.isEmpty(HQ.objType)) {
        HQ.objType = App.cboOrderType.displayTplData[0];
    }
    if (Ext.isEmpty(HQ.objType)) {
        HQ.objType = Ext.create(App.stoOrderType.model.modelName).data;
    }
    if (HQ.objType.SalesType == "PET" || HQ.objType.SalesType == "PEX" || HQ.objType.SalesType == "POS" || HQ.objType.SalesType == "INS") {
        App.chkDoNotCalDisc.setReadOnly(false);
        App.chkDoNotCalDisc.setValue(false);
    }
    else {
        App.chkDoNotCalDisc.setReadOnly(false);
        App.chkDoNotCalDisc.setValue(false);
    }

    if (HQ.objType.AutoPromotion != 1) {
        App.chkDoNotCalDisc.setValue(true);
    }
    else {
        App.chkDoNotCalDisc.setValue(false);
    }
    
    if (App.cboStatus.getValue() == "N") {
        App.chkDoNotCalDisc.setReadOnly(_selOrderType == _INOrder);
    }
};

var formatGrid = function () {

    if (HQ.objType.BO) {
        App.colBOType.show();
        App.colQtyBO.show();
        App.colBOCustID.show();
        App.colOrigOrderNbr.show();
    }
    else {
        App.colBOType.hide();
        App.colQtyBO.hide();
        App.colBOCustID.hide();
        App.colOrigOrderNbr.hide();
    }
    if (HQ.objOM.UseBarCode == 1) {
        App.colBarCode.show();
        App.colInvtID.hide();
    }
    else {
        App.colBarCode.hide();
        App.colInvtID.show();
    }
    if (HQ.objIN.CnvFactEditable == true) {
        App.colUnitRate.show();
    }
    else {
        App.colUnitRate.hide();
    }

    App.colFreeItem.editable = HQ.objType.ManualDisc;
};

var lastLineRef = function () {
    var num = 0;
    App.stoOrdDet.data.each(function (item) {
        if (!Ext.isEmpty(item.data.LineRef) && parseInt(item.data.LineRef) > num) {
            num = parseInt(item.data.LineRef);
        }
    });
    num++;
    var lineRef = num.toString();
    var len = lineRef.length;
    for (var i = 0; i < 5 - len; i++) {
        lineRef = "0" + lineRef;
    }
    return lineRef;
};

var lastLineRefManual = function () {
    var num = 0;
    App.stoManualPromo.data.each(function (item) {
        if (!Ext.isEmpty(item.data.LineRef) && parseInt(item.data.LineRef) > num) {
            num = parseInt(item.data.LineRef);
        }
    });
    num++;
    var lineRef = num.toString();
    var len = lineRef.length;
    for (var i = 0; i < 5 - len; i++) {
        lineRef = "0" + lineRef;
    }
    return lineRef;
};

var calcTaxTotal = function () {
    var flat = false;
    App.stoTaxDoc.clearData();
    App.stoTaxTrans.data.each(function (tax) {
        flat = true;
        App.stoTaxDoc.data.each(function (taxDoc) {
            if (tax.data.OrderNbr == taxDoc.data.OrderNbr && tax.data.TaxID == taxDoc.data.TaxID) {
                taxDoc.data.TxblAmt += tax.data.TxblAmt;
                taxDoc.data.TaxAmt += tax.data.TaxAmt;
                flat = false;
                return false;
            }
        });
        if (flat) {
            var newTaxDoc = Ext.create('App.mdlTaxDoc');
            newTaxDoc.data.BranchID = tax.data.BranchID;
            newTaxDoc.data.OrderNbr = tax.data.OrderNbr;
            newTaxDoc.data.TaxID = tax.data.TaxID;
            newTaxDoc.data.TaxAmt = tax.data.TaxAmt;
            newTaxDoc.data.TaxRate = tax.data.TaxRate;
            newTaxDoc.data.TxblAmt = tax.data.TxblAmt;
            App.stoTaxDoc.data.add(newTaxDoc);
        }
    });
    App.grdTaxDoc.view.refresh();
};

var checkTaxInGrid = function (key, record) {
    var det = record.data;
    if (key == "TaxID" || key == "TaxCat" || key == "InvtID" || key == "SiteID" || key == "LineQty" ||
        key == "SlsUnit" || key == "SlsPrice" || key == "DiscPct" || key == "DiscAmt" || key == "SOFee" ||
        key == "ManuDiscAmt" || key == "LineAmt" || key == "FreeItem" || key == "DiscCode" || key == "POSM")
    {
        delTax(record);
        if (!calcTax(record)) {
            det.SlsUnit = '';
            det.SiteID = '';
            det.SlsPrice = 0;
            det.TxblAmt00 = 0;
            det.TaxAmt00 = 0;            
            det.LineQty = 0;
            det.QtyBO = 0;
            det.DiscPct = 0;
            det.DiscAmt = 0;
            det.ManuDiscAmt = 0;
            det.LineAmt = 0;
            record.commit();
        }
        calcTaxTotal();
    }
};

var delTax = function (record) {
    if (App.cboStatus.getValue() == "C" || App.cboStatus.getValue() == "L" || App.cboStatus.getValue() == "I") return false;
    var lineRef = record.data.LineRef;
    for (var j = App.stoTaxTrans.data.length - 1; j >= 0; j--) {
        if (App.stoTaxTrans.data.items[j].data.LineRef == lineRef)
            App.stoTaxTrans.data.removeAt(j);
    }
    clearTax(record);
    calcTaxTotal();
    calcDet();
    return true;
};

var clearTax = function (record) {
    record.data.TaxId00 = '';
    record.data.TaxAmt00 = 0;
    record.data.TxblAmt00 = 0;

    record.data.TaxId01 = '';
    record.data.TaxAmt01 = 0;
    record.data.TxblAmt01 = 0;

    record.data.TaxId02 = '';
    record.data.TaxAmt02 = 0;
    record.data.TxblAmt02 = 0;

    record.data.TaxId03 = '';
    record.data.TaxAmt03 = 0;
    record.data.TxblAmt03 = 0;

    record.commit();
};

var calcTax = function (record) {
    var det = record.data;
    if (App.cboStatus.getValue() == "C" || App.cboStatus.getValue() == "L" || App.cboStatus.getValue() == "I") return false;

    var groupDocDistAmt = det.DocDiscAmt + det.GroupDiscAmt1 + det.GroupDiscAmt2;

    var dt = [];
    if (det.TaxID == "*") {
        App.stoTax.data.each(function (item) {
            dt.push(item.data);
        });
    }
    else {
        var strTax = det.TaxID.split(',');
        if (strTax.length > 0) {
            for (var k = 0; k < strTax.length; k++) {
                for (var j = 0; j < App.stoTax.data.length; j++) {
                    if (strTax[k] == App.stoTax.data.items[j].data.TaxID) {
                        dt.push(App.stoTax.data.items[j].data);
                        break;
                    }
                }
            }
        }
        else {
            if (Ext.isEmpty(det.TaxID) || Ext.isEmpty(det.TaxCat)) App.stoOrdDet.data.items[i].set('TxblAmt00', det.LineAmt - groupDocDistAmt);
            return false;
        }
    }

    var taxCat = det.TaxCat;
    var prcTaxInclRate = 0, totPrcTaxInclAmt = 0, txblAmtL1 = 0, txblAmtAddL2 = 0;
    for (var j = 0; j < dt.length; j++) {
        var objTax = HQ.store.findInStore(App.stoTax, ['TaxID'], [dt[j].TaxID]);
        if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                       && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                       && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {
                if ((HQ.objType.DiscType == "A" && objTax.PrcTaxIncl == "0") ||
                    (HQ.objType.DiscType == "B" && objTax.PrcTaxIncl != "0")) {
                    HQ.message.show(730, '', '', true);
                    return false;
                }
                if (objTax.TaxCalcLvl == "1" && objTax.PrcTaxIncl != "0") {
                    prcTaxInclRate = prcTaxInclRate + objTax.TaxRate;
                }
            }
        }
    }

    if (HQ.objType.SalesType == "PET" && !det.FreeItem) {
        txblAmtL1 = Math.round(det.SlsPrice / (1 + prcTaxInclRate / 100)) * det.LineQty - det.DiscAmt - det.ManuDiscAmt;
    }
    else {
        if (prcTaxInclRate == 0)
            txblAmtL1 = Math.round(det.LineAmt - groupDocDistAmt);
        else
            txblAmtL1 = Math.round((det.LineAmt - groupDocDistAmt) / (1 + prcTaxInclRate / 100));
    }

    det.TxblAmt00 = txblAmtL1;
    record.commit();
    for (var j = 0; j < dt.length; j++) {

        var taxID = "", lineRef = "";
        var taxRate = 0, taxAmtL1 = 0;
        var objTax = HQ.store.findInStore(App.stoTax, ['TaxID'], [dt[j].TaxID]);
        if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                       && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                       && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {
                if (objTax.TaxCalcLvl == "1") {
                    taxID = dt[j].TaxID;
                    lineRef = det.LineRef;
                    taxRate = objTax.TaxRate;
                    taxAmtL1 = Math.round(txblAmtL1 * objTax.TaxRate / 100);

                    if (objTax.Lvl2Exmpt == 0) txblAmtAddL2 += txblAmtL1;

                    if (objTax.PrcTaxIncl != "0" && HQ.objType.SalesType != "PET") {
                        var chk = false;
                        if (j < dt.length - 1) {
                            for (var k = j + 1; k < dt.length; k++) {
                                objTax = dt[k];
                                if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
                                    if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat &&
                                                            objTax.CatExcept01 != taxCat && objTax.CatExcept02 != taxCat &&
                                                            objTax.CatExcept03 != taxCat && objTax.CatExcept04 != taxCat &&
                                                            objTax.CatExcept05 != taxCat)
                                                      || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                                                    objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                                                    objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {
                                        if (objTax.TaxCalcLvl == "1" && objTax.PrcTaxIncl != "0") {
                                            chk = false;
                                            break;
                                        }
                                    }
                                }
                                chk = true;
                            }
                        }
                        else {
                            chk = true;
                        }

                        if (chk) {
                            if (HQ.objType.TaxFee) {
                                if (totPrcTaxInclAmt + taxAmtL1 + txblAmtL1 - (det.SOFee * taxRate / 100) != det.LineAmt)
                                    taxAmtL1 = Math.round(det.LineAmt + (det.SOFee * taxRate / 100) - groupDocDistAmt - (totPrcTaxInclAmt + txblAmtL1));
                            }
                            else {
                                if (totPrcTaxInclAmt + taxAmtL1 + txblAmtL1 != det.LineAmt) taxAmtL1 = Math.round(det.LineAmt - groupDocDistAmt - (totPrcTaxInclAmt + txblAmtL1));
                            }
                        }
                        else
                            totPrcTaxInclAmt += totPrcTaxInclAmt + taxAmtL1;
                    }

                    if (HQ.objType.TaxFee)
                        insertUpdateTax(taxID, lineRef, taxRate, taxAmtL1, txblAmtL1 + det.SOFee,
                                        1);
                    else
                        insertUpdateTax(taxID, lineRef, taxRate, taxAmtL1, txblAmtL1, 1);

                }
            }
        }
    }

    for (var j = 0; j < dt.Count; j++) {
        var taxID = "", lineRef = "";
        var taxRate = 0, txblAmtL2 = 0, taxAmtL2 = 0;
        var objTax = HQ.store.findInStore(App.stoTax, ['TaxID'], [dt[j].TaxID]);
        if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                       && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                       && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {
                if (objTax.TaxCalcLvl == "2") {
                    taxID = dt[j].TaxID;
                    lineRef = det.LineRef;
                    taxRate = objTax.TaxRate;
                    txblAmtL2 = Math.round(txblAmtAddL2 + txblAmtL1);
                    taxAmtL2 = Math.round(txblAmtAddL2 * objTax.TaxRate / 100);
                    insertUpdateTax(taxID, lineRef, taxRate, taxAmtL2, txblAmtL2, 2);
                }
            }
        }
    }
    updateTax(record);
    calcDet();
    return true;
};

var insertUpdateTax = function (taxID, lineRef, taxRate, taxAmt, txblAmt, taxLevel) {
    var flat = false;
    for (var i = 0; i < App.stoTaxTrans.data.length; i++) {
        var tax = App.stoTaxTrans.data.items[i];
        if (tax.data.TaxID == taxID && tax.data.LineRef == lineRef) {
            tax.data.OrderNbr = Ext.isEmpty(App.cboOrderNbr.getValue()) ? '' : App.cboOrderNbr.getValue();
            tax.data.BranchID = App.txtBranchID.getValue();
            tax.data.TaxID = taxID;
            tax.data.LineRef = lineRef;
            tax.data.TaxRate = taxRate;
            tax.data.TaxLevel = taxLevel.toString();
            tax.data.TaxAmt = taxAmt;
            tax.data.TxblAmt = txblAmt;
            tax.commit();
            flat = true;
            break;
        }
    }
    if (!flat) {
        var newTax = Ext.create('App.mdlTaxTrans');
        newTax.data.BranchID = App.txtBranchID.getValue();
        newTax.data.OrderNbr = Ext.isEmpty(App.cboOrderNbr.getValue()) ? '' : App.cboOrderNbr.getValue();
        newTax.data.TaxID = taxID;
        newTax.data.LineRef = lineRef;
        newTax.data.TaxRate = taxRate;
        newTax.data.TaxLevel = taxLevel.toString();
        newTax.data.TaxAmt = taxAmt;
        newTax.data.TxblAmt = txblAmt;

        App.stoTaxTrans.data.add(newTax);
    }
    App.stoTaxTrans.sort('LineRef', "ASC");
    calcDet();

};

var updateTax = function (record) {
    var j = 0;
    var det = record.data;
    App.stoTaxTrans.data.each(function (item) {
        if (item.data.LineRef == det.LineRef) {
            if (j == 0) {
                det.TaxId00 = item.data.TaxID;
                det.TxblAmt00 = item.data.TxblAmt;
                det.TaxAmt00 = item.data.TaxAmt;
            }
            else if (j == 1) {
                det.TaxId01 = item.data.TaxID;
                det.TxblAmt01 = item.data.TxblAmt;
                det.TaxAmt01 = item.data.TaxAmt;
            }
            else if (j == 2) {
                det.TaxId02 = item.data.TaxID;
                det.TxblAmt02 = item.data.TxblAmt;
                det.TaxAmt02 = item.data.TaxAmt;
            }
            else if (j == 3) {
                det.TaxId03 = item.data.TaxID;
                det.TxblAmt03 = item.data.TxblAmt;
                det.TaxAmt03 = item.data.TaxAmt;
            }
            record.commit();
            j++;
        }
        if (j != 0 && item.data.LineRef != det.LineRef)
            return false;
    });

};

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

var renderQtyAmt = function (value) {
    return Ext.util.Format.number(value, '0,000');
};
var renderQtyAmt1 = function (value) {
    return Ext.util.Format.number(value, '0,000.0');
};
var renderQtyAmt2 = function (value) {
    return Ext.util.Format.number(value, '0,000.00');
};

var rendererMaxQty = function (value, metaData, record, rowIndex, colIndex, store, view) {
    var newVal = record.data.ConvertDiscAmtToFreeItem ? ''  : value;;
    return Ext.util.Format.number(newVal, '0,000');
}

var setStatusForm = function () {

    var lock = true;

    if (!Ext.isEmpty(HQ.objOrder.data.OrderNbr)) {
        if (HQ.objOrder.data.Status == 'N') {
            lock = false;
        }
    } else {
        lock = !HQ.isInsert;
    }

    HQ.common.lockItem(App.frmMain, lock);

    App.grdOrdDet.isLock = lock;

    App.cboOrderNbr.setReadOnly(false);
    App.cboHandle.setReadOnly(false);
    //App.cboCustID.setReadOnly(false);
    App.btnFindCust.enable();
    App.cboOrderType.setReadOnly(false);
    App.cboStatus.setReadOnly(true);
    App.txtCustName.setReadOnly(true);
    App.txtCustAddr.setReadOnly(true);
    App.txtVolDiscAmt.setReadOnly(true);
    App.txtCuryLineDiscAmt.setReadOnly(true);
    App.txtOrdQty.setReadOnly(true);
    App.txtTxblAmt.setReadOnly(true);
    App.txtCuryTaxAmt.setReadOnly(true);
    App.txtOrigOrderNbr.setReadOnly(true);
    App.txtARRefNbr.setReadOnly(true);
    App.txtLastInvcNbr.setReadOnly(true);
    App.txtSOFeeTot.setReadOnly(true);
    App.txtCuryOrdAmt.setReadOnly(true);
    if (HQ.objType.ARDocType == "CM" || HQ.objType.ARDocType == "CC") {
        App.cboMarkOrder.setReadOnly(true);
    }
    if (!Ext.isEmpty(HQ.objOrder.data.OrderNbr)) {
        App.cboSlsPerID.setReadOnly(true);
        //App.cboCustID.setReadOnly(true);
        App.btnFindCust.disable();
    }
    if (HQ.IsNewBackOrder && App.cboOrderType.getValue() == _ReturnOrder) {
        App.btnFindCust.disable();
    }

    setReadOnly();
};

var checkDetAdd = function () {
    var flat = false;
    App.stoOrdDet.data.each(function (item) {
        if (!Ext.isEmpty(item.data.InvtID)) {
            flat = true;
            return false;
        }
    });
    //App.cboCustID.setReadOnly(true);//fix loi combo CustID khong the chon du set readonly = false
    //App.cboCustID.setReadOnly(flat || !Ext.isEmpty(App.cboOrderNbr.getValue()));
    if (App.cboStatus.getValue() != 'N' || flat || HQ.IsNewBackOrder && App.cboOrderType.getValue() == _ReturnOrder) {
        App.btnFindCust.disable();
    }
    else {
        App.btnFindCust.enable();
    }
    App.cboSlsPerID.setReadOnly(flat || !Ext.isEmpty(App.cboOrderNbr.getValue()));
    // App.txtOrderDate.setReadOnly(flat || !Ext.isEmpty(App.cboOrderNbr.getValue()));
    App.txtOrderDate.setReadOnly(App.cboStatus.getValue() != "N" || App.cboOrderType.getValue() == "IR");

    if (App.cboOrderType.getValue() == "IR" || App.cboStatus.getValue() != "N") {
        App.txtOrderDate.setReadOnly(true);
    }
    else if (App.cboStatus.getValue() == "N") {
        checkReadOnlyOrderDate();
    }

};

var calculateInvtTotal = function (invtID, siteID, lineRef) {
    var oldQty = 0;
    App.stoOldOrdDet.data.each(function (item) {
        if (item.data.InvtID == invtID && item.data.SiteID == siteID) {
            oldQty += item.data.UnitMultDiv == "M" ? item.data.LineQty * item.data.UnitRate : item.data.LineQty / item.data.UnitRate;
        }
    });

    var qty = 0;
    App.stoOrdDet.data.each(function (item) {
        if (item.data.InvtID == invtID && item.data.SiteID == siteID) {
            qty += item.data.UnitMultDiv == "M" ? item.data.LineQty * item.data.UnitRate : item.data.LineQty / item.data.UnitRate;
        }
    });
    return qty - oldQty;
};

var getQtyAvail = function (row) {
    
    var site = HQ.store.findInStore(App.stoItemSite, ['InvtID', 'SiteID', 'WhseLoc'], [row.data.InvtID, row.data.SiteID, row.data.WhseLoc]);
    var qty = 0;
    if (row.data.BOType != "B" && HQ.objType.INDocType != "CM" && HQ.objType.INDocType != "DM" && HQ.objType.INDocType != "NA" && HQ.objType.INDocType != "RC") {
        if (!Ext.isEmpty(site)) {
            qty = site.QtyAvail - calculateInvtTotal(row.data.InvtID, row.data.SiteID, "");
            if (qty < 0) {
                HQ.message.show("1043", [row.data.InvtID, row.data.SiteID], "", true);
                row.data.LineQty = 0;
                row.commit();
                qty = site.QtyAvail - calculateInvtTotal(row.data.InvtID, row.data.SiteID, "");
            }
        }
        else {
            qty = 0 - calculateInvtTotal(row.data.InvtID, row.data.SiteID, "");
            if (qty < 0) {
                HQ.message.show("1043", [row.data.InvtID, row.data.SiteID], "", true);
                row.data.LineQty = 0;
                row.commit();
                qty = 0 - calculateInvtTotal(row.data.InvtID, row.data.SiteID, "");
            }
        }
        App.lblQtyAvail.setText(row.data.InvtID + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((row.data.UnitMultDiv == "M" ? (qty / row.data.UnitRate) : (qty * row.data.UnitRate)), 2)) + " - " + row.data.SlsUnit);
    } else {
        if (!Ext.isEmpty(site)) {
            qty = site.QtyAvail;
        } else {
            qty = 0;
        }
        App.lblQtyAvail.setText(row.data.InvtID + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((row.data.UnitMultDiv == "M" ? (qty / row.data.UnitRate) : (qty * row.data.UnitRate)), 2)) + " - " + row.data.SlsUnit);
    }
};

var getLotQtyAvail = function (row) {
    var lot = HQ.store.findInStore(App.stoItemLot, ['InvtID', 'SiteID', ['LotSerNbr']], [row.data.InvtID, row.data.SiteID, row.data.LotSerNbr]);
    var qty = 0;
    var qtyAvail = 0;

    App.stoLotTrans.snapshot.each(function (item2) {
        if (item2.data.LotSerNbr == row.data.LotSerNbr && item2.data.InvtID == row.data.InvtID && item2.data.SiteID == row.data.SiteID) {
            qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
        }
    });
    var det = App.winLot.record;

    if (det.data.BOType != "B" && HQ.objType.INDocType != "CM" && HQ.objType.INDocType != "DM" && HQ.objType.INDocType != "NA" && HQ.objType.INDocType != "RC") {
        if (!Ext.isEmpty(lot)) {
            qtyAvail = lot.QtyAvail - qty;
            if (qtyAvail < 0) {
                HQ.message.show(1043, [row.data.InvtID + " " + row.data.LotSerNbr, row.data.SiteID], "", true);
                qty = 0;
                row.data.Qty = 0;
                row.commit();
                App.stoLotTrans.snapshot.each(function (item2) {
                    if (item2.data.LotSerNbr == row.data.LotSerNbr && item2.data.InvtID == row.data.InvtID && item2.data.SiteID == row.data.SiteID) {
                        qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
                    }
                });
                qtyAvail = lot.QtyAvail - qty;

            }
        }
        else {
            qtyAvail = 0 - qty;
            if (qtyAvail < 0) {
                HQ.message.show(1043, [row.data.InvtID + " " + row.data.LotSerNbr, row.data.SiteID], "", true);
                qty = 0;
                row.data.Qty = 0;
                row.commit();
                App.stoLotTrans.snapshot.each(function (item2) {
                    if (item2.data.LotSerNbr == row.data.LotSerNbr && item2.data.InvtID == row.data.InvtID && item2.data.SiteID == row.data.SiteID) {
                        qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
                    }
                });
                qtyAvail = 0 - qty;
            }
        }
        App.lblLotQtyAvail.setText("Lot " + row.data.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((row.data.UnitMultDiv == "M" ? (qtyAvail / row.data.CnvFact) : (qtyAvail * row.data.CnvFact)), 2)) + " - " + row.data.UnitDesc);
    } else {
        if (!Ext.isEmpty(lot)) {
            qtyAvail = lot.QtyAvail;
        } else {
            qtyAvail = 0;
        }
        App.lblLotQtyAvail.setText("Lot " + row.data.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((row.data.UnitMultDiv == "M" ? (qtyAvail / row.data.CnvFact) : (qtyAvail * row.data.CnvFact)), 2)) + " - " + row.data.UnitDesc);
    }

};

var askClose = function (item) {
    if (item == "no" || item == "ok") {
        HQ.common.close(this);
    }
};

var askNew = function (item) {
    if (item == "yes" || item == "ok") {
        defaultOnNew();
    }
};

var confirmSaveData = function (item) {
    if (item == "yes" || item == "ok") {
        if (App.cboOrderType.getValue() == "IN" && App.txtSalesMark.getValue() != App.txtPromoMark.getValue()) {
            HQ.message.show(2016101501, '', 'isSaveData', true);
        }
        else {
            saveData();
        }
    }
};

var isSaveData = function (item) {
    if (item == "yes" || item == "ok") {
        saveData();
    }
};

var setChange = function (isChange) {
    HQ.isChange = isChange;
    if (isChange) {
        if (!Ext.isEmpty(App.cboOrderNbr.getValue())) {
            App.cboOrderType.setReadOnly(true);
            App.cboOrderNbr.setReadOnly(true);
        }

    } else {
        App.grdOrdDet.isChange = false;
        App.cboOrderType.setReadOnly(false);
        App.cboOrderNbr.setReadOnly(false);
    }
    HQ.common.changeData(isChange, 'OM10100');
};

var renderBOType = function (value) {
    var r = HQ.store.findInStore(App.stoBOType, ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return "";
    }
    return r.Descr;
};

var renderDiscType = function (value) {
    var r = HQ.store.findInStore(App.cboDiscType.getStore(), ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return value;
    }
    return r.Descr;
};

var renderCodeProgram = function (value) {
    var r = HQ.store.findInStore(App.stoCodeProgram, ['Code'], [value]);
    if (Ext.isEmpty(r)) {
        return value;
    }
    return r.Descr;
};

var renderRowNumber = function (value, meta, record) {
    return App.stoLotTrans.data.indexOf(record) + 1;
};

var clearBKPopupData = function () {
    App.cboBKOrderType.setValue('');
    App.cboBKOrderNbr.setValue('');
    App.cboBKReasonCode.setValue('');
    App.cboBKOrderNbr.getStore().clearData();
    App.txtDocBal.setValue(0);
    _ordNbr = '';
    _selOrderType = '';
};
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

var btnShowGift_Click = function () {

    App.winDetail.show();
    App.grdDetail.view.refresh();
};

var btnShowReward_Click = function () {
    if (App.cboOrderType.getValue() == 'IN') {
        App.winRewardAmt.show();
        if (App.cboOrderNbr.getValue()) {
            _displayIDs = '';
            var record = HQ.store.findRecord(App.cboOrderNbr.store, ['OrderNbr'], [App.cboOrderNbr.getValue()]);
            if (record) {
                _displayIDs = record.data.RewardID;
            }
        }
        App.stoRewardAmt.reload();
    }
    
};

function btnManualPromo_Click() {
    _totalAmt = App.txtTxblAmt.getValue() + App.txtCuryTaxAmt.getValue();
    var reload = true;

    var lst = App.stoManualPromo.snapshot || App.stoManualPromo.allData || App.stoManualPromo.data;
    if (lst != undefined) {
        for (var i = 0; i < lst.length; i++) {
            if (lst.items[i].data.Selected) {
                reload = false;
                break;
            }
        }
    }

    if (reload) {
        App.stoManualPromo.reload();
    }
    
    App.winManualPromo.show();
}

var PopupwinDetail = {

    btnDelete_Click: function () {
        if (Ext.isEmpty(App.cboStatus.getValue()) || App.cboStatus.getValue() != 'N') return;
        if (HQ.isDelete && App.smlDetail.selected.items.length > 0 && App.smlDetail.selected.items[0].data.Edit == true) {
            App.grdDetail.deleteSelected();
        }
    },
    btnAddnew_Click: function () {
        if (Ext.isEmpty(App.cboStatus.getValue()) || App.cboStatus.getValue() != 'N') return;
        if (HQ.isInsert) {
            var flat = true;
            App.stoEditDetail.each(function (item) {
                if (item.data.Descr == '') {
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
        App.winDetail.hide();
    },

    renderRowNumberDetail: function (value, meta, record) {
        return App.stoEditDetail.data.indexOf(record) + 1;
    }
    , grdDetail_beforeEdit: function (editor, e) {
        if (Ext.isEmpty(App.cboStatus.getValue()) || App.cboStatus.getValue() != 'N') return false;
        if ((e.field == "DiscType" || e.field == "Code") && e.record.data.Edit == false) {
            return false;
        }
    }
    , grdDetail_validateEdit: function (editor, e) {
        if (e.field == "Qty") {
            e.record.set("Qty", e.value);
        }
        if (e.field == "Descr") {
            e.record.set("Descr", e.value);
        }
        if (e.field == "DiscType") {
            if (e.record.data.DiscType != e.value) {
                e.record.set("Code", '');
                var flat = true;
                App.stoEditDetail.each(function (item) {
                    if (item.data.DiscType == e.value && item.data.Code == e.record.data.Code) {
                        flat = false;
                        return false;
                    }
                });
                if (flat) e.record.set("DiscType", e.value);
                else return false;
            }
        }
        if (e.field == "Code") {
            if (e.record.data.Code != e.value) {
                var flat = true;
                App.stoEditDetail.each(function (item) {
                    if (item.data.Code == e.value && item.data.DiscType == e.record.data.DiscType) {
                        flat = false;
                        return false;
                    }
                });
                if (flat) e.record.set("Code", e.value);
                else return false;
            }
            e.record.set("Code", e.value);
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

};

var PopupwinReward = {

    stoRewardAmt_Load: function () {
        App.grdOrdDet.view.loadMask.hide();
        App.grdOrdDet.view.loadMask.setDisabled(false);
        //var record = HQ.store.findRecord(App.cboOrderNbr.store, ['OrderNbr'], [App.cboOrderNbr.getValue()]);
        //if (record) {
        //    record.set('RewardID', rewardID);
        //}
    }
    ,btnRewardOK_Click: function () {
        _displayIDs = '';
        var rewardAmt = 0.0;
        App.stoRewardAmt.suspendEvents();
        for (var i = 0; i < App.stoRewardAmt.data.length; i++) {
            if (App.stoRewardAmt.data.items[i].data.Selected == true) {
                _displayIDs += App.stoRewardAmt.data.items[i].data.DisplayID + ',';
                rewardAmt += App.stoRewardAmt.data.items[i].data.RewardAmt;
            }
        }
        App.stoRewardAmt.resumeEvents();
        App.winRewardAmt.hide();
        var record = HQ.store.findRecord(App.cboOrderNbr.store, ['OrderNbr'], [App.cboOrderNbr.getValue()]);
        if (record) {
            record.set('RewardID', _displayIDs);
        }
        App.txtRewardAmt.setValue(rewardAmt);
        // Tinh lai tien
    },
    grdRewardAmt_beforeEdit : function(sender, e){
        if (App.cboStatus.getValue() != 'N') {
            return false;
        }
    }
};

var PopupwinManualPromo = {
    btnManualOk_Click: function () {
        App.grdOrdDet.view.loadMask.enable();
        if (App.cboStatus.getValue() == "N") {
            var lstManual = App.grdManualPromo.store.snapshot || App.grdManualPromo.store.allData || App.grdManualPromo.data;
            var totalAmtManual = 0;
            if (lstManual != undefined) {
                for (var i = 0; i < lstManual.length; i++) {
                    if (lstManual.items[i].data.Selected == true) {
                        if (lstManual.items[i].data.PromoType == "A" || lstManual.items[i].data.PromoType == "P") {
                            totalAmtManual += lstManual.items[i].data.TotalDiscout;
                        }
                        else if (lstManual.items[i].data.PromoType == "I") {
                            var existRecord = HQ.store.findInStore(App.stoOrdDet, ['InvtID', 'DiscCode'], [lstManual.items[i].data.FreeItemID, lstManual.items[i].data.DiscCode]);
                            if (existRecord == undefined) {

                                var existRecordEmpty = HQ.store.findRecord(App.stoOrdDet, ["InvtID"], [""]);
                                if (existRecordEmpty != undefined) {
                                    App.stoOrdDet.remove(existRecordEmpty);
                                }
                                var invtManual = HQ.store.findInStore(App.stoInvt, ['InvtID'], [lstManual.items[i].data.FreeItemID]);
                                var newDet = Ext.create('App.mdlOrdDet');
                                newDet.data.BranchID = App.txtBranchID.getValue();
                                newDet.data.BOType = 'S';
                                newDet.data.LineRef = lastLineRef();
                                newDet.data.DiscCode = lstManual.items[i].data.DiscCode;
                                newDet.data.InvtID = lstManual.items[i].data.FreeItemID;
                                newDet.data.LineQty = lstManual.items[i].data.FreeItemQty;
                                newDet.data.OrderType = "IN";
                                newDet.data.OrigOrderNbr = "";
                                newDet.data.SiteID = lstManual.items[i].data.SiteType;

                                newDet.data.SlsUnit = lstManual.items[i].data.UnitDescr;

                                var cnvFact = 0;
                                var unitMultDiv = "";
                                var cnv = setUOM(invtManual.InvtID, invtManual.ClassID, invtManual.StkUnit, lstManual.items[i].data.UnitDescr);

                                if (!Ext.isEmpty(cnv)) {
                                    cnvFact = cnv.CnvFact;
                                    unitMultDiv = cnv.MultDiv;
                                    newDet.data.UnitRate = cnvFact;
                                    newDet.data.UnitMultDiv = unitMultDiv;

                                    newDet.data.Descr = invtManual.Descr;
                                    newDet.data.TaxCat = invtManual.TaxCat;
                                    newDet.data.ItemPriceClass = invtManual.PriceClassID;
                                }
                                else {
                                    newDet.data.UnitMultDiv = '';
                                    newDet.data.UnitPrice = 0;
                                    newDet.data.SlsUnit = '';
                                    newDet.data.InvtID = '';
                                    newDet.data.BarCode = '';
                                }


                                var price = 0;
                                var price1 = HQ.store.findInStore(App.stoPrice, ['InvtID', 'Unit'], [lstManual.items[i].data.FreeItemID, lstManual.items[i].data.UnitDescr]);
                                if (HQ.objOM.DfltSalesPrice == "I") {
                                    price = unitMultDiv == "M" ? invtManual.SOPrice * cnvFact : invtManual.SOPrice / cnvFact;
                                    newDet.data.SlsPrice = price;
                                }
                                else {

                                    if (!Ext.isEmpty(price1)) newDet.data.SlsPrice = price1.Price;
                                    else newDet.data.SlsPrice = 0;
                                }

                                newDet.data.TaxID = "*";
                                newDet.data.FreeItem = true;

                                HQ.store.insertRecord(App.stoOrdDet, "InvtID", newDet, true);
                                //App.stoOrdDet.data.add(newDet);

                                var newRow = Ext.create('App.mdlOrdDet');
                                newRow.data.BOType = 'S';
                                HQ.store.insertRecord(App.stoOrdDet, "InvtID", newRow, true);

                                App.stoOrdDet.commitChanges();
                                App.grdOrdDet.view.refresh();

                                for (j = 0;j < App.stoOrdDet.data.length;j++) {
                                    calcTax(App.stoOrdDet.data.items[j]);
                                }
                                calcTaxTotal();
                                calcDet();
                            }
                            else {
                                existRecord.LineQty= lstManual.items[i].data.FreeItemQty;
                                calcTaxTotal();
                                calcDet();
                                App.stoOrdDet.commitChanges();
                                App.grdOrdDet.view.refresh();
                            }
                        }
                    }
                }
            }
            
            App.txtOrdDiscAmt.setValue(totalAmtManual);
        }        
        App.winManualPromo.hide();
    },

    stoManualPromo_Load: function (sto) {

    },

    grdManualPromo_BeforeEdit: function(editor, e){
        if (App.cboStatus.getValue() != "N") {
            return false;
        }

        if (e.field == "Selected" && e.record.data.PromoType == "I") {
            var existRecord = HQ.store.findInStore(App.stoOrdDet, ['InvtID', 'DiscCode'], [e.record.data.FreeItemID, e.record.data.DiscCode]);
            if (existRecord != undefined) {
                HQ.message.show(2020011060);
                return false;
            }

         
            
            if (e.record.data.QtyAvail > 0) {
                var cnvFact = 0;
                var cnvMultDiv = "";
                var cnv = setUOM(e.record.data.FreeItemID, e.record.data.ClassID, e.record.data.StkUnit, e.record.data.UnitDescr);
                if (!Ext.isEmpty(cnv)) {
                    cnvFact = cnv.CnvFact == 0 ? 1 : cnv.CnvFact;
                    cnvMultDiv = cnv.MultDiv;
                } else {
                    return false;
                }
                var qtyAvail = cnvMultDiv == "M" ? e.record.data.QtyAvail / cnvFact : e.record.data.QtyAvail * cnvFact;
                if (qtyAvail < e.record.data.FreeItemQty) {
                    HQ.message.show(2020021060, [e.record.data.FreeItemID, e.record.data.SiteType, parseInt(qtyAvail), e.record.data.UnitDescr], '', true);
                    return false;
                }                
            }
            else {
                HQ.message.show(2020021060, [e.record.data.FreeItemID, e.record.data.SiteType, 0, e.record.data.UnitDescr], '', true);
                return false;
            }
            
        }
        if(e.field == 'FreeItemQty' && e.record.data.PromoType != "I" )
        {
            return false;
        }
    },
    grdManualPromo_Edit: function (editor, e) {
        if (e.record.data.Selected == true) {
            if (e.record.data.LineRef == "") {
                e.record.set("LineRef", lastLineRefManual());
            }            
            if (e.record.data.PromoType == "P") {
                var total = 0;
                var lstDet = App.grdOrdDet.store.snapshot || App.grdOrdDet.store.allData || App.grdOrdDet.data;
                if (lstDet != "") {
                    for (var i = 0; i < lstDet.length; i++) {
                        if (lstDet.items[i].data.FreeItem == false) {
                            total += lstDet.items[i].data.SlsPrice * lstDet.items[i].data.LineQty;
                        }
                    }
                }
                e.record.set("TotalDiscout", Math.round((e.record.data.Discount * total)/100));
            }
            else if (e.record.data.PromoType == "A") {
                e.record.set("TotalDiscout", e.record.data.Discount);
            }
        }
        else {
            e.record.set("TotalDiscout", 0);            
        }
    },
}

var toDate = function (dateString) {

    var parts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}).(\d{3})/);

    return new Date(parts[1],
                    parts[2] - 1,
                    parts[3],
                    parts[4],
                    parts[5],
                    parts[6],
                    parts[7]);
}

var setReadOnly = function () {
    
    if (App.cboStatus.getValue() == "N") {
        App.chkDoNotCalDisc.setReadOnly(_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder || (!Ext.isEmpty(App.cboOrderNbr.getValue()) && App.cboStatus.getValue() != "N"));

        if (_selOrderType == _INOrder && App.cboOrderType.getValue() == _ReturnOrder) {
            App.chkDoNotCalDisc.setValue(true);
        }
    }
}

var winChoice_Close = function () {
    clearChoice();
};

var clearChoice = function () {
    // clear choice & popup
    App.stoChoice.clearFilter();
    App.stoChoice.clearData();
    App.stoChoiceHeader.clearFilter();
    App.stoChoiceHeader.clearData();
}

var btnPopupOk_Click = function () {
    if (!Ext.isEmpty(App.cboPopupCpny.getValue())) {
        App.winPopup.hide();
        window.location.href = 'OM10100?branchID=' + App.cboPopupCpny.getValue();
    } else {
        HQ.message.show(1000, [HQ.common.getLang('branchid')], '', true);
    }
};

var checkSpecialChar = function (value) {
    var regex = /^(\w*(\d|[a-zA-Z]|[\_\(\)\-\.]))*$/;
    if (!HQ.util.passNull(value.toString()).match(regex))
        return false;
    return true;
}
var txtInvcNbr_Blur = function(){
    if (checkSpecialChar(App.txtInvcNbr.getValue()) == false) {
        HQ.message.show(20140811, App.txtInvcNbr.fieldLabel);
        App.txtInvcNbr.focus();
        App.txtInvcNbr.setValue('');
        return false;
    }
}
var txtInvcNote_Blur = function () {
    if (checkSpecialChar(App.txtInvcNote.getValue()) == false) {
        HQ.message.show(20140811, App.txtInvcNote.fieldLabel);
        App.txtInvcNote.focus();
        App.txtInvcNote.setValue('');
        return false;
    }
}
