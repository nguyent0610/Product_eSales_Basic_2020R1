//Declare
var keys = ['InvtID'];
var fieldsCheckRequirePO_Price = ["InvtID", "UOM"];
var fieldsLangCheckRequirePO_Price = ["InvtID", "UOM"];

var keys1 = ['CpnyID'];
var fieldsCheckRequirePO_PriceCpny = ["CpnyID"];
var fieldsLangCheckRequirePO_PriceCpny = ["CpnyID"];

var _focusNo = 0;
HQ.copy = false;
var _invtID = '';
var listImport;
var _msgImport;
var _dataImport;
var count = 0;
//////////////////////////////////////////////////////////////////////

///////////// Event /////////////

document.onkeydown = function (e) {
    e = e || window.event;//Get event
    if (e.ctrlKey) {
        var c = e.which || e.keyCode;//Get key code
        switch (c) {
            case 83://Block Ctrl+S
                e.preventDefault();
                e.stopPropagation();
                menuClick("save");
                break;
        }
    }
    else {
        var c = e.which || e.keyCode;
        switch (c) {
            case 46://Block Ctrl+S
                e.preventDefault();
                e.stopPropagation();
                menuClick("delete");
                break;
        }
    }
};

////////////////////////////////

var loadSourceCombo = function () {
    HQ.common.showBusy(true, HQ.common.getLang("loadingData"));
    App.cboPriceID.getStore().load(function () {
        App.stoPOPriceHeader.reload();
        //HQ.common.showBusy(false, HQ.common.getLang("loadingData"));
    });
};
var loadComboGrid = function () {
    HQ.common.showBusy(true, HQ.common.getLang("loadingData"));
    App.cboInvtID.getStore().load(function () {
        App.cboCpnyID.getStore().load(function () {
            App.stoPO_Price.reload();
            App.stoPO_PriceCpny.reload();
            HQ.common.showBusy(false, HQ.common.getLang("loadingData"));
        })
    });
};

var pnl_render = function (cmd) {
    cmd.getEl().on('mousedown', function () {
        if (cmd.id == 'pnlPO_Price') {
            _focusNo = 1;
        }
        else if (cmd.id == 'pnlPO_PriceCpny') {
            _focusNo = 2;
        }
        else {//pnlHeader
            _focusNo = 0;
        }
    });
};

var menuClick = function (command) {
    switch (command) {
        case "first":
            if (_focusNo == 0) {
                HQ.combo.first(App.cboPriceID, HQ.isChange);
                App.stoPOPriceHeader.reload();
            }
            else if (_focusNo == 1) {
                HQ.grid.first(App.grdPO_Price);
            }
            if (_focusNo == 2) {
                HQ.grid.first(App.grdPO_PriceCpny);
            }
            //if (_focusNo == 0) {
            //    HQ.grid.first(App.grdPO_PriceCpny);
            //}
            break;
        case "prev":
            if (_focusNo == 0) {
                HQ.combo.prev(App.cboPriceID, HQ.isChange);
                App.stoPOPriceHeader.reload();
            }
            else if (_focusNo == 1) {
                HQ.grid.prev(App.grdPO_Price);
            }
            else if (_focusNo == 2) {
                HQ.grid.prev(App.grdPO_PriceCpny);
            }
            break;
        case "next":
            if (_focusNo == 0) {
                HQ.combo.next(App.cboPriceID, HQ.isChange);
                App.stoPOPriceHeader.reload();
            }
            else if (_focusNo == 1) {
                HQ.grid.next(App.grdPO_Price);
            }
            else if (_focusNo == 2) {
                HQ.grid.next(App.grdPO_PriceCpny);
            }
            break;
        case "last":
            if (_focusNo == 0) {
                HQ.combo.last(App.cboPriceID, HQ.isChange);
                App.stoPOPriceHeader.reload();
            }
            else if (_focusNo == 1) {
                HQ.grid.last(App.grdPO_Price);
            }
            else if (_focusNo == 2) {
                HQ.grid.last(App.grdPO_PriceCpny);
            }
            break;
        case "refresh":
           
            if (HQ.isChange) {
                HQ.message.show(20150303, '', 'refresh');
                
            }
            else {
                HQ.isChange = false;
                HQ.isFirstLoad = true;
                App.stoPOPriceHeader.reload();
                
            }
            break;
        case "new":
            if (_focusNo == 0) {
                if (HQ.isChange) {
                    HQ.message.show(150, '', 'refresh');
                } else {
                    PriceID = '';
                    App.cboPriceID.setValue('');
                    HQ.copy = false;
                    HQ.isFirstLoad = true;
                    App.stoPOPriceHeader.reload();
                }
                //App.cboPriceID.setValue("");
                //App.EffDate.setValue(new Date());
                //App.stoPO_Price.reload();
                //App.stoPO_PriceCpny.reload();
            }
            else if (_focusNo == 1) {
                if (HQ.isInsert) {
                    //var record = HQ.store.findRecord(App.grdPO_Price.store, ["InvtID"], [""]);
                    //if (record == undefined) {
                    //    HQ.store.insertBlank(App.grdPO_Price.store, ["InvtID"]);
                    //}
                    
                    HQ.grid.insert(App.grdPO_Price,["InvtID"]);
                }
            }
            else if (_focusNo == 2) {
                if (HQ.isInsert) {
                    HQ.grid.insert(App.grdPO_PriceCpny, ["CpnyID"]);
                }
            }

            break;
        case "delete":
            if (App.cboStatus.getValue() == "C") return false;
            if (_focusNo == 0) {
                if (App.cboPriceID.value) {
                    if (HQ.isDelete) {
                        HQ.message.show(11, '', 'deleteData');
                    }
                } else {
                    menuClick('new');
                }
            }
            else if (_focusNo == 1) {
                if (App.slmPO_Price.selected.items[0] != undefined) {
                    if (HQ.isDelete) {
                        if (App.slmPO_Price.selected.items[0] != undefined) {
                            if (App.slmPO_Price.selected.items[0].data.InvtID != "") {
                                HQ.message.show(2015020806, [HQ.grid.indexSelect(App.grdPO_Price)], 'deleteData', true);
                            }
                        }
                    }
                }
            }
            else if (_focusNo == 2) {
                //if (App.slmPO_PriceCpny.selected.items[0] != undefined) {
                //    if (HQ.isDelete) {
                //        HQ.message.show(11, '', 'deleteData');
                //    }
                //}
                if (App.slmPO_PriceCpny.selected.items[0] != undefined) {
                    if (HQ.isDelete) {
                        if (App.slmPO_PriceCpny.selected.items[0] != undefined) {
                            if (App.slmPO_PriceCpny.selected.items[0].data.CpnyID != "") {
                                HQ.message.show(2015020806, [HQ.grid.indexSelect(App.grdPO_PriceCpny)], 'deleteData', true);
                            }
                        }
                    }
                }
            }


            break;
        case "save":
            if (HQ.isUpdate || HQ.isInsert || HQ.isDelete) {
                if (HQ.form.checkRequirePass(App.frmMain) && HQ.store.checkRequirePass(App.stoPO_Price, keys, fieldsCheckRequirePO_Price, fieldsLangCheckRequirePO_Price)
                        && HQ.store.checkRequirePass(App.stoPO_PriceCpny, keys1, fieldsCheckRequirePO_PriceCpny, fieldsLangCheckRequirePO_PriceCpny)) {
                    save();
                }
            }
            break;
        case "print":
            break;
        case "close":
            HQ.common.close(this);
            break;
    }

};

var cboInvtID_Change = function (item, newValue, oldValue) {
    _invtID = newValue;
};

function btnFill_Click() {
    App.stoPO_Price.snapshot.each(function (item, index, totalItems) {
        item.set('Disc', App.txtFill.getValue());
    });
};

var chkPublic_Change = function (checkbox, checked) {
    if (checked || HQ.hideChkPublic) {
        App.tabBot.closeTab(App.pnlPO_PriceCpny);
       
    }
    else {
        App.tabBot.addTab(App.pnlPO_PriceCpny);
    }
};

var cboPriceID_Change = function (sender, value) {
    if (!HQ.copy) {
        HQ.isFirstLoad = true;
        if (sender.valueModels != null) {
            App.stoPOPriceHeader.reload();
        }
    }    
};

//khi nhan combo xo ra, neu da thay doi thi ko xo ra
var cboPriceID_Expand = function (sender, value) {
    App.cboPriceID.store.clearFilter();
    if (HQ.isChange) {
        App.cboPriceID.collapse();
    }
};


var cboPriceID_Blur = function (sender, value) {
    //if (HQ.copy) {
        var recod = HQ.store.findRecord(App.cboPriceID.store, ['PriceID'], [App.cboPriceID.getValue()]);
        if (recod != undefined) {
            //HQ.message.show(2018041213, App.cboPriceID.getValue(), '');
            //App.cboPriceID.setValue("");
            App.stoPOPriceHeader.reload();
        }
   // }
};

//khi nhan X xoa tren combo, neu du lieu thay doi thi ko cho xoa, du lieu chua thay doi thi add new
var cboPriceID_TriggerClick = function (sender, value) {
    if (HQ.isChange) {
        HQ.message.show(150, '', '');
    }
    else {
        menuClick('new');
    }
};

function cboPriceID_Select() {
    App.stoPOPriceHeader.reload();
}
function cboPriceID_Focus() {

    App.cboPriceID.store.clearFilter();
    HQ.combo.expand(this, ',');

    if (HQ.isNew) {
        App.cboPriceID.forceSelection = false;
    }
    else {
        App.cboPriceID.forceSelection = true;
    }

    App.cboPriceID.isValid();
}


var firstLoad = function () {
    HQ.isFirstLoad = true;
    HQ.util.checkAccessRight(); // kiểm tra các quyền update,insert,del
    
    if (HQ.hideChkPublic) {
        App.Public.setValue(true);
        App.Public.setVisible(false);
        App.tabBot.closeTab(App.pnlPO_PriceCpny);
     //   App.tabBot.child('#pnlPO_PriceCpny').tab.hide();
    }
    App.cboStatus.store.reload();
    HQ.common.showBusy(true, HQ.common.getLang("loadingData"));
    loadSourceCombo();
    App.colPrice.format = HQ.DecimalPrecision;
    App.colNbrPrice.decimalPrecision = HQ.DecimalInput;
};

var frmChange = function () {//stoPO_Price
    if (App.stoPOPriceHeader.getCount() > 0) {
        App.frmMain.getForm().updateRecord();
        HQ.isChange = (HQ.store.isChange(App.stoPOPriceHeader) == false ? HQ.store.isChange(App.stoPO_Price) : true) || (HQ.store.isChange(App.stoPOPriceHeader) == false ? HQ.store.isChange(App.stoPO_PriceCpny) : true);
        HQ.common.changeData(HQ.isChange, 'PO20100');
        if (App.cboPriceID.valueModels == null || HQ.isNew == true)
            App.cboPriceID.setReadOnly(false);
        else App.cboPriceID.setReadOnly(HQ.isChange);
    }
    if (HQ.copy) {
        App.cboPriceID.setReadOnly(false);
        
    }
};

var stoBeforeLoad = function (sto) {
    HQ.common.showBusy(true, HQ.common.getLang('loadingdata'));
};

var stoLoad = function (sto) {
    HQ.isFirstLoad = true;
    HQ.isNew = false;
    HQ.common.showBusy(false);
    App.cboPriceID.forceSelection = true;
    App.cboPriceID.store.clearFilter();
    if (sto.data.length == 0) {
        HQ.store.insertBlank(sto, "PriceID");
        record = sto.getAt(0);
        record.data.Public = HQ.hideChkPublic;
        record.data.StatusApprove = 'H';
        HQ.isNew = true;//record la new    
        App.cboPriceID.forceSelection = false;
        HQ.common.setRequire(App.frmMain);  //to do cac o la require            
        App.cboPriceID.focus(true);//focus ma khi tao moi
        sto.commitChanges();
    }
    var record = sto.getAt(0);
    App.frmMain.getForm().loadRecord(record);
    if (!HQ.isNew) {
        if (!HQ.isUpdate) {
            HQ.common.lockItem(App.frmMain, true);
        }
        else{
            //HQ.isFirstLoad = false;
            HQ.common.lockItem(App.frmMain, false);
        }
        }
    
    else {
        if (!HQ.isInsert) {
            HQ.common.lockItem(App.frmMain, true);
        }
        else {
            HQ.common.lockItem(App.frmMain, false);

        }
    }
    if (record.data.StatusApprove == "C") {
        HQ.common.lockItem(App.frmMain, true);
        App.cboPriceID.setReadOnly(false);
        App.cboPriceIDCopy.setReadOnly(false);
        App.btnCopy.setDisabled(false);
    }
    else {
        HQ.common.lockItem(App.frmMain, false);
    }
   loadComboGrid();
};

// =====================Grd PO_Price =======================//
var stoPO_Price_Load = function (sto) {
    if (App.cboStatus.getValue() != "C") {
        if (HQ.isInsert) {
            var record = HQ.store.findRecord(sto, keys, ['']);
            if (!record) {
                HQ.store.insertBlank(sto, keys);
            }
        }
    }
    disableCopy();
    frmChange();
    HQ.common.showBusy(false);
};

var grdPO_Price_BeforeEdit = function (editor, e) {
    if (App.cboStatus.getValue() == "C") return false;
    if (!Ext.isEmpty(App.stoPOPriceHeader.data.items[0].data.PriceID))
    {
        if (!HQ.isUpdate)
        {
            return false;
        } else if (e.field == 'UOM' && e.record.data.tstamp != '') {
            return false;
        }
    }
    if (e.field == 'UOM') {
        objInvtID = HQ.store.findRecord(App.cboInvtID.getStore(), ["InvtID"], [e.record.data.InvtID]);
        if (objInvtID) {
            _invtID = e.record.data.InvtID;
            _classID = e.record.data.ClassID;
            App.cboUOM.store.reload();
        }
    }
    if(Ext.isEmpty(App.cboPriceID.getValue())){
        HQ.message.show(2018041913, [HQ.common.getLang('PriceID')], '', true);
        return false;
    }
    if (!HQ.grid.checkBeforeEdit(e, keys)) return false;
};

var grdPO_Price_Edit = function (item, e) {
    //Kiem tra cac key da duoc nhap se insert them dong moi
    HQ.grid.checkInsertKey(App.grdPO_Price, e, keys);
    if (e.field == 'InvtID') {
        if (!Ext.isEmpty(e.value)) {
            e.record.set('QtyBreak', '1')
        }
    }
   

    if (e.field == 'InvtID') {
        objInvtID = HQ.store.findRecord(App.cboInvtID.getStore(), ["InvtID"], [e.record.data.InvtID]);
        if (objInvtID) {
            _invtID = e.record.data.InvtID;
            _classID = e.record.data.ClassID;
            App.cboUOM.store.reload();
        }
        setTimeout(function () {
            var selectedRecord = App.cboInvtID.store.findRecord(e.field, e.value);
            if (selectedRecord) {
                e.record.set("Descr", selectedRecord.data.Descr);
                if (App.cboUOM.store.data.length > 0) {
                    e.record.set("UOM", App.cboUOM.store.data.items[0].data.FromUnit);
                }
            }
            else {
                e.record.set("Descr", "");
                e.record.set("UOM", "");
            }
        },100);        
     
    }
    disableCopy();
    frmChange();
};

var grdPO_Price_ValidateEdit = function (item, e) {
    //ko cho nhap key co ki tu dac biet, va kiem tra trung du lieu
    return HQ.grid.checkValidateEditDG(App.grdPO_Price, e, keys);
};

var grdPO_Price_Reject = function (record) {
    //reject dong thay doi du lieu ve ban dau
    HQ.grid.checkReject(record, App.grdPO_Price);
    App.grdPO_Price.view.refresh();
    frmChange();
};

// =====================Grd PO_PriceCpny =======================//
var stoPO_PriceCpny_Load = function (sto) {
   // if (HQ.isFirstLoad) {
        if (HQ.isInsert) {
            var record = HQ.store.findRecord(sto, keys1, ['']);
            if (!record) {
                // HQ.common.lockItem(App.frmMain, true);
                HQ.store.insertBlank(sto, keys1);
            }
        }
      //  HQ.isFirstLoad = false;
   // }
    frmChange();
    HQ.common.showBusy(false);
};

var grdPO_PriceCpny_BeforeEdit = function (editor, e) {
    if (App.cboStatus.getValue() == "C") return false;
    //Kiem tra cac key da duoc nhap se insert them dong moi
    //HQ.grid.checkInsertKey(App.grdPO_PriceCpny, e, keys1);
    return HQ.grid.checkBeforeEdit(e, keys1);
};

var grdPO_PriceCpny_Edit = function (item, e) {
    //Kiem tra cac key da duoc nhap se insert them dong moi
    HQ.grid.checkInsertKey(App.grdPO_PriceCpny, e, keys1);

    if (e.field == 'CpnyID') {
        var selectedRecord = App.cboCpnyID.store.findRecord("BranchID", e.value);
        if (selectedRecord) {
            e.record.set("CpnyName", selectedRecord.data.BranchName);
            e.record.set("CpnyType", selectedRecord.data.CpnyType);
        }
        else {
            e.record.set("CpnyName", "");
            e.record.set("CpnyType", "");
        }
    }
    frmChange();

};

var grdPO_PriceCpny_ValidateEdit = function (item, e) {
    //ko cho nhap key co ki tu dac biet, va kiem tra trung du lieu
    return HQ.grid.checkValidateEditDG(App.grdPO_PriceCpny, e, keys1);
};

var grdPO_PriceCpny_Reject = function (record) {
    //reject dong thay doi du lieu ve ban dau
    HQ.grid.checkReject(record, App.grdPO_PriceCpny);
    frmChange();
};

var save = function () {
    if (App.frmMain.isValid()) {
        App.frmMain.updateRecord();
        var regex = /^(\w*(\d|([a-zA-Z])|-|\_))*$/;
        var value = App.cboPriceID.getValue();
        if (!HQ.util.passNull(value.toString()).match(regex)) {
            HQ.message.show(20140811, App.cboPriceID.fieldLabel, '');
            return;
        }
        if (App.Public.getValue()) {
            var savePrice = false;
            var lstPrice = App.stoPO_Price.snapshot || App.stoPO_Price.allData || App.stoPO_Price.data;
            if (lstPrice != undefined) {
                for (var i = 0; i < lstPrice.length;i++){
                    if (lstPrice.items[i].data.InvtID != "") {
                        savePrice = true;
                        break;
                    }
                    
                }
            }

            if (!savePrice) {
                HQ.message.show(1000, App.InvtID.text, '');
                App.tabBot.setActiveTab(App.pnlPO_Price);
                return;
            }
        }
        if (!App.Public.getValue()) {

            var saveCpny = false;
            var lstCpny = App.stoPO_PriceCpny.snapshot || App.stoPO_PriceCpny.allData || App.stoPO_PriceCpny.data;
            if (lstCpny != undefined) {
                for (var i = 0; i < lstCpny.length; i++) {
                    if (lstCpny.items[i].data.CpnyID != "") {
                        saveCpny = true;
                        break;
                    }

                }
            }

            if (!saveCpny) {
                HQ.message.show(1000, App.txtCpny.text, '');
                App.tabBot.setActiveTab(App.pnlPO_PriceCpny);
                return;
            }
            var savePrice = false;
            var lstPrice = App.stoPO_Price.snapshot || App.stoPO_Price.allData || App.stoPO_Price.data;
            if (lstPrice != undefined) {
                for (var i = 0; i < lstPrice.length; i++) {
                    if (lstPrice.items[i].data.InvtID != "") {
                        savePrice = true;
                        break;
                    }

                }
            }
            if (!savePrice) {
                HQ.message.show(1000, App.InvtID.text, '');
                App.tabBot.setActiveTab(App.pnlPO_Price);
                return;
            }
        }
        if (HQ.noPriceCalculation) {
            var lstData = App.grdPO_Price.store.snapshot;
            if (lstData != undefined) {
                var erroDisc = "";
                for (var i = 0; i < lstData.length; i++) {
                    if (lstData.items[i].data.Disc < 0) {
                        erroDisc = erroDisc + (i + 1) + ",";
                    }
                }
                if (erroDisc != "") {
                    HQ.message.show(2018041212, [HQ.common.getLang('Disc'), erroDisc], '', true);
                    return;
                }
            }
        }        

        var lstData = App.grdPO_Price.store.snapshot;
        if (lstData != undefined) {
            var erroDisc = "";
            for (var i = 0; i < lstData.length; i++) {
                if (lstData.items[i].data.Price <= 0 && lstData.items[i].data.InvtID != "") {
                    erroDisc = erroDisc + (i + 1) + ",";
                }
            }
            if (erroDisc != "") {
                HQ.message.show(2018041212, [HQ.common.getLang('Price'), erroDisc], '', true);
                return;
            }
        }


        App.frmMain.submit({
            waitMsg: HQ.common.getLang("WaitMsg"),
            url: 'PO20100/Save',
            timeout: 1800000,
            params: {
                lstPOPriceHeader: Ext.encode([App.frmMain.getRecord().data]),
                //lstPOPriceHeader: HQ.store.getData(App.frmMain.getRecord().store),
                lstPO_Price: HQ.store.getData(App.stoPO_Price),
                lstPO_PriceCpny: HQ.store.getData(App.stoPO_PriceCpny),
                lstPO_PriceCopy: Ext.encode(App.stoPO_Price.getRecordsValues()),
                lstPO_PriceCpnyCopy: Ext.encode(App.stoPO_PriceCpny.getRecordsValues()),
                copy:HQ.copy
            },
            success: function (msg, data) {
                HQ.message.show(201405071);
                App.cboPriceID.store.load({
                    callback: function () {
                        if (data.result.priceID != undefined) {
                            App.cboPriceID.setValue(data.result.priceID);
                        }                        
                    }
                });

                
                HQ.copy = false;
                HQ.isChange = false;
                HQ.isFirstLoad = true;
                App.stoPOPriceHeader.reload();
                App.cboHandle.setValue("");
            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
            }
        });
    }
};

var deleteData = function (item) {
    if (item == "yes") {
        if (_focusNo == 0) {
            if (App.frmMain.isValid()) {
                App.frmMain.updateRecord();
                App.frmMain.submit({
                    waitMsg: HQ.common.getLang("DeletingData"),
                    url: 'PO20100/DeleteAll',
                    timeout: 1800000,
                    success: function (msg, data) {
                        App.cboPriceID.getStore().load();
                        App.cboPriceIDCopy.store.reload();
                        HQ.copy = false;
                        refresh("yes");
                    },
                    failure: function (msg, data) {
                        HQ.message.process(msg, data, true);
                    }
                });
            }

        }
        else if (_focusNo == 1) {
            App.grdPO_Price.deleteSelected();
            frmChange();
        }
        else if (_focusNo == 2) {
            App.grdPO_PriceCpny.deleteSelected();
            frmChange();
        }
    }
};

function refresh(item) {
    if (item == 'yes') {
        HQ.isChange = false;
        menuClick("refresh");
        var record = HQ.store.findInStore(App.cboPriceID.store,["PriceID"],[App.cboPriceID.getValue()]);
        if(record== undefined){
            App.cboPriceID.setValue('');
        }
        HQ.copy = false;
    }
};

var treeBranch_AfterRender = function (id) {
    HQ.common.showBusy(true, HQ.waitMsg);
    App.direct.PO20100GetTreeBranch(id, {
        success: function (result) {
            App.treePanelBranch.getRootNode().expand();
            HQ.common.showBusy(false, HQ.waitMsg);
        }
    });
};
var btnExpand_click = function (btn, e, eOpts) {
    App.treePanelBranch.expandAll();
};
var btnCollapse_click = function (btn, e, eOpts) {
    App.treePanelBranch.collapseAll();
};


var btnAddAll_click = function (btn, e, eOpts) {
    if (HQ.isUpdate) {
        //if (checkEditData()) {
        var allNodes = getLeafNodes(App.treePanelBranch.getRootNode(), true);
        if (allNodes && allNodes.length > 0) {
            App.grdPO_PriceCpny.store.suspendEvents();
            allNodes.forEach(function (node) {
                HQ.store.insertBlank(App.stoPO_PriceCpny, keys1);
                if (node.data.Type == "Company") {
                    var record = HQ.store.findInStore(App.grdPO_PriceCpny.store,
                        ['CpnyID'],
                        [node.data.RecID]);
                    if (!record) {
                        record = App.stoPO_PriceCpny.getAt(App.grdPO_PriceCpny.store.getCount() - 1);
                        record.set('CpnyID', node.data.RecID);
                        record.set('CpnyType', node.data.CpnyType);
                    }
                }
            });
            HQ.store.insertBlank(App.stoPO_PriceCpny, keys1);
            var record = App.stoPO_PriceCpny.getAt(App.stoPO_PriceCpny.getCount() - 1);
            App.treePanelBranch.clearChecked();
            App.grdPO_PriceCpny.store.resumeEvents();
            App.grdPO_PriceCpny.view.refresh();
            App.grdPO_PriceCpny.store.loadPage(1);
        }
        // }
    }
    else {
        HQ.message.show(4, '', '');
    }
};

var btnAdd_click = function (btn, e, eOpts) {
    if (HQ.isUpdate) {
        // if (checkEditData()) {
        var allNodes = App.treePanelBranch.getCheckedNodes();
        if (allNodes && allNodes.length > 0) {
            App.grdPO_PriceCpny.store.suspendEvents();
            allNodes.forEach(function (node) {
                HQ.store.insertBlank(App.stoPO_PriceCpny, keys1);
                if (node.attributes.Type == "Company") {
                    var record = HQ.store.findInStore(App.grdPO_PriceCpny.store,
                        ['CpnyID'],
                        [node.attributes.RecID]);
                    if (!record) {
                        record = App.stoPO_PriceCpny.getAt(App.grdPO_PriceCpny.store.getCount() - 1);
                        record.set('CpnyID', node.attributes.RecID);
                        record.set('CpnyType', node.attributes.CpnyType);
                    }
                }
            });
            HQ.store.insertBlank(App.stoPO_PriceCpny, keys1);
            var record = App.stoPO_PriceCpny.getAt(App.stoPO_PriceCpny.getCount() - 1);
            App.grdPO_PriceCpny.store.resumeEvents();
            App.grdPO_PriceCpny.view.refresh();
            App.treePanelBranch.clearChecked();
        }
        frmChange();
        // }
    }
    else {
        HQ.message.show(4, '', '');
    }
};

var btnDel_click = function (btn, e, eOpts) {
    if (HQ.isUpdate) {
        var selRecs = App.grdPO_PriceCpny.selModel.selected.items;
        if (selRecs.length > 0) {
            var params = [];
            selRecs.forEach(function (record) {
                params.push(record.data.CpnyID);
            });
            HQ.message.show(2015020806,
                params.join(" & ") + "," + HQ.common.getLang("AppComp"),
                'deleteSelectedCompanies');
        }
    }
    else {
        HQ.message.show(4, '', '');
    }
};

var btnDelAll_click = function (btn, e, eOpts) {
    if (HQ.isUpdate) {
        HQ.message.show(11, '', 'deleteAllCompanies');
    }
    else {
        HQ.message.show(4, '', '');
    }
};

var getDeepAllLeafNodes = function (node, onlyLeaf) {
    var allNodes = new Array();
    if (!Ext.value(node, false)) {
        return [];
    }
    if (node.isLeaf()) {
        return node;
    } else {
        node.eachChild(
         function (Mynode) {
             allNodes = allNodes.concat(Mynode.childNodes);
         }
        );
    }
    return allNodes;
};
var getLeafNodes = function (node) {
    var childNodes = [];
    node.eachChild(function (child) {
        if (child.isLeaf()) {
            childNodes.push(child);
        }
        else {
            var children = getLeafNodes(child);
            if (children.length) {
                children.forEach(function (nill) {
                    childNodes.push(nill);
                });
            }
        }
    });
    return childNodes;
};
var deleteSelectedCompanies = function (item) {
    if (item == "yes") {
        App.grdPO_PriceCpny.deleteSelected();
        frmChange();
    }
};

var deleteAllCompanies = function (item) {
    if (item == "yes") {
        //App.grdPO_PriceCpny.store.removeAll();

        App.stoPO_PriceCpny.suspendEvents();
        var allData = App.stoPO_PriceCpny.snapshot || App.stoPO_PriceCpny.allData || App.stoPO_PriceCpny.data;
        var selRecs = allData.items;
        for (var i = selRecs.length - 1; i >= 0; i--) {
            App.grdPO_PriceCpny.getStore().remove(allData.items[i], App.grdPO_PriceCpny);
            App.grdPO_PriceCpny.getView().focusRow(App.grdPO_PriceCpny.getStore().getCount() - 1);
            App.grdPO_PriceCpny.getSelectionModel().select(App.grdPO_PriceCpny.getStore().getCount() - 1);
        }
        var invtBlank = HQ.store.findRecord(App.grdPO_PriceCpny.store, ['CpnyID'], ['']);
        if (!invtBlank) {
            App.grdPO_PriceCpny.store.insert(0, Ext.create("App.mdlPO_PriceCpny", {
                CpnyID: ''
            }));
        }
        App.stoPO_PriceCpny.resumeEvents();
        App.grdPO_PriceCpny.view.refresh();
        App.stoPO_PriceCpny.loadPage(1);
        frmChange();
    }
};
var treePanelBranch_checkChange = function (node, checked, eOpts) {
    //if (App.cboStatus.getValue() == _holdStatus) {
        checkNode(checked, node);
        checkParentNode(checked, node);
        //node.childNodes.forEach(function (childNode) {
        //    childNode.set("checked", checked);
        //});
    //} else {
    //    App.treePanelBranch.clearChecked();
    //}
};
var checkNode = function (checked, node) {
    if (node.childNodes.length > 0) {
        for (var i = 0; i < node.childNodes.length; i++) {
            node.set('checked', checked)
            checkNode(checked, node.childNodes[i]);
        }
    }
    node.set('checked', checked);
};
var checkParentNode = function (checked, node) {


    if (node.parentNode != undefined) {
        node.parentNode.set('checked', checked)
        checkParentNode(checked, node.parentNode);
    }
}
var tree_ItemCollapse = function (a, b) {
    collapseNode(a);
}
var renderBranchName = function (value, metaData, rec, rowIndex, colIndex, store) {
    var record = App.cboCpnyID.findRecord("BranchID", rec.data.CpnyID);
    if (record) {
        return record.data.BranchName;
    }
    else {
        return value;
    }
};
var btnImport_Render = function (c) {
    Ext.create('Ext.tip.ToolTip', {
        target: c.getEl(),
        html: HQ.common.getLang("Import")
    });
}



var btnExport_Render = function (c) {
    Ext.create('Ext.tip.ToolTip', {
        target: c.getEl(),
        html: HQ.common.getLang("Export")
    });
}

var btnExport_Click = function () {
    App.frmMain.submit({
        waitMsg: HQ.common.getLang("Exporting"),
        url: 'PO20100/Export',
        type: 'POST',
        timeout: 1000000,
        clientValidation: false,
        params: {
            //lstOM_CabinetChecking: Ext.encode(App.stoOM_CabinetChecking.getRecordsValues())
        },
        success: function (msg, data) {
            window.location = 'PO20100/DownloadAndDelete?file=' + data.result.fileName;
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
        }
    });
};
var btnImport_Click = function (sender, e) {
    if (!App.frmMain.isValid()) {
        showFieldInvalid(App.frmMain);
        App.btnImport.reset();
    }
    else {
        var fileName = sender.getValue();
        var ext = fileName.split(".").pop().toLowerCase();
        if (ext == "xls" || ext == "xlsx") {
            App.frmMain.submit({
                waitMsg: "Importing....",
                url: 'PO20100/Import',
                timeout: 18000000,
                clientValidation: false,
                method: 'POST',
                params: {
                },
                success: function (msg, data) {
                    debugger
                    _msgImport = msg;
                    _dataImport = data;

                    if (this.result.data.lstPO_Price != undefined && this.result.data.message == "") {
                        var lineUOM = '';
                        var line = '';
                        App.stoPO_Price.suspendEvents();
                        var i =0;
                        this.result.data.lstPO_Price.forEach(function (item) {
                            i++;
                            var objInvtID = HQ.store.findRecord(App.stoPO_Price, ['InvtID'], [item.InvtID]);
                            if (objInvtID != undefined) {
                                if (objInvtID.data.UOM != item.UOM) {
                                    lineUOM += lineIntID(item.InvtID) + ", ";
                                }
                            }

                        });
                        if (lineUOM != '') {
                            HQ.message.show(2018102464, [lineUOM, App.cboPriceID.getValue()], '', true);
                            return;
                        }

                        listImport = this.result.data;
                        this.result.data.lstPO_Price.forEach(function (item) {
                            var objInvtID = HQ.store.findRecord(App.stoPO_Price, ['InvtID', 'UOM'], [item.InvtID, item.UOM]);

                            if (objInvtID != undefined) {
                                line += lineIntID(item.InvtID) + ", ";
                            }
                        });
                        if (line != '') {
                            HQ.message.show(2018102461, [line], 'insertImport', true);
                            return;
                        }
                        else
                        {
                            listImport.lstPO_Price.forEach(function (itemImport) {
                                var objInvtID = HQ.store.findRecord(App.stoPO_Price, ['InvtID', 'UOM'], [itemImport.InvtID, itemImport.UOM]);
                                if (!objInvtID) {
                                    HQ.store.insertRecord(App.stoPO_Price, "InvtID", Ext.create('App.mdlPO_Price'), false);
                                    objInvtID = App.stoPO_Price.data.items[App.stoPO_Price.getCount() - 1];
                                    objInvtID.set("InvtID", itemImport.InvtID);
                                    var checkDescr = HQ.store.findRecord(App.cboInvtID.store, ['InvtID'], [itemImport.InvtID]);
                                    if (checkDescr != undefined)
                                    {
                                        objInvtID.set("Descr", checkDescr.data.Descr);
                                    }
                                    
                                    objInvtID.set("UOM", itemImport.UOM);
                                }
                                objInvtID.set("Price", itemImport.Price);
                                objInvtID.set("QtyBreak", 1);
                            })
                        }
                        App.stoPO_Price.resumeEvents();
                        App.grdPO_Price.view.refresh();
                    }

                    HQ.isChange = false;
                    HQ.isFirstLoad = true;
                    var record = HQ.store.findRecord(App.stoPO_Price, ['InvtID'], ['']);
                    if (!record) {
                        HQ.store.insertBlank(App.grdPO_Price.store, keys);
                    }
                    if (!Ext.isEmpty(this.result.data.message)) {
                        HQ.message.show('2013103001', [this.result.data.message], '', true);
                    }
                    else {
                        HQ.message.process(msg, data, true);
                    }

                },
                failure: function (msg, data) {
                    debugger
                    HQ.message.process(msg, data, true);
                }
            });
        }
        else {
            HQ.message.show('2014070701', ext, '');
            sender.reset();
        }
        frmChange();
    }

    
};
var insertImport = function (item) {
    if (item == 'yes') {
        listImport.lstPO_Price.forEach(function (itemImport) {
            var objInvtID = HQ.store.findRecord(App.stoPO_Price, ['InvtID', 'UOM'], [itemImport.InvtID, itemImport.UOM]);
            if (!objInvtID) {
                HQ.store.insertRecord(App.stoPO_Price, "InvtID", Ext.create('App.mdlPO_Price'), false);
                objInvtID = App.stoPO_Price.data.items[App.stoPO_Price.getCount() - 1];
                objInvtID.set("InvtID", itemImport.InvtID);
                objInvtID.set("UOM", itemImport.UOM);
            }
            objInvtID.set("Price", itemImport.Price);
            objInvtID.set("QtyBreak", 1);
        })
        App.stoPO_Price.resumeEvents();
        App.grdPO_Price.view.refresh();

        HQ.isChange = false;
        HQ.isFirstLoad = true;

        var record = HQ.store.findRecord(App.stoPO_Price, ['InvtID', 'SlsUnit'], ['', '']);
        if (!record) {
            HQ.store.insertBlank(App.grdPO_Price.store, keyPrice);
        }

        if (!Ext.isEmpty(listImport.message)) {
            HQ.message.show('2013103001', [listImport.message], '', true);
        }
        else {
            HQ.message.process(_msgImport, _dataImport, true);
        }
        frmChange();
    }
}
var renderInvtName = function (value, metaData, rec, rowIndex, colIndex, store) {
    var record = App.cboInvtID.findRecord("InvtID", rec.data.InvtID);
    if (record) {
        return record.data.Descr;
    }
    else {
        return value;
    }
};
var focusOnInvalidField = function (item) {
    if (item == "ok") {
        App.frmMain.getForm().getFields().each(function (field) {
            if (!field.isValid()) {
                field.focus();
                return false;
            }
        });
    }
};
var showFieldInvalid = function (form) {
    var done = 1;
    form.getForm().getFields().each(function (field) {
        if (!field.isValid()) {
            HQ.message.show(15, field.fieldLabel, 'focusOnInvalidField');
            done = 0;
            return false;
        }
    });
    return done;
};

function lineIntID(item) {
    var data = App.stoPO_Price.data.items;
    for (var i = 0; i < App.stoPO_Price.data.length ; i++) {
        if (data[i].data.InvtID == item) {
            return i + 1;
        }
    }
}
var checkValidateEditDG = function (grd, e, keys) {
    if (keys.indexOf(e.field) != -1) {
        if (checkDuplicate(grd, e, keys)) {
            if (e.column.xtype == "datecolumn")
                HQ.message.show(1112, Ext.Date.format(e.value, e.column.format));
            else HQ.message.show(1112, e.value);
            return false;
        }
    }
};
var checkDuplicate = function (grd, row, keys) {
    var found = false;
    var store = grd.getStore();
    if (keys == undefined) keys = row.record.idProperty.split(',');
    var allData = grd.store.snapshot || grd.store.allData || grd.store.data;
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
}
var pnlPO_PriceCpny_Active = function (tabItem) {

    //if (tabItem.activeTab.id = "pnlPO_PriceCpny" && count == 0) {
        App.ColCpnyType.setVisible(!HQ.hideCpnyType);
       // count = 1;
    //}
    
}
var cboPriceIDCopy_Blur = function () {
    checkUnicode = 0;
    checkSpecialChar1(App.cboPriceIDCopy.getValue());
    if (checkUnicode == 1) {
        App.cboPriceIDCopy.setValue('');
    }
}
var checkSpecialChar1 = function (value) {
    var regex = /^(\w*(\d|[a-zA-Z]|[\_@()!#$%^&()*~`=+-]))*$/;
    if (value)
        if (!HQ.util.passNull(value) == '' && !HQ.util.passNull(value.toString()).match(regex)) {
            HQ.message.show(20140811, App.cboPriceIDCopy.fieldLabel);
            checkUnicode = 1;
            return false;
        }
};

var btnCopy_click = function (btn, e, eOpts) {
    if(!Ext.isEmpty(App.cboPriceID.getValue())){
        if (HQ.isNew && App.cboPriceIDCopy.value) {
            HQ.common.showBusy(true, HQ.common.getLang('Copyingdata'));
            App.stoHeaderCopy.load({
                callback: function () {
                    var recordHeader = App.stoHeaderCopy.data.items[0].data;
                    App.Descr.setValue(recordHeader.Descr);
                    App.EffDate.setValue(recordHeader.CreateTime);
                    App.stoGetPOPriceCopy.load({
                        callback: function () {
                            HQ.store.insertBlank(App.stoPO_Price, keys);
                            setTimeout(function () {
                                App.stoPO_Price.suspendEvents();
                                App.stoGetPOPriceCopy.data.each(function (item) {
                                    var priceCpny = App.stoPO_Price.data.items[App.stoPO_Price.getCount() - 1];
                                    priceCpny.set('InvtID', item.data.InvtID);
                                    priceCpny.set('Descr', item.data.Descr);
                                    priceCpny.set('UOM', item.data.UOM);
                                    priceCpny.set('QtyBreak', item.data.QtyBreak);
                                    priceCpny.set('Price', item.data.Price);
                                    priceCpny.set('Disc', item.data.Disc);
                                    App.stoPO_Price.insert(App.stoPO_Price.getCount(), Ext.data.Record());
                                });
                                App.stoPO_Price.resumeEvents();
                                App.grdPO_Price.view.refresh();
                                App.stoPO_Price.loadPage(1);
                            }, 300);
                            App.stoPOPriceCpnyCopy.load({
                                callback: function () {
                                    HQ.store.insertBlank(App.stoPO_PriceCpny, keys1);
                                    setTimeout(function () {
                                        App.stoPO_PriceCpny.suspendEvents();
                                        App.stoPOPriceCpnyCopy.data.each(function (item) {
                                            var cpny = App.stoPO_PriceCpny.data.items[App.stoPO_PriceCpny.getCount() - 1];
                                            cpny.set('CpnyID', item.data.CpnyID);
                                            cpny.set('CpnyName', item.data.CpnyName);
                                            cpny.set('CpnyType', item.data.CpnyType);
                                            App.stoPO_PriceCpny.insert(App.stoPO_PriceCpny.getCount(), Ext.data.Record());
                                        });
                                        App.stoPO_PriceCpny.resumeEvents();
                                        App.grdPO_PriceCpny.view.refresh();
                                        App.stoPO_PriceCpny.loadPage(1);
                                    }, 300);
                                    HQ.common.showBusy(false);
                                }
                            });
                        }
                    });
                }
            });
        }
    }
    else{
        HQ.message.show(15, [App.cboPriceID.fieldLabel],'',true);
    }
};


function disableCopy() {
    var check = false;
    var lst = App.grdPO_Price.store.snapshot || App.grdPO_Price.store.allData || App.grdPO_Price.store.data;
    if (lst != undefined) {
        for (var i = 0; i < lst.length; i++) {
            if (lst.items[i].data.InvtID != "") {
                check = true;
            }
        }
    }
    if (check == false) {
        App.btnCopy.enable();
    }
    else {
        App.btnCopy.disable();
    }
}