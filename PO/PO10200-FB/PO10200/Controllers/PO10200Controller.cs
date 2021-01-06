using HQ.eSkyFramework;
using Ext.Net;
using Ext.Net.MVC;
using System;
using System.Collections.Generic;
using System.Data.Objects;
using System.IO;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Mvc;
using PartialViewResult = System.Web.Mvc.PartialViewResult;
using System.Reflection;
using System.Drawing;
using Aspose.Cells;
using HQFramework.DAL;
using HQFramework.Common;
using System.Data;
using HQ.eSkySys;
namespace PO10200.Controllers
{
    [CustomAuthorize]
    [CheckSessionOut]
    [DirectController]
    public class PO10200Controller : Controller
    {

        PO10200Entities _db = Util.CreateObjectContext<PO10200Entities>(false);
        PO10200Entities _app = Util.CreateObjectContext<PO10200Entities>(false);
        eSkySysEntities _sys = Util.CreateObjectContext<eSkySysEntities>(true);
        private string _screenNbr = "PO10200";
        private string _screenImport = "Import";
        private const string DiscountClassID = "$Discount$";
        private FormCollection _form;
        private List<PO10200_pgDetail_Result> _lstPOTrans = new List<PO10200_pgDetail_Result>();
        private List<PO10200_pgDetail_Result> _lstPOTransOld = new List<PO10200_pgDetail_Result>();
        private List<PO10200_pgLotTrans_Result> _lstLot = new List<PO10200_pgLotTrans_Result>();
        private List<PO10200_pgLoadTaxTrans_Result> _lstTax = new List<PO10200_pgLoadTaxTrans_Result>();
        private PO10200_pdPO_Setup_Result _objPO_Setup;
        private PO10200_pdHeader_Result _poHead;
        private Batch _objBatch;
        string _batNbr = "";
        string _rcptNbr = "";
        string _branchID = "";
        string _handle = "";
        string _status = "";
        string _poReceiptDescr = "PO Receipt";
        string _origOrderNbr = "";
        string _refNbr = "";
        private JsonResult _logMessage;
        private List<IN_ItemSite> lstInItemsiteNew = new List<IN_ItemSite>();
        private List<IN_ItemLoc> lstInItemlocNew = new List<IN_ItemLoc>();
        private List<PO10200_pcSiteAll_Result> _lstSiteAll = new List<PO10200_pcSiteAll_Result>();
        List<PO10200_pgLoadTaxTrans_Result> _lstTaxTrans = new List<PO10200_pgLoadTaxTrans_Result>();
        List<PO10200_pgLoadTaxTrans_Result> _lstTaxDoc = new List<PO10200_pgLoadTaxTrans_Result>();
        List<PO10200_pdAP_VenDorTaxes_Result> _lstVendTaxes = new List<PO10200_pdAP_VenDorTaxes_Result>();
        List<PO10200_pdIN_Inventory_Result> _lstInvt4CalcTax = new List<PO10200_pdIN_Inventory_Result>();
        List<PO10200_pdIN_UnitConversion_Result> _lstUnitCnv4CalcTax = new List<PO10200_pdIN_UnitConversion_Result>();
        private bool _isRelease = false;
        int _decimalPlaces = 2;
        bool b235 = false;//message235
        string _ICPurchaseType = "IC"; //Hàng Điều Tiết
        string _DPPurchageType = "DP";
        string _batNbrImp = "";
        string _branchIDImp = "";
        private bool checkSONbrERPImp = false;

        List<string> ColTexts = new List<string>() { "BranchID", "BranchName"
                                                            , "PO10200Module", "PO10200RcptType", "PO10200DocType"//, "TruckRcptDateImp"
                                                            , "InvcDate", "InvcNbr", "InvcNote"
                                                            , "ReplaceInvoice", "InvcNbrOld", "InvcNoteOld", "InvcDateOld", "PO10200PurchaseType", "InvtID", "InvtName", "StkQty","DiscodeDisplay", "Revenue", "Reference", "ReasonCD" };

        public ActionResult Index()
        {
            LicenseHelper.ModifyInMemory.ActivateMemoryPatching();
            Util.InitRight(_screenNbr);
            bool isChangeSiteID = false;
            bool isShowBackOrder = false;
            var allowDeleteReturnRow = false;
            var requiredPONbr = false;
            bool showImportExport = false;
            int checkperPost = 0;
            bool editLineQty = false;
            bool export4KIDO = false;
            int showWhseLoc = 0;
            string project = "";
            string perPost = "";
            bool showInTransit = false;
            bool mathUnitCost = false;
            var allowEditGridDetail = true;
            var requireInvoice = false;
            var integrateERP = false;
            var hideAndConfirmDataInv = false;
            var obj = _sys.SYS_Configurations.FirstOrDefault(x => x.Code.ToLower() == "po10200siteidconfig");
            if (obj != null)
            {
                isChangeSiteID = obj.IntVal == 1;
            }
            string decimalPrecision = "0,000";
            int decimalInput = 0;
            /////////////////////////////////////////

            ///b ool required invc
            //////////////////////////
            var objConfig = _db.PO10200_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (objConfig != null)
            {
                isShowBackOrder = objConfig.IsShowBackOrder.HasValue && objConfig.IsShowBackOrder.Value;
                allowDeleteReturnRow = objConfig.AllowDeleleReturnRow.HasValue && objConfig.AllowDeleleReturnRow.Value;
                requiredPONbr = objConfig.RequiredPONbr.HasValue && objConfig.RequiredPONbr.Value;
                showWhseLoc = objConfig.ShowWhseLoc.Value;
                showImportExport = objConfig.ShowImportExport.HasValue && objConfig.ShowImportExport.Value;
                project = objConfig.Project;
                perPost = objConfig.PerPost;
                checkperPost = objConfig.CheckPerPost ?? 0;
                editLineQty = objConfig.EditReturnRowLineQty.HasValue && objConfig.EditReturnRowLineQty.Value;
                export4KIDO = objConfig.ExpImp4KIDO.HasValue && objConfig.ExpImp4KIDO.Value;
                showInTransit = objConfig.ShowInTransit.HasValue && objConfig.ShowInTransit.Value;
                allowEditGridDetail = objConfig.AllowEditGridDetail.HasValue && objConfig.AllowEditGridDetail.Value;
                mathUnitCost = objConfig.MathUnitCost.HasValue && objConfig.MathUnitCost.Value;
                requireInvoice = objConfig.RequireInvoice.HasValue && objConfig.RequireInvoice.Value;
                integrateERP = objConfig.IntegrateERP.HasValue && objConfig.IntegrateERP.Value;
                hideAndConfirmDataInv = objConfig.HideAndConfirmDataInv.HasValue && objConfig.HideAndConfirmDataInv.Value;
                requireInvoice = hideAndConfirmDataInv == true ? true : objConfig.RequireInvoice.HasValue && objConfig.RequireInvoice.Value;
                decimalPrecision = objConfig.DecimalPrecision;
                decimalInput = objConfig.DecimalInput ?? 0;
            }
            ViewBag.showInTransit = showInTransit;
            ViewBag.IsChangeSiteID = isChangeSiteID;
            ViewBag.isShowBackOrder = isShowBackOrder;
            ViewBag.allowDeleteReturnRow = allowDeleteReturnRow;
            ViewBag.requiredPONbr = requiredPONbr;
            ViewBag.showWhseLoc = showWhseLoc;
            ViewBag.showImportExport = showImportExport;
            ViewBag.BussinessDate = DateTime.Now.ToDateShort();
            ViewBag.BussinessTime = DateTime.Now;
            ViewBag.Project = project;
            ViewBag.PerPost = perPost;
            ViewBag.CheckperPost = checkperPost;
            ViewBag.EditLineQty = editLineQty;
            ViewBag.export4KIDO = export4KIDO;
            ViewBag.allowEditGridDetail = allowEditGridDetail;
            ViewBag.mathUnitCost = mathUnitCost;
            ViewBag.requireInvoice = requireInvoice;
            ViewBag.IntegrateERP = integrateERP;
            ViewBag.HideAndConfirmDataInv = hideAndConfirmDataInv;
            ViewBag.DecimalPrecision = decimalPrecision;
            ViewBag.DecimalInput = decimalInput;
            return View();
        }

        //[OutputCache(Duration = 1000000, VaryByParam = "lang")]
        public PartialViewResult Body(string lang)
        {
            return PartialView();
        }
        public PartialViewResult BodyCurrent(string lang)
        {
            return PartialView();
        }
        #region Get Data
        public ActionResult GetHeader(string batNbr, string branchID)
        {
            var obj = _db.PO10200_pdHeader(branchID, batNbr, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (obj != null)
            {
                if(obj.Status == "H"){
                    DateTime date = DateTime.Now.ToDateShort();
                    if (date >= obj.InvcDate.ToDateShort())
                    {
                        obj.RcptDate = date.ToDateShort();
                    }
                    else if (date < obj.InvcDate.ToDateShort())
                    {
                        obj.RcptDate = obj.InvcDate;
                    }
                }
               
            }


            return this.Store(obj);
        }

        public ActionResult GetAP_VendorTax(string vendID, string ordFromId)
        {
            return this.Store(_db.PO10200_pdAP_VenDorTaxes(vendID, ordFromId));
        }
        public ActionResult GetPO10200_pgDetail(string rcptNbr, string batNbr, string branchID)
        {
            var lst = _db.PO10200_pgDetail(branchID, batNbr, rcptNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lst);
        }
        public ActionResult GetPO10200_pgLoadTaxTrans(string rcptNbr, string batNbr, string branchID)
        {
            return this.Store(_db.PO10200_pgLoadTaxTrans(branchID, batNbr, rcptNbr).ToList());
        }
        public ActionResult GetPO10200_ppCheckingPONbr(string branchID, string poNbr)
        {
            var obj = _db.PO10200_ppCheckingPONbr(branchID, poNbr).FirstOrDefault();
            return this.Store(obj);
        }
        public ActionResult GetPO10200_pdPODetailReceipt(string branchID, string poNbr)
        {
            var obj = _db.PO10200_pdPODetailReceipt(Current.UserName, Current.CpnyID, Current.LangID, branchID, poNbr, 0, 0, 0).ToList();
            return this.Store(obj);
        }
        public ActionResult GetPO10200_pdPODetailReturn(string branchID, string poNbr)
        {
            var obj = _db.PO10200_pdPODetailReturn(branchID, poNbr).ToList();
            return this.Store(obj);
        }
        public ActionResult GetLotTrans(string rcptNbr, string batNbr, string branchID, string type, string poNbr)
        {
            var lst = _db.PO10200_pgLotTrans(branchID, batNbr, rcptNbr, type, poNbr).ToList();
            return this.Store(lst);
        }

        public ActionResult GetDiscCode(string branchID, string batNbr, DateTime? inputDate, string invtID)
        {
            if (!inputDate.HasValue)
            {
                inputDate = DateTime.Now.ToDateShort();
            }
            List<PO10200_pcDiscCode_Result> lstDisc = _db.PO10200_pcDiscCode(inputDate, batNbr, branchID, invtID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lstDisc, lstDisc.Count);
        }

        public ActionResult GetBackOrder(string branchID, DateTime fromDate, DateTime toDate)
        {
            List<PO10200_pgPONbr_Result> lstDisc = _db.PO10200_pgPONbr(branchID, fromDate, toDate, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lstDisc, lstDisc.Count);
        }
        public ActionResult GetPO10200_pgBackOrderDetail(string branchID, string batNbr, string rcptNbr)
        {
            var obj = _db.PO10200_pgBackOrderDetail(branchID, batNbr, rcptNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(obj);
        }

        public ActionResult GetItemLot(string invtID, string siteID, string whseLoc, string lotSerNbr, string branchID, string batNbr, string refNbr, string pOLineRef)
        {
            var lot = _app.IN_ItemLot.FirstOrDefault(p => p.InvtID == invtID && p.SiteID == siteID && p.WhseLoc == whseLoc && p.LotSerNbr == lotSerNbr);

            if (lot == null) lot = new IN_ItemLot()
            {
                InvtID = invtID,
                SiteID = siteID,
                WhseLoc = whseLoc,
                LotSerNbr = lotSerNbr
            };
            var lotTrans = _app.PO_LotTrans.Where(p => p.BranchID == branchID && p.BatNbr == batNbr && p.InvtID == invtID && p.SiteID == siteID && p.WhseLoc == whseLoc && p.LotSerNbr == lotSerNbr && p.RefNbr == refNbr && p.POTranLineRef == pOLineRef).ToList();
            foreach (var item in lotTrans)
            {
                lot.QtyAvail += (item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact);
            }

            List<IN_ItemLot> lstLot = new List<IN_ItemLot>() { lot };
            return this.Store(lstLot, lstLot.Count);
        }

        public ActionResult GetItemSite(string invtID, string siteID)
        {
            var objSite = _app.IN_ItemSite.FirstOrDefault(p => p.InvtID == invtID && p.SiteID == siteID);
            return this.Store(objSite);
        }

        #endregion

        #region DataProcess
        public ActionResult Save(FormCollection data, string invcNote, string invcNbr)
        {
            try
            {
                bool hideAndConfirmDataInv = false;
                var objConfig = _db.PO10200_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (objConfig != null)
                {
                    hideAndConfirmDataInv = objConfig.HideAndConfirmDataInv ?? false;
                }
                var acc = Session["PO10200"] as AccessRight;
                _form = data;
                _batNbr = data["cboBatNbr"];
                _rcptNbr = data["RcptNbr"];
                _branchID = data["cboBranchID"];
                _status = data["Status"].PassNull();
                _handle = data["Handle"].PassNull() == "" ? _status : data["Handle"].PassNull();
                b235 = _form["b235"].ToBool();
                _objPO_Setup = _db.PO10200_pdPO_Setup(_branchID, "PO").FirstOrDefault();
                var detHeader = new StoreDataHandler(data["lstHeader"]);
                _poHead = detHeader.ObjectData<PO10200_pdHeader_Result>().FirstOrDefault();
                if (string.IsNullOrWhiteSpace(_poHead.InvcNbr))
                {
                    _poHead.InvcNbr = invcNbr;
                }
                if (string.IsNullOrWhiteSpace(_poHead.InvcNote))
                {
                    _poHead.InvcNote = invcNote;
                }
                if (_status == "H" && _batNbr.PassNull() != "" && hideAndConfirmDataInv == true && _poHead.RcptType != "X")
                {
                    var rec = _db.PO_Invoice.FirstOrDefault(p => p.BatNbr == _batNbr);
                    if (rec != null)
                    {
                        if (_poHead.InvcNbr != rec.InvcNbr || _poHead.InvcNote != rec.InvcNote)
                        {
                            throw new MessageException(MessageType.Message, "2019080560");
                        }
                    }
                }
                var detHandler = new StoreDataHandler(data["lstDet"]);
                _lstPOTrans = detHandler.ObjectData<PO10200_pgDetail_Result>()
                            .Where(p => Util.PassNull(p.LineRef) != string.Empty && !string.IsNullOrWhiteSpace(p.InvtID))
                            .ToList();
                _lstPOTransOld = _lstPOTrans;
                var detHandlerLot = new StoreDataHandler(data["lstLot"]);
                _lstLot = detHandlerLot.ObjectData<PO10200_pgLotTrans_Result>()
                            .Where(p => Util.PassNull(p.LotSerNbr) != string.Empty)
                            .ToList();
                _lstSiteAll = _db.PO10200_pcSiteAll(_branchID).ToList();
                if (Data_Checking(b235))
                {
                    if ((_status == "U" || _status == "C") && (_handle == "C" || _handle == "V"))
                    {

                        if ((_handle == "V" || _handle == "C") && !acc.Release)
                        {
                            throw new MessageException(MessageType.Message, "725");
                        }
                        else
                        {
                            if (_handle == "V" || _handle == "C")
                            {
                                Data_Release();
                            }
                        }
                    }
                    else if (_status == "H" || _status == "T")
                    {
                        if (_handle == "R" && !acc.Release)
                        {
                            throw new MessageException(MessageType.Message, "737");
                        }
                        else Save_Batch();
                    }
                }
                if (_logMessage != null)
                {
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Save, new { batNbr = _batNbr });

            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }

        [HttpPost]
        public ActionResult DeleteHeader(FormCollection data)
        {
            try
            {
                var acc = Session["PO10200"] as AccessRight;
                _form = data;
                _batNbr = data["cboBatNbr"];
                _rcptNbr = data["RcptNbr"];
                _branchID = data["cboBranchID"];
                _status = data["Status"].PassNull();
                _handle = data["Handle"].PassNull() == "" ? _status : data["Handle"].PassNull();
                _objPO_Setup = _db.PO10200_pdPO_Setup(_branchID, "PO").FirstOrDefault();
                var detHeader = new StoreDataHandler(data["lstHeader"]);
                if (_poHead == null)
                    _poHead = detHeader.ObjectData<PO10200_pdHeader_Result>().FirstOrDefault();
                CheckCloseDate();
                var objHeader = _db.Batches.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr).FirstOrDefault();
                if (objHeader != null)
                {
                    if (_poHead.tstamp.ToHex() != objHeader.tstamp.ToHex())
                    {
                        throw new MessageException(MessageType.Message, "19");
                    }
                    _db.Batches.DeleteObject(objHeader);
                    var objRe = _db.PO_Receipt.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RcptNbr == _rcptNbr).FirstOrDefault();
                    if (objRe != null)
                    {
                        _db.PO_Receipt.DeleteObject(objRe);
                    }
                    var objInvoice = _db.PO_Invoice.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RcptNbr == _rcptNbr).FirstOrDefault();
                    if (objInvoice != null)
                    {
                        _db.PO_Invoice.DeleteObject(objInvoice);
                    }
                    var lstdel = _db.PO_Trans.Where(p => p.BatNbr == _batNbr && p.BranchID == _branchID && p.RcptNbr == _rcptNbr).ToList();
                    while (lstdel.FirstOrDefault() != null)
                    {
                        var obj = lstdel.FirstOrDefault();
                        if (obj != null && _poHead.RcptType == "X")
                        {
                            var objItemSite = _db.IN_ItemSite.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID).FirstOrDefault();
                            double dblQty = (obj.RcptMultDiv == "D" ? (obj.RcptQty / obj.RcptConvFact) : obj.RcptQty * obj.RcptConvFact);
                            if (objItemSite != null)
                            {
                                objItemSite.QtyAllocPORet = Math.Round(objItemSite.QtyAllocPORet - dblQty, 0);
                                objItemSite.QtyAvail = Math.Round(objItemSite.QtyAvail + dblQty, 0);
                                objItemSite.LUpd_DateTime = DateTime.Now;
                                objItemSite.LUpd_Prog = _screenNbr;
                                objItemSite.LUpd_User = Current.UserName;
                            }
                        }
                        if (obj != null && _poHead.RcptType == "X")
                        {
                            if (obj.WhseLoc.PassNull() != "")
                            {
                                var objIN_ItemLoc = _db.IN_ItemLoc.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.WhseLoc == obj.WhseLoc).FirstOrDefault();
                                double dblQty = (obj.RcptMultDiv == "D" ? (obj.RcptQty / obj.RcptConvFact) : obj.RcptQty * obj.RcptConvFact);

                                if (objIN_ItemLoc != null)
                                {
                                    objIN_ItemLoc.QtyAllocPORet = Math.Round(objIN_ItemLoc.QtyAllocPORet - dblQty, 0);
                                    objIN_ItemLoc.QtyAvail = Math.Round(objIN_ItemLoc.QtyAvail + dblQty, 0);
                                    objIN_ItemLoc.LUpd_DateTime = DateTime.Now;
                                    objIN_ItemLoc.LUpd_Prog = _screenNbr;
                                    objIN_ItemLoc.LUpd_User = Current.UserName;
                                }
                            }
                        }
                        if (obj != null)
                        {
                            var lstold = _db.PO_LotTrans.Where(p => p.BranchID == obj.BranchID && p.BatNbr == obj.BatNbr && p.RefNbr == obj.RcptNbr && p.POTranLineRef == obj.LineRef).ToList();
                            foreach (var objlot in lstold)
                            {
                                _db.PO_LotTrans.DeleteObject(objlot);
                                if (_poHead.RcptType == "X")
                                {
                                    double NewQty = (objlot.UnitMultDiv == "D" ? (objlot.Qty / objlot.CnvFact) : (objlot.Qty * obj.CnvFact));
                                    var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == objlot.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == objlot.LotSerNbr && p.WhseLoc == objlot.WhseLoc).FirstOrDefault();
                                    if (objItemLot != null)
                                    {
                                        objItemLot.QtyAllocPORet = Math.Round(objItemLot.QtyAllocPORet - NewQty, 0);
                                        objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail + NewQty, 0);
                                        objItemLot.LUpd_DateTime = DateTime.Now;
                                        objItemLot.LUpd_Prog = _screenNbr;
                                        objItemLot.LUpd_User = Current.UserName;
                                    }
                                }
                            }
                        }
                        _db.PO_Trans.DeleteObject(obj);
                        lstdel.Remove(obj);
                    }
                    _db.SaveChanges();
                }
                return Util.CreateMessage(MessageProcess.Delete, new { batNbr = "" });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }

        }
        [HttpPost]
        public ActionResult DeleteGrd(FormCollection data)
        {
            try
            {
                var acc = Session["PO10200"] as AccessRight;
                _form = data;
                _batNbr = data["cboBatNbr"];
                _rcptNbr = data["RcptNbr"];
                _branchID = data["cboBranchID"];
                _status = data["Status"].PassNull();
                _handle = data["Handle"].PassNull() == "" ? _status : data["Handle"].PassNull();


                var detHeader = new StoreDataHandler(data["lstHeader"]);
                _poHead = detHeader.ObjectData<PO10200_pdHeader_Result>().FirstOrDefault();


                var detHandler = new StoreDataHandler(data["lstDet"]);
                _lstPOTrans = detHandler.ObjectData<PO10200_pgDetail_Result>()
                            .Where(p => Util.PassNull(p.LineRef) != string.Empty && !string.IsNullOrWhiteSpace(p.InvtID))
                            .ToList();

                var detHandlerLot = new StoreDataHandler(data["lstLot"]);
                _lstLot = detHandlerLot.ObjectData<PO10200_pgLotTrans_Result>()
                            .Where(p => Util.PassNull(p.LotSerNbr) != string.Empty)
                            .ToList();
                StoreDataHandler dataHandler = new StoreDataHandler(data["lstDel"]);
                ChangeRecords<PO10200_pgDetail_Result> lst = dataHandler.BatchObjectData<PO10200_pgDetail_Result>();
                _lstSiteAll = _db.PO10200_pcSiteAll(_branchID).ToList();
                if (_poHead == null)
                {
                    throw new MessageException(MessageType.Message, "19");
                }
                else
                {
                    foreach (PO10200_pgDetail_Result deleted in lst.Deleted.Where(p => p.tstamp != ""))
                    {
                        var obj = _db.PO_Trans.Where(p => p.BranchID == deleted.BranchID && p.BatNbr == deleted.BatNbr && p.RcptNbr == deleted.RcptNbr && p.LineRef == deleted.LineRef).FirstOrDefault();
                        if (obj != null && _poHead.RcptType == "X")
                        {
                            var objItemSite = _db.IN_ItemSite.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID).FirstOrDefault();
                            double dblQty = (obj.RcptMultDiv == "D" ? (obj.RcptQty / obj.RcptConvFact) : obj.RcptQty * obj.RcptConvFact);
                            if (objItemSite != null)
                            {
                                objItemSite.QtyAllocPORet = Math.Round(objItemSite.QtyAllocPORet - dblQty, 0);
                                objItemSite.QtyAvail = Math.Round(objItemSite.QtyAvail + dblQty, 0);
                                objItemSite.LUpd_DateTime = DateTime.Now;
                                objItemSite.LUpd_Prog = _screenNbr;
                                objItemSite.LUpd_User = Current.UserName;
                            }
                        }

                        if (obj != null)
                        {
                            if (obj.WhseLoc.PassNull() != "")
                            {
                                var objItemLoc = _db.IN_ItemLoc.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.WhseLoc == obj.WhseLoc).FirstOrDefault();
                                double dblQty = (obj.RcptMultDiv == "D" ? (obj.RcptQty / obj.RcptConvFact) : obj.RcptQty * obj.RcptConvFact);
                                if (objItemLoc != null)
                                {
                                    objItemLoc.QtyAllocPORet = Math.Round(objItemLoc.QtyAllocPORet - dblQty, 0);
                                    objItemLoc.QtyAvail = Math.Round(objItemLoc.QtyAvail + dblQty, 0);
                                    objItemLoc.LUpd_DateTime = DateTime.Now;
                                    objItemLoc.LUpd_Prog = _screenNbr;
                                    objItemLoc.LUpd_User = Current.UserName;
                                }
                            }
                        }
                        if (obj != null)
                        {
                            #region // Gọi Save_Batch bị trùng

                            #endregion
                            
                            _db.PO_Trans.DeleteObject(obj);
                        }
                    }
                    Save_Batch(true);
                }
                return Util.CreateMessage(MessageProcess.Delete, new { batNbr = _batNbr });


            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }
        //get price
        [DirectMethod]
        public ActionResult PO10200POPrice(string branchID = "", string invtID = "", string Unit = "", DateTime? podate = null, DateTime? orderDate = null)
        {
            var result = _db.PO10200_ppGetPrice(branchID, invtID, Unit, podate, orderDate, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Value;
            return this.Direct(result);
        }
        [DirectMethod]
        public ActionResult PO10200ItemSitePrice(string branchID = "", string invtID = "", string siteID = "")
        {
            var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == invtID && p.SiteID == siteID).FirstOrDefault();
            if (objIN_ItemSite == null)
            {
                objIN_ItemSite = new IN_ItemSite();
                objIN_ItemSite.ResetET();
            }
            return this.Direct(objIN_ItemSite);
        }
        [DirectMethod]
        public ActionResult PO10200ItemSiteQty(string branchID = "", string invtID = "", string siteID = "", string batNbr = "", string rcptNbr = "", string lineRef = "", string whseLoc = "", int showWhseLoc = 0)
        {
            if (showWhseLoc == 2 || (whseLoc != "" && showWhseLoc == 1))
            {
                var objold = _db.PO_Trans.Where(p => p.BranchID == branchID && p.BatNbr == batNbr && p.RcptNbr == rcptNbr && p.InvtID == invtID && p.SiteID == siteID && p.LineRef == lineRef).FirstOrDefault();
                var qtyold = objold == null ? 0 : objold.UnitMultDiv == "M" ? objold.Qty * objold.CnvFact : objold.Qty / objold.CnvFact;
                var objIN_ItemLoc = _db.IN_ItemLoc.Where(p => p.InvtID == invtID && p.SiteID == siteID && p.WhseLoc == whseLoc).FirstOrDefault();
                if (objIN_ItemLoc == null)
                {
                    objIN_ItemLoc = new IN_ItemLoc();
                    objIN_ItemLoc.ResetET();
                }
                objIN_ItemLoc.QtyAvail = objIN_ItemLoc.QtyAvail + qtyold;
                return this.Direct(objIN_ItemLoc);
            }
            else
            {
                var objold = _db.PO_Trans.Where(p => p.BranchID == branchID && p.BatNbr == batNbr && p.RcptNbr == rcptNbr && p.InvtID == invtID && p.SiteID == siteID && p.LineRef == lineRef).FirstOrDefault();
                var qtyold = objold == null ? 0 : objold.UnitMultDiv == "M" ? objold.Qty * objold.CnvFact : objold.Qty / objold.CnvFact;
                var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == invtID && p.SiteID == siteID).FirstOrDefault();
                if (objIN_ItemSite == null)
                {
                    objIN_ItemSite = new IN_ItemSite();
                    objIN_ItemSite.ResetET();
                }
                objIN_ItemSite.QtyAvail = objIN_ItemSite.QtyAvail + qtyold;
                return this.Direct(objIN_ItemSite);
            }



        }
        [DirectMethod]
        public ActionResult INNumberingLot(string invtID = "", DateTime? tranDate = null, string getType = "LotNbr")
        {
            var LotNbr = _db.INNumberingLot(invtID, tranDate, getType);
            return this.Direct(LotNbr);
        }


        [DirectMethod]
        public ActionResult GetPO10200_pdWhseLoc(string siteID, string branchID, string invtID)
        {
            var obj = _db.PO10200_pdGetDefaultWhseLoc(Current.UserName, Current.CpnyID, Current.LangID, siteID, branchID, invtID).FirstOrDefault();
            return this.Direct(obj);
        }


        private void Save_Batch(bool isDeleteGrd = false)
        {
            _objBatch = _db.Batches.FirstOrDefault(p => p.Module == "IN" && p.BatNbr == _batNbr && p.BranchID == _branchID);
            if (_objBatch != null)
            {
                if (_objBatch.tstamp.ToHex() != _poHead.tstamp.ToHex())
                {
                    throw new MessageException(MessageType.Message, "19");
                }
                Updating_Batch(ref _objBatch);
            }
            else
            {
                _objBatch = new Batch();
                _objBatch.ResetET();
                Updating_Batch(ref _objBatch);
                var objBatNbr = _db.INNumbering(_branchID, "BatNbr").FirstOrDefault();
                _objBatch.BranchID = _branchID;
                _objBatch.BatNbr = objBatNbr;
                var objRcptNbr = _db.INNumbering(_branchID, _poHead.RcptType == "R" ? "RcptNbr" : "IssueNbr").FirstOrDefault();
                _objBatch.RefNbr = objRcptNbr;
                _objBatch.OrigBranchID = _poHead.OrigBranchID.PassNull();
                _objBatch.OrigBatNbr = _poHead.OrigBatNbr.PassNull();
                _objBatch.DateEnt = DateTime.Now.ToDateShort();
                _objBatch.Crtd_DateTime = DateTime.Now;
                _objBatch.Crtd_Prog = _screenNbr;
                _objBatch.Crtd_User = Current.UserName;
                _objBatch.tstamp = new byte[0];
                _db.Batches.AddObject(_objBatch);
            }
            _batNbr = _objBatch.BatNbr;
            SavePO_Receipt(_objBatch);
        }
        private void SavePO_Receipt(Batch objBatch)
        {
            var objPO_Receipt = _db.PO_Receipt.FirstOrDefault(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RcptNbr == _rcptNbr);
            if (objPO_Receipt != null)
            {
                Updating_PO_Receipt(ref objPO_Receipt);
            }
            else
            {
                objPO_Receipt = new PO_Receipt();
                objPO_Receipt.ResetET();
                Updating_PO_Receipt(ref objPO_Receipt);
                var objRcptNbr = _db.PONumbering(_branchID, "RcptNbr").FirstOrDefault();
                objPO_Receipt.RcptNbr = objRcptNbr;
                objPO_Receipt.BatNbr = objBatch.BatNbr;
                objPO_Receipt.BranchID = objBatch.BranchID;
                objPO_Receipt.Crtd_DateTime = DateTime.Now;
                objPO_Receipt.Crtd_Prog = _screenNbr;
                objPO_Receipt.Crtd_User = Current.UserName;
                objPO_Receipt.tstamp = new byte[0];
                objPO_Receipt.OrigOrderNbr = _origOrderNbr;

                _db.PO_Receipt.AddObject(objPO_Receipt);
            }
            _rcptNbr = objPO_Receipt.RcptNbr;
            SavePO_INVoice(objPO_Receipt);
        }
        private void SavePO_INVoice(PO_Receipt objPO_Receipt)
        {
            var objPO_Invoice = _db.PO_Invoice.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RcptNbr == objPO_Receipt.RcptNbr).FirstOrDefault();
            if (objPO_Invoice != null)
            {
                Updating_PO_Invoice(ref objPO_Invoice);
                SavePO_Trans(objPO_Receipt);
            }
            else
            {
                objPO_Invoice = new PO_Invoice();
                objPO_Invoice.ResetET();
                Updating_PO_Invoice(ref objPO_Invoice);
                objPO_Invoice.BatNbr = objPO_Receipt.BatNbr;
                objPO_Invoice.RcptNbr = objPO_Receipt.RcptNbr;
                objPO_Invoice.BranchID = objPO_Receipt.BranchID;
                objPO_Invoice.PerPost = _poHead.PerPost;
                objPO_Invoice.Crtd_Datetime = DateTime.Now;
                objPO_Invoice.Crtd_Prog = _screenNbr;
                objPO_Invoice.Crtd_User = Current.UserName;
                objPO_Invoice.tstamp = new byte[0];
                _db.PO_Invoice.AddObject(objPO_Invoice);
                SavePO_Trans(objPO_Receipt);
            }

        }
        private void SavePO_Trans(PO_Receipt objPO_Receipt)
        {
            string proJect = string.Empty;
            var objConfig = _db.PO10200_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (objConfig != null)
            {
                proJect = objConfig.Project;
            }
            for (int i = 0; i < _lstPOTrans.Count; i++)
            {
                var objPOT = _lstPOTrans[i];

                if (objPOT.PONbr.PassNull() != "" && _lstPOTrans[i].POLineRef.PassNull() != "")
                {
                    var objDeatail = _db.PO_Detail.FirstOrDefault(p => p.PONbr == objPOT.PONbr && p.BranchID == _branchID && p.InvtID == objPOT.InvtID && p.LineRef == objPOT.LineRef);
                    var objPO_Tran = _db.PO_Trans.FirstOrDefault(p => p.PONbr == objPOT.PONbr && p.BranchID == _branchID && p.InvtID == objPOT.InvtID && p.LineRef == objPOT.LineRef && p.RcptNbr == _rcptNbr);
                    var objIN_ItemSiteNew = _db.IN_ItemSite.Where(p => p.InvtID == objPOT.InvtID && p.SiteID == objPOT.SiteID).FirstOrDefault();
                    var objIN_ItemLocNew = _db.IN_ItemLoc.Where(p => p.InvtID == objPOT.InvtID && p.SiteID == objPOT.SiteID && p.WhseLoc == objPOT.WhseLoc).FirstOrDefault();
                    if (objPO_Tran == null && objDeatail != null)
                    {
                        if (objPOT.SiteID != objDeatail.SiteID)
                        {
                            var objIN_Inventory = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == objPOT.InvtID).FirstOrDefault();
                            if (objIN_Inventory.StkItem == 1)
                            {
                                var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == objDeatail.InvtID && p.SiteID == objDeatail.SiteID).FirstOrDefault();
                                double NewQty = 0;
                                NewQty = (objPOT.RcptMultDiv == "D" ? (objPOT.Qty / objPOT.RcptConvFact) : (objPOT.Qty * objPOT.RcptConvFact));
                                if (objIN_ItemSite != null)
                                {
                                    objIN_ItemSite.QtyOnPO = objIN_ItemSite.QtyOnPO - NewQty;
                                }
                                if (objIN_ItemSiteNew != null)
                                {
                                    objIN_ItemSiteNew.QtyOnPO = objIN_ItemSiteNew.QtyOnPO + NewQty;
                                }
                            }
                        }
                    }
                    else
                    {
                        if (objPO_Tran != null)
                        {
                            if (objPOT.SiteID != objPO_Tran.SiteID)
                            {
                                var objIN_Inventory = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == objPOT.InvtID).FirstOrDefault();
                                if (objIN_Inventory.StkItem == 1)
                                {
                                    var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == objPO_Tran.InvtID && p.SiteID == objPO_Tran.SiteID).FirstOrDefault();
                                    double NewQty = 0;
                                    NewQty = (objPOT.RcptMultDiv == "D" ? (objPOT.Qty / objPOT.RcptConvFact) : (objPOT.Qty * objPOT.RcptConvFact));
                                    if (objIN_ItemSite != null)
                                    {
                                        objIN_ItemSite.QtyOnPO = objIN_ItemSite.QtyOnPO - NewQty;
                                    }
                                    if (objIN_ItemSiteNew != null)
                                    {
                                        objIN_ItemSiteNew.QtyOnPO = objIN_ItemSiteNew.QtyOnPO + NewQty;
                                    }
                                }
                            }
                        }
                    }
                }


                var objInvtID = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == objPOT.InvtID).FirstOrDefault();
                // kiem tra xem co muc lot ko, neu san pham co quan li lot ma khong co muc lot, thong bao khong cho save

                if (proJect != "PT")
                {
                    if (objInvtID != null)
                    {
                        var qtylot = _lstLot.Where(p => p.InvtID == objPOT.InvtID && p.SiteID == objPOT.SiteID && p.POTranLineRef == objPOT.LineRef).Sum(p => p.Qty);
                        if (objInvtID.LotSerTrack.PassNull() != "N" && objInvtID.LotSerTrack.PassNull() != "" && qtylot != objPOT.RcptQty)
                        {
                            throw new MessageException(MessageType.Message, "201508111", parm: new[] { objPOT.InvtID, qtylot.ToString(), objPOT.RcptQty.ToString() });
                        }
                    }
                    else
                    {
                        throw new MessageException(MessageType.Message, "201508112", parm: new[] { objPOT.InvtID });
                    }
                    var objSite = _lstSiteAll.FirstOrDefault(x => x.SiteID == objPOT.SiteID);
                    if (objSite == null)
                    {
                        throw new MessageException(MessageType.Message, "2016081801", parm: new[] { objPOT.SiteID, _branchID });
                    }

                }

                var obj = _db.PO_Trans.Where(p => p.BranchID == objPO_Receipt.BranchID && p.BatNbr == objPO_Receipt.BatNbr && p.RcptNbr == objPO_Receipt.RcptNbr && p.LineRef == objPOT.LineRef).FirstOrDefault();
                if (obj != null)
                {
                    if (obj.tstamp.ToHex() != objPOT.tstamp.ToHex())
                    {
                        throw new MessageException(MessageType.Message, "19");
                    }
                    Updating_PO_Trans(_lstPOTrans[i], ref obj);
                }
                else
                {
                    obj = new PO_Trans();
                    obj.ResetET();
                    Updating_PO_Trans(_lstPOTrans[i], ref obj);
                    obj.BranchID = objPO_Receipt.BranchID;
                    obj.BatNbr = objPO_Receipt.BatNbr;
                    obj.RcptNbr = objPO_Receipt.RcptNbr;
                    obj.LineRef = objPOT.LineRef;
                    obj.Crtd_DateTime = DateTime.Now;
                    obj.Crtd_Prog = _screenNbr;
                    obj.Crtd_User = Current.UserName;
                    obj.tstamp = new byte[0];
                    obj.QtyFromOM = _lstPOTrans[i].QtyFromOM;
                    _db.PO_Trans.AddObject(obj);
                }
            }
            Save_PO_LotTrans();

        }
        private void Save_PO_LotTrans()
        {
            try
            {
                //// delete lot cu khong co tren luoi lot
                var lstold = _db.PO_LotTrans.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RefNbr == _rcptNbr).ToList();
                foreach (var obj in lstold)
                {
                    if (_lstLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr && p.POTranLineRef == obj.POTranLineRef).FirstOrDefault() == null)
                    {
                        _db.PO_LotTrans.DeleteObject(obj);
                        if (_poHead.RcptType == "X")
                        {
                            DateTime date;
                            double NewQty = (obj.UnitMultDiv == "D" ? (obj.Qty / obj.CnvFact) : (obj.Qty * obj.CnvFact));
                            var objItemLot = new IN_ItemLot();
                            if (obj.WhseLoc.PassNull() != "")
                            {
                                objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr && p.WhseLoc == obj.WhseLoc).FirstOrDefault();
                            }
                            else
                            {
                                objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr).FirstOrDefault();
                            }
                            objItemLot.QtyAllocPORet = Math.Round(objItemLot.QtyAllocPORet - NewQty, 0);
                            objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail + NewQty, 0);
                            objItemLot.LUpd_DateTime = DateTime.Now;
                            objItemLot.LUpd_Prog = _screenNbr;
                            objItemLot.LUpd_User = Current.UserName;

                            if (DateTime.TryParse(obj.WarrantyDate.ToString(), out date))
                            {

                                objItemLot.WarrantyDate = obj.WarrantyDate.Year == 0001 ? DateTime.Parse("1900-01-01") : obj.WarrantyDate;
                            }

                            objItemLot.ExpDate = obj.ExpDate;
                        }
                    }
                }

                //Save Lot/Serial from datatable to in_lottrans

                foreach (var row in _lstLot)
                {
                    var obj = new PO_LotTrans();
                    double oldQty = 0;
                    if (row.WhseLoc.PassNull() == "")
                    {
                        obj = lstold.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RefNbr == _rcptNbr && p.InvtID == row.InvtID && p.LotSerNbr == row.LotSerNbr && p.SiteID == row.SiteID && p.POTranLineRef == row.POTranLineRef).FirstOrDefault();
                    }
                    else
                    {
                        obj = lstold.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RefNbr == _rcptNbr && p.InvtID == row.InvtID && p.LotSerNbr == row.LotSerNbr && p.SiteID == row.SiteID && p.WhseLoc == row.WhseLoc && p.POTranLineRef == row.POTranLineRef).FirstOrDefault();
                    }
                    if (obj == null)
                    {
                        obj = new PO_LotTrans();
                        obj.ResetET();
                        Update_PO_LotTrans(row, obj, true);
                        _db.PO_LotTrans.AddObject(obj);
                    }
                    else
                    {
                        oldQty = obj == null ? 0 : obj.UnitMultDiv == "M" ? obj.Qty * obj.CnvFact : obj.Qty / obj.CnvFact;
                        Update_PO_LotTrans(row, obj, false);
                    }

                    //Update Location and Site Qty
                    if (_poHead.RcptType == "X")
                    {
                        var objIN_Inventory = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == row.InvtID).FirstOrDefault();
                        if (objIN_Inventory.StkItem == 1)
                        {
                            DateTime date;
                            var qty = obj.UnitMultDiv == "M" ? obj.Qty * obj.CnvFact : obj.Qty / obj.CnvFact;
                            if (obj.WhseLoc.PassNull() != "")
                            {
                                var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr && p.WhseLoc == obj.WhseLoc).FirstOrDefault();
                                objItemLot.QtyAllocPORet = Math.Round(objItemLot.QtyAllocPORet + qty - oldQty, 0);
                                objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail - qty + oldQty, 0);
                                objItemLot.LUpd_DateTime = DateTime.Now;
                                objItemLot.LUpd_Prog = _screenNbr;
                                objItemLot.LUpd_User = Current.UserName;

                                if (DateTime.TryParse(row.WarrantyDate.ToString(), out date))
                                {

                                    objItemLot.WarrantyDate = row.WarrantyDate.Year == 0001 ? DateTime.Parse("1900-01-01") : row.WarrantyDate;
                                }

                                objItemLot.ExpDate = row.ExpDate;
                                if (objItemLot.QtyAvail < 0)
                                {
                                    throw new MessageException(MessageType.Message, "35");
                                }
                            }
                            else
                            {
                                var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr).FirstOrDefault();
                                objItemLot.QtyAllocPORet = Math.Round(objItemLot.QtyAllocPORet + qty - oldQty, 0);
                                objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail - qty + oldQty, 0);
                                objItemLot.LUpd_DateTime = DateTime.Now;
                                objItemLot.LUpd_Prog = _screenNbr;
                                objItemLot.LUpd_User = Current.UserName;

                                if (DateTime.TryParse(row.WarrantyDate.ToString(), out date))
                                {

                                    objItemLot.WarrantyDate = row.WarrantyDate.Year == 0001 ? DateTime.Parse("1900-01-01") : row.WarrantyDate;
                                }

                                objItemLot.ExpDate = row.ExpDate;
                                if (objItemLot.QtyAvail < 0)
                                {
                                    throw new MessageException(MessageType.Message, "35");
                                }
                            }
                        }
                    }
                }
                _db.SaveChanges();

                if (_handle == "R")
                {
                    Data_Release();
                }
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
        private void Updating_Batch(ref Batch objBatch)
        {
            try
            {
                objBatch.TotAmt = _poHead.TotAmt;
                objBatch.DateEnt = DateTime.Now.ToDateShort();
                objBatch.EditScrnNbr = "PO10200";
                objBatch.Descr = _poReceiptDescr;
                objBatch.Module = "IN";
                objBatch.JrnlType = "PO";
                objBatch.Rlsed = 0;
                objBatch.ReasonCD = _poHead.ReasonCD;
                objBatch.Status = GetStatus(_poHead.Status, _handle, _poHead.InTransit);
                objBatch.PerPost = _poHead.PerPost.PassNull();
                objBatch.LUpd_DateTime = DateTime.Now;
                objBatch.LUpd_Prog = _screenNbr;
                objBatch.LUpd_User = Current.UserName;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }

        private void Updating_PO_Receipt(ref PO_Receipt objR)
        {
            try
            {
                objR.RcptFeeTot = _poHead.RcptFeeTot;
                objR.RcptTot = _poHead.RcptTot;
                objR.DiscAmt = _poHead.DiscAmt;
                objR.DiscAmtPct = _poHead.DiscAmtPct;
                objR.RcptTotAmt = _poHead.RcptTotAmt;
                objR.TaxAmtTot00 = _poHead.TaxAmtTot00;
                objR.TxblAmtTot00 = _poHead.TxblAmtTot00;
                objR.TaxID00 = _poHead.TaxID00;
                objR.TaxAmtTot01 = _poHead.TaxAmtTot01;
                objR.TxblAmtTot01 = _poHead.TxblAmtTot01;
                objR.TaxID01 = _poHead.TaxID01;
                objR.TaxAmtTot02 = _poHead.TaxAmtTot02;
                objR.TxblAmtTot02 = _poHead.TxblAmtTot02;
                objR.TaxID02 = _poHead.TaxID02;
                objR.TaxAmtTot03 = _poHead.TaxAmtTot03;
                objR.TxblAmtTot03 = _poHead.TxblAmtTot03;
                objR.TaxID03 = _poHead.TaxID03;
                objR.Descr = _poHead.Descr;
                objR.PONbr = _poHead.PONbr;
                objR.RcptDate = _poHead.RcptDate.ToDateShort();
                objR.RcptType = _poHead.RcptType;
                objR.RcptFrom = _poHead.RcptFrom;
                objR.RcptQtyTot = _poHead.RcptQtyTot;
                objR.VendID = _poHead.VendID;
                objR.Status = GetStatus(_poHead.Status, _handle, _poHead.InTransit);
                objR.LUpd_DateTime = DateTime.Now;
                objR.LUpd_Prog = _screenNbr;
                objR.LUpd_User = Current.UserName;
                objR.tstamp = new byte[0];
                objR.POType = _poHead.POType.PassNull();
                objR.TruckRcptDate = _poHead.TruckRcptDate;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }

        private void Updating_PO_Invoice(ref PO_Invoice objI)
        {
            try
            {
                objI.InvcNbr = _poHead.InvcNbr;
                objI.InvcNote = _poHead.InvcNote;
                objI.InvcDate = _poHead.InvcDate.ToDateShort();
                objI.DocType = _poHead.DocType;
                objI.DocDate = _poHead.DocDate.ToDateShort();
                objI.APBatNbr = _poHead.APBatNbr;
                objI.APRefNbr = _poHead.APRefNbr;
                objI.Terms = _poHead.Terms;
                objI.VendID = _poHead.VendID;
                objI.PerPost = _poHead.PerPost;
                objI.LUpd_Datetime = DateTime.Now;
                objI.LUpd_Prog = _screenNbr;
                objI.LUpd_User = Current.UserName;
                objI.InTransit = _poHead.InTransit;
                objI.InvcNbrImport = _poHead.InvcNbrImport;
                objI.InvcNoteImport = _poHead.InvcNoteImport;
                objI.ReplaceInvoice = _poHead.ReplaceInvoice;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }
        private void Updating_PO_Trans(PO10200_pgDetail_Result objr, ref PO_Trans objPO_Tr)
        {
            try
            {
                objr.PurchaseType = objr.PurchaseType;
                if (objr.PurchaseType == "GI" || objr.PurchaseType == _ICPurchaseType || objr.PurchaseType == _DPPurchageType || objr.PurchaseType == "PR" || objr.PurchaseType == "GP" || objr.PurchaseType == "GS")
                {
                    var objIN_Inventory = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == objr.InvtID).FirstOrDefault();
                    if (objIN_Inventory.StkItem == 1)
                    {


                        if (objr.WhseLoc != "" && objr.WhseLoc != null)
                        {
                            var objIN_ItemLoc = _db.IN_ItemLoc.Where(p => p.InvtID == objr.InvtID && p.SiteID == objr.SiteID && p.WhseLoc == objr.WhseLoc).FirstOrDefault();
                            //Kiem tra itemsite neu chua co thi add vao
                            if (objIN_ItemLoc == null && lstInItemlocNew.Where(p => p.InvtID == objr.InvtID && p.SiteID == objr.SiteID && p.WhseLoc == objr.WhseLoc).Count() == 0)
                            {
                                Insert_IN_ItemLoc(ref objIN_ItemLoc, ref objIN_Inventory, objr.SiteID, objr.WhseLoc);
                            }
                            //Update Location and Site Qty
                            if (_poHead.RcptType == "X")
                            {
                                double OldQty = 0;
                                double NewQty = 0;
                                NewQty = (objr.RcptMultDiv == "D" ? (objr.RcptQty / objr.RcptConvFact) : (objr.RcptQty * objr.RcptConvFact));
                                OldQty = (objr.RcptMultDiv == "D" ? (objPO_Tr.RcptQty / objPO_Tr.RcptConvFact) : objPO_Tr.RcptQty * objPO_Tr.RcptConvFact);
                                if (objIN_ItemLoc != null && objIN_Inventory.StkItem == 1)
                                {
                                    UpdateAllocSOLoc(objIN_Inventory.InvtID, objPO_Tr.SiteID, objPO_Tr.WhseLoc, OldQty, NewQty, 0, true);

                                    UpdateAllocSOLoc(objIN_Inventory.InvtID, objr.SiteID, objr.WhseLoc, OldQty, NewQty, 0, false);


                                }
                            }
                        }

                        var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == objr.InvtID && p.SiteID == objr.SiteID).FirstOrDefault();
                        //Kiem tra itemsite neu chua co thi add vao
                        if (objIN_ItemSite == null && lstInItemsiteNew.Where(p => p.InvtID == objr.InvtID && p.SiteID == objr.SiteID).Count() == 0)
                        {
                            Insert_IN_ItemSite(ref objIN_ItemSite, ref objIN_Inventory, objr.SiteID);
                        }
                        //Update Location and Site Qty
                        if (_poHead.RcptType == "X")
                        {
                            double OldQty = 0;
                            double NewQty = 0;
                            NewQty = (objr.RcptMultDiv == "D" ? (objr.RcptQty / objr.RcptConvFact) : (objr.RcptQty * objr.RcptConvFact));
                            OldQty = (objr.RcptMultDiv == "D" ? (objPO_Tr.RcptQty / objPO_Tr.RcptConvFact) : objPO_Tr.RcptQty * objPO_Tr.RcptConvFact);

                            if (objIN_ItemSite != null && objIN_Inventory.StkItem == 1)
                            {
                                UpdateAllocSO(objIN_Inventory.InvtID, objPO_Tr.SiteID, OldQty, NewQty, 0, true);

                                UpdateAllocSO(objIN_Inventory.InvtID, objr.SiteID, OldQty, NewQty, 0, false);
                            }
                        }
                    }
                }
                objPO_Tr.WhseLoc = objr.WhseLoc.PassNull();
                objPO_Tr.CostVouched = objr.CostVouched;
                objPO_Tr.UnitCost = objr.UnitCost;
                objPO_Tr.RcptFee = objr.RcptFee;
                objPO_Tr.DocDiscAmt = objr.DocDiscAmt;
                objPO_Tr.DiscPct = objr.DiscPct;
                objPO_Tr.ExtVolume = objr.ExtVolume;
                objPO_Tr.ExtWeight = objr.ExtWeight;
                objPO_Tr.InvtID = objr.InvtID;
                objPO_Tr.JrnlType = string.IsNullOrEmpty(objr.PONbr) ? "PO" : objr.JrnlType;
                objPO_Tr.OrigRcptDate = _poHead.RcptDate.ToDateShort();
                objPO_Tr.OrigRcptNbr = objr.OrigRcptNbr;
                objPO_Tr.OrigRetRcptNbr = objr.OrigRetRcptNbr;
                objPO_Tr.POLineRef = objr.POLineRef;
                objPO_Tr.PONbr = objr.PONbr;
                objPO_Tr.POOriginal = objr.POOriginal;
                objPO_Tr.PurchaseType = objr.PurchaseType;
                objPO_Tr.RcptConvFact = objr.RcptConvFact == 0 ? 1 : objr.RcptConvFact;
                objPO_Tr.UnitMultDiv = objr.UnitMultDiv;
                objPO_Tr.CnvFact = objr.CnvFact;
                objPO_Tr.Qty = objr.Qty;
                objPO_Tr.PosmID = objr.PosmID.PassNull();
                objPO_Tr.DiscCode = objr.DiscCode.PassNull();
                if (string.IsNullOrEmpty(objr.PONbr))
                {
                    if (objr.UnitMultDiv == "M")
                    {
                        objPO_Tr.Qty = objr.RcptMultDiv == "M" ? objr.RcptConvFact * objr.RcptQty / objPO_Tr.CnvFact : (objr.RcptQty / objr.RcptConvFact) / objPO_Tr.CnvFact;
                    }
                    else
                    {
                        objPO_Tr.Qty = objr.RcptMultDiv == "M" ? objr.RcptConvFact * objr.RcptQty * objPO_Tr.CnvFact : objr.RcptQty / objr.RcptConvFact * objPO_Tr.CnvFact;
                    }
                }
                objPO_Tr.MaxReturnQty = objr.MaxReturnQty;
                objPO_Tr.QtyVouched = objr.QtyVouched;
                objPO_Tr.RcptDate = _poHead.RcptDate.ToDateShort();
                objPO_Tr.RcptMultDiv = objr.RcptMultDiv;
                objPO_Tr.RcptQty = objr.RcptQty;
                objPO_Tr.RcptUnitDescr = objr.RcptUnitDescr;
                objPO_Tr.ReasonCD = objr.ReasonCD;
                objPO_Tr.SiteID = objr.SiteID;
                objPO_Tr.TaxCat = objr.TaxCat;
                objPO_Tr.TaxID00 = objr.TaxID00;
                objPO_Tr.TaxID01 = objr.TaxID01;
                objPO_Tr.TaxID02 = objr.TaxID02;
                objPO_Tr.TaxID03 = objr.TaxID03;
                objPO_Tr.TaxAmt00 = objr.TaxAmt00;
                objPO_Tr.TaxAmt01 = objr.TaxAmt01;
                objPO_Tr.TaxAmt02 = objr.TaxAmt02;
                objPO_Tr.TaxAmt03 = objr.TaxAmt03;
                objPO_Tr.TxblAmt00 = objr.TxblAmt00;
                objPO_Tr.TxblAmt01 = objr.TxblAmt01;
                objPO_Tr.TxblAmt02 = objr.TxblAmt02;
                objPO_Tr.TxblAmt03 = objr.TxblAmt03;
                objPO_Tr.TranDate = _poHead.RcptDate.ToDateShort();
                objPO_Tr.TranDesc = objr.TranDesc;
                objPO_Tr.TranType = _poHead.RcptType;
                objPO_Tr.UnitDescr = objr.UnitDescr;
                objPO_Tr.UnitVolume = objr.UnitVolume;
                objPO_Tr.UnitWeight = objr.UnitWeight;
                objPO_Tr.VendID = _poHead.VendID;
                objPO_Tr.VouchStage = objr.VouchStage;
                objPO_Tr.TranAmt = objr.TranAmt;
                objPO_Tr.LUpd_DateTime = DateTime.Now;
                objPO_Tr.LUpd_Prog = _screenNbr;
                objPO_Tr.LUpd_User = Current.UserName;
                objPO_Tr.FromPO10200 = objr.FromPO10200;
                objPO_Tr.DiscID = objr.DiscID;
                objPO_Tr.DiscSeq = objr.DiscSeq;

                objPO_Tr.Revenue = objr.Revenue;
                objPO_Tr.Level = objr.Level;
                objPO_Tr.LineGiftPoint = objr.LineGiftPoint;
                objPO_Tr.ReferDescr = objr.ReferDescr;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }
        private void Update_PO_LotTrans(PO10200_pgLotTrans_Result row, PO_LotTrans objPO_LotTrans, bool isNew)
        {
            DateTime date;
            if (isNew)
            {
                objPO_LotTrans.BranchID = _branchID;
                objPO_LotTrans.BatNbr = _batNbr;
                objPO_LotTrans.LotSerNbr = row.LotSerNbr;
                objPO_LotTrans.RefNbr = _rcptNbr;
                objPO_LotTrans.POTranLineRef = row.POTranLineRef;
                objPO_LotTrans.Crtd_Prog = _screenNbr;
                objPO_LotTrans.Crtd_User = Current.UserName;
                objPO_LotTrans.Crtd_DateTime = DateTime.Now;
            }
            objPO_LotTrans.MfcDate = row.MfcDate;
            objPO_LotTrans.WhseLoc = row.WhseLoc.PassNull();
            objPO_LotTrans.ExpDate = row.ExpDate;
            objPO_LotTrans.WarrantyDate = row.WarrantyDate;

            objPO_LotTrans.InvtID = row.InvtID;
            objPO_LotTrans.InvtMult = (_poHead.RcptType == "X" ? short.Parse("-1") : short.Parse("1"));
            objPO_LotTrans.KitID = row.KitID;
            objPO_LotTrans.MfgrLotSerNbr = row.MfgrLotSerNbr;
            objPO_LotTrans.Qty = row.Qty;
            objPO_LotTrans.SiteID = row.SiteID;
            objPO_LotTrans.WhseLoc = row.WhseLoc;
            objPO_LotTrans.CnvFact = row.CnvFact;
            objPO_LotTrans.ToSiteID = row.ToSiteID;
            objPO_LotTrans.TranDate = _poHead.RcptDate.Value;
            objPO_LotTrans.TranType = _poHead.RcptType;
            objPO_LotTrans.UnitCost = row.UnitCost;
            objPO_LotTrans.UnitPrice = row.UnitPrice;

            if (DateTime.TryParse(row.WarrantyDate.ToString(), out date))
            {
                
                objPO_LotTrans.WarrantyDate = row.WarrantyDate.Year == 0001 ? DateTime.Parse("1900-01-01") : row.WarrantyDate;
            }

            objPO_LotTrans.UnitMultDiv = row.UnitMultDiv;
            objPO_LotTrans.UnitDesc = row.UnitDesc;
            objPO_LotTrans.WhseLoc = row.WhseLoc;
            objPO_LotTrans.MaxReturnQty = row.MaxReturnQty;
            objPO_LotTrans.LUpd_Prog = _screenNbr;
            objPO_LotTrans.LUpd_User = Current.UserName;
            objPO_LotTrans.LUpd_DateTime = DateTime.Now;
        }
        public void Insert_IN_ItemSite(ref IN_ItemSite objIN_ItemSite, ref PO10200_pdIN_Inventory_Result objIN_Inventory, string SiteID)
        {
            try
            {
                objIN_ItemSite = new IN_ItemSite();
                objIN_ItemSite.InvtID = objIN_Inventory.InvtID;
                objIN_ItemSite.SiteID = SiteID;
                objIN_ItemSite.AvgCost = 0;
                objIN_ItemSite.QtyAlloc = 0;
                objIN_ItemSite.QtyAllocIN = 0;
                objIN_ItemSite.QtyAllocPORet = 0;
                objIN_ItemSite.QtyAllocSO = 0;
                objIN_ItemSite.QtyAvail = 0;
                objIN_ItemSite.QtyInTransit = 0;
                objIN_ItemSite.QtyOnBO = 0;
                objIN_ItemSite.QtyOnHand = 0;
                objIN_ItemSite.QtyOnPO = 0;
                objIN_ItemSite.QtyOnTransferOrders = 0;
                objIN_ItemSite.QtyOnSO = 0;
                objIN_ItemSite.QtyShipNotInv = 0;
                objIN_ItemSite.StkItem = objIN_Inventory.StkItem ?? 0;
                objIN_ItemSite.TotCost = 0;
                objIN_ItemSite.LastPurchaseDate = DateTime.Now;
                objIN_ItemSite.Crtd_DateTime = DateTime.Now;
                objIN_ItemSite.Crtd_Prog = _screenNbr;
                objIN_ItemSite.Crtd_User = Current.UserName;
                objIN_ItemSite.LUpd_DateTime = DateTime.Now;
                objIN_ItemSite.LUpd_Prog = _screenNbr;
                objIN_ItemSite.LUpd_User = Current.UserName;
                objIN_ItemSite.tstamp = new byte[0];
                _db.IN_ItemSite.AddObject(objIN_ItemSite);
                lstInItemsiteNew.Add(objIN_ItemSite);
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }

        public void UpdateAllocSO(string invtID, string siteID, double oldQty, double newQty, int decQty, bool old)
        {
            if (old)
            {
                IN_ItemSite objItemSite = _db.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID);
                if (objItemSite != null)
                {
                    objItemSite.QtyAllocPORet = Math.Round(objItemSite.QtyAllocPORet - oldQty, 0);
                    objItemSite.QtyAvail = Math.Round(objItemSite.QtyAvail + oldQty, 0);
                    if (objItemSite.QtyAvail < 0)
                    {
                        throw new MessageException(MessageType.Message, "35");
                    }
                }
            }
            else
            {
                IN_ItemSite objItemSite = _db.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID);
                if (objItemSite != null)
                {
                    objItemSite.QtyAllocPORet = Math.Round(objItemSite.QtyAllocPORet + newQty, 0);
                    objItemSite.QtyAvail = Math.Round(objItemSite.QtyAvail - newQty, 0);
                    if (objItemSite.QtyAvail < 0)
                    {
                        throw new MessageException(MessageType.Message, "35");
                    }
                }
            }

        }

        public void UpdateAllocSOLoc(string invtID, string siteID, string whseLoc, double oldQty, double newQty, int decQty, bool old)
        {
            if (old)
            {
                IN_ItemLoc objItemLoc = _db.IN_ItemLoc.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID && p.WhseLoc == whseLoc);
                if (objItemLoc != null)
                {
                    objItemLoc.QtyAllocPORet = Math.Round(objItemLoc.QtyAllocPORet - oldQty, 0);
                    objItemLoc.QtyAvail = Math.Round(objItemLoc.QtyAvail + oldQty, 0);
                    if (objItemLoc.QtyAvail < 0)
                    {
                        throw new MessageException(MessageType.Message, "35");
                    }
                }
            }
            else
            {
                IN_ItemLoc objItemLoc = _db.IN_ItemLoc.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID && p.WhseLoc == whseLoc);
                if (objItemLoc != null)
                {
                    objItemLoc.QtyAllocPORet = Math.Round(objItemLoc.QtyAllocPORet + newQty, 0);
                    objItemLoc.QtyAvail = Math.Round(objItemLoc.QtyAvail - newQty, 0);
                    if (objItemLoc.QtyAvail < 0)
                    {
                        throw new MessageException(MessageType.Message, "35");
                    }
                }
            }

        }


        public void Insert_IN_ItemLoc(ref IN_ItemLoc objIN_ItemLoc, ref PO10200_pdIN_Inventory_Result objIN_Inventory, string SiteID, string whseLoc)
        {
            try
            {
                objIN_ItemLoc = new IN_ItemLoc();
                objIN_ItemLoc.InvtID = objIN_Inventory.InvtID;
                objIN_ItemLoc.SiteID = SiteID;
                objIN_ItemLoc.WhseLoc = whseLoc;
                objIN_ItemLoc.AvgCost = 0;
                objIN_ItemLoc.QtyAlloc = 0;
                objIN_ItemLoc.QtyAllocIN = 0;
                objIN_ItemLoc.QtyAllocPORet = 0;
                objIN_ItemLoc.QtyAllocSO = 0;
                objIN_ItemLoc.QtyAvail = 0;
                objIN_ItemLoc.QtyInTransit = 0;
                objIN_ItemLoc.QtyOnBO = 0;
                objIN_ItemLoc.QtyOnHand = 0;
                objIN_ItemLoc.QtyOnPO = 0;
                objIN_ItemLoc.QtyOnTransferOrders = 0;
                objIN_ItemLoc.QtyOnSO = 0;
                objIN_ItemLoc.QtyShipNotInv = 0;
                objIN_ItemLoc.StkItem = objIN_Inventory.StkItem ?? 0;
                objIN_ItemLoc.TotCost = 0;
                objIN_ItemLoc.LastPurchaseDate = DateTime.Now;
                objIN_ItemLoc.Crtd_DateTime = DateTime.Now;
                objIN_ItemLoc.Crtd_Prog = _screenNbr;
                objIN_ItemLoc.Crtd_User = Current.UserName;
                objIN_ItemLoc.LUpd_DateTime = DateTime.Now;
                objIN_ItemLoc.LUpd_Prog = _screenNbr;
                objIN_ItemLoc.LUpd_User = Current.UserName;
                objIN_ItemLoc.tstamp = new byte[0];
                _db.IN_ItemLoc.AddObject(objIN_ItemLoc);
                lstInItemlocNew.Add(objIN_ItemLoc);
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }

        private bool Data_Checking(bool isCheckInvoicePass = false)
        {
            CheckCloseDate();
            if (_poHead.Status == "H")
            {
                if (_objPO_Setup == null)
                {
                    throw new MessageException(MessageType.Message, "20404",
                      parm: new[] { "PO_Setup" });
                }

                //Check PO has no detail data
                if (_lstPOTrans.Count == 0)
                {
                    throw new MessageException(MessageType.Message, "704");
                }
                if (_lstPOTrans.Where(p => string.IsNullOrEmpty(p.RcptUnitDescr.PassNull())).Count() > 0)
                {
                    throw new MessageException(MessageType.Message, "25");
                }
                for (Int32 i = 0; i < _lstPOTrans.Count; i++)
                {
                    PO10200_pgDetail_Result objPO_Trans = new PO10200_pgDetail_Result();
                    objPO_Trans = _lstPOTrans[i];
                    if ((objPO_Trans.PurchaseType == "GI" || objPO_Trans.PurchaseType == _ICPurchaseType || objPO_Trans.PurchaseType == _DPPurchageType || objPO_Trans.PurchaseType == "GP") && (objPO_Trans.SiteID.Length == 0))
                    {
                        throw new MessageException(MessageType.Message, "222");
                    }
                    if ((objPO_Trans.RcptQty == 0 || objPO_Trans.TranAmt == 0) && objPO_Trans.PurchaseType != "PR" && objPO_Trans.PurchaseType != _DPPurchageType)
                    {
                        if (objPO_Trans.ClassID != DiscountClassID && objPO_Trans.PosmID.PassNull() == string.Empty && objPO_Trans.DiscCode == string.Empty)
                        {
                            throw new MessageException(MessageType.Message, "44");
                        }
                    }
                }


                if (_poHead.RcptType == "X")
                {
                    string invtID = "";

                    //kiểm tra trong itemLoc
                    foreach (var objTran in _lstPOTrans)
                    {
                        if (objTran.WhseLoc.PassNull() != "")
                        {
                            var objold = _db.PO_Trans.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RcptNbr == _rcptNbr && p.InvtID == objTran.InvtID && p.SiteID == objTran.SiteID && p.LineRef == objTran.LineRef).FirstOrDefault();
                            var qtyold = objold == null ? 0 : objold.UnitMultDiv == "M" ? objold.RcptQty * objold.RcptConvFact : objold.RcptQty / objold.RcptConvFact;
                            var qty = objTran.UnitMultDiv == "M" ? objTran.RcptQty * objTran.RcptConvFact : objTran.RcptQty / objTran.RcptConvFact;
                            var objItemLoc = _db.IN_ItemLoc.Where(p => p.InvtID == objTran.InvtID && p.SiteID == objTran.SiteID && p.WhseLoc == objTran.WhseLoc).FirstOrDefault();

                            if (objItemLoc == null || (qty - qtyold) > objItemLoc.QtyAvail)
                            {
                                invtID += objTran.InvtID + ",";
                            }
                        }

                    }
                    if (invtID != "") throw new MessageException(MessageType.Message, "1043", parm: new[] { invtID, "" });//2018070212

                    //kiểm tra trong itemSite
                    foreach (var objTran in _lstPOTrans)
                    {
                        var objold = _db.PO_Trans.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RcptNbr == _rcptNbr && p.InvtID == objTran.InvtID && p.SiteID == objTran.SiteID && p.LineRef == objTran.LineRef).FirstOrDefault();
                        var qtyold = objold == null ? 0 : objold.UnitMultDiv == "M" ? objold.RcptQty * objold.RcptConvFact : objold.RcptQty / objold.RcptConvFact;
                        var qty = objTran.UnitMultDiv == "M" ? objTran.RcptQty * objTran.RcptConvFact : objTran.RcptQty / objTran.RcptConvFact;
                        var objItemSite = _db.IN_ItemSite.Where(p => p.InvtID == objTran.InvtID && p.SiteID == objTran.SiteID).FirstOrDefault();

                        if (objItemSite == null || (qty - qtyold) > objItemSite.QtyAvail)
                        {
                            invtID += objTran.InvtID + ",";
                        }
                    }
                    if (invtID != "") throw new MessageException(MessageType.Message, "1043", parm: new[] { invtID, "" });
                    //kiểm tra trong itemlot
                    foreach (var objlot in _lstLot)
                    {
                        var objold = _db.PO_LotTrans.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RefNbr == _rcptNbr && p.POTranLineRef == objlot.POTranLineRef && p.LotSerNbr == objlot.LotSerNbr && p.InvtID == objlot.InvtID && p.SiteID == objlot.SiteID).FirstOrDefault();
                        var qtyold = objold == null ? 0 : objold.UnitMultDiv == "M" ? objold.Qty * objold.CnvFact : objold.Qty / objold.CnvFact;
                        var qty = objlot.UnitMultDiv == "M" ? objlot.Qty * objlot.CnvFact : objlot.Qty / objlot.CnvFact;
                        if (objlot.WhseLoc.PassNull() != "")
                        {
                            var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == objlot.InvtID && p.SiteID == objlot.SiteID && p.LotSerNbr == objlot.LotSerNbr && p.WhseLoc == objlot.WhseLoc).FirstOrDefault();
                            if (objItemLot == null || (qty - qtyold) > objItemLot.QtyAvail)
                            {
                                invtID += objlot.InvtID + ",";
                            }
                        }
                        else
                        {
                            var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == objlot.InvtID && p.SiteID == objlot.SiteID && p.LotSerNbr == objlot.LotSerNbr).FirstOrDefault();
                            if (objItemLot == null || (qty - qtyold) > objItemLot.QtyAvail)
                            {
                                invtID += objlot.InvtID + ",";
                            }
                        }
                    }
                    if (invtID != "") throw new MessageException(MessageType.Message, "1043", parm: new[] { invtID, "" });
                }

                var checkInvcNoteInvcNbr = true;
                if (_poHead.RcptType == "X" && _poHead.InvcNote == "" && _poHead.InvcNbr == "")
                {
                    checkInvcNoteInvcNbr = false;
                }
                if (checkInvcNoteInvcNbr)
                {
                    var objCheckExistingInvcNbr = _db.PO10200_ppCheckExistingInvcNbr(_branchID, _batNbr, _poHead.VendID, _poHead.InvcNote, _poHead.InvcNbr).FirstOrDefault();
                    if (objCheckExistingInvcNbr != null && !isCheckInvoicePass)
                    {
                        throw new MessageException(MessageType.Message, "235", fn: "process235");
                    }
                }

            }
            return true;
        }
        private string GetStatus(string status, string handle, bool inTransit)
        {
            if ((handle == "N" || handle == "") && inTransit)
            {
                return "T";
            }
            return status;
        }
        private bool CheckCloseDate()
        {
            string status = _poHead.Status, toStatus = _poHead.Status;
            if (string.IsNullOrWhiteSpace(_poHead.Status))
            {
                status = "H";
            }
            if (string.IsNullOrWhiteSpace(_handle) || _handle == "N")
            {
                if (_poHead.InTransit)
                {
                    toStatus = "T";
                }
                else
                {
                    toStatus = status;
                }
            }
            else if (_handle == "R")
            {
                toStatus = "C";
            }
            else if (_handle == "V")
            {
                toStatus = "V";
            }
            if (_db.PO10200_ppCheckCloseDate(_branchID, _poHead.RcptDate.ToDateShort(), _poHead.InvcDate.ToDateShort(), _poHead.BatNbr.PassNull(), status, toStatus, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault() == "0")
            {
                throw new MessageException(MessageType.Message, "301");
            }
            return true;
        }
        private void Data_Release()
        {
            if (_handle != "N")
            {
                DataAccess dal = Util.Dal();
                try
                {
                    POProcess.PO po = new POProcess.PO(Current.UserName, _screenNbr, dal);
                    if (_handle == "R")
                    {
                        dal.BeginTrans(IsolationLevel.ReadCommitted);
                        if (!po.PO10200_Release(_branchID, _batNbr, _rcptNbr))
                        {
                            dal.RollbackTrans();
                        }
                        else
                        {
                            dal.CommitTrans();
                        }
                        Util.AppendLog(ref _logMessage, "9999", "", data: new { success = true, batNbr = _batNbr });
                    }
                    else if (_handle == "C" || _handle == "V")
                    {
                        var objCheck = _db.PO10200_ppCheckCancel(_branchID, _batNbr, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();

                        if (objCheck != null && string.IsNullOrWhiteSpace(objCheck.BatNbr))
                        {
                            dal.BeginTrans(IsolationLevel.ReadCommitted);
                            if (!po.PO10200_Cancel(_branchID, _batNbr, _rcptNbr, _form["b714"].ToBool()))
                            {
                                dal.RollbackTrans();
                            }
                            else
                            {
                                dal.CommitTrans();
                            }
                        }
                        else
                        {
                            throw new MessageException(MessageType.Message, "2018010102", "", parm: new[] { _batNbr, objCheck.BatNbr });
                        }
                        Util.AppendLog(ref _logMessage, "9999", data: new { success = true, batNbr = _batNbr });
                    }
                    po = null;
                }
                catch (Exception)
                {
                    dal.RollbackTrans();
                    throw;
                }
            }
        }
        [HttpPost]
        public ActionResult Report(FormCollection data)
        {
            try
            {
                _batNbr = data["cboBatNbr"];
                _rcptNbr = data["RcptNbr"];
                _branchID = data["cboBranchID"];
                var detHeader = new StoreDataHandler(data["lstHeader"]);
                _poHead = detHeader.ObjectData<PO10200_pdHeader_Result>().FirstOrDefault();
                string reportName = _poHead.RcptType == "R" ? "PO_Receipt" : "PO_Return";
                var rpt = new RPTRunning();
                rpt.ResetET();
                rpt.ReportNbr = "PO603";
                rpt.MachineName = "Web";
                rpt.ReportCap = "ReportName";
                rpt.ReportName = reportName;
                rpt.ReportDate = DateTime.Now;
                rpt.DateParm00 = DateTime.Now;
                rpt.DateParm01 = DateTime.Now;
                rpt.DateParm02 = DateTime.Now;
                rpt.DateParm03 = DateTime.Now;
                rpt.StringParm00 = _branchID;
                rpt.StringParm01 = _batNbr;
                rpt.StringParm02 = _rcptNbr;
                rpt.UserID = Current.UserName;
                rpt.AppPath = "Reports\\";
                rpt.ClientName = Current.UserName;
                rpt.LoggedCpnyID = Current.CpnyID;
                rpt.CpnyID = Current.CpnyID;
                rpt.LangID = Current.LangID;
                _db.RPTRunnings.AddObject(rpt);
                _db.SaveChanges();
                return Json(new { success = true, reportID = rpt.ReportID, reportName });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }

        [ValidateInput(false)]
        public ActionResult Cancel(FormCollection data, string invcNote, string invcNbr)
        {
            try
            {
                var acc = Session["PO10200"] as AccessRight;
                _branchID = data["cboBranchID"];
                _status = data["Status"].PassNull();
                _rcptNbr = data["RcptNbr"];
                _batNbr = data["cboBatNbr"];
                _handle = data["Handle"].PassNull() == "" ? _status : data["Handle"].PassNull();
                var detHeader = new StoreDataHandler(data["lstHeader"]);
                _poHead = detHeader.ObjectData<PO10200_pdHeader_Result>().FirstOrDefault();
                var objCheck = _db.PO10200_pdCheckCancel(_branchID, _batNbr, _rcptNbr, _status, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (objCheck != null)
                {
                    if (string.IsNullOrWhiteSpace(objCheck.Result))
                    {
                        _db.PO10200_ppCancelBatch(_branchID, _batNbr, _rcptNbr, _poHead.RcptType, _status, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                    }
                    else
                    {
                        throw new MessageException(MessageType.Message, "20410", parm: new[] { objCheck.Result });
                    }
                }
                return Util.CreateMessage(MessageProcess.Save, new { batNbr = _batNbr });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }
        #endregion

        #region -Export-
        [HttpPost]
        public ActionResult Export4KIDO(FormCollection data, string inputDate)
        {
            try
            {
                string branchID = data["cboBranchID"].ToString();
                Stream stream = new MemoryStream();
                Workbook workbook = new Workbook();
                Worksheet sheetDet = workbook.Worksheets[0];
                sheetDet.Name = "PO10200_Receipt";
                #region -Master data-
                DataAccess dal = Util.Dal();

                Cell cell;
                int maxRow = 2000;
                ParamCollection pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@BranchID", DbType.String, branchID, ParameterDirection.Input, 30));
                DataTable dtBranch = dal.ExecDataTable("PO10200_pdBranchAllByUserExp", CommandType.StoredProcedure, ref pc);
                // du lieu BranchID
                int iRow = 1;
                for (int i = 0; i < dtBranch.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AA" + iRow];
                    cell.PutValue(dtBranch.Rows[i]["CpnyID"].PassNull());
                    cell = sheetDet.Cells["AB" + iRow];
                    cell.PutValue(dtBranch.Rows[i]["CpnyName"].PassNull());
                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@BranchID", DbType.String, branchID, ParameterDirection.Input, 30));
                DataTable dtInvtID = dal.ExecDataTable("PO10200_piInventoryExp", CommandType.StoredProcedure, ref pc);
                // du lieu Inventory
                iRow = 1;
                for (int i = 0; i < dtInvtID.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AG" + iRow];
                    cell.PutValue(dtInvtID.Rows[i]["InvtID"].PassNull());
                    cell = sheetDet.Cells["AH" + iRow];
                    cell.PutValue(dtInvtID.Rows[i]["Descr"].PassNull());
                    cell = sheetDet.Cells["AI" + iRow];
                    cell.PutValue(dtInvtID.Rows[i]["UOM"].PassNull());
                    cell = sheetDet.Cells["AJ" + iRow];
                    cell.PutValue(dtInvtID.Rows[i]["Price"].PassNull());
                    iRow++;
                }
                pc = new ParamCollection();
                AddDefaultParam(ref pc, true);
                DataTable dtPOSM = dal.ExecDataTable("PO10200_pcPOSM", CommandType.StoredProcedure, ref pc);
                // du lieu POSM
                iRow = 1;
                for (int i = 0; i < dtPOSM.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AM" + iRow];
                    cell.PutValue(dtPOSM.Rows[i]["PosmID"].PassNull());

                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@InputDate", DbType.String, inputDate, ParameterDirection.Input, 30));

                DataTable dtDiscCode = dal.ExecDataTable("PO10200_peDiscCode", CommandType.StoredProcedure, ref pc);
                // du lieu DiscCode
                iRow = 1;
                for (int i = 0; i < dtDiscCode.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AO" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["CpnyID"].PassNull());
                    cell = sheetDet.Cells["AP" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["DiscCode"].PassNull());
                    cell = sheetDet.Cells["AQ" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["Descr"].PassNull());
                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, true);
                DataTable dtReason = dal.ExecDataTable("PO10200_piReasonCode", CommandType.StoredProcedure, ref pc);
                // du lieu PurchaseType
                iRow = 1;
                for (int i = 0; i < dtReason.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AT" + iRow];
                    cell.PutValue(dtReason.Rows[i]["Code"].PassNull());
                    cell = sheetDet.Cells["AU" + iRow];
                    cell.PutValue(dtReason.Rows[i]["Descr"].PassNull());
                    iRow++;
                }

                #endregion

                #region template

                for (int colIdx = 0; colIdx < ColTexts.Count; colIdx++)
                {
                    if (ColTexts[colIdx] == "InvcDateOld" || ColTexts[colIdx] == "InvcDate" || ColTexts[colIdx] == "TruckRcptDateImp")
                    {
                        SetCellValueHD(sheetDet, sheetDet.Cells[0, colIdx], Util.GetLang(ColTexts[colIdx]) + Environment.NewLine + "(yyyy-MM-dd)");
                    }
                    else
                    {
                        string language = Util.GetLang(ColTexts[colIdx]).Replace("$", Environment.NewLine);
                        if (ColTexts[colIdx] == "PO10200DocType")
                        {
                            language = Util.GetLang("DocType") + language;
                        }
                        SetCellValueHD(sheetDet, sheetDet.Cells[0, colIdx], language);
                    }
                }

                #endregion

                #region formular
                int startRow = 1;
                // InvtID
                Validation validation = GetValidation(ref sheetDet, "=$AG$1:$AG$" + (dtInvtID.Rows.Count), "Chọn Mã Sản Phẩm", "Mã Sản Phẩm này không tồn tại hoặc đã hết tồn kho!");
                validation.AddArea(GetCellArea(startRow, maxRow, ColTexts.IndexOf("InvtID")));
                // BranchID
                validation = GetValidation(ref sheetDet, "=$AA$1:$AA$" + (dtBranch.Rows.Count), "Chọn Nhà Phân Phối", "Nhà Phân Phối này không tồn tại!");
                validation.AddArea(GetCellArea(startRow, maxRow, ColTexts.IndexOf("BranchID")));
                // ReasonCD
                validation = GetValidation(ref sheetDet, "=$AT$1:$AT$" + (dtReason.Rows.Count), "Chọn Lý Do", "Lý Do này không tồn tại!");
                validation.AddArea(GetCellArea(startRow, maxRow, ColTexts.IndexOf("ReasonCD")));
                // BranchName
                string formulaBranch = string.Format("=IF(ISERROR(VLOOKUP(A{0},$AA:$AB,2,0)),\"\",VLOOKUP(A{0},$AA:$AB,2,0))", 2);
                sheetDet.Cells[startRow, ColTexts.IndexOf("BranchName")].SetSharedFormula(formulaBranch, maxRow, 1);
                // InvtName
                string formulaDesctInvtID = string.Format("=IF(ISERROR(VLOOKUP(N{0},$AG:$AH,2,0)),\"\",VLOOKUP(N{0},$AG:$AH,2,0))", 2);
                sheetDet.Cells[startRow, ColTexts.IndexOf("InvtName")].SetSharedFormula(formulaDesctInvtID, maxRow, 1);
                #endregion

                sheetDet.AutoFitColumns();
                sheetDet.Cells.Columns[0].Width = 15;
                sheetDet.Cells.Columns[1].Width = 40;
                sheetDet.Cells.Columns[5].Width = 15;
                sheetDet.Cells.Columns[7].Width = 20;
                sheetDet.Cells.Columns[9].Width = 15;
                sheetDet.Cells.Columns[9].Width = 15;
                sheetDet.Cells.Columns[11].Width = 15;
                sheetDet.Cells.Columns[12].Width = 15;
                sheetDet.Cells.Columns[13].Width = 15;
                sheetDet.Cells.Columns[14].Width = 15;
                sheetDet.Cells.Columns[15].Width = 15;
                sheetDet.Cells.Columns[16].Width = 15;
                sheetDet.Cells.Columns[17].Width = 15;
                sheetDet.Cells.Columns[18].Width = 20;
                sheetDet.Cells.Columns[19].Width = 15;
                #region -Other format-
                Range range;
                string startIndex = "2";
                var style = sheetDet.Cells["A" + startIndex].GetStyle();
                style.IsLocked = false;
                style.Number = 49;
                range = sheetDet.Cells.CreateRange("A" + startIndex, "T" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["O" + startIndex].GetStyle();
                style.IsLocked = true;
                style.Number = 49;
                range = sheetDet.Cells.CreateRange("O" + startIndex, "O" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["P" + startIndex].GetStyle();
                style.IsLocked = false;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("P" + startIndex, "P" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["R" + startIndex].GetStyle();
                style.IsLocked = false;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("R" + startIndex, "R" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["AA1"].GetStyle();
                range = sheetDet.Cells.CreateRange("AA1", "AZ" + (6 + Math.Max(dtInvtID.Rows.Count, dtBranch.Rows.Count)));
                style.Font.Color = Color.Transparent;
                range.SetStyle(style);

                #endregion
                sheetDet.Protect(ProtectionType.All, "HQS0ftw@re2017", "HQS0ftw@re2017");
                workbook.Save(stream, SaveFormat.Xlsx);// .Excel97To2003);
                stream.Flush();
                stream.Position = 0;
                string contenType = "application/vnd.ms-excel";
                return new FileStreamResult(stream, contenType) { FileDownloadName = "PO10200_" + DateTime.Now.ToString("yyyyMMdd HHmmss") + ".xlsx" };
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                else
                {
                    return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
                }
            }
        }


        [HttpPost]
        public ActionResult Export(FormCollection data, string inputDate)
        {
            try
            {
                string branchID = data["cboBranchID"].ToString();
                Stream stream = new MemoryStream();
                Workbook workbook = new Workbook();
                Worksheet sheetDet = workbook.Worksheets[0];
                sheetDet.Name = "PO10200_Receipt";
                #region -Master data-
                DataAccess dal = Util.Dal();
                ParamCollection pc = new ParamCollection();
                Cell cell;
                int maxRow = 2000;
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@BranchID", DbType.String, branchID, ParameterDirection.Input, 30));
                DataTable dtBranch = dal.ExecDataTable("PO10200_pdBranchAllByUserExp", CommandType.StoredProcedure, ref pc);
                // du lieu BranchID
                int iRow = 1;
                for (int i = 0; i < dtBranch.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AA" + iRow];
                    cell.PutValue(dtBranch.Rows[i]["CpnyID"].PassNull());
                    cell = sheetDet.Cells["AB" + iRow];
                    cell.PutValue(dtBranch.Rows[i]["CpnyName"].PassNull());
                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                DataTable dtPurchaseType = dal.ExecDataTable("PO10200_pdPurchaseTypeExp", CommandType.StoredProcedure, ref pc);
                // du lieu PurchaseType
                iRow = 1;
                for (int i = 0; i < dtPurchaseType.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AD" + iRow];
                    cell.PutValue(dtPurchaseType.Rows[i]["Code"].PassNull());
                    cell = sheetDet.Cells["AE" + iRow];
                    cell.PutValue(dtPurchaseType.Rows[i]["Descr"].PassNull());
                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@BranchID", DbType.String, branchID, ParameterDirection.Input, 30));
                DataTable dtInvtID = dal.ExecDataTable("PO10200_piInventoryExp", CommandType.StoredProcedure, ref pc);
                dtInvtID.DefaultView.Sort = "InvtID";
                dtInvtID = dtInvtID.DefaultView.ToTable();
                iRow = 1;
                for (int i = 0; i < dtInvtID.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AG" + iRow];
                    cell.PutValue(dtInvtID.Rows[i]["InvtID"].PassNull());
                    cell = sheetDet.Cells["AH" + iRow];
                    cell.PutValue(dtInvtID.Rows[i]["Descr"].PassNull());
                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, true);
                DataTable dtPOSM = dal.ExecDataTable("PO10200_pcPOSM", CommandType.StoredProcedure, ref pc);
                // du lieu POSM
                iRow = 1;
                for (int i = 0; i < dtPOSM.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AM" + iRow];
                    cell.PutValue(dtPOSM.Rows[i]["PosmID"].PassNull());

                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@InputDate", DbType.String, inputDate, ParameterDirection.Input, 30));
                DataTable dtDiscCode = dal.ExecDataTable("PO10200_peDiscCodeEx", CommandType.StoredProcedure, ref pc);
                // du lieu DiscCode
                iRow = 2;
                for (int i = 0; i < dtDiscCode.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AO" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["CpnyID"].PassNull());
                    cell = sheetDet.Cells["AP" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["DiscCode"].PassNull());
                    cell = sheetDet.Cells["AQ" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["Descr"].PassNull());
                    cell = sheetDet.Cells["AR" + iRow];
                    cell.PutValue(dtDiscCode.Rows[i]["FreeItemID"].PassNull());
                    iRow++;
                }

                pc = new ParamCollection();
                AddDefaultParam(ref pc, false);
                pc.Add(new ParamStruct("@BranchID", DbType.String, branchID, ParameterDirection.Input, 30));
                DataTable dtUOM = dal.ExecDataTable("PO10200_pePriceExp", CommandType.StoredProcedure, ref pc);
                dtUOM.DefaultView.Sort = "BranchIDInvtID";
                dtUOM = dtUOM.DefaultView.ToTable();
                iRow = 2;
                for (int i = 0; i < dtUOM.Rows.Count; i++)
                {
                    cell = sheetDet.Cells["AV" + iRow];
                    cell.PutValue(dtUOM.Rows[i]["InvtID"].PassNull());
                    cell = sheetDet.Cells["AW" + iRow];
                    cell.PutValue(dtUOM.Rows[i]["UOM"].PassNull());
                    cell = sheetDet.Cells["AX" + iRow];
                    cell.PutValue(dtUOM.Rows[i]["Price"].PassNull());
                    cell = sheetDet.Cells["AU" + iRow];
                    cell.PutValue(dtUOM.Rows[i]["BranchID"].PassNull());
                    cell = sheetDet.Cells["AT" + iRow];
                    cell.PutValue(dtUOM.Rows[i]["BranchIDInvtIDUOM"].PassNull());
                    cell = sheetDet.Cells["AY" + iRow];
                    cell.PutValue(dtUOM.Rows[i]["BranchIDInvtID"].PassNull());
                    
                    iRow++;
                }

                #endregion

                #region template
                SetCellValueHH(sheetDet.Cells["B1"], Util.GetLang("DetailPO"), TextAlignmentType.Center, TextAlignmentType.Center, true);
                sheetDet.Cells.Merge(0, 1, 1, 8);
                SetCellValueHH(sheetDet.Cells["C2"], Util.GetLang("QuantityTotal"), TextAlignmentType.Center, TextAlignmentType.Right);
                sheetDet.Cells.Merge(1, 3, 1, 2);


                SetCellValueHH(sheetDet.Cells["C3"], Util.GetLang("TotUndiscounted"), TextAlignmentType.Center, TextAlignmentType.Right);
                sheetDet.Cells.Merge(2, 3, 1, 2);

                SetCellValueHH(sheetDet.Cells["C4"], Util.GetLang("AmtTot"), TextAlignmentType.Center, TextAlignmentType.Right);
                sheetDet.Cells.Merge(3, 3, 1, 2);

                SetCellValueHD(sheetDet, "A5", Util.GetLang("BranchID"));
                SetCellValueHD(sheetDet, "B5", Util.GetLang("BranchName"));
                SetCellValueHD(sheetDet, "C5", Util.GetLang("PONbr"));
                SetCellValueHD(sheetDet, "D5", Util.GetLang("InvcNote"));
                SetCellValueHD(sheetDet, "E5", Util.GetLang("InvcNbr"));
                SetCellValueHD(sheetDet, "F5", Util.GetLang("OrderDate") + Environment.NewLine + "(yyyy-MM-dd)");
                SetCellValueHD(sheetDet, "G5", Util.GetLang("InvcDate") + Environment.NewLine + "(yyyy-MM-dd)");
                SetCellValueHD(sheetDet, "H5", Util.GetLang("PurchaseType"));
                SetCellValueHD(sheetDet, "I5", Util.GetLang("InvtID"));
                SetCellValueHD(sheetDet, "J5", Util.GetLang("InvtName"));
                SetCellValueHD(sheetDet, "K5", Util.GetLang("LotSerNbr"));
                SetCellValueHD(sheetDet, "L5", Util.GetLang("PO10200ManufDate") + Environment.NewLine + "(yyyy-MM-dd)");
                SetCellValueHD(sheetDet, "M5", Util.GetLang("EXPDATE") + Environment.NewLine + "(yyyy-MM-dd)");
                SetCellValueHD(sheetDet, "N5", Util.GetLang("Unit"));
                SetCellValueHD(sheetDet, "O5", Util.GetLang("Price"));
                SetCellValueHD(sheetDet, "P5", Util.GetLang("Qty"));
                SetCellValueHD(sheetDet, "Q5", Util.GetLang("PO10200Undiscounted"));
                SetCellValueHD(sheetDet, "R5", Util.GetLang("DiscPct"));
                SetCellValueHD(sheetDet, "S5", Util.GetLang("Discount"));
                SetCellValueHD(sheetDet, "T5", Util.GetLang("LineAmt"));
                SetCellValueHD(sheetDet, "U5", Util.GetLang("PosmID"));
                SetCellValueHD(sheetDet, "V5", Util.GetLang("DiscCode"));

                #endregion

                #region formular

                Validation validationInvt = sheetDet.Validations[sheetDet.Validations.Add()];
                validationInvt.Type = Aspose.Cells.ValidationType.List;
                validationInvt.Operator = OperatorType.Between;
                validationInvt.InCellDropDown = true;
                validationInvt.Formula1 = "=$AG$1:$AG$" + (dtInvtID.Rows.Count);
                validationInvt.ShowError = true;
                validationInvt.AlertStyle = ValidationAlertType.Stop;
                validationInvt.ErrorTitle = "Lỗi mặt hàng";
                validationInvt.InputMessage = "Chọn mã mặt hàng";
                validationInvt.ErrorMessage = "Mã Sản Phẩm này không tồn tại hoặc đã hết tồn kho!";

                CellArea area;
                area.StartRow = 5;
                area.EndRow = maxRow;
                area.StartColumn = 8;
                area.EndColumn = 8;
                validationInvt.AddArea(area);

                var validationBranch = sheetDet.Validations[sheetDet.Validations.Add()];
                validationBranch.Type = Aspose.Cells.ValidationType.List;
                validationBranch.Operator = OperatorType.Between;
                validationBranch.InCellDropDown = true;
                validationBranch.Formula1 = "=$AA$1:$AA$" + (dtBranch.Rows.Count);
                validationBranch.ShowError = true;
                validationBranch.AlertStyle = ValidationAlertType.Stop;
                validationBranch.ErrorTitle = "Lỗi NPP";
                validationBranch.InputMessage = "Chọn NPP";
                validationBranch.ErrorMessage = "NPP này không tồn tại!";

                area.StartRow = 5;
                area.EndRow = maxRow;
                area.StartColumn = 0;
                area.EndColumn = 0;
                validationBranch.AddArea(area);

                var validationPurchaseType = sheetDet.Validations[sheetDet.Validations.Add()];
                validationPurchaseType.Type = Aspose.Cells.ValidationType.List;
                validationPurchaseType.Operator = OperatorType.Between;
                validationPurchaseType.InCellDropDown = true;
                validationPurchaseType.Formula1 = "=$AE$1:$AE$" + (dtPurchaseType.Rows.Count);
                validationPurchaseType.ShowError = true;
                validationPurchaseType.AlertStyle = ValidationAlertType.Stop;
                validationPurchaseType.ErrorTitle = "Lỗi Loại Nhập Hàng";
                validationPurchaseType.InputMessage = "Chọn Loại Nhập Hàng";
                validationPurchaseType.ErrorMessage = "Loại Nhập Hàng này không tồn tại!";

                area.StartRow = 5;
                area.EndRow = maxRow;
                area.StartColumn = 7;
                area.EndColumn = 7;
                validationPurchaseType.AddArea(area);

                if (dtPOSM.Rows.Count > 0)
                {
                    var validationPOSM = sheetDet.Validations[sheetDet.Validations.Add()];
                    validationPOSM.Type = Aspose.Cells.ValidationType.List;
                    validationPOSM.Operator = OperatorType.Between;
                    validationPOSM.InCellDropDown = true;
                    validationPOSM.Formula1 = "=$AM$1:$AM$" + (dtPOSM.Rows.Count);
                    validationPOSM.ShowError = true;
                    validationPOSM.AlertStyle = ValidationAlertType.Stop;
                    validationPOSM.ErrorTitle = "Lỗi Mã POSM";
                    validationPOSM.InputMessage = "Chọn Mã POSM";
                    validationPOSM.ErrorMessage = "Mã POSM này không tồn tại!";

                    area.StartRow = 5;
                    area.EndRow = maxRow;
                    area.StartColumn = 20;
                    area.EndColumn = 20;
                    validationPOSM.AddArea(area);
                }

                string formulaDiscCode = string.Format("=OFFSET($AO$1,IFERROR(MATCH((A{0}&I{0}&H{0}),$AO$2:$AO${1},0),{2}),1, IF(COUNTIF($AO$2:$AO${1},(A{0}&I{0}&H{0}))=0,1,COUNTIF($AO$2:$AO${1},(A{0}&I{0}&H{0}))),1)"
                                    , new string[] { "6", (dtDiscCode.Rows.Count + 1).ToString(), (dtDiscCode.Rows.Count + 2).ToString() });

                var validationDiscCode = sheetDet.Validations[sheetDet.Validations.Add()];
                validationDiscCode.Type = Aspose.Cells.ValidationType.List;
                validationDiscCode.Operator = OperatorType.Between;
                validationDiscCode.InCellDropDown = true;
                validationDiscCode.Formula1 = formulaDiscCode;
                validationDiscCode.ShowError = true;
                validationDiscCode.AlertStyle = ValidationAlertType.Stop;
                validationDiscCode.ErrorTitle = "Lỗi Mã KM";
                validationDiscCode.InputMessage = "Chọn Mã KM";
                validationDiscCode.ErrorMessage = "Mã KM này không tồn tại!";

                area.StartRow = 5;
                area.EndRow = maxRow;
                area.StartColumn = 21;
                area.EndColumn = 21;
                validationDiscCode.AddArea(area);

                //// Đơn Vị
                string formulaUOM = string.Format("=OFFSET($AW$1,IFERROR(MATCH(A{0}&I{0},$AY$2:$AY${1},0),{2}),0, IF(COUNTIF($AY$2:$AY${1},A{0}&I{0})=0,1,COUNTIF($AY$2:$AY${1},A{0}&I{0})),1)",
                       new string[] { "6", (dtUOM.Rows.Count).ToString(), (dtUOM.Rows.Count + 64).ToString() });

                var validationUOM = sheetDet.Validations[sheetDet.Validations.Add()];
                validationUOM.Type = Aspose.Cells.ValidationType.List;
                validationUOM.Operator = OperatorType.Between;
                validationUOM.InCellDropDown = true;
                validationUOM.Formula1 = formulaUOM;
                validationUOM.ShowError = true;
                validationUOM.AlertStyle = ValidationAlertType.Stop;
                validationUOM.ErrorTitle = "Lỗi Đơn Vị";
                validationUOM.InputMessage = "Chọn Đơn Vị";
                validationUOM.ErrorMessage = "Đơn Vị này không tồn tại!";

                area.StartRow = 5;
                area.EndRow = maxRow;
                area.StartColumn = 13;
                area.EndColumn = 13;
                validationUOM.AddArea(area);
                /// End Đơn Vị

                string formulaBranch = string.Format("=IF(ISERROR(VLOOKUP(A6,$AA:$AB,2,0)),\"\",VLOOKUP(A6,$AA:$AB,2,0))");
                sheetDet.Cells["B6"].SetSharedFormula(formulaBranch, maxRow, 1);

                string formulaDesctInvtID = string.Format("=IF(ISERROR(VLOOKUP(I6,$AG:$AH,2,0)),\"\",VLOOKUP(I6,$AG:$AH,2,0))");
                sheetDet.Cells["J6"].SetSharedFormula(formulaDesctInvtID, maxRow, 1);

                string formulaPrice = string.Format("=IF(ISERROR(VLOOKUP(A6&I6&N6,$AT:$AX,5,0)),\"\",VLOOKUP(A6&I6&N6,$AT:$AX,5,0))");
                sheetDet.Cells["O6"].SetSharedFormula(formulaPrice, maxRow, 1);

                string formulaTotQty = string.Format("=SUM({0}:{1})", "P6", "P" + maxRow);
                string formulaTotUndiscounted = string.Format("=SUM({0}:{1})", "Q6", "Q" + maxRow);
                string formulaTotAmt = string.Format("=SUM({0}:{1})", "T6", "T" + maxRow);
                sheetDet.Cells["D2"].SetSharedFormula(formulaTotQty, 1, 1);
                sheetDet.Cells["D3"].SetSharedFormula(formulaTotUndiscounted, 1, 1);
                sheetDet.Cells["D4"].SetSharedFormula(formulaTotAmt, 1, 1);

                string formulaUndiscounted = string.Format("=IF(OR(V6 <> \"\",OR(RIGHT({2},3)= \"PR\", U6 <> \"\")),0,IF({0}<> \"\",{0},0)*{1})", "O6", "P6", "H6");
                sheetDet.Cells["Q6"].SetSharedFormula(formulaUndiscounted, maxRow - 5, 1);

                string formulaTotamt = string.Format("=IF(Q6=0, 0, Q6-(IF(R6<> 0, Q6*R6/100, S6)))");
                sheetDet.Cells["T6"].SetSharedFormula(formulaTotamt, maxRow - 5, 1);

                #endregion

                sheetDet.AutoFitColumns();
                sheetDet.Cells.Columns[0].Width = 20;
                sheetDet.Cells.Columns[1].Width = 40;
                sheetDet.Cells.Columns[3].Width = 15;
                sheetDet.Cells.Columns[4].Width = 15;
                sheetDet.Cells.Columns[7].Width = 20;
                sheetDet.Cells.Columns[8].Width = 20;
                sheetDet.Cells.Columns[9].Width = 25;
                sheetDet.Cells.Columns[10].Width = 20;
                sheetDet.Cells.Columns[11].Width = 15;
                sheetDet.Cells.Columns[12].Width = 15;
                sheetDet.Cells.Columns[13].Width = 20;
                sheetDet.Cells.Columns[14].Width = 25;
                sheetDet.Cells.Columns[15].Width = 15;
                sheetDet.Cells.Columns[16].Width = 25;
                sheetDet.Cells.Columns[17].Width = 20;
                sheetDet.Cells.Columns[18].Width = 20;
                sheetDet.Cells.Columns[19].Width = 20;
                sheetDet.Cells.Columns[20].Width = 20;
                sheetDet.Cells.Columns[21].Width = 20;

                #region -Other format-
                Range range;
                var style = sheetDet.Cells["A6"].GetStyle();
                style.IsLocked = false;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("A6", "A" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["C6"].GetStyle();
                style.IsLocked = false;
                style.Number = 49;
                range = sheetDet.Cells.CreateRange("C6", "E" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["F6"].GetStyle();
                style.IsLocked = false;
                style.Custom = "yyyy-MM-dd";

                range = sheetDet.Cells.CreateRange("F6", "G" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["H6"].GetStyle();
                style.IsLocked = false;
                style.Number = 49;
                range = sheetDet.Cells.CreateRange("H6", "I" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["K6"].GetStyle();
                style.IsLocked = false;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("K6", "U" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["D2"].GetStyle();
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("D2", "D3");
                range.SetStyle(style);

                style = sheetDet.Cells["D4"].GetStyle();
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("D4");
                range.SetStyle(style);

                style = sheetDet.Cells["K6"].GetStyle();
                style.IsLocked = false;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("K6", "V" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["Q6"].GetStyle();
                style.IsLocked = true;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("Q6", "Q" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["T6"].GetStyle();
                style.IsLocked = true;
                style.Number = 3;
                range = sheetDet.Cells.CreateRange("T6", "T" + (maxRow));
                range.SetStyle(style);

                var objPOSetUp = _db.PO10200_pdCheckEditPrice(Current.UserName, Current.CpnyID, Current.LangID, branchID).FirstOrDefault();
                if (objPOSetUp != null)
                {
                    if (objPOSetUp.EditablePOPrice == false) // không cho phép sửa giá
                    {
                        style = sheetDet.Cells["O6"].GetStyle();
                        style.IsLocked = true;
                        style.Number = 3;
                        range = sheetDet.Cells.CreateRange("O6", "O" + (maxRow));
                        range.SetStyle(style);
                    }
                }

                style = sheetDet.Cells["K6"].GetStyle();
                style.IsLocked = false;
                style.Number = 49;
                range = sheetDet.Cells.CreateRange("K6", "K" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["L6"].GetStyle();
                style.IsLocked = false;
                style.Custom = "yyyy-MM-dd";
                range = sheetDet.Cells.CreateRange("L6", "L" + (maxRow));
                range.SetStyle(style);

                style = sheetDet.Cells["M6"].GetStyle();
                style.IsLocked = false;
                style.Custom = "yyyy-MM-dd";
                range = sheetDet.Cells.CreateRange("M6", "M" + (maxRow));
                range.SetStyle(style);

                var objCheckAddColunm = _sys.SYS_Configurations.FirstOrDefault(x => x.Code.ToLower() == "PO10200IntegrateERP");
                if (objCheckAddColunm != null)
                {
                    if (objCheckAddColunm.IntVal == 1)
                    {
                        SetCellValueHD(sheetDet, "W5", Util.GetLang("PO10200SONoERP"));
                        style = sheetDet.Cells["W6"].GetStyle();
                        style.IsLocked = false;
                        style.Number = 49;
                        range = sheetDet.Cells.CreateRange("W6", "W" + (maxRow));
                        range.SetStyle(style);
                        sheetDet.Cells.Columns[22].Width = 20;
                    }
                }

                style = sheetDet.Cells["AA1"].GetStyle();
                range = sheetDet.Cells.CreateRange("AA1", "AZ" + (10000 + (dtInvtID.Rows.Count > dtBranch.Rows.Count ? dtInvtID.Rows.Count : dtBranch.Rows.Count)));
                style.Font.Color = Color.Transparent;
                range.SetStyle(style);

                #endregion
                sheetDet.Protect(ProtectionType.All, "HQS0ftw@re2017", "HQS0ftw@re2017");
                workbook.Save(stream, SaveFormat.Xlsx);// .Excel97To2003);
                stream.Flush();
                stream.Position = 0;
                string contenType = "application/vnd.ms-excel";
                return new FileStreamResult(stream, contenType) { FileDownloadName = "PO10200_" + DateTime.Now.ToString("yyyyMMdd HHmmss") + ".xlsx" };
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                else
                {
                    return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
                }
            }
        }

        private void SetCellValueHD(Worksheet sheet, Cell cell, object value)
        {
            var style = cell.GetStyle();

            style.VerticalAlignment = TextAlignmentType.Center;
            style.HorizontalAlignment = TextAlignmentType.Center;
            style.Font.IsBold = true;
            style.Font.Size = 10;

            style.IsTextWrapped = true;
            style.Pattern = BackgroundType.Solid;
            style.ForegroundColor = Color.Goldenrod;
            style.Font.Color = Color.Black;
            style.VerticalAlignment = TextAlignmentType.Center;
            cell.SetStyle(style);
            cell.PutValue(value);
            sheet.Cells.SetRowHeight(0, 100);
        }

        private void SetCellValueHD(Worksheet sheet, string cell, object value)
        {
            var style = sheet.Cells[cell].GetStyle();

            style.VerticalAlignment = TextAlignmentType.Center;
            style.HorizontalAlignment = TextAlignmentType.Center;
            style.Font.IsBold = true;
            style.Font.Size = 10;

            style.IsTextWrapped = true;
            style.Pattern = BackgroundType.Solid;
            style.ForegroundColor = System.Drawing.ColorTranslator.FromHtml("#B6CDE6");
            style.Font.Color = Color.Navy;
            style.VerticalAlignment = TextAlignmentType.Center;
            sheet.Cells[cell].SetStyle(style);
            sheet.Cells[cell].PutValue(value);
            sheet.Cells.SetRowHeight(4, 30);
        }

        private bool AddDefaultParam(ref ParamCollection pc, bool isUserName)
        {
            if (isUserName)
            {
                pc.Add(new ParamStruct("@UserName", DbType.String, Current.UserName, ParameterDirection.Input, 30));
            }
            else
            {
                pc.Add(new ParamStruct("@UserID", DbType.String, Current.UserName, ParameterDirection.Input, 30));
            }

            pc.Add(new ParamStruct("@CpnyID", DbType.String, Current.CpnyID, ParameterDirection.Input, 30));
            pc.Add(new ParamStruct("@LangID", DbType.Int32, Current.LangID, ParameterDirection.Input, 4));
            return true;
        }
        private void SetCellValue(Cell c, string lang, TextAlignmentType alignV, TextAlignmentType alignH, bool isBold, int size, bool isTitle, bool isBackground = false)
        {
            c.PutValue(" " + lang);
            var style = c.GetStyle();
            style.Font.IsBold = isBold;
            style.Font.Size = size;
            style.HorizontalAlignment = alignH;
            style.VerticalAlignment = alignV;
            if (isTitle)
            {
                style.Font.Color = Color.Red;
            }
            if (isBackground)
            {
                style.Font.Color = Color.Red;
                style.Pattern = BackgroundType.Solid;
                style.ForegroundColor = Color.Yellow;
            }
            c.SetStyle(style);
        }

        private void SetCellHH(Worksheet sheet, string cell, object value, bool isNumber)
        {
            var style = sheet.Cells[cell].GetStyle();
            style.VerticalAlignment = TextAlignmentType.Center;
            if (isNumber)
            {
                style.Number = 3;
                style.HorizontalAlignment = TextAlignmentType.Right;
            }
            else
            {
                style.HorizontalAlignment = TextAlignmentType.Left;
                style.Number = 49;
            }

            style.Font.IsBold = true;
            style.Font.Size = 10;
            style.Font.Color = Color.Blue;

            sheet.Cells[cell].SetStyle(style);
            sheet.Cells[cell].PutValue(value);
        }

        private void SetCellValueHH(Cell c, string lang, TextAlignmentType alignV, TextAlignmentType alignH, bool isColor = false)
        {
            c.PutValue(" " + lang);
            var style = c.GetStyle();
            style.Font.IsBold = true;
            style.Font.Size = 10;
            if (isColor)
            {
                style.Font.Size = 15;
                style.Font.Color = Color.Blue;

            }
            style.HorizontalAlignment = alignH;
            style.VerticalAlignment = alignV;
            c.SetStyle(style);
        }

        private Validation GetValidation(ref Worksheet worksheet, string formular, string inputMess, string errMess)
        {
            var validation = worksheet.Validations[worksheet.Validations.Add()];
            validation.IgnoreBlank = true;
            validation.Type = Aspose.Cells.ValidationType.List;
            validation.AlertStyle = Aspose.Cells.ValidationAlertType.Stop;
            validation.Operator = OperatorType.Between;
            validation.Formula1 = formular;
            validation.InputTitle = "";
            validation.InputMessage = inputMess;
            validation.ErrorMessage = errMess;
            return validation;
        }
        private CellArea GetCellArea(int startRow, int endRow, int columnIndex, int endColumnIndex = -1)
        {
            var area = new CellArea();
            area.StartRow = startRow;
            area.EndRow = endRow;
            area.StartColumn = columnIndex;
            area.EndColumn = endColumnIndex == -1 ? columnIndex : endColumnIndex;
            return area;
        }
        #endregion

        #region -Import-
        [HttpPost]
        public ActionResult ImportDet4KIDO(FormCollection data)
        {
            try
            {
                string branchID = data["cboBranchID"].ToString();
                _poHead = new PO10200_pdHeader_Result();
                Dictionary<string, List<PO10200_pgDetail_Result>> lstDetailImp = new Dictionary<string, List<PO10200_pgDetail_Result>>();
                var lstHeadImp = new List<PO10200_pdHeader_Result>();
                var acc = Session["PO10200"] as AccessRight;
                FileUploadField fileUploadField = X.GetCmp<FileUploadField>("btnImport");
                HttpPostedFile file = fileUploadField.PostedFile;
                FileInfo fileInfo = new FileInfo(file.FileName);
                string lineLanguage = Util.GetLang("Line");
                string message = string.Empty;
                int blankRow = 0;
                if (fileInfo.Extension.ToLower() == ".xls" || fileInfo.Extension.ToLower() == ".xlsx")
                {
                    try
                    {
                        Workbook workbook = new Workbook(fileUploadField.PostedFile.InputStream);
                        if (workbook.Worksheets.Count > 0)
                        {
                            #region -Variables-
                            string poSiteID = string.Empty;
                            string discSite = string.Empty;
                            var lstBranch = _db.PO10200_pdBranchAllByUserExp(branchID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstInvt = _db.PO10200_piInventoryExp(Current.UserName, Current.CpnyID, Current.LangID, branchID).ToList();
                            var lstInvtUnit = _db.PO10200_pePriceExp(Current.UserName, Current.CpnyID, Current.LangID, branchID).ToList(); // lấy dnah sach invent có Unit
                            List<string> lstHeader = new List<string>();
                            List<string> lstDetails = new List<string>();
                            // Field to get data from Excel
                            string BranchID = string.Empty;
                            string Module = string.Empty;
                            string RcptType = string.Empty;
                            string DocType = string.Empty;
                            DateTime TruckRcptDate = DateTime.Now;
                            string InvcNote = string.Empty;
                            string InvcNbr = string.Empty;
                            string ReplaceInvoice = string.Empty;
                            string InvcNoteOld = string.Empty;
                            string InvcNbrOld = string.Empty;
                            string InvcDateOldTmp = string.Empty;
                            DateTime InvcDateOld = new DateTime();
                            string PO10200PurchaseType = string.Empty;
                            string RevenueTmp = string.Empty;
                            double Revenue = 0;
                            string ReferDescr = string.Empty;
                            string OrderDateTmp = string.Empty;
                            DateTime OrderDate;
                            string InvcDateTmp = string.Empty;
                            DateTime InvcDate;
                            string PurchaseType = string.Empty;
                            string InvtID = string.Empty;
                            string InvtDescr = string.Empty;
                            string SlsUnit = string.Empty;
                            string PriceTmp = string.Empty;
                            double Price = 0d;
                            string SiteID = string.Empty;
                            string QtyOrdTmp = string.Empty;
                            double QtyOrd = 0d;
                            string ReasonCD = string.Empty;
                            string DiscPctTmp = string.Empty;
                            double DiscPct = 0d;
                            string DiscAmtTmp = string.Empty;
                            double DiscAmt = 0d;
                            string DiscCode = string.Empty;
                            string POSMID = string.Empty;
                            string Error = string.Empty;
                            string errorRows = string.Empty;
                            Worksheet workSheet = workbook.Worksheets[0];
                            var vend = _db.PO10200_pcVendor_Active(Current.UserName, BranchID, Current.CpnyID, Current.LangID).Where(x => x.VendID == "TAC").FirstOrDefault();
                            if (vend == null)
                            {
                                vend = new PO10200_pcVendor_Active_Result();
                                vend.VendID = "TAC";
                                vend.TaxID00 = "IVAT10";
                            }
                            Dictionary<int, int> lstMapExcelRow = new Dictionary<int, int>();
                            _lstInvt4CalcTax = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, branchID).ToList();
                            _lstUnitCnv4CalcTax = _db.PO10200_pdIN_UnitConversion().ToList();
                            var lstLot = new List<PO10200_pgLotTrans_Result>();
                            var lstPONbr = _db.PO10200_pdPONbrImp(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstPOSM = _db.PO10200_pcPOSM(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstDiscCode = _db.PO10200_peDiscCode(DateTime.Now.ToDateShort(),Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstReason = _db.PO10200_piReasonCode(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstSite = _db.PO10200_piUserDefault(string.Empty, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstDocType = new string[] { "AC", "AD", "VO", "BI" };
                            var lstModule = new string[] { "AP", "PO" };
                            var lstRcptType = new string[] { "R", "X" };
                            var lstPurchaseType = new string[] { "PR", "GI", "IC", "DP" };
                            #endregion

                            var requiredInvoice = false;
                            var objConfig = _db.PO10200_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                            if (objConfig != null)
                            {
                                requiredInvoice = objConfig.RequireInvoice ?? false;
                            }
                            for (int rowIndex = 1; rowIndex <= workSheet.Cells.MaxDataRow; rowIndex++)
                            {
                                #region -Get value from cell-
                                errorRows = string.Empty;
                                BranchID = workSheet.Cells[rowIndex, ColTexts.IndexOf("BranchID")].StringValue.PassNull().Trim();
                                Module = workSheet.Cells[rowIndex, ColTexts.IndexOf("PO10200Module")].StringValue.PassNull().Trim();
                                RcptType = workSheet.Cells[rowIndex, ColTexts.IndexOf("PO10200RcptType")].StringValue.PassNull().Trim();
                                DocType = workSheet.Cells[rowIndex, ColTexts.IndexOf("PO10200DocType")].StringValue.PassNull().Trim();
                                InvcDateTmp = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvcDate")].StringValue.PassNull().Trim();
                                InvcNote = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvcNote")].StringValue.PassNull().Trim();
                                InvcNbr = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvcNbr")].StringValue.PassNull().Trim();
                                ReplaceInvoice = workSheet.Cells[rowIndex, ColTexts.IndexOf("ReplaceInvoice")].StringValue.PassNull().Trim();
                                InvcNoteOld = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvcNoteOld")].StringValue.PassNull().Trim();
                                InvcNbrOld = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvcNbrOld")].StringValue.PassNull().Trim();
                                InvcDateOldTmp = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvcDateOld")].StringValue.PassNull().Trim();
                                PurchaseType = GetPurchaseType(workSheet.Cells[rowIndex, ColTexts.IndexOf("PO10200PurchaseType")].StringValue.PassNull().Trim());
                                InvtID = workSheet.Cells[rowIndex, ColTexts.IndexOf("InvtID")].StringValue.PassNull().Trim();
                                QtyOrdTmp = workSheet.Cells[rowIndex, ColTexts.IndexOf("StkQty")].StringValue.PassNull().Trim();
                                RevenueTmp = workSheet.Cells[rowIndex, ColTexts.IndexOf("Revenue")].StringValue.PassNull().Trim();
                                ReferDescr = workSheet.Cells[rowIndex, ColTexts.IndexOf("Reference")].StringValue.PassNull().Trim();
                                DiscCode = workSheet.Cells[rowIndex, ColTexts.IndexOf("DiscodeDisplay")].StringValue.PassNull().Trim();
                                ReasonCD = GetCodeFromCodeDescr(workSheet.Cells[rowIndex, ColTexts.IndexOf("ReasonCD")].StringValue.PassNull().Trim());
                                #endregion

                                #region -Validate data-
                                if (BranchID == string.Empty && Module == string.Empty &&
                                    InvcDateTmp == string.Empty && InvtID == string.Empty)
                                {
                                    blankRow++;
                                    if (blankRow > 50)
                                    {
                                        break;
                                    }
                                    continue;
                                }
                                else
                                {
                                    blankRow = 0;
                                }
                                // Ktra dữ liệu 
                                var dateInvc = GetDateByFormat(InvcDateTmp);
                                if (dateInvc == null)
                                {
                                    if (DocType != "BI" || InvcDateTmp != string.Empty)
                                    {
                                        errorRows += GetMess(1555) + " " + Util.GetLang("InvcDate") + ", ";
                                    }
                                    InvcDate = DateTime.Now;
                                }
                                else
                                {
                                    InvcDate = dateInvc.Value;
                                    OrderDate = InvcDate;
                                }

                                if (!string.IsNullOrEmpty(InvcDateOldTmp))
                                {
                                    var dateInvcDateOld = GetDateByFormat(InvcDateOldTmp);
                                    if (dateInvcDateOld == null)
                                    {
                                        errorRows += GetMess(1555) + " " + Util.GetLang("InvcDateOld") + ", ";
                                    }
                                    else
                                    {
                                        InvcDateOld = dateInvcDateOld.Value;
                                    }
                                }
                                var isValid = true;
                                if (string.IsNullOrWhiteSpace(RevenueTmp))
                                {
                                    Revenue = 0;
                                }
                                else
                                {
                                    isValid = Double.TryParse(RevenueTmp, out Revenue);
                                    if (!isValid)
                                    {
                                        errorRows += GetMess(1555) + " " + Util.GetLang("PO10200Revenue") + ", ";
                                    }
                                }
                                if (PurchaseType == string.Empty)
                                {
                                    errorRows += GetMess(1111, new string[] { "", Util.GetLang("PurchaseType") }) + ", ";
                                }
                                if (requiredInvoice && DocType == "VO")
                                {
                                    if (InvcNote == string.Empty)
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("InvcNote") }) + ", ";
                                    }
                                    if (InvcNbr == string.Empty)
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("InvcNbr") }) + ", ";
                                    }
                                }
                                if (InvcNote.Length > 30)
                                {
                                    errorRows += GetMess(1234, new string[] { "InvcNote", "30" }) + ",";
                                }

                                if (InvcNbr.Length > 30)
                                {
                                    errorRows += GetMess(1234, new string[] { "InvcNbr", "30" }) + ",";
                                }
                                if (ReplaceInvoice != "0" && ReplaceInvoice != "1")
                                {
                                    errorRows += GetMess(1555) + " " + Util.GetLang("ReplaceInvoice").Replace("$", "") + ", ";
                                }
                                if (InvcNoteOld == string.Empty)
                                {
                                    if (ReplaceInvoice == "1")
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("InvcNoteOld") }) + ", ";
                                    }
                                }
                                else if (InvcNoteOld.Length > 30)
                                {
                                    errorRows += GetMess(1234, new string[] { "InvcNoteOld", "30" }) + ",";
                                }
                                if (InvcNbrOld == string.Empty)
                                {
                                    if (ReplaceInvoice == "1")
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("InvcNbrOld") }) + ", ";
                                    }
                                }
                                if (InvcNbrOld.Length > 30)
                                {
                                    errorRows += GetMess(1234, new string[] { "InvcNbrOld", "30" }) + ",";
                                }
                                if (!string.IsNullOrWhiteSpace(ReasonCD))
                                {
                                    if (!lstReason.Any(x => x.CodeCheck == ReasonCD))
                                    {
                                        errorRows += GetMess(1555) + " " + Util.GetLang("ReasonCD") + ", ";
                                    }
                                }
                                else
                                {
                                    if (RcptType == "X" && Module == "PO")
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("ReasonCD") }) + ", ";
                                    }
                                }
                                if (ReferDescr.Length > 500)
                                {
                                    errorRows += GetMess(1234, new string[] { Util.GetLang("Reference"), "500" }) + ",";
                                }
                                if (RcptType == "R")
                                {
                                    //- Nếu Kiểu Nhập = R => thì Combo "Loại chứng từ" = buộc là AC  or VO or BI ,  KHÔNG CHO CHỌN loại AD
                                    if (DocType == "AD")
                                    {
                                        errorRows += GetMess(2018092801) + ", ";
                                    }
                                    ReasonCD = string.Empty;
                                }
                                else if (RcptType == "X")
                                {
                                    //- Nếu Kiểu Nhập = X => thì "Loại chứng từ" = buộc là AD  or VO or BI  , KHÔNG CHO CHỌN loại = AC
                                    if (DocType == "AC")
                                    {
                                        errorRows += GetMess(2018092801) + ", ";
                                    }
                                    if (DocType != "VO" && DocType != "BI")
                                    {
                                        ReasonCD = string.Empty;
                                    }
                                }
                                else
                                {
                                    errorRows += GetMess(89, new string[] { Util.GetLang("RECEIPTTYPE") }) + ", ";
                                }
                                if (!lstDocType.Any(x => x == DocType))
                                {
                                    errorRows += GetMess(89, new string[] { Util.GetLang("DocType") }) + ", ";
                                }
                                if (!lstPurchaseType.Any(x => x == PurchaseType))
                                {
                                    errorRows += GetMess(89, new string[] { Util.GetLang("PurchaseType") }) + ", ";
                                }
                                if (!lstModule.Any(x => x == Module))
                                {
                                    errorRows += GetMess(89, new string[] { Util.GetLang("Module") }) + ", ";
                                }
                                // Check exist company
                                var objBranch = lstBranch.Where(x => x.CpnyID == BranchID).FirstOrDefault();
                                if (objBranch == null)
                                {
                                    errorRows += GetMess(89, new string[] { Util.GetLang("CpnyID") }) + ", ";
                                }
                                var objInvt = lstInvt.Where(x => x.InvtID == InvtID).FirstOrDefault();
                                if (objInvt == null)
                                {
                                    errorRows += GetMess(89, new string[] { Util.GetLang("InvtID") }) + ", ";
                                    objInvt = new PO10200_piInventoryExp_Result();
                                }
                                isValid = double.TryParse(DiscAmtTmp, out DiscAmt);
                                if (!isValid)
                                {
                                    DiscAmt = 0;
                                }
                                isValid = double.TryParse(DiscPctTmp, out DiscPct);
                                if (!isValid)
                                {
                                    DiscPct = 0;
                                }

                                if (objInvt.ClassID == DiscountClassID)
                                {
                                    QtyOrd = 0;
                                    Price = 0;
                                    DiscPct = 0;
                                    POSMID = string.Empty;
                                    DiscCode = string.Empty;
                                    if (DiscAmt == 0)
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("Discount") }) + ", ";
                                    }
                                }
                                else
                                {
                                    isValid = double.TryParse(QtyOrdTmp, out QtyOrd);
                                    if (!isValid || QtyOrd <= 0)
                                    {
                                        errorRows += GetMess(2016041401, new string[] { Util.GetLang("Qty") });
                                    }
                                }
                                if (Module == "AP")
                                {
                                    if (DocType != "AC" && DocType != "AD")
                                    {
                                        errorRows += GetMess(2018121201) + ", ";
                                    }
                                }
                                else if (Module == "PO")
                                {
                                    if (DocType != "VO" && DocType != "BI")
                                    {
                                        errorRows += GetMess(2018121202) + ", ";
                                    }
                                }
                                // Check exist Inventory                                
                                if (objInvt == null)
                                {
                                    errorRows += Util.GetLang("InvtID") + ", ";
                                    objInvt = new PO10200_piInventoryExp_Result();
                                }
                                else
                                {
                                    var strUnit = lstInvtUnit.Where(x => x.InvtID == InvtID && x.UOM == SlsUnit).FirstOrDefault().UOM;
                                    if (strUnit != null)
                                    {
                                        SlsUnit = strUnit;
                                        
                                    }
                                    else
                                    {
                                        errorRows += Util.GetLang("PO102UOM") + ", ";
                                    }

                                    
                                    InvtDescr = objInvt.Descr;

                                    // Ktra bắt buộc nhập DiscCode khi chọn loại là KM
                                    if ((PurchaseType == "PR" || PurchaseType == _DPPurchageType) && string.IsNullOrWhiteSpace(DiscCode))
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("DiscCode") }) + ", ";
                                    }
                                    else if (objInvt.ClassID != DiscountClassID && PurchaseType != "PR" && PurchaseType != _DPPurchageType && !string.IsNullOrWhiteSpace(DiscCode)) // Báo lỗi nếu chọn Loại nhập hàng <> KM nhưng có nhập Mã KM
                                    {
                                        if (PurchaseType == "PR")
                                        {
                                            errorRows += GetMess(2017020602, new string[] { "" }) + ", ";
                                        }
                                        else
                                        {
                                            errorRows += GetMess(2018082201, new string[] { Util.GetLang("DiscCode") }) + ", ";
                                        }
                                    }
                                    else if ((PurchaseType == "PR" || PurchaseType == _DPPurchageType) && !string.IsNullOrWhiteSpace(DiscCode)) // Ktra tồn tại DiscCode
                                    {
                                        var objDiscCode = lstDiscCode.FirstOrDefault(x => x.DiscCode == DiscCode && (x.CpnyID == "*" || x.CpnyID == BranchID));
                                        if (objDiscCode == null)
                                        {
                                            errorRows += GetMess(1012, new string[] { Util.GetLang("DiscCode") }) + ", ";
                                        }
                                    }
                                    if (DiscPct != 0 && DiscAmt != 0)
                                    {
                                        errorRows += GetMess(2016011801) + ",";
                                    }
                                    if (objInvt.ClassID != DiscountClassID && (DiscAmt > QtyOrd * Price || DiscPct > 100))
                                    {
                                        errorRows += GetMess(2016011802) + ",";
                                    }
                                }
                                if (!string.IsNullOrEmpty(errorRows))
                                {
                                    errorRows = lineLanguage + " " + (rowIndex + 1).ToString() + ": " + errorRows.Trim().TrimEnd(',');
                                    if (Error == string.Empty)
                                    {
                                        Error += GetMess(201302071, new string[] { ":" }) + "<br>";
                                    }
                                    Error += errorRows + "<br>";
                                    continue;
                                }
                                else
                                {
                                    if (_db.PO10200_ppCheckCloseDate(BranchID, InvcDate.ToDateShort(), InvcDate.ToDateShort(), "", "H", "C", Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault() == "0")
                                    {
                                        errorRows += GetMess(2019011011) + ",";
                                        errorRows = lineLanguage + " " + (rowIndex + 1).ToString() + ": " + errorRows.Trim().TrimEnd(',');
                                        if (Error == string.Empty)
                                        {
                                            Error += GetMess(201302071, new string[] { ":" }) + "<br>";
                                        }
                                        Error += errorRows + "<br>";
                                        continue;
                                    }
                                }
                                #endregion
                                string headKey = BranchID + Module + RcptType + DocType + InvcDate + InvcNote + InvcNbr;
                                var detKey = string.Empty;
                                #region -Get data-
                                if (!lstHeader.Contains(headKey)) // Get header from Excel
                                {
                                    lstHeader.Add(headKey);
                                    var objH = new PO10200_pdHeader_Result();
                                    objH.Status = "H";
                                    objH.Module = Module;
                                    objH.DocType = DocType;
                                    objH.DocDate = InvcDate;
                                    objH.InvcDate = InvcDate;
                                    objH.InvcDateImport = InvcDate;
                                    objH.RcptDate = DateTime.Now;
                                    objH.InvcNbrImport = InvcNbr;
                                    objH.InvcNoteImport = InvcNote;
                                    objH.RcptFrom = "DR";
                                    objH.RcptType = RcptType;
                                    objH.PONbr = string.Empty;
                                    objH.Terms = vend.Terms;
                                    objH.APBatNbr = "";
                                    objH.APRefNbr = "";
                                    objH.VendID = vend.VendID.PassNull();
                                    objH.TaxID00 = vend.TaxID00;
                                    objH.InTransit = false;
                                    objH.ReplaceInvoice = ReplaceInvoice == "1";
                                    objH.InvcNbrOld = InvcNbrOld;
                                    objH.InvcNoteOld = InvcNoteOld;
                                    objH.POType = DocType;
                                    objH.ReasonCD = ReasonCD;
                                    if (!string.IsNullOrEmpty(InvcDateOldTmp))
                                    {
                                        objH.InvcDateOld = InvcDateOld;
                                    }
                                    lstHeadImp.Add(objH);
                                    // Không lấy receipt từ PO10100
                                }


                                if (!string.IsNullOrWhiteSpace(POSMID) || !string.IsNullOrWhiteSpace(DiscCode))
                                {
                                    DiscPct = 0;
                                    DiscAmt = 0;
                                }
                                var objD = new PO10200_pgDetail_Result();
                                objD.PurchaseType = PurchaseType;
                                var objSite = lstSite.FirstOrDefault(x => x.DfltBranchID == BranchID);
                                var userDefault = _db.OM_UserDefault.SingleOrDefault(p => p.UserID == Current.UserName && p.DfltBranchID == BranchID).POSite;

                                objD.SiteID = userDefault != null ? userDefault.ToString() : "";

                                objD.ClassID = objInvt.ClassID;
                                objD.VouchStage = "N";
                                objD.Qty = QtyOrd;
                                objD.RcptQty = QtyOrd;
                                objD.RcptUnitDescr = SlsUnit;
                                objD.BranchID = BranchID;
                                objD.InvtID = InvtID;
                                objD.JrnlType = "PO";
                                objD.PONbr = string.Empty;
                                objD.TranDesc = InvtDescr;
                                objD.UnitCost = Price;
                                objD.PosmID = POSMID;
                                objD.DiscCode = DiscCode;
                                objD.DiscPct = DiscPct;
                                objD.DocDiscAmt = DiscAmt;
                                objD.RcptDate = DateTime.Now;
                                objD.Revenue = Revenue;
                                objD.ReferDescr = ReferDescr;
                                if (lstDetailImp.ContainsKey(headKey))
                                {
                                    objD.LineRef = GetLineRef(lstDetailImp[headKey].Count + 1);
                                    lstDetailImp[headKey].Add(objD);
                                }
                                else
                                {
                                    var lstTmp = new List<PO10200_pgDetail_Result>();
                                    objD.LineRef = GetLineRef(1);
                                    lstTmp.Add(objD);
                                    lstDetailImp.Add(headKey, lstTmp);
                                }
                                objD.CostID = (rowIndex + 1).ToString();

                                #endregion
                            }// End for loop
                            #region -Handle save data-

                            if (string.IsNullOrEmpty(Error))
                            {
                                try
                                {
                                    for (int i = 0; i < lstHeader.Count; i++)
                                    {
                                        var key = lstHeader[i];
                                        var lst = lstDetailImp[key].ToList();
                                        _lstLot = new List<PO10200_pgLotTrans_Result>();
                                        if (lst.Count > 0)
                                        {
                                            _lstTaxTrans = _db.PO10200_pgLoadTaxTrans(lst[0].BranchID, lstHeadImp[i].BatNbr, lstHeadImp[i].RcptNbr).ToList();
                                            _lstTaxDoc = new List<PO10200_pgLoadTaxTrans_Result>();
                                            _lstVendTaxes = _db.PO10200_pdAP_VenDorTaxes(lstHeadImp[i].VendID, "").ToList();
                                            string taxID = string.Empty;
                                            for (int k = 0; k < _lstVendTaxes.Count; k++)
                                            {
                                                taxID += _lstVendTaxes[k].taxid + ",";
                                            }
                                            var valueTax = taxID.Length > 0 ? taxID.Substring(0, taxID.Length - 1) : "";
                                            _branchID = lst[0].BranchID;
                                            _objPO_Setup = _db.PO10200_pdPO_Setup(_branchID, "PO").FirstOrDefault();
                                            _lstSiteAll = _db.PO10200_pcSiteAll(_branchID).ToList();
                                            _lstPOTrans = lst;
                                            _poHead = lstHeadImp[i];
                                            string errorLine = string.Empty;
                                            for (int j = 0; j < _lstPOTrans.Count; j++)
                                            {
                                                var obj = _lstPOTrans[j];
                                                obj.TaxID = valueTax;
                                                SetValue4Line(ref obj, lstHeadImp[i]);

                                                if (lstHeadImp[i].Module == "AP" || lstHeadImp[i].Module == "PO" && obj.PurchaseType != "PR" && obj.PurchaseType != "DP")
                                                {
                                                    if (obj.UnitCost == 0)
                                                    {
                                                        errorLine = obj.CostID + ", ";
                                                    }
                                                }
                                                if (errorLine != string.Empty)
                                                {
                                                    continue;
                                                }
                                                var objInvt = lstInvt.FirstOrDefault(x => x.InvtID == obj.InvtID);
                                                if (objInvt != null && objInvt.LotSerRcptAuto == true)
                                                {
                                                    var objLot = new PO10200_pgLotTrans_Result();
                                                    var LotNbr = _db.INNumberingLot(obj.InvtID, DateTime.Now, "LotNbr").FirstOrDefault().PassNull();

                                                    objLot.LotSerNbr = LotNbr;
                                                    objLot.POTranLineRef = obj.LineRef;
                                                    objLot.ExpDate = DateTime.Now.AddDays(objInvt.ShelfLife.ToDouble());
                                                    objLot.InvtID = obj.InvtID;
                                                    objLot.InvtMult = lstHeadImp[i].RcptType == "X" ? (short)-1 : (short)1;
                                                    objLot.KitID = "";
                                                    objLot.MfgrLotSerNbr = "";
                                                    objLot.Qty = obj.RcptQty;
                                                    objLot.SiteID = obj.SiteID;
                                                    objLot.ToSiteID = "";
                                                    objLot.ToWhseLoc = "";
                                                    objLot.TranDate = DateTime.Now;
                                                    objLot.TranType = lstHeadImp[i].RcptType;
                                                    objLot.TranScr = "PO";
                                                    objLot.UnitCost = obj.UnitCost;
                                                    objLot.UnitPrice = obj.UnitCost;
                                                    objLot.WarrantyDate = DateTime.Now.AddDays(objInvt.WarrantyDays.ToDouble());
                                                    objLot.WhseLoc = "";
                                                    objLot.CnvFact = obj.RcptConvFact;
                                                    objLot.UnitMultDiv = obj.RcptMultDiv;
                                                    objLot.UnitDesc = obj.RcptUnitDescr;
                                                    objLot.MfcDate = DateTime.Now;
                                                    _lstLot.Add(objLot);
                                                }
                                            }
                                            if (errorLine != string.Empty)
                                            {
                                                errorLine = "<div style ='overflow: auto !important; min-width:400px !important; max-height:400px !important'> " + GetMess(2018121702, new string[] { errorLine }) + " </div>";
                                                throw new MessageException(MessageType.Message, "20410", parm: new[] { errorLine });
                                            }
                                            else
                                            {
                                                lstHeadImp[i].RcptQtyTot = lst.Sum(x => x.RcptQty);
                                                _isRelease = lstHeadImp[i].Module == "AP";
                                                if (lstHeadImp[i].DocType != "AC" && lstHeadImp[i].DocType != "AD")
                                                {
                                                    Save_BatchImp(lst[0].BranchID, lstHeadImp[i]);
                                                }
                                                else
                                                {
                                                    Save_BatchAPImport(lst[0].BranchID, lstHeadImp[i], vend);
                                                }
                                            }
                                        }
                                    }
                                }
                                catch (Exception)
                                {
                                    throw;
                                }
                            }
                            else
                            {
                                Error = "<div style ='overflow: auto !important; min-width:400px !important; max-height:400px !important'> " + Error + " </div>";
                                throw new MessageException(MessageType.Message, "20410", parm: new[] { Error });
                            }

                            #endregion
                        }
                        return Json(new { success = true, msgCode = 20121418, lstData = 9999 });
                    }
                    catch (Exception ex)
                    {
                        if (ex is MessageException)
                        {
                            return (ex as MessageException).ToMessage();
                        }
                        else
                        {
                            return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
                        }
                    }
                }
                else
                {
                    Util.AppendLog(ref _logMessage, "2014070701", parm: new[] { fileInfo.Extension.Replace(".", "") });
                }
                return _logMessage;
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                else
                {
                    return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
                }
            }
        }

        private DateTime? GetDateByFormat(string dateTime)
        {
            System.Globalization.CultureInfo provider = System.Globalization.CultureInfo.InvariantCulture;
            try
            {
                return DateTime.ParseExact(dateTime, new string[] { "yyyy/MM/dd", "yyyy.MM.dd", "yyyy-MM-dd" }, provider, System.Globalization.DateTimeStyles.None);
            }
            catch
            {
                return null;
            }
        }

        private string Getcell(int column) // Hàm bị sai khi lấy vị trí column AA
        {
            bool flag = false;
            string ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            string cell = "";
            while (column / 26 >= 1)
            {
                cell += ABC.Substring((column / 26) - 1, 1);
                column = column - 26;
                flag = true;
            }
            if (column % 26 != 0)
            {
                cell += ABC.Substring(column % 26, 1);
            }
            else
            {
                if (column % 26 == 0 && flag)
                {
                    cell += ABC.Substring(0, 1);
                }
            }

            return cell;
        }
        [HttpPost]
        public ActionResult ImportDet(FormCollection data)
        {
            try
            {
                string branchID = data["cboBranchID"].ToString();
                _poHead = new PO10200_pdHeader_Result();
                Dictionary<string, List<PO10200_pgDetail_Result>> lstDetailImp = new Dictionary<string, List<PO10200_pgDetail_Result>>();
                Dictionary<string, List<PO10200_pgLotTrans_Result>> lstLotTransImp = new Dictionary<string, List<PO10200_pgLotTrans_Result>>();

                Dictionary<string, string> lstLotNbrImp = new Dictionary<string, string>();
                string sss = "";
                lstLotNbrImp.Add("", sss);

                var lstHeadImp = new List<PO10200_pdHeader_Result>();
                var acc = Session["PO10200"] as AccessRight;
                FileUploadField fileUploadField = X.GetCmp<FileUploadField>("btnImport");
                HttpPostedFile file = fileUploadField.PostedFile;
                FileInfo fileInfo = new FileInfo(file.FileName);
                string message = string.Empty;
                if (fileInfo.Extension.ToLower() == ".xls" || fileInfo.Extension.ToLower() == ".xlsx")
                {
                    try
                    {
                        Workbook workbook = new Workbook(fileUploadField.PostedFile.InputStream);
                        if (workbook.Worksheets.Count > 0)
                        {
                            #region -Variables-
                            var lstBranch = _db.PO10200_pdBranchAllByUserExp(branchID, Current.UserName, Current.CpnyID, Current.LangID).ToList(); // lấy ra danh sách từ cpny
                            var lstInvt = _db.PO10200_piInventoryExp(Current.UserName, Current.CpnyID, Current.LangID, branchID).ToList(); // lấy dnah sach invent
                            var lstInvtUnit = _db.PO10200_pePriceExp(Current.UserName, Current.CpnyID, Current.LangID, branchID).ToList(); // lấy dnah sach invent có Unit
                            List<string> lstHeader = new List<string>();
                            List<string> lstDetails = new List<string>();
                            // Field to get data from Excel
                            string BranchID = string.Empty;
                            string InvcNote = string.Empty;
                            string InvcNbr = string.Empty;
                            string PONbr = string.Empty;
                            string OrderDateTmp = string.Empty;
                            DateTime OrderDate;
                            string InvcDateTmp = string.Empty;
                            DateTime InvcDate;
                            string PurchaseType = string.Empty;
                            string InvtID = string.Empty;
                            string InvtDescr = string.Empty;
                            string LotSerNbr = string.Empty;
                            string WarrantyDateTmp = string.Empty;
                            DateTime WarrantyDateLot = new DateTime();
                            string ExpDateTmp = string.Empty;
                            DateTime ExpDateLot = new DateTime();
                            string SlsUnit = string.Empty;
                            string PriceTmp = string.Empty;
                            double Price = 0d;
                            string SiteID = string.Empty;
                            string QtyOrdTmp = string.Empty;
                            double QtyOrd = 0d;
                            string DiscPctTmp = string.Empty;
                            double DiscPct = 0d;
                            string DiscAmtTmp = string.Empty;
                            double DiscAmt = 0d;
                            string DiscCode = string.Empty;
                            string POSMID = string.Empty;
                            string SONbrERP = string.Empty;
                            string Error = string.Empty;
                            string errorRows = string.Empty;
                            Worksheet workSheet = workbook.Worksheets[0];
                            var vend = _db.PO10200_pcVendor_Active(Current.UserName, BranchID, Current.CpnyID, Current.LangID).FirstOrDefault();
                            if (vend == null)
                            {
                                vend = new PO10200_pcVendor_Active_Result();
                            }
                            _lstInvt4CalcTax = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, branchID).ToList();
                            _lstUnitCnv4CalcTax = _db.PO10200_pdIN_UnitConversion().ToList();
                            var lstLot = new List<PO10200_pgLotTrans_Result>();
                            var lstPONbr = _db.PO10200_pdPONbrImp(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstPOSM = _db.PO10200_pcPOSM(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            var lstDiscCode = _db.PO10200_peDiscCode(DateTime.Now.ToDateShort(),Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            #endregion
                            for (int i = 5; i <= workSheet.Cells.MaxDataRow; i++)
                            {
                                #region -Get value from cell-
                                errorRows = string.Empty;
                                BranchID = workSheet.Cells[i, 0].StringValue.PassNull().Trim();
                                PONbr = workSheet.Cells[i, 2].StringValue.PassNull().Trim();
                                InvcNote = workSheet.Cells[i, 3].StringValue.PassNull().Trim();
                                InvcNbr = workSheet.Cells[i, 4].StringValue.PassNull().Trim();
                                OrderDateTmp = workSheet.Cells[i, 5].StringValue.PassNull().Trim();
                                InvcDateTmp = workSheet.Cells[i, 6].StringValue.PassNull().Trim();
                                PurchaseType = GetPurchaseType(workSheet.Cells[i, 7].StringValue.PassNull().Trim());
                                InvtID = workSheet.Cells[i, 8].StringValue.PassNull().Trim();
                                LotSerNbr = workSheet.Cells[i, 10].StringValue.PassNull().Trim();

                                WarrantyDateTmp = workSheet.Cells[i, 11].StringValue.PassNull().Trim();
                                ExpDateTmp = workSheet.Cells[i, 12].StringValue.PassNull().Trim();
                                SlsUnit = workSheet.Cells[i, 13].StringValue.PassNull().Trim();
                                PriceTmp = workSheet.Cells[i, 14].StringValue.PassNull().Trim();
                                QtyOrdTmp = workSheet.Cells[i, 15].StringValue.PassNull().Trim();
                                DiscPctTmp = workSheet.Cells[i, 17].StringValue.PassNull().Trim();
                                DiscAmtTmp = workSheet.Cells[i, 18].StringValue.PassNull().Trim();
                                POSMID = workSheet.Cells[i, 20].StringValue.PassNull().Trim();
                                DiscCode = workSheet.Cells[i, 21].StringValue.PassNull().Trim();

                                #endregion

                                #region -Validate data-
                                if (BranchID == string.Empty && InvcNote == string.Empty &&
                                    InvcNbr == string.Empty && InvtID == string.Empty)
                                {
                                    continue;
                                }

                                var objCheckSONbrERP = _sys.SYS_Configurations.FirstOrDefault(x => x.Code.ToLower() == "PO10200IntegrateERP");
                                if (objCheckSONbrERP != null)
                                {
                                    if (objCheckSONbrERP.IntVal == 1)
                                    {
                                        SONbrERP = workSheet.Cells[i, 22].StringValue.PassNull().Trim();
                                        checkSONbrERPImp = true;
                                    }
                                }

                                // Ktra dữ liệu 
                                var isValid = DateTime.TryParse(InvcDateTmp, out InvcDate);
                                if (!isValid)
                                {
                                    errorRows += Util.GetLang("InvcDate") + ", ";
                                }
                                isValid = DateTime.TryParse(OrderDateTmp, out OrderDate);
                                if (!isValid)
                                {
                                    errorRows += Util.GetLang("OrderDate") + ", ";
                                }
                                
                                isValid = double.TryParse(PriceTmp, out Price);
                                if (!isValid)
                                {
                                    Price = 0;
                                }
                                if (PurchaseType == string.Empty)
                                {
                                    errorRows += GetMess(1111, new string[] { "", Util.GetLang("PurchaseType") }) + ", ";
                                }

                                if (InvcNote == string.Empty)
                                {
                                    errorRows += GetMess(1111, new string[] { "", Util.GetLang("InvcNote") }) + ", ";
                                }
                                else if (InvcNote.Length > 30)
                                {
                                    errorRows += Util.GetLang("InvcNote") + " " + GetMess(2020052101) + ", ";
                                }
                                if (InvcNbr == string.Empty)
                                {
                                    errorRows += GetMess(1111, new string[] { "", Util.GetLang("InvcNbr") }) + ", ";
                                }
                                if (InvcNbr.Length > 30)
                                {
                                    errorRows += Util.GetLang("InvcNbr") + " " + GetMess(2020052101) + ", ";
                                }
                                // Check exist company
                                var objBranch = lstBranch.Where(x => x.CpnyID == BranchID).FirstOrDefault();
                                if (objBranch == null)
                                {
                                    errorRows += Util.GetLang("CpnyID") + ", ";
                                }
                                var objInvt = lstInvt.Where(x => x.InvtID == InvtID).FirstOrDefault();
                                if (objInvt == null)
                                {
                                    errorRows += Util.GetLang("InvtID") + ", ";
                                    objInvt = new PO10200_piInventoryExp_Result();
                                }

                                //Nếu sp là Lot mà không có nhập tự động thì bắt người dùng nhập Mã Lot
                                if (objInvt != null)
                                {
                                    if (objInvt.LotSerTrack == "L")// nếu SP là Lot thì Ngày Hết Hạn bắt được nhập
                                    {
                                        bool compareExpWarrant = true;
                                        isValid = DateTime.TryParse(ExpDateTmp, out ExpDateLot);
                                        if (!isValid)
                                        {
                                            errorRows += Util.GetLang("ExpDate") + ", ";
                                            compareExpWarrant = false;
                                        }

                                        if (WarrantyDateTmp != "" && ExpDateTmp != "")
                                        {
                                            isValid = DateTime.TryParse(WarrantyDateTmp, out WarrantyDateLot);
                                            if (!isValid)
                                            {
                                                errorRows += Util.GetLang("PO10200ManufDate") + ", ";
                                                compareExpWarrant = false;
                                            }

                                            if (compareExpWarrant)
                                            {
                                                if (WarrantyDateLot > ExpDateLot)
                                                {
                                                    errorRows += GetMess(2020050501, new string[] { Util.GetLang("ExpDate"), Util.GetLang("PO10200ManufDate") }) + ", ";
                                                }
                                            }
                                        }

                                        if (compareExpWarrant && WarrantyDateTmp == "")
                                        {
                                            WarrantyDateLot = ExpDateLot.AddDays(objInvt.ShelfLife == null? 0 : -(int)objInvt.ShelfLife);
                                        }
                                        
                                    }

                                    if (objInvt.LotSerTrack == "L" && objInvt.LotSerRcptAuto == false && LotSerNbr == string.Empty)
                                    {
                                        errorRows += "<br>" + GetMess(2020032002, new string[] { Util.GetLang("InvtID") + ": " + objInvt.InvtID }) + ", ";
                                    }

                                    if (LotSerNbr.Length > 25)
                                    {
                                        errorRows += Util.GetLang("LotSerNbr") + " " + "không được vượt quá 25 ký tự" + ", ";
                                    }
                                }

                                isValid = double.TryParse(DiscAmtTmp, out DiscAmt);
                                if (!isValid)
                                {
                                    DiscAmt = 0;
                                }
                                isValid = double.TryParse(DiscPctTmp, out DiscPct);
                                if (!isValid)
                                {
                                    DiscPct = 0;
                                }

                                if (objInvt.ClassID == DiscountClassID)
                                {
                                    QtyOrd = 0;
                                    Price = 0;
                                    DiscPct = 0;
                                    POSMID = string.Empty;
                                    DiscCode = string.Empty;
                                    if (DiscAmt == 0)
                                    {
                                        errorRows += GetMess(1111, new string[] { "", Util.GetLang("Discount") }) + ", ";
                                    }
                                }
                                else
                                {
                                    isValid = double.TryParse(QtyOrdTmp, out QtyOrd);
                                    if (!isValid || QtyOrd == 0)
                                    {
                                        errorRows += Util.GetLang("Qty") + ", ";
                                    }
                                }

                                // Check exist Inventory                                
                                if (objInvt == null)
                                {
                                    errorRows += Util.GetLang("InvtID") + ", ";
                                    objInvt = new PO10200_piInventoryExp_Result();
                                }
                                else
                                {
                                   
                                    var objCheckUnit = lstInvtUnit.Where(x => x.InvtID == InvtID && x.UOM == SlsUnit).FirstOrDefault();
                                    if (objCheckUnit == null || SlsUnit == string.Empty)
                                    {
                                        errorRows += Util.GetLang("PO102UOM") + ", ";
                                    }
                                    else
                                    {
                                        InvtDescr = objInvt.Descr;
                                    }
                                    if (objInvt.IsPOSM == true)
                                    {
                                        // Ktra bắt buộc nhập mã POSM nếu ClassID = POSM
                                        if (string.IsNullOrWhiteSpace(POSMID))
                                        {
                                            errorRows += GetMess(1111, new string[] { "", Util.GetLang("PosmID") }) + ", ";
                                        }
                                        else
                                        {
                                            var objPOSM = lstPOSM.FirstOrDefault(x => x == POSMID);
                                            if (objPOSM == null)
                                            {
                                                errorRows += GetMess(1555) + " " + Util.GetLang("InvcNbr") + ", ";
                                            }
                                            else if (!string.IsNullOrWhiteSpace(DiscCode)) // Báo lỗi nếu vừa nhập POSM vừa nhập Mã KM
                                            {
                                                errorRows += GetMess(2017020601) + ", ";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        // Ktra bắt buộc nhập DiscCode khi chọn loại là KM
                                        if (PurchaseType == "PR" && string.IsNullOrWhiteSpace(DiscCode))
                                        {
                                            errorRows += GetMess(1111, new string[] { "", Util.GetLang("DiscCode") }) + ", ";
                                        }
                                        else if (objInvt.ClassID != DiscountClassID && PurchaseType != "PR" && !string.IsNullOrWhiteSpace(DiscCode)) // Báo lỗi nếu chọn Loại nhập hàng <> KM nhưng có nhập Mã KM
                                        {
                                            errorRows += GetMess(2017020602, new string[] { "" }) + ", ";
                                        }
                                        else if (PurchaseType == "PR" && !string.IsNullOrWhiteSpace(DiscCode)) // Ktra tồn tại DiscCode
                                        {
                                            var objDiscCode = lstDiscCode.FirstOrDefault(x => x.DiscCode == DiscCode && (x.CpnyID == "*" || x.CpnyID == BranchID));
                                            if (objDiscCode == null)
                                            {
                                                errorRows += GetMess(1012, new string[] { Util.GetLang("DiscCode") }) + ", ";
                                            }
                                        }
                                    }
                                    if (objInvt.ClassID != DiscountClassID && PurchaseType != "PR" && DiscCode == "" && POSMID == "" && Price == 0)
                                    {
                                        errorRows += GetMess(234) + ", ";
                                    }
                                    if (DiscPct != 0 && DiscAmt != 0)
                                    {
                                        errorRows += GetMess(2016011801) + ", ";
                                    }
                                    if (objInvt.ClassID != DiscountClassID && (DiscAmt > QtyOrd * Price || DiscPct > 100))
                                    {
                                        errorRows += GetMess(2016011802) + ", ";
                                    }
                                }

                                if (!checkSONbrERPImp)
                                {
                                    if (!string.IsNullOrWhiteSpace(PONbr))
                                    {
                                        // Kiểm tra số PONbr có tồn tại ko
                                        if (lstPONbr.FirstOrDefault(x => x.BranchID == BranchID && x.PONbr == PONbr) == null)
                                        {
                                            errorRows += Util.GetLang("PONBR") + ": " + GetMess(89, new string[] { PONbr }) + ", ";
                                        }
                                    }
                                }

                                 if (checkSONbrERPImp && SONbrERP.Length > 30)
                                {
                                    errorRows += Util.GetLang("PO10200SONoERP") + " " + GetMess(2020052101) + ", ";
                                }

                                if (BranchID + InvcNote + InvcNbr + vend.VendID.PassNull() != "")
                                {
                                    if (_db.PO10200_ppCheckExistingInvcNbrExp(Current.UserName, Current.CpnyID, Current.LangID, BranchID, "", vend.VendID, InvcNote, InvcNbr).FirstOrDefault() == true)
                                    {
                                        errorRows += GetMess(2020042801, new string[] { });
                                    }
                                }

                                if (!string.IsNullOrEmpty(errorRows))
                                {
                                    errorRows = (i + 1).ToString() + ": " + errorRows.Trim().TrimEnd(',');
                                    Error += GetMess(201302071, new string[] { errorRows }) + "<br>";
                                    continue;
                                }
                                else
                                {

                                }
                                #endregion
                                string headKey = BranchID + InvcNote + InvcNbr;
                                var detKey = string.Empty;
                                #region -Get data-
                                if (!lstHeader.Contains(headKey)) // Get header from Excel
                                {
                                    lstHeader.Add(BranchID + InvcNote + InvcNbr);
                                    var objH = new PO10200_pdHeader_Result();
                                    objH.Status = "H";
                                    objH.DocType = "VO";
                                    objH.DocDate = OrderDate;
                                    objH.InvcDate = InvcDate;
                                    if (checkSONbrERPImp)
                                    {
                                        objH.SONbrERP = SONbrERP;
                                    }
                                    objH.RcptDate = InvcDate;
                                    objH.InvcNbr = InvcNbr;
                                    objH.InvcNote = InvcNote;
                                    objH.RcptFrom = PONbr != "" ? "PO" : "DR";
                                    objH.RcptType = "R";
                                    objH.PONbr = PONbr;
                                    objH.Terms = vend.Terms;
                                    objH.APBatNbr = "";
                                    objH.APRefNbr = "";
                                    objH.VendID = vend.VendID.PassNull();
                                    lstHeadImp.Add(objH);
                                    // Không lấy receipt từ PO10100
                                    #region -Get Receipt from PO10100-

                                    #endregion
                                }


                                if (objInvt.LotSerTrack == "L") //Nếu sp có Lot thì detKey + LotSerNbr
                                {
                                    detKey = headKey + PurchaseType + InvtID + SlsUnit + LotSerNbr;
                                }
                                else
                                {
                                    detKey = headKey + PurchaseType + InvtID + SlsUnit;
                                }
                                
                                if (!lstDetails.Contains(detKey)) // Get Details from Excel
                                {
                                    lstDetails.Add(detKey);

                                    if (!string.IsNullOrWhiteSpace(POSMID) || !string.IsNullOrWhiteSpace(DiscCode))
                                    {
                                        DiscPct = 0;
                                        DiscAmt = 0;
                                    }

                                    var userDefault = _db.OM_UserDefault.SingleOrDefault(p => p.UserID == Current.UserName && p.DfltBranchID == BranchID).POSite;
                                    var objD = new PO10200_pgDetail_Result();
                                    objD.PurchaseType = PurchaseType;
                                    objD.SiteID = userDefault != null ? userDefault.ToString() : "";
                                    objD.ClassID = objInvt.ClassID;
                                    objD.VouchStage = "N";
                                    objD.Qty = QtyOrd;
                                    objD.RcptQty = QtyOrd;
                                    objD.RcptUnitDescr = SlsUnit;
                                    objD.BranchID = BranchID;
                                    objD.InvtID = InvtID;
                                    objD.JrnlType = "PO";
                                    objD.PONbr = PONbr;
                                    objD.TranDesc = InvtDescr;
                                    objD.UnitCost = Price;
                                    objD.PosmID = POSMID;
                                    objD.DiscCode = DiscCode;
                                    objD.DiscPct = DiscPct;
                                    objD.DocDiscAmt = DiscAmt;
                                    objD.RcptDate = InvcDate;

                                    //////////////
                                    var objLot = new PO10200_pgLotTrans_Result();
                                    objLot.LotSerNbr = LotSerNbr;
                                    objLot.InvtID = InvtID;
                                    objLot.ExpDate = ExpDateLot;
                                    objLot.WarrantyDate = WarrantyDateLot;
                                    objLot.KitID = "";
                                    objLot.MfgrLotSerNbr = "";
                                    objLot.Qty = QtyOrd;
                                    objLot.SiteID = userDefault != null ? userDefault.ToString() : "";
                                    objLot.ToSiteID = "";
                                    objLot.ToWhseLoc = "";
                                    objLot.TranDate = DateTime.Now;
                                    objLot.TranScr = "PO";
                                    objLot.UnitCost = Price;
                                    objLot.UnitPrice = Price;
                                    objLot.WhseLoc = "";
                                    objLot.UnitDesc = objD.RcptUnitDescr;
                                    objLot.MfcDate = DateTime.Now;
                                    //////////////

                                    if (lstDetailImp.Keys.FirstOrDefault(x => x == headKey) != null)
                                    {
                                        objD.LineRef = GetLineRef(lstDetailImp[headKey].Count + 1);
                                        lstDetailImp[headKey].Add(objD);

                                        /////////////////////////
                                        #region Add list LotTrans
                                        if (lstLotTransImp.Keys.FirstOrDefault(x => x == headKey) != null)
                                        {
                                            objLot.POTranLineRef = objD.LineRef;
                                            lstLotTransImp[headKey].Add(objLot);
                                        }
                                        #endregion

                                    }
                                    else
                                    {
                                        var lstTmp = new List<PO10200_pgDetail_Result>();
                                        objD.LineRef = GetLineRef(1);
                                        lstTmp.Add(objD);
                                        lstDetailImp.Add(headKey, lstTmp);

                                        /////////////////////////
                                        #region Add list LotTrans
                                        if (lstLotTransImp.Keys.FirstOrDefault(x => x == headKey) == null)
                                        {
                                            var lstLotImp = new List<PO10200_pgLotTrans_Result>();
                                            objLot.POTranLineRef = objD.LineRef;
                                            lstLotImp.Add(objLot);
                                            lstLotTransImp.Add(headKey, lstLotImp);
                                        }
                                        #endregion

                                    }
                                }
                                else
                                {
                                    #region Nếu sp đã tồn tại trong list thì cộng dồn số lượng
                                   
                                    var lstPOLot = lstLotTransImp[headKey].ToList();
                                    var lstDet = lstDetailImp[headKey].ToList();
                                    for (int k = 0; k < lstDetailImp[headKey].Count; k++)
                                    {
                                        if (objInvt.LotSerTrack == "L")
                                        {
                                            if (lstLotTransImp[headKey][k].LotSerNbr == LotSerNbr && lstDetailImp[headKey][k].PurchaseType == PurchaseType 
                                                && lstDetailImp[headKey][k].InvtID == InvtID && lstLotTransImp[headKey][k].InvtID == InvtID
                                                && lstDetailImp[headKey][k].RcptUnitDescr == SlsUnit && lstLotTransImp[headKey][k].UnitDesc == SlsUnit)
                                            {
                                                lstDetailImp[headKey][k].RcptQty += QtyOrd;
                                                lstDetailImp[headKey][k].Qty += QtyOrd;
                                                break;
                                            }
                                        }
                                        else
                                        {
                                            if (lstDetailImp[headKey][k].PurchaseType == PurchaseType
                                                && lstDetailImp[headKey][k].InvtID == InvtID && lstLotTransImp[headKey][k].InvtID == InvtID
                                                && lstDetailImp[headKey][k].RcptUnitDescr == SlsUnit && lstLotTransImp[headKey][k].UnitDesc == SlsUnit)
                                            {
                                                lstDetailImp[headKey][k].RcptQty += QtyOrd;
                                                lstDetailImp[headKey][k].Qty += QtyOrd;
                                                break;
                                            }
                                        }
                                            
                                    }
                                    
                                    #endregion

                                    if (!string.IsNullOrEmpty(errorRows))
                                    {
                                        errorRows = (i + 1).ToString() + ": " + GetMess(1112, new string[] { Util.GetLang("InvtID") });
                                        Error += GetMess(201302071, new string[] { errorRows }) + "<br>";
                                        continue;
                                    }
                                }
                                #endregion
                            }// End for loop
                            #region -Handle save data-

                            if (string.IsNullOrEmpty(Error))
                            {
                                try
                                {
                                   
                                    for (int i = 0; i < lstHeader.Count; i++)
                                    {
                                        var key = lstHeader[i];
                                        var lst = lstDetailImp[key].ToList();
                                        _lstLot = new List<PO10200_pgLotTrans_Result>();
                                        if (lst.Count > 0)
                                        {
                                            _lstTaxTrans = _db.PO10200_pgLoadTaxTrans(lst[0].BranchID, lstHeadImp[i].BatNbr, lstHeadImp[i].RcptNbr).ToList();
                                            _lstTaxDoc = new List<PO10200_pgLoadTaxTrans_Result>();
                                            _lstVendTaxes = _db.PO10200_pdAP_VenDorTaxes(lstHeadImp[i].VendID, "").ToList();
                                            string taxID = string.Empty;
                                            for (int k = 0; k < _lstVendTaxes.Count; k++)
                                            {
                                                taxID += _lstVendTaxes[k].taxid + ",";
                                            }
                                            var valueTax = taxID.Length > 0 ? taxID.Substring(0, taxID.Length - 1) : "";
                                            _branchID = lst[0].BranchID;
                                            _objPO_Setup = _db.PO10200_pdPO_Setup(_branchID, "PO").FirstOrDefault();
                                            _lstSiteAll = _db.PO10200_pcSiteAll(_branchID).ToList();
                                            _poHead = lstHeadImp[i];
                                            _lstPOTrans = lst;


                                            var lstPOLotTrans = lstLotTransImp[key].ToList();
                                            for (int j = 0; j < _lstPOTrans.Count; j++)
                                            {
                                                var obj = _lstPOTrans[j];
                                                var objLotTemp = lstPOLotTrans[j];
                                                if (obj.InvtID == objLotTemp.InvtID && obj.SiteID == objLotTemp.SiteID && obj.LineRef == objLotTemp.POTranLineRef)
                                                {
                                                    obj.TaxID = valueTax;
                                                    SetValue4Line(ref obj, lstHeadImp[i]);
                                                    var objInvt = lstInvt.FirstOrDefault(x => x.InvtID == obj.InvtID);
                                                    if (objInvt != null && objInvt.LotSerTrack == "L")
                                                    {
                                                        var objLot = new PO10200_pgLotTrans_Result();
                                                        string LotNbr = "";
                                                        if (objLotTemp.LotSerNbr != string.Empty)
                                                        {
                                                            LotNbr = objLotTemp.LotSerNbr;
                                                        }
                                                        else
                                                        {
                                                            LotNbr = _db.INNumberingLot(obj.InvtID, DateTime.Now, "LotNbr").FirstOrDefault().PassNull();
                                                        }

                                                        objLot.LotSerNbr = LotNbr;
                                                        objLot.POTranLineRef = obj.LineRef;
                                                        objLot.ExpDate = objLotTemp.ExpDate;
                                                        objLot.WarrantyDate = objLotTemp.WarrantyDate;
                                                        objLot.InvtID = obj.InvtID;
                                                        objLot.InvtMult = lstHeadImp[i].RcptType == "X" ? (short)-1 : (short)1;
                                                        objLot.KitID = "";
                                                        objLot.MfgrLotSerNbr = "";
                                                        objLot.Qty = obj.RcptQty;
                                                        objLot.SiteID = obj.SiteID;
                                                        objLot.ToSiteID = "";
                                                        objLot.ToWhseLoc = "";
                                                        objLot.TranDate = DateTime.Now;
                                                        objLot.TranType = lstHeadImp[i].RcptType;
                                                        objLot.TranScr = "PO";
                                                        objLot.UnitCost = obj.UnitCost;
                                                        objLot.UnitPrice = obj.UnitCost;
                                                        objLot.WhseLoc = "";
                                                        objLot.CnvFact = obj.RcptConvFact;
                                                        objLot.UnitMultDiv = obj.RcptMultDiv;
                                                        objLot.UnitDesc = obj.RcptUnitDescr;
                                                        objLot.MfcDate = DateTime.Now;

                                                        _lstLot.Add(objLot);
                                                    }
                                                }
                                            
                                            }
                                            var objBranch = lstBranch.FirstOrDefault(x => x.CpnyID.ToUpper() == _branchID.ToUpper());
                                            _isRelease = (objBranch != null && objBranch.IsRelease == true) ? true : false;

                                            Save_BatchImp(lst[0].BranchID, lstHeadImp[i]);
                                        }
                                    }
                                }
                                catch (Exception)
                                {
                                    throw;
                                }
                            }
                            else
                            {
                                throw new MessageException(MessageType.Message, "20410", parm: new[] { Error });
                            }

                            #endregion
                        }
                        return Json(new { success = true, msgCode = 20121418, lstData = 9999, _batNbrImp, _branchIDImp });
                    }
                    catch (Exception ex)
                    {
                        if (ex is MessageException)
                        {
                            return (ex as MessageException).ToMessage();
                        }
                        else
                        {
                            return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
                        }
                    }
                }
                else
                {
                    Util.AppendLog(ref _logMessage, "2014070701", parm: new[] { fileInfo.Extension.Replace(".", "") });
                }
                return _logMessage;
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                else
                {
                    return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
                }
            }
        }
        private string GetLasstLineRef(List<PO10200_pgDetail_Result> lst)
        {
            var num = 0;
            for (var j = 0; j < lst.Count; j++)
            {
                var item = lst[j];

                if (!string.IsNullOrEmpty(item.LineRef) && (item.LineRef).ToInt() > num)
                {
                    num = (item.LineRef).ToInt();
                }
            };
            num++;
            var lineRef = num.ToString();
            var len = lineRef.Length;
            for (var i = 0; i < 5 - len; i++)
            {
                lineRef = "0" + lineRef;
            }
            return lineRef;
        }
        private string GetMess(int code, string[] parm = null)
        {
            var msg = _sys.psys_LoadMessage(Current.LangID, code).FirstOrDefault();
            if (msg != null)
            {
                if (parm != null)
                {
                    for (int i = 0; i < parm.Length; i++)
                    {
                        msg.Message = msg.Message.Replace("@p" + (i + 1).ToString(), parm[i]);
                    }
                }
            }
            return msg.Message;
        }

        private bool checkPosmOrFreeItem(string classID, string DiscCode)
        {
            return (classID == "POSM" || !string.IsNullOrWhiteSpace(DiscCode));
        }
        #endregion

        #region -Save data import-
        // Save batch
        private void Save_BatchImp(string branchID, PO10200_pdHeader_Result objHeader)
        {
            objHeader.InvcDate = (objHeader.POType == "VO" || objHeader.POType == "BI") ? new DateTime(1900, 01, 01, 00, 00, 00) : objHeader.InvcDate.ToDateShort();
            if (objHeader.InvcDate == new DateTime(1900, 01, 01, 00, 00, 00))
            {
                objHeader.RcptDate = objHeader.InvcDate.Value;
            }
            var objBatch = _db.Batches.FirstOrDefault(p => p.Module == "IN" && p.BatNbr == "" && p.BranchID == branchID);
            if (objBatch == null)
            {
                objBatch = new Batch();
                objBatch.ResetET();
                objBatch.TotAmt = _poHead.TotAmt;
                objBatch.DateEnt = DateTime.Now.ToDateShort();
                objBatch.EditScrnNbr = _screenNbr;
                objBatch.Descr = "PO Receipt";
                objBatch.Module = (objHeader.Module == null || objHeader.Module.Length == 0 || objHeader.Module == "PO") ? "IN" : objHeader.Module;
                objBatch.JrnlType = "PO";
                objBatch.Rlsed = 0;
                objBatch.Status = _poHead.Status;
                objBatch.LUpd_DateTime = DateTime.Now;
                objBatch.LUpd_Prog = _screenImport;
                objBatch.LUpd_User = Current.UserName;
                var objBatNbr = _db.INNumbering(branchID, "BatNbr").FirstOrDefault();
                objBatch.BranchID = branchID;
                _branchIDImp = (branchID != null) ? branchID : "";
                objBatch.BatNbr = objBatNbr;
                _batNbrImp = (objBatNbr != null) ? objBatNbr : "";
                var objRcptNbr = _db.INNumbering(branchID, "RcptNbr").FirstOrDefault();
                objBatch.RefNbr = objRcptNbr;
                objBatch.OrigBranchID = "";
                objBatch.DateEnt = DateTime.Now.ToDateShort();
                objBatch.Crtd_DateTime = DateTime.Now;
                objBatch.Crtd_Prog = _screenNbr;
                objBatch.Crtd_User = Current.UserName;
                objBatch.tstamp = new byte[0];
                _batNbr = objBatch.BatNbr;
                objBatch.ReasonCD = objHeader.ReasonCD;
                _db.Batches.AddObject(objBatch);
            }
            SavePO_ReceiptImp(objBatch, objHeader);
        }
        private void SavePO_ReceiptImp(Batch objBatch, PO10200_pdHeader_Result objHeader)
        {
            var objPO_Receipt = _db.PO_Receipt.FirstOrDefault(p => p.BranchID == objBatch.BranchID && p.BatNbr == objBatch.BatNbr && p.RcptNbr == "");
            if (objPO_Receipt == null)
            {
                objPO_Receipt = new PO_Receipt();
                objPO_Receipt.ResetET();
                var objRcptNbr = _db.PONumbering(objBatch.BranchID, "RcptNbr").FirstOrDefault();
                objPO_Receipt.RcptNbr = objRcptNbr;
                objPO_Receipt.BatNbr = objBatch.BatNbr;
                objPO_Receipt.BranchID = objBatch.BranchID;
                objPO_Receipt.Crtd_DateTime = DateTime.Now;
                objPO_Receipt.Crtd_Prog = _screenNbr;
                objPO_Receipt.Crtd_User = Current.UserName;
                objPO_Receipt.tstamp = new byte[0];
                // Tính total cho Header??????????????????????????????????????????
                objPO_Receipt.RcptFeeTot = objHeader.RcptFeeTot;
                objPO_Receipt.RcptTot = objHeader.RcptTot;
                objPO_Receipt.DiscAmt = objHeader.DiscAmt;
                objPO_Receipt.DiscAmtPct = objHeader.DiscAmtPct;
                objPO_Receipt.RcptTotAmt = objHeader.RcptTotAmt;
                objPO_Receipt.TaxAmtTot00 = objHeader.TaxAmtTot00;
                objPO_Receipt.TxblAmtTot00 = objHeader.TxblAmtTot00;
                objPO_Receipt.TaxID00 = objHeader.TaxID00;
                objPO_Receipt.TaxAmtTot01 = objHeader.TaxAmtTot01;
                objPO_Receipt.TxblAmtTot01 = objHeader.TxblAmtTot01;
                objPO_Receipt.TaxID01 = objHeader.TaxID01;
                objPO_Receipt.TaxAmtTot02 = objHeader.TaxAmtTot02;
                objPO_Receipt.TxblAmtTot02 = objHeader.TxblAmtTot02;
                objPO_Receipt.TaxID02 = objHeader.TaxID02;
                objPO_Receipt.TaxAmtTot03 = objHeader.TaxAmtTot03;
                objPO_Receipt.TxblAmtTot03 = objHeader.TxblAmtTot03;
                objPO_Receipt.TaxID03 = objHeader.TaxID03;
                objPO_Receipt.Descr = _objPO_Setup.DfltRcptFrom == "DR" ? "Directly Receipt/Return" : "";
                if (checkSONbrERPImp)
                {
                    objPO_Receipt.PONbr = "";
                    objPO_Receipt.SONbrERP = objHeader.SONbrERP;
                }
                else
                {
                    objPO_Receipt.PONbr = objHeader.PONbr;
                }
                objPO_Receipt.RcptDate = objHeader.RcptDate.ToDateShort();
                objPO_Receipt.RcptType = objHeader.RcptType;
                objPO_Receipt.RcptFrom = objHeader.RcptFrom;
                objPO_Receipt.RcptQtyTot = objHeader.RcptQtyTot;
                objPO_Receipt.VendID = objHeader.VendID;
                objPO_Receipt.Status = "H";
                objPO_Receipt.OrigOrderNbr = string.Empty;
                objPO_Receipt.LUpd_DateTime = DateTime.Now;
                objPO_Receipt.LUpd_Prog = _screenImport;
                objPO_Receipt.LUpd_User = Current.UserName;
                objPO_Receipt.tstamp = new byte[0];
                objPO_Receipt.TruckRcptDate = objHeader.TruckRcptDate;
                _rcptNbr = objPO_Receipt.RcptNbr;
                objPO_Receipt.POType = objHeader.POType.PassNull();
                _db.PO_Receipt.AddObject(objPO_Receipt);
            }
            SavePO_INVoiceImp(objPO_Receipt, objHeader);
        }
        private void SavePO_INVoiceImp(PO_Receipt objPO_Receipt, PO10200_pdHeader_Result objHeader)
        {
            var objPO_Invoice = _db.PO_Invoice.Where(p => p.BranchID == objPO_Receipt.BranchID && p.BatNbr == objPO_Receipt.BatNbr && p.RcptNbr == objPO_Receipt.RcptNbr).FirstOrDefault();
            if (objPO_Invoice == null)
            {
                objPO_Invoice = new PO_Invoice();
                objPO_Invoice.ResetET();
                objPO_Invoice.BatNbr = objPO_Receipt.BatNbr;
                objPO_Invoice.RcptNbr = objPO_Receipt.RcptNbr;
                objPO_Invoice.BranchID = objPO_Receipt.BranchID;
                objPO_Invoice.Crtd_Datetime = DateTime.Now;
                objPO_Invoice.Crtd_Prog = _screenNbr;
                objPO_Invoice.Crtd_User = Current.UserName;
                objPO_Invoice.tstamp = new byte[0];
                _db.PO_Invoice.AddObject(objPO_Invoice);
            }
            // Check HEader....
            objPO_Invoice.InvcNbr = objHeader.InvcNbr;
            objPO_Invoice.InvcNote = objHeader.InvcNote;
            objPO_Invoice.InvcDate = (objHeader.POType == "VO" || objHeader.POType == "BI") ? new DateTime(1900, 01, 01, 00, 00, 00) : objHeader.InvcDate.ToDateShort();
            if (objHeader.Module == "PO" && objHeader.RcptType == "R" && (objHeader.POType == "VO" || objHeader.POType == "BI"))
            {
                objPO_Invoice.DocType = "VO";
            }
            else
            {
                objPO_Invoice.DocType = objHeader.RcptType == "X" && (objHeader.POType == "VO" || objHeader.POType == "BI") ? "AD" : objHeader.DocType;
            }
            objPO_Invoice.DocDate = objHeader.DocDate.ToDateShort();
            objPO_Invoice.APBatNbr = objHeader.APBatNbr;
            objPO_Invoice.APRefNbr = objHeader.APRefNbr;
            objPO_Invoice.Terms = objHeader.Terms;
            objPO_Invoice.VendID = objHeader.VendID;
            objPO_Invoice.PerPost = objHeader.PerPost;
            objPO_Invoice.LUpd_Datetime = DateTime.Now;
            objPO_Invoice.LUpd_Prog = _screenImport;
            objPO_Invoice.LUpd_User = Current.UserName;
            objPO_Invoice.InTransit = _poHead.InTransit;
            objPO_Invoice.InvcNbrImport = _poHead.InvcNbrImport;
            objPO_Invoice.InvcNoteImport = _poHead.InvcNoteImport;
            objPO_Invoice.ReplaceInvoice = _poHead.ReplaceInvoice;
            objPO_Invoice.InvcDateImport = _poHead.InvcDateImport;
            objPO_Invoice.InvcNoteOld = _poHead.InvcNoteOld;
            objPO_Invoice.InvcNbrOld = _poHead.InvcNbrOld;
            objPO_Invoice.InvcDateOld = _poHead.InvcDateOld;
            SavePO_TransImp(objPO_Receipt, objHeader);
        }
        private void SavePO_TransImp(PO_Receipt objPO_Receipt, PO10200_pdHeader_Result objHeader)
        {
            var lstTrans = _lstPOTrans;
            var lstLot = _lstLot;
            var tranAmt = 0d;
            // Kiểm tra lô???????????
            for (int i = 0; i < lstTrans.Count; i++)
            {
                var objPOT = lstTrans[i];
                if (string.IsNullOrWhiteSpace(objPOT.InvtID))
                {
                    continue;
                }
                var objInvtID = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == objPOT.InvtID).FirstOrDefault();
                // kiem tra xem co muc lot ko, neu san pham co quan li lot ma khong co muc lot, thong bao khong cho save
                if (objInvtID != null)
                {
                    var qtylot = lstLot.Where(p => p.InvtID == objPOT.InvtID && p.SiteID == objPOT.SiteID && p.POTranLineRef == objPOT.LineRef).Sum(p => p.Qty);
                    if (objInvtID.LotSerTrack.PassNull() != "N" && objInvtID.LotSerTrack.PassNull() != "" && qtylot != objPOT.RcptQty)
                    {
                        throw new MessageException(MessageType.Message, "201508111", parm: new[] { objPOT.InvtID, qtylot.ToString(), objPOT.RcptQty.ToString() });
                    }
                }
                else
                {
                    throw new MessageException(MessageType.Message, "201508112", parm: new[] { objPOT.InvtID });
                }
                var objSite = _lstSiteAll.FirstOrDefault(x => x.SiteID == objPOT.SiteID);
                if (objSite == null)
                {
                    throw new MessageException(MessageType.Message, "2016081801", parm: new[] { objPOT.SiteID, objPO_Receipt.BranchID });
                }
                var obj = _db.PO_Trans.Where(p => p.BranchID == objPO_Receipt.BranchID && p.BatNbr == objPO_Receipt.BatNbr && p.RcptNbr == objPO_Receipt.RcptNbr && p.LineRef == objPOT.LineRef).FirstOrDefault();
                if (obj != null)
                {
                    if (obj.tstamp.ToHex() != objPOT.tstamp.ToHex())
                    {
                        throw new MessageException(MessageType.Message, "19");
                    }
                    Updating_PO_TransImp(lstTrans[i], ref obj, objHeader);
                }
                else
                {
                    obj = new PO_Trans();
                    obj.ResetET();
                    Updating_PO_TransImp(lstTrans[i], ref obj, objHeader);
                    obj.BranchID = objPO_Receipt.BranchID;
                    obj.BatNbr = objPO_Receipt.BatNbr;
                    obj.RcptNbr = objPO_Receipt.RcptNbr;
                    obj.LineRef = lstTrans[i].LineRef;
                    obj.Crtd_DateTime = DateTime.Now;
                    obj.Crtd_Prog = _screenNbr;
                    obj.Crtd_User = Current.UserName;
                    obj.tstamp = new byte[0];
                    _db.PO_Trans.AddObject(obj);
                }
                tranAmt += obj.TranAmt;
            }
            if (tranAmt < 0)
            {
                throw new MessageException("2017020604", "", new string[] { objPO_Receipt.BranchID, objHeader.InvcNote, objHeader.InvcNbr });
            }
            Save_PO_LotTransImp(objPO_Receipt, objHeader);

        }
        private void Save_PO_LotTransImp(PO_Receipt objPO_Receipt, PO10200_pdHeader_Result objHeader)
        {
            try
            {
                var lstLot = _lstLot;
                //// delete lot cu khong co tren luoi lot
                var lstold = _db.PO_LotTrans.Where(p => p.BranchID == objPO_Receipt.BranchID && p.BatNbr == objPO_Receipt.BatNbr && p.RefNbr == objPO_Receipt.RcptNbr).ToList();
                foreach (var obj in lstold)
                {
                    if (lstLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr && p.POTranLineRef == obj.POTranLineRef).FirstOrDefault() == null)
                    {
                        _db.PO_LotTrans.DeleteObject(obj);
                        if (objHeader.RcptType == "X")
                        {
                            double NewQty = (obj.UnitMultDiv == "D" ? (obj.Qty / obj.CnvFact) : (obj.Qty * obj.CnvFact));
                            var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr).FirstOrDefault();
                            objItemLot.QtyAllocPORet = Math.Round(objItemLot.QtyAllocPORet - NewQty, 0);
                            objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail + NewQty, 0);
                            objItemLot.LUpd_DateTime = DateTime.Now;
                            objItemLot.LUpd_Prog = _screenNbr;
                            objItemLot.LUpd_User = Current.UserName;
                        }
                    }
                }

                //Save Lot/Serial from datatable to in_lottrans

                foreach (var row in lstLot)
                {
                    double oldQty = 0;
                    var obj = lstold.Where(p => p.BranchID == objPO_Receipt.BranchID && p.BatNbr == objPO_Receipt.BatNbr && p.RefNbr == objPO_Receipt.RcptNbr && p.InvtID == row.InvtID && p.LotSerNbr == row.LotSerNbr && p.SiteID == row.SiteID).FirstOrDefault();
                    if (obj == null)
                    {
                        obj = new PO_LotTrans();
                        obj.ResetET();
                        Update_PO_LotTrans(row, obj, true);
                        _db.PO_LotTrans.AddObject(obj);
                    }
                    else
                    {
                        oldQty = obj == null ? 0 : obj.UnitMultDiv == "M" ? obj.Qty * obj.CnvFact : obj.Qty / obj.CnvFact;
                        Update_PO_LotTrans(row, obj, false);
                    }
                    //Update Location and Site Qty
                    if (_poHead.RcptType == "X")
                    {
                        var qty = obj.UnitMultDiv == "M" ? obj.Qty * obj.CnvFact : obj.Qty / obj.CnvFact;
                        var objItemLot = _db.IN_ItemLot.Where(p => p.InvtID == obj.InvtID && p.SiteID == obj.SiteID && p.LotSerNbr == obj.LotSerNbr).FirstOrDefault();
                        objItemLot.QtyAllocPORet = Math.Round(objItemLot.QtyAllocPORet + qty - oldQty, 0);
                        objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail - qty + oldQty, 0);
                        objItemLot.LUpd_DateTime = DateTime.Now;
                        objItemLot.LUpd_Prog = _screenNbr;
                        objItemLot.LUpd_User = Current.UserName;
                        if (objItemLot.QtyAvail < 0)
                        {
                            throw new MessageException(MessageType.Message, "35");
                        }
                    }
                }
                _db.SaveChanges();
                if (_isRelease)
                {
                    DataAccess dal = Util.Dal();
                    try
                    {
                        POProcess.PO po = new POProcess.PO(Current.UserName, _screenNbr, dal);
                        dal.BeginTrans(IsolationLevel.ReadCommitted);
                        if (!po.PO10200_Release(_branchID, _batNbr, _rcptNbr))
                        {
                            dal.RollbackTrans();
                        }
                        else
                        {
                            dal.CommitTrans();
                        }
                        Util.AppendLog(ref _logMessage, "9999", "", data: new { success = true, batNbr = _batNbr });
                        po = null;
                    }
                    catch (Exception)
                    {
                        dal.RollbackTrans();
                        throw;
                    }
                }
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
        private void Updating_PO_TransImp(PO10200_pgDetail_Result objr, ref PO_Trans objPO_Tr, PO10200_pdHeader_Result objHeader)
        {
            try
            {
                objr.PurchaseType = objr.PurchaseType;
                if (objr.PurchaseType == "GI" || objr.PurchaseType == _ICPurchaseType || objr.PurchaseType == _DPPurchageType || objr.PurchaseType == "PR" || objr.PurchaseType == "GP" || objr.PurchaseType == "GS")
                {
                    var objIN_Inventory = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, _branchID).Where(p => p.InvtID == objr.InvtID).FirstOrDefault();
                    var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == objr.InvtID && p.SiteID == objr.SiteID).FirstOrDefault();
                    //Kiem tra itemsite neu chua co thi add vao
                    if (objIN_ItemSite == null && lstInItemsiteNew.Where(p => p.InvtID == objr.InvtID && p.SiteID == objr.SiteID).Count() == 0)
                    {
                        Insert_IN_ItemSite(ref objIN_ItemSite, ref objIN_Inventory, objr.SiteID);
                    }
                    //Update Location and Site Qty
                    if (objHeader.RcptType == "X")
                    {
                        double OldQty = 0;
                        double NewQty = 0;
                        NewQty = (objr.RcptMultDiv == "D" ? (objr.RcptQty / objr.RcptConvFact) : (objr.RcptQty * objr.RcptConvFact));
                        OldQty = (objr.RcptMultDiv == "D" ? (objPO_Tr.RcptQty / objPO_Tr.RcptConvFact) : objPO_Tr.RcptQty * objPO_Tr.RcptConvFact);
                        if (objIN_ItemSite != null)
                        {
                            objIN_ItemSite.QtyAllocPORet = Math.Round(objIN_ItemSite.QtyAllocPORet - OldQty + NewQty, 0);
                            objIN_ItemSite.QtyAvail = Math.Round(objIN_ItemSite.QtyAvail + OldQty - NewQty, 0);
                            objIN_ItemSite.LUpd_DateTime = DateTime.Now;
                            objIN_ItemSite.LUpd_Prog = _screenNbr;
                            objIN_ItemSite.LUpd_User = Current.UserName;
                            if (objIN_ItemSite.QtyAvail < 0)
                            {
                                throw new MessageException(MessageType.Message, "35");
                            }
                        }
                    }
                }
                objPO_Tr.CostID = string.Empty;
                objPO_Tr.CnvFact = objr.CnvFact;
                objPO_Tr.CostVouched = objr.CostVouched;
                objPO_Tr.UnitCost = objr.UnitCost;
                objPO_Tr.RcptFee = objr.RcptFee;
                objPO_Tr.DocDiscAmt = objr.DocDiscAmt;
                objPO_Tr.DiscPct = objr.DiscPct;
                objPO_Tr.ExtVolume = objr.ExtVolume;
                objPO_Tr.ExtWeight = objr.ExtWeight;
                objPO_Tr.InvtID = objr.InvtID;
                objPO_Tr.JrnlType = string.IsNullOrEmpty(objr.PONbr) ? "PO" : objr.JrnlType;
                /////////////////////////////////////////////////////////////////////////////////////////////////////
                objPO_Tr.OrigRcptDate = objHeader.RcptDate.ToDateShort();
                objPO_Tr.OrigRcptNbr = objr.OrigRcptNbr.PassNull();
                objPO_Tr.OrigRetRcptNbr = objr.OrigRetRcptNbr.PassNull();
                objPO_Tr.POLineRef = objr.POLineRef.PassNull();
                objPO_Tr.PONbr = objr.PONbr;
                objPO_Tr.POOriginal = objr.POOriginal.PassNull();
                objPO_Tr.PurchaseType = objr.PurchaseType;
                objPO_Tr.RcptConvFact = objr.RcptConvFact == 0 ? 1 : objr.RcptConvFact;
                objPO_Tr.UnitMultDiv = objr.UnitMultDiv;
                objPO_Tr.CnvFact = objr.CnvFact;
                objPO_Tr.Qty = objr.Qty;
                objPO_Tr.PosmID = objr.PosmID.PassNull();
                objPO_Tr.DiscCode = objr.DiscCode.PassNull();
                if (string.IsNullOrEmpty(objr.PONbr))
                {
                    if (objr.UnitMultDiv == "M")
                    {
                        objPO_Tr.Qty = objr.RcptMultDiv == "M" ? objr.RcptConvFact * objr.RcptQty / objPO_Tr.CnvFact : (objr.RcptQty / objr.RcptConvFact) / objPO_Tr.CnvFact;
                    }
                    else
                    {
                        objPO_Tr.Qty = objr.RcptMultDiv == "M" ? objr.RcptConvFact * objr.RcptQty * objPO_Tr.CnvFact : objr.RcptQty / objr.RcptConvFact * objPO_Tr.CnvFact;
                    }
                }
                objPO_Tr.QtyVouched = objr.QtyVouched;
                objPO_Tr.RcptDate = objHeader.RcptDate.ToDateShort();
                objPO_Tr.RcptMultDiv = objr.RcptMultDiv;
                objPO_Tr.RcptQty = objr.RcptQty;
                objPO_Tr.RcptUnitDescr = objr.RcptUnitDescr;
                objPO_Tr.ReasonCD = objr.ReasonCD.PassNull();
                objPO_Tr.SiteID = objr.SiteID;
                objPO_Tr.TaxCat = objr.TaxCat;
                objPO_Tr.TaxID00 = objr.TaxID00;
                objPO_Tr.TaxID01 = objr.TaxID01;
                objPO_Tr.TaxID02 = objr.TaxID02;
                objPO_Tr.TaxID03 = objr.TaxID03;
                objPO_Tr.TaxAmt00 = objr.TaxAmt00;
                objPO_Tr.TaxAmt01 = objr.TaxAmt01;
                objPO_Tr.TaxAmt02 = objr.TaxAmt02;
                objPO_Tr.TaxAmt03 = objr.TaxAmt03;
                objPO_Tr.TxblAmt00 = objr.TxblAmt00;
                objPO_Tr.TxblAmt01 = objr.TxblAmt01;
                objPO_Tr.TxblAmt02 = objr.TxblAmt02;
                objPO_Tr.TxblAmt03 = objr.TxblAmt03;
                objPO_Tr.TranDate = objHeader.RcptDate.ToDateShort();
                objPO_Tr.TranDesc = objr.TranDesc;
                objPO_Tr.TranType = objHeader.RcptType;
                objPO_Tr.UnitDescr = objr.UnitDescr;
                objPO_Tr.UnitVolume = objr.UnitVolume;
                objPO_Tr.UnitWeight = objr.UnitWeight;
                objPO_Tr.VendID = objHeader.VendID;
                objPO_Tr.VouchStage = objr.VouchStage;
                objPO_Tr.TranAmt = objr.TranAmt;
                objPO_Tr.Revenue = objr.Revenue;
                objPO_Tr.ReferDescr = objr.ReferDescr;
                objPO_Tr.LUpd_DateTime = DateTime.Now;
                objPO_Tr.LUpd_Prog = _screenNbr;
                objPO_Tr.LUpd_User = Current.UserName;
                objPO_Tr.Level = objr.Level;
                objPO_Tr.LineGiftPoint = objr.LineGiftPoint;
                objPO_Tr.FromPO10200 = true;
                objPO_Tr.MaxReturnQty = 0;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }
        private string GetPurchaseType(string purchase)
        {
            if (purchase.Length < 4)
            {
                return purchase;
            }
            return (purchase[purchase.Length - 3].PassNull() + purchase[purchase.Length - 2].PassNull());
        }

        private string GetCodeFromCodeDescr(string codeDescr)
        {
            var index = codeDescr.IndexOf(" - ");
            if (index == -1)
            {
                return codeDescr;
            }
            return codeDescr.Substring(0, index);
        }
        private void SetValue4Line(ref PO10200_pgDetail_Result objDet, PO10200_pdHeader_Result objHeader)
        {
            string invtID = objDet.InvtID;
            var objInvt = _lstInvt4CalcTax.FirstOrDefault(x => x.InvtID == invtID);
            if (objInvt != null)
            {
                objDet.ClassID = objInvt.ClassID.PassNull();
                objDet.RcptUnitDescr = objDet.RcptUnitDescr;
                objDet.UnitWeight = objInvt.StkWt;
                objDet.UnitVolume = objInvt.StkVol;
                objDet.RcptFee = objInvt.POFee;
                objDet.TaxCat = objInvt.TaxCat.PassNull();
                double cnvFact = 0;
                string mulDiv = string.Empty;
                SetUOM(ref cnvFact, ref mulDiv, invtID, objInvt.ClassID, objInvt.StkUnit, objDet.RcptUnitDescr);
                objDet.UnitMultDiv = mulDiv;
                objDet.RcptConvFact = cnvFact;
                objDet.RcptMultDiv = mulDiv;
                objDet.RcptQty = objDet.Qty;
                var objInvtID = _db.PO10200_pdIN_Inventory(Current.UserName, Current.CpnyID, Current.LangID, objDet.BranchID).FirstOrDefault(x => x.InvtID == invtID);
                SetUOM(ref cnvFact, ref mulDiv, invtID, objInvt.ClassID, objInvt.StkUnit, objInvtID.DfltPOUnit);
                objDet.CnvFact = cnvFact;
                objDet.UnitDescr = objInvtID.DfltPOUnit;
                if (objDet.UnitMultDiv == "M")
                {
                    objDet.Qty = objDet.RcptMultDiv == "M" ? objDet.RcptConvFact * objDet.RcptQty / objDet.CnvFact : (objDet.RcptQty / objDet.RcptConvFact) / objDet.CnvFact;
                }
                else
                {
                    objDet.Qty = objDet.RcptMultDiv == "M" ? objDet.RcptConvFact * objDet.RcptQty * objDet.CnvFact : objDet.RcptQty / objDet.RcptConvFact * objDet.CnvFact;
                }
                var objItemSite = GetItemSiteQty(objDet.BranchID, objDet.InvtID, objDet.SiteID, objDet.BatNbr, objDet.RcptNbr, objDet.LineRef);
                double Qty = 0;
                if (objDet.RcptMultDiv == "M")
                {
                    Qty = objDet.RcptQty * objDet.RcptConvFact;
                }
                else
                {
                    Qty = objDet.RcptQty / objDet.RcptConvFact == 0 ? 1 : objDet.RcptConvFact;
                }
                if (objDet.PONbr != "" && objHeader.RcptType != "X")
                {
                    if (Qty > (objDet.UnitMultDiv == "M" ? objDet.Qty * objDet.CnvFact : objDet.Qty / objDet.CnvFact))
                    {
                        throw new MessageException(MessageType.Message, "20150326");
                    }
                }
                if (objHeader.RcptType == "X" && (objDet.PurchaseType == "GI" | objDet.PurchaseType == _ICPurchaseType | objDet.PurchaseType == "PR" | objDet.PurchaseType == "GS"))
                {
                    if (objHeader.Module != "AP")
                    {
                        if (objDet.PONbr != "")
                        {
                            if (Qty > (objDet.UnitMultDiv == "M" ? objDet.Qty * objDet.CnvFact : objDet.Qty / objDet.CnvFact))
                            {
                                throw new MessageException(MessageType.Message, "201503261");
                            }
                        }
                        var QtyAvail = objItemSite == null ? 0 : objItemSite.QtyAvail;
                        if (Qty > QtyAvail)
                        {
                            string mess = Util.GetLang("BranchID") + " " + objDet.BranchID + ", " + Util.GetLang("InvtID")
                                + " " + objDet.InvtID + " " + GetMess(35);
                            throw new MessageException(MessageType.Message, "20410", parm: new[] { mess });
                        }
                    }
                }
                if (objDet.PurchaseType == "FA")
                {
                    if (objDet.RcptQty > 1)
                    {
                        string mess = Util.GetLang("BranchID") + " " + objDet.BranchID + ", " + Util.GetLang("InvtID")
                            + " " + objDet.InvtID + " " + GetMess(58);
                        throw new MessageException(MessageType.Message, "20410", parm: new[] { mess });
                    }
                }
                var StkQty = Math.Round((objDet.RcptMultDiv == "D" ? (objDet.RcptQty / objDet.RcptConvFact) : (objDet.RcptQty * objDet.RcptConvFact)));
                if (checkPosmOrFreeItem(objDet.ClassID, objDet.DiscCode))
                {
                    objDet.TranAmt = 0;
                }
                else
                {
                    objDet.TranAmt = objDet.RcptQty * objDet.UnitCost - GetDiscAmt(objDet);// objDet.DocDiscAmt;
                }
                objDet.ExtWeight = StkQty * objDet.UnitWeight;
                objDet.ExtVolume = StkQty * objDet.UnitVolume;

                if (objDet.PurchaseType != "PR")
                {
                    if (_objPO_Setup.DfltLstUnitCost == "A" || _objPO_Setup.DfltLstUnitCost == "L")
                    {
                        var UnitCost = 0.0;
                        if (objDet.UnitCost != 0)
                        {
                            UnitCost = objDet.UnitCost;
                        }
                        else
                        {
                            UnitCost = objItemSite == null ? 0 : (_objPO_Setup.DfltLstUnitCost == "A" ? objItemSite.AvgCost : objItemSite.LastPurchasePrice);
                        }
                        UnitCost = Math.Round((objDet.RcptMultDiv == "D" ? (UnitCost / objDet.RcptConvFact) : (UnitCost * objDet.RcptConvFact)));
                        objDet.UnitCost = UnitCost;
                        if (checkPosmOrFreeItem(objDet.ClassID, objDet.DiscCode))
                        {
                            objDet.TranAmt = 0;
                        }
                        else
                        {
                            objDet.TranAmt = UnitCost * objDet.RcptQty - GetDiscAmt(objDet);
                        }
                    }
                    else if (_objPO_Setup.DfltLstUnitCost == "P")
                    {
                        var UnitCost = 0.0;
                        if (objDet.UnitCost != 0)
                        {
                            UnitCost = objDet.UnitCost;
                        }
                        else
                        {
                            var result = _db.PO10200_ppGetPrice(objDet.BranchID, invtID, objDet.RcptUnitDescr, objHeader.RcptDate, objHeader.InvcDate, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Value;
                            UnitCost = result;
                        }
                        objDet.UnitCost = UnitCost;
                        if (checkPosmOrFreeItem(objDet.ClassID, objDet.DiscCode))
                        {
                            objDet.TranAmt = 0;
                        }
                        else
                        {
                            objDet.TranAmt = UnitCost * objDet.RcptQty - GetDiscAmt(objDet);
                        }
                    }
                    else if (_objPO_Setup.DfltLstUnitCost == "I")
                    {
                        var UnitCost = 0.0;
                        if (objDet.UnitCost != 0)
                        {
                            UnitCost = objDet.UnitCost;
                        }
                        else
                        {
                            UnitCost = objInvt.POPrice;
                        }
                        UnitCost = Math.Round((objDet.RcptMultDiv == "D" ? (UnitCost / objDet.RcptConvFact) : (UnitCost * objDet.RcptConvFact)));
                        objDet.UnitCost = UnitCost;
                        if (checkPosmOrFreeItem(objDet.ClassID, objDet.DiscCode))
                        {
                            objDet.TranAmt = 0;
                        }
                        else
                        {
                            objDet.TranAmt = UnitCost * objDet.RcptQty - GetDiscAmt(objDet);
                        }
                    }
                }
                else
                {
                    objDet.UnitCost = 0;
                    objDet.TranAmt = 0;
                    objDet.DocDiscAmt = 0;
                    objDet.DiscPct = 0;
                }
                objDet.FromPO10200 = true;
                objDet.MaxReturnQty = 0;
                // calc tax
                delTax(ref objDet);
                calcTax(ref objDet);
                calcTaxTotal();
            }
        }
        public bool SetUOM(ref double Cnvfact, ref string UnitMultDiv, string InvtID, string ClassID, string StkUnit, string FromUnit)
        {
            try
            {
                if (!string.IsNullOrEmpty(FromUnit))
                {
                    var objIN_UnitConversion = _lstUnitCnv4CalcTax.Where(p => p.UnitType == "3" && p.ClassID == "*" && p.InvtID == InvtID && p.FromUnit == FromUnit && p.ToUnit == StkUnit).FirstOrDefault();
                    if (objIN_UnitConversion == null)
                        objIN_UnitConversion = _lstUnitCnv4CalcTax.Where(p => p.UnitType == "2" && p.ClassID == "*" && p.InvtID == InvtID && p.FromUnit == FromUnit && p.ToUnit == StkUnit).FirstOrDefault();
                    if (objIN_UnitConversion == null)
                        objIN_UnitConversion = _lstUnitCnv4CalcTax.Where(p => p.UnitType == "1" && p.ClassID == "*" && p.InvtID == "*" && p.FromUnit == FromUnit && p.ToUnit == StkUnit).FirstOrDefault();
                    if (objIN_UnitConversion == null)
                    {
                        Cnvfact = 0;
                        UnitMultDiv = "";
                        throw new MessageException(MessageType.Message, "25");
                    }
                    Cnvfact = objIN_UnitConversion.CnvFact;
                    UnitMultDiv = objIN_UnitConversion.MultDiv;
                    return true;
                }
                return true;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }

        public IN_ItemSite GetItemSiteQty(string branchID = "", string invtID = "", string siteID = "", string batNbr = "", string rcptNbr = "", string lineRef = "")
        {
            var objold = _db.PO_Trans.Where(p => p.BranchID == branchID && p.BatNbr == batNbr && p.RcptNbr == rcptNbr && p.InvtID == invtID && p.SiteID == siteID && p.LineRef == lineRef).FirstOrDefault();
            var qtyold = objold == null ? 0 : objold.UnitMultDiv == "M" ? objold.Qty * objold.CnvFact : objold.Qty / objold.CnvFact;
            var objIN_ItemSite = _db.IN_ItemSite.Where(p => p.InvtID == invtID && p.SiteID == siteID).FirstOrDefault();
            if (objIN_ItemSite == null)
            {
                objIN_ItemSite = new IN_ItemSite();
                objIN_ItemSite.ResetET();
            }
            objIN_ItemSite.QtyAvail = objIN_ItemSite.QtyAvail + qtyold;
            return objIN_ItemSite;
        }
        private string GetLineRef(int index)
        {
            if (index == 0)
            {
                index = 1;
            }
            var lineRef = index.ToString();
            var len = lineRef.Length;
            for (var i = 0; i < 5 - len; i++)
            {
                lineRef = "0" + lineRef;
            }
            return lineRef;
        }

        // Get Discount amount
        private double GetDiscAmt(PO10200_pgDetail_Result objDet)
        {
            var discAmt = 0d;
            if (objDet.DiscPct != 0)
            {
                discAmt = Math.Round((objDet.RcptQty * objDet.UnitCost * objDet.DiscPct) / 100, _decimalPlaces);
                return discAmt > objDet.RcptQty * objDet.UnitCost ? 0 : discAmt;
            }
            else if (objDet.DocDiscAmt != 0)
            {
                if (objDet.ClassID == DiscountClassID)
                {
                    return objDet.DocDiscAmt;
                }
                return objDet.DocDiscAmt > objDet.RcptQty * objDet.UnitCost ? 0 : objDet.DocDiscAmt;
            }
            else
            {
                return 0d;
            }
        }

        #endregion

        #region ProcessData
        private void Save_BatchAPImport(string branchID, PO10200_pdHeader_Result objHeader, PO10200_pcVendor_Active_Result objVend)
        {
            _batNbr = objHeader.BatNbr.PassNull();
            _objBatch = _app.Batches.Where(p => p.Module == "AP" && p.BatNbr == _batNbr && p.BranchID == _branchID).FirstOrDefault();
            if (_objBatch == null)
            {
                _objBatch = new Batch();
                _objBatch.ResetET();
                _objBatch.Rlsed = 0;
                var objBatNbr = _app.APNumbering(_branchID, "BatNbr").FirstOrDefault();
                _objBatch.BranchID = _branchID;
                _objBatch.BatNbr = objBatNbr;
                _objBatch.Crtd_DateTime = DateTime.Now;
                _objBatch.Crtd_Prog = _screenNbr;
                _objBatch.Crtd_User = Current.UserName;
                _app.Batches.AddObject(_objBatch);

            }
            Updating_BatchAPImport(ref _objBatch);
            _batNbr = _objBatch.BatNbr;
            SaveAP_Doc(_objBatch, objVend);
            _app.SaveChanges();
            ReleaseAP();
        }

        private void Updating_BatchAPImport(ref Batch objBatch)
        {

            objBatch.Module = "AP";
            objBatch.JrnlType = "AP";
            objBatch.TotAmt = _poHead.TotAmt;
            objBatch.Status = _poHead.Status;
            objBatch.EditScrnNbr = _screenNbr;
            objBatch.DateEnt = _poHead.DocDate.ToDateShort();
            objBatch.NoteID = 0;
            objBatch.RvdBatNbr = "";
            objBatch.Descr = _poHead.DocType == "AC" ? "Nhập phiếu báo có" : "Nhập phiếu báo nợ";
            objBatch.LUpd_DateTime = DateTime.Now;
            objBatch.LUpd_Prog = _screenNbr;
            objBatch.LUpd_User = Current.UserName;

        }

        private void SaveAP_Doc(Batch objBatch, PO10200_pcVendor_Active_Result objVend)
        {

            var obj = _app.AP_Doc.Where(p => p.BranchID == _branchID && p.BatNbr == _batNbr && p.RefNbr == _refNbr).FirstOrDefault();
            if (obj == null)
            {
                obj = new AP_Doc();
                obj.ResetET();
                obj.RefNbr = _app.APNumbering(_branchID, "RefNbr").FirstOrDefault();
                obj.BranchID = objBatch.BranchID;
                obj.BatNbr = objBatch.BatNbr;
                obj.Crtd_DateTime = DateTime.Now;
                obj.Crtd_Prog = _screenNbr;
                obj.Crtd_User = Current.UserName;
                _app.AP_Doc.AddObject(obj);
            }
            Updating_AP_Doc(ref obj);
            SaveAP_Trans(obj, objVend);
        }
        private void Updating_AP_Doc(ref AP_Doc objD)
        {
            objD.NoteID = 0;
            objD.PONbr = _poHead.PONbr.PassNull();
            objD.InvcNbr = _poHead.InvcNbr.PassNull();
            objD.InvcNote = _poHead.InvcNote.PassNull();
            objD.RcptNbr = _poHead.RcptNbr.PassNull();
            objD.DocBal = _poHead.TotAmt;
            objD.OrigDocAmt = _poHead.TotAmt;


            objD.TaxTot00 = _lstPOTrans.ToList().Sum(x => x.TaxAmt00);
            objD.TxblTot00 = _lstPOTrans.ToList().Sum(x => x.TxblAmt00);
            objD.TaxId00 = _poHead.TaxID00;

            objD.TaxTot01 = _lstPOTrans.ToList().Sum(x => x.TaxAmt01);
            objD.TxblTot01 = _lstPOTrans.ToList().Sum(x => x.TxblAmt01);
            objD.TaxId01 = _poHead.TaxID01;

            objD.TaxTot02 = _lstPOTrans.ToList().Sum(x => x.TaxAmt02);
            objD.TxblTot02 = _lstPOTrans.ToList().Sum(x => x.TxblAmt02);
            objD.TaxId02 = _poHead.TaxID02;

            objD.TaxTot03 = _lstPOTrans.ToList().Sum(x => x.TaxAmt03);
            objD.TxblTot03 = _lstPOTrans.ToList().Sum(x => x.TxblAmt03);
            objD.TaxId03 = _poHead.TaxID03;
            objD.DocDesc = _poHead.DocType == "AC" ? "Nhập Phiếu Báo Có" : "Nhập Phiếu Báo Nợ";
            objD.InvcDate = _poHead.InvcDate.Value;
            objD.DiscDate = _poHead.InvcDate.Value;
            objD.DocDate = _poHead.DocDate;
            objD.Terms = _poHead.Terms;
            objD.DueDate = _poHead.InvcDate.Value.AddDays(_poHead.Terms.ToInt());
            objD.DocType = _poHead.DocType;
            objD.VendID = _poHead.VendID;
            objD.LUpd_DateTime = DateTime.Now;
            objD.LUpd_Prog = _screenNbr;
            objD.LUpd_User = Current.UserName;
        }
        private void SaveAP_Trans(AP_Doc objD, PO10200_pcVendor_Active_Result objVend)
        {
            for (int i = 0; i < _lstPOTrans.Count; i++)
            {
                var objRecord = _lstPOTrans[i];
                var obj = _app.AP_Trans.Where(p => p.BranchID == objD.BranchID && p.BatNbr == objD.BatNbr && p.RefNbr == objD.RefNbr && p.LineRef == objRecord.LineRef).FirstOrDefault();
                if (obj == null)
                {
                    obj = new AP_Trans();
                    obj.ResetET();
                    Updating_AP_Trans(_lstPOTrans[i], ref obj, objVend);
                    obj.BranchID = objD.BranchID;
                    obj.BatNbr = objD.BatNbr;
                    obj.RefNbr = objD.RefNbr;
                    obj.JrnlType = "AP";
                    obj.Crtd_DateTime = DateTime.Now;
                    obj.Crtd_Prog = _screenNbr;
                    obj.Crtd_User = Current.UserName;
                    _app.AP_Trans.AddObject(obj);
                }
                Updating_AP_Trans(_lstPOTrans[i], ref obj, objVend);
            }
        }
        private void Updating_AP_Trans(PO10200_pgDetail_Result objr, ref AP_Trans objAP_Trans, PO10200_pcVendor_Active_Result objVend)
        {
            objAP_Trans.LineRef = objr.LineRef;
            objAP_Trans.VendID = _poHead.VendID;
            objAP_Trans.VendName = objVend.Name;
            objAP_Trans.Addr = objVend.Address;
            objAP_Trans.InvcNbr = _poHead.InvcNbr.PassNull();
            objAP_Trans.InvcNote = _poHead.InvcNote.PassNull();
            objAP_Trans.InvtID = objr.InvtID;
            objAP_Trans.InvcDate = _poHead.InvcDate.Value;
            objAP_Trans.LineType = "N";
            objAP_Trans.POLineRef = objr.POLineRef.PassNull();
            objAP_Trans.PONbr = objr.PONbr;
            objAP_Trans.Qty = objr.RcptQty;
            objAP_Trans.TranAmt = objr.TranAmt;
            objAP_Trans.TranClass = "";
            objAP_Trans.TranDate = _poHead.DocDate.ToDateShort();
            objAP_Trans.TranDesc = objr.TranDesc;
            objAP_Trans.TranType = Util.GetLang(_poHead.DocType);
            objAP_Trans.TaxRegNbr = "";
            objAP_Trans.UnitPrice = objr.UnitCost;
            objAP_Trans.TaxCat = objr.TaxCat;
            objAP_Trans.TaxId00 = objr.TaxID00;
            objAP_Trans.TaxId01 = objr.TaxID01;
            objAP_Trans.TaxId02 = objr.TaxID02;
            objAP_Trans.TaxId03 = objr.TaxID03;
            objAP_Trans.TaxAmt00 = objr.TaxAmt00;
            objAP_Trans.TaxAmt01 = objr.TaxAmt01;
            objAP_Trans.TaxAmt02 = objr.TaxAmt02;
            objAP_Trans.TaxAmt03 = objr.TaxAmt03;
            objAP_Trans.TxblAmt00 = objr.TxblAmt00;
            objAP_Trans.TxblAmt01 = objr.TxblAmt01;
            objAP_Trans.TxblAmt02 = objr.TxblAmt02;
            objAP_Trans.TxblAmt03 = objr.TxblAmt03;
            objAP_Trans.LUpd_DateTime = DateTime.Now;
            objAP_Trans.LUpd_Prog = _screenNbr;
            objAP_Trans.LUpd_User = Current.UserName;
        }
        #endregion
        #region Release
        private void ReleaseAP()
        {
            if (_isRelease)
            {
                DataAccess dal = Util.Dal();
                try
                {
                    APProcess.AP ap = new APProcess.AP(Current.UserName, _screenNbr, dal);
                    dal.BeginTrans(IsolationLevel.ReadCommitted);
                    if (ap.AP10100_Release(_branchID, _batNbr))
                    {
                        dal.CommitTrans();
                    }
                    else
                    {
                        dal.RollbackTrans();
                    }
                    Util.AppendLog(ref _logMessage, "9999", "", data: new { success = true, batNbr = _batNbr });
                    ap = null;
                }
                catch (Exception)
                {
                    dal.RollbackTrans();
                    throw;
                }
            }
        }
        #endregion

        #region -Calc Tax-
        private bool delTax(ref PO10200_pgDetail_Result record)
        {
            var lineRef = record.LineRef;
            for (var j = _lstTaxTrans.Count - 1; j >= 0; j--)
            {
                if (_lstTaxTrans[j].LineRef == lineRef)
                {
                    _lstTaxTrans.RemoveAt(j);
                }
            }
            clearTax(ref record);
            calcTaxTotal();
            return true;

        }
        private void clearTax(ref PO10200_pgDetail_Result record)
        {
            record.TaxID00 = "";
            record.TaxAmt00 = 0;
            record.TxblAmt00 = 0;
            record.TaxID01 = "";
            record.TaxAmt01 = 0;
            record.TxblAmt01 = 0;
            record.TaxID02 = "";
            record.TaxAmt02 = 0;
            record.TxblAmt02 = 0;
            record.TaxID03 = "";
            record.TaxAmt03 = 0;
            record.TxblAmt03 = 0;
        }
        private bool calcTax(ref PO10200_pgDetail_Result det)
        {
            if (det == null)
            {
                return true;
            }

            var dt = new List<PO10200_pdAP_VenDorTaxes_Result>();
            if (det.TaxID == "*")
            {
                for (var j = 0; j < _lstVendTaxes.Count; j++)
                {
                    dt.Add(_lstVendTaxes[j]);
                };
            }
            else
            {
                var strTax = det.TaxID.Split(',');
                if (strTax.Length > 0)
                {
                    for (var k = 0; k < strTax.Length; k++)
                    {
                        for (var j = 0; j < _lstVendTaxes.Count; j++)
                        {
                            if (strTax[k] == _lstVendTaxes[j].taxid)
                            {
                                dt.Add(_lstVendTaxes[j]);
                                break;
                            }
                        }
                    }
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(det.TaxID) || string.IsNullOrWhiteSpace(det.TaxCat))
                    {
                        det.TxblAmt00 = det.TranAmt;
                    }
                    return false;
                }
            }

            var taxCat = det.TaxCat;
            double prcTaxInclRate = 0, totPrcTaxInclAmt = 0, txblAmtL1 = 0, txblAmtAddL2 = 0;
            for (var j = 0; j < dt.Count; j++)
            {
                var objTax = _lstVendTaxes.FirstOrDefault(x => x.taxid == dt[j].taxid);
                if ((objTax != null) && !string.IsNullOrWhiteSpace(taxCat))
                {
                    if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                               && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                               && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                                      || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                                    objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                                    objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                    {

                        if (objTax.TaxCalcLvl == "1" && objTax.PrcTaxIncl != "0")
                        {
                            prcTaxInclRate = prcTaxInclRate + objTax.TaxRate;
                        }
                    }
                }
            }
            if (prcTaxInclRate == 0)
            {
                txblAmtL1 = Math.Round(det.TranAmt, 0, MidpointRounding.AwayFromZero);
            }
            else
            {
                txblAmtL1 = Math.Round(det.TranAmt, 0, MidpointRounding.AwayFromZero) / (1 + prcTaxInclRate / 100);
            }

            det.TxblAmt00 = txblAmtL1;

            for (var j = 0; j < dt.Count; j++)
            {
                string taxID = "", lineRef = "";
                double taxRate = 0, taxAmtL1 = 0;
                var objTax = _lstVendTaxes.FirstOrDefault(x => x.taxid == dt[j].taxid);
                if ((objTax != null) && !string.IsNullOrWhiteSpace(taxCat))
                {
                    if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                               && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                               && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                                      || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                                    objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                                    objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                    {
                        if (objTax.TaxCalcLvl == "1")
                        {
                            taxID = dt[j].taxid;
                            lineRef = det.LineRef;
                            taxRate = objTax.TaxRate;
                            taxAmtL1 = Math.Round(txblAmtL1 * objTax.TaxRate / 100, 1);

                            if (objTax.Lvl2Exmpt == 0)
                            {
                                txblAmtAddL2 += txblAmtL1;
                            }

                            if (objTax.PrcTaxIncl != "0")
                            {
                                var chk = false;
                                if (j < dt.Count - 1)
                                {
                                    for (var k = j + 1; k < dt.Count; k++)
                                    {
                                        objTax = dt[k];
                                        if ((objTax != null) && !string.IsNullOrWhiteSpace(taxCat))
                                        {
                                            if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat &&
                                                                    objTax.CatExcept01 != taxCat && objTax.CatExcept02 != taxCat &&
                                                                    objTax.CatExcept03 != taxCat && objTax.CatExcept04 != taxCat &&
                                                                    objTax.CatExcept05 != taxCat)
                                                              || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                                                            objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                                                            objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                                            {
                                                if (objTax.TaxCalcLvl == "1" && objTax.PrcTaxIncl != "0")
                                                {
                                                    chk = false;
                                                    break;
                                                }
                                            }
                                        }
                                        chk = true;
                                    }
                                }
                                else
                                {
                                    chk = true;
                                }

                                if (chk)
                                {
                                    if (totPrcTaxInclAmt + taxAmtL1 + txblAmtL1 != det.TranAmt)
                                    {
                                        taxAmtL1 = Math.Round(det.TranAmt - (totPrcTaxInclAmt + txblAmtL1), 1);
                                    }
                                }
                                else
                                {
                                    totPrcTaxInclAmt += totPrcTaxInclAmt + taxAmtL1;
                                }
                            }
                            insertUpdateTax(taxID, lineRef, taxRate, taxAmtL1, txblAmtL1, 1, det.BranchID);
                        }
                    }
                }
            }

            for (var j = 0; j < dt.Count; j++)
            {
                string taxID = "", lineRef = "";
                double taxRate = 0, txblAmtL2 = 0, taxAmtL2 = 0;
                var objTax = _lstVendTaxes.FirstOrDefault(x => x.taxid == dt[j].taxid);
                if ((objTax != null) && !string.IsNullOrWhiteSpace(taxCat))
                {
                    if (taxCat == "*" || (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat
                                                               && objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat
                                                               && objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                                      || (objTax.CatFlg == "N" && (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                                                                    objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                                                                    objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                    {
                        if (objTax.TaxCalcLvl == "2")
                        {
                            taxID = dt[j].taxid;
                            lineRef = det.LineRef;
                            taxRate = objTax.TaxRate;
                            txblAmtL2 = Math.Round(txblAmtAddL2 + txblAmtL1, 0);
                            taxAmtL2 = Math.Round(txblAmtAddL2 * objTax.TaxRate / 100, 1);
                            insertUpdateTax(taxID, lineRef, taxRate, taxAmtL2, txblAmtL2, 2, det.BranchID);
                        }
                    }
                }
            }
            updateTax(ref det);

            return true;
        }
        private void insertUpdateTax(string taxID, string lineRef, double taxRate, double taxAmt, double txblAmt, double taxLevel, string branchID)
        {
            var flat = false;
            for (var i = 0; i < _lstTaxTrans.Count; i++)
            {
                if (_lstTaxTrans[i].TaxID == taxID && _lstTaxTrans[i].LineRef == lineRef)
                {
                    var tax = _lstTaxTrans[i];
                    tax.BranchID = branchID;
                    tax.TaxID = taxID;
                    tax.LineRef = lineRef;
                    tax.TaxRate = taxRate;
                    tax.TaxLevel = taxLevel.ToString();
                    tax.TaxAmt = taxAmt;
                    tax.TxblAmt = txblAmt;
                    flat = true;
                    break;
                }
            }
            if (!flat)
            {
                var newTax = new PO10200_pgLoadTaxTrans_Result();
                newTax.BranchID = branchID;
                newTax.TaxID = taxID;
                newTax.LineRef = lineRef;
                newTax.TaxRate = taxRate;
                newTax.TaxLevel = taxLevel.ToString();
                newTax.TaxAmt = taxAmt;
                newTax.TxblAmt = txblAmt;

                _lstTaxTrans.Add(newTax);
            }
            var lsttmp = _lstTaxTrans.OrderBy(x => x.LineRef).ToList();
            _lstTaxTrans = lsttmp;
        }
        private void updateTax(ref PO10200_pgDetail_Result record)
        {
            if (null == record) return;
            var j = 0;
            for (var i = 0; i < _lstTaxTrans.Count; i++)
            {
                var item = _lstTaxTrans[i];
                if (item.LineRef == record.LineRef)
                {
                    if (j == 0)
                    {
                        record.TaxID00 = item.TaxID;
                        record.TxblAmt00 = item.TxblAmt;
                        record.TaxAmt00 = item.TaxAmt;
                    }
                    else if (j == 1)
                    {
                        record.TaxID01 = item.TaxID;
                        record.TxblAmt01 = item.TxblAmt;
                        record.TaxAmt01 = item.TaxAmt;
                    }
                    else if (j == 2)
                    {
                        record.TaxID02 = item.TaxID;
                        record.TxblAmt02 = item.TxblAmt;
                        record.TaxAmt02 = item.TaxAmt;
                    }
                    else if (j == 3)
                    {
                        record.TaxID03 = item.TaxID;
                        record.TxblAmt03 = item.TxblAmt;
                        record.TaxAmt03 = item.TaxAmt;
                    }
                    j++;
                }
                if (j != 0 && item.LineRef != record.LineRef)
                    return;
            };
        }
        private void calcTaxTotal()
        {
            _lstTaxDoc = new List<PO10200_pgLoadTaxTrans_Result>();
            var flat = false;
            for (var i = 0; i < _lstTaxTrans.Count; i++)
            {
                var tax = _lstTaxTrans[i];
                flat = true;
                for (var j = 0; j < _lstTaxDoc.Count; j++)
                {
                    var taxDoc = _lstTaxDoc[j];
                    if (tax.TaxID == taxDoc.TaxID)
                    {
                        taxDoc.TxblAmt += tax.TxblAmt;
                        taxDoc.TaxAmt += tax.TaxAmt;
                        flat = false;
                        break;
                    }
                };
                if (flat)
                {
                    var newTaxDoc = new PO10200_pgLoadTaxTrans_Result();
                    newTaxDoc.BranchID = tax.BranchID;
                    newTaxDoc.RcptNbr = tax.RcptNbr.PassNull();
                    newTaxDoc.TaxID = tax.TaxID;
                    newTaxDoc.TaxAmt = tax.TaxAmt;
                    newTaxDoc.TaxRate = tax.TaxRate;
                    newTaxDoc.TxblAmt = tax.TxblAmt;
                    _lstTaxDoc.Add(newTaxDoc);
                }

            };
            calcDet();
        }
        // Calc Tax
        private void calcDet()
        {
            double taxAmt00 = 0;
            double taxAmt01 = 0;
            double taxAmt02 = 0;
            double taxAmt03 = 0;
            double taxAmt = 0;
            double txblAmtTot = 0;
            double txblAmtTot00 = 0;
            double txblAmtTot01 = 0;
            double txblAmtTot02 = 0;
            double txblAmtTot03 = 0;
            double extCost = 0;
            double discount = 0;
            double poFee = 0;
            double qty = 0;
            var record = _poHead;

            record.TaxAmtTot00 = 0;
            record.TaxAmtTot01 = 0;
            record.TaxAmtTot02 = 0;
            record.TaxAmtTot03 = 0;

            record.TxblAmtTot00 = 0;
            record.TaxID00 = "";
            record.TxblAmtTot01 = 0;
            record.TaxID01 = "";
            record.TxblAmtTot02 = 0;
            record.TaxID02 = "";
            record.TxblAmtTot03 = 0;
            record.TaxID03 = "";

            for (var j = 0; j < _lstPOTrans.Count; j++)
            {
                var det = _lstPOTrans[j];
                taxAmt00 += det.TaxAmt00;
                taxAmt01 += det.TaxAmt01;
                taxAmt02 += det.TaxAmt02;
                taxAmt03 += det.TaxAmt03;

                txblAmtTot00 += det.TaxAmt00 == 0 ? det.TranAmt : det.TxblAmt00;
                txblAmtTot01 += det.TxblAmt01;
                txblAmtTot02 += det.TxblAmt02;
                txblAmtTot03 += det.TxblAmt03;

                poFee += Math.Round((det.RcptMultDiv == "D" ? (det.RcptQty / det.RcptConvFact) : (det.RcptQty * det.RcptConvFact))) * det.RcptFee;
                extCost += det.TranAmt;
                if (det.DocDiscAmt > 0)
                {
                    discount += det.DocDiscAmt;
                }
                else if (det.DiscPct > 0)
                {
                    discount += Math.Round((det.RcptQty * det.UnitCost * det.DiscPct) / 100, 2);
                }

                qty += det.RcptQty;
            };

            for (var j = 0; j < _lstTaxDoc.Count; j++)
            {
                var det = _lstTaxDoc[j];
                if (j == 0)
                {
                    record.TaxAmtTot00 = det.TaxAmt;
                    record.TaxID00 = det.TaxID;
                }
                else if (j == 1)
                {
                    record.TaxAmtTot01 = det.TaxAmt;
                    record.TaxID01 = det.TaxID;
                }
                else if (j == 2)
                {
                    record.TaxAmtTot02 = det.TaxAmt;
                    record.TaxID02 = det.TaxID;
                }
                else if (j == 3)
                {
                    record.TaxAmtTot03 = det.TaxAmt;
                    record.TaxID03 = det.TaxID;
                }
            };

            record.TxblAmtTot00 = txblAmtTot00;
            record.TxblAmtTot01 = txblAmtTot01;
            record.TxblAmtTot02 = txblAmtTot02;
            record.TxblAmtTot03 = txblAmtTot03;

            txblAmtTot = txblAmtTot00 + txblAmtTot01 + txblAmtTot02 + txblAmtTot03;
            taxAmt = record.TaxAmtTot00 + record.TaxAmtTot01 + record.TaxAmtTot02 + record.TaxAmtTot03;
            _poHead.TotAmt = Math.Round(taxAmt, 0, MidpointRounding.AwayFromZero) + Math.Round(txblAmtTot, 0, MidpointRounding.AwayFromZero) + Math.Round(poFee, 0, MidpointRounding.AwayFromZero);
            _poHead.RcptTotAmt = (Math.Round(taxAmt, 0, MidpointRounding.AwayFromZero) + Math.Round(txblAmtTot, 0, MidpointRounding.AwayFromZero) + Math.Round(poFee, 0, MidpointRounding.AwayFromZero));
            _poHead.RcptQtyTot = Math.Round(qty, 0, MidpointRounding.AwayFromZero);
            _poHead.DiscAmt = Math.Round(discount, 0, MidpointRounding.AwayFromZero);
            _poHead.RcptTot = Math.Round(extCost, 0, MidpointRounding.AwayFromZero);
            _poHead.RcptFeeTot = Math.Round(poFee, 0, MidpointRounding.AwayFromZero);
        }
        #endregion

        #region -Save OM20500-
        [HttpPost]
        public ActionResult SaveOM20500(string branchID, string custID, string branchIDMap, string orderNbr, string origOrderNbr, bool addDocDiscAmt)
        {
            try
            {
                _screenNbr = "OM20500";
                string proJect = "";
                var objConfig = _db.PO10200_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (objConfig != null)
                {
                    proJect = objConfig.Project ?? "";
                }
                if (proJect == "PT")
                {
                    _branchID = branchID;
                }
                else
                {
                    _branchID = custID;
                }

                _handle = "N";
                _objPO_Setup = _db.PO10200_pdPO_Setup(_branchID, "PO").FirstOrDefault();

                _poHead = new PO10200_pdHeader_Result();
                _lstPOTrans = new List<PO10200_pgDetail_Result>();
                _lstLot = new List<PO10200_pgLotTrans_Result>();
                _lstSiteAll = _db.PO10200_pcSiteAll(_branchID).ToList();
                var objHeader = _db.PO10200_pdApprovalOrder(orderNbr, origOrderNbr, branchID, proJect, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                _batNbr = objHeader.BatNbr.PassNull();
                _rcptNbr = objHeader.RcptNbr.PassNull();
                var docDiscAmt = 0.0;

                #region -Add header-
                _poHead.APBatNbr = objHeader.APBatNbr;
                _poHead.APRefNbr = objHeader.APRefNbr;
                _poHead.BatNbr = objHeader.BatNbr;
                _poHead.Descr = objHeader.Descr;
                _poHead.DiscAmt = objHeader.DiscAmt.Value;
                _poHead.DiscAmtPct = objHeader.DiscAmtPct.Value;
                _poHead.DocDate = objHeader.DocDate;
                _poHead.DocDiscAmt = 0;
                _poHead.DocType = objHeader.DocType;
                _poHead.InvcDate = objHeader.InvcDate;
                _poHead.InvcNbr = objHeader.InvcNbr;
                _poHead.InvcNote = objHeader.InvcNote;
                _poHead.NoteID = objHeader.NoteID;
                _poHead.PerPost = objHeader.PerPost;
                _poHead.PONbr = objHeader.PONbr;
                _poHead.RcptDate = objHeader.RcptDate;
                _poHead.RcptFeeTot = objHeader.RcptFeeTot.Value;
                _poHead.RcptFrom = objHeader.RcptFrom;
                _poHead.RcptNbr = objHeader.RcptNbr;
                _poHead.RcptQtyTot = objHeader.RcptQtyTot;
                _poHead.RcptTot = objHeader.RcptTot;
                _poHead.RcptTotAmt = objHeader.RcptTotAmt;
                _poHead.RcptType = objHeader.RcptType;
                _poHead.RefNbr = objHeader.RefNbr;
                _poHead.Status = objHeader.Status;
                _poHead.TaxAmtTot00 = objHeader.TaxAmtTot00;
                _poHead.TaxAmtTot01 = objHeader.TaxAmtTot01;
                _poHead.TaxAmtTot02 = objHeader.TaxAmtTot02;
                _poHead.TaxAmtTot03 = objHeader.TaxAmtTot03;
                _poHead.TaxID00 = objHeader.TaxID00;
                _poHead.TaxID01 = objHeader.TaxID01;
                _poHead.TaxID02 = objHeader.TaxID02;
                _poHead.TaxID03 = objHeader.TaxID03;
                _poHead.Terms = objHeader.Terms;
                _poHead.TotAmt = objHeader.TotAmt;
                _poHead.TxblAmtTot00 = objHeader.TxblAmtTot00;
                _poHead.TxblAmtTot01 = objHeader.TxblAmtTot01;
                _poHead.TxblAmtTot02 = objHeader.TxblAmtTot02;
                _poHead.TxblAmtTot03 = objHeader.TxblAmtTot03;
                _poHead.VendID = objHeader.VendID;
                _poHead.VouchStage = objHeader.VouchStage;
                _poHead.POType = string.Empty;
                _status = objHeader.Status;
                #endregion

                _lstVendTaxes = _db.PO10200_pdAP_VenDorTaxes(_poHead.VendID, "").ToList();
                if (addDocDiscAmt)
                {
                    _poHead.DocDiscAmt = objHeader.DocDiscount;
                    docDiscAmt = objHeader.DocDiscount;
                }
                var lstDet = _db.PO10200_pdApprovalOrderDet(orderNbr, origOrderNbr, branchID, branchIDMap, proJect, docDiscAmt, Current.UserName, Current.CpnyID, Current.LangID);

                if (proJect == "PT")
                {
                    var lstLot = _db.PO10200_pdGetPo_LotTrans(orderNbr, origOrderNbr, branchID, branchIDMap, proJect, Current.UserName, Current.CpnyID, Current.LangID).ToList();

                    foreach (var item in lstLot)
                    {
                        #region -Add detail-
                        var objlot = new PO10200_pgLotTrans_Result();
                        objlot.ResetET();
                        objlot.InvtID = item.InvtID;
                        objlot.POTranLineRef = item.POTranLineRef.PassNull();
                        objlot.KitID = item.KitID;
                        objlot.LotSerNbr = item.LotSerNbr;
                        objlot.ExpDate = item.ExpDate;
                        objlot.InvtMult = item.InvtMult;
                        objlot.MfgrLotSerNbr = item.MfgrLotSerNbr;
                        objlot.Qty = item.Qty;
                        objlot.SiteID = item.SiteID;
                        objlot.ToSiteID = item.ToSiteID;
                        objlot.WhseLoc = item.WhseLoc;
                        objlot.TranDate = item.TranDate;
                        objlot.TranType = item.TranType;
                        objlot.TranScr = item.TranScr;
                        objlot.UnitCost = item.UnitCost;
                        objlot.UnitDesc = item.UnitDesc;
                        objlot.UnitMultDiv = item.UnitMultDiv;
                        objlot.UnitPrice = item.UnitPrice;
                        objlot.WarrantyDate = item.WarrantyDate;
                        objlot.MfcDate = item.MfcDate;
                        objlot.CnvFact = item.CnvFact;
                        _lstLot.Add(objlot);

                        #endregion
                    }
                }
                foreach (var it in lstDet)
                {
                    #region -Add detail-
                    // calc tax
                    if (proJect == "PT")
                    {
                        var objSI_Tax = _db.SI_Tax.FirstOrDefault(p => p.TaxID == it.TaxID && p.PrcTaxIncl == "1");
                        var obj = new PO10200_pgDetail_Result();
                        obj.BatNbr = it.BatNbr;
                        obj.BranchID = _branchID;
                        obj.ClassID = it.ClassID;
                        obj.CnvFact = it.CnvFact;
                        obj.CostID = it.CostID;
                        obj.CostVouched = it.CostVouched.Value;
                        obj.DiscCode = it.DiscCode;
                        obj.DiscPct = it.DiscPct;
                        obj.DocDiscAmt = it.DocDiscAmt;
                        obj.ExtVolume = it.ExtVolume;
                        obj.ExtWeight = it.ExtWeight;
                        obj.InvtID = it.InvtID;
                        obj.JrnlType = it.JrnlType;
                        obj.LineRef = it.LineRef;
                        obj.OrigRcptDate = it.OrigRcptDate.Value;
                        obj.OrigRcptNbr = it.OrigRcptNbr;
                        obj.OrigRetRcptNbr = it.OrigRetRcptNbr;
                        obj.POLineRef = it.POLineRef;
                        obj.PONbr = it.PONbr;
                        obj.POOriginal = it.POOriginal;
                        obj.PosmID = it.PosmID;
                        obj.PurchaseType = it.PurchaseType;
                        obj.Qty = it.Qty;
                        obj.QtyVouched = it.QtyVouched.Value;
                        obj.RcptConvFact = it.RcptConvFact;
                        obj.RcptDate = it.RcptDate.Value;
                        obj.RcptFee = it.RcptFee.Value;
                        obj.RcptMultDiv = it.RcptMultDiv;
                        obj.RcptNbr = it.RcptNbr;
                        obj.RcptQty = it.RcptQty;
                        obj.RcptUnitDescr = it.RcptUnitDescr;
                        obj.ReasonCD = it.ReasonCD;
                        obj.SiteID = it.SiteID;
                        obj.WhseLoc = it.WhseLoc;
                        obj.TaxAmt00 = it.TaxAmt00;
                        obj.TaxAmt01 = it.TaxAmt01;
                        obj.TaxAmt02 = it.TaxAmt02;
                        obj.TaxAmt03 = it.TaxAmt03;
                        obj.TaxCat = it.TaxCat;
                        obj.TaxID = it.TaxID;
                        obj.TaxID00 = it.TaxID00;
                        obj.TaxID01 = it.TaxID01;
                        obj.TaxID02 = it.TaxID02;
                        obj.TaxID03 = it.TaxID03;
                        obj.TranDate = it.TranDate.Value;
                        obj.TranDesc = it.TranDesc;
                        obj.TranType = it.TranType;
                        obj.TxblAmt00 = it.TxblAmt00;
                        obj.TxblAmt01 = it.TxblAmt01;
                        obj.TxblAmt02 = it.TxblAmt02;
                        obj.TxblAmt03 = it.TxblAmt03;
                        obj.UnitDescr = it.UnitDescr;
                        obj.UnitMultDiv = it.UnitMultDiv;
                        obj.UnitVolume = it.UnitVolume;
                        obj.UnitWeight = it.UnitWeight;
                        obj.VendID = it.VendID;
                        obj.VouchStage = it.VouchStage;
                        obj.DiscID = it.PODiscID;
                        obj.DiscSeq = it.PODiscSeq;
                        obj.FromPO10200 = false;
                        obj.PONbr = _poHead.PONbr;
                        obj.QtyFromOM = it.RcptQty;
                        if (objSI_Tax != null)
                        {
                            obj.TranAmt = it.TxblAmt00 + it.TaxAmt00;
                            obj.UnitCost = (it.TxblAmt00 + it.TaxAmt00) / it.LineQty;
                        }
                        else
                        {
                            obj.TranAmt = it.LineAmt;
                            obj.UnitCost = it.SlsPrice;
                        }
                        _lstPOTrans.Add(obj);
                    }
                    else
                    {
                        var obj = new PO10200_pgDetail_Result();
                        obj.BatNbr = it.BatNbr;
                        obj.BranchID = _branchID;
                        obj.ClassID = it.ClassID;
                        obj.CnvFact = it.CnvFact;
                        obj.CostID = it.CostID;
                        obj.CostVouched = it.CostVouched.Value;
                        obj.DiscCode = it.DiscCode;
                        obj.DiscPct = it.DiscPct;
                        obj.DocDiscAmt = it.DocDiscAmt;
                        obj.ExtVolume = it.ExtVolume;
                        obj.ExtWeight = it.ExtWeight;
                        obj.InvtID = it.InvtID;
                        obj.JrnlType = it.JrnlType;
                        obj.LineRef = it.LineRef;
                        obj.OrigRcptDate = it.OrigRcptDate.Value;
                        obj.OrigRcptNbr = it.OrigRcptNbr;
                        obj.OrigRetRcptNbr = it.OrigRetRcptNbr;
                        obj.POLineRef = it.POLineRef;
                        obj.PONbr = it.PONbr;
                        obj.POOriginal = it.POOriginal;
                        obj.PosmID = it.PosmID;
                        obj.PurchaseType = it.PurchaseType;
                        obj.Qty = it.Qty;
                        obj.QtyVouched = it.QtyVouched.Value;
                        obj.RcptConvFact = it.RcptConvFact;
                        obj.RcptDate = it.RcptDate.Value;
                        obj.RcptFee = it.RcptFee.Value;
                        obj.RcptMultDiv = it.RcptMultDiv;
                        obj.RcptNbr = it.RcptNbr;
                        obj.RcptQty = it.RcptQty;
                        obj.RcptUnitDescr = it.RcptUnitDescr;
                        obj.ReasonCD = it.ReasonCD;
                        obj.SiteID = it.SiteID;
                        obj.WhseLoc = it.WhseLoc;
                        obj.TaxAmt00 = it.TaxAmt00;
                        obj.TaxAmt01 = it.TaxAmt01;
                        obj.TaxAmt02 = it.TaxAmt02;
                        obj.TaxAmt03 = it.TaxAmt03;
                        obj.TaxCat = it.TaxCat;
                        obj.TaxID = it.TaxID;
                        obj.TaxID00 = it.TaxID00;
                        obj.TaxID01 = it.TaxID01;
                        obj.TaxID02 = it.TaxID02;
                        obj.TaxID03 = it.TaxID03;
                        obj.TranAmt = it.TranAmt;
                        obj.TranDate = it.TranDate.Value;
                        obj.TranDesc = it.TranDesc;
                        obj.TranType = it.TranType;
                        obj.TxblAmt00 = it.TxblAmt00;
                        obj.TxblAmt01 = it.TxblAmt01;
                        obj.TxblAmt02 = it.TxblAmt02;
                        obj.TxblAmt03 = it.TxblAmt03;
                        obj.UnitCost = it.UnitCost;
                        obj.UnitDescr = it.UnitDescr;
                        obj.UnitMultDiv = it.UnitMultDiv;
                        obj.UnitVolume = it.UnitVolume;
                        obj.UnitWeight = it.UnitWeight;
                        obj.VendID = it.VendID;
                        obj.VouchStage = it.VouchStage;
                        obj.DiscID = it.PODiscID;
                        obj.DiscSeq = it.PODiscSeq;
                        obj.FromPO10200 = false;
                        obj.PONbr = _poHead.PONbr;
                        obj.QtyFromOM = it.RcptQty;
                        _lstPOTrans.Add(obj);
                        delTax(ref obj);
                        calcTax(ref obj);
                        calcTaxTotal();
                    }

                    #endregion
                }
                _origOrderNbr = origOrderNbr;
                _poReceiptDescr = "PO Receipt from OM20500";
                Save_Batch();

                #region -Release-
                #endregion

                if (_logMessage != null)
                {
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Save, new { batNbr = _batNbr });

            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }
        #endregion
    }
}
