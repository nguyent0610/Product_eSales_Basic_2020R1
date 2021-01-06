//// Declare //////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
var _keys = ['PurchaseType', 'InvtID'];
var _fieldsCheckRequire = ["InvtID", "PurchaseType", "SiteID", "RcptUnitDescr"];
var _fieldsLangCheckRequire = ["InvtID", "PurchaseType", "SiteID", "RcptUnitDescr"];

var _objUserDflt = null;
var _objPO_Setup = null;
var _objrecordTran = null;
var _objrecordinvt = null;

var _invtID = "";
var _classID = "";
var _stkUnit = "";
var _purUnit = "";
var _siteID = "";
var _whseLoc = "";
var _lineRef = "";
var _beginStatus = 'H';
var _objIN_ItemSite = null;
var _stoSiteTmp;
var _discountClassID = '$Discount$';
var _ICPurchaseType = 'IC';
var _backOrderRcptNbr = '';
var _backOrderBatNbr = '';
var _rcptFromPO10200 = 'PO';
var _siteIDFilterWhseLoc = "";
var _siteIDOld = "";
var _whseLocOld = "";
var _siteNew = "";
var _lstDelete = [];
var _DPPurchageType = 'DP';
var _docTypeVO = "VO";
var _invtIDDisc = '';
HQ.numSelectTrans = 2;
HQ.maxSelectTrans = 0;
var tempRecordID = '';
HQ.isNew = false;

//////////////////////////////////////////////////////////////////
//// Event ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////
//// Store ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
function store_Load(sto) {
    HQ.numSource++;
    if (HQ.numSource == 3) {
        App.cboBranchID.setValue(HQ.cpnyID);
    }
};

function stoHeader_Load(sto) {
    App.lblQtyAvail.setText('');
    App.cboPONbr.allowBlank = true;
    App.cboPONbr.validate();
    Ext.getBody().mask(HQ.common.getLang('loadingdata'));
    HQ.common.setForceSelection(App.frmMain, false, "cboBranchID,cboBatNbr,cboHandle");
    HQ.isFirstLoad = false;    
    HQ.isNew = false;
    if (sto.data.length == 0) {
        HQ.store.insertBlank(sto, "PONbr");
        var record = sto.getAt(0);
        //gan du lieu mac dinh ban dau
        record.data.Status = "H";
        record.data.RcptType = "R";
        var dfltRcptFrom = 'PO';

        record.data.RcptDate = HQ.bussinessDate;
        record.data.InvcDate = HQ.bussinessDate;
        record.data.DocDate = HQ.bussinessDate;
        record.data.TruckRcptDate = HQ.bussinessDate;
        record.data.InTransit = false;
        record.data.RcptFrom = dfltRcptFrom;
        record.data.DocType = _docTypeVO;
        record.data.Descr = "";
        record.data.VendID = App.cboVendID.store.data.items.length ? App.cboVendID.store.data.items[0].data.VendID : '';
        record.data.Terms = App.cboTerms.getValue();
        HQ.isNew = true;//record la new    
        HQ.common.setRequire(App.frmMain);  
        record.data.PerPost = HQ.PerPost;
        sto.commitChanges();
        if (_objPO_Setup) {
            _objPO_Setup.DfltRcptFrom = "PO";
        }
       
    } 

    if (HQ.showWhseLoc == 0) {
        App.colWhseLoc.hide();
    }
    else {
        App.colWhseLoc.show();
    }
    if (HQ.showWhseLoc == 2) {
        _fieldsCheckRequire = ["InvtID", "PurchaseType", "SiteID", "WhseLoc", "RcptUnitDescr"];
        _fieldsLangCheckRequire = ["InvtID", "PurchaseType", "SiteID", "WhseLoc", "RcptUnitDescr"];
    }
    else {
        _fieldsCheckRequire = ["InvtID", "PurchaseType", "SiteID", "RcptUnitDescr"];
        _fieldsLangCheckRequire = ["InvtID", "PurchaseType", "SiteID", "RcptUnitDescr"];
    }
    
    if (HQ.HideAndConfirmDataInv == true && sto.data.items[0].data.RcptType  != 'X') {
        if (sto.data.items[0].data.Status == "H") {
            sto.data.items[0].data.InvcNbr = "";
            sto.data.items[0].data.InvcNote = "";
        }        
    }
    var record = sto.getAt(0);
    HQ.currRecord = sto.getAt(0);
    App.frmMain.getForm().loadRecord(record);

    if (record.data.Status == 'H') HQ.isFirstLoad = true;
    
    App.stoPO10200_pgDetail.reload();
    
    App.grdTaxTrans.getView().refresh();

   
    App.cboHandle.setValue("N");
    if (record.data.RcptFrom == "PO") {
        HQ.grid.show(App.grdPO_Trans, ["POLineRef", "Qty", "UnitDescr"]);
    }
    if (record.data.RcptFrom == "DR") {
        App.cboPONbr.allowBlank = true;       
    }
    else {
        if (Ext.isEmpty(record.data.OrigBatNbr)) {
            if (HQ.IntegrateERP) {
                App.cboPONbr.allowBlank = true;
            } else {
                App.cboPONbr.allowBlank = false;
            }
           
        }
    }
    App.cboPONbr.validate();
    
   

    if (HQ.IntegrateERP) {
        App.dtInvcDate.setReadOnly(true);
        App.cboDocType.setReadOnly(true);
        App.cboRcptType.setReadOnly(true);
        App.cboRcptFrom.setReadOnly(true);
        App.cboPONbr.setReadOnly(true);
        App.cboVendID.setReadOnly(true);
        App.cboPONbr.allowBlank = true;
        App.cboVendID.allowBlank = true;
        App.cboPONbr.isValid();
        App.cboVendID.isValid();
        App.txtAPRefNbr.setReadOnly(true);
        App.txtAPBatNbr.setReadOnly(true);
        App.dtDocDate.setReadOnly(true);
        App.cboTerms.setReadOnly(true);
        App.cboTerms.allowBlank = true;
        App.cboTerms.isValid();
    }
    HQ.isChange = false;
    HQ.common.changeData(HQ.isChange, 'PO10200');

     if (App.stoPO10200_pdPO_Setup.data.length == 0) {// chua cai dat PO_Setup thong bao 
        HQ.isChange = false;
        HQ.common.changeData(HQ.isChange, 'PO10200');
        lockControl(true);
        App.cboBranchID.setReadOnly(false);
    }
};
var stoPO10200_pgDetail_Load = function (sto) {
    //neu sto da co du lieu thi ko duoc sua cac combo ben duoi
    if (sto.data.length > 0) {
        App.cboRcptFrom.setReadOnly(true);
        App.cboRcptType.setReadOnly(true);
        App.cboVendID.setReadOnly(true);
        App.cboPONbr.setReadOnly(true);
    }
    else {
        if (!HQ.IntegrateERP) {
            App.cboRcptFrom.setReadOnly(false);
            App.cboRcptType.setReadOnly(false);
            App.cboVendID.setReadOnly(false);
        }
      
    }
    if ((Ext.isEmpty(App.cboBatNbr.getValue()) || App.cboStatus.getValue() == 'H') && (HQ.allowEditGridDetail && !HQ.IntegrateERP)) {
        var record = HQ.store.findRecord(sto, _keys, ['', '']);
        if (!record) {
            HQ.store.insertBlank(sto, _keys);
        }
        HQ.isFirstLoad = false;
    }
    App.stoPO10200_pgLoadTaxTrans.reload();
    frmChange();
    
    App.stoLotTrans.reload();

    calcDet();
};
var loadPO10200_pdSI_Tax = function () {
    if (App.stoPO10200_pdSI_Tax.getCount() > 0) {
    
    }
};
var loadPO10200_pdIN_Inventory = function () {
   
};
var loadPO10200_pdIN_UnitConversion = function () {
    if (App.stoPO10200_pdIN_UnitConversion.getCount() > 0) {
       
    }
};
var loadstoPO10200_pgLoadTaxTrans = function () {
    App.stoPO10200_LoadTaxDoc.clearData();
    calcTaxTotal();
    App.stoDisc.reload();
};
var stoDisc_load = function () {
    Ext.getBody().unmask();
}
//////////////////////////////////////////////////////////////////
//// Event ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
var menuClick = function (command) {
    switch (command) {
        case "first":
            if (HQ.focus == 'header') {
                HQ.combo.first(App.cboBatNbr, HQ.isChange);             
            }
            else if (HQ.focus == 'grdPO_Trans') {
                HQ.grid.first(App.grdPO_Trans);
            }
            break;
        case "next":
            if (HQ.focus == 'header') {
                HQ.combo.next(App.cboBatNbr, HQ.isChange);
            }
            else if (HQ.focus == 'grdPO_Trans') {
                HQ.grid.next(App.grdPO_Trans);
            }
            break;
        case "prev":
            if (HQ.focus == 'header') {
                HQ.combo.prev(App.cboBatNbr, HQ.isChange);
            }
            else if (HQ.focus == 'grdPO_Trans') {
                HQ.grid.prev(App.grdPO_Trans);
            }
            break;
        case "last":
            if (HQ.focus == 'header') {
                HQ.combo.last(App.cboBatNbr, HQ.isChange);
            }
            else if (HQ.focus == 'grdPO_Trans') {
                HQ.grid.last(App.grdPO_Trans);
            }
            break;
        case "save":
            if (App.cboStatus.value == 'V') break;            
            if (HQ.isUpdate || HQ.isInsert || HQ.isDelete) {
                if ((App.cboStatus.value == _beginStatus || App.cboStatus.value ==  "T")&& App.cboHandle.value == 'V') {

                    if (!Ext.isEmpty(App.cboBatNbr.getValue())) {
                        HQ.message.show(2018013005, '', 'askCancel', false);                        
                    } else {
                        HQ.message.show(2018013006, '', '', false);  
                    }
                } else {
                    if (HQ.form.checkRequirePass(App.frmMain)) {
                        if (App.cboStatus.value == "C" && App.cboHandle.value == 'V') {
                            save();
                        } else {
                            var checkPerPost = true;
                            if (HQ.CheckperPost == 2) {
                                var objPerPost = HQ.store.findRecord(App.cboPerPost.store, ['CycleNbr'], [App.cboPerPost.getValue()]);
                                if (objPerPost != undefined) {
                                    var tam = App.dtpTranDate.getValue();
                                    if (tam > objPerPost.data.EndDate || tam < objPerPost.data.StartDate) {
                                        checkPerPost = false;
                                    }
                                }
                                else {
                                    checkPerPost = false;
                                }
                            }

                            if (HQ.CheckperPost == 2 && !checkPerPost) {
                                HQ.message.show(2018081311, '', 'checkSave');

                            }
                            else if (App.cboDocType.getValue() == _docTypeVO
                                && App.cboHandle.value == "R"
                                && !validateInvoiceNbr()
                                ) {
                                // - Kiểu Nhập kho/ Xuất Trả
                                //- Đơn hàng có POType = VO => khi chuyển đến trạng thái C thì mới gọi hàm check "Số Hóa Đơn" phải trùng với InvcNoteImport và InvcNoteNbr
                                return;
                            } else if (App.stoHeader.data.items[0].data.ReplaceInvoice == false && !Ext.isEmpty(App.stoHeader.data.items[0].data.InvcDateImport) && App.stoHeader.data.items[0].data.InvcDateImport.getTime() != App.dtInvcDate.value.getTime()) {
                                HQ.message.show(2018092802, [App.dtInvcDate.fieldLabel], '', true);
                            } else if (App.stoHeader.data.items[0].data.ReplaceInvoice && !Ext.isEmpty(App.stoHeader.data.items[0].data.InvcDateOld) && App.stoHeader.data.items[0].data.InvcDateOld.getTime() != App.dtInvcDate.value.getTime()) {
                                HQ.message.show(2018121701, [App.dtInvcDate.fieldLabel], '', true);
                            }
                            else {
                                if (App.cboHandle.getValue() == 'R' && App.cboStatus.getValue() == _beginStatus && App.chkInTransit.getValue()) {
                                    HQ.message.show(2018091301, '', 'ask4SaveInTransit', true);
                                } else {
                                    save();
                                }
                            }
                        }
                    }
                }
            }
            break;
        case "delete":
            if (HQ.isDelete && App.cboStatus.value == 'H') {
                if (HQ.isDelete) {
                    if (HQ.focus == 'header') {
                        var lstDel = App.stoPO10200_pgDetail.snapshot || App.stoPO10200_pgDetail.allData || App.stoPO10200_pgDetail.data;
                        if (lstDel != undefined) {
                            for (var i = 0; i < lstDel.length; i++) {
                                if (lstDel.items[i].data.QtyFromOM != 0) {
                                    HQ.message.show(2018070211);
                                    return false;
                                }
                            }
                        }
                        
                        HQ.message.show(11, '', 'deleteHeader');
                    } else if (HQ.focus == 'grdPO_Trans' && (HQ.allowEditGridDetail && !HQ.IntegrateERP)) {
                        var lstDel = App.grdPO_Trans.selModel.selected;
                        if (lstDel != undefined) {
                            for(var i=0;i<lstDel.length;i++){
                                if (lstDel.items[i].data.QtyFromOM != 0) {
                                    HQ.message.show(2018070211);
                                    return false;
                                }
                            }
                        }                        
                        if (Ext.isEmpty(App.txtOrigBatNbr.value) || HQ.allowDeleteReturnRow) {
                            var rowindex = HQ.grid.indexSelect(App.grdPO_Trans);
                            if (rowindex != '') {
                                HQ.message.show(2015020807, [HQ.grid.indexSelect(App.grdPO_Trans), ''], 'deleteRecordGrid', true);
                            }
                        } else {
                            HQ.message.show(2017122901);
                        }                        
                    }
                }
                break;
                
            }
            break;
        case "close":
                HQ.common.close(this);            
            break;
        case "new":
            if (HQ.isInsert) {
                if (HQ.focus == 'header') {
                    if (HQ.isChange) {
                        HQ.message.show(150, '', '');
                    }
                    else {
                        HQ.isNew = true;
                        App.cboBatNbr.focus();
                        App.cboBatNbr.setValue(null);
                        App.stoHeader.reload();
                        
                    }
                } else if (HQ.focus == 'grdPO_Trans') {
                    if (App.cboStatus.getValue() == _beginStatus && (HQ.allowEditGridDetail && !HQ.IntegrateERP)) {
                        HQ.grid.insert(App.grdPO_Trans, _keys);
                    }
                }
            }
            break;
           
            break;
        case "refresh":
            if (HQ.isChange) {
                HQ.message.show(20150303, '', 'refresh');
            }
            else {
                HQ.isChange = false;
                App.cboBatNbr.getStore().load(function(){
                    App.stoHeader.reload(); 
                });                            
            }
            break;
           
            break;
        case "print":
            if (App.frmMain.isValid()) {
                App.frmMain.submit({
                    waitMsg: HQ.common.getLang("LoadReporting"),
                    method: 'POST',
                    url: 'PO10200/Report',
                    timeout: 180000,
                    params: {
                        lstHeader: Ext.encode(App.stoHeader.getRecordsValues())
                    },
                    success: function (msg, data) {
                        if (this.result.reportID != null) {

                            window.open('Report?ReportName=' + this.result.reportName + '&_RPTID=' + this.result.reportID, '_blank')
                        }

                    },
                    failure: function (msg, data) {
                        HQ.message.process(msg, data, true);
                    }
                });
            }
            break;
        default:
    }
};

var firstLoad = function () {
    setVisibleInvc();
    HQ.numSource = 0;
    App.cboPosmID.getStore().addListener('load', store_Load);
    App.cboDocType.getStore().addListener('load', store_Load);
    App.cboBranchID.getStore().addListener('load', store_Load);
    App.dteFromDate.setValue(HQ.bussinessDate);
    App.dteToDate.setMinValue(HQ.bussinessDate);
    App.dteToDate.setValue(HQ.bussinessDate);
    App.cboBranchID.store.reload();
    App.cboDocType.store.reload();
    App.cboPosmID.store.reload();
    App.btnBackOrder.setVisible(HQ.isShowBackOrder);

    App.txtInvcNote.allowBlank = (!HQ.requireInvoice);
    App.txtInvcNbr.allowBlank = !HQ.requireInvoice;
    
    App.frmMain.validate();
    App.btnExport.setVisible(HQ.showImportExport);
    App.btnImport.setVisible(HQ.showImportExport);

    App.chkInTransit.setVisible(HQ.showInTransit);
    App.cboPerPost.setVisible(HQ.CheckperPost != 0);
    if (HQ.IntegrateERP) {
        App.dtInvcDate.setReadOnly(true);
        App.cboDocType.setReadOnly(true);
        App.cboRcptType.setReadOnly(true);
        App.cboRcptFrom.setReadOnly(true);
        App.cboPONbr.setReadOnly(true);
        App.cboVendID.setReadOnly(true);
        App.cboPONbr.allowBlank = true;
        App.cboVendID.allowBlank = true;
        App.cboPONbr.isValid();
        App.cboVendID.isValid();
        App.txtAPRefNbr.setReadOnly(true);
        App.txtAPBatNbr.setReadOnly(true);
        App.dtDocDate.setReadOnly(true);
        App.cboTerms.setReadOnly(true);
        App.cboTerms.allowBlank = true;
        App.cboTerms.isValid();
    }
    
    App.colNbrUnitCost.decimalPrecision = HQ.DecimalInput;
    App.colUnitCost.format = HQ.DecimalPrecision;
};

var dteFromDate_change = function () {
    App.dteToDate.setMinValue(App.dteFromDate.getValue());
    if (App.dteToDate.getValue() < App.dteFromDate.getValue()) {
        App.dteToDate.setValue(App.dteFromDate.getValue());
    }
};
var frmChange = function (sender) {
    if (App.stoHeader.data.length > 0 && App.cboBranchID.getValue()!=null) {
        App.frmMain.getForm().updateRecord();
        HQ.isChange = HQ.store.isChange(App.stoHeader) == false ? HQ.store.isChange(App.stoPO10200_pgDetail) : true;
        HQ.common.changeData(HQ.isChange, 'PO10200');

        App.cboBranchID.setReadOnly(HQ.isChange);
        App.cboBatNbr.setReadOnly(HQ.isChange);
    }
    else {
        HQ.isChange = false;
        HQ.common.changeData(HQ.isChange, 'PO10200');
    }
    if (App.stoPO10200_pdPO_Setup.data.length == 0) {
        HQ.isChange = false;
        HQ.common.changeData(HQ.isChange, 'PO10200');
        lockControl(true);
        App.cboBranchID.setReadOnly(false);
    }
    if (HQ.store.isChange(App.stoPO10200_pgDetail) || !Ext.isEmpty(App.txtRcptNbr.getValue()) || App.stoPO10200_pgDetail.data.length>1) {
        App.cboRcptFrom.setReadOnly(true);
        App.cboRcptType.setReadOnly(true);
        App.cboPONbr.setReadOnly(true);
        App.cboVendID.setReadOnly(true);
        App.dtInvcDate.setReadOnly(true);
    }
    else {
        if (!HQ.IntegrateERP) {
            App.cboRcptFrom.setReadOnly(false);
            App.cboRcptType.setReadOnly(false);
            App.cboVendID.setReadOnly(false);
            App.dtInvcDate.setReadOnly(false);
            if (App.cboRcptFrom.getValue() == "PO") {
                App.cboPONbr.setReadOnly(false);
            }
        }
    }  
    if (App.cboStatus.getValue() == _beginStatus) {
        if (App.stoPO10200_pgDetail.data.length > 0 && App.stoPO10200_pgDetail.data.items[0].data.InvtID != '' && App.stoPO10200_pgDetail.data.items[0].data.EditInvcDate) {
            App.dtInvcDate.setReadOnly(true);
        } else {
            if (!HQ.IntegrateERP) {
                App.dtInvcDate.setReadOnly(false);
            }
        }
        if (App.cboRcptType.getValue() == 'X' && !HQ.requiredPONbr) {
            App.cboPONbr.setReadOnly(true);
            App.cboPONbr.allowBlank = true;
            App.cboPONbr.validate();
        }
    }
    
};
var grdPO_Trans_BeforeEdit = function (editor, e) {
    _invtIDDisc = e.record.data.InvtID;
    if (!HQ.form.checkRequirePass(App.frmMain) || (!HQ.allowEditGridDetail && !HQ.IntegrateERP)) {
        return false;
    }
    if (HQ.IntegrateERP) {
        if (e.field != "RcptQty") {
            return false;
        }
    }
    if (e.field == "InvtID" &&(e.record.data.POLineRef!="" && e.record.data.POLineRef!=null)) {
        return false;
    }
    if (e.field == "SiteID") {
        _siteIDOld = e.record.data.SiteID;
    }
    if (e.field == "WhseLoc") {
        _whseLocOld = e.record.data.WhseLoc;
    }
    if (App.cboRcptType.getValue() == "X" && App.cboRcptFrom.getValue() == _rcptFromPO10200 && e.field != "SiteID" && e.field != "WhseLoc" && e.field != "DiscCode") {
        if (!(e.field == "RcptQty" && HQ.EditLineQty)) {
            return false;
        }               
    }
    if (App.cboStatus.getValue() != "H" || !App.winLot.hidden) return false;
    if (_objPO_Setup == null) {
        HQ.message.show(20404, 'PO_Setup', '');
        return false;
    }
    else if (HQ.util.passNull(App.cboBatNbr.getValue()) == "" && _objPO_Setup.AutoRef == 0) {
        HQ.message.show(15, App.cboBatNbr.fieldLabel, '');
        return false;
    }
    else if (HQ.util.passNull(App.cboBranchID.getValue()) == "") {
        HQ.message.show(15, App.cboBranchID.fieldLabel, '');
        return false;
    }
    else if (HQ.util.passNull(App.cboVendID.getValue()) == "") {
        HQ.message.show(41, '', '');
        return false;
    }
    else if (App.dtRcptDate.getValue() == "") {
        HQ.message.show(15, App.dtRcptDate.fieldLabel, '');
        return false;
    }
    else if (App.dtInvcDate.getValue() == "") {
        HQ.message.show(15, App.dtInvcDate.fieldLabel, '');
        return false;
    }
    else if (e.record.data.ClassID == _discountClassID) {
        if (e.field != 'DocDiscAmt' && e.field != 'PurchaseType' && e.field != 'InvtID' && e.field != 'SiteID' && e.field != 'WhseLoc') {
            return false;
        }
    }
    else if (e.record.data.InvtID != '' && !e.record.data.FromPO10200 && e.field != 'RcptQty' && e.field != 'SiteID' && e.field != 'WhseLoc') {
        return false;
    }
    if (!Ext.isEmpty(App.txtOrigBatNbr.getValue()) && e.field != "SiteID" && e.field != "WhseLoc" && e.field != "DiscCode") {
        if (!(e.field == "RcptQty" && HQ.EditLineQty)) {
            return false;
        }        
    }
    if (e.field == 'DiscPct' && e.record.data.DocDiscAmt != 0
        || e.field == 'DocDiscAmt' && e.record.data.DiscPct != 0 
        || e.field == 'DiscCode' && (e.record.data.PosmID != '' || e.record.data.ClassID == "POSM")
        || (e.field == "PosmID" && (e.record.data.ClassID != "POSM" || e.record.data.DiscCode != '')))
    {
        return false;
    }
    if (e.field == "WhseLoc") {
        _siteIDFilterWhseLoc = e.record.data.SiteID;
        if (e.record.data.SiteID == "" || e.record.data.SiteID == null) {
            _siteIDFilterWhseLoc = "@@@@@@@";
        }
        App.cboWhseLoc.store.filter('SiteID', new RegExp('^' + Ext.escapeRe(_siteIDFilterWhseLoc) + '$'));
    }
    else {
        _siteIDFilterWhseLoc = "@@@@@@@";
        App.cboWhseLoc.store.clearFilter();
    }

    if (e.field == "TranAmt" && !HQ.mathUnitCost) {
        return false;
    }

    var det = e.record.data;
    _purUnit = e.record.data.RcptUnitDescr;
    if ((e.field == "DocDiscAmt" || e.field == 'DiscPct') && (det.ClassID == 'POSM' || det.PurchaseType == 'PR' || det.DiscCode != '')) {
        return false;
    }
    else if ((e.field == 'RcptQty' || e.field == 'Qty' || e.field == 'UnitCost') && e.record.data.ClassID == _discountClassID) {
        return false;
    }
    if (det.RcptQty>0 && e.field == "InvtID") return false;
    if (det.PurchaseType == "") {
        e.record.set("PurchaseType", "GI");
        e.record.set("SiteID", _objUserDflt == undefined ? "" : _objUserDflt.POSite);
        e.record.set("VouchStage", 'N');
        e.record.set("RcptStage", 'N');
        e.record.set("WhseLoc", _objUserDflt == undefined ? "" : _objUserDflt.POWhseLoc)
        var valueTax = '';
        App.cboTaxID.getStore().data.each(function (det) {
            valueTax += det.data.taxid + ',';

        });
        valueTax = valueTax.length > 0 ? valueTax.substring(0, valueTax.length - 1) : '';
        e.record.set("TaxID", valueTax);
        e.record.set("ReqdDate", HQ.bussinessDate);
        e.record.set("PromDate", HQ.bussinessDate);
        return false;
    }
    if (e.field != "InvtID" && e.field != "PurchaseType" && Ext.isEmpty(det.InvtID)) {
        return false;
    }
    if (det.PurchaseType == "" && e.column.dataIndex != "PurchaseType") {
        HQ.message.show(15, e.grid.columns[1].text, '');
        return false;
    }
    if (!_objPO_Setup.EditablePOPrice && e.column.dataIndex == "UnitCost") {
        return false;
    }
    if (Ext.isEmpty(det.LineRef)) {
        e.record.set('LineRef', lastLineRef(App.stoPO10200_pgDetail));
    }
    
    if (e.field == 'RcptUnitDescr' || e.field == 'SiteID') {
       
        var objIN_Inventory = HQ.store.findInStore(App.stoPO10200_pdIN_Inventory, ["InvtID"], [det.InvtID]);
        _invtID = objIN_Inventory.InvtID;
        _classID = objIN_Inventory.ClassID;
        _stkUnit = objIN_Inventory.StkUnit;
        e.record.data.ClassID = objIN_Inventory.ClassID;
        App.cboRcptUnitDescr.getStore().reload();
    }
    if (e.field == "DiscCode") {
        if (e.record.data.PurchaseType == 'GI') {
            return false;
        }
        App.cboDetDiscCode.store.reload();
    }
    
};
var grdPO_Trans_ValidateEdit = function (item, e) {
    if (App.cboStatus.getValue() != "H" || !App.winLot.hidden) {
        return false;
    } else if (e.field == 'SiteID' && e.value == e.record.data.SiteID
               || e.field == 'PurchaseType' && e.value == e.record.data.PurchaseType
               || e.field == 'UnitDescr' && e.value == e.record.data.UnitDescr
               || e.field == 'RcptUnitDescr' && e.value == e.record.data.RcptUnitDescr
               || e.field == 'TranDesc' && e.value == e.record.data.TranDesc) {
        return false;
    }
    if (e.field == "RcptQty" && e.record.data.FromPO10200 == false) {
        if (e.value > e.record.data.QtyFromOM) {
            HQ.message.show(2017060701, [e.record.data.QtyFromOM], '', true);
            return false;
        }
    }
    if (e.field == 'DocDiscAmt') {// && objDetail.TranAmt > 0) 
        if (e.record.data.ClassID != _discountClassID && e.value > e.record.data.UnitCost * e.record.data.RcptQty) {
            return false;
        }
    }
    // Không cho chọn SP là POSM khi nhập hàng KM
    if (e.field == 'PurchaseType' && e.value == 'PR' && e.record.data.ClassID == 'POSM') {
        HQ.message.show(2017020601);
        return false;
    }

    //Không cho số lượng nhập lớn hơn số lượng đặt hàng.
    //if (e.field == 'RcptQty') {
    //    if (e.value > e.record.data.Qty) {
    //        HQ.message.show(2020010601);
    //        return false;
    //    }
        
    //}

    var Qty = 0;
    var objdet = e.record;
    if (_keys.indexOf(e.field) != -1) {
        if (e.field == "InvtID") {
            var invtID = e.value;
        }
        else {
            var invtID = objdet.data.InvtID;
        }
        var r = HQ.store.findInStore(App.cboInvtID.getStore(), ["InvtID"], [invtID]);
        if (r) {
            if (r.ClassID == _discountClassID) {
                if (HQ.grid.checkDuplicate(App.grdPO_Trans, e, ['InvtID'])) {
                    HQ.message.show(1112, [invtID], '', true);
                    return false;
                }
            }
        }
    }
    
    if (HQ.IsChangeSiteID && e.field == 'PurchaseType') {
        var defaultSiteID = getDefaultSiteID(e.value);
        if (defaultSiteID != '###') {
            e.record.set('SiteID', defaultSiteID);
        }        
    }

    if (e.field == "InvtID") {
        var r = HQ.store.findInStore(App.cboInvtID.getStore(), ["InvtID"], [e.value]);

        if (r == undefined) {
            objdet.set('TranDesc', "");
            objdet.set('RcptUnitDescr', "");
        } else {
            var objIN_Inventory = HQ.store.findInStore(App.stoPO10200_pdIN_Inventory, ["InvtID"], [r.InvtID]);
            // Không cho chọn SP là POSM khi nhập hàng KM
            if (e.record.data.PurchaseType == 'PR' && objIN_Inventory.ClassID == 'POSM') {
                HQ.message.show(2017020601);
                return false;
            }
            _invtID = objIN_Inventory.InvtID;
            _classID = objIN_Inventory.ClassID;
            _stkUnit = objIN_Inventory.StkUnit;
            objdet.set('ClassID', objIN_Inventory.ClassID);
            e.record.data.ClassID = objIN_Inventory.ClassID;
            App.cboRcptUnitDescr.getStore().reload();
            if (objdet.get("SiteID") == "") {
                if (_objUserDflt != null) {
                    objdet.set('SiteID', _objUserDflt.POSite);                    
                    objdet.set('WhseLoc', _objUserDflt.POWhseLoc);
                }
                else {
                    if (App.cboSiteID.getStore().getCount() > 0) {
                        objdet.set('SiteID', App.cboSiteID.getStore().getAt(0).data.SiteID);
                    }
                    else {
                        objdet.set('SiteID', objIN_Inventory.DfltSite);
                    }
                    App.cboWhseLoc.store.filter('SiteID', new RegExp('^' + Ext.escapeRe(objdet.data.SiteID) + '$'));
                    if (App.cboWhseLoc.getStore().getCount().getCount() > 0) {

                        objdet.set('WhseLoc', App.cboWhseLoc.getStore().getAt(0).data.WhseLoc);
                    }
                    else {
                        objdet.set('WhseLoc', objIN_Inventory.DfltWhseLoc);
                    }
                }
            }
            objdet.set('TaxCat', objIN_Inventory.TaxCat == null ? "" : objIN_Inventory.TaxCat);
            objdet.set('RcptUnitDescr', objIN_Inventory.DfltPOUnit == null ? "" : objIN_Inventory.DfltPOUnit);
            objdet.set('UnitWeight', objIN_Inventory.StkWt);
            objdet.set('UnitVolume', objIN_Inventory.StkVol);
            objdet.set('RcptFee', objIN_Inventory.POFee);
            objdet.set('TranDesc', r.Descr);
            App.cboWhseLoc.store.clearFilter();
        }
    }
    if (e.field == "RcptQty" || e.field == "RcptUnitDescr") {
        var RcptUnitDescr = e.field == "RcptUnitDescr" ? e.value : objdet.data.RcptUnitDescr;
        var RcptQty = e.field == "RcptQty" ? e.value : objdet.data.RcptQty;

        var objIN_Inventory = HQ.store.findInStore(App.stoPO10200_pdIN_Inventory, ["InvtID"], [objdet.data.InvtID]);
        if (objIN_Inventory) {
            var cnv = setUOM(objIN_Inventory.InvtID, objIN_Inventory.ClassID, objIN_Inventory.StkUnit, RcptUnitDescr);
        }
       

        if (!Ext.isEmpty(cnv)) {
            e.record.set('RcptConvFact', cnv.CnvFact);
            e.record.set('RcptMultDiv', cnv.MultDiv);
        } else {
            e.record.set('RcptUnitDescr', "");
            return;
        }
        if (objdet.data.RcptMultDiv == "M") {
            Qty = RcptQty * objdet.data.RcptConvFact;
        }
        else {
            Qty = RcptQty / objdet.data.RcptConvFact == 0 ? 1 : objdet.data.RcptConvFact;
        }
        
        if (App.cboRcptType.getValue() == "X" && (objdet.data.PurchaseType == "GI" | objdet.data.PurchaseType == _ICPurchaseType | objdet.PurchaseType == _DPPurchageType | objdet.data.PurchaseType == "PR" | objdet.data.PurchaseType == "GS")) {
            if (objdet.data.PONbr != '') {
                if (Qty > (objdet.data.UnitMultDiv == "M" ? objdet.data.Qty * objdet.data.CnvFact : objdet.data.Qty / objdet.data.CnvFact)) {
                    HQ.message.show(201503261, '', '');
                    return false;
                }
            }

            QtyAvail = _objIN_ItemSite == null ? 0 : _objIN_ItemSite.QtyAvail;
            if (Qty > QtyAvail) {
                HQ.message.show(35, '', '');
                if (objIN_Inventory.LotSerTrack != 'N' && !Ext.isEmpty(objIN_Inventory.LotSerTrack)) {
                    showLot(e.record);
                }
                else objdet.set('RcptQty', 0);
                return false;
            }
        }
        if (objdet.data.PurchaseType == "FA") {
            if (e.value > 1) {
                HQ.message.show(58, '', '');
                objdet.set('RcptQty', 1);
              
            }
        }        
    }

    if (HQ.EditLineQty && App.cboRcptType.getValue() == "X" && e.record.data.RcptQty > e.record.data.MaxReturnQty && e.field == "RcptQty") {
        return false;
    }
}

var grdPO_Trans_Edit = function (item, e) {
    if (e.field == "SiteID") {
        if (HQ.showWhseLoc != 0) {
            HQ.common.showBusy(true);
            App.direct.GetPO10200_pdWhseLoc(e.record.data.SiteID, App.cboBranchID.getValue(), e.record.data.InvtID,
            {
                success: function (result) {
                    var objWhere = result;
                    if (!Ext.isEmpty(objWhere)) {
                        e.record.set("WhseLoc", objWhere.WhseLoc);
                    }
                    else {
                        e.record.set("WhseLoc", '');
                    }
                    HQ.common.showBusy(false);
                },
                failure: function (result) {
                    HQ.common.showBusy(false);
                }
            });
        }
        else {
            e.record.set("WhseLoc", '');
        }
    }

    if (e.field == "TranAmt" && HQ.mathUnitCost) {     
        if (e.record.data.RcptQty != 0) {
            e.record.set('UnitCost', e.record.data.TranAmt / e.record.data.RcptQty);
            delTax(e.record);
            calcTax(e.record);
            calcTaxTotal();
            calcDet();
        }
    }

    var objDetail = e.record.data;
  
    var objIN_Inventory = HQ.store.findInStore(App.stoPO10200_pdIN_Inventory, ["InvtID"], [objDetail.InvtID]);
    objIN_Inventory = objIN_Inventory == null ? "" : objIN_Inventory;

    if (e.field == "RcptUnitDescr" || e.field == "InvtID") {
        var cnv = setUOM(objIN_Inventory.InvtID, objIN_Inventory.ClassID, objIN_Inventory.StkUnit, objDetail.RcptUnitDescr);

        if (!Ext.isEmpty(cnv)) {
           
            objDetail.RcptConvFact = cnv.CnvFact;
            objDetail.RcptMultDiv = cnv.MultDiv;
            e.record.set('RcptConvFact', cnv.CnvFact);
            e.record.set('RcptMultDiv', cnv.MultDiv);
        } else {
            e.record.set('RcptUnitDescr', "");
            return;
        }
        if (objDetail.PONbr == "") {
            var cnv1 = setUOM(objIN_Inventory.InvtID, objIN_Inventory.ClassID, objIN_Inventory.StkUnit, objIN_Inventory.DfltPOUnit);
            if (!Ext.isEmpty(cnv1)) {
                objDetail.CnvFact = cnv1.CnvFact;
                objDetail.UnitMultDiv = cnv1.MultDiv;
                e.record.set('CnvFact', cnv1.CnvFact);
                e.record.set('UnitMultDiv', cnv1.MultDiv);
                e.record.set('UnitDescr', objIN_Inventory.DfltPOUnit);
            } else {
                e.record.set('UnitDescr', '');
                return;
            }
        }
        if (e.field == 'InvtID') {
            e.record.set('FromPO10200', true); // Dòng nhập từ PO10200 (phân biệt với dòng lưu từ OM20500)
            e.record.set('PosmID', '');
            e.record.set('DiscCode', '');
        }
        HQ.grid.checkInsertKey(App.grdPO_Trans, e, _keys);
    } else if (e.field == 'PosmID' && e.record.data.PosmID != '' || e.field == 'DiscCode' && e.record.data.DiscCode != '') {
        e.record.set("TranAmt", 0);
    }
    if (e.field == "RcptQty") {
        if (objDetail.PurchaseType == "FA") {
            if (objDetail.RcptQty > 1) {
                HQ.message.show(58, '', '');
                return;
            }
        }
        StkQty = Math.round((objDetail.RcptMultDiv == "D" ? (objDetail.RcptQty / objDetail.RcptConvFact) : (objDetail.RcptQty * objDetail.RcptConvFact)));
        if (checkPromoOrPOSMItem(e.record.data.PurchaseType, e.record.data.DiscCode, e.record.data.ClassID)) {
            e.record.set("TranAmt", 0);
        } else {
            e.record.set("TranAmt", objDetail.RcptQty * objDetail.UnitCost - getDiscAmt(objDetail, objDetail.UnitCost));
        }
        e.record.set("ExtWeight", StkQty * objDetail.UnitWeight);
        e.record.set("ExtVolume", StkQty * objDetail.UnitVolume);
        
        if (App.cboRcptType.value == 'X' && App.cboRcptFrom.value == 'DR' && e.record.data.RcptQty > 0) {
            if (Object.keys(e.record.modified).length > 0) {
                showLot(e.record);
            }
        }
    }
    else if (e.field == "UnitWeight") {
        StkQty = Math.round((objDetail.RcptMultDiv == "D" ? (objDetail.RcptQty / objDetail.RcptConvFact) : (objDetail.RcptQty * objDetail.RcptConvFact)));
        e.record.set("ExtWeight", StkQty * objDetail.UnitWeight);
        calcDet();
    }
    else if (e.field == "UnitCost") {
        if (checkPromoOrPOSMItem(e.record.data.PurchaseType, e.record.data.DiscCode, e.record.data.ClassID)) {
            e.record.set("TranAmt", 0);
        } else {
            e.record.set("TranAmt", objDetail.RcptQty * objDetail.UnitCost - getDiscAmt(objDetail, objDetail.UnitCost));
        }
        //cap nhat lai don vi gia cho lot trans
        App.stoLotTrans.clearFilter();
        App.stoLotTrans.data.each(function (item) {
            if (item.data.POTranLineRef == objDetail.LineRef) {
                item.data.SiteID = objDetail.SiteID;
                item.data.InvtID = objDetail.InvtID;
                item.data.UnitDesc = objDetail.RcptUnitDescr;
                item.data.UnitCost = objDetail.UnitCost;
                item.data.UnitPrice = objDetail.UnitCost;
                item.data.CnvFact = objDetail.RcptConvFact;
                item.data.UnitMultDiv = objDetail.RcptMultDiv;
                
            }
        });
    }
    else if (e.field == "UnitVolume") {
        StkQty = Math.round((objDetail.RcptMultDiv == "D" ? (objDetail.RcptQty / objDetail.RcptConvFact) : (objDetail.RcptQty * objDetail.RcptConvFact)));
        e.record.set("ExtVolume", StkQty * objDetail.UnitVolume);
        calcDet();
    }
    else if (e.field == "DocDiscAmt") {
        if (e.record.data.ClassID != _discountClassID && e.value > objDetail.UnitCost * objDetail.RcptQty) {
            e.record.set("DocDiscAmt", 0);
        } else {
            e.record.set("DocDiscAmt", e.value);
        }
        if (checkPromoOrPOSMItem(e.record.data.PurchaseType, e.record.data.DiscCode, e.record.data.ClassID)) {
            e.record.set("TranAmt", 0);
        } else {
            e.record.set("TranAmt", objDetail.RcptQty * objDetail.UnitCost - getDiscAmt(objDetail, objDetail.UnitCost));
        }

    }
    else if (e.field == "DiscPct") {     
      if (checkPromoOrPOSMItem(e.record.data.PurchaseType, e.record.data.DiscCode, e.record.data.ClassID)) {
            e.record.set("TranAmt", 0);
        } else {
            e.record.set("TranAmt", objDetail.RcptQty * objDetail.UnitCost - getDiscAmt(objDetail, objDetail.UnitCost));
        }
    }
    else if ((e.field == "PurchaseType" || e.field == "RcptUnitDescr" || e.field == "InvtID") && objDetail.PurchaseType != "PR" && objDetail.PurchaseType != 'DP') {
        if (_objPO_Setup.DfltLstUnitCost == "A" || _objPO_Setup.DfltLstUnitCost == "L") {
            HQ.common.showBusy(true);
            App.direct.PO10200ItemSitePrice(
                App.cboBranchID.getValue(), objDetail.InvtID, objDetail.SiteID,
                {
                   success: function (result) {
                        _objIN_ItemSite = result;
                        UnitCost = result == null ? 0 : (_objPO_Setup.DfltLstUnitCost == "A" ? result.AvgCost : result.LastPurchasePrice);
                        UnitCost = Math.round((objDetail.RcptMultDiv == "D" ? (UnitCost / objDetail.RcptConvFact) : (UnitCost * objDetail.RcptConvFact)));
                        if (e.field != "SiteID") {
                            e.record.set("UnitCost", UnitCost);
                        }                       
                        e.record.set("DocDiscAmt", HQ.util.mathRound((UnitCost * objDetail.RcptQty * objDetail.DiscPct) / 100, 2));
                        e.record.set("TranAmt", UnitCost * objDetail.RcptQty - getDiscAmt(objDetail, UnitCost));
                        //cap nhat lai don vi gia cho lot trans
                        App.stoLotTrans.clearFilter();
                        App.stoLotTrans.data.each(function (item) {
                           if (item.data.POTranLineRef == objDetail.LineRef) {
                                item.data.SiteID= objDetail.SiteID;
                                item.data.InvtID= objDetail.InvtID;
                                item.data.UnitDesc = objDetail.RcptUnitDescr;
                                if (e.field != "SiteID") {
                                    item.data.UnitCost = objDetail.UnitCost;
                                    item.data.UnitPrice = objDetail.UnitCost;
                                }                                
                                item.data.CnvFact= objDetail.RcptConvFact;
                                item.data.UnitMultDiv = objDetail.RcptMultDiv;
                               
                            }                                                                            
                       });
                        delTax(e.record);
                        calcTax(e.record);
                        if (e.field != "SiteID") {
                            calcTaxTotal();
                        }                       
                        HQ.common.showBusy(false);
                   },
                   failure: function (result) {
                       HQ.common.showBusy(false);
                   }                          
               });
        }
        else if (_objPO_Setup.DfltLstUnitCost == "P") {
            HQ.common.showBusy(true);
            App.direct.PO10200POPrice(
               App.cboBranchID.getValue(), objDetail.InvtID, objDetail.RcptUnitDescr, Ext.Date.format(App.dtRcptDate.getValue(), 'Y-m-d'), Ext.Date.format(App.dtInvcDate.getValue(), 'Y-m-d'),
                {
                    success: function (result) {
                        UnitCost = result;
                        if (e.field != "SiteID") {
                            e.record.set("UnitCost", result);
                        }                        
                        e.record.set("DocDiscAmt", HQ.util.mathRound((result * objDetail.RcptQty * objDetail.DiscPct) / 100, 2));
                        e.record.set("TranAmt", result * objDetail.RcptQty - getDiscAmt(objDetail, UnitCost));// objDetail.DocDiscAmt);
                        App.stoLotTrans.clearFilter();
                        App.stoLotTrans.data.each(function (item) {
                            if (item.data.POTranLineRef == objDetail.LineRef) {
                                item.data.SiteID = objDetail.SiteID;
                                item.data.InvtID = objDetail.InvtID;
                                item.data.UnitDesc = objDetail.RcptUnitDescr;
                                item.data.UnitCost = objDetail.UnitCost;
                                item.data.UnitPrice = objDetail.UnitCost;
                                item.data.CnvFact = objDetail.RcptConvFact;
                                item.data.UnitMultDiv = objDetail.RcptMultDiv;
                                
                            }
                        });
                        delTax(e.record);
                        calcTax(e.record);
                        calcTaxTotal();
                        HQ.common.showBusy(false);                       
                    },
                    failure: function (result) {
                        HQ.common.showBusy(false);
                    }
                });
        }
        else if (_objPO_Setup.DfltLstUnitCost == "I") {
            var UnitCost = objIN_Inventory.POPrice;
            UnitCost = Math.round((objDetail.RcptMultDiv == "D" ? (UnitCost / objDetail.RcptConvFact) : (UnitCost * objDetail.RcptConvFact)));
            if (e.field != "SiteID") {
                e.record.set("UnitCost", UnitCost);
            }            
            if (checkPromoOrPOSMItem(e.record.data.PurchaseType, e.record.data.DiscCode, e.record.data.ClassID)) {
                e.record.set("TranAmt", 0);
            } else {
                e.record.set("TranAmt", objDetail.RcptQty * UnitCost - getDiscAmt(objDetail, UnitCost));// objDetail.DocDiscAmt);
            }
            App.stoLotTrans.clearFilter();
            App.stoLotTrans.data.each(function (item) {
                if (item.data.POTranLineRef == objDetail.LineRef) {
                    item.data.SiteID = objDetail.SiteID;
                    item.data.InvtID = objDetail.InvtID;
                    item.data.UnitDesc = objDetail.RcptUnitDescr;
                    item.data.UnitCost = objDetail.UnitCost;
                    item.data.UnitPrice = objDetail.UnitCost;
                    item.data.CnvFact = objDetail.RcptConvFact;
                    item.data.UnitMultDiv = objDetail.RcptMultDiv;
                    
                }
            });
            delTax(e.record);
            calcTax(e.record);
            if (e.field != "SiteID") {
                calcTaxTotal();
            }
            
        }
    }
    else if (objDetail.PurchaseType == "PR" || objDetail.PurchaseType == 'DP') {
        if (e.field != "SiteID") {
            e.record.set("UnitCost", 0);
        }        
        e.record.set("TranAmt", 0);
        e.record.set("DocDiscAmt", 0);
        e.record.set("DiscPct", 0);
        delTax(e.record);
        calcTax(e.record);
        calcTaxTotal();
    }
    if (e.field == "DiscCode") {
        if (checkPromoOrPOSMItem(e.record.data.PurchaseType, e.record.data.DiscCode, e.record.data.ClassID)) {
            e.record.set("TranAmt", 0);
        } else {
            e.record.set("TranAmt", objDetail.RcptQty * objDetail.UnitCost - getDiscAmt(objDetail, objDetail.UnitCost));//objDetail.DocDiscAmt);
        }
        if (e.value != '') {
            e.record.set("DiscPct", 0);
            e.record.set("DocDiscAmt", 0);
        }
        delTax(e.record);
        calcTax(e.record);
        calcTaxTotal();
    } else if (e.record.data.ClassID == 'POSM') {
        e.record.set("DiscPct", 0);
        e.record.set("DocDiscAmt", 0);
        calcDet();
    }
    else if ( e.field == "RcptQty" || e.field == "DiscPct" || e.field == "DocDiscAmt" || e.field == "UnitCost" || e.field == "TaxCat" || e.field == "TaxID") {      
        delTax(e.record);
        calcTax(e.record);
        calcTaxTotal();
    }

    if (e.field == 'SiteID') {       
        App.stoLotTrans.clearFilter();
        var lslLot = App.stoLotTrans.snapshot || App.stoLotTrans.allData || App.stoLotTrans.data;
        if (lslLot != undefined) {
            for (var i = 0; i < lslLot.length; i++) {
                if (lslLot.items[i].data.POTranLineRef == e.record.data.LineRef) {
                    lslLot.items[i].data.SiteID = e.record.data.SiteID;
                    lslLot.items[i].data.WhseLoc = e.record.data.WhseLoc;
                    
                }
            }
        }        
        App.grdLot.view.refresh();       
    }
    if (e.field == 'WhseLoc') {
        App.stoLotTrans.clearFilter();
        var lslLot = App.stoLotTrans.snapshot || App.stoLotTrans.allData || App.stoLotTrans.data;
        if (lslLot != undefined) {
            for (var i = 0; i < lslLot.length; i++) {
                if (lslLot.items[i].data.POTranLineRef == e.record.data.LineRef) {
                    lslLot.items[i].data.SiteID = e.record.data.SiteID;
                    lslLot.items[i].data.WhseLoc = e.record.data.WhseLoc;
                    
                }
            }
        }
        App.grdLot.view.refresh();
    }
    frmChange();
    if (e.field == "InvtID" || e.field == "SiteID" || e.field == "RcptQty" || e.field == "RcptUnitDescr") {
        if (e.record.data.InvtID != "" && e.record.data.SiteID != "") {
            checkLoadQty(e.record);
        }        
    }
};
var grdPO_Trans_Deselect = function (item, e) {
   
    delTax(e.record);
    calcTaxTotal();
  
};
var grdPO_Trans_Reject = function (record) {
    App.stoLotTrans.clearFilter();
    if (App.slmPO_Trans.selected.length > 0) {
        var det = App.slmPO_Trans.selected.items[0].data;
        for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
            if (App.stoLotTrans.data.items[i].data.POTranLineRef == det.LineRef) {
                App.stoLotTrans.data.removeAt(i);
            }
        }
    }
    if (record.data.tstamp == '') {
        App.stoLotTrans.clearFilter();
        delTax(record);
        calcTaxTotal();
        App.grdPO_Trans.getStore().remove(record, App.grdPO_Trans);
        App.grdPO_Trans.getView().focusRow(App.grdPO_Trans.getStore().getCount() - 1);
        App.grdPO_Trans.getSelectionModel().select(App.grdPO_Trans.getStore().getCount() - 1);
    } else {   
        record.reject();
        delTax(record);
        calcTax(record);
        calcTaxTotal();     
    }
    frmChange();
};
var cboGInvtID_Change = function (item, newValue, oldValue) {

};

var slmPO_Trans_Select = function (slm, selRec, idx, eOpts) {
    if (selRec.data.InvtID != "") {
        checkLoadQty(selRec);
    }
    else {
        App.lblQtyAvail.setText("");
    }
}
{
    //cac store co param la branchID thi load lai sau khi cboBranchID thay doi
    var cboBranchID_Change = function (item, newValue, oldValue) {
        if (item.valueModels != null && App.cboBranchID.getValue() != null && !item.hasFocus) {//truong hop co chon branchid
            App.txtBranchName.setValue(App.cboBranchID.valueModels[0].data.BranchName);
            _cpnyID = App.cboBranchID.valueModels[0].data.BranchID;
            Ext.getBody().mask(HQ.common.getLang('loadingdata'));
            App.stoPO10200_pdOM_UserDefault.load(function () {
                App.stoPO10200_pdPO_Setup.load(function () {
                    App.cboVendID.getStore().load(function () {
                        App.cboSiteID.getStore().load(function () {
                            _objUserDflt = App.stoPO10200_pdOM_UserDefault.data.length > 0 ? App.stoPO10200_pdOM_UserDefault.getAt(0).data : { POSite: '', };
                            if (App.stoPO10200_pdPO_Setup.data.length == 0) {
                                if (item.hasFocus) {
                                    App.cboBatNbr.setValue('');
                                    App.stoHeader.reload(); 
                                }
                                HQ.message.show(20404, 'PO_Setup', '');
                                lockControl(true);
                                App.cboBranchID.setReadOnly(false);
                                HQ.common.showBusy(false);
                            }
                            else {
                                lockControl(false);
                                _objPO_Setup = App.stoPO10200_pdPO_Setup.getAt(0).data;
                                if (_objPO_Setup.AutoRef == 1) App.cboBatNbr.forceSelection = true;
                                else App.cboBatNbr.forceSelection = false;
                                App.cboBatNbr.getStore().load(function () {
                                    App.cboBatNbr.setValue('');
                                    App.stoHeader.reload(); 
                                });
                            }
                        });
                    });
                    //});
                });
            });
            App.cboPONbr.getStore().load(function () {
                if (item.hasFocus) App.cboPONbr.focus();

            });
        }
        else { //truong hop khong chon
            if (Ext.isEmpty(App.cboBranchID.getValue())) {
                App.txtBranchName.setValue('');
                _cpnyID = '';
                App.stoPO10200_pdPO_Setup.load(function () {
                    App.cboBatNbr.setValue('');

                    App.stoHeader.clearData();
                    stoHeader_Load(App.stoHeader);
                });
            }
            App.cboPONbr.getStore().clearData();
        }
        App.cboPONbr.store.reload();
        App.stoPO10200_pdIN_Inventory.reload();
        App.cboInvtID.store.reload();
        App.cboReason.store.reload();
    };
    var cboBranchID_Select = function (item, newValue, oldValue) {
        if (item.hasFocus) {
            App.txtBranchName.setValue(App.cboBranchID.valueModels[0].data.BranchName);
            _cpnyID = App.cboBranchID.valueModels[0].data.BranchID;
            Ext.getBody().mask(HQ.common.getLang('loadingdata'));
            App.stoPO10200_pdOM_UserDefault.load(function () {
                App.stoPO10200_pdPO_Setup.load(function () {
                    App.cboVendID.getStore().load(function () {
                        App.cboSiteID.getStore().load(function () {
                            _objUserDflt = App.stoPO10200_pdOM_UserDefault.data.length > 0 ? App.stoPO10200_pdOM_UserDefault.getAt(0).data : { POSite: '', };
                            if (App.stoPO10200_pdPO_Setup.data.length == 0) {
                                if (item.hasFocus) {
                                    App.cboBatNbr.setValue('');
                                    App.stoHeader.reload(); 
                                }
                                HQ.message.show(20404, 'PO_Setup', '');
                                lockControl(true);
                                App.cboBranchID.setReadOnly(false);
                                HQ.common.showBusy(false);
                            }
                            else {
                                lockControl(false);
                                _objPO_Setup = App.stoPO10200_pdPO_Setup.getAt(0).data;
                                if (_objPO_Setup.AutoRef == 1) App.cboBatNbr.forceSelection = true;
                                else App.cboBatNbr.forceSelection = false;
                                App.cboBatNbr.getStore().load(function () {
                                    App.cboBatNbr.setValue('');
                                    App.stoHeader.reload(); 
                                });
                            }

                        });
                    });
                });
            });
        }
        App.cboPONbr.store.reload();
    };
}
{
    var cboBatNbr_Change = function (item, newValue, oldValue) {

    };
    var cboBatNbr_Select = function (item) {
        if (item.valueModels != null && !App.stoHeader.loading) {
            App.stoHeader.reload(); 
        }
    };
    var cboBatNbr_Blur = function (item) {
        App.cboReason.store.reload();
    }
}
{
    var cboPONbr_Change = function (item, newValue, oldValue) {
        if (item.hasFocus) {
            if (HQ.util.passNull(newValue) == HQ.util.passNull(oldValue)) {
                return;
            }
            clearGridData();
        }
        if (HQ.isNew && item.valueModels != null && !App.stoPO10200_ppCheckingPONbr.loading && !Ext.isEmpty(newValue)) {
            loadGridData(item, newValue, oldValue);
        }
    };
    var cboPONbr_Select = function (item, newValue, oldValue) {
        if (item.hasFocus) {
            clearGridData();
        }
        if (HQ.isNew && item.valueModels != null && !App.stoPO10200_ppCheckingPONbr.loading && !Ext.isEmpty(newValue)) {
            loadGridData(item, newValue, oldValue);
        }
    };

    function clearGridData() {
        App.stoPO10200_pgDetail.clearData();
        App.stoPO10200_pgDetail.loadData([], false);
        App.grdPO_Trans.view.refresh();
        HQ.store.insertBlank(App.stoPO10200_pgDetail, _keys);
    }
    function loadGridData(item, newValue, oldValue) {
        App.stoPO10200_ppCheckingPONbr.load(function () {
            App.cboTerms.setValue(item.valueModels[0].data.Terms);
            App.cboVendID.setValue(item.valueModels[0].data.VendID);
            App.cboDocType.setValue(App.cboRcptType.getValue() == "R" ? _docTypeVO : "AD");
            if (!Ext.isEmpty(App.cboRcptType.getValue()) && App.cboRcptType.getValue() == "R") {
                App.stoPO10200_pdPODetailReceipt.load(function () {

                    App.stoPO10200_pdPODetailReceipt.data.each(function (det) {
                        det.data.FromPO10200 = true;
                        insertItemGrid(App.grdPO_Trans, det.data);
                    });
                    frmChange();
                    if (HQ.IntegrateERP) {
                        App.cboPONbr.setReadOnly(true);
                    }
                    else {
                        App.cboPONbr.setReadOnly(false);
                    }
                });
            } else {
                App.stoPO10200_pdPODetailReturn.load(function () {

                    App.stoPO10200_pdPODetailReturn.data.each(function (det) {
                        det.data.FromPO10200 = true;
                        insertItemGrid(App.grdPO_Trans, det.data);
                    });
                    frmChange();
                    if (HQ.IntegrateERP) {
                        App.cboPONbr.setReadOnly(true);
                    }
                    else {
                        App.cboPONbr.setReadOnly(false);
                    }
                });
            }
        });
    }
}
{
    function cboDocType_Change(item, newValue, oldValue) {
        setAllowBlankInvoice(item);
    };
    function cboDocType_Select(item, newValue, oldValue) {
        setAllowBlankInvoice(item);
    };
    function setAllowBlankInvoice(item) {
        if (HQ.requireInvoice) {
            var allowBlank = true;
            if (item.valueModels.length > 0 && item.valueModels[0].data.Code == _docTypeVO) {
                allowBlank = false;
            }
            App.txtInvcNbr.allowBlank = allowBlank;
            App.txtInvcNbr.validate();
            App.txtInvcNote.allowBlank = allowBlank;
            App.txtInvcNote.validate();
        }
    }
}
var dtInvcDate_Change = function (item) {
    if (item.hasFocus) {
        if (App.cboStatus.getValue() == _beginStatus && item.hasFocus) {
            App.dtRcptDate.setValue("");
            App.dtRcptDate.isValid();
        }
    }      
}

//cac store co param la VendID thi load lai sau khi VendID thay doi
var cboVendID_Change = function (item, newValue, oldValue) {
    App.stoPO10200_pdAP_VenDorTaxes.load(function () {
        App.cboTaxID.getStore().load(function () {         
            if (item.valueModels != null || !HQ.isNew) {//co chon cboVendID thi gan cboVendAddrID= gia tri chon                                   
                if (item.valueModels != null && Ext.isEmpty(App.cboBatNbr.getValue())) {
                    if (item.valueModels[0] != undefined) {
                        var objVendor = item.valueModels[0].data;
                        App.cboTerms.setValue(objVendor.Terms);
                    }
                    else  App.cboTerms.setValue('');
                }
            }               
        });
    });
}
var cboRcptType_Change = function (item, newValue, oldValue) {
    App.cboRcptFrom.store.reload();
    if (item.valueModels != null) {
        if (item.valueModels[0] != undefined) {
            if (item.valueModels[0].data.Code == "X")
            {
                App.cboReason.setReadOnly(App.cboStatus.getValue() != _beginStatus);                
                App.cboReason.allowBlank = false;
                App.cboReason.validate();
                if (App.cboRcptFrom.getValue() == "PO")
                {
                    if (HQ.IntegrateERP) {
                        App.cboPONbr.allowBlank = true;
                    }
                    else {
                        App.cboPONbr.allowBlank = false;
                    }
                    
                    HQ.grid.show(App.grdPO_Trans, ["POLineRef",  "Qty", "UnitDescr"]);
                }
                else
                {
                    App.cboPONbr.allowBlank = true;
                    HQ.grid.hide(App.grdPO_Trans, ["POLineRef",   "Qty", "UnitDescr"]);
                }
                if (!HQ.requiredPONbr) {
                    App.cboPONbr.setReadOnly(true);
                    App.cboPONbr.allowBlank = true;                   
                }
                App.chkInTransit.disable();
            }
            else
            {
                App.cboReason.setReadOnly(true);
                App.cboReason.setValue('');
                App.cboReason.allowBlank = true;
                App.cboReason.validate();
                HQ.grid.hide(App.grdPO_Trans, ["POLineRef",   "Qty", "UnitDescr"]);
                if (App.cboRcptFrom.getValue() == "PO") {
                    if (HQ.IntegrateERP) {
                        App.cboPONbr.allowBlank = true;
                    }
                    else {
                        App.cboPONbr.allowBlank = false;
                    }
                    HQ.grid.show(App.grdPO_Trans, ["POLineRef", "Qty", "UnitDescr"]);
                }
                else {
                    HQ.grid.hide(App.grdPO_Trans, ["POLineRef",   "Qty", "UnitDescr"]);
                    App.cboPONbr.allowBlank = true;
                }
                App.chkInTransit.enable();
            }
            App.cboPONbr.validate();
            App.cboPONbr.getStore().load(function(){
            });                               
        }      
    }
    if (item.hasFocus) {
        App.cboRcptFrom.setValue('');
        if (App.cboRcptType.getValue() == "R")
        {
            App.cboDocType.setValue("VO");
        }
        else if (App.cboRcptType.getValue() == "X"){
            App.cboDocType.setValue("AD");
        }       
        
    }
}
var cboRcptFrom_Change = function (item, newValue, oldValue) {

    HQ.grid.hide(App.grdPO_Trans, ["POLineRef",   "Qty", "UnitDescr"]);
    if (item.valueModels != null) {
        if (item.valueModels[0] != undefined) {
            if (item.valueModels[0].data.Code == "DR" && (App.cboStatus.getValue() == null ? "H" : App.cboStatus.getValue() == "H")) {
                App.cboPONbr.setReadOnly(true);
                App.cboPONbr.setValue('');
                if (HQ.IntegrateERP) {
                    App.cboVendID.setReadOnly(true);
                } else {
                    App.cboVendID.setReadOnly(false);
                }
                
                App.cboPONbr.allowBlank = true;
                App.cboPONbr.validate();
                App.cboDocType.setValue(App.cboRcptType.getValue() == "R" ? "VO" : "AD");
                if (App.txtRcptNbr.value.length == 0) {
                    HQ.grid.hide(App.grdPO_Trans, ["POLineRef", "Qty", "UnitDescr"]);
                }
                if (item.hasFocus)
                    App.cboVendID.focus();               
            }
            else if (Ext.isEmpty(App.txtRcptNbr.getValue())) {
                App.cboVendID.setValue('');
                App.cboVendID.setReadOnly(true);
                if (HQ.IntegrateERP) {
                    App.cboPONbr.setReadOnly(true);
                    App.cboPONbr.allowBlank = true;
                } else {
                    if (HQ.requiredPONbr || App.cboRcptType.getValue() != "X") {
                        App.cboPONbr.setReadOnly(false);
                        App.cboPONbr.allowBlank = false;                    
                    } else {
                        App.cboPONbr.setReadOnly(true);
                        App.cboPONbr.allowBlank = true;
                    }
                }
                
                App.cboPONbr.validate();

                if (App.txtRcptNbr.value.length == 0) {
                    if (App.cboRcptType.getValue() == "X") {
                        HQ.grid.show(App.grdPO_Trans, ["POLineRef",  "Qty", "UnitDescr"]);
                    }
                    else {
                        HQ.grid.show(App.grdPO_Trans, ["POLineRef", "Qty", "UnitDescr"]);
                    }
                }

                App.cboPONbr.getStore().load(function () {
                    if (item.hasFocus) App.cboPONbr.focus();
                   
                });

            }
        } else App.cboPONbr.setReadOnly(true);
    } else App.cboPONbr.setReadOnly(true);

}

var cboStatus_Change = function (item, newValue, oldValue) {
    App.cboHandle.getStore().reload();
  
    if (newValue == 'H' && HQ.isInsert && HQ.isUpdate) {
        HQ.common.lockItem(App.frmMain, false);       
    }
    else HQ.common.lockItem(App.frmMain, true);
    {
        App.cboBranchID.setReadOnly(false);
        App.cboHandle.setReadOnly(false);
        App.cboBatNbr.setReadOnly(false);
    }
    setVisibleInvc();
};

var dtRcptDate_Focus = function (item, newValue, oldValue) {
    if (App.dtInvcDate.getValue() != null && App.dtInvcDate.getValue() != "") {
        App.dtRcptDate.setMinValue(App.dtInvcDate.getValue());
    }
};
var dtRcptDate_Blur = function (item, newValue, oldValue) {

};

// Expand SiteID
var cboSiteID_Expand = function (combo) {    
    if (HQ.IsChangeSiteID) {
        App.cboSiteID.store.clearFilter();
        if (App.grdPO_Trans.selModel.selected && App.grdPO_Trans.selModel.selected.items[0] && _objUserDflt) {
            var purchaseType = App.grdPO_Trans.selModel.selected.items[0].data.PurchaseType;
            if (purchaseType == 'PR' || purchaseType == 'GI') {
                var store = App.cboSiteID.store;
                if (purchaseType == 'PR') { // Khi ko có kho KM thì 
                    var findPRRecord = HQ.store.findRecord(App.cboSiteID.store, ['SiteType'], [purchaseType]);
                    if (findPRRecord && _objUserDflt.DiscSite && _objUserDflt.DiscSite != '') {
                        // Filter data -- Promo Site
                        store.filterBy(function (record) {
                            if (record) {
                                if (record.data['SiteType'].toString() == purchaseType) {
                                    return record;
                                }                                
                            }
                        });
                    } else {
                        // Filter data -- Main Site
                        store.filterBy(function (record) {
                            if (record) {
                                if (record.data['SiteType'].toString() == 'GI') {
                                    return record;
                                }
                            }
                        });
                    }
                } else {
                    // Filter data -- Main Site
                    store.filterBy(function (record) {
                        if (record) {
                            if (record.data['SiteType'].toString() == purchaseType) {
                                return record;
                            }                            
                        }
                    });
                }               
            }
        }
    }
};
var cboSiteID_Collapse = function (cbombo) {
    if (HQ.IsChangeSiteID) {
        App.cboSiteID.store.clearFilter();
    }
};
var txtcRcptQty_Change = function (sender) {
    if (App.cboRcptType.value != 'X') {
        var record = App.slmPO_Trans.selected.items[0];
        var objIN_Inventory = HQ.store.findInStore(App.stoPO10200_pdIN_Inventory, ["InvtID"], [record.data.InvtID]);
        if (objIN_Inventory) {
            if (objIN_Inventory.LotSerTrack != 'N' && !Ext.isEmpty(objIN_Inventory.LotSerTrack)) {
                showLot(record);
            }
        }
    }
}
var btnLot_Click = function (record) {
    showLot(this.record);  
}
var showLot = function (record) {
    App.winLot.invt = HQ.store.findInStore(App.stoPO10200_pdIN_Inventory, ['InvtID'], [record.data.InvtID]);
    App.stoLotTrans.clearFilter();
    App.stoLotTrans.filter('POTranLineRef', record.data.LineRef);
    if (!Ext.isEmpty(record.data.InvtID) && !Ext.isEmpty(record.data.RcptUnitDescr) && App.winLot.invt.LotSerTrack != 'N' && !Ext.isEmpty(App.winLot.invt.LotSerTrack)) {
        _classID = record.data.ClassID;
        _stkUnit = record.data.RcptUnitDescr;
        _invtID = record.data.InvtID;
        _lineRef = record.data.LineRef;
        _siteID = record.data.SiteID;
        _whseLoc = record.data.WhseLoc;
        PopupWinLot.showLot(record);
    }
}

//// Import data
var ImportData = function () {
    var url = HQ.export4KIDO ? 'PO10200/ImportDet4KIDO' : 'PO10200/ImportDet';
    try {
        App.frmMain.submit({
            waitMsg: HQ.common.getLang("Importing"),
            url: url,
            timeout: 1800000,
            clientValidation: false,
            method: 'POST',
            params: {
                lstDet: HQ.store.getAllData(App.stoPO10200_pgDetail)
            },
            success: function (msg, data) {
                App.cboBatNbr.getStore().load(function () {
                    if (data.result._branchIDImp) {
                        App.cboBranchID.setValue(data.result._branchIDImp);
                    }
                    if (data.result._batNbrImp) {
                        App.cboBatNbr.setValue(data.result._batNbrImp);
                    }
                    
                    App.stoHeader.reload();
                });
                if (!Ext.isEmpty(this.result.msgCode)) {
                    HQ.message.show('20121418', '', '', true);
                }
                else {
                    HQ.message.process(msg, data, true);
                }

            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
                App.btnImport.reset();
            }
        });
    } catch (ex) {
        alert(ex.message);
    }
};
var btnImport_Click = function (fup, newValue, oldValue, eOpts) {
    var fileName = fup.getValue();
    var ext = fileName.split(".").pop().toLowerCase();
    if (ext == "xls" || ext == "xlsx" || ext == "xlsm") {
        ImportData();
    } else {
        alert("Please choose a Media! (.xls, .xlsx)");
        fup.reset();
    }
}
///////DataProcess///
function save(b714, b235) {//mess714 khi huy    
    if (App.txtAfterTaxAmt.getValue() < 0) {
        HQ.message.show(2017020603, [''], '', true);
        return; 
    }

    var hasData = false;
    var i = 0;
    var flat = null;
    var allRecords = App.stoPO10200_pgDetail.snapshot || App.stoPO10200_pgDetail.allData || App.stoPO10200_pgDetail.data;
    allRecords.each(function (item) {
        i++;
        if (!Ext.isEmpty(item.data.InvtID)) {
            hasData = true;
            if (Ext.isEmpty(item.data.PurchaseType)) {
                HQ.message.show(2015020808, [getTextByColumnName(App.grdPO_Trans, 'PurchaseType'), ''], '', true);
                flat = item;
                return false;
            }
            if (HQ.showWhseLoc == 2) {
                if (Ext.isEmpty(item.data.WhseLoc)) {
                    HQ.message.show(2015020808, [getTextByColumnName(App.grdPO_Trans, 'WhseLoc'), ''], '', true);
                    flat = item;
                    return false;
                }
            }
            if (Ext.isEmpty(item.data.TranDesc)) {
                HQ.message.show(2015020808, [getTextByColumnName(App.grdPO_Trans, 'TranDesc'), ''], '', true);
                flat = item;
                return false;
            }
            if (Ext.isEmpty(item.data.SiteID)) {
                HQ.message.show(2015020808, [getTextByColumnName(App.grdPO_Trans, 'SiteID'), ''], '', true);
                flat = item;
                return false;
            }
            if (Ext.isEmpty(item.data.RcptUnitDescr)) {
                HQ.message.show(2015020808, [getTextByColumnName(App.grdPO_Trans, 'RcptUnitDescr'), ''], '', true);
                flat = item;
                return false;
            }
            if (item.data.ClassID == 'POSM' && Ext.isEmpty(item.data.PosmID)) {
                HQ.message.show(2016033001, [i], '', true);
                flat = item;
                return false;
            }
            if (item.data.FromPO10200 == true) {
                if (item.data.PurchaseType == 'PR' && Ext.isEmpty(item.data.DiscCode)) {
                    HQ.message.show(746, '', '', true);
                    flat = item;
                    return false;
                } else if (item.data.PurchaseType == _DPPurchageType && Ext.isEmpty(item.data.DiscCode)) {
                    HQ.message.show(2018082201, [HQ.grid.findColumnNameByIndex(App.grdPO_Trans.columns, 'DiscCode')], '', true);
                    flat = item;
                    return false;
                }
            }
            if (item.data.FromPO10200 == true && item.data.ClassID != 'POSM' && item.data.ClassID != _discountClassID && (item.data.PurchaseType != 'PR' && item.data.PurchaseType != _DPPurchageType) && !Ext.isEmpty(item.data.DiscCode)) {
                HQ.message.show(2017020602, [i], '', true);
                flat = item;
                return false;
            }
            if (item.data.ClassID == _discountClassID) {
                if (item.data.DocDiscAmt == 0) {
                    HQ.message.show(2015020808, [getTextByColumnName(App.grdPO_Trans, 'DocDiscAmt') + '(' + HQ.common.getLang('Line') + ' ' + i + ')', ''], '', true);
                    flat = item;
                    return false;
                }
            }
        }
    });

    if (!Ext.isEmpty(flat)) {
        App.slmPO_Trans.select(App.stoPO10200_pgDetail.indexOf(flat));
        return;
    }
    if (!hasData) {
        HQ.message.show(704);
        return false;
    }

    var invcNote = App.txtInvcNote.getValue();
    var invcNbr = App.txtInvcNbr.getValue();
    App.frmMain.getForm().updateRecord();
    App.stoLotTrans.clearFilter();
    if (App.frmMain.isValid()) {
        App.frmMain.submit({
            waitMsg: HQ.common.getLang('SavingData'),
            method: 'POST',
            url: 'PO10200/Save',
            timeout: 1800000,
            params: {
                lstLot: Ext.encode(App.stoLotTrans.getRecordsValues()),
                lstDet: Ext.encode(App.stoPO10200_pgDetail.getRecordsValues()),
                lstHeader: Ext.encode(App.stoHeader.getRecordsValues()),
                invcNote: invcNote,
                invcNbr: invcNbr,
                b714: b714 == undefined ? false : true,
                b235: b235 == undefined ? false : true
            },
            success: function (msg, data) {
                var batNbr = '';
                App.cboPONbr.store.reload();
                if (this.result.data != undefined && this.result.data.batNbr != null) {
                    batNbr = this.result.data.batNbr;                  
                }
                
                HQ.message.process(msg, data, true);
                   
                App.cboBatNbr.getStore().load(function () {
                    App.cboBatNbr.setValue(batNbr);
                    App.stoHeader.reload();
                });                              
            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
            }
        });
    }
};
function process714(item) {
    if (item == 'yes') {
        save(true,true);
    }
}
function process235(item) {
    if (item == 'yes') {
        save(false,true);
    }
}
function deleteHeader(item) {
    if (item == 'yes') {
        if (App.frmMain.isValid()) {
            App.frmMain.submit({
                waitMsg: HQ.common.getLang('DeletingData'),
                method: 'POST',
                url: 'PO10200/DeleteHeader',
                timeout: 180000,
                params: {
                    lstHeader: Ext.encode(App.stoHeader.getRecordsValues())

                },
                success: function (msg, data) {
                    HQ.message.process(msg, data, true);                   
                    App.cboBatNbr.getStore().load(function () {
                        HQ.isFirstLoad = true;
                        App.cboBatNbr.setValue('');
                        App.stoHeader.reload();
                    });
                },
                failure: function (msg, data) {
                    HQ.message.process(msg, data, true);
                }
            });
        }
    }
};
var deleteRecordGrid = function (item) {
    if (item == "yes") {
        if (item == 'yes') {
            if (App.slmPO_Trans.selected.items[0].data.tstamp != "") {
               
               
                App.stoLotTrans.clearFilter();
                var det = App.slmPO_Trans.selected.items[0].data;
                for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
                    if (App.stoLotTrans.data.items[i].data.POTranLineRef == det.LineRef) {
                        App.stoLotTrans.data.removeAt(i);
                    }
                }
                delTax(App.slmPO_Trans.selected.items[0]);
                App.grdPO_Trans.deleteSelected();
                calcDet();
                App.frmMain.getForm().updateRecord();
                if (App.frmMain.isValid()) {
                    App.frmMain.submit({
                        waitMsg: HQ.common.getLang('DeletingData'),
                        method: 'POST',
                        url: 'PO10200/DeleteGrd',
                        timeout: 180000,
                        params: {
                            lstDel: HQ.store.getData(App.stoPO10200_pgDetail),
                            lstDet: Ext.encode(App.stoPO10200_pgDetail.getRecordsValues()),
                            lstHeader: Ext.encode(App.stoHeader.getRecordsValues()),
                            lstLot: Ext.encode(App.stoLotTrans.getRecordsValues())
                        },
                        success: function (msg, data) {
                            HQ.message.process(msg, data, true);
                            var batNbr = '';                          
                            if (this.result.data != undefined && this.result.data.batNbr != null) {
                                batNbr = this.result.data.batNbr;
                               
                            }
                            App.cboBatNbr.getStore().load(function () {
                                App.cboBatNbr.setValue(batNbr);
                                refresh('yes');
                            });
                        },
                        failure: function (msg, data) {
                            HQ.message.process(msg, data, true);                          
                        }
                    });
                }
            }
            else {
                App.stoLotTrans.clearFilter();
                var det = App.slmPO_Trans.selected.items[0].data;
                for (i = App.stoLotTrans.data.items.length - 1; i >= 0; i--) {
                    if (App.stoLotTrans.data.items[i].data.POTranLineRef == det.LineRef) {
                        App.stoLotTrans.data.removeAt(i);
                    }
                }
                delTax(App.slmPO_Trans.selected.items[0]);
                App.grdPO_Trans.deleteSelected();
                calcDet();
             
            }
            frmChange();
        }
    }
};

var btnExport_Click = function () {
    var url = HQ.export4KIDO ? 'PO10200/Export4KIDO' : 'PO10200/Export';
    App.frmMain.submit({
        url: url,
        type: 'POST',
        timeout: 1000000,
        clientValidation: false,
        params: {
            inputDate: getRcptDate()
        },
        success: function (msg, data) {
            alert('sus');
        },
        failure: function (msg, data) {
            HQ.message.process(msg, data, true);
        }
    });
};
var insertItemGrid = function (grd, item, isCancelUpdateTax) {
    var objDetail = App.stoPO10200_pgDetail.data.items[App.stoPO10200_pgDetail.getCount() - 1];
   
    var valueTax = '';
    var objInvtID = HQ.store.findRecord(App.cboInvtID.store, ['InvtID'], [item.InvtID]);
    App.cboTaxID.getStore().data.each(function (det) {
        valueTax += det.data.taxid + ',';

    });
    valueTax = valueTax.length > 0 ? valueTax.substring(0, valueTax.length - 1) : '';

    objDetail.set('CnvFact', item.CnvFact);
    objDetail.set("CostID", item.CostID);
    objDetail.set("CostVouched", item.CostVouched);
    objDetail.set("DiscPct", item.DiscPct);
    objDetail.set("DocDiscAmt", item.DocDiscAmt);
    objDetail.set("ExtVolume", item.ExtVolume);
    objDetail.set("MaxReturnQty", item.RcptQty);

    objDetail.set('ExtWeight', item.ExtWeight);
    objDetail.set('InvtID', item.InvtID);
    objDetail.set('JrnlType', item.JrnlType);
    objDetail.set('LineRef', item.LineRef);
    objDetail.set('OrigRcptDate', item.OrigRcptDate);
    objDetail.set('OrigRcptNbr', item.OrigRcptNbr);
    objDetail.set('OrigRetRcptNbr', item.OrigRetRcptNbr);

    objDetail.set('POLineRef', item.POLineRef);
    objDetail.set('PONbr', item.PONbr);
    objDetail.set('POOriginal', item.POOriginal);
    objDetail.set('PurchaseType', item.PurchaseType);
    objDetail.set("Qty", item.Qty);

    objDetail.set('QtyVouched', item.QtyVouched);
    objDetail.set('RcptConvFact', item.RcptConvFact);
    objDetail.set('RcptDate', item.RcptDate);

    objDetail.set('RcptFee', item.RcptFee);
    objDetail.set('RcptMultDiv', item.RcptMultDiv);
    objDetail.set('RcptNbr', item.RcptNbr);

    objDetail.set('RcptQty', item.RcptQty);
    objDetail.set('RcptUnitDescr', item.RcptUnitDescr);
    objDetail.set('ReasonCD', item.ReasonCD);
    objDetail.set('SiteID', item.SiteID);
    objDetail.set('WhseLoc', item.WhseLoc);
    objDetail.set('TaxAmt00', item.TaxAmt00);
    objDetail.set('TaxAmt01', item.TaxAmt01);

    objDetail.set('TaxAmt02', item.TaxAmt02);
    objDetail.set('TaxAmt03', item.TaxAmt03);
    objDetail.set('TaxCat', item.TaxCat);
    objDetail.set('TaxID', item.TaxID);
    objDetail.set('TaxID00', item.TaxID00);
    objDetail.set('TaxID01', item.TaxID01);
    objDetail.set('TaxID02', item.TaxID02);
    objDetail.set('TaxID03', item.TaxID03);
    objDetail.set('TranAmt', item.TranAmt);

    objDetail.set('TranDate', item.TranDate);
    objDetail.set('TranDesc', item.TranDesc);

    objDetail.set('TranType', item.TranType);

    objDetail.set('TxblAmt00', item.TxblAmt00);
    objDetail.set('TxblAmt01', item.TxblAmt01);
    objDetail.set('TxblAmt02', item.TxblAmt02);
    objDetail.set('TxblAmt03', item.TxblAmt03);

    objDetail.set('UnitCost', item.UnitCost);
    objDetail.set('UnitDescr', item.UnitDescr);
    objDetail.set('UnitMultDiv', item.UnitMultDiv);
    objDetail.set('UnitVolume', item.UnitVolume);

    objDetail.set('UnitWeight', item.UnitWeight);
    objDetail.set('VendID', item.VendID);
    objDetail.set('VouchStage', item.VouchStage);
    objDetail.set('DiscCode', item.DiscCode);

    
    objDetail.set('ClassID', objInvtID ? objInvtID.data.ClassID : '');
   
    if (isCancelUpdateTax == undefined) {
        delTax(objDetail);
        calcTax(objDetail);
        calcTaxTotal();
    } else {
        objDetail.set('FromPO10200', item.FromPO10200);
    }
    if (HQ.Project == 'PT')
    {
        objDetail.set('FromPO10200', true);
    } else {
        objDetail.set('FromPO10200', item.FromPO10200);
    }
    HQ.store.insertBlank(App.stoPO10200_pgDetail, _keys);
};
//////////////////////////////////////////////////////////////////
//// Function ////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//Cal tax
function calcDet(abortTax) {
    var taxAmt00 = 0;
    var taxAmt01 = 0;
    var taxAmt02 = 0;
    var taxAmt03 = 0;

    var taxAmt = 0;
    var txblAmtTot = 0;

    var txblAmtTot00 = 0.0;
    var txblAmtTot01 = 0.0;
    var txblAmtTot02 = 0.0;
    var txblAmtTot03 = 0.0;
   
    var extvol = 0;
    var extwei = 0;
    var extCost = 0;
    var discount = 0;
    var poFee = 0;
    var RcptConvFact = 0;
    var CTN = 0;
    var PCS = 0;
    var qty = 0;
    var lstdata = App.stoPO10200_pgDetail.allData ? App.stoPO10200_pgDetail.allData : App.stoPO10200_pgDetail.data;
    var record = App.stoHeader.getAt(0).data;
    if (abortTax == undefined) {
        record.TaxAmtTot00 = 0;
        record.TaxAmtTot01 = 0;
        record.TaxAmtTot02 = 0;
        record.TaxAmtTot03 = 0;
        record.TaxID00 = '';
        record.TaxID01 = '';
        record.TaxID02 = '';
        record.TaxID03 = '';
    }    
    record.TxblAmtTot00 = 0;    
    record.TxblAmtTot01 = 0;    
    record.TxblAmtTot02 = 0;    
    record.TxblAmtTot03 = 0;    

    for (var j = 0; j < lstdata.length; j++) {
        var det = lstdata.items[j];
        taxAmt00 += det.data.TaxAmt00;
        taxAmt01 += det.data.TaxAmt01;
        taxAmt02 += det.data.TaxAmt02;
        taxAmt03 += det.data.TaxAmt03;
        if (det.data.ClassID == 'POSM' || det.data.DiscCode != '' || det.PurchaseType == 'PR') {

        } else {
            txblAmtTot00 += det.data.TaxAmt00 == 0 ? det.data.TranAmt : det.data.TxblAmt00;
        }
        
        txblAmtTot01 += det.data.TxblAmt01;
        txblAmtTot02 += det.data.TxblAmt02;
        txblAmtTot03 += det.data.TxblAmt03;



        poFee += Math.round((det.data.RcptMultDiv == "D" ? (det.data.RcptQty / det.data.RcptConvFact) : (det.data.RcptQty * det.data.RcptConvFact))) * det.data.RcptFee;
        extCost += det.data.TranAmt;
        if (det.data.DocDiscAmt > 0) {
            discount += det.data.DocDiscAmt;
        } else if (det.data.DiscPct > 0) {
            discount += HQ.util.mathRound((det.data.RcptQty * det.data.UnitCost * det.data.DiscPct) / 100, 2);
        }       
        qty += det.data.RcptQty;     
    };
    if (abortTax == undefined) {
        for (var j = 0; j < App.stoPO10200_LoadTaxDoc.data.items.length; j++) {
            var det = App.stoPO10200_LoadTaxDoc.data.items[j];
            if (j == 0) {
                record.TaxAmtTot00 = det.data.TaxAmt;
                record.TaxID00 = det.data.TaxID;
            }
            else if (j == 1) {
                record.TaxAmtTot01 = det.data.TaxAmt;
                record.TaxID01 = det.data.TaxID;
            }
            else if (j == 2) {
                record.TaxAmtTot02 = det.data.TaxAmt;
                record.TaxID02 = det.data.TaxID;
            }
            else if (j == 3) {
                record.TaxAmtTot03 = det.data.TaxAmt;
                record.TaxID03 = det.data.TaxID;
            }
        };
    }
   
    record.TxblAmtTot00 = txblAmtTot00;
    record.TxblAmtTot01 = txblAmtTot01;
    record.TxblAmtTot02 = txblAmtTot02;
    record.TxblAmtTot03 = txblAmtTot03;

    txblAmtTot = txblAmtTot00 + txblAmtTot01 + txblAmtTot02 + txblAmtTot03;
    taxAmt = record.TaxAmtTot00 + record.TaxAmtTot01 + record.TaxAmtTot02 + record.TaxAmtTot03;


    if(App.cboStatus.getValue()!="V")
        App.txtTotAmt.setValue(Math.round(taxAmt, 0) + Math.round(txblAmtTot, 0) + Math.round(poFee, 0));
    record.RcptTotAmt = (Math.round(taxAmt, 0) + Math.round(txblAmtTot, 0) + Math.round(poFee, 0));
    
    App.txtRcptAmtTot.setValue(Math.round(txblAmtTot, 0) + Math.round(poFee, 0));
    App.txtRcptQtyTot.setValue(Math.round(qty, 0));
    App.txtDiscAmt.setValue(Math.round(discount, 0));
    App.txtRcptTot.setValue(Math.round(extCost, 0));
    App.txtTaxAmt.setValue(Math.round(taxAmt, 0));
    App.txtRcptFeeTot.setValue(Math.round(poFee, 0));
    App.txtAfterTaxAmt.setValue(Math.round(taxAmt, 0) + Math.round(txblAmtTot, 0) + Math.round(poFee, 0));

}
function delTaxMutil() {

    for (var i = App.stoPO10200_pgLoadTaxTrans.data.length - 1; i >= 0; i--) {
        var data = HQ.store.findInStore(App.stoPO10200_pgDetail, ['LineRef'], [App.stoPO10200_pgLoadTaxTrans.data.items[i].data.LineRef])
        if (!data) App.stoPO10200_pgLoadTaxTrans.data.removeAt(i);
    }
    calcTaxTotal();
};
function delTax(record) {
    var lineRef = record.data.LineRef;

    for (var j = App.stoPO10200_pgLoadTaxTrans.data.length - 1; j >= 0; j--) {
        if (App.stoPO10200_pgLoadTaxTrans.data.items[j].data.LineRef == lineRef)
            App.stoPO10200_pgLoadTaxTrans.data.removeAt(j);
    }
    clearTax(record);
    calcTaxTotal();   
    return true;

}
function clearTax(record) {
    record.set('TaxID00', '');
    record.set('TaxAmt00', 0);
    record.set('TxblAmt00', 0);

    record.set('TaxID01', '');
    record.set('TaxAmt01', 0);
    record.set('TxblAmt01', 0);

    record.set('TaxID02', '');
    record.set('TaxAmt02', 0);
    record.set('TxblAmt02', 0);

    record.set('TaxID03', '');
    record.set('TaxAmt03', 0);
    record.set('TxblAmt03', 0);
}
function calcTax(record) {
    
    var det = record.data;
    if (!record) return true;

    var dt = [];
    if (det.TaxID == "*") {
        for (var j = 0; j < App.stoPO10200_pdAP_VenDorTaxes.data.length; j++) {
            var item = App.stoPO10200_pdAP_VenDorTaxes.data.items[j];
            dt.push(item.data);
        };
    }
    else {
        var strTax = det.TaxID.split(',');
        if (strTax.length > 0) {
            for (var k = 0; k < strTax.length; k++) {
                for (var j = 0; j < App.stoPO10200_pdAP_VenDorTaxes.data.length; j++) {
                    if (strTax[k] == App.stoPO10200_pdAP_VenDorTaxes.data.items[j].data.taxid) {
                        dt.push(App.stoPO10200_pdAP_VenDorTaxes.data.items[j].data);
                        break;
                    }
                }
            }
        }
        else {
            if (Ext.isEmpty(det.TaxID) || Ext.isEmpty(det.TaxCat))
                App.stoPO10200_pgDetail.data.items[i].set('TxblAmt00', det.TranAmt);
            return false;
        }
    }

    var taxCat = det.TaxCat;
    var prcTaxInclRate = 0, totPrcTaxInclAmt = 0, txblAmtL1 = 0, txblAmtAddL2 = 0;
    for (var j = 0; j < dt.length; j++) {
        var objTax = HQ.store.findInStore(App.stoPO10200_pdAP_VenDorTaxes, ['taxid'], [dt[j].taxid]);
        if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                       && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                       && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {

                if (objTax.TaxCalcLvl == "1" && objTax.PrcTaxIncl != "0") {
                    prcTaxInclRate = prcTaxInclRate + objTax.TaxRate;
                }
            }
        }
    }


    if (prcTaxInclRate == 0)
        txblAmtL1 = Math.round(det.TranAmt, 0);
    else
        txblAmtL1 = Math.round((det.TranAmt) / (1 + prcTaxInclRate / 100), 0);


    record.set('TxblAmt00', txblAmtL1);

    for (var j = 0; j < dt.length; j++) {

        var taxID = "", lineRef = "";
        var taxRate = 0, taxAmtL1 = 0;
        var objTax = HQ.store.findInStore(App.stoPO10200_pdAP_VenDorTaxes, ['taxid'], [dt[j].taxid]);
        if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                       && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                       && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {
                if (objTax.TaxCalcLvl == "1") {
                    taxID = dt[j].taxid;
                    lineRef = det.LineRef;
                    taxRate = objTax.TaxRate;
                    taxAmtL1 = HQ.util.mathRound(txblAmtL1 * objTax.TaxRate / 100, 2); 

                    if (objTax.Lvl2Exmpt == 0) txblAmtAddL2 += txblAmtL1;

                    if (objTax.PrcTaxIncl != "0") {
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

                            if (totPrcTaxInclAmt + taxAmtL1 + txblAmtL1 != det.TranAmt)
                                taxAmtL1 = HQ.util.mathRound(det.TranAmt - (totPrcTaxInclAmt + txblAmtL1), 2);

                        }
                        else
                            totPrcTaxInclAmt += totPrcTaxInclAmt + taxAmtL1;
                    }

                    insertUpdateTax(taxID, lineRef, taxRate, taxAmtL1, txblAmtL1, 1);

                }
            }
        }
    }

    for (var j = 0; j < dt.Count; j++) {
        var taxID = "", lineRef = "";
        var taxRate = 0, txblAmtL2 = 0, taxAmtL2 = 0;
        var objTax = HQ.store.findInStore(App.stoPO10200_pdAP_VenDorTaxes, ['taxid'], [dt[j].taxid]);
        if (!Ext.isEmpty(objTax) && !Ext.isEmpty(taxCat)) {
            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                       && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                       && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat))) {
                if (objTax.TaxCalcLvl == "2") {
                    taxID = dt[j].taxid;
                    lineRef = det.LineRef;
                    taxRate = objTax.TaxRate;
                    txblAmtL2 = Math.round(txblAmtAddL2 + txblAmtL1, 0);
                    taxAmtL2 = HQ.util.mathRound(txblAmtAddL2 * objTax.TaxRate / 100,2);
                    insertUpdateTax(taxID, lineRef, taxRate, taxAmtL2, txblAmtL2, 2);
                }
            }
        }
    }
    updateTax(record);
   
    return true;
}
function insertUpdateTax(taxID, lineRef, taxRate, taxAmt, txblAmt, taxLevel) {
    var flat = false;
    for (var i = 0; i < App.stoPO10200_pgLoadTaxTrans.data.length; i++) {
        if (App.stoPO10200_pgLoadTaxTrans.data.items[i].data.taxid == taxID && App.stoPO10200_pgLoadTaxTrans.data.items[i].data.LineRef == lineRef) {
            var tax = App.stoPO10200_pdAP_VenDorTaxes.data.items[i];
            tax.set('BranchID', _cpnyID),
            tax.set('TaxID', taxID);
            tax.set('LineRef', lineRef);
            tax.set('TaxRate', taxRate);
            tax.set('TaxLevel', taxLevel.toString());
            tax.set('TaxAmt', taxAmt)
            tax.set('TxblAmt', txblAmt);
            flat = true;
            break;
        }
    }
    if (!flat) {
        var newTax = Ext.create('App.ModelPO10200_pgLoadTaxTrans_Result');
        newTax.data.BranchID = _cpnyID;
        newTax.data.TaxID = taxID;
        newTax.data.LineRef = lineRef;
        newTax.data.TaxRate = taxRate;
        newTax.data.TaxLevel = taxLevel.toString();
        newTax.data.TaxAmt = taxAmt;
        newTax.data.TxblAmt = txblAmt;

        App.stoPO10200_pgLoadTaxTrans.data.add(newTax);
    }
    App.stoPO10200_pgLoadTaxTrans.sort('LineRef', "ASC");
   
}
function updateTax(record) {

    if (!record) return;
    var j = 0;
    var det = record.data;
    for (var i = 0; i < App.stoPO10200_pgLoadTaxTrans.data.length; i++) {
        var item = App.stoPO10200_pgLoadTaxTrans.data.items[i];
        if (item.data.LineRef == det.LineRef) {
            if (j == 0) {
                record.set('TaxID00', item.data.TaxID);
                record.set('TxblAmt00', item.data.TxblAmt);
                record.set('TaxAmt00', item.data.TaxAmt);
            }
            else if (j == 1) {
                record.set('TaxID01', item.data.TaxID);
                record.set('TxblAmt01', item.data.TxblAmt);
                record.set('TaxAmt01', item.data.TaxAmt);
            }
            else if (j == 2) {
                record.set('TaxID02', item.data.TaxID);
                record.set('TxblAmt02', item.data.TxblAmt);
                record.set('TaxAmt02', item.data.TaxAmt);
            }
            else if (j == 3) {
                record.set('TaxID03', item.data.TaxID);
                record.set('TxblAmt03', item.data.TxblAmt);
                record.set('TaxAmt03', item.data.TaxAmt);
            }
            j++;
        }
        if (j != 0 && item.data.LineRef != det.LineRef)
            return false;
    };

}
function calcTaxTotal() {
    App.stoPO10200_LoadTaxDoc.clearData();
    var flat = false;
    for (var i = 0; i < App.stoPO10200_pgLoadTaxTrans.data.length; i++) {
        var tax = App.stoPO10200_pgLoadTaxTrans.data.items[i];
        flat = true;
        for (var j = 0; j < App.stoPO10200_LoadTaxDoc.data.length; j++) {
            var taxDoc = App.stoPO10200_LoadTaxDoc.data.items[j];
            if ( tax.data.TaxID == taxDoc.data.TaxID) {
                taxDoc.data.TxblAmt += tax.data.TxblAmt;
                taxDoc.data.TaxAmt += tax.data.TaxAmt;
                flat = false;
                taxDoc.commit();
                break;
            }
        };
        if (flat) {
            var newTaxDoc = Ext.create('App.mdlPO10200_pgLoadTaxTransDoc');
            newTaxDoc.data.BranchID = tax.data.BranchID;
            newTaxDoc.data.RcptNbr = tax.data.RcptNbr;
            newTaxDoc.data.TaxID = tax.data.TaxID;
            newTaxDoc.data.TaxAmt = tax.data.TaxAmt;
            newTaxDoc.data.TaxRate = tax.data.TaxRate;
            newTaxDoc.data.TxblAmt = tax.data.TxblAmt;

            App.stoPO10200_LoadTaxDoc.data.add(newTaxDoc);
        }

    };
    App.grdTaxTrans.getView().refresh(false);
    App.grdTaxDoc.getView().refresh(false);
    calcDet();
}

function lastLineRef(store) {
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
}
function setUOM(invtID, classID, stkUnit, fromUnit) {
    if (!Ext.isEmpty(fromUnit)) {
        var data = HQ.store.findInStore(App.stoPO10200_pdIN_UnitConversion, ['UnitType', 'ClassID', 'InvtID', 'FromUnit', 'ToUnit'], ["3", "*", invtID, fromUnit, stkUnit]);
        if (!Ext.isEmpty(data)) {
            return data;
        }

        data = HQ.store.findInStore(App.stoPO10200_pdIN_UnitConversion, ['UnitType', 'ClassID', 'InvtID', 'FromUnit', 'ToUnit'], ["2", classID, "*", fromUnit, stkUnit]);
        if (!Ext.isEmpty(data)) {
            return data;
        }

        data = HQ.store.findInStore(App.stoPO10200_pdIN_UnitConversion, ['UnitType', 'ClassID', 'InvtID', 'FromUnit', 'ToUnit'], ["1", "*", "*", fromUnit, stkUnit]);
        if (!Ext.isEmpty(data)) {
            return data;
        }
        HQ.message.show(25, invtID, '');
        return null;
    }
    return null;
};
function oM_GetCnvFactToUnit(invtID, unitDesc) {
    var cnvFact = 1;
    var data;
    App.stoPO10200_pdIN_UnitConversion.data.each(function (item) {
        if (item.data.InvtID == invtID && item.data.FromUnit != unitDesc && item.data.ToUnit == unitDesc) {
            data = item;
            return;
        }
    });
    if (data != null) {
        if (data.data.MultDiv == "D")
            cnvFact = 1 / data.data.CnvFact;
        else
            cnvFact = data.data.CnvFact;
    }

    return cnvFact;
};
     
//// Other Functions ////////////////////////////////////////////////////
function lockControl(isLock) {
    HQ.common.lockItem(App.frmMain, isLock);
    if (HQ.IntegrateERP) {
        App.txtAPRefNbr.setReadOnly(true);
        App.txtAPBatNbr.setReadOnly(true);
        App.dtDocDate.setReadOnly(true);
        App.cboTerms.setReadOnly(true);
        App.cboTerms.allowBlank = true;
        App.cboTerms.isValid();
    }
    
}
function refresh(item) {
    if (item == 'yes') {
        HQ.isChange = false;
        App.cboBatNbr.getStore().load(function () {
            App.stoHeader.reload(); 
        });
    }
};

function checkSave(item) {
    if (item == 'yes') {
        save();
    }
};

function disableComboAddress() {
    App.cboDistAddr.setValue("");
    App.cboShipSiteID.setValue("");
    App.cboShipCustID.setValue("");
    App.cboShiptoID.setValue("");
    App.cboShipVendID.setValue("");
    App.cboShipVendAddrID.setValue("");
    App.cboShipAddrID.setValue("");

    App.cboDistAddr.disable(false);
    App.cboShipSiteID.disable(true);
    App.cboShipCustID.disable(true);
    App.cboShiptoID.disable(true);
    App.cboShipVendID.disable(true);
    App.cboShipVendAddrID.disable(true);
    App.cboShipAddrID.disable(true);
}
function reSetValueAddress() {
    App.txtShipName.setValue("");
    App.txtShipAttn.setValue("");
    App.txtShipAddr1.setValue("");
    App.txtShipAddr2.setValue("");
    App.cboShipCity.setValue("");
    App.cboShipState.setValue("");
    App.txtShipZip.setValue("");
    App.cboShipCountry.setValue("");
    App.cboShipVia.setValue("");
    App.txtShipPhone.setValue("");
    App.txtShipFax.setValue("");
    App.txtShipEmail.setValue("");
}
var renderPurchaseType = function (value) {
    var obj = App.PurchaseType.getStore().findRecord("Code", value);
    if (obj) {
        return obj.data.Descr;
    }
    return value;
};
var renderVouchStage = function (value) {
    var obj = App.VouchStage.getStore().findRecord("Code", value);
    if (obj) {
        return obj.data.Descr;
    }
    return value;
};
var renderRcptStage = function (value) {
    var obj = App.RcptStage.getStore().findRecord("Code", value);
    if (obj) {
        return obj.data.Descr;
    }
    return value;
};
var renderSiteID = function (value) {
    var obj = App.cboSiteID.getStore().findRecord("SiteID", value);
    if (obj) {
        return obj.data.Name;
    }
    return value;
};
var renderWhseLoc = function (value) {
    var obj = App.cboWhseLoc.getStore().findRecord("Code", value);
    if (obj) {
        return obj.data.Descr;
    }
    return value;
};
var renderTaxID = function (value) {

};
// Get default SiteID
function getDefaultSiteID(purchaseType) {
    var defaultSiteID = '###';
    if (_objUserDflt) {        
        if (purchaseType == 'PR') {
            defaultSiteID = _objUserDflt.DiscSite && _objUserDflt.DiscSite != '' ? _objUserDflt.DiscSite : '';
            var objSite = HQ.store.findRecord(App.cboSiteID.store, ['SiteID', 'SiteType'], [defaultSiteID, purchaseType]);
            if (!objSite) {
                var newSite = HQ.store.findRecord(App.cboSiteID.store, ['SiteType'], [purchaseType]);
                if (newSite) {
                    defaultSiteID = newSite.data.SiteID;
                }
                else {
                    var newGISite = HQ.store.findRecord(App.cboSiteID.store, ['SiteID', 'SiteType'], [defaultSiteID, 'GI']);
                    if (newGISite) {
                        defaultSiteID = newGISite.data.SiteID;
                    }
                    else {
                        var newFirstGISite = HQ.store.findRecord(App.cboSiteID.store, ['SiteType'], ['GI']);
                        if (newFirstGISite) {
                            defaultSiteID = newFirstGISite.data.SiteID;
                        } else {
                            defaultSiteID = '';
                        }                        
                    }                    
                }
            }
        } else if (purchaseType == 'GI') {            
            defaultSiteID = _objUserDflt.POSite;
            var objSite = HQ.store.findRecord(App.cboSiteID.store, ['SiteID', 'SiteType'], [defaultSiteID, purchaseType]);
            if (!objSite) {
                var newSite = HQ.store.findRecord(App.cboSiteID.store, ['SiteType'], [purchaseType]);
                if (newSite) {
                    defaultSiteID = newSite.data.SiteID;
                }
                else {
                    defaultSiteID = '';
                }
            } 
        }        
    }
    return defaultSiteID;
}
// Check POSM or PromoItem
function checkPromoOrPOSMItem(purchaseType, discCode, classID) {
    return (HQ.util.passNull(purchaseType) == 'PR' || HQ.util.passNull(discCode) || HQ.util.passNull(classID) == 'POSM');
}

// Get DiscAmt 
function getDiscAmt(objDetail, unitCost) {
    if (objDetail.DiscPct != undefined && objDetail.DiscPct != 0) {
        return HQ.util.mathRound((unitCost * objDetail.RcptQty * objDetail.DiscPct) / 100, 2);
    } else if (objDetail.DocDiscAmt != undefined && objDetail.DocDiscAmt != 0) {
        return objDetail.DocDiscAmt;
    }
    return 0;
}
var setVisibleInvc = function () {    

}

findColumnNameByIndex = function (columns, dataIndex) {
    var index = HQ.grid.findColumnIndex(columns, dataIndex);
    return index != -1 ? columns[index].text : dataIndex;
}
// Get rcpt date
function getRcptDate() {
    if (App.dtRcptDate.getValue()) {
        return Ext.Date.format(App.dtRcptDate.getValue(), 'm-d-Y')
    } else {
        return Ext.Date.format(HQ.bussinessDate, 'm-d-Y')
    }    
};

var getTextByColumnName = function (grd, dataIndex) {
    return grd.columns[HQ.grid.findColumnIndex(grd.columns, dataIndex)].text;
}

var PopupWinLot = {
    showLot: function (record) {
        App.lblLotQtyAvail.setText('');
        App.cbocolLotUnitDesc.getStore().reload();
        _classID = record.data.ClassID;
        _stkUnit = record.data.RcptUnitDescr;
        _invtID = record.data.InvtID;
        
        var lock = !((App.cboBatNbr.value && HQ.isUpdate) || (!App.cboBatNbr.value && HQ.isInsert)) || App.cboStatus.getValue() != "H";
        App.grdLot.isLock = lock;
        App.stoLotTrans.clearFilter();
        var lslLot = App.stoLotTrans.snapshot || App.stoLotTrans.allData || App.stoLotTrans.data;
        if (lslLot != undefined) {
            for (var i = 0; i < lslLot.length; i++) {
                if (lslLot.items[i].data.POTranLineRef == record.data.LineRef) {
                    lslLot.items[i].data.SiteID = record.data.SiteID;
                    lslLot.items[i].data.WhseLoc = record.data.WhseLoc;
                    if (lslLot.items[i].data.WarrantyDate != null && lslLot.items[i].data.WarrantyDate != '') {
                        if (lslLot.items[i].data.WarrantyDate.getFullYear() == 1900) {
                            lslLot.items[i].data.WarrantyDate = '';
                        }
                    }
                }
            }
        }

        App.winLot.setTitle(record.data.InvtID + ' - ' + record.data.SiteID + ' - ' + record.data.RcptUnitDescr);
        App.winLot.record = record;
        App.stoLotTrans.clearFilter();
        App.stoLotTrans.filter('POTranLineRef', record.data.LineRef);
        App.grdLot.view.refresh();
        if (App.cboStatus.getValue() == "H" && App.cboRcptType.value != null && App.cboRcptType.getValue() == "X" && record.data.RcptQty > 0) {
            var flat = false;
            var lslLotTrans = App.stoLotTrans.snapshot || App.stoLotTrans.allData || App.stoLotTrans.data;
            for (var i = 0; i < lslLotTrans.length; i++) {
                if (lslLotTrans.items[i].data.InvtID == record.data.InvtID && lslLotTrans.items[i].data.POTranLineRef == record.data.LineRef && !Ext.isEmpty(lslLotTrans.items[i].data.LotSerNbr)) {
                    flat = true;
                    break;
                }
            }
            if (flat == true) {
                PopupWinLot.addNewLot(record.data);
                App.btnLotDel.setVisible((HQ.allowEditGridDetail && !HQ.IntegrateERP));
                App.grdLot.view.refresh();
                App.winLot.show();
                App.cboLotSerNbr.getStore().reload();
                return false;
            }

            setTimeout(function () {
                    HQ.common.showBusy(true, HQ.waitMsg); 
                    var det = record.data;
                    var rcData = record;
                    var needQty = Math.round(det.UnitMultDiv == "M" ? det.RcptQty * det.CnvFact : det.RcptQty / det.CnvFact);      
                    var dtLotSerNbr = App.cboLotSerNbr.store.snapshot || App.cboLotSerNbr.store.allData || App.cboLotSerNbr.store.data;
                    dtLotSerNbr.each(function (item) {
                        var newQty = 0;
                        var curQty = 0;
                        App.stoLotTrans.data.each(function (item2) {
                            if (item2.data.LotSerNbr == item.data.LotSerNbr && item2.data.InvtID == item.data.InvtID && item2.data.SiteID == item.data.SiteID) {
                                curQty += item2.data.UnitMultDiv == "M" ? item2.data.RcptQty * item2.data.CnvFact : item2.data.RcptQty * item2.data.CnvFact;
                            }
                        });

                        if (Math.round(item.data.Qty - curQty) == 0) return true;

                        if ((item.data.Qty - curQty) >= needQty) {
                            newQty = needQty;
                            needQty = 0;
                        }
                        else {
                            newQty = (item.data.Qty - curQty);
                            needQty -= (item.data.Qty - curQty);
                        }
                        if (newQty != 0) {
                            var newLot = Ext.create('App.mdlLotTrans');
                            newLot.data.BranchID = App.cboBranchID.getValue();
                            newLot.data.LotSerNbr = item.data.LotSerNbr;
                            newLot.data.ExpDate = item.data.ExpDate;
                            if (item.data.WarrantyDate != null && item.data.WarrantyDate != '') {
                                if (item.data.WarrantyDate.getFullYear() == 1900) {
                                    newLot.data.WarrantyDate = '';
                                } else {
                                    newLot.data.WarrantyDate = item.data.WarrantyDate;
                                }
                            }
                            newLot.data.POTranLineRef = det.LineRef;
                            newLot.data.TranScr = 'PO';
                            newLot.data.TranType = App.cboRcptType.getValue();
                            newLot.data.WhseLoc = det.WhseLoc;
                            newLot.data.UnitPrice = det.UnitCost;
                            newLot.data.UnitCost = det.UnitCost;
                            newLot.data.MfcDate = HQ.bussinessDate;
                            newLot.data.SiteID = det.SiteID;
                            newLot.data.InvtID = det.InvtID;
                            newLot.data.InvtMult = -1;
                            if ((det.UnitMultDiv == "M" ? newQty / det.CnvFact : newQty * det.CnvFact) % 1 > 0) {
                                newLot.data.CnvFact = 1;
                                newLot.data.UnitMultDiv = 'M';
                                newLot.data.Qty = newQty;
                                newLot.data.UnitDesc = det.RcptUnitDescr;
                            } else {
                                newLot.data.Qty = Math.round(det.UnitMultDiv == "M" ? newQty / det.CnvFact : newQty * det.CnvFact);
                                newLot.data.CnvFact = det.CnvFact;
                                newLot.data.UnitMultDiv = det.UnitMultDiv;
                                newLot.data.UnitDesc = det.UnitDescr;
                            }
                            newLot.commit();
                            App.stoLotTrans.insert(App.stoLotTrans.getCount(), newLot);
                        }

                        if (needQty == 0) {
                            return false;
                        }
                    });
                    App.stoLotTrans.commitChanges();
                    PopupWinLot.addNewLot(record.data);
                    App.grdLot.view.refresh();
                    HQ.common.showBusy(false);
            },600);
        } else {
            PopupWinLot.addNewLot(record.data);
            App.grdLot.view.refresh();
        }
        App.btnLotDel.setVisible((HQ.allowEditGridDetail && !HQ.IntegrateERP));
        App.grdLot.view.refresh();
        App.winLot.show();
        App.cboLotSerNbr.getStore().reload();
    },
    btnLotOK_Click: function () {
        setTimeout(function () {
            HQ.common.showBusy(false);
            var recordTran = App.winLot.record.data;

            var flat = null;
            App.stoLotTrans.data.each(function (item) {
                if (App.cboStatus.getValue() == "H") {

                    if (!Ext.isEmpty(item.data.LotSerNbr)) {
                        if (item.data.Qty == 0 && !HQ.EditLineQty) {
                            if (App.cboRcptType.getValue() == "X") {
                                App.smlLot.select(App.stoLotTrans.indexOf(item));
                                App.grdLot.deleteSelected();
                            }
                            else {
                                HQ.message.show(1000, [HQ.common.getLang('qty')], '', true);
                                flat = item;
                                return false;
                            }
                        }

                        if (Ext.isEmpty(item.data.UnitDesc)) {
                            HQ.message.show(1000, [HQ.common.getLang('unitDesc')], '', true);
                            flat = item;
                            return false;
                        }

                        if (Ext.isEmpty(item.data.UnitMultDiv)) {
                            HQ.message.show(2525, [item.data.InvtID], '', true);
                            flat = item;
                            return false;
                        }
                    }
                    else if (item.data.Qty == 0) {
                        if (App.cboRcptType.getValue() == "X" && !HQ.EditLineQty) {
                            App.smlLot.select(App.stoLotTrans.indexOf(item));
                            App.grdLot.deleteSelected();
                        }
                    }
                    else if (item.data.Qty > 0) {
                        HQ.message.show(1000, [HQ.common.getLang('LotSerNbr')], '', true);
                        flat = item;
                        return false;
                    }
                    
                    if (!Ext.isEmpty(item.data.LotSerNbr) && item.data.Qty > 0 && (Ext.isEmpty(item.data.ExpDate) || item.data.ExpDate == null)) {
                        HQ.message.show(1000, [HQ.common.getLang('ExpDate')], '', true);
                        flat = item;
                        return false;
                    }

                    if (!Ext.isEmpty(item.data.LotSerNbr) && item.data.Qty > 0 && (!Ext.isEmpty(item.data.ExpDate) || item.data.ExpDate != null)) {
                        if (item.data.ExpDate.getFullYear() <= 1900) {
                            HQ.message.show(2020050401, [HQ.common.getLang('ExpDate')], '', true);
                            flat = item;
                            return false;
                        }
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
                    if (item.data.SiteID == recordTran.SiteID && item.data.InvtID == recordTran.InvtID && item.data.POTranLineRef == recordTran.LineRef) {
                        qty += item.data.UnitMultDiv == "M" ? item.data.Qty * item.data.CnvFact : item.data.Qty / item.data.CnvFact;
                    }
                }

            });

            if (App.cboRcptType.getValue() == "X" && HQ.EditLineQty) {
                if (qty > App.winLot.record.data.MaxReturnQty) {
                    HQ.message.show(2018071911, App.winLot.record.data.MaxReturnQty, '');
                    return ;
                }
                if (qty == 0) {
                    HQ.message.show(2018072511, '', '');
                    return false;
                }
            }
            var RcptQty = (recordTran.UnitMultDiv == "M" ? qty / recordTran.RcptConvFact : recordTran.RcptQty * recordTran.RcptConvFact)
            if (RcptQty % 1 > 0) {
                App.winLot.record.data.RcptQty = qty;
                App.winLot.record.data.RcptUnitDescr = App.winLot.record.invt.StkUnit;
                App.winLot.record.data.RcptConvFact = 1;
                App.winLot.record.data.UnitMultDiv = "M";
               
            
                if (recordTran.PurchaseType=="PR")
                {
                    App.winLot.record.set("UnitCost", 0);
                    App.winLot.record.set("TranAmt", 0);
                    App.winLot.record.set("DocDiscAmt", 0);
                    App.winLot.record.set("DiscPct", 0);
                    App.winLot.record.commit();
                    delTax(App.winLot.record);
                    calcTax(App.winLot.record);
                    calcTaxTotal();
                    HQ.common.showBusy(false);
                }
                else if (_objPO_Setup.DfltLstUnitCost == "A" || _objPO_Setup.DfltLstUnitCost == "L") {
                    HQ.common.showBusy(true);
                    App.direct.PO10200ItemSitePrice(
                        App.cboBranchID.getValue(), recordTran.InvtID, recordTran.SiteID,
                       {
                           success: function (result) {
                               _objIN_ItemSite = result;
                               UnitCost = result == null ? 0 : (_objPO_Setup.DfltLstUnitCost == "A" ? result.AvgCost : result.LastPurchasePrice);
                               UnitCost = Math.round((recordTran.RcptMultDiv == "D" ? (UnitCost / recordTran.RcptConvFact) : (UnitCost * recordTran.RcptConvFact)));
                               App.winLot.record.set("UnitCost", UnitCost);
                               if (checkPromoOrPOSMItem(recordTran.PurchaseType, recordTran.DiscCode, recordTran.ClassID)) {
                                   App.winLot.record.set("TranAmt", 0);
                               } else {
                                   App.winLot.record.set("TranAmt", UnitCost * recordTran.RcptQty - getDiscAmt(recordTran, UnitCost));
                               }
                               App.winLot.record.commit();
                               delTax(App.winLot.record);
                               calcTax(App.winLot.record);
                               calcTaxTotal();
                               HQ.common.showBusy(false);
                           },
                           failure: function (result) {
                               HQ.common.showBusy(false);
                           }
                       });
                }
                else if (_objPO_Setup.DfltLstUnitCost == "P") {
                    HQ.common.showBusy(true);
                    App.direct.PO10200POPrice(
                       App.cboBranchID.getValue(), recordTran.InvtID, recordTran.RcptUnitDescr, Ext.Date.format(App.dtRcptDate.getValue(), 'Y-m-d'), Ext.Date.format(App.dtInvcDate.getValue(), 'Y-m-d'),
                        {
                            success: function (result) {
                                UnitCost = result;
                                App.winLot.record.set("UnitCost", result);
                                if (checkPromoOrPOSMItem(recordTran.PurchaseType, recordTran.DiscCode, recordTran.ClassID)) {
                                    App.winLot.record.set("TranAmt", 0);
                                } else {
                                    App.winLot.record.set("TranAmt", result * recordTran.RcptQty - getDiscAmt(recordTran, UnitCost));
                                }
                                App.winLot.record.commit();
                                delTax(App.winLot.record);
                                calcTax(App.winLot.record);
                                calcTaxTotal();
                                HQ.common.showBusy(false);

                            },
                            failure: function (result) {
                                HQ.common.showBusy(false);
                            }
                        });

                }
                else if (_objPO_Setup.DfltLstUnitCost == "I") {
                    var UnitCost = objIN_Inventory.POPrice;
                    UnitCost = Math.round((recordTran.RcptMultDiv == "D" ? (UnitCost / recordTran.RcptConvFact) : (UnitCost * recordTran.RcptConvFact)));
                    App.winLot.record.set("UnitCost", UnitCost);
                    if (checkPromoOrPOSMItem(recordTran.PurchaseType, recordTran.DiscCode, recordTran.ClassID)) {
                        App.winLot.record.set("TranAmt", 0);
                    } else {
                        App.winLot.record.set("TranAmt", UnitCost * recordTran.RcptQty - getDiscAmt(recordTran, UnitCost));
                    }
                    App.winLot.record.commit();
                    delTax(App.winLot.record);
                    calcTax(App.winLot.record);
                    calcTaxTotal();
                }
            } else {
                App.winLot.record.data.RcptQty = Math.round(RcptQty);
                if (checkPromoOrPOSMItem(recordTran.PurchaseType, recordTran.DiscCode, recordTran.ClassID)) {
                    App.winLot.record.set("TranAmt", 0);
                } else {
                    App.winLot.record.set("TranAmt", App.winLot.record.data.UnitCost * recordTran.RcptQty - getDiscAmt(recordTran, App.winLot.record.data.UnitCost));
                }
                App.winLot.record.commit();
                delTax(App.winLot.record);
                calcTax(App.winLot.record);
                calcTaxTotal();
            }
            App.winLot.record.set("ExtWeight", recordTran.UnitWeight * recordTran.RcptQty);
            App.winLot.record.set("ExtVolume", recordTran.UnitVolume * recordTran.RcptQty);
            checkLoadQty(App.winLot.record);
            App.winLot.hide();
        }, 300);

    },
    btnLotDel_Click: function () {
        if ((App.cboBatNbr.value && HQ.isUpdate) || (!App.cboBatNbr.value && HQ.isInsert)) {
            if (App.cboStatus.getValue() != "H") {
                HQ.message.show(2015020805, [App.cboBatNbr.value], '', true);
                return;
            }
            if (App.cboRcptType.getValue() == "R" || (App.cboRcptType.getValue() != "R" && App.cboRcptFrom.getValue() == "DR") || (App.cboRcptType.getValue() != "R" && App.cboRcptFrom.getValue() == "PO" && HQ.EditLineQty)) {
                if (App.smlLot.selected.items.length != 0) {
                    if (!Ext.isEmpty(App.smlLot.selected.items[0].data.LotSerNbr)) {
                        HQ.message.show(2015020806, [App.smlLot.selected.items[0].data.InvtID + ' ' + App.smlLot.selected.items[0].data.LotSerNbr], 'PopupWinLot.deleteLot', true);
                    }
                }
            }            
        }
    },
    grdLot_BeforeEdit: function (item, e) {              
        var obj = e.record.data;
        App.lblLotQtyAvail.setText('');

        if (e.field == "Qty" || e.field == "LotSerNbr") {
            App.cboLotSerNbr.store.reload();
        }

        if (e.field == "WarrantyDate") {
            App.WarrantyDate.setMaxValue(obj.ExpDate);
        }

        if (e.field == "ExpDate") {
            App.ExpDate.setMinValue(obj.WarrantyDate);
        }
        
        if (App.grdLot.isLock || e.field == "UnitDesc" || (!HQ.allowEditGridDetail && !HQ.IntegrateERP)) {
            return false;
        }
        if (!Ext.isEmpty(App.txtOrigBatNbr.getValue())) {
            if (App.cboRcptType.getValue() == "X" && HQ.EditLineQty &&( e.field == "Qty" || e.field == "LotSerNbr")) {

            }
            else {
                return false;
            }            
        }
        if (e.field == "Qty" && (e.record.data.LotSerNbr==""|| e.record.data.LotSerNbr==null) && App.cboRcptType.getValue()=="X" ) {
            return false;
        }
        var objLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [obj.LotSerNbr]);
        if (!Ext.isEmpty(objLot)) {
            var Qty = objLot.Qty;

            //App.lblLotQtyAvail.setText("Lot " + objLot.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound(Qty,2)) + " " + obj.UnitDesc);
            App.smlLot.selected.items[0].set("ExpDate", objLot.ExpDate);
        }
        else {
            App.lblLotQtyAvail.setText('');
        }

        if (e.field == 'LotSerNbr') {
            if (App.winLot.invt.LotSerRcptAuto==1 || App.cboRcptType.getValue() == 'X') App.cboLotSerNbr.forceSelection = true;
            else if (!App.winLot.invt.LotSerRcptAuto) App.cboLotSerNbr.forceSelection = false;
        }
      
        if (e.field == 'LotSerNbr' && !Ext.isEmpty(e.record.data.LotSerNbr)) return false;
       
        var det = App.winLot.record;
        if (!_objPO_Setup.EditablePOPrice && e.column.dataIndex == "UnitPrice") {
            return false;
        }
        if (Ext.isEmpty(det.LineRef)) {
            e.record.set('LineRef', lastLineRef(App.stoPO10200_pgDetail));
        }

        if (e.field == "ExpDate" || e.field == "WarrantyDate") {
            var objLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [obj.LotSerNbr]);
            if (objLot) return false;
        }
    },
    grdLot_SelectionChange: function (item, selected) {
        if (selected[0] == undefined) return false;
        var objLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [selected[0] == undefined ? "" : selected[0].data.LotSerNbr]);
        var qty = 0;
        if (!Ext.isEmpty(objLot)) {
            App.stoLotTrans.snapshot.each(function (item2) {
                if (item2.data.LotSerNbr == selected[0].data.LotSerNbr && item2.data.InvtID == selected[0].data.InvtID && item2.data.SiteID == selected[0].data.SiteID) {
                    qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
                }
            });

            var Qty = objLot.QtyAvail - qty;
            App.lblLotQtyAvail.setText("Lot" + objLot.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((selected[0].data.UnitMultDiv == "M" ? Qty / selected[0].data.CnvFact : Qty * selected[0].data.CnvFact), 2)) + " " + selected[0].data.UnitDesc);
            App.smlLot.selected.items[0].set("ExpDate", objLot.ExpDate);
        }
        else {
            App.lblLotQtyAvail.setText('');
        }
    },
    grdLot_Edit: function (item, e) {
        HQ.common.showBusy(true);
        var objDetail = e.record.data;
        
        var recordTran = App.winLot.record.data;
        var objIN_Inventory = App.winLot.invt;
        
        if (e.field == "WarrantyDate" && (objDetail.ExpDate == '' || objDetail.ExpDate == null)) {
            if (objDetail.WarrantyDate != '' && objDetail.WarrantyDate != null) {
                var expDate = new Date(objDetail.WarrantyDate.getFullYear(), objDetail.WarrantyDate.getMonth(), objDetail.WarrantyDate.getDate());
                if (expDate != undefined && expDate != null) {
                    var r = HQ.store.findInStore(App.cboInvtID.getStore(), ["InvtID"], [objDetail.InvtID]);
                    if (r) {
                        var shelfLife = r.ShelfLife;
                        e.record.set('ExpDate', expDate.addDays(shelfLife)); //cộng ngày
                    }
                    
                }
            }
        }

        if (e.field == "ExpDate" && (objDetail.WarrantyDate == '' || objDetail.WarrantyDate == null)) {
            if (objDetail.ExpDate != '' && objDetail.ExpDate != null) {
                var warrantyDate = new Date(objDetail.ExpDate.getFullYear(), objDetail.ExpDate.getMonth(), objDetail.ExpDate.getDate());
                if (warrantyDate != undefined && warrantyDate != null) {
                    var r = HQ.store.findInStore(App.cboInvtID.getStore(), ["InvtID"], [objDetail.InvtID]);
                    if (r) {
                        var shelfLife = r.ShelfLife;
                        e.record.set('WarrantyDate', warrantyDate.addDays(-shelfLife)); //trừ ngày
                    }  
                }
            }
        }

        if (e.field == "LotSerNbr") {
            if (App.cboRcptType.getValue() == "X" && HQ.EditLineQty) {
                for (i = 0; i < _lstDelete.length; i++) {
                    if (_lstDelete[i].data.LotSerNbr == e.value) {
                        e.record.set("MaxReturnQty", _lstDelete[i].data.MaxReturnQty)
                    }
                }
            }            
            e.record.set('')
            e.record.set('WhseLoc', recordTran.WhseLoc);
        }
        if (e.field == "UnitDesc") {
            var cnv = setUOM(objIN_Inventory.InvtID, objIN_Inventory.ClassID, objIN_Inventory.StkUnit, e.value);

            if (!Ext.isEmpty(cnv)) {

                e.record.set('CnvFact', cnv.CnvFact);
                e.record.set('UnitMultDiv', cnv.MultDiv);
            } else {
                e.record.set('UnitDesc', "");
                 HQ.common.showBusy(false, '', App.winLot);
                return;
            }
            if (_objPO_Setup.DfltLstUnitCost == "A" || _objPO_Setup.DfltLstUnitCost == "L") {
                HQ.common.showBusy(true, '', App.winLot);
                App.direct.PO10200ItemSitePrice(
                    App.cboBranchID.getValue(), recordTran.InvtID, recordTran.SiteID,
                   {
                       success: function (result) {
                           _objIN_ItemSite = result;
                           UnitCost = result == null ? 0 : (_objPO_Setup.DfltLstUnitCost == "A" ? result.AvgCost : result.LastPurchasePrice);
                           UnitCost = Math.round((objDetail.UnitMultDiv == "D" ? (UnitCost / objDetail.CnvFact) : (UnitCost * objDetail.CnvFact)));
                           e.record.set("UnitPrice", UnitCost);
                           HQ.common.showBusy(false, '', App.winLot);
                       },
                       failure: function (result) {
                           HQ.common.showBusy(false, '', App.winLot);
                       }

                   });
            }
            else if (_objPO_Setup.DfltLstUnitCost == "P") {
                HQ.common.showBusy(true, '', App.winLot);
                App.direct.PO10200POPrice(
                   App.cboBranchID.getValue(), recordTran.InvtID, objDetail.UnitDesc, Ext.Date.format(App.dtRcptDate.getValue(), 'Y-m-d'), Ext.Date.format(App.dtInvcDate.getValue(), 'Y-m-d'),
                    {
                        success: function (result) {
                            UnitCost = result;
                            e.record.set("UnitPrice", result);
                            HQ.common.showBusy(false, '', App.winLot);

                        },
                        failure: function (result) {
                            HQ.common.showBusy(false, '', App.winLot);
                        }
                    });

            }
            else if (_objPO_Setup.DfltLstUnitCost == "I") {
                var UnitCost = objIN_Inventory.POPrice;
                UnitCost = Math.round((objDetail.UnitMultDiv == "D" ? (UnitCost / objDetail.CnvFact) : (UnitCost * objDetail.CnnvFact)));
                e.record.set("UnitPrice", UnitCost);
            }

        }
        if (e.field == "Qty") {
            if (objDetail.PurchaseType == "FA") {
                if (objDetail.Qty > 1) {

                    HQ.message.show(58, '', '');
                    return false;

                }
            }
        }
        if (objDetail.PurchaseType == "PR") {
            e.record.set("UnitPrice", 0);
        }
        
        if (e.field == "Qty" && e.value > 0) {
            if (App.cboRcptType.getValue() != "X") {
                if (objIN_Inventory.LotSerRcptAuto || Ext.isEmpty(objDetail.LotSerNbr)) {
                    if (Ext.isEmpty(objDetail.LotSerNbr)) {
                        HQ.common.showBusy(true, '', App.winLot);
                        App.direct.INNumberingLot(
                            recordTran.InvtID, Ext.Date.format(App.dtRcptDate.getValue(), 'Y-m-d'), 'LotNbr',
                            {
                                success: function (result) {
                                    e.record.set("LotSerNbr", result);
                                    e.record.set('WhseLoc', recordTran.WhseLoc);
                                    e.record.set('SiteID', recordTran.SiteID);
                                    HQ.common.showBusy(false, '', App.winLot);
                                    if (!Ext.isEmpty(objDetail.LotSerNbr)) {
                                        PopupWinLot.addNewLot(recordTran);
                                    }

                                },
                                failure: function (result) {
                                    HQ.common.showBusy(false, '', App.winLot);
                                }
                            });

                    }
                }
                else if (!Ext.isEmpty(objDetail.LotSerNbr)) {
                    PopupWinLot.addNewLot(recordTran);
                }
            }
            else if (!Ext.isEmpty(objDetail.LotSerNbr)) {
                PopupWinLot.addNewLot(recordTran);
            }
        } else if (!Ext.isEmpty(objDetail.LotSerNbr)) {
            PopupWinLot.addNewLot(recordTran);
        }
        var qty = 0;
        var objLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [e.record.data.LotSerNbr]);
        if (!Ext.isEmpty(objLot)) {
            App.stoLotTrans.snapshot.each(function (item2) {
                if (item2.data.LotSerNbr == e.record.data.LotSerNbr && item2.data.InvtID == e.record.data.InvtID && item2.data.SiteID == e.record.data.SiteID) {
                    qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
                }
            });

            var Qty = objLot.QtyAvail - qty;
            App.lblLotQtyAvail.setText("Lot" + objLot.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound((e.record.data.UnitMultDiv == "M" ? Qty / e.record.data.CnvFact : Qty * e.record.data.CnvFact), 2)) + " " + e.record.data.UnitDesc);
            App.smlLot.selected.items[0].set("ExpDate", objLot.ExpDate);
        }
        else {
            App.lblLotQtyAvail.setText('');
        }
    },
    grdLot_ValidateEdit: function (item, e) {
        if (App.cboStatus.getValue() != "H") return false;
        var Qty = 0;
        var objdet = e.record;
        var recordTran = App.winLot.record.data;
        if (e.field == "LotSerNbr") {
            if (["LotSerNbr"].indexOf(e.field) != -1) {
                if (HQ.grid.checkDuplicate(App.grdLot, e, ["LotSerNbr", "POTranLineRef"])) {
                    HQ.message.show(1112, e.value, '');
                    return false;
                }
            }
            var objcboLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [e.value]);
            if (objcboLot) {
                App.smlLot.selected.items[0].set("ExpDate", objcboLot.ExpDate);
                if (objcboLot.WarrantyDate != null && objcboLot.WarrantyDate != '') {
                    if (objcboLot.WarrantyDate.getFullYear() == 1900) {
                        App.smlLot.selected.items[0].set("WarrantyDate", '');
                    } else {
                        App.smlLot.selected.items[0].set("WarrantyDate", objcboLot.WarrantyDate);
                    }
                }
            }

        }
        if (e.field == "Qty") {         
            var Qty = 0;
            Qty = e.record.data.UnitMultDiv == "M" ? e.value * e.record.data.CnvFact : e.value / e.record.data.CnvFact;
            if (App.cboRcptType.getValue() == "X" && (recordTran.PurchaseType == "GI" | recordTran.purchaseType == _ICPurchaseType | recordTran.PurchaseType == _DPPurchageType | recordTran.PurchaseType == "PR" | recordTran.PurchaseType == "GS")) {
                var objLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [objdet.data.LotSerNbr]);
                if (objLot) {
                    if (Qty > objLot.Qty) {
                        HQ.message.show(35, '', '');
                        objdet.set('Qty', 0);
                        return false;
                    }
                } else {
                    HQ.message.show(35, '', '');
                    objdet.set('Qty', 0);
                    return false;
                }
            }

            if (App.cboRcptType.getValue() == "X" && HQ.EditLineQty) {
                if (e.value > e.record.data.MaxReturnQty) {
                    HQ.message.show(35, '', '');
                    return false;
                }
            }
        }
    },
    cboLotTrans_Change: function (sender) {
        App.lblLotQtyAvail.setText('');
        if (App.cboRcptType.getValue() == "X") { 
            var objLot = HQ.store.findInStore(App.cboLotSerNbr.getStore(), ['LotSerNbr'], [sender.value]);
            if (!Ext.isEmpty(objLot)) {
                var obj = App.smlLot.selected.items[0].data;
                var Qty = objLot.Qty;
                App.lblLotQtyAvail.setText("Lot " + objLot.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound(Qty,2)) + " " + obj.UnitDesc);
                App.smlLot.selected.items[0].set("ExpDate", objLot.ExpDate);

                if (objLot.WarrantyDate != null && objLot.WarrantyDate != '') {
                    if (objLot.WarrantyDate.getFullYear() == 1900) {
                        App.smlLot.selected.items[0].set("WarrantyDate", '');
                    } else {
                        App.smlLot.selected.items[0].set("WarrantyDate", objLot.WarrantyDate);
                    }
                }
            }
            else {
                App.lblLotQtyAvail.setText("");
            }
        }
    },
    deleteLot: function (item) {
        var lstDel = App.grdLot.selModel.selected;
        for (i = 0; i < lstDel.length; i++) {            
            if (_lstDelete.length == 0) {
                _lstDelete.push(lstDel.items[i]);
            }
            else {
                var add = true;
                for (j = 0; j < _lstDelete.length; j++) {
                    if (_lstDelete[j].data.LotSerNbr == lstDel.items[i].data.LotSerNbr) {
                        add = false;
                    }
                }
                if (add) {
                    _lstDelete.push(lstDel.items[i]);
                }
            }
            
        }
        if (item == 'yes') {
            App.grdLot.deleteSelected();
        }
    },
    addNewLot: function (record, lotSerNbr) {
        if (HQ.allowEditGridDetail && !HQ.IntegrateERP) {
            var newRow = Ext.create('App.mdlLotTrans');
            newRow.data.LotSerNbr = !Ext.isEmpty(lotSerNbr) ? lotSerNbr : '';
            newRow.data.POTranLineRef = record.LineRef;
            newRow.data.UnitDesc = record.RcptUnitDescr;
            newRow.data.InvtID = record.InvtID;
            newRow.data.SiteID = record.SiteID;
            newRow.data.CnvFact = record.RcptConvFact;
            newRow.data.UnitMultDiv = record.RcptMultDiv;
            newRow.data.TranScr = 'PO';
            newRow.data.TranType = App.cboRcptType.getValue();
            newRow.data.InvtMult = newRow.TranType == "X" ? -1 : 1;
            newRow.data.WhseLoc = record.WhseLoc;
            newRow.data.UnitPrice = record.UnitCost;
            newRow.data.UnitCost = record.UnitCost;
            newRow.data.MfcDate = HQ.bussinessDate;
            newRow.data.WarrantyDate = '';
            newRow.data.ExpDate = '';
            HQ.store.insertRecord(App.stoLotTrans, "LotSerNbr", newRow, true);
        }
    }
}

//////////// Trả Hàng Nguyên Đơn/////////////////////////////////////////////
var btnBackOrder_Click = function () {
    if (Ext.isEmpty(App.cboBatNbr.getValue())) {
        if (Ext.isEmpty(App.cboBranchID.getValue())) {
            HQ.message.show(1000, App.cboBranchID.fieldLabel);
            return false;
        }
        if (Ext.isEmpty(App.cboRcptType.getValue())) {
            HQ.message.show(1000, App.cboRcptType.fieldLabel);
            return false;
        }
        if (Ext.isEmpty(App.cboRcptFrom.getValue())) {
            HQ.message.show(1000, App.cboRcptFrom.fieldLabel);
            return false;
        }
        if (App.cboRcptType.value == 'X' && App.cboRcptFrom.value == _rcptFromPO10200) {
            App.stoBackOrder.load([], false);
            App.stoBackOrder.removeAll();
            App.grdBackOrder.view.refresh();
            App.winBackOrder.show();
        } 
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


var getLotQtyAvail = function (row) {
    var lot = HQ.store.findInStore(App.stoItemLot, ['InvtID', 'SiteID', 'WhseLoc', 'LotSerNbr'], [row.data.InvtID, row.data.SiteID, row.data.WhseLoc, row.data.LotSerNbr]);
    var qty = 0;
    var qtyAvail = 0;

    App.stoLotTrans.snapshot.each(function (item2) {
        if (item2.data.LotSerNbr == row.data.LotSerNbr && item2.data.InvtID == row.data.InvtID && item2.data.SiteID == row.data.SiteID && item2.data.WhseLoc == row.data.WhseLoc) {
            qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
        }
    });
    var det = App.winLot.record;

    if (App.cboRcptType.getValue() != "X") { 
        if (!Ext.isEmpty(lot)) {
            qtyAvail = lot.QtyAvail - qty;
            if (qtyAvail < 0) {
                HQ.message.show(1043, [row.data.InvtID + " " + row.data.LotSerNbr, row.data.SiteID], "", true);
                qty = 0;
                row.data.Qty = 0;
                row.commit();
                App.stoLotTrans.snapshot.each(function (item2) {
                    if (item2.data.LotSerNbr == row.data.LotSerNbr && item2.data.InvtID == row.data.InvtID && item2.data.SiteID == row.data.SiteID && item2.data.WhseLoc == row.data.WhseLoc) {
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
                    if (item2.data.LotSerNbr == row.data.LotSerNbr && item2.data.InvtID == row.data.InvtID && item2.data.SiteID == row.data.SiteID && item2.data.WhseLoc == row.data.WhseLoc) {
                        qty += item2.data.UnitMultDiv == "M" ? item2.data.Qty * item2.data.CnvFact : item2.data.Qty * item2.data.CnvFact;
                    }
                });
                qtyAvail = 0 - qty;
            }
        } 
        App.lblLotQtyAvail.setText("Lot " + row.data.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound(qtyAvail,2)) + " - " + row.data.UnitDesc);
    } else {
        if (!Ext.isEmpty(lot)) {
            qtyAvail = lot.QtyAvail;
        } else {
            qtyAvail = 0;
        }
        App.lblLotQtyAvail.setText("Lot " + row.data.LotSerNbr + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound(qtyAvail,2)) + + " - " + row.data.UnitDesc);
    }

};

var winBackOrder_BeforeShow = function () {
    App.frmMain.mask();
    var height = App.frmMain.getHeight() > 400 ? 400 : App.frmMain.getHeight();
    var width = App.frmMain.getWidth() > 700 ? 700 : App.frmMain.getWidth();
    App.winBackOrder.setHeight(height);
    App.winBackOrder.setWidth(width);
}
var btnLoad_Click = function () {
    if (Ext.isEmpty(App.dteFromDate.getValue())) {
        HQ.message.show(1000, App.dteFromDate.fieldLabel);
        return false;
    }
    if (Ext.isEmpty(App.dteToDate.getValue())) {
        HQ.message.show(1000, App.dteToDate.fieldLabel);
        return false;
    }    
    App.stoBackOrder.reload();      
}
var sto_BeforeLoad = function () {
    if (App.winBackOrder && App.winBackOrder.body) {
        App.winBackOrder.body.mask();
    }
    HQ.common.showBusy(true, HQ.common.getLang('loadingdata'));
}

var stoPO10200_pdWhseLoc_BeforeLoad = function () {
    HQ.common.showBusy(true, HQ.common.getLang('loadingdata'));
}

var stoPO10200_pdWhseLoc_Load = function () {
    HQ.common.showBusy(false, HQ.common.getLang('loadingdata'));
}

var stoBackOrder_Load = function () {
    HQ.common.showBusy(false, HQ.common.getLang('loadingdata'));
    if (App.winBackOrder && App.winBackOrder.body) {
        App.winBackOrder.body.unmask();
    }
    
}

var stoLotTransBackOrder_Load = function () {
    App.stoLotTrans.loadData(App.stoLotTransBackOrder.data.items);
};

var stoPO10200_pgBackOrderDetail_Load = function () {
    App.grdPO_Trans.store.removeAll();
    App.grdPO_Trans.view.refresh();
    HQ.store.insertBlank(App.stoPO10200_pgDetail, _keys);
    App.stoPO10200_pgBackOrderDetail.suspendEvents();
    App.stoPO10200_pgBackOrderDetail.data.each(function (det) {
        insertItemGrid(App.grdPO_Trans, det.data, true);
    });
   

    calcDet(true);
    App.stoPO10200_pgBackOrderDetail.resumeEvents();
    App.grdPO_Trans.view.refresh();

    App.stoLotTransBackOrder.reload();    
    App.cboPONbr.setReadOnly(true);
    App.cboPONbr.allowBlank = true;
    App.cboPONbr.validate();
    frmChange();
    App.winBackOrder.close();
    HQ.common.showBusy(false, HQ.common.getLang('loadingdata'));
}

var btnOK_click = function () {
    _lstDelete = [];
    if (App.grdBackOrder.selModel.selected.length == 0) {
        HQ.message.show(718);
    } else {
        var data = App.grdBackOrder.selModel.selected.items[0].data;
        _backOrderRcptNbr = data.RcptNbr;
        _backOrderBatNbr = data.BatNbr;
        App.stoPO10200_pgBackOrderDetail.reload();
        App.cboTerms.setValue(data.Terms);
        App.cboVendID.setValue(data.VendID);
        App.txtOrigBranchID.setValue(data.OrigBranchID);
        App.txtOrigBatNbr.setValue(data.OrigBatNbr);
        App.dtInvcDate.setValue(data.InvcDate);

        var record = App.stoHeader.getAt(0).data;      
            record.TaxAmtTot00 = data.TaxAmtTot00;
            record.TaxAmtTot01 = data.TaxAmtTot01;
            record.TaxAmtTot02 = data.TaxAmtTot02;
            record.TaxAmtTot03 = data.TaxAmtTot03;
            record.TaxID00 = data.TaxID00;
            record.TaxID01 = data.TaxID01;
            record.TaxID02 = data.TaxID02;
            record.TaxID03 = data.TaxID03;       
    }
}
var askCancel = function (item) {
    if (item == 'yes') {
        App.frmMain.submit({
            clientValidation: false,
            waitMsg: HQ.common.getLang('SavingData'),
            method: 'POST',
            url: 'PO10200/Cancel',
            timeout: 1800000,
            params: {
                lstHeader: Ext.encode(App.stoHeader.getRecordsValues())
            },
            success: function (msg, data) {
                var batNbr = '';
                if (this.result.data != undefined && this.result.data.batNbr != null) {
                    batNbr = this.result.data.batNbr;
                }
                HQ.message.process(msg, data, true);
                App.cboBatNbr.getStore().load(function () {
                    App.cboBatNbr.setValue(batNbr);
                    App.stoHeader.reload();
                });
            },
            failure: function (msg, data) {
                HQ.message.process(msg, data, true);
            }
        });
    }
};
var cboWhseLoc_Expand = function (item) {
    App.cboWhseLoc.store.clearFilter();
    App.cboWhseLoc.store.filter('SiteID', new RegExp('^' + Ext.escapeRe(_siteIDFilterWhseLoc) + '$'));
};

function validateInvoiceNbr() {
    if (App.stoHeader.data.items.length > 0 && App.cboDocType.getValue() == "VO") {
        if (App.stoHeader.data.items[0].data.ReplaceInvoice == false && (App.stoHeader.data.items[0].data.InvcNbrImport != '' || App.stoHeader.data.items[0].data.InvcNoteImport != '')) {
            if (App.stoHeader.data.items[0].data.InvcNbr != App.stoHeader.data.items[0].data.InvcNbrImport
                || App.stoHeader.data.items[0].data.InvcNote != App.stoHeader.data.items[0].data.InvcNoteImport) {
                HQ.message.show(2016090801);
                return false;
            }
        } else if (App.stoHeader.data.items[0].data.ReplaceInvoice == true && (App.stoHeader.data.items[0].data.InvcNbrOld != '' || App.stoHeader.data.items[0].data.InvcNoteOld != '')) {
            if (App.stoHeader.data.items[0].data.InvcNbr != App.stoHeader.data.items[0].data.InvcNbrOld
                || App.stoHeader.data.items[0].data.InvcNote != App.stoHeader.data.items[0].data.InvcNoteOld) {
                HQ.message.show(2018122401);
                return false;
            }
        }
    }
    return true;
}
function ask4SaveInTransit(item) {
    if (item == 'yes') {
        save();
    }
}

var stringFilter = function (record) {
    if (this.dataIndex == 'SiteID') {
        App.cboSiteID.store.clearFilter();
        return HQ.grid.filterComboDescr(record, this, App.cboSiteID.store, "SiteID", "Name");
    }
    return HQ.grid.filterString(record, this);
}

var renderQty = function (value) {
    return value.format("0,000");
}
var check_UnicodeNbr = function () {
    var regexNbr = /^(\w*(\d|[a-zA-Z]|[\_\(\)\\/\-\.]))*$/;
    if (!HQ.util.passNull(App.txtInvcNbr.getValue()) == '' && !HQ.util.passNull(App.txtInvcNbr.getValue().toString()).match(regexNbr)) {
        HQ.message.show(2019091369, App.txtInvcNbr.fieldLabel);
        App.txtInvcNbr.clear();
    }    
}
var check_UnicodeNote = function () {
    var regexNote = /^(\w*(\d|[a-zA-Z]|[\_\(\)\\/\-\.]))*$/;
    if (!HQ.util.passNull(App.txtInvcNote.getValue()) == '' && !HQ.util.passNull(App.txtInvcNote.getValue().toString()).match(regexNote)) {
        HQ.message.show(2019091369, App.txtInvcNote.fieldLabel);
        App.txtInvcNote.clear();
    }
}

function txtAPBatNbr_Blur() {
    var regexNbr = /^(\w*(\d|[a-zA-Z]))*$/;
    if (!HQ.util.passNull(App.txtAPBatNbr.getValue()) == '' && !HQ.util.passNull(App.txtAPBatNbr.getValue().toString()).match(regexNbr)) {
        HQ.message.show(2019091369, App.txtAPBatNbr.fieldLabel);
        App.txtAPBatNbr.clear();
    }
}

function txtAPRefNbr_Blur() {
    var regexNbr = /^(\w*(\d|[a-zA-Z]))*$/;
    if (!HQ.util.passNull(App.txtAPRefNbr.getValue()) == '' && !HQ.util.passNull(App.txtAPRefNbr.getValue().toString()).match(regexNbr)) {
        HQ.message.show(2019091369, App.txtAPRefNbr.fieldLabel);
        App.txtAPRefNbr.clear();
    }
}

var checkSelect = function (row) {
    HQ.maxSelectTrans++;
    if (HQ.numSelectTrans == HQ.maxSelectTrans) {
        HQ.maxSelectTrans = 0;
        HQ.common.showBusy(false);
        getQtyAvail(row);
    }
}

var getQtyAvail = function (row) {
    setTimeout(function () {
        var site = HQ.store.findInStore(App.stoItemSite, ['InvtID', 'SiteID'], [row.data.InvtID, row.data.SiteID]);
        if (!Ext.isEmpty(site)) {
            var qtyAvail = site.QtyAvail - calculateInvtTotal(row.data.InvtID, row.data.SiteID, "");
            qtyAvail1 = row.data.UnitMultDiv == "M" ? (qtyAvail / row.data.RcptConvFact) : (qtyAvail * row.data.RcptConvFact);
            App.lblQtyAvail.setText(row.data.InvtID + " - " + HQ.common.getLang('qtyavail') + ": " + formatNumber(HQ.util.mathRound(qtyAvail1, 2)) + " - " + row.data.RcptUnitDescr);
        }
        else {

            App.lblQtyAvail.setText("");
        }
        HQ.common.showBusy(false, HQ.common.getLang("loadding"));
    }, 1000);

}

var checkLoadQty = function (row) {
    HQ.common.showBusy(true, HQ.common.getLang("loadding"));
    setTimeout(function () {
        App.stoItemSite.load({
            params: { siteID: row.data.SiteID, invtID: row.data.InvtID },
            callback: checkSelect(row)
        });
        App.stoOldTrans.load({
            params: { batNbr: App.cboBatNbr.getValue(), branchID: App.cboBranchID.getValue(), rcptNbr: App.txtRcptNbr.getValue() },
            callback: checkSelect(row)
        });
    }, 500); 
    
};
var calculateInvtTotal = function (invtID, siteID, lineRef) {
    var qty = 0;
    var qtyOld = 0;
    var store = App.stoPO10200_pgDetail;
    var allRecords = store.snapshot || store.allData || store.data;
    allRecords.each(function (item) {
        if (item.data.InvtID == invtID && item.data.SiteID == siteID && (lineRef == "" || (lineRef != "" && lineRef != item.data.LineRef))) {
            qty += item.data.UnitMultDiv == "M" ? (item.data.RcptQty * item.data.RcptConvFact) : (item.data.RcptQty / item.data.RcptConvFact);
        }
    });
    App.stoOldTrans.each(function (item) {
        if (item.data.InvtID == invtID && item.data.SiteID == siteID) {
            qtyOld += item.data.UnitMultDiv == "M" ? (item.data.RcptQty * item.data.RcptConvFact) : (item.data.RcptQty / item.data.RcptConvFact);
        }
    });
    return qty - qtyOld;
};
var renderRowNumber = function (value, meta, record) {
    return App.stoLotTrans.data.indexOf(record) + 1;
}
function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}