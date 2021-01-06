using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Ext.Net;
using Ext.Net.MVC;
using HQ.eSkyFramework;
using HQ.eSkySys;
using System.Xml;
using System.Xml.Linq;
using System.Data.Objects;
using Aspose.Cells;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using PartialViewResult = System.Web.Mvc.PartialViewResult;
using System.Data;
using System.Drawing;
using HQFramework.DAL;
using System.Dynamic;
using HQFramework.Common;
using System.Globalization;
namespace OM10100.Controllers
{
    [DirectController]
    [CustomAuthorize]
    [CheckSessionOut]
    public partial class OM10100Controller : Controller
    {        
        #region -Declare-
        const string Channel = "CT"; // Kênh, cho Chứng Từ
        const string CustCate = "CL"; // Loại KH, cho Chứng Từ
        // Áp dụng cho dòng + Nhóm
        const string GItemChannel = "GC"; // Nhóm mặt hàng Channel
        const string ItemChannel = "IC"; // Mặt hàng Channel
        const string ItemCustCate = "GI"; // Mặt Hàng + Loại KH
        const string GItemCustCate = "GP"; // Nhóm MH + Loại KH 
        const string RequiredTypeQ = "Q"; // Dùng cho KEM, Kiểm tra số lượng tối thiểu
        const string RequiredTypeN = "N"; // Kiểm tra Số lượng tối thiểu
        const string RequiredTypeA = "A"; // Kiểm tra số tiền tối thiểu

        private List<DiscountChoice> _lstChoice;
        private string _screenNbr = "OM10100";
        private OM10100Entities _app = Util.CreateObjectContext<OM10100Entities>(false);
        private eSkySysEntities _sys = Util.CreateObjectContext<eSkySysEntities>(true);
        private FormCollection _form;
        private JsonResult _logMessage;
        private List<OM10100_pgOrderDet_Result> _lstOrdDet;
        private List<OM10100_pgOrderDet_Result> _lstOldOrdDet;
        private List<OM_LotTrans> _lstLot;
        private List<OM10100_pgTaxTrans_Result> _lstTax;
        private List<OM10100_pgTaxTrans_Result> _lstTaxDoc = new List<OM10100_pgTaxTrans_Result>();
        private List<OM10100_pdGetDiscSeq_Result> _lstSeqV2;
        private List<OM_OrdDisc> _lstDisc;
        private List<OM_OrdManualDisc> _lstManualDisc;
        private List<OM10100_pgManualPromo_Result> _lstSaveManualDisc;
        private List<OM10100_pgGift_Result> _lstGift;
        private List<OM10100_pdSOPrice_Result> _lstPrice;
        private List<OM_OrdDisc> _lstBKDisc;
        private OM10100_pcOrder_Result _objOrder;
        private OM_Setup _objOM;
        private IN_Setup _objIN;
        private OM10100_pdOM_UserDefault_Result _objUser;
        private OM_OrderType _objType;
        private AR_Customer _objCust;
        private AR_SOAddress _objAddress;
        private string _handle;
        private bool _isDelete;
        private string _discLineRef;
        private string _lineRef;
        private double _docDiscAmt;
        private bool _choice = false;
        int _decimalPlaces = 2;
        
        private int _calcPromoOnly = 0; // 0: Duyệt sang C , 1,2 duyệt ko sang C, 3. không tạo số hóa đơn từ OM20500 đẩy sang W
        private List<OM_PDASalesOrd> _lstOrderImp = new List<OM_PDASalesOrd>();
        private List<OM_PDASalesOrdDet> _lstOrderDetImp = new List<OM_PDASalesOrdDet>();
        private List<OM_OrdDisc> _lstOM_OrdDiscOld = new List<OM_OrdDisc>();
        private bool isShowMess2017032201 = false;//true là kiểm tra ngân sách show mess 2017032201,false là ko kiểm tra
        private string _messBudget = "";
        private string _messSite = string.Empty;
        private List<string> _messMinPrice = new List<string>();
        private List<OM10100_pdGetMaxLotByCustomer_Result> _lstMaxLot = new List<OM10100_pdGetMaxLotByCustomer_Result>();
        OM10100_pdGetMaxLotByCustomer_Result _objMaxLot;
        List<OM10100_pgOrdDiscDetail_Result> _lstOrdDiscDetail = new List<OM10100_pgOrdDiscDetail_Result>();
        bool _approvalAll = false;
        private List<string> _lstExcludeDisccount = new List<string>();
        Dictionary<string, double> _lstFreeQtyAvail = new Dictionary<string, double>();
        
        private string _applyDetailLineRef = "00001";
        string _messDisplayID = string.Empty;
        Dictionary<string, double> _lstFreeItemQtyAvail = new Dictionary<string, double>();
        Dictionary<string, double> _lstFreeItemQtyAvailUsed = new Dictionary<string, double>();
        List<OM_PPAlloc> _lstAlloc = new List<OM_PPAlloc>();
        List<OM_PPCpny> _lstCpnyID = new List<OM_PPCpny>();
        public int _budgetStatus = 0; // 0: budget OK, 1: not enought budget, 2: confirm Save 
        public string _outOfManualFreeItemSite = string.Empty;
        private bool _isNotEnoughBudgetOrSite = false;
        public string _outOfFreeItemSite = string.Empty;
        public string _outOfFreeBudget = string.Empty;
        public bool _qtyChange = false;
        public List<string> _lstBreakActive = new List<string>();
        double _qtyAvailPopup = 0;
        #endregion

        #region Action
        public ActionResult Index(string branchID)
        {
            LicenseHelper.ModifyInMemory.ActivateMemoryPatching();
            Util.InitRight(_screenNbr);
            var user = _sys.Users.FirstOrDefault(p => p.UserName == Current.UserName);
            if (branchID == null && user != null && user.CpnyID.PassNull().Split(',').Length > 1)
            {
                return View("Popup");
            }
            if (branchID == null)
            {
                branchID = Current.CpnyID;
            }
            var allowImport = false;
            var deleteRow = 0;
            var isNewBackOrder = false;
            var confirmReturnSalesOrder = false;
            var showLTTContractNbr = false;
            var showCreditHold = false;
            var showDocBal = false;
            var objConfig = _app.OM10100_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (objConfig != null)
            {
                // allowImport =  objConfig.AllowImport.HasValue ? objConfig.AllowImport.Value : false;
                deleteRow = objConfig.DeleteRow;
                isNewBackOrder = objConfig.IsNewBackOrder ?? false;
                confirmReturnSalesOrder = objConfig.ConfirmReturnSalesOrder ?? false;
                showLTTContractNbr = objConfig.ShowLTTContractNbr ?? false;
                showCreditHold = objConfig.ShowCreditHold ?? false;
                showDocBal = objConfig.ShowDocBal ?? false;
            }
            ViewBag.BranchID = branchID;
            ViewBag.AllowImport = allowImport;
            ViewBag.DeleteRow = deleteRow;
            ViewBag.IsNewBackOrder = isNewBackOrder;
            ViewBag.BussinessDate = DateTime.Now.ToDateShort();
            ViewBag.BussinessTime = DateTime.Now;
            ViewBag.IsShowMess = confirmReturnSalesOrder;
            ViewBag.ShowLTTContractNbr = showLTTContractNbr;
            ViewBag.ShowCreditHold = showCreditHold;
            ViewBag.ShowDocBal = showDocBal;
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
        [HttpPost]
        public ActionResult Save(FormCollection data, bool qtyChange = false)
        {
            try
            {
                _qtyChange = qtyChange;
                PreSaveData(data);

                if (_logMessage != null)
                {
                    if (_objOrder.OrderNbr.PassNull() != string.Empty)
                    {
                        _logMessage.Data = new
                        {
                            code = _logMessage.Data.GetType().GetProperty("code").GetValue(_logMessage.Data, null),
                            parm = _logMessage.Data.GetType().GetProperty("parm").GetValue(_logMessage.Data, null),
                            fn = _logMessage.Data.GetType().GetProperty("fn").GetValue(_logMessage.Data, null),
                            errorMsg = _logMessage.Data.GetType().GetProperty("errorMsg").GetValue(_logMessage.Data, null),
                            success = true,
                            type = _logMessage.Data.GetType().GetProperty("type").GetValue(_logMessage.Data, null),
                            data = new { orderNbr = _objOrder.OrderNbr },
                            messBudget = _messBudget.TrimEnd(','),
                            messSite = _messSite.TrimEnd(',')
                        };
                    }
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Save, new
                {
                    orderNbr = _objOrder.OrderNbr,
                    messBudget = _messBudget.TrimEnd(','),
                    messSite = _messSite.TrimEnd(','),
                    messError = GetMessError()
                });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                if (_choice || ex.Message == "Choice")
                {
                    return _logMessage;
                }
                if (ex is OptimisticConcurrencyException)
                {
                    return (new MessageException(MessageType.Message, "2016060101")).ToMessage();
                }
                return Util.CreateError(ex.ToString());
            }
        }
        [HttpPost]
        public ActionResult SaveOM20500(string branchID, string orderNbr, List<DiscountChoice> choice, int calcPromoOnly, bool approvalAll, string orderType, bool qtyChange)
        {
            try
            {
                _qtyChange = qtyChange;
                _calcPromoOnly = calcPromoOnly;
                _approvalAll = approvalAll;

                _app.CommandTimeout = int.MaxValue;
                _screenNbr = "OM20500";
                _objOrder = _app.OM10100_pcOrder(branchID, orderType, orderNbr, 1, 1, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                _handle = "N";
                _lstOrdDet = _app.OM10100_pgOrderDet(branchID, orderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();
                _lstLot = _app.OM_LotTrans.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();
                _lstTax = _app.OM10100_pgTaxTrans(branchID, orderNbr).ToList();
                _lstDisc = _app.OM_OrdDisc.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();
                _lstGift = _app.OM10100_pgGift(branchID, orderNbr).ToList();
                _lstOldOrdDet = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();
                _lstChoice = choice;
                _lstTaxDoc = new List<OM10100_pgTaxTrans_Result>();
                SaveData(true);

                if (_logMessage != null)
                {
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Save, new { orderNbr = _objOrder.OrderNbr });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                if (_choice || ex.Message == "Choice" || _calcPromoOnly != 0 || ex.Message == "Budget")
                {
                    return _logMessage;
                }
                if (ex is OptimisticConcurrencyException)
                {
                    return (new MessageException(MessageType.Message, "2016060101")).ToMessage();
                }
                return Util.CreateError(ex.ToString());
            }
        }
        private bool AddToOM_LotTrans(List<OM_PDASalesOrdDet> lstPDADet,string dfltSalesPrice, OM_PDASalesOrd objPDAOrd)
        {
            DateTime orderDate = objPDAOrd.OrderDate;
            foreach (var item in lstPDADet)
            {
                if (item.FreeItem == false || item.DiscCode != string.Empty || item.DisplayID != string.Empty)
                {
                    var dtItemLot = _app.OMProcess_pdItemLot(item.InvtID, item.SiteID, "").ToList();

                    var objInvt = _app.IN_Inventory.FirstOrDefault(p => p.InvtID == item.InvtID);
                    double needQty = item.UnitMultDiv == "M" ? item.LineQty * item.UnitRate : item.LineQty / item.UnitRate;
                    foreach (var lotRow in dtItemLot)
                    {

                        double newQty = 0;
                        //objPDALotTrans = new clsOM_PDALotTrans(Dal);
                        var objItemLot = _app.IN_ItemLot.FirstOrDefault(p => p.SiteID == item.SiteID && p.InvtID == item.InvtID && p.WhseLoc == lotRow.WhseLoc && p.LotSerNbr == lotRow.LotSerNbr);
                        if (objItemLot != null)
                        {
                            if (objItemLot.QtyAvail >= needQty)
                            {
                                newQty = needQty;
                                objItemLot.QtyAvail = objItemLot.QtyAvail - needQty;
                                objItemLot.QtyAllocSO = objItemLot.QtyAllocSO + needQty;
                                needQty = 0;
                            }
                            else
                            {
                                newQty = objItemLot.QtyAvail;
                                needQty -= objItemLot.QtyAvail;
                                objItemLot.QtyAvail = 0;
                                objItemLot.QtyAllocSO = objItemLot.QtyAllocSO + newQty;
                            }
                            objItemLot.LUpd_DateTime = DateTime.Now;
                            objItemLot.LUpd_Prog = _screenNbr;
                            objItemLot.LUpd_User = Current.UserName;

                            var objLotTrans = new OM_LotTrans();
                            if (newQty != 0)
                            {
                                objLotTrans.ResetET();
                                objLotTrans.BranchID = item.BranchID;
                                objLotTrans.OrderNbr = "";
                                objLotTrans.LotSerNbr = lotRow.LotSerNbr;
                                objLotTrans.ExpDate = lotRow.ExpDate;
                                objLotTrans.MfgrLotSerNbr = lotRow.MfgrLotSerNbr;
                                objLotTrans.WarrantyDate = lotRow.WarrantyDate;
                                objLotTrans.TranDate = orderDate;
                                objLotTrans.INDocType = "IN";
                                objLotTrans.OMLineRef = item.LineRef;
                                objLotTrans.SiteID = item.SiteID;
                                objLotTrans.WhseLoc = item.WhseLoc.PassNull();
                                objLotTrans.InvtID = item.InvtID;
                                if (_objType.INDocType == "IN" || _objType.INDocType == "DM")
                                {
                                    objLotTrans.InvtMult = -1;
                                }
                                else if (_objType.INDocType == "CM")
                                {
                                    objLotTrans.InvtMult = 1;
                                }
                                else
                                {
                                    objLotTrans.InvtMult = 0;
                                }
                                if ((item.UnitMultDiv == "M" ? newQty / item.UnitRate : newQty * item.UnitRate) % 1 > 0)
                                {
                                    objLotTrans.CnvFact = 1;
                                    objLotTrans.UnitMultDiv = "M";
                                    objLotTrans.Qty = newQty;
                                    objLotTrans.UnitDesc = objInvt.StkUnit;
                                    if (dfltSalesPrice == "I")
                                    {
                                        double price = Math.Round(objLotTrans.UnitMultDiv == "M" ? objInvt.SOPrice * objLotTrans.CnvFact : objInvt.SOPrice / objLotTrans.CnvFact, 0);
                                        objLotTrans.UnitPrice = price;
                                        objLotTrans.UnitCost = price;
                                    }
                                    else
                                    {
                                        objLotTrans.UnitPrice = Math.Round(item.UnitMultDiv == "M" ? item.SlsPrice / item.UnitRate : item.SlsPrice * item.UnitRate, 0);
                                        objLotTrans.UnitCost = objLotTrans.UnitPrice;
                                    }
                                }
                                else
                                {
                                    objLotTrans.Qty = Math.Round(item.UnitMultDiv == "M" ? newQty / item.UnitRate : newQty * item.UnitRate, 0);
                                    objLotTrans.CnvFact = item.UnitRate;
                                    objLotTrans.UnitMultDiv = item.UnitMultDiv;
                                    objLotTrans.UnitPrice = item.SlsPrice;
                                    objLotTrans.UnitCost = item.SlsPrice;
                                    objLotTrans.UnitDesc = item.SlsUnit;
                                }
                                objLotTrans.LUpd_DateTime = objLotTrans.Crtd_DateTime = DateTime.Now;
                                objLotTrans.LUpd_Prog = objLotTrans.Crtd_Prog = _screenNbr;
                                objLotTrans.LUpd_User = objLotTrans.Crtd_User = Current.UserName;
                                _lstLot.Add(objLotTrans);
                            }
                        }
                        if (needQty == 0)
                        {
                            break;
                        }
                    }
                }
                
            }            
            return true;
        }
        [HttpPost]
        public ActionResult SaveOM20500ToW(OM10100_pcOrder_Result obj, List<OM10100_pgOrderDet_Result> lstOrdDet, List<DiscountChoice> choice, int calcPromoOnly, bool approvalAll, bool qtyChange)
        {
            try
            {
                _qtyChange = qtyChange;
                _calcPromoOnly = calcPromoOnly;
                _approvalAll = approvalAll;

                _app.CommandTimeout = int.MaxValue;
                _screenNbr = "OM20500";
                _objOM = _app.OM_Setup.FirstOrDefault();
                if (_objOM == null)
                {
                    throw new MessageException("20404", new string[] { "OM_Setup" });
                }
                _objOrder = obj;
                _handle = "N";
                _lstOrdDet = lstOrdDet;
                var lstDet = _app.OM_PDASalesOrdDet.Where(p => p.BranchID == obj.BranchID && p.OrderNbr == obj.OrigOrderNbr).ToList();
                var lstHeader = _app.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == obj.BranchID && p.OrderNbr == obj.OrigOrderNbr);
                _lstLot = new List<OM_LotTrans>();
                AddToOM_LotTrans(lstDet, _objOM.DfltSalesPrice, lstHeader);
                
                //_lstLot = _app.OM_LotTrans.Where(p => p.BranchID == obj.BranchID && p.OrderNbr == "").ToList();
                _lstTax = _app.OM10100_pgTaxTrans(obj.BranchID, "").ToList();
                _lstDisc = _app.OM_OrdDisc.Where(p => p.BranchID == obj.BranchID && p.OrderNbr == "").ToList();
                _lstGift = _app.OM10100_pgGift(obj.BranchID, "").ToList();
                _lstOldOrdDet = lstOrdDet;
                _lstChoice = choice;
                _lstTaxDoc = new List<OM10100_pgTaxTrans_Result>();
                SaveData(true);

                if (_logMessage != null)
                {
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Save, new { orderNbr = _objOrder.OrderNbr });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                if (_choice || ex.Message == "Choice" || _calcPromoOnly != 0 || ex.Message == "Budget")
                {
                    return _logMessage;
                }
                if (ex is OptimisticConcurrencyException)
                {
                    return (new MessageException(MessageType.Message, "2016060101")).ToMessage();
                }
                return Util.CreateError(ex.ToString());
            }
        }

        [HttpPost]
        public ActionResult Delete(FormCollection data)
        {
            try
            {
                _form = data;
                _objOrder = data.ConvertToObject<OM10100_pcOrder_Result>(false, new string[] { "DoNotCalDisc", "CreditHold" });
                _objOrder.DoNotCalDisc = (data["DoNotCalDisc"].PassNull() != string.Empty ? 1 : 0).ToShort();
                _objOrder.CreditHold = (data["CreditHold"].PassNull() != string.Empty ? 1 : 0).ToBool();
                CheckCloseDate(_objOrder.Status, _objOrder.Status, false);
                DeleteOrder(false);

                if (_logMessage != null)
                {
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Delete);
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
        public ActionResult DeleteOM20500(string branchID, string orderNbr, int calcPromo, string messDisplayID, bool isNotEnoughBudgetOrSite, string orderType = "")
        {
            try
            {
                _app.CommandTimeout = int.MaxValue;
                _screenNbr = "OM20500";
                _calcPromoOnly = calcPromo;
                _objOrder = _app.OM10100_pcOrder(branchID, orderType, orderNbr, 1, 1, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                _messDisplayID = messDisplayID;
                _isNotEnoughBudgetOrSite = isNotEnoughBudgetOrSite;
                DeleteOrder(true);

                if (_logMessage != null)
                {
                    return _logMessage;
                }
                return Util.CreateMessage(MessageProcess.Delete);
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
        public ActionResult DeleteDet(FormCollection data, bool isDelPromo)
        {
            try
            {
                _isDelete = true;
                var access = Session["OM10100"] as AccessRight;

                var detHandler = new StoreDataHandler(data["lstOrdDet"]);
                _lstOrdDet = detHandler.ObjectData<OM10100_pgOrderDet_Result>().Where(p => Util.PassNull(p.LineRef) != string.Empty && p.InvtID.PassNull() != string.Empty).ToList();

                var lotHandler = new StoreDataHandler(data["lstLot"]);
                _lstLot = lotHandler.ObjectData<OM_LotTrans>().Where(p => Util.PassNull(p.OMLineRef) != string.Empty && p.InvtID.PassNull() != string.Empty && p.LotSerNbr.PassNull() != string.Empty).ToList();

                _objOrder = data.ConvertToObject<OM10100_pcOrder_Result>(false, new string[] { "DoNotCalDisc", "CreditHold" });

                string lineRef = Util.PassNull(data["LineRef"]);
                OM_SalesOrdDet det = _app.OM_SalesOrdDet.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr && p.LineRef == lineRef);

                var taxHandler = new StoreDataHandler(data["lstTax"]);
                _lstTax = taxHandler.ObjectData<OM10100_pgTaxTrans_Result>().ToList();

                var discHandler = new StoreDataHandler(data["lstDisc"]);
                _lstDisc = discHandler.ObjectData<OM_OrdDisc>().ToList();

                _objOrder.DoNotCalDisc = (data["DoNotCalDisc"].PassNull() != string.Empty ? 1 : 0).ToShort();
                _objOrder.CreditHold = (data["CreditHold"].PassNull() != string.Empty ? 1 : 0).ToBool();
                CheckCloseDate(_objOrder.Status, _objOrder.Status, false);
                _lstOldOrdDet = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();

                GetSetup();
                string intvtDis = "";
                foreach (var item in _lstOldOrdDet)
                {
                    intvtDis += item.InvtID + ",";
                }
                _lstSeqV2 = _app.OM10100_pdGetDiscSeq(_objOrder.BranchID, _objOrder.OrderDate, _objOrder.CustID, _objOrder.ClassID, _objOrder.PriceClassID, _objOrder.SlsPerID, intvtDis, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                int indexDet = -1;
                for (int i = 0; i < _lstOrdDet.Count; i++)
                {
                    if (_lstOrdDet[i].LineRef == lineRef)
                    {
                        indexDet = i;
                        break;
                    }
                }

                Delete_Det(data["LineRef"]);
                if (indexDet == -1)
                {
                    return Json(new { success = true }, JsonRequestBehavior.AllowGet);
                }
                DelTax(indexDet);
                foreach (OM_OrdDisc disc in _lstDisc)
                {
                    if (_lstOrdDet[indexDet].FreeItem && Util.PassNull(_lstOrdDet[indexDet].DiscID1) != string.Empty &&
                        disc.FreeItemID == _lstOrdDet[indexDet].InvtID && disc.SOLineRef == _lstOrdDet[indexDet].LineRef)
                    {
                        disc.FreeItemID = disc.FreeItemID + "_D";
                        disc.FreeItemQty = 0;
                        disc.UserOperationLog = "User Deleted Free Item";
                    }
                }
                _lstOrdDet.RemoveAt(indexDet);
                if (isDelPromo)
                {
                    indexDet = -1;
                    for (int i = _lstOrdDet.Count - 1; i >= 0; i--)
                    {
                        indexDet = -1;
                        if (_lstOrdDet[i].FreeItem && _lstOrdDet[i].DiscCode.PassNull() == string.Empty && _lstOrdDet[i].DisplayID.PassNull() == string.Empty)
                        {
                            indexDet = i;
                            Delete_Det(_lstOrdDet[i].LineRef);
                            if (indexDet == -1)
                            {
                                continue;
                            }
                            DelTax(indexDet);
                            foreach (OM_OrdDisc disc in _lstDisc)
                            {
                                if (_lstOrdDet[indexDet].FreeItem && Util.PassNull(_lstOrdDet[indexDet].DiscID1) != string.Empty &&
                                    disc.FreeItemID == _lstOrdDet[indexDet].InvtID && disc.SOLineRef == _lstOrdDet[indexDet].LineRef)
                                {
                                    disc.FreeItemID = disc.FreeItemID + "_D";
                                    disc.FreeItemQty = 0;
                                    disc.UserOperationLog = "User Deleted Free Item";
                                }
                            }
                            _lstOrdDet.RemoveAt(indexDet);
                        }
                    }
                }
                CalcDet();
                CalcTaxTotal();

                PreSaveData(data);

                if (_logMessage != null)
                {
                    return _logMessage;
                }

                return Util.CreateMessage(MessageProcess.Delete, new
                {
                    orderNbr = _objOrder.OrderNbr,
                    messBudget = _messBudget.TrimEnd(','),
                    messSite = _messSite.TrimEnd(','),
                    messError = GetMessError()
                });
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    return (ex as MessageException).ToMessage();
                }
                if (_choice || ex.Message == "Choice")
                {
                    return _logMessage;
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }

        [HttpPost]
        public ActionResult Report(FormCollection data)
        {
            try
            {
                _form = data;
                string reportNbr = "";
                string reportName = "";
                _objOrder = data.ConvertToObject<OM10100_pcOrder_Result>(false, new string[] { "DoNotCalDisc", "CreditHold" });
                _objOrder.DoNotCalDisc = (data["DoNotCalDisc"].PassNull() != string.Empty ? 1 : 0).ToShort();
                _objOrder.CreditHold = (data["CreditHold"].PassNull() != string.Empty ? 1 : 0).ToBool();

                User user = _sys.Users.FirstOrDefault(p => p.UserName.ToLower() == Current.UserName.ToLower());
                reportNbr = _form["ReportNbr"].PassNull();
                reportName = _form["ReportName"].PassNull();
                DateTime date = DateTime.Now.ToString("yyyy-MM-dd").ToDateTime();
                var rpt = new RPTRunning();
                rpt.ResetET();

                if (_form["type"] == "V")
                {
                    rpt.ReportNbr = reportNbr;
                    rpt.MachineName = "Web";
                    rpt.ReportCap = reportName;
                    rpt.ReportName = reportName;
                    rpt.ReportDate = date;
                    rpt.DateParm00 = date;
                    rpt.DateParm01 = date;
                    rpt.DateParm02 = date;
                    rpt.DateParm03 = date;

                    rpt.StringParm00 = _objOrder.SlsPerID;
                    rpt.StringParm01 = "";
                    rpt.StringParm02 = _objOrder.OrderNbr;
                    rpt.StringParm03 = _objOrder.BranchID;
                    rpt.UserID = Current.UserName;
                    rpt.AppPath = "Reports\\";
                    rpt.ClientName = Current.UserName;
                    rpt.LoggedCpnyID = Current.CpnyID;
                    rpt.CpnyID = user.CpnyID;
                    rpt.LangID = Current.LangID;
                    _app.RPTRunnings.AddObject(rpt);
                }
                else if (_form["type"] == "S")
                {
                    rpt.ReportNbr = reportNbr;
                    rpt.MachineName = "Web";
                    rpt.ReportCap = reportName;
                    rpt.ReportName = reportName;
                    rpt.ReportDate = date;
                    rpt.DateParm00 = date;
                    rpt.DateParm01 = date;
                    rpt.DateParm02 = date;
                    rpt.DateParm03 = date;
                    rpt.StringParm00 = _objOrder.SlsPerID;
                    rpt.StringParm01 = "";
                    rpt.StringParm02 = _objOrder.OrderNbr;
                    rpt.StringParm03 = _objOrder.BranchID;
                    rpt.UserID = Current.UserName;
                    rpt.AppPath = "Reports\\";
                    rpt.ClientName = Current.UserName;
                    rpt.LoggedCpnyID = Current.CpnyID;
                    rpt.CpnyID = user.CpnyID;
                    rpt.LangID = Current.LangID;
                    _app.RPTRunnings.AddObject(rpt);
                }
                _app.SaveChanges();

                if (_logMessage != null)
                {
                    return _logMessage;
                }
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

        [DirectMethod]
        public ActionResult OM10100GetNote(string branchID, string orderNbr)
        {
            string noteText = string.Empty;
            var note = _app.Notes.FirstOrDefault(p => p.BranchID == branchID && p.ScreenNbr == "OM10100" && p.ObjId == orderNbr);
            if (note != null)
            {
                noteText = note.NoteText.PassNull();
            }
            return this.Direct(noteText);
        }
        [DirectMethod]
        public ActionResult OM10100UpdateNote(string branchID, string orderNbr, string noteText)
        {
            var note = _app.Notes.FirstOrDefault(p => p.BranchID == branchID && p.ScreenNbr == "OM10100" && p.ObjId == orderNbr);
            if (note == null)
            {
                note = new Note();
                note.BranchID = branchID;
                note.ObjId = orderNbr;
                note.ScreenNbr = _screenNbr;

                _app.Notes.AddObject(note);
            }
            note.NoteText = noteText;
            note.NoteDate = DateTime.Now;
            _app.SaveChanges();

            return this.Direct();
        }
        #endregion

        #region Function
        private bool CheckData_Order(bool pda)
        {
            if (_objOrder.OrderType.PassNull() == string.Empty)
            {
                throw new MessageException("1000", new[] { Util.GetLang("ordertype") });
            }

            if (_objOrder.CustID.PassNull() == string.Empty)
            {
                throw new MessageException("1000", new[] { Util.GetLang("custid") });
            }

            if (_objOrder.SlsPerID.PassNull() == string.Empty)
            {
                throw new MessageException("1000", new[] { Util.GetLang("slsperid") });
            }

            if (_objOrder.Terms.PassNull() == string.Empty)
            {
                throw new MessageException("1000", new[] { Util.GetLang("terms") });
            }

            if (_lstOrdDet.Count == 0 && !_isDelete)
            {
                throw new MessageException("704");
            }

            double totMarkSales = _lstOrdDet.Where(p => p.FreeItem == false && p.DiscCode.PassNull() == string.Empty && string.IsNullOrWhiteSpace(p.DisplayID)).Sum(p => p.Mark ?? 0);
            double totMarkDisc = _lstOrdDet.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);

            if (_objType.ARDocType == "CM" || _objType.ARDocType == "CC") // Đơn trả
            {
                var origOrder = _app.OM_SalesOrd.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrigOrderNbr);
                if (origOrder != null && origOrder.OrderType != "OO")
                {
                    var lstBKDet = _app.OM10100_pdBackOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, _objOrder.OrigOrderNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                    foreach (var item in _lstOrdDet)
                    {
                        double currentQty = 0;
                        double bkQty = 0;
                        OM10100_pdBackOrderDet_Result bkDet = null;
                        if (item.FreeItem)
                        {
                            // chi check so luong km tay, km tu dong check sau khi tinh KM xong
                            if (item.DiscCode.PassNull() != string.Empty)
                            {
                                currentQty = _lstOrdDet.Where(p => p.InvtID == item.InvtID && p.FreeItem && p.DiscCode.PassNull() != string.Empty).Sum(p => p.UnitMultDiv == "M" ? p.UnitRate * p.LineQty : p.LineQty / p.UnitRate);
                                bkDet = lstBKDet.FirstOrDefault(p => p.InvtID == item.InvtID + "@KM1");

                            }
                        }
                        else
                        {
                            currentQty = _lstOrdDet.Where(p => p.InvtID == item.InvtID && !p.FreeItem).Sum(p => p.UnitMultDiv == "M" ? p.UnitRate * p.LineQty : p.LineQty / p.UnitRate);
                            bkDet = lstBKDet.FirstOrDefault(p => p.InvtID == item.InvtID);
                        }
                        bkQty = bkDet != null ? bkDet.Qty.Value : 0;
                        if (currentQty > bkQty)
                        {
                            string msgInvt = item.InvtID;
                            if (item.FreeItem)
                            {
                                msgInvt += item.DiscCode.PassNull() != string.Empty ? " KM tay" : " KM tự động";
                            }
                            
                            throw new MessageException("2017090801", new[] { msgInvt, bkQty.ToString("N0"), item.StkUnit });
                        }
                    }
                }
            }
            else
            {
                if (_objOrder.StationID.PassNull() == string.Empty)
                {
                    if (totMarkSales < totMarkDisc)
                    {
                        throw new MessageException("2017021401");
                    }
                }
                else
                {
                    var markOrder = _app.OM10100_pcMarkOrder(_objOrder.BranchID, _objOrder.OrderNbr, _objOrder.CustID, Current.UserName, Current.CpnyID, Current.LangID).Where(p => p.OrderNbr == _objOrder.StationID).FirstOrDefault();
                    if (markOrder != null)
                    {
                        if (_form == null || _form["tstamp"].PassNull() == string.Empty) // đơn mới
                        {
                            if (markOrder.RemainDebtPoint + totMarkSales - totMarkDisc < 0)
                            {
                                throw new MessageException("2017021602", new string[] { _objOrder.StationID, markOrder.RemainDebtPoint.ToString("N2") });
                            }
                        }
                        else
                        {
                            var objDbOrder = _app.OM_SalesOrd.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr);
                            if (objDbOrder.StationID.PassNull() != _objOrder.StationID.PassNull())
                            {
                                if (markOrder.RemainDebtPoint - totMarkDisc < 0)
                                {
                                    throw new MessageException("2017021602", new string[] { _objOrder.StationID, markOrder.RemainDebtPoint.ToString("N2") });
                                }
                            }
                            else
                            {
                                var lstOld = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();
                                var oldMarkDisc = lstOld.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark);
                                if (markOrder.RemainDebtPoint + oldMarkDisc - totMarkDisc < 0)
                                {
                                    throw new MessageException("2017021602", new string[] { _objOrder.StationID, markOrder.RemainDebtPoint.ToString("N2") });
                                }
                            }
                        }
                    }
                    else
                    {
                        throw new MessageException("2017021601", new string[] { _objOrder.StationID });
                    }
                }
            }
            
            for (int i = 0; i < _lstOrdDet.Count; i++)
            {
                string invtID = _lstOrdDet[i].InvtID;
                string siteID = _lstOrdDet[i].SiteID;
                double editQty = 0;
                double qtyTot = 0;
                if (_lstOrdDet[i].LineQty == 0)
                {
                    throw new MessageException("1000", new[] { Util.GetLang("Qty") });
                }

                if (_lstOrdDet[i].SiteID.PassNull() == string.Empty)
                {
                    throw new MessageException("1000", new[] { Util.GetLang("SiteID") });
                }

                if (_lstOrdDet[i].UnitMultDiv.PassNull() == string.Empty || _lstOrdDet[i].SlsUnit.PassNull() == string.Empty)
                {
                    throw new MessageException("2525", new[] { _lstOrdDet[i].InvtID });
                }
                OM10100_pdInventoryByID_Result objInvt = GetInventory(invtID);
                if (objInvt.InvtID.PassNull() != string.Empty && _calcPromoOnly == 0)
                {
                    if (objInvt.StkItem == 1 || _lstOrdDet[i].BOType != "B")
                    {
                        if (_lstOrdDet[i].UnitMultDiv == "M")
                        {
                            editQty = _lstOrdDet[i].LineQty * (_lstOrdDet[i].UnitRate == 0 ? 1 : _lstOrdDet[i].UnitRate);
                        }
                        else
                        {
                            editQty = _lstOrdDet[i].LineQty / (_lstOrdDet[i].UnitRate == 0 ? 1 : _lstOrdDet[i].UnitRate);
                        }

                        qtyTot = editQty + CalculateInvtTotals(_lstOrdDet[i].InvtID, _lstOrdDet[i].SiteID, _lstOrdDet[i].LineRef);
                        IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID);
                        if (objItemSite == null)
                        {
                            objItemSite = new IN_ItemSite();
                        }
                        // OM20500 đã kiểm tra tồn kho và trừ tạm QtyAvail, tăng QtyOnAllocSO ròi
                        if (!_objIN.NegQty && _screenNbr != "OM20500")
                        {
                            if (_objType != null)
                            {
                                if (_objType.INDocType != "CM" && _objType.INDocType != "DM" &&
                                    _objType.INDocType != "NA" && _objType.INDocType != "RC")
                                {
                                    if (qtyTot > objItemSite.QtyAvail)
                                    {
                                        throw new MessageException("1043", new[] { invtID, siteID });
                                    }

                                    if (_objType.BO && _lstOrdDet[i].BOType == "R")
                                    {
                                        double? qtyB = _app.OM10100_pdSalespersonStock(_objOrder.SlsPerID, invtID, _objOrder.OrderDate.ToDateShort()).FirstOrDefault();
                                        if (qtyB == null)
                                        {
                                            qtyB = 0;
                                        }
                                        if (editQty > qtyB)
                                        {
                                            throw new MessageException("1043", new[] { invtID, siteID });
                                        }
                                    }
                                }
                                else if (_objOrder.OrderType != "SR" && _objOrder.OrderType != "BL" &&
                                         _objOrder.OrderType != "OC" && _objType.INDocType != "CM" &&
                                         _objType.INDocType != "DM" && _objType.INDocType != "NA" &&
                                         _objType.INDocType != "RC")
                                {
                                    if (editQty > objItemSite.QtyAvail)
                                    {
                                        throw new MessageException("1043", new[] { invtID, objItemSite.SiteID });
                                    }
                                }
                                else if (_objOrder.OrderType == "SR" || _objOrder.OrderType == "BL" ||
                                         _objOrder.OrderType == "OC")
                                {
                                    double? stock = _app.OM10100_pdSalespersonStock(_objOrder.SlsPerID, invtID, _objOrder.OrderDate.ToDateShort()).FirstOrDefault();
                                    if (stock == null)
                                    {
                                        stock = 0;
                                    }
                                    if (qtyTot > stock)
                                    {
                                        throw new MessageException("1044", new[] { invtID, _objOrder.SlsPerID });
                                    }
                                }
                            }
                        }
                        // Cho bán âm kho sẽ ko kiểm tra dưới ??
                        //else
                        //{
                        //    if (_objType.INDocType != "CM" && _objType.INDocType != "DM" &&
                        //        _objType.INDocType != "NA" && _objType.INDocType != "RC")
                        //    {
                        //        if (editQty > objItemSite.QtyAvail)
                        //        {
                        //            throw new MessageException("1043", new[] { invtID + "," + objItemSite.SiteID });
                        //        }
                        //    }
                        //}
                    }
                    if (objInvt.StkItem == 1 && _lstOrdDet[i].BOType != "O" && _lstOrdDet[i].LineQty == 0 && _lstOrdDet[i].LineAmt != 0)
                    {
                        throw new MessageException("702");
                    }
                    if (objInvt.ValMthd == "S" && Util.PassNull(_lstOrdDet[i].CostID) == string.Empty)
                    {
                        throw new MessageException("734");
                    }
                }

                if (    (_lstOrdDet[i].FreeItem && _lstOrdDet[i].LineAmt != 0 && _lstOrdDet[i].POSM.PassNull() == "" )
                    ||  (!_lstOrdDet[i].FreeItem && _lstOrdDet[i].BOType != "R" && _lstOrdDet[i].LineAmt == 0 &&
                        _lstOrdDet[i].QtyBO == 0 && string.IsNullOrWhiteSpace(_lstOrdDet[i].DisplayID)
                        && _lstOrdDet[i].DiscCode == string.Empty && _lstOrdDet[i].POSM.PassNull() == "")
                    )
                {
                    throw new MessageException("703");
                }

                if ((_objType.BO && _lstOrdDet[i].BOType != "O" && _lstOrdDet[i].LineQty == 0 && _lstOrdDet[i].QtyBO == 0)
                    || (!_objType.BO && _lstOrdDet[i].LineQty == 0 && _lstOrdDet[i].QtyBO == 0))
                {
                        throw new MessageException("233");
                }

                if (_lstOrdDet[i].SlsPrice == 0 && !_lstOrdDet[i].FreeItem && _lstOrdDet[i].DiscCode == string.Empty && _lstOrdDet[i].POSM == string.Empty)
                {
                    throw new MessageException("726");
                }

                if (_objOM.ReqDiscID && Util.PassNull(_lstOrdDet[i].DiscCode) == string.Empty && Util.PassNull(_lstOrdDet[i].DisplayID) == string.Empty && _lstOrdDet[i].FreeItem && Util.PassNull(_lstOrdDet[i].DiscID1) == string.Empty && Util.PassNull(_lstOrdDet[i].GroupDiscID1) == string.Empty)
                {
                    var lstDiscPDA = new List<OM_PDAOrdDisc>();
                    if (pda)
                    {
                        lstDiscPDA = _app.OM_PDAOrdDisc.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrigOrderNbr).ToList();
                    }
                    var lstDiscOM = _app.OM_OrdDisc.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr).ToList();
                    if (_objOrder.OrderNbr == "")
                    {
                        lstDiscOM = _lstDisc;
                    }
                    //kiểm tra nếu trong ordisc ko có thì thông báo
                    if (lstDiscPDA.Where(p => p.SOLineRef == _lstOrdDet[i].LineRef).Count() == 0 && lstDiscOM.Where(p => p.SOLineRef == _lstOrdDet[i].LineRef).Count() == 0)
                    {
                        throw new MessageException("746");
                    }
                }

                if (_lstOrdDet[i].BOType == "B" && Util.PassNull(_lstOrdDet[i].BOCustID) == string.Empty)
                {
                    throw new MessageException("734");
                }

                if (_lstOrdDet[i].DiscAmt > 0 && _lstOrdDet[i].DiscCode.PassNull() != string.Empty &&
                    _lstOrdDet[i].BudgetID1.PassNull() != string.Empty)
                {
                    double discAmt = _lstOrdDet[i].DiscAmt;
                    string budGetID = _lstOrdDet[i].BudgetID1;
                    //string tmp = string.Empty;
                    double qtyAmtAvail = 0;
                    if (!CheckAvailableDiscBudget(ref budGetID, _lstOrdDet[i].DiscCode, "", ref discAmt, false, _lstOrdDet[i].InvtID, _lstOrdDet[i].SlsUnit, ref qtyAmtAvail))
                    {
                        throw new MessageException("402");
                        //throw new MessageException("2015032702", new []{_lstOrdDet[i].DiscCode, _lstOrdDet[i].BudgetID1});
                    }
                }

                if (objInvt.LotSerTrack.PassNull() != string.Empty && objInvt.LotSerTrack != "N")
                {
                    var lstLot = _lstLot.Where(p => p.OMLineRef == _lstOrdDet[i].LineRef).ToList();
                    double lotQty = 0;
                    foreach (var item in lstLot)
                    {
                        if (item.InvtID != _lstOrdDet[i].InvtID || item.SiteID != _lstOrdDet[i].SiteID)
                        {
                            throw new MessageException("2015040501", new[] { _lstOrdDet[i].InvtID });
                        }

                        if (item.UnitMultDiv.PassNull() == string.Empty || item.UnitDesc.PassNull() == string.Empty)
                        {
                            throw new MessageException("2015040503", new[] { _lstOrdDet[i].InvtID });
                        }

                        lotQty += Math.Round(item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact, 0);
                    }
                    double detQty = Math.Round(_lstOrdDet[i].UnitMultDiv == "M" ? _lstOrdDet[i].LineQty * _lstOrdDet[i].UnitRate : _lstOrdDet[i].LineQty / _lstOrdDet[i].UnitRate, 0);
                    if (detQty != lotQty)
                    {
                        throw new MessageException("2015040502", new[] { _lstOrdDet[i].InvtID });
                    }
                }
            }

            //if (!_checkInvcNbr && txtInvcNbr.Text.Trim() != string.Empty && _objType.ARDocType != "CM" && _objType.ARDocType != "CC")
            if (_objOrder.InvcNbr.PassNull() != string.Empty && _objType.ARDocType != "CM" && _objType.ARDocType != "CC")
            {
                string orderNbr = _objOrder.OrderNbr.PassNull();
                string invcNbr = _objOrder.InvcNbr.PassNull();
                OM_SalesOrd data = _app.OM_SalesOrd.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr.ToUpper() != orderNbr && p.InvcNbr.ToUpper() == invcNbr.ToUpper());
                if (data != null)
                {
                    throw new MessageException("9911");
                }
            }
            return true;
        }

        private double CalculateInvtTotals(string invtID, string siteID, string lineRef)
        {
            double qty = 0;
            double oldQTy = 0;
            if (_screenNbr != "OM20500")
            {
                _objOrder.OrderType = _form["OrderType"];
                var lstOrdDetFromDatabase = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();
                if (_objOrder.OrderType == "SR" || _objOrder.OrderType == "BL" || _objOrder.OrderType == "OC")
                {
                    oldQTy = lstOrdDetFromDatabase.Where(p => p.InvtID == invtID && p.BOType != "B").Sum(p => p.StkQty);
                    qty = _lstOrdDet.Where(p => p.InvtID == invtID && p.LineRef != lineRef && p.BOType != "B").Sum(p => p.StkQty);
                }
                else
                {
                    oldQTy = lstOrdDetFromDatabase.Where(p => p.InvtID == invtID && p.SiteID == siteID && p.BOType != "B").Sum(p => p.StkQty);
                    qty = _lstOrdDet.Where(p => p.InvtID == invtID && p.LineRef != lineRef && p.BOType != "B" && p.SiteID == siteID).Sum(p => p.StkQty);
                }
            }
            return qty - oldQTy;
        }
             
        private bool CheckAvailableDiscBudget(ref string refbudgetID, string discID, string discSeq, 
            ref double discAmtQty, bool freeItem, string invtID, string unit, ref double availBudget)
        {
            if (_calcPromoOnly == 0)
            {
                string budgetID = refbudgetID;
                OM_PPBudget objBudget = _app.OM_PPBudget.FirstOrDefault(p => p.BudgetID == budgetID);
                if (objBudget == null)
                {
                    availBudget = double.MaxValue;
                    objBudget = new OM_PPBudget(); 
                }

                if (_objType.ARDocType != "NA" && _objType.ARDocType != "CM" && _objType.ARDocType != "CC" && budgetID != string.Empty && objBudget != null && objBudget.Active)
                {
                    if ((objBudget.ApplyTo == "A" && !freeItem) || (objBudget.ApplyTo != "A" && freeItem))
                    {
                        string objID = objBudget.AllocType == "1" ? _objUser.SalesRouteID : _objCust.CustId;
                        if (objBudget.AllocType == "1")
                        {
                            OM_PPAlloc objAlloc;
                            if (objBudget.ApplyTo == "A")
                            {
                                objAlloc = GetAlloc(objID, budgetID, "");

                                if (_screenNbr == "OM20500")
                                {
                                    if (objAlloc != null)
                                    {
                                        availBudget = objAlloc.QtyAmtAvail;
                                    }
                                    if (objAlloc == null || objAlloc.QtyAmtAvail < discAmtQty)
                                    {
                                        if (isShowMess2017032201)
                                        {
                                            throw new MessageException("402");
                                        }
                                        if (discID != "")
                                        {
                                            AddBudgetToString(discID + "-" + discSeq + "-" + budgetID + ",");
                                        }
                                        budgetID = string.Empty;

                                        return false;
                                    }
                                }
                                else
                                {
                                    if (objAlloc != null)
                                    {
                                        availBudget = objAlloc.QtyAmtAvail - (objAlloc.QtyOnPDA = objAlloc.QtyOnPDA < 0 ? 0 : objAlloc.QtyOnPDA);
                                    }
                                    if (objAlloc == null || (objAlloc.QtyAmtAvail -  (objAlloc.QtyOnPDA = objAlloc.QtyOnPDA < 0 ? 0 : objAlloc.QtyOnPDA)) < discAmtQty)
                                    {
                                        if (isShowMess2017032201)
                                        {
                                            throw new MessageException("402");
                                        }
                                        if (discID != "")
                                        {
                                            AddBudgetToString(discID + "-" + discSeq + "-" + budgetID + ",");
                                        }
                                        budgetID = string.Empty;

                                        return false;
                                    }
                                }




                                
                            }
                            else if (objBudget.ApplyTo != "A")
                            {
                                OM_PPFreeItem objPPInvt = _app.OM_PPFreeItem.FirstOrDefault(p => p.BudgetID == objBudget.BudgetID && p.FreeItemID == invtID);
                                objAlloc = GetAlloc(objID, budgetID, invtID);
                                if (objPPInvt != null && objAlloc != null)
                                {
                                    IN_UnitConversion uomFrom = SetUOM(invtID, unit, "", "");
                                    if (uomFrom != null)
                                    {
                                        IN_UnitConversion uomTo = SetUOM(invtID, objPPInvt.UnitDesc, "", "");
                                        double rate = (uomFrom.MultDiv == "M") ? uomFrom.CnvFact : 1 / uomFrom.CnvFact;
                                        double rate2 = (uomTo.MultDiv == "M") ? uomTo.CnvFact : 1 / uomTo.CnvFact;
                                        rate = Math.Round(rate / rate2, 2);

                                        double tmp = discAmtQty * rate;

                                        if (_screenNbr == "OM20500")
                                        {
                                            availBudget = objAlloc.QtyAmtAvail;
                                            if (objAlloc == null || objAlloc.QtyAmtAvail < tmp)
                                            {
                                                if (isShowMess2017032201)
                                                {
                                                    throw new MessageException(MessageType.Message, "402");
                                                }
                                                budgetID = string.Empty;
                                                return false;
                                            }
                                        }
                                        else
                                        {
                                            availBudget = objAlloc.QtyAmtAvail - (objAlloc.QtyOnPDA = objAlloc.QtyOnPDA < 0 ? 0 : objAlloc.QtyOnPDA);
                                            if (objAlloc == null || (objAlloc.QtyAmtAvail - (objAlloc.QtyOnPDA = objAlloc.QtyOnPDA < 0 ? 0 : objAlloc.QtyOnPDA)) < tmp)
                                            {
                                                if (isShowMess2017032201)
                                                {
                                                    throw new MessageException(MessageType.Message, "402");
                                                }
                                                budgetID = string.Empty;
                                                return false;
                                            }
                                        }

                                        
                                    }
                                }
                                else
                                {
                                    if (discID != "" && budgetID != "")
                                    {
                                        AddBudgetToString(discID + "-" + discSeq + "-" + budgetID + "-" + invtID + ",");
                                    }
                                    return false;
                                }
                            }
                        }
                        else if (objBudget.AllocType == "0")
                        {
                            var objbranchRoute = _app.OM10100_pdBranchRoute(Current.CpnyID, Current.UserName, Current.LangID, _objOrder.BranchID).FirstOrDefault();
                            if (objbranchRoute != null)
                            {
                                OM_PPCpny objCpnyID;
                                if (objBudget.ApplyTo == "A")
                                {
                                    objCpnyID = GetCpnyID(objbranchRoute.BranchRouteID, budgetID, "");
                                    if (_screenNbr == "OM20500")
                                    {
                                        if (objCpnyID != null)
                                        {
                                            availBudget = objCpnyID.QtyAmtAvail;

                                        }
                                        if (objCpnyID == null || objCpnyID.QtyAmtAvail < discAmtQty)
                                        {
                                            if (isShowMess2017032201)
                                            {
                                                throw new MessageException("402");
                                            }
                                            if (discID != "")
                                            {
                                                AddBudgetToString(discID + "-" + discSeq + "-" + budgetID + ",");
                                            }
                                            budgetID = string.Empty;

                                            return false;
                                        }
                                    }
                                    else
                                    {
                                        if (objCpnyID != null)
                                        {
                                            availBudget = objCpnyID.QtyAmtAvail - (objCpnyID.QtyOnPDA = objCpnyID.QtyOnPDA < 0 ? 0 : objCpnyID.QtyOnPDA);//objCpnyID.QtyAmtAvail
                                        }
                                        if (objCpnyID == null || (objCpnyID.QtyAmtAvail - (objCpnyID.QtyOnPDA = objCpnyID.QtyOnPDA < 0 ? 0 : objCpnyID.QtyOnPDA)) < discAmtQty)
                                        {
                                            if (isShowMess2017032201)
                                            {
                                                throw new MessageException("402");
                                            }
                                            if (discID != "")
                                            {
                                                AddBudgetToString(discID + "-" + discSeq + "-" + budgetID + ",");
                                            }
                                            budgetID = string.Empty;

                                            return false;
                                        }
                                    }

                                   
                                }
                                else if (objBudget.ApplyTo != "A")
                                {
                                    OM_PPFreeItem objPPInvt = _app.OM_PPFreeItem.FirstOrDefault(p => p.BudgetID == objBudget.BudgetID && p.FreeItemID == invtID);
                                    objCpnyID = GetCpnyID(objbranchRoute.BranchRouteID, budgetID, invtID);
                                    if (objPPInvt != null && objCpnyID != null)
                                    {
                                        IN_UnitConversion uomFrom = SetUOM(invtID, unit, "", "");
                                        if (uomFrom != null)
                                        {
                                            IN_UnitConversion uomTo = SetUOM(invtID, objPPInvt.UnitDesc, "", "");
                                            double rate = (uomFrom.MultDiv == "M") ? uomFrom.CnvFact : 1 / uomFrom.CnvFact;
                                            double rate2 = (uomTo.MultDiv == "M") ? uomTo.CnvFact : 1 / uomTo.CnvFact;
                                            rate = Math.Round(rate / rate2, 2);

                                            double tmp = discAmtQty * rate;
                                            if (_screenNbr == "OM20500")
                                            {
                                                availBudget = objCpnyID.QtyAmtAvail;
                                                if (objCpnyID == null || objCpnyID.QtyAmtAvail < tmp)
                                                {
                                                    if (isShowMess2017032201)
                                                    {
                                                        throw new MessageException(MessageType.Message, "402");
                                                    }
                                                    budgetID = string.Empty;
                                                    return false;
                                                }
                                            }
                                            else
                                            {
                                                availBudget = objCpnyID.QtyAmtAvail - (objCpnyID.QtyOnPDA = objCpnyID.QtyOnPDA < 0 ? 0 : objCpnyID.QtyOnPDA);//objCpnyID.QtyAmtAvail;
                                                if (objCpnyID == null || (objCpnyID.QtyAmtAvail - (objCpnyID.QtyOnPDA = objCpnyID.QtyOnPDA < 0 ? 0 : objCpnyID.QtyOnPDA)) < tmp)
                                                {
                                                    if (isShowMess2017032201)
                                                    {
                                                        throw new MessageException(MessageType.Message, "402");
                                                    }
                                                    budgetID = string.Empty;
                                                    return false;
                                                }
                                            }
                                          
                                        }
                                    }
                                    else
                                    {
                                        if (discID != "" && budgetID != "")
                                        {
                                            AddBudgetToString(discID + "-" + discSeq + "-" + budgetID + "-" + invtID + ",");
                                        }
                                        return false;
                                    }
                                }
                            }
                            
                            
                        }
                        
                        
                    }
                }
            }
            return true;
        }
        //chiết khấu dòng trừ tiền chiết khấu dòng trước khi tính chiết khấy hóa đơn
        private void CheckSubInLineQty(OM10100_pgOrderDet_Result det, double stkQty, double stkPrice, string key, ref string _discLineRef)
        {
            if (!_objOrder.DoNotCalDisc.ToBool() && _objType.SalesType != "PRO" && !det.FreeItem && det.BOType != "R" && ((det.POSM != string.Empty && det.DiscCode != string.Empty) || det.DiscPct == 0) || det.DiscPct != 0 && det.DiscAmt != 0) // && 
            {                
                det.DiscPct = 0;
                det.DiscAmt = 0;
                if (det.BOType == "O")
                {
                    det.LineAmt = Math.Round((det.LineQty + det.QtyBO) * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt, MidpointRounding.AwayFromZero);
                }
                else
                {
                    det.LineAmt = Math.Round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt, MidpointRounding.AwayFromZero);
                }
                det.DiscID1 = string.Empty;
                det.DiscID2 = string.Empty;
                det.DiscSeq1 = string.Empty;
                det.DiscSeq2 = string.Empty;
                det.BudgetID1 = string.Empty;
                det.BudgetID2 = string.Empty;
                det.DiscAmt1 = 0;
                det.DiscAmt2 = 0;
                det.DiscPct1 = 0;
                det.DiscCode = string.Empty;
                det.OrigOrderNbr = string.Empty;
            }
            if (det.FreeItem || det.POSM != string.Empty || det.DiscCode != string.Empty)
            {
                det.LineAmt = 0;
            }
            else if (det.BOType == "R")
            {
                det.LineAmt = 0;
                det.SOFee = 0;
            }
        }

        private double OM_GetCnvFactFromUnit(string invtID, string unitDesc, string stkUnit)
        {
            double cnvFact = 1;
            if (stkUnit.PassNull() == string.Empty)
            {
                OM10100_pdInventoryByID_Result objInvt = GetInventory(invtID);
                if (objInvt != null)
                {
                    stkUnit = objInvt.StkUnit;
                }
            }
            IN_UnitConversion cnv = _app.IN_UnitConversion.FirstOrDefault(p => p.InvtID == invtID && p.FromUnit == unitDesc && p.ToUnit == stkUnit);
            if (cnv != null)
            {
                cnvFact = (cnv.MultDiv == "D") ? 1 / cnv.CnvFact : cnv.CnvFact;
            }
            return cnvFact;
        }
        private double OM_GetCnvFactSLSL(string invtID, string FromunitDesc, string ToUnitDesc)
        {
            double cnvFact = 1;
            IN_UnitConversion cnv = _app.IN_UnitConversion.FirstOrDefault(p => p.InvtID == invtID && p.FromUnit == FromunitDesc && p.ToUnit == ToUnitDesc);
            if (cnv == null)
            {
                cnv = _app.IN_UnitConversion.FirstOrDefault(p => p.FromUnit == FromunitDesc && p.ToUnit == ToUnitDesc);
            }
            if (cnv != null)
            {
                cnvFact = (cnv.MultDiv == "D") ? 1 / cnv.CnvFact : cnv.CnvFact;
            }
            return cnvFact;
        }
        /// <summary>
        /// Kiểm tra Trả hàng thì được tính lại KM
        /// </summary>
        private bool CheckReturnDisc(string discID, string discSeq)
        {
            if (_lstBKDisc == null)
            {
                _lstBKDisc = _app.OM_OrdDisc.Where(p => p.OrderNbr == _objOrder.OrigOrderNbr && p.BranchID == _objOrder.BranchID).ToList();
            }
            foreach (var omOrdDisc in _lstBKDisc)
            {
                if (omOrdDisc.DiscID == discID && omOrdDisc.DiscSeq == discSeq)
                {
                    return true;
                }
            }
            return false;
        }

        private List<string> CheckExistsBreakLineRef(OM10100_pdGetDiscSeq_Result seq)
        {
            List<string> lstDiscBreak = new List<string>();
            if (seq.RequiredType == RequiredTypeQ || seq.RequiredType == RequiredTypeN)
            {
                var lstCheck = _lstDisc.Where(x => x.DiscID == seq.DiscID && x.DiscSeq == seq.DiscSeq && x.BreakBy == seq.BreakBy && x.DiscBreakLineRef != "").ToList();
                foreach (var item in lstCheck)
                {
                    lstDiscBreak.Add(item.DiscBreakLineRef);
                }
            }

            return lstDiscBreak;
        }

        private void ClearGroupDocBudget()
        {
            if (_screenNbr == "OM20500" && _objOrder.DoNotCalDisc.ToInt() == 0)
            {
                return;
            }
            if (_objType.ARDocType != "NA")
            {
                int rtrn = (_objType.ARDocType == "CM" || _objType.ARDocType == "CC") ? -1 : 1;

                List<OM_OrdDisc> lstDisc = _app.OM_OrdDisc.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr).ToList();
                _lstOM_OrdDiscOld = lstDisc;
                foreach (OM_OrdDisc disc in lstDisc)
                {
                    OM_PPBudget objBudget = _app.OM_PPBudget.FirstOrDefault(p => p.BudgetID == disc.BudgetID);
                    if (objBudget != null && objBudget.Active) //&& disc.DiscType != "L" 
                    {
                        string objID = (objBudget.AllocType == "1" ? _objUser.SalesRouteID : _objOrder.CustID);
                        if (objBudget.AllocType == "1")
                        {
                            if (objBudget.ApplyTo == "A")
                            {
                                OM_PPAlloc objAlloc = _app.OM_PPAlloc.FirstOrDefault(p => p.CpnyID == _objUser.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == "" && p.ObjID == objID); //GetAlloc(objID, objBudget.BudgetID, "");
                                GetAlloc(objID, objBudget.BudgetID, "");
                                if (objAlloc != null && objAlloc.QtyAmtAlloc > 0)
                                {
                                    objAlloc.QtyAmtSpent = objAlloc.QtyAmtSpent - disc.DiscAmt * rtrn;
                                    objAlloc.QtyAmtAvail = objAlloc.QtyAmtAlloc - objAlloc.QtyAmtSpent;
                                    if (_screenNbr == "OM20500")
                                    {
                                        objAlloc.QtyOnPDA = objAlloc.QtyOnPDA + disc.DiscAmt * rtrn;
                                    }
                                    objAlloc.LUpd_DateTime = DateTime.Now;
                                    objAlloc.LUpd_Prog = _screenNbr;
                                    objAlloc.LUpd_User = Current.UserName;
                                }
                            }
                            else
                            {
                                OM_PPFreeItem objPPInvt = _app.OM_PPFreeItem.FirstOrDefault(p => p.BudgetID == objBudget.BudgetID && p.FreeItemID == disc.FreeItemID);
                                if (objPPInvt != null)
                                {
                                    IN_UnitConversion uomFrom = SetUOM(disc.FreeItemID, disc.DiscUOM, "", "");
                                    if (uomFrom != null)
                                    {
                                        IN_UnitConversion uomTo = SetUOM(disc.FreeItemID, objPPInvt.UnitDesc, "", "");
                                        double rate = uomFrom.MultDiv == "M" ? uomFrom.CnvFact : 1 / uomFrom.CnvFact;
                                        double rate2 = uomTo.MultDiv == "M" ? uomTo.CnvFact : 1 / uomTo.CnvFact;
                                        rate = Math.Round(rate / rate2, 2);
                                        GetAlloc(objID, objBudget.BudgetID, disc.FreeItemID);
                                        OM_PPAlloc objAlloc = _app.OM_PPAlloc.FirstOrDefault(p => p.CpnyID == _objUser.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == disc.FreeItemID && p.ObjID == objID);
                                        if (objAlloc != null && objAlloc.QtyAmtAlloc > 0)
                                        {
                                            objAlloc.QtyAmtSpent = objAlloc.QtyAmtSpent - disc.FreeItemQty * rate * rtrn;
                                            objAlloc.QtyAmtAvail = objAlloc.QtyAmtAlloc - objAlloc.QtyAmtSpent;
                                            if (_screenNbr == "OM20500")
                                            {
                                                objAlloc.QtyOnPDA = objAlloc.QtyOnPDA + disc.FreeItemQty * rate * rtrn;
                                            }
                                            objAlloc.LUpd_DateTime = DateTime.Now;
                                            objAlloc.LUpd_Prog = _screenNbr;
                                            objAlloc.LUpd_User = Current.UserName;
                                        }
                                    }
                                }
                            }
                        }
                        else if (objBudget.AllocType == "0")
                        {
                            var objbranchRoute = _app.OM10100_pdBranchRoute(Current.CpnyID, Current.UserName, Current.LangID, _objOrder.BranchID).FirstOrDefault();
                            if (objbranchRoute != null)
                            {
                                if (objBudget.ApplyTo == "A")
                                {
                                    OM_PPCpny objCpny = _app.OM_PPCpny.FirstOrDefault(p => p.CpnyID == objbranchRoute.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == ""); //GetAlloc(objID, objBudget.BudgetID, "");
                                    GetCpnyID(objbranchRoute.BranchRouteID, objBudget.BudgetID, "");
                                    if (objCpny != null && objCpny.QtyAmtAlloc > 0)
                                    {
                                        objCpny.QtyAmtSpent = objCpny.QtyAmtSpent - disc.DiscAmt * rtrn;
                                        objCpny.QtyAmtAvail = objCpny.QtyAmtAlloc - objCpny.QtyAmtSpent;
                                        if (_screenNbr == "OM20500")
                                        {
                                            objCpny.QtyOnPDA = objCpny.QtyOnPDA + disc.DiscAmt * rtrn;
                                        }
                                        objCpny.LUpd_DateTime = DateTime.Now;
                                        objCpny.LUpd_Prog = _screenNbr;
                                        objCpny.LUpd_User = Current.UserName;
                                    }
                                }
                                else
                                {
                                    OM_PPFreeItem objPPInvt = _app.OM_PPFreeItem.FirstOrDefault(p => p.BudgetID == objBudget.BudgetID && p.FreeItemID == disc.FreeItemID);
                                    if (objPPInvt != null)
                                    {
                                        IN_UnitConversion uomFrom = SetUOM(disc.FreeItemID, disc.DiscUOM, "", "");
                                        if (uomFrom != null)
                                        {
                                            IN_UnitConversion uomTo = SetUOM(disc.FreeItemID, objPPInvt.UnitDesc, "", "");
                                            double rate = uomFrom.MultDiv == "M" ? uomFrom.CnvFact : 1 / uomFrom.CnvFact;
                                            double rate2 = uomTo.MultDiv == "M" ? uomTo.CnvFact : 1 / uomTo.CnvFact;
                                            rate = Math.Round(rate / rate2, 2);
                                            GetCpnyID(objbranchRoute.BranchRouteID, objBudget.BudgetID, disc.FreeItemID);
                                            OM_PPCpny objCpny = _app.OM_PPCpny.FirstOrDefault(p => p.CpnyID == objbranchRoute.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == disc.FreeItemID);
                                            if (objCpny != null && objCpny.QtyAmtAlloc > 0)
                                            {
                                                objCpny.QtyAmtSpent = objCpny.QtyAmtSpent - disc.FreeItemQty * rate * rtrn;
                                                objCpny.QtyAmtAvail = objCpny.QtyAmtAlloc - objCpny.QtyAmtSpent;
                                                if (_screenNbr == "OM20500")
                                                {
                                                    objCpny.QtyOnPDA = objCpny.QtyOnPDA + disc.FreeItemQty * rate * rtrn;
                                                }
                                                objCpny.LUpd_DateTime = DateTime.Now;
                                                objCpny.LUpd_Prog = _screenNbr;
                                                objCpny.LUpd_User = Current.UserName;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                    }
                }
            }
        }
        private void ClearFreeItemInGrid()
        {
            for (int i = _lstOrdDet.Count - 1; i >= 0; i--)
            {
                if (_lstOrdDet[i].FreeItem && _lstOrdDet[i].DiscCode.PassNull() == string.Empty && string.IsNullOrWhiteSpace(_lstOrdDet[i].DisplayID) && (_lstOrdDet[i].DiscID1.PassNull() != string.Empty || _lstOrdDet[i].DiscID2.PassNull() != string.Empty))
                {
                    Delete_Det(_lstOrdDet[i].LineRef);
                    DelTax(i);
                    foreach (OM_OrdDisc disc in _lstDisc)
                    {
                        if (_lstOrdDet[i].FreeItem && _lstOrdDet[i].DiscID1.PassNull() != string.Empty && disc.FreeItemID == _lstOrdDet[i].InvtID && disc.SOLineRef == _lstOrdDet[i].LineRef)
                        {
                            disc.FreeItemID = disc.FreeItemID + "_D";
                            disc.FreeItemQty = 0;
                            disc.UserOperationLog = "User Deleted Free Item";
                        }
                    }
                    _lstOrdDet.RemoveAt(i);
                }
            }
            CalcTaxTotal();
            CalcDet();
        }
        private void ClearGroupDocDisc()
        {
            List<OM_OrdDisc> lstDiscOld = _app.OM_OrdDisc.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr).ToList();
            foreach (OM_OrdDisc omOrdDisc in lstDiscOld)
            {
                _app.OM_OrdDisc.DeleteObject(omOrdDisc);
            }

            List<OM_OrdDiscItemApply> lstDiscItemApply = _app.OM_OrdDiscItemApply.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr).ToList();
            foreach (OM_OrdDiscItemApply omOrdDisc in lstDiscItemApply)
            {
                _app.OM_OrdDiscItemApply.DeleteObject(omOrdDisc);
            }

            // Lang Edited
            for (int i = _lstDisc.Count - 1; i >= 0; i--)
            {
                var seq = GetDiscSeqActive(_lstDisc[i].DiscID, _lstDisc[i].DiscSeq);
                if (!seq.PctDiscountByLevel)
                {
                    _lstDisc.RemoveAt(i);
                }
            }
            foreach (OM10100_pgOrderDet_Result det in _lstOrdDet)
            {
                det.GroupDiscID1 = string.Empty;
                det.GroupDiscID2 = string.Empty;
                det.GroupDiscSeq1 = string.Empty;
                det.GroupDiscSeq2 = string.Empty;
                det.GroupDiscAmt1 = 0;
                det.GroupDiscAmt2 = 0;
                det.GroupDiscPct1 = 0;
                det.GroupDiscPct2 = 0;
                det.FreeItemQty1 = 0;
                det.FreeItemQty2 = 0;
                if (det.DiscAmt1 == 0)
                {
                    det.DiscID1 = string.Empty;
                    det.DiscSeq1 = string.Empty;
                }

                if (det.DiscAmt2 == 0)
                {
                    det.DiscID2 = string.Empty;
                    det.DiscSeq2 = string.Empty;
                }
            }
            CalcDet();
        }
        private void CalcDet()
        {
            if (_objType == null || _objType.OrderType == null)
            {
                return;
            }

            double taxAmt00 = 0;
            double taxAmt01 = 0;
            double taxAmt02 = 0;
            double taxAmt03 = 0;
            double soFee = 0;
            double curyLineDiscAmt = 0;
            double ordQty = 0;
            double curyLineAmt = 0;

            foreach (OM10100_pgOrderDet_Result det in _lstOrdDet)
            {
                taxAmt00 += det.TaxAmt00;
                taxAmt01 += det.TaxAmt01;
                taxAmt02 += det.TaxAmt02;
                taxAmt03 += det.TaxAmt03;
                soFee += det.SOFee;
                curyLineAmt += det.LineAmt;
                curyLineDiscAmt += det.DiscAmt + det.ManuDiscAmt;
                ordQty += det.LineQty;
            }

            _objOrder.SOFeeTot = Math.Round(soFee, 0);
            double curyTaxAmt = Math.Round(taxAmt00 + taxAmt01 + taxAmt02 + taxAmt03, 0);
            _objOrder.LineDiscAmt = Math.Round(curyLineDiscAmt, 0);
            _objOrder.LineAmt = Math.Round(curyLineAmt, 0);
            double txblAmt = 0;
            if (_objType.DiscType == "B")
            {
                txblAmt = curyLineAmt;
            }
            else
            {
                if (_objType.TaxFee)
                {
                    txblAmt = curyLineAmt - curyTaxAmt.ToDouble() + _objOrder.SOFeeTot * 0.1;
                }
                else
                {
                    txblAmt = curyLineAmt - curyTaxAmt.ToDouble();
                }
            }
            // rewardAmt: Tiền thưởng trưng bày
            var rewardAmt = 0.0;
            if (!string.IsNullOrWhiteSpace(_objOrder.RewardID) && _objOrder.OrderType == "IN")
            {
                var rewardobj = _app.OM10100_pdRewardAmt(_objOrder.RewardID, _objOrder.BranchID, _objOrder.SlsPerID, _objOrder.CustID).FirstOrDefault();
                if (rewardobj != null)
                {
                    if (string.IsNullOrWhiteSpace(rewardobj.DisplayID))
                    {
                        throw new MessageException("2016101901", new string[] { _objOrder.RewardID.Trim().TrimEnd(',') });
                    }
                    rewardAmt = rewardobj.RewardAmt.HasValue ? rewardobj.RewardAmt.Value : 0;
                    _objOrder.RewardID = rewardobj.DisplayID.PassNull();
                    _objOrder.RewardAmt = rewardAmt;
                }
                else
                {
                    throw new MessageException("2016101901", new string[] { _objOrder.RewardID });
                }
            }
            if (_objOrder.OrderType == "IR")
            {
                rewardAmt = _objOrder.RewardAmt;
            }
            _objOrder.OrdAmt = Math.Round(txblAmt + _objOrder.FreightAmt + _objOrder.MiscAmt + curyTaxAmt + _objOrder.SOFeeTot - _objOrder.VolDiscAmt - _objOrder.OrdDiscAmt - rewardAmt - _objOrder.ManualDiscAmt, 0);
            //  ordAmt = Math.round(txblAmtTot + taxAmtTot - volDiscAmt - ordDiscAmt - manualDiscAmt - accumulateAmt); // PDA
            _objOrder.OrdQty = Math.Round(ordQty, 0);
        }
        private bool DelTax(int i)
        {
            if (i < 0)
            {
                return false;
            }

            if (_objOrder.Status == "C" || _objOrder.Status == "L" || _objOrder.Status == "I")
            {
                return false;
            }

            string lineRef = _lstOrdDet[i].LineRef;
            for (int j = _lstTax.Count - 1; j >= 0; j--)
            {
                if (_lstTax[j].LineRef == lineRef)
                {
                    _lstTax.RemoveAt(j);
                }
            }
            ClearTax(i);
            CalcTaxTotal();
            CalcDet();
            return true;
        }
        private void ClearTax(int index)
        {
            _lstOrdDet[index].TaxId00 = string.Empty;
            _lstOrdDet[index].TaxAmt00 = 0;
            _lstOrdDet[index].TxblAmt00 = 0;

            _lstOrdDet[index].TaxId01 = string.Empty;
            _lstOrdDet[index].TaxAmt01 = 0;
            _lstOrdDet[index].TxblAmt01 = 0;

            _lstOrdDet[index].TaxId02 = string.Empty;
            _lstOrdDet[index].TaxAmt02 = 0;
            _lstOrdDet[index].TxblAmt02 = 0;

            _lstOrdDet[index].TaxId03 = string.Empty;
            _lstOrdDet[index].TaxAmt03 = 0;
            _lstOrdDet[index].TxblAmt03 = 0;
        }

        private string LastLineRef(bool pdaOrder)
        {
            int num = 0;
            if (!pdaOrder)
            {
                foreach (OM10100_pgOrderDet_Result det in _lstOrdDet)
                {
                    if (det.LineRef.PassNull() != string.Empty && det.LineRef.ToInt() > num)
                    {
                        num = det.LineRef.ToInt();
                    }
                }
            }
            else
            {
                var lstOrd = _app.OM_PDASalesOrdDet.Where(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr).ToList();
                if (lstOrd.Count > 0)
                {
                    foreach (var det in lstOrd)
                    {
                        if (det.LineRef.PassNull() != string.Empty && det.LineRef.ToInt() > num)
                        {
                            num = det.LineRef.ToInt();
                        }
                    }
                }
                else
                {
                    foreach (OM10100_pgOrderDet_Result det in _lstOrdDet)
                    {
                        if (det.LineRef.PassNull() != string.Empty && det.LineRef.ToInt() > num)
                        {
                            num = det.LineRef.ToInt();
                        }
                    }
                }
            }
            num++;
            return LastLineRef(num.ToString());
        }
        private bool UpdateAllocSO(string invtID, string siteID, double oldQty, double newQty, int decQty, bool freeItem = false)
        {
            if (IsStkItem(invtID))
            {
                IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID);
                if (objItemSite != null && _calcPromoOnly == 0)
                {
                    if (!_objIN.NegQty && newQty > 0 && ((objItemSite.QtyAvail - objItemSite.QtyAllocPDASO) + oldQty - newQty) < 0)
                    {
                        return false;
                    }
                    objItemSite.QtyAllocSO = Math.Round(objItemSite.QtyAllocSO + newQty - oldQty, decQty);
                    objItemSite.QtyAvail = Math.Round(objItemSite.QtyAvail + oldQty - newQty, decQty);
                    if (freeItem)
                    {
                        string siteInvtID = siteID + "@@" + invtID;
                        if (_lstFreeItemQtyAvail.ContainsKey(siteInvtID))
                        {
                            _lstFreeItemQtyAvail[siteInvtID] = objItemSite.QtyAvail;
                        }
                        else
                        {
                            _lstFreeItemQtyAvail.Add(siteInvtID, objItemSite.QtyAvail);
                        }
                    }
                }
                return true;
            }
            return false;
        }
        private bool UpdateAllocLotSO(string invtID, string siteID, string lotSerNbr, double oldQty, double newQty, int decQty)
        {
            if (IsStkItem(invtID))
            {
                var objItemLot = _app.IN_ItemLot.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID && p.LotSerNbr == lotSerNbr);
                if (objItemLot != null && _calcPromoOnly == 0)
                {
                    if (!_objIN.NegQty && newQty > 0 && ((objItemLot.QtyAvail - objItemLot.QtyAllocPDASO) + oldQty - newQty) < 0)
                    {
                        return false;
                    }
                    objItemLot.QtyAllocSO = Math.Round(objItemLot.QtyAllocSO + newQty - oldQty, decQty);
                    objItemLot.QtyAvail = Math.Round(objItemLot.QtyAvail + oldQty - newQty, decQty);
                }
                return true;
            }
            return true;
        }
        private IN_UnitConversion SetUOM(string invtID, string fromUnit, string classID , string stkUnit)
        {            
            if (classID == "")
            {
                OM10100_pdInventoryByID_Result objInvt = GetInventory(invtID);
                classID = objInvt.ClassID;
                if (stkUnit == "")
                {
                    stkUnit = objInvt.StkUnit;
                }
            }
            if (!string.IsNullOrEmpty(fromUnit))
            {
                IN_UnitConversion data = _app.IN_UnitConversion.FirstOrDefault(p =>
                        p.UnitType == "3" && p.ClassID == "*" && p.InvtID == invtID && p.FromUnit == fromUnit &&
                        p.ToUnit == stkUnit);
                if (data != null)
                {
                    return data;
                }
                data = _app.IN_UnitConversion.FirstOrDefault(p =>
                        p.UnitType == "2" && p.ClassID == classID && p.InvtID == "*" && p.FromUnit == fromUnit &&
                        p.ToUnit == stkUnit);
                if (data != null)
                {
                    return data;
                }
                data = _app.IN_UnitConversion.FirstOrDefault(p =>
                        p.UnitType == "1" && p.ClassID == "*" && p.InvtID == "*" && p.FromUnit == fromUnit &&
                        p.ToUnit == stkUnit);
                if (data != null)
                {
                    return data;
                }
                throw new MessageException("2525", new[] { invtID });
            }
            return null;
        }
        private int CheckQtyAvail(string invtID, string discID, string discSeq, string breakLineRef, bool isSetPrioritySite, ref string siteID, string unitMultDiv, double lineQty, double unitRate, bool freeItem, string lineRef, string siteType, double freeItemQty)
        {
            if (_calcPromoOnly == 1)
            {
                var site = _app.OM10100_pdGetFreeItemSite4CalcPromo(discID, discSeq, breakLineRef, invtID, siteID, _objOrder.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (site != string.Empty)
                {
                    siteID = site;
                }
                return 0;
            }
            double qty1 = unitMultDiv == "M" ? lineQty * unitRate : lineQty / unitRate;
            string siteTemp = siteID;
            double qty = 0;CalculateInvtTotals(invtID, siteID, lineRef);

            if (freeItem)
            {
                qty += qty1;
            }
            var qtyAvail = 0.0;
            string siteInvtID = siteID + "@@" + invtID;
            if (_lstFreeItemQtyAvailUsed.ContainsKey(siteInvtID)){
                qtyAvail = _lstFreeItemQtyAvailUsed[siteInvtID];
            }
            else 
            {
                IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteTemp && p.InvtID == invtID);
                qtyAvail = (objItemSite == null) ? 0 : objItemSite.QtyAvail;
                _lstFreeItemQtyAvailUsed.Add(siteInvtID, qtyAvail);
            }
            if (isSetPrioritySite)
            {
                qtyAvail = 0;
            }
           
            if (_objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
            {
                _qtyAvailPopup += (qtyAvail / freeItemQty);
                if (qty > qtyAvail)
                {
                    if (CheckQtybySiteType(invtID, discID, discSeq, breakLineRef, ref siteID, siteType, _objOrder.BranchID, qty))
                    {
                        return 0;
                    }
                    
                    return 1;
                }
                if (qty1 > qtyAvail)
                {
                    if (CheckQtybySiteType(invtID, discID, discSeq, breakLineRef, ref siteID, siteType, _objOrder.BranchID, qty1))
                    {
                        return 0;
                    }
                    return 2;
                }
            }
            return 0;
        }

        private int CheckQtyAvail4AddFreeItem(string invtID, string discID, string discSeq, string breakLineRef, bool isSetPrioritySite, ref string siteID, string unitMultDiv, double lineQty, double unitRate, bool freeItem, string lineRef, string siteType)
        {
            if (_calcPromoOnly == 1)
            {
                return 0;
            }
            double qty1 = unitMultDiv == "M" ? lineQty * unitRate : lineQty / unitRate;
            string siteTemp = siteID;
            double qty = CalculateInvtTotals(invtID, siteID, lineRef);
            if (freeItem)
            {
                qty += qty1;
            }
            var qtyAvail = 0.0;
            IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteTemp && p.InvtID == invtID);
            qtyAvail = (objItemSite == null) ? 0 : objItemSite.QtyAvail;
            if (isSetPrioritySite)
            {
                qtyAvail = 0;
            }
            if (_objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
            {
                if (qty > qtyAvail)
                {
                    if (CheckQtybySiteType(invtID, discID, discSeq, breakLineRef, ref siteID, siteType, _objOrder.BranchID, qty))
                    {
                        return 0;
                    }
                    return 1;
                }
                if (qty1 > qtyAvail)
                {
                    if (CheckQtybySiteType(invtID, discID, discSeq, breakLineRef, ref siteID, siteType, _objOrder.BranchID, qty1))
                    {
                        return 0;
                    }
                    return 2;
                }
            }
            return 0;
        }
        private int CheckQtyAvailInGroup(string invtID, string siteID, string unitMultDiv, double lineQty, double unitRate, bool freeItem, string lineRef)
        {
            string siteTemp = siteID;
            if (_calcPromoOnly == 1)
            {
                return int.MaxValue;
            }
            double qty1 = (unitMultDiv == "M") ? lineQty * unitRate : lineQty / unitRate;
            double qty = CalculateInvtTotals(invtID, siteID, lineRef);

            IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteTemp && p.InvtID == invtID);

            if (objItemSite == null)
            {
                objItemSite = new IN_ItemSite();
            }

            if (_objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
            {
                if ((qty + qty1) > objItemSite.QtyAvail)
                {
                    var qtyReturn = (objItemSite.QtyAvail + qty).ToInt();
                    qtyReturn = (unitMultDiv == "M") ? (qtyReturn / unitRate).ToInt() : (qtyReturn * unitRate).ToInt();
                    return qtyReturn;
                }
            }
            return 0;
        }

        private bool CheckQtybySiteType(string invtID, string discID, string discSeq, string breakLineRef, ref string siteID, string siteType, string branchID, double qty)
        {
            string lstSiteID = string.Empty;
            string lstQty = string.Empty;
            if (_screenNbr != "OM20500")
            {
                foreach (var item in _lstFreeItemQtyAvail)
                {
                    if (item.Key.EndsWith("@@" + invtID))
                    {
                        lstSiteID += item.Key.Split(new string[] { "@@" }, StringSplitOptions.RemoveEmptyEntries)[0] + ",";
                        lstQty += item.Value.ToString() + ",";
                    }
                }
            }
            lstSiteID = lstSiteID.TrimEnd(',');
            lstQty = lstQty.TrimEnd(',');
            var objSite = _app.OM10100_pdGetSiteFollowSiteType(invtID, siteID, branchID, qty, Current.UserName, Current.CpnyID, Current.LangID, lstSiteID, lstQty, discID, discSeq, breakLineRef).FirstOrDefault();
            if (objSite != null && objSite.QtyAvail > 0)
            {
                siteID = objSite.SiteID;
                return true;
            }
            else
            {
                var site = _app.OM10100_pdGetFreeItemSite4CalcPromo(discID, discSeq, breakLineRef, invtID, siteID, _objOrder.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (site != string.Empty)
                {
                    siteID = site;
                }
                return false;
            }
        }

        private TotalQtyAmt TotalInvtV2(string invtID, string siteID, bool isDeduct)
        {
            double qty = 0;
            double amt = 0;
            double soFee = 0;
            List<string> lstGroupRefLineRef = new List<string>();
            if (isDeduct)
            {
                qty = _lstOldOrdDet.Where(p =>
                                                p.InvtID == invtID 
                                                && (siteID == "" || siteID != "" && p.SiteID == siteID)
                                                && !p.FreeItem
                                                && p.BOType != "R").Sum(p => p.DumyLineQty);
                amt = _lstOldOrdDet.Where(p =>
                                                p.InvtID == invtID
                                                && (siteID == "" || siteID != "" && p.SiteID == siteID)
                                                && !p.FreeItem &&
                                                p.BOType != "R").Sum(p => (p.DumyLineAmt));
            }
            else
            {
                // Chưa sửa
                qty = _lstOldOrdDet.Where(p =>
                                                p.InvtID == invtID
                                                && (siteID == "" || siteID != "" && p.SiteID == siteID)
                                                && !p.FreeItem && 
                                                p.BOType != "R").Sum(p => p.StkQty);
                amt = _lstOldOrdDet.Where(p =>
                                                p.InvtID == invtID
                                                && (siteID == "" || siteID != "" && p.SiteID == siteID) 
                                                && !p.FreeItem && 
                                                p.BOType != "R").Sum(p => p.LineAmt);
            }
            if (_objOM.InlcSOFeeDisc)
            {
                soFee = _lstOldOrdDet.Where(p => 
                                                p.InvtID == invtID
                                                && (siteID == "" || siteID != "" && p.SiteID == siteID) 
                                                && p.BOType != "R")
                                                .Sum(p => p.SOFee);
            }
            amt = amt + soFee;
            foreach (var item in _lstOldOrdDet)
            {
                if (item.InvtID == invtID && (siteID == "" || siteID != "" && item.SiteID == siteID) && !item.FreeItem && string.IsNullOrWhiteSpace(item.DisplayID) && item.BOType != "R")
                {
                    if (!lstGroupRefLineRef.Any(x => x == item.LineRef))
                    {
                        lstGroupRefLineRef.Add(item.LineRef);
                    }
                }
            }
            return new TotalQtyAmt(qty, amt, lstGroupRefLineRef);
        }

        private TotalQtyAmt TotalItemClassV2(string classID, string uom, bool isDeduct)
        {// Chưa thấy check trường hợp Ktra theo trọng lượng StkWeight
            double soFee = 0;
            double qty = 0;
            double amt = 0;
            List<string> lstGroupRefLineRef = new List<string>();
            if (!isDeduct)
            {
                var lstqty = (from p in _lstOldOrdDet
                              where
                                  p.ItemPriceClass == classID && !p.FreeItem && 
                                  p.BOType != "R"
                              select p).ToList();
                foreach (var objqty in lstqty)
                {
                    qty += (objqty.DumyLineQty / OM_GetCnvFactFromUnit(objqty.InvtID, uom, objqty.StkUnit).ToInt()).ToInt();
                }
                amt = (from p in _lstOldOrdDet
                       where
                           p.ItemPriceClass == classID && !p.FreeItem && 
                           p.BOType != "R"
                       select p).Sum(p => p.LineAmt);
            }
            else
            {
                var lstqty = (from p in _lstOldOrdDet
                              where
                                  p.ItemPriceClass == classID && !p.FreeItem && 
                                  p.BOType != "R"
                              select p).ToList();
                foreach (var objqty in lstqty)
                {
                    qty += (objqty.StkQty / OM_GetCnvFactFromUnit(objqty.InvtID, uom, objqty.StkUnit).ToInt()).ToInt();
                }
                amt = (from p in _lstOldOrdDet
                       where
                           p.ItemPriceClass == classID && !p.FreeItem && 
                           p.BOType != "R" && p.SlsUnit == uom
                       select p).Sum(p => p.LineAmt);
            }
            if (_objOM.InlcSOFeeDisc)
            {
                soFee = (from p in _lstOldOrdDet
                         where
                             p.ItemPriceClass == classID &&
                             p.BOType != "R" && p.SlsUnit == uom
                         select p).Sum(p => p.SOFee);
            }
            amt += soFee;

            foreach (var item in _lstOldOrdDet)
            {
                if (item.ItemPriceClass == classID && !item.FreeItem && item.BOType != "R")
                {
                    if (!lstGroupRefLineRef.Any(x => x == item.LineRef))
                    {
                        lstGroupRefLineRef.Add(item.LineRef);
                    }
                }
            }
            return new TotalQtyAmt(qty, amt, lstGroupRefLineRef);
        }

        private void UpdateDocDiscAmt()
        {
            double docDiscAmt = _docDiscAmt + _objOrder.OrdDiscAmt + _objOrder.ManualDiscAmt;
            double totDocDiscAmt = 0;
            int lastRowIndex = 0;
            double docDiscPct = 0;
            if (_objOrder.LineAmt != 0)
            {
                docDiscPct = docDiscAmt / _objOrder.LineAmt;//Math.Round(docDiscAmt / _objOrder.LineAmt, 4);
            }
            for (int i = 0; i < _lstOrdDet.Count; i++)
            {
                if (!_lstOrdDet[i].FreeItem)
                {
                    lastRowIndex = i;
                }
            }
            for (int i = 0; i < _lstOrdDet.Count; i++)
            {
                if (!_lstOrdDet[i].FreeItem)
                {
                    if (!_objOrder.DoNotCalDisc.ToBool() && _objType.SalesType != "PRO" && _objOrder.Status != "C" && _objOrder.Status != "L")
                    {
                        if (_objType.ARDocType == "NA" && _objType.INDocType == "CM")
                        {

                        }
                        else
                        {
                            if (i == lastRowIndex)
                            {
                                _lstOrdDet[i].DocDiscAmt = Math.Round(docDiscAmt - totDocDiscAmt, 0);
                            }
                            else
                            {
                                _lstOrdDet[i].DocDiscAmt = Math.Round(docDiscPct * _lstOrdDet[i].LineAmt, 0);
                                totDocDiscAmt += _lstOrdDet[i].DocDiscAmt;
                            }
                        }
                    }
                    
                    DelTax(i);
                    CalcTax(i);
                    CalcTaxTotal();
                }
            }
        }
        private double SlspersonStock(string invtID)
        {
            double? stock = _app.OM10100_pdSalespersonStock(_objOrder.SlsPerID, _objOrder.InvcNote, _objOrder.OrderDate).FirstOrDefault();
            if (stock != null)
            {
                return stock.Value;
            }
            return 0;
        }
        private void UpdateFeeItemQtyAmtUsed(string invtID, string siteID, double qtyUsed)
        {
            string siteInvtID = siteID + "@@" + invtID;
            if (_lstFreeItemQtyAvailUsed.ContainsKey(siteInvtID))
            {
                _lstFreeItemQtyAvailUsed[siteInvtID] -= qtyUsed;
            }
            else
            {
                _lstFreeItemQtyAvailUsed.Add(siteInvtID, -qtyUsed);
            }
        }
        #endregion

        #region Data

        private void DeleteOrder(bool pdaOrder)
        {
            var access = new AccessRight { Delete = true, Insert = true, Release = true, Update = true };
            if (!pdaOrder)
            {
                access = Session["OM10100"] as AccessRight;
            }

            if (!access.Delete)
            {
                throw new MessageException(MessageType.Message, "728");
            }
            GetSetup();

            OM_SalesOrd order = _app.OM_SalesOrd.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr);
            if (order != null && _objOrder.Status != "N")
            {
                throw new MessageException(MessageType.Message, "20140709");
            }

            if (order == null)
            {
                throw new MessageException(MessageType.Message, "8012", parm: new[] { _objOrder.OrderNbr });
            }

            double oldQty = 0;

            OM_OrdAddr ordAddr = _app.OM_OrdAddr.FirstOrDefault(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID);
            if (ordAddr != null)
            {
                _app.OM_OrdAddr.DeleteObject(ordAddr);
            }
            if (_objOrder.OrderType == "IN" && (!pdaOrder || _screenNbr != "OM20500" || _calcPromoOnly != 0))
            {
                ClearGroupDocBudget();
            }
            _lstOrdDet = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();
            foreach (var detLoadResult in _lstOrdDet)
            {
                OM_SalesOrdDet det = _app.OM_SalesOrdDet.FirstOrDefault(
                        p =>
                            p.BranchID == _objOrder.BranchID &&
                            p.OrderNbr == _objOrder.OrderNbr &&
                            p.LineRef == detLoadResult.LineRef);
                if (det != null)
                {
                    if (det.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" &&
                        _objType.INDocType != "NA" && _objType.INDocType != "RC")
                    {
                        oldQty = det.UnitMultDiv == "D"
                            ? det.LineQty / det.UnitRate
                            : det.LineQty * det.UnitRate;
                        UpdateAllocSO(det.InvtID, det.SiteID, oldQty, 0, 0);
                    }

                    var lstLot = _app.OM_LotTrans.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr && p.OMLineRef == det.LineRef).ToList();
                    foreach (var lot in lstLot)
                    {
                        if (det.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
                        {
                            oldQty = Math.Round(lot.UnitMultDiv == "D" ? lot.Qty / lot.CnvFact : lot.Qty * lot.CnvFact, 0);
                            UpdateAllocLotSO(lot.InvtID, lot.SiteID, lot.LotSerNbr, oldQty, 0, 0);
                        }
                        _app.OM_LotTrans.DeleteObject(lot);
                    }
                    _app.OM_SalesOrdDet.DeleteObject(det);
                    if (_calcPromoOnly == 0)
                    {
                        if (detLoadResult.FreeItem == true && detLoadResult.DisplayID != "" && detLoadResult.OrderType == "IN" && _messDisplayID != "2018101060" && !_isNotEnoughBudgetOrSite)
                        {
                            var obj = _app.OM_TDisplayReward.FirstOrDefault(p => p.DisplayID == detLoadResult.DisplayID && p.PeriodID == detLoadResult.DisplayPeriodID && p.InvtID == detLoadResult.InvtID && p.CustID == _objOrder.CustID);
                            if (obj != null)
                            {
                                obj.QtyAmtUsed = obj.QtyAmtUsed - oldQty;
                                if (obj.QtyAmtUsed < 0)
                                {
                                    obj.QtyAmtUsed = 0;
                                }
                                obj.QtyAmtAvail = obj.Qty - obj.QtyAmtUsed;
                                obj.LUpd_DateTime = DateTime.Now;
                                obj.LUpd_Prog = _screenNbr;
                                obj.LUpd_User = Current.UserName;
                            }
                        }
                    }
                } //if(det!=null)
            } //foreach (var detLoadResult in _lstOrdDet)

            if (order.StationID.PassNull() == string.Empty)
            {
                var debit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.BranchID == order.BranchID && p.OrderNbr == order.OrderNbr && p.CustID == order.CustID);
                if (debit != null)
                {
                    _app.OM_SalesOrdDebit.DeleteObject(debit);
                }
            }
            else
            {
                var debit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.BranchID == order.BranchID && p.OrderNbr == order.StationID && p.CustID == order.CustID);
                if (debit != null)
                {
                    double totMarkDisc = _lstOrdDet.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);
                    debit.RemainDebtPoint += totMarkDisc;
                    debit.LUpd_DateTime = DateTime.Now;
                    debit.LUpd_Prog = _screenNbr;
                    debit.LUpd_User = Current.UserName;
                }
            }


            _lstDisc = _app.OM_OrdDisc.Where(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID).ToList();
            foreach (OM_OrdDisc currentDisc in _lstDisc)
            {
                _app.OM_OrdDisc.DeleteObject(currentDisc);
            }
            _lstManualDisc = _app.OM_OrdManualDisc.Where(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID).ToList();
            foreach (var currentDisc in _lstManualDisc)
            {
                _app.OM_OrdManualDisc.DeleteObject(currentDisc);
            }
            //delete gift
            var _lstOMGift = _app.OM_SalesOrdGift.Where(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID).ToList();
            foreach (OM_SalesOrdGift currentGift in _lstOMGift)
            {
                _app.OM_SalesOrdGift.DeleteObject(currentGift);
            }
            var _lstAccumulate = _app.OM_OrdAccumulate.Where(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID).ToList();
            foreach (OM_OrdAccumulate current in _lstAccumulate)
            {
                _app.OM_OrdAccumulate.DeleteObject(current);
            }
            _app.OM_SalesOrd.DeleteObject(order);
            _app.SaveChanges();
        }        
        
        private void SaveData(bool pdaOrder)
        {
            _messBudget = "";
            _lstOldOrdDet = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();            
            var access = new AccessRight()
            {
                Delete = true,
                Insert = true,
                Release = true,
                Update = true
            };
            if (!pdaOrder)
            {
                access = Session["OM10100"] as AccessRight;
            }

            if (_objOrder.OrderNbr == string.Empty && !access.Update
                || _objOrder.OrderNbr != string.Empty && !access.Insert)
            {
                throw new MessageException(MessageType.Message, "728");
            }
            // -Check close date setup-  
            CheckCloseDate(_objOrder.Status, _handle, pdaOrder);
            // Get Setup data 
            GetSetup();
            //if (_objOrder.OrderType == "IN")
            //{
            //    _lstManualDisc = _app.OM_OrdManualDisc.Where(x => x.OrderNbr == _objOrder.OrderNbr && x.BranchID == _objOrder.BranchID).ToList();
            //}
            //else 
            if (_objOrder.OrderType == "IR")
            {
                _lstManualDisc = _app.OM_OrdManualDisc.Where(x => x.OrderNbr == _objOrder.OrigOrderNbr && x.BranchID == _objOrder.BranchID).ToList();
            }
            else
            {
                _lstManualDisc = _app.OM_OrdManualDisc.Where(x => x.OrderNbr == _objOrder.OrderNbr && x.BranchID == _objOrder.BranchID).ToList();
            }

            if (_handle == "C" || _handle == "V" || _handle == "L")
            {
                // Check release
                HandleReaseBeforeSave();
                return;
            }
            else
            {
                string intvtDis = "";

                // Get customer trước khi lấy các DiscSeq
                

                if (pdaOrder)
                {
                    var lstShipToId = _app.OM10100_pcShipToId(_objOrder.CustID, _objOrder.BranchID).ToList();
                    var obj = lstShipToId.Where(p => p.ShipToId == _objCust.DfltShipToId).FirstOrDefault();
                    if (obj == null)
                    {
                        obj = lstShipToId.FirstOrDefault();
                    }
                    string shipID = (obj == null ? _objCust.DfltShipToId : obj.ShipToId);
                    _objAddress = _app.AR_SOAddress.Where(p => p.BranchID == _objOrder.BranchID && p.CustId == _objOrder.CustID && p.ShipToId == shipID).FirstOrDefault();
                    if (_objAddress == null)
                    {
                        _objAddress = new AR_SOAddress();
                        _objAddress.ResetET();
                    }
                }

                CheckData_Order(pdaOrder);// Validate data

                _discLineRef = "00001";
                _lineRef = string.Empty;
                // Customize chỉ lấy những Mặt hàng cần????
                _lstPrice = _app.OM10100_pdSOPrice(_objOrder.BranchID, _objCust.CustId, "", _objOrder.OrderDate.ToString("yyyy-MM-dd")).ToList();
                foreach (OM10100_pgOrderDet_Result det in _lstOrdDet)
                {
                    intvtDis += det.InvtID + ",";                
                }

                _lstSeqV2 = _app.OM10100_pdGetDiscSeq(_objOrder.BranchID, _objOrder.OrderDate, _objOrder.CustID, _objOrder.ClassID, _objOrder.PriceClassID, _objOrder.SlsPerID, intvtDis, Current.UserName, Current.CpnyID, Current.LangID).ToList();


                if (!_objOrder.DoNotCalDisc.ToBool() && _objType.SalesType != "PRO" && _objOrder.Status != "C" && _objOrder.Status != "L")
                {
                    for (int i = _lstDisc.Count - 1; i >= 0; i--)
                    {
                        var seq = GetDiscSeqActive(_lstDisc[i].DiscID, _lstDisc[i].DiscSeq);
                        if (seq.PctDiscountByLevel)
                        {
                            _lstDisc.RemoveAt(i);
                        }
                    }
                }
                foreach (OM10100_pgOrderDet_Result det in _lstOrdDet)
                {
                    double stkQty = 0;
                    double stkPrice = 0;
                    if (det.UnitMultDiv == "M")
                    {
                        stkQty = det.LineQty * (det.UnitRate == 0 ? 1 : det.UnitRate);
                        stkPrice = det.SlsPrice / (det.UnitRate == 0 ? 1 : det.UnitRate);
                    }
                    else
                    {
                        stkQty = det.LineQty / (det.UnitRate == 0 ? 1 : det.UnitRate);
                        stkPrice = det.SlsPrice * (det.UnitRate == 0 ? 1 : det.UnitRate);
                    }
                    // Không cập nhật tiền khi không tính lại KM
                    if (!_objOrder.DoNotCalDisc.ToBool() && _objType.SalesType != "PRO" && _objOrder.Status != "C" && _objOrder.Status != "L")
                    {
                        CheckSubInLineQty(det, stkQty, stkPrice, string.Empty, ref _discLineRef);
                    }
                    // dùng để tính KM theo thứ tự ưu tiên
                    det.DumyLineQty = stkQty;
                    det.StkPrice = stkPrice;
                    det.DumyLineAmt = det.LineAmt;                    
                }
                
                var lstFreeBonus = _lstChoice.Where(x => x.Index == "KMTienDu" && x.Sel).ToList();
                _lstChoice = _lstChoice.Where(x => x.Index != "KMTienDu").ToList();
                if (!_objOrder.DoNotCalDisc.ToBool() && _objType.SalesType != "PRO" && _objOrder.Status != "C" && _objOrder.Status != "L")
                {
                    ClearGroupDocBudget();
                    ClearFreeItemInGrid();
                    ClearGroupDocDisc();
                    _lineRef = LastLineRef(pdaOrder); // Get last lineRef      
                    _lstMaxLot = _app.OM10100_pdGetMaxLotByCustomer(_objOrder.CustID, _objOrder.BranchID, _objOrder.OrderNbr, _objOrder.OrderDate, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                    List<OM10100_pdGetDiscSeq_Result> lstDocDisc = new List<OM10100_pdGetDiscSeq_Result>();
                    // Line & group discount
                    _objOrder.VolDiscAmt = GetLineGroupDisc(ref lstDocDisc);
                    CalcDet();
                    // Get Doc discount
                    _docDiscAmt = GetDiscDocSetup(lstDocDisc);
                    _objOrder.VolDiscAmt = _objOrder.VolDiscAmt + _docDiscAmt;
                    _lstOrdDet = _lstOldOrdDet;
                    CalcDet();

                    for (int i = 0; i < _lstOrdDet.Count; i++)
                    {
                        if (_lstOrdDet[i].FreeItem)
                        {
                            CalcTax(i);
                        }
                    }
                }
                if (_screenNbr == "OM20500")
                {
                    CalcHeaderManulDisc();       
                }
                        
                if (_choice)
                {
                    GetChoiceDiscount(pdaOrder);
                }
                else
                {
                    if (lstFreeBonus.Count > 0)
                    {
                        AddFreeBonus(lstFreeBonus);
                        CalcDet();

                        for (int i = 0; i < _lstOrdDet.Count; i++)
                        {
                            if (_lstOrdDet[i].FreeItem)
                            {
                                CalcTax(i);
                            }
                        }
                    }
                }

                // check so sl KM tra ve > sl mua
                if (_objOrder.OrderType == "IR")
                {
                    var origOrder = _app.OM_SalesOrd.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrigOrderNbr);
                    if (origOrder != null && origOrder.OrderType != "OO")
                    {
                        var lstBKDet = _app.OM10100_pdBackOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, _objOrder.OrigOrderNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                        foreach (var item in _lstOrdDet)
                        {
                            double currentQty = 0;
                            double bkQty = 0;
                            OM10100_pdBackOrderDet_Result bkDet = null;
                            if (item.FreeItem && item.DiscCode.PassNull() == string.Empty)
                            {
                                currentQty = _lstOrdDet.Where(p => p.InvtID == item.InvtID && p.FreeItem && p.DiscCode.PassNull() == string.Empty).Sum(p => p.UnitMultDiv == "M" ? p.UnitRate * p.LineQty : p.LineQty / p.UnitRate);
                                bkDet = lstBKDet.FirstOrDefault(p => p.InvtID == item.InvtID + "@KM2");
                            }
                            bkQty = bkDet != null ? bkDet.Qty.Value : 0;

                            if (currentQty > bkQty)
                            {
                                //  IN_Inventory objInvt = GetInventory(item.InvtID);
                                string msgInvt = item.InvtID;
                                if (item.FreeItem) { msgInvt += item.DiscCode.PassNull() != string.Empty ? " KM tay" : " KM tự động"; }
                                throw new MessageException("2017090801", new[] { msgInvt, bkQty.ToString("N0"), item.StkUnit });
                            }
                        }
                    }
                }
                
                UpdateDocDiscAmt();
                
                
                AR_Balances objARBalance = _app.AR_Balances.FirstOrDefault(p => p.CustID == _objOrder.CustID);
                if (objARBalance == null)
                {
                    objARBalance = new AR_Balances();
                }

                if (_objType.ARDocType != "CM" && (_objCust.CrRule == "A" || _objCust.CrRule == "B") &&
                    (_objCust.CrLmt - objARBalance.CurrBal) < _objOrder.OrdAmt)
                {
                    if (_objOM.CreditChkRule == "W")
                    {
                        Util.AppendLog(ref _logMessage, "735");
                    }
                    else if (_objOM.CreditChkRule == "E")
                    {
                        Util.AppendLog(ref _logMessage, "736");
                        _objOrder.CreditHold = true;
                    }
                }
                Save_Ord(pdaOrder);
                HandleReleaseAfterSave(pdaOrder);
            }
        }

        private void PreSaveData(FormCollection data)
        {
            _form = data; 
            _handle = data["Handle"].PassNull() == string.Empty ? "N" : data["Handle"].PassNull();

            #region -Get data++-
            if (_lstChoice == null)
            {
                var choiceHandler = new StoreDataHandler(data["lstChoice"]);
                _lstChoice = choiceHandler.ObjectData<DiscountChoice>().ToList();
            }

            if (_lstOrdDet == null)
            {
                var detHandler = new StoreDataHandler(data["lstOrdDet"]);
                _lstOrdDet = detHandler.ObjectData<OM10100_pgOrderDet_Result>().Where(p => Util.PassNull(p.LineRef) != string.Empty && Util.PassNull(p.InvtID) != string.Empty).ToList();
            }

            if (_lstSaveManualDisc == null)
            {
                var detdiscManualHandler = new StoreDataHandler(data["lstManualPromo"]);
                _lstSaveManualDisc = detdiscManualHandler.ObjectData<OM10100_pgManualPromo_Result>();
            }
            
            if (_lstLot == null)
            {
                var lotHandler = new StoreDataHandler(data["lstLot"]);
                _lstLot = lotHandler.ObjectData<OM_LotTrans>().Where(p => Util.PassNull(p.OMLineRef) != string.Empty && Util.PassNull(p.LotSerNbr) != string.Empty && Util.PassNull(p.InvtID) != string.Empty).ToList();
            }

            if (_lstTax == null)
            {
                var taxHandler = new StoreDataHandler(data["lstTax"]);
                _lstTax = taxHandler.ObjectData<OM10100_pgTaxTrans_Result>().ToList();
            }

            if (_lstDisc == null)
            {
                var discHandler = new StoreDataHandler(data["lstDisc"]);
                _lstDisc = discHandler.ObjectData<OM_OrdDisc>().ToList();
            }

            if (_lstGift == null)
            {
                var discHandler = new StoreDataHandler(data["lstGift"]);
                _lstGift = discHandler.ObjectData<OM10100_pgGift_Result>().Where(p => Util.PassNull(p.Code) != string.Empty && Util.PassNull(p.DiscType) != string.Empty && Util.PassNull(p.Descr) != string.Empty).ToList();
            }
            #endregion
            _objOrder = data.ConvertToObject<OM10100_pcOrder_Result>(false, new string[] { "DoNotCalDisc", "CreditHold" });
            if (_objOrder.OrderType == "IR")
            {
                _objOrder.ReturnFrom = data["selOrderType"].PassNull();
            }

            if (_objOrder.OrderType == "IR" && _handle != "V")
            {
                var lstBOrder = _app.OM10100_pcBackOrder(_objOrder.BranchID, "IN", _objOrder.CustID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                if (lstBOrder.FirstOrDefault(x => x.OrderNbr.ToUpper() == _objOrder.OrigOrderNbr.ToUpper()) != null)
                {
                    var orderAmt = data["amtAReward"].ToInt();
                    var docBal = data["txtDocBal"].ToInt();
                }
            }
            _objOrder.DoNotCalDisc = (data["DoNotCalDisc"].PassNull() != string.Empty ? 1 : 0).ToShort();
            _objOrder.CreditHold = (data["CreditHold"].PassNull() != string.Empty ? 1 : 0).ToBool();
            _objOrder.RewardID = data["rewardID"].PassNull();
            _objOrder.LTTContractNbr = data["LTTContractNbr"].PassNull();
            SaveData(false);
        }

        private void Delete_Det(string lineRef)
        {            
            OM_SalesOrdDet det = _app.OM_SalesOrdDet.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr && p.LineRef == lineRef);
            if (det != null)
            {
                double oldQty = 0;
                int orderType = (_objType.ARDocType == "CM" || _objType.ARDocType == "CC") ? -1 : 1;
                if (det.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
                {
                    oldQty = det.UnitMultDiv == "D" ? det.LineQty / det.UnitRate : det.LineQty * det.UnitRate;
                    UpdateAllocSO(det.InvtID, det.SiteID, oldQty, 0, 0, det.FreeItem);
                }

                var lots = _app.OM_LotTrans.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr && p.OMLineRef == det.LineRef).ToList();
                foreach (var lot in lots)
                {
                    if (det.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
                    {
                        oldQty = Math.Round(lot.UnitMultDiv == "D" ? lot.Qty / lot.CnvFact : lot.Qty * lot.CnvFact, 0);

                        UpdateAllocLotSO(lot.InvtID, lot.SiteID, lot.LotSerNbr, oldQty, 0, 0);
                    }
                    _app.OM_LotTrans.DeleteObject(lot);
                }
                for (int j = _lstLot.Count - 1; j >= 0; j--)
                {
                    if (_lstLot[j].OMLineRef == det.LineRef)
                    {
                        _lstLot.RemoveAt(j);
                    }
                }
                _app.OM_SalesOrdDet.DeleteObject(det);
            }
        }

        private void Save_Cust()
        {
            var objCust = _app.AR_Customer.FirstOrDefault(p => p.CustId == _objOrder.CustID && p.BranchID == _objOrder.BranchID);
            if (objCust != null)
            {
                objCust.LTTContractNbr = _objOrder.LTTContractNbr;
                if (string.IsNullOrWhiteSpace(objCust.Terms))
                {
                    objCust.Terms = _objOrder.Terms.PassNull();
                }
                objCust.LUpd_Datetime = DateTime.Now;
                objCust.LUpd_Prog = _screenNbr;
                objCust.LUpd_User = Current.UserName;
            }
        }

        private void Save_Ord(bool pdaOrder)
        {
            int outOfBudget = 0;
            if (_messBudget.Length > 0 || _outOfFreeBudget.Length > 0)
            {
                outOfBudget = 1;
            }
            if (_messSite.Length > 0 || _outOfManualFreeItemSite != string.Empty || _outOfFreeItemSite.Length > 0)
            {
                outOfBudget += 2;
            }
            CalcDet();
            var ord = _app.OM_SalesOrd.FirstOrDefault(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID);
            if (ord != null)
            {
                if (_screenNbr == "OM20500")
                {
                    if (_objOrder.tstamp.ToHex() != ord.tstamp.ToHex())
                    {
                        throw new MessageException(MessageType.Message, "2014071002");
                    }
                }
                else if (_form["tstamp"].ToHex() != ord.tstamp.ToHex())
                {
                    throw new MessageException(MessageType.Message, "2014071002");
                }
                Update_Ord(ord, false);
                Save_Addr(ord, false);
            }
            else
            {
                if (_calcPromoOnly == 3)
                {
                    var rand = new Random();
                    _objOrder.OrderNbr = rand.Next(10, 99) + DateTime.Now.ToString("HHmmss") + rand.Next(100000, 999999).ToString();
                }
                else
                {
                    _objOrder.OrderNbr = _app.OMNumbering(_objOrder.BranchID, "OrderNbr", _objOrder.OrderType).FirstOrDefault();
                    _objOrder.OrderNo = (short)(_app.OM_GetOrderNo(_objOrder.BranchID, _objOrder.SlsPerID.PassNull(), _objOrder.OrderDate, _objOrder.ShipDate.PassMin()).FirstOrDefault().Value + 1);
                }                
                ord = new OM_SalesOrd();
                Update_Ord(ord, true);
                _app.OM_SalesOrd.AddObject(ord);
                Save_Addr(ord, true);
                if (_objType.INDocType == "CM")
                {
                    Save_Accumulate(ord, true);
                }                
            }            
            if (pdaOrder)
            {
                if (outOfBudget == 0 || _budgetStatus == 2)
                {
                    SavePDAOrd(outOfBudget);
                }
                else if ((outOfBudget != 0 || _outOfManualFreeItemSite != string.Empty) && (_calcPromoOnly == 0 || _calcPromoOnly == 3))
                {
                    SaveDataCalcPromo(outOfBudget);

                    string mess = string.Empty;
                    if (_messMinPrice.Count > 0)
                    {
                        mess = GetMess(2018070901, new string[] { string.Join(", ", _messMinPrice) });
                    }
                    if (_messSite == string.Empty && _outOfFreeItemSite.Length > 0)
	                {
                        _messSite = _outOfFreeItemSite;
	                }
                    string mesSite = _messSite + (_messSite == "" ? "" : ", ") + (_outOfManualFreeItemSite == "" ? "" : _outOfManualFreeItemSite);
                    if (_messBudget == string.Empty && _outOfFreeBudget.Length > 0)
                    {
                        _messBudget = _outOfFreeBudget;
                    }
                    _logMessage = Json(new 
                    { 
                        CalcPromoOnly = true
                        , code = "2019033001"
                        , success = true
                        , errorMsg = _messBudget.TrimEnd().TrimEnd(',') + (mesSite != "" ? "@@" + mesSite.TrimEnd().TrimEnd(',') : "")
                    }, JsonRequestBehavior.AllowGet);
                    throw new Exception("Budget");
                }
            }
            Save_Debit(pdaOrder);
            Save_Cust();
            
            InsertOrdDiscApplyDetail();
            _app.SaveChanges();
        }
        private void Save_Debit(bool pdaOrder)
        {

            if (_objType.ARDocType != "CM" && _objType.ARDocType != "CC")
            {
                if (_objOrder.StationID.PassNull() == string.Empty)
                {

                    double totMarkDisc = _lstOrdDet.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);
                    if (!pdaOrder && _form["tstamp"].PassNull() != string.Empty)
                    {
                        var app2 = Util.CreateObjectContext<OM10100Entities>(false);
                        var objDbOrder = app2.OM_SalesOrd.FirstOrDefault(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID);
                        if (objDbOrder != null && objDbOrder.StationID.PassNull() != string.Empty)
                        {
                            var lstOld = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID);
                            var oldMarkDisc = lstOld.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);
                            var oldDebit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.BranchID == objDbOrder.BranchID && p.OrderNbr == objDbOrder.StationID && p.CustID == objDbOrder.CustID);

                            oldDebit.RemainDebtPoint += oldMarkDisc;
                            oldDebit.LUpd_DateTime = DateTime.Now;
                            oldDebit.LUpd_Prog = _screenNbr;
                            oldDebit.LUpd_User = Current.UserName;
                        }
                    }
                    var debit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID && p.CustID == _objOrder.CustID);
                    if (debit != null)
                    {
                        Update_Debit(debit, false);
                    }
                    else
                    {
                        debit = new OM_SalesOrdDebit();
                        Update_Debit(debit, true);
                        _app.OM_SalesOrdDebit.AddObject(debit);
                    }
                }
                else
                {
                    var debit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.OrderNbr == _objOrder.StationID && p.BranchID == _objOrder.BranchID && p.CustID == _objOrder.CustID);
                    if (debit == null)
                    {
                        throw new MessageException("2017021601", new string[] { _objOrder.StationID });
                    }
                    else
                    {
                        double totMarkDisc = _lstOrdDet.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);
                        if (!pdaOrder && _form["tstamp"].PassNull() != string.Empty)
                        {
                            var app2 = Util.CreateObjectContext<OM10100Entities>(false);
                            var objDbOrder = app2.OM_SalesOrd.FirstOrDefault(p => p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID);
                            if (objDbOrder.StationID.PassNull() != _objOrder.StationID.PassNull())
                            {
                                if (objDbOrder.StationID.PassNull() == string.Empty)
                                {
                                    var oldDebit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.BranchID == objDbOrder.BranchID && p.OrderNbr == objDbOrder.OrderNbr && p.CustID == objDbOrder.CustID);
                                    _app.OM_SalesOrdDebit.DeleteObject(oldDebit);
                                }
                                else
                                {
                                    var oldDebit = _app.OM_SalesOrdDebit.FirstOrDefault(p => p.BranchID == objDbOrder.BranchID && p.OrderNbr == objDbOrder.StationID && p.CustID == objDbOrder.CustID);
                                    var lstOld = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID);
                                    var oldMarkDisc = lstOld.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);

                                    oldDebit.RemainDebtPoint += oldMarkDisc;
                                    oldDebit.LUpd_DateTime = DateTime.Now;
                                    oldDebit.LUpd_Prog = _screenNbr;
                                    oldDebit.LUpd_User = Current.UserName;
                                }
                                debit.RemainDebtPoint -= totMarkDisc;
                            }
                            else
                            {
                                var lstOld = _app.OM10100_pgOrderDet(_objOrder.BranchID, _objOrder.OrderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID);
                                var oldMarkDisc = lstOld.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);
                                debit.RemainDebtPoint += oldMarkDisc - totMarkDisc;
                            }
                        }
                        else
                        {
                            debit.RemainDebtPoint -= totMarkDisc;
                        }
                        debit.LUpd_DateTime = DateTime.Now;
                        debit.LUpd_Prog = _screenNbr;
                        debit.LUpd_User = Current.UserName;

                        if (debit.RemainDebtPoint < 0)
                        {
                            throw new MessageException("2017021602", new string[] { _objOrder.StationID, debit.RemainDebtPoint.ToString("N2") });
                        }
                    }
                }
            }
        }
        private void Save_Addr(OM_SalesOrd ord, bool isNew)
        {
            OM_OrdAddr addr = _app.OM_OrdAddr.FirstOrDefault(p => p.OrderNbr == ord.OrderNbr && p.BranchID == _objOrder.BranchID);
            if (addr != null)
            {
                Update_Addr(addr, ord, false);
            }
            else
            {
                var newAddr = new OM_OrdAddr();
                Update_Addr(newAddr, ord, true);
                _app.OM_OrdAddr.AddObject(newAddr);
            }
            Save_Disc(ord, isNew);
        }
        private void Save_Accumulate(OM_SalesOrd ord, bool isNew)
        {            
            OM_OrdAccumulate acc = _app.OM_OrdAccumulate.FirstOrDefault(p => p.OrderNbr == ord.OrderNbr && p.BranchID == _objOrder.BranchID);
            OM_OrdAccumulate origAcc = _app.OM_OrdAccumulate.FirstOrDefault(p => p.OrderNbr == ord.OrigOrderNbr && p.BranchID == _objOrder.BranchID);
            if (acc == null && origAcc != null)
            {
                var lstAcc = _app.OM_OrdAccumulate.Where(p => p.OrderNbr == ord.OrigOrderNbr && p.BranchID == _objOrder.BranchID).ToList();
                foreach (var item in lstAcc)
                {
                    OM_OrdAccumulate objAcc = new OM_OrdAccumulate();
                    objAcc.ResetET();
                    objAcc.BranchID = item.BranchID;
                    objAcc.OrderNbr = ord.OrderNbr;
                    objAcc.LineRef = item.LineRef;
                    objAcc.Crtd_DateTime = DateTime.Now;
                    objAcc.Crtd_Prog = _screenNbr;
                    objAcc.Crtd_User = Current.UserName;
                    objAcc.AccumulateID = item.AccumulateID;
                    objAcc.RewardType = item.RewardType;
                    objAcc.SlsperID = item.SlsperID;
                    objAcc.Amt = item.Amt;
                    objAcc.Pct = item.Pct;
                    objAcc.InvtID = item.InvtID;
                    objAcc.Unit = item.Unit;
                    objAcc.Qty = item.Qty;
                    objAcc.SOLineRef = item.SOLineRef;
                    objAcc.LUpd_DateTime = DateTime.Now;
                    objAcc.LUpd_Prog = _screenNbr;
                    objAcc.LUpd_User = Current.UserName;
                    _app.OM_OrdAccumulate.AddObject(objAcc);
                }
            }

        }

        private void Save_Disc(OM_SalesOrd ord, bool isNew)
        {
            if (isNew && ord.OrigOrderNbr.PassNull() != string.Empty && ord.DoNotCalDisc == 1 && ord.OrderType == "IR")
            {
                _lstDisc = _app.OM_OrdDisc.Where(p => p.BranchID == ord.BranchID && p.OrderNbr == ord.OrigOrderNbr).ToList();
            }

            foreach (OM_OrdDisc currentDisc in _lstDisc)
            {
                OM_OrdDisc disc = _app.OM_OrdDisc.FirstOrDefault(p =>
                    p.DiscID == currentDisc.DiscID &&
                    p.DiscSeq == currentDisc.DiscSeq &&
                    p.BranchID == ord.BranchID &&
                    p.OrderNbr == ord.OrderNbr &&
                    p.LineRef == currentDisc.LineRef);
                if (disc != null && disc.EntityState != EntityState.Deleted &&
                    disc.EntityState != EntityState.Detached)
                {
                    Update_Disc(disc, currentDisc, ord, false);
                }
                else
                {
                    var newDisc = new OM_OrdDisc();
                    Update_Disc(newDisc, currentDisc, ord, true);
                    _app.OM_OrdDisc.AddObject(newDisc);
                }
            }
            Save_Manual(ord);
            Save_Det(ord);
            Save_Gift(ord);
        }
        private void Save_Manual(OM_SalesOrd ord)
        {
            double totalManualDiscAmt = 0;
            double totalManualDiscPct = 0;
            if (_lstSaveManualDisc == null)
            {
                _lstSaveManualDisc = new List<OM10100_pgManualPromo_Result>();
            }


            foreach (var currentDisc in _lstSaveManualDisc)
            {
                if (currentDisc.Selected == true)
                {
                    string lineRef = "";
                    var obj = _lstOrdDet.FirstOrDefault(p => p.InvtID == currentDisc.FreeItemID && p.DiscCode == currentDisc.DiscCode);
                    if (obj != null)
                    {
                        lineRef = obj.LineRef;
                    }

                    var objOrdDisc = _app.OM_OrdManualDisc.Where(x =>
                            x.BranchID == ord.BranchID
                            && x.OrderNbr == ord.OrderNbr
                            && x.DiscCode == currentDisc.DiscCode
                            && x.LineRef == currentDisc.LineRef
                            ).FirstOrDefault();
                    if (objOrdDisc == null)
                    {
                        objOrdDisc = new OM_OrdManualDisc();
                        objOrdDisc.BranchID = ord.BranchID;
                        objOrdDisc.DiscCode = currentDisc.DiscCode;
                        objOrdDisc.OrderNbr = ord.OrderNbr;
                        objOrdDisc.LineRef = currentDisc.LineRef;
                        objOrdDisc.Crtd_DateTime = DateTime.Now;
                        objOrdDisc.Crtd_Prog = _screenNbr;
                        objOrdDisc.Crtd_User = Current.UserName;
                        _app.OM_OrdManualDisc.AddObject(objOrdDisc);
                    }
                    objOrdDisc.ObjApply = "";
                    objOrdDisc.PromoType = currentDisc.PromoType;


                    objOrdDisc.DiscAmt = currentDisc.TotalDiscout.ToDouble();
                    if (currentDisc.PromoType == "A")
                    {
                        objOrdDisc.DiscPct = Math.Round((currentDisc.Discount / (ord.LineAmt + ord.LineDiscAmt)) * 100, 2);
                    }
                    else if (currentDisc.PromoType == "P")
                    {
                        objOrdDisc.DiscAmt = Math.Round((currentDisc.Discount * (ord.LineAmt + ord.LineDiscAmt)) / 100, 0);
                        objOrdDisc.DiscPct = currentDisc.Discount;
                    }
                    objOrdDisc.DisctblAmt = ord.LineAmt + ord.LineDiscAmt;

                    objOrdDisc.FreeItemID = currentDisc.FreeItemID;
                    objOrdDisc.FreeItemUnit = currentDisc.UnitDescr;
                    objOrdDisc.FreeItemQty = currentDisc.FreeItemQty;

                    objOrdDisc.SlsperID = ord.SlsPerID;
                    objOrdDisc.SOLineRef = lineRef;
                    objOrdDisc.BudgetID = "";
                    objOrdDisc.LUpd_DateTime = DateTime.Now;
                    objOrdDisc.LUpd_Prog = _screenNbr;
                    objOrdDisc.LUpd_User = Current.UserName;
                    totalManualDiscAmt += objOrdDisc.DiscAmt;
                    totalManualDiscPct += objOrdDisc.DiscPct;
                }
                else if (currentDisc.LineRef != "")
                {
                    var delManual = _app.OM_OrdManualDisc.Where(x =>
                           x.BranchID == ord.BranchID
                           && x.OrderNbr == ord.OrderNbr
                           && x.DiscCode == currentDisc.DiscCode
                           && x.LineRef == currentDisc.LineRef
                           ).FirstOrDefault();
                    if (delManual != null)
                    {
                        _app.OM_OrdManualDisc.DeleteObject(delManual);
                    }
                }
            }
            if (_screenNbr == "OM10100" && _objType.INDocType !="CM")
            {
                ord.ManualDiscAmt = totalManualDiscAmt;
                ord.ManualDiscPct = totalManualDiscPct;
            }            
        }
        private void Save_Det(OM_SalesOrd ord)
        {
            foreach (var currentDet in _lstOrdDet)
            {
                OM_SalesOrdDet det = _app.OM_SalesOrdDet.FirstOrDefault(p => p.BranchID == ord.BranchID && p.OrderNbr == ord.OrderNbr && p.LineRef == currentDet.LineRef);
                if (det != null && det.EntityState != EntityState.Deleted && det.EntityState != EntityState.Detached)
                {
                    Update_Det(det, currentDet, ord, false);
                }
                else
                {
                    det = new OM_SalesOrdDet();
                    Update_Det(det, currentDet, ord, true);
                    det.Mark = currentDet.Mark ?? 0;
                    _app.OM_SalesOrdDet.AddObject(det);
                }
                if (_calcPromoOnly == 0 && _screenNbr != "OM20500")
                {
                    // Thêm Invt nếu chưa có trong In_ItemSite
                    if (_app.IN_ItemSite.FirstOrDefault(x => x.InvtID == det.InvtID && x.SiteID == det.SiteID) == null)
                    {
                        var in_ItemSite = new IN_ItemSite();
                        Insert_IN_ItemSite(ref in_ItemSite, det.SiteID, det.InvtID, IsStkItem(det.InvtID) ? (short)0 : (short)0);
                    }
                }
                Save_Lot(ord, det);
            }
        }

        private bool Save_Lot(OM_SalesOrd ord, OM_SalesOrdDet det)
        {
            var lots = _app.OM_LotTrans.Where(p => p.BranchID == ord.BranchID && p.OrderNbr == ord.OrderNbr).ToList();
            foreach (var item in lots)
            {
                if (item.EntityState == EntityState.Deleted || item.EntityState == EntityState.Detached) continue;
                if (!_lstLot.Any(p => p.OMLineRef == item.OMLineRef && p.LotSerNbr == item.LotSerNbr))
                {
                    var oldQty = item.UnitMultDiv == "D" ? item.Qty / item.CnvFact : item.Qty * item.CnvFact;
                    if (det.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
                    {
                        UpdateAllocLotSO(item.InvtID, item.SiteID, item.LotSerNbr, oldQty, 0, 0);
                    }
                    _app.OM_LotTrans.DeleteObject(item);
                }
            }

            var lstLotTmp = _lstLot.Where(p => p.OMLineRef == det.LineRef).ToList();
            foreach (var lotCur in lstLotTmp)
            {
                var lot = _app.OM_LotTrans.FirstOrDefault(p => p.BranchID == ord.BranchID && p.OrderNbr == ord.OrderNbr && p.OMLineRef == lotCur.OMLineRef && p.LotSerNbr == lotCur.LotSerNbr);
                if (lot == null || lot.EntityState == EntityState.Deleted || lot.EntityState == EntityState.Detached)
                {
                    lot = new OM_LotTrans();
                    Update_Lot(lot, lotCur, ord, det, true);
                    _app.OM_LotTrans.AddObject(lot);
                }
                else
                {
                    Update_Lot(lot, lotCur, ord, det, false);
                }
            }
            return true;
        }
        private void Save_Gift(OM_SalesOrd ord)
        {
            foreach (var currentDet in _lstGift)
            {
                OM_SalesOrdGift det = _app.OM_SalesOrdGift.FirstOrDefault(p => p.BranchID == ord.BranchID && p.OrderNbr == ord.OrderNbr && p.Code == currentDet.Code && p.DiscType == currentDet.DiscType && p.Type == "02");
                if (det != null && det.EntityState != EntityState.Deleted && det.EntityState != EntityState.Detached)
                {
                    Update_Gift(det, currentDet, ord, false);
                }
                else
                {
                    if (currentDet.Qty > 0)
                    {
                        det = new OM_SalesOrdGift();
                        Update_Gift(det, currentDet, ord, true);
                        _app.OM_SalesOrdGift.AddObject(det);
                    }
                }
            }
        }
       
        private void AddFreeBonus(List<DiscountChoice> lstFreeBonus)
        {
            string budgetID = string.Empty;
            string uom = string.Empty;
            string siteID = string.Empty;
            double cnvFact = 0;
            string unitMultDiv = string.Empty;
            string discID = string.Empty;
            string discSeq = string.Empty;
            double qtyAmtAvail = 0; 
            foreach (var itemChoiced in lstFreeBonus)
            {
                if (itemChoiced.FreeItemQty > 0 && itemChoiced.Sel == true)
                {
                    uom = itemChoiced.FreeItemUnit;
                    double freeQty = itemChoiced.FreeItemQty * itemChoiced.FreeItemQtyBase;
                    budgetID = itemChoiced.BudgetID;
                    if (Util.PassNull(itemChoiced.FreeItemID) != string.Empty)
                    {
                        var objInvt = GetInventory(itemChoiced.FreeItemID);
                        siteID = GetFreeItemSite(itemChoiced.FreeSiteID, itemChoiced.SiteType);
                        IN_UnitConversion cnv = SetUOM(itemChoiced.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                        if (cnv != null)
                        {
                            cnvFact = cnv.CnvFact;
                            unitMultDiv = cnv.MultDiv;
                        }
                        qtyAmtAvail = 0;
                        if (CheckQtyAvail4AddFreeItem(itemChoiced.FreeItemID, itemChoiced.DiscID, itemChoiced.DiscSeq, itemChoiced.DiscLineRef, itemChoiced.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoiced.SiteType) == 1)
                        {
                            _messSite += itemChoiced.FreeItemID + " - " + siteID + ",";
                        }
                        else if (!CheckAvailableDiscBudget(ref budgetID, itemChoiced.DiscID, itemChoiced.DiscSeq, ref freeQty, true, itemChoiced.FreeItemID, uom, ref qtyAmtAvail))
                        {
                            AddBudgetToString(itemChoiced.DiscID + "-" + itemChoiced.DiscSeq + "-" + budgetID + "-" + itemChoiced.FreeItemID + ',');
                        }
                        else
                        {
                            var objDiscSeq = GetDiscSeqActive(itemChoiced.DiscID, itemChoiced.DiscSeq);
                            objDiscSeq.DiscType = "G";
                            objDiscSeq.DiscFor = "";
                            var disctblQty = itemChoiced.PromoBonusAmt;
                            InsertUpdateOrdDisc(objDiscSeq, itemChoiced.BudgetID, itemChoiced.PromoBonusAmt, 0, disctblQty, itemChoiced.BudgetID,
                                itemChoiced.FreeItemID, freeQty, _discLineRef, _lineRef, "", "", "", uom, cnvFact);

                            AddFreeItem(itemChoiced, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                            IncreaseDiscLineRef();
                        }
                    }
                    itemChoiced.Sel = false;
                }
            }
        }
        #endregion

        #region Tax
        private bool CalcTax(int i)
        {
            if (_objOrder.Status == "C" || _objOrder.Status == "L" || _objOrder.Status == "I")
            {
                return false;
            }
            if (i < 0)
            {
                return true;
            }
            double groupDocDistAmt = _lstOrdDet[i].DocDiscAmt + _lstOrdDet[i].GroupDiscAmt1 +
                                     _lstOrdDet[i].GroupDiscAmt2;
            var dt = new List<OM10100_pdCustomerTax_Result>();
            List<OM10100_pdCustomerTax_Result> lstTax = _app.OM10100_pdCustomerTax(_objOrder.CustID, _objOrder.ShipViaId, _objOrder.BranchID).ToList();
            if (_lstOrdDet[i].TaxID == "*")
            {
                dt = new List<OM10100_pdCustomerTax_Result>(lstTax);
            }
            else
            {
                string[] strTax = Util.PassNull(_lstOrdDet[i].TaxID).Split(',');
                if (strTax.Length > 0)
                {
                    for (int k = 0; k < strTax.Length; k++)
                    {
                        for (int j = 0; j < lstTax.Count; j++)
                        {
                            if (strTax[k] == lstTax[j].TaxID)
                            {
                                dt.Add(new OM10100_pdCustomerTax_Result
                                {
                                    TaxID = strTax[k],
                                    PrcTaxIncl = lstTax[j].PrcTaxIncl
                                });
                                break;
                            }
                        }
                    }
                }
                else
                {
                    if (Util.PassNull(_lstOrdDet[i].TaxID) == string.Empty ||
                        Util.PassNull(_lstOrdDet[i].TaxCat) == string.Empty)
                    {
                        _lstOrdDet[i].TxblAmt00 = _lstOrdDet[i].LineAmt - groupDocDistAmt;
                    }
                    return false;
                }
            }

            string taxCat = Util.PassNull(_lstOrdDet[i].TaxCat);
            double prcTaxInclRate = 0, totPrcTaxInclAmt = 0, txblAmtL1 = 0, txblAmtAddL2 = 0;
            for (int j = 0; j < dt.Count; j++)
            {
                OM10100_pdCustomerTax_Result objTax =
                    lstTax.Where(p => Util.PassNull(p.TaxID) == Util.PassNull(dt[j].TaxID)).FirstOrDefault();
                if (objTax != null && taxCat != string.Empty)
                {
                    if (taxCat == "*" ||
                        (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat &&
                         objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat &&
                         objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                        ||
                        (objTax.CatFlg == "N" &&
                         (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                          objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                          objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                    {
                        if ((_objType.DiscType == "A" && objTax.PrcTaxIncl == "0") ||
                            (_objType.DiscType == "B" && objTax.PrcTaxIncl != "0"))
                        {
                            Util.AppendLog(ref _logMessage, "730");
                            return false;
                        }
                        if (objTax.TaxCalcLvl == "1" && objTax.PrcTaxIncl != "0")
                        {
                            prcTaxInclRate = prcTaxInclRate + objTax.TaxRate;
                        }
                    }
                }
            }
            if (_objType.SalesType == "PET" && !_lstOrdDet[i].FreeItem)
            {
                txblAmtL1 = Math.Round(_lstOrdDet[i].SlsPrice / (1 + prcTaxInclRate / 100), 0) * _lstOrdDet[i].LineQty -
                            _lstOrdDet[i].DiscAmt - _lstOrdDet[i].ManuDiscAmt;
            }
            else
            {
                if (prcTaxInclRate == 0)
                {
                    txblAmtL1 = Math.Round(_lstOrdDet[i].LineAmt - groupDocDistAmt, 0);
                }
                else
                {
                    txblAmtL1 = Math.Round((_lstOrdDet[i].LineAmt - groupDocDistAmt) / (1 + prcTaxInclRate / 100), 0);
                }
            }

            _lstOrdDet[i].TxblAmt00 = txblAmtL1;

            for (int j = 0; j < dt.Count; j++)
            {
                string taxID = string.Empty, lineRef = string.Empty;
                double taxRate = 0, taxAmtL1 = 0;
                OM10100_pdCustomerTax_Result objTax =
                    lstTax.Where(p => Util.PassNull(p.TaxID) == Util.PassNull(dt[j].TaxID)).FirstOrDefault();
                if (objTax != null && taxCat != string.Empty)
                {
                    if (taxCat == "*" ||
                        (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat &&
                         objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat &&
                         objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                        ||
                        (objTax.CatFlg == "N" &&
                         (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                          objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                          objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                    {
                        if (objTax.TaxCalcLvl == "1")
                        {
                            taxID = dt[j].TaxID;
                            lineRef = _lstOrdDet[i].LineRef;
                            taxRate = objTax.TaxRate;
                            taxAmtL1 = Math.Round(txblAmtL1 * objTax.TaxRate / 100, 0);
                            if (objTax.Lvl2Exmpt == 0)
                            {
                                txblAmtAddL2 += txblAmtL1;
                            }

                            if (objTax.PrcTaxIncl != "0" && _objType.SalesType != "PET")
                            {
                                bool chk = false;
                                if (j < dt.Count - 1)
                                {
                                    for (int k = j + 1; k < dt.Count; k++)
                                    {
                                        objTax = dt[k];
                                        if (objTax != null && taxCat != string.Empty)
                                        {
                                            if (taxCat == "*" ||
                                                (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat &&
                                                 objTax.CatExcept01 != taxCat && objTax.CatExcept02 != taxCat &&
                                                 objTax.CatExcept03 != taxCat && objTax.CatExcept04 != taxCat &&
                                                 objTax.CatExcept05 != taxCat)
                                                ||
                                                (objTax.CatFlg == "N" &&
                                                 (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
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
                                    if (_objType.TaxFee)
                                    {
                                        if (totPrcTaxInclAmt + taxAmtL1 + txblAmtL1 -
                                            (_lstOrdDet[i].SOFee * taxRate / 100) != _lstOrdDet[i].LineAmt)
                                        {
                                            taxAmtL1 = Math.Round(_lstOrdDet[i].LineAmt + (_lstOrdDet[i].SOFee * taxRate / 100) -
                                                    groupDocDistAmt - (totPrcTaxInclAmt + txblAmtL1), 0);
                                        }
                                    }
                                    else
                                    {
                                        if (totPrcTaxInclAmt + taxAmtL1 + txblAmtL1 != _lstOrdDet[i].LineAmt)
                                        {
                                            taxAmtL1 = Math.Round(_lstOrdDet[i].LineAmt - groupDocDistAmt - (totPrcTaxInclAmt + txblAmtL1), 0);
                                        }
                                    }
                                }
                                else
                                {
                                    totPrcTaxInclAmt += totPrcTaxInclAmt + taxAmtL1;
                                }
                            }

                            if (_objType.TaxFee)
                            {
                                InsertUpdateTax(taxID, lineRef, taxRate, taxAmtL1, txblAmtL1 + _lstOrdDet[i].SOFee, 1);
                            }
                            else
                            {
                                InsertUpdateTax(taxID, lineRef, taxRate, taxAmtL1, txblAmtL1, 1);
                            }
                        }
                    }
                }
            }

            for (int j = 0; j < dt.Count; j++)
            {
                string taxID = string.Empty, lineRef = string.Empty;
                double taxRate = 0, txblAmtL2 = 0, taxAmtL2 = 0;
                OM10100_pdCustomerTax_Result objTax =
                    lstTax.Where(p => Util.PassNull(p.TaxID) == Util.PassNull(dt[j].TaxID)).FirstOrDefault();
                if (objTax != null && taxCat != string.Empty)
                {
                    if (taxCat == "*" ||
                        (objTax.CatFlg == "A" && objTax.CatExcept00 != taxCat && objTax.CatExcept01 != taxCat &&
                         objTax.CatExcept02 != taxCat && objTax.CatExcept03 != taxCat &&
                         objTax.CatExcept04 != taxCat && objTax.CatExcept05 != taxCat)
                        ||
                        (objTax.CatFlg == "N" &&
                         (objTax.CatExcept00 == taxCat || objTax.CatExcept01 == taxCat ||
                          objTax.CatExcept02 == taxCat || objTax.CatExcept03 == taxCat ||
                          objTax.CatExcept04 == taxCat || objTax.CatExcept05 == taxCat)))
                    {
                        if (objTax.TaxCalcLvl == "2")
                        {
                            taxID = dt[j].TaxID;
                            lineRef = _lstOrdDet[i].LineRef;
                            taxRate = objTax.TaxRate;
                            txblAmtL2 = Math.Round(txblAmtAddL2 + txblAmtL1, 0);
                            taxAmtL2 = Math.Round(txblAmtAddL2 * objTax.TaxRate / 100, 0);
                            InsertUpdateTax(taxID, lineRef, taxRate, taxAmtL2, txblAmtL2, 2);
                        }
                    }
                }
            }
            UpdateTax(i);
            CalcDet();
            return true;
        }

        private void UpdateTax(int i)
        {
            if (i < 0) return;
            int j = 0;
            foreach (OM10100_pgTaxTrans_Result tax in _lstTax)
            {
                if (tax.LineRef == _lstOrdDet[i].LineRef)
                {
                    if (j == 0)
                    {
                        _lstOrdDet[i].TaxId00 = tax.TaxID;
                        _lstOrdDet[i].TxblAmt00 = tax.TxblAmt;
                        _lstOrdDet[i].TaxAmt00 = tax.TaxAmt;
                    }
                    else if (j == 1)
                    {
                        _lstOrdDet[i].TaxId01 = tax.TaxID;
                        _lstOrdDet[i].TxblAmt01 = tax.TxblAmt;
                        _lstOrdDet[i].TaxAmt01 = tax.TaxAmt;
                    }
                    else if (j == 2)
                    {
                        _lstOrdDet[i].TaxId02 = tax.TaxID;
                        _lstOrdDet[i].TxblAmt02 = tax.TxblAmt;
                        _lstOrdDet[i].TaxAmt02 = tax.TaxAmt;
                    }
                    else if (j == 3)
                    {
                        _lstOrdDet[i].TaxId03 = tax.TaxID;
                        _lstOrdDet[i].TxblAmt03 = tax.TxblAmt;
                        _lstOrdDet[i].TaxAmt03 = tax.TaxAmt;
                    }
                    j++;
                }
                if (j != 0 && tax.LineRef != _lstOrdDet[i].LineRef)
                {
                    break;
                }
            }
        }

        private void InsertUpdateTax(string taxID, string lineRef, double taxRate, double taxAmt, double txblAmt,
            int taxLevel)
        {
            bool flat = false;
            for (int i = 0; i < _lstTax.Count; i++)
            {
                if (_lstTax[i].TaxID == taxID && _lstTax[i].LineRef == lineRef)
                {
                    OM10100_pgTaxTrans_Result tax = _lstTax[i];
                    tax.OrderNbr = _objOrder.OrderNbr;
                    tax.BranchID = _objOrder.BranchID;
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
                _lstTax.Add(new OM10100_pgTaxTrans_Result
                {
                    BranchID = _objOrder.BranchID,
                    OrderNbr = _objOrder.OrderNbr,
                    TaxID = taxID,
                    LineRef = lineRef,
                    TaxRate = taxRate,
                    TaxLevel = taxLevel.ToString(),
                    TaxAmt = taxAmt,
                    TxblAmt = txblAmt
                });
            }

            CalcDet();
        }

        private void CalcTaxTotal()
        {
            bool flat;
            _lstTaxDoc = new List<OM10100_pgTaxTrans_Result>();
            foreach (var tran in _lstTax)
            {
                flat = true;
                foreach (var total in _lstTaxDoc)
                {
                    if (total.BranchID == tran.BranchID && total.OrderNbr == tran.OrderNbr && total.TaxID == tran.TaxID)
                    {
                        total.TxblAmt += tran.TxblAmt;
                        total.TaxAmt += tran.TaxAmt;
                        flat = false;
                        break;
                    }
                }
                if (flat)
                {
                    _lstTaxDoc.Add(new OM10100_pgTaxTrans_Result
                    {
                        BranchID = tran.BranchID,
                        OrderNbr = tran.OrderNbr,
                        TaxID = tran.TaxID,
                        TaxAmt = tran.TaxAmt,
                        TaxRate = tran.TaxRate,
                        TxblAmt = tran.TxblAmt
                    });
                }
            }
        }

        #endregion

        #region Discount
        
        private bool IsCalcPromo()
        {
            if (_screenNbr == "OM20500" &&  _calcPromoOnly != 0)
            {
                return false;
            }
            return true;
        }
        #region -KM ưu tiên loại trừ-
        private double GetLineGroupDisc(ref List<OM10100_pdGetDiscSeq_Result> lstDocDisc)
        {            
            double discAmtTotal = 0;
            _lstOldOrdDet = new List<OM10100_pgOrderDet_Result>(_lstOrdDet);
            List<OM10100_pdDiscGroupLineSetUp_Result> lstDiscGroupLineSetup = _app.OM10100_pdDiscGroupLineSetUp(_objOrder.BranchID, _objOrder.SlsPerID).ToList();
            DateTime dt1 = DateTime.Now;
            string tmp = string.Empty;
            double totalSeconds = 0;
            int idx = 1;
            foreach (var objSeq in _lstSeqV2)
            {
                //dt1 = DateTime.Now;
                if (objSeq.DiscType == "D")
                {
                    lstDocDisc.Add(objSeq);
                    continue;
                }
                if (ValidateDisc(objSeq))
                {
                    string crrDisc = objSeq.DiscID + "#" + objSeq.DiscSeq;
                    if (_lstExcludeDisccount.Any(x => x == crrDisc))
                    {
                        continue;
                    }
                    if (!lstDiscGroupLineSetup.Any(x => x.DiscID01 == objSeq.DiscID || x.DiscID02 == objSeq.DiscID))
                    {
                        continue;
                    }

                    if (objSeq.DiscType == "G")
                    {
                        #region -Check 4 calc promo-
                        // Kiểm tra có thỏa điều kiện Loại KM                            
                        switch (GetDiscountType(objSeq))
                        {
                            case "I":// -DiscItem-
                                GetQtyAmtDiscItem(objSeq, ref discAmtTotal);
                            break;
                            case "C":// -DiscItemClass-    
                                GetQtyAmtDiscItemClass(objSeq, ref discAmtTotal);
                            break;
                            case "B":// -Bundle-
                                GetTotQtyAmtBundle(objSeq, ref discAmtTotal);
                                break;
                            default:
                                    break;
                        }
                        #endregion
                        
                    } //if(objDisc.DiscType=="G")
                    else if (objSeq.DiscType == "L")
                    {
                        switch (GetDiscountType4Line(objSeq))
                        {
                            case "I":// -DiscItem-
                                GetQtyAmtDiscItem4Line(objSeq);
                                break;
                            case "C":// -DiscItemClass-    
                                GetQtyAmtDiscItemClass4Line(objSeq);
                                break;
                            default:
                                break;
                        }
                        
                    } // if (objSeq.DiscType == "L")
                    var dt2 = DateTime.Now;
                    TimeSpan ts = dt2.Subtract(dt1);
                    totalSeconds += ts.TotalSeconds;
                    tmp += idx + ":" + objSeq.DiscID + "#" + objSeq.DiscSeq + ": \t \t " + ts.TotalSeconds + " \n";
                    idx++;
                }// (ValidateDisc(objSeq))
            } //foreach (var objSeq  in lstSeq)
            return discAmtTotal;
        }
        /// <returns>I: DiscItem, C: DiscClass, B: Bundle</returns>
        private string GetDiscountType(OM10100_pdGetDiscSeq_Result objSeq)
        {
            string discountType = string.Empty;
            switch (objSeq.DiscClass)
            {
                #region -DiscItem-                                
                case "II":
                    discountType = "I";
                    break;
                case "TI":
                    if (GetOM_DiscCustClass(objSeq.DiscID, objSeq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case "CI": 
                    if (GetOM_DiscCust(objSeq.DiscID, objSeq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case  ItemCustCate:
                    if (GetOM_DiscCustCate(objSeq.DiscID, objSeq.DiscSeq)) // "GI"
                    {
                        discountType = "I";
                    }
                    break;
                case  ItemChannel: 
                    if (GetOM_DiscChannel(objSeq.DiscID, objSeq.DiscSeq)) // "CI"
                    {
                        discountType = "I";
                    }
                    break;
                case  "I1": 
                    if (GetOM_DiscShopType(objSeq.DiscID, objSeq.DiscSeq))   //I1 - Mặt Hàng và Loại Điểm Bán
                    {
                        discountType = "I";
                    }
                    break;
                case  "I2": 
                    if (GetOM_DiscSalesCustClass(objSeq.DiscID, objSeq.DiscSeq)) //I2 - Mặt Hàng & Nhóm Khách Hàng Theo Doanh Số
                    {
                        discountType = "I";
                    }
                    break;
                case  "I3": 
                    if (GetOM_DiscMarket(objSeq.DiscID, objSeq.DiscSeq)) //I3- Mặt Hàng và Chợ
                    {
                        discountType = "I";
                    }
                    break;
                #endregion
                
                #region -DiscItemClass-
                case "PP":                    
                    discountType = "C";                    
                    break;
                case "TP": 
                    if (GetOM_DiscCustClass(objSeq.DiscID, objSeq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                case "CP": 
                    if(GetOM_DiscCustClass(objSeq.DiscID, objSeq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                case GItemCustCate: 
                    if(GetOM_DiscCustCate(objSeq.DiscID, objSeq.DiscSeq)) // GP
                    {
                        discountType = "C";
                    }
                    break;
                case GItemChannel: 
                    if(GetOM_DiscChannel(objSeq.DiscID, objSeq.DiscSeq)) // GC
                    {
                        discountType = "C";
                    }
                    break;
                case "P1": 
                    if(GetOM_DiscShopType(objSeq.DiscID, objSeq.DiscSeq)) //P1 - Nhóm Mặt Hàng Và Loại Điểm Bán       
                    {
                        discountType = "C";
                    }
                    break;
                case "P2": 
                    if(GetOM_DiscSalesCustClass(objSeq.DiscID, objSeq.DiscSeq))//P2 - Nhóm Mặt Hàng Và Nhóm Khách Hàng Theo Doanh Số   
                    {
                        discountType = "C";
                    }
                    break;                     
                case "P3": 
                    if(GetOM_DiscMarket(objSeq.DiscID, objSeq.DiscSeq))//P3 - Nhóm Mặt Hàng và Chợ
                    {
                        discountType = "C";
                    }
                    break;
                #endregion

                #region -Bundle-
                case "BB":
                       discountType = "B";
                    break;
                case "CB": 
                    if (GetOM_DiscCust(objSeq.DiscID, objSeq.DiscSeq))
                    {
                        discountType = "B";
                    }
                    break;
                case "TB": 
                    if (GetOM_DiscCustClass(objSeq.DiscID, objSeq.DiscSeq))
                    {
                        
                    }
                    break;
                case "B1": 
                    if (GetOM_DiscShopType(objSeq.DiscID, objSeq.DiscSeq)) //B1 - Bộ Sản Phẩm và Loại Điểm Bán
                    {
                        discountType = "B";
                    }
                    break;
                case "B2": 
                    if (GetOM_DiscSalesCustClass(objSeq.DiscID, objSeq.DiscSeq)) //B2 - Bộ Sản Phẩm và Nhóm Khách Hàng Theo Doanh Số
                    {
                        discountType = "B";
                    }
                    break;
                case "B3": 
                    if (GetOM_DiscMarket(objSeq.DiscID, objSeq.DiscSeq)) //B3 - Bộ Sản Phẩm  và Chợ
                    {
                        discountType = "B";
                    }
                    break;
                #endregion
                default:
                    break;
            }
            return discountType;
        }

        private string GetDiscountType4Line(OM10100_pdGetDiscSeq_Result seq)
        {
            //discountType = "C";
            var discountType = string.Empty;
            switch (seq.DiscClass)
            {
                case "II":
                    discountType = "I";
                    break;
                case "TI":
                    if (GetOM_DiscCustClass(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case "CI":
                    if (GetOM_DiscCust(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case ItemCustCate: // GI
                    if (GetOM_DiscCustCate(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case ItemChannel: // IC            
                    if (GetOM_DiscChannel(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case "I1"://I1 - Mặt Hàng và Loại Điểm Bán
                    if (GetOM_DiscShopType(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case "I2"://I2 - Mặt Hàng và Nhóm Khách Hàng Theo Doanh Số
                    if (GetOM_DiscSalesCustClass(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;
                case "I3": //I3- Mặt Hàng và Chợ
                    if (GetOM_DiscMarket(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "I";
                    }
                    break;

                case "PP":
                    discountType = "C";
                    break;
                case "TP":
                    if (GetOM_DiscCustClass(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;

                case "CP":
                    if (GetOM_DiscCustClass(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;

                case GItemCustCate: // GP           
                    if (GetOM_DiscCustCate(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                case GItemChannel: // GC            
                    if (GetOM_DiscChannel(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                case "TT":
                    //if (GetOM_DiscCustClass(seq.DiscID, seq.DiscSeq))
                    //{
                        discountType = "C";
                    //}
                    break;

                case "P1": //P1 - Nhóm Mặt Hàng và Loại Điểm Bán
                    if (GetOM_DiscShopType(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                case "P2": //P2 - Nhóm Mặt Hàng và Nhóm Khách Hàng Theo Doanh Số
                    if ( GetOM_DiscSalesCustClass(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                case "P3": //P3 - Nhóm Mặt Hàng và Chợ
                    if (GetOM_DiscMarket(seq.DiscID, seq.DiscSeq))
                    {
                        discountType = "C";
                    }
                    break;
                default:
                    discountType = string.Empty;
                    break;
            }
            return discountType;
        }

        //khuyến mãi nhóm
        private void CalculateGroupDisc(OM10100_pdGetDiscSeq_Result objSeq, TotalQtyAmt objTotQtyAmt, List<OM10100_pdOM_DiscItem_Result> lstDiscItem, List<OM_DiscItemClass> itemClass, ref double discAmtTotal, double totalLot)
        {
            string groupRefLineRef = string.Join(",", objTotQtyAmt.ListGroupLineRef);
            if (!string.IsNullOrWhiteSpace(objSeq.RequiredType) && totalLot == 0)
            {
                return;
            }
            double discAmt = 0,
                discAmtCal = 0,
                discPct = 0,
                freeItemQty = 0,
                freeItemQtyCal = 0,
                qtyBreak = 0,
                qtyAmt = 0,
                subQtyAmt = 0,
                cnvFact = 0;
            string siteID = string.Empty,
                uom = string.Empty,
                unitMultDiv = string.Empty,                
                budgetIDLineRef = "",
                breakLineRef = string.Empty;

            if (objSeq.BreakBy == "A")
            {
                qtyAmt = objTotQtyAmt.Amt;
            }
            else
            {
                qtyAmt = objTotQtyAmt.Qty;
            }
            if (qtyAmt == 0)
            {
                return;
            }
            if (objSeq.SubBreakType == "A")
            {
                subQtyAmt = objTotQtyAmt.SubAmt;
            }
            else if (objSeq.SubBreakType == "Q")
            {
                subQtyAmt = objTotQtyAmt.SubQty;
            }
            bool isPctDiscountByLevel = false;
            _lstBreakActive = new List<string>();
        Begin:
            bool beginCalc = false;
            double qtyDeductUsed = 0;
            #region -DiscAmtCal-
            double discBonusFactor = 0;
            int numberOfSets = 0;
            double qtyAmtAvail = 0;
            double iteratedAmt = 0;
            _qtyAvailPopup = 0;
            if (!isPctDiscountByLevel)
            {
                if (objSeq.SubBreakType == "N")
                {
                    discAmtCal = GetDiscBreakV2(objSeq, qtyAmt, ref qtyBreak, ref breakLineRef, ref discBonusFactor, ref budgetIDLineRef, true);
                }
                else
                {
                    discAmtCal = GetDiscBreakV2(objSeq, qtyAmt, subQtyAmt, ref qtyBreak, ref breakLineRef, ref discBonusFactor, ref budgetIDLineRef, true);
                }

                if (!objSeq.ConvertDiscAmtToFreeItem && (discAmtCal > 0 || discAmt > 0))
                {
                    numberOfSets = CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, totalLot.ToInt(), objSeq.BreakBoundType);
                    if (objSeq.DiscFor == "P")
                    {
                        discAmt = Math.Round(discAmtCal * objTotQtyAmt.Amt / 100, 0, MidpointRounding.AwayFromZero);
                        discPct = discAmtCal;
                        isPctDiscountByLevel = objSeq.PctDiscountByLevel;
                    }
                    else
                    {
                        if (discAmtCal > 0)
                        {                            
                            if (objSeq.RequiredType == RequiredTypeQ)
                            {
                                discAmt = Math.Round(discAmtCal * numberOfSets, 0);
                                discAmtTotal += discAmt;
                                qtyAmtAvail = 0;
                                if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref discAmt, false, "", string.Empty, ref qtyAmtAvail))
                                {
                                    discAmt = 0;
                                    discAmtTotal = 0;
                                }
                                qtyDeductUsed = numberOfSets * qtyBreak;
                                if (objSeq.DiscType == "L")
                                {                                    
                                    for (int k = 0; k < objTotQtyAmt.ListGroupLineRef.Count; k++)
                                    {
                                        UpdateLineDiscAmt(objTotQtyAmt.ListGroupLineRef[k], discPct, discAmt, objSeq, breakLineRef, ref qtyDeductUsed, objTotQtyAmt.Amt, ref iteratedAmt, k == objTotQtyAmt.ListGroupLineRef.Count - 1);
                                    }
                                }
                                else
                                {
                                    if (lstDiscItem == null)
                                    {
                                        for (int k = 0; k < itemClass.Count; k++)
                                        {
                                            UpdateGroupDiscByPriceClassV2(itemClass[k].ClassID, discPct, discAmt, objSeq, breakLineRef, ref qtyDeductUsed, objTotQtyAmt.Amt, ref iteratedAmt);
                                        }
                                    }
                                    else
                                    {
                                        for (int k = 0; k < lstDiscItem.Count; k++)
                                        {
                                            UpdateGroupDiscByInvtIDV2(lstDiscItem[k].InvtID, discPct, discAmt, objSeq, breakLineRef, ref qtyDeductUsed, objTotQtyAmt.Amt, ref iteratedAmt, lstDiscItem[k].UnitDesc);
                                        }
                                    }
                                }
                                

                                if (discAmt > 0)
                                {
                                    InsertUpdateOrdDisc(objSeq, budgetIDLineRef, discAmt, objTotQtyAmt.Amt, objTotQtyAmt.Qty,
                                        budgetIDLineRef, "", 0, _discLineRef, string.Empty, breakLineRef, groupRefLineRef, "", "", cnvFact);
                                    IncreaseDiscLineRef();
                                }
                                if (objSeq.BreakBoundType != "L")
                                {
                                    qtyAmt = 0;
                                }
                                else
                                {
                                    if (qtyBreak != 1 && qtyAmt - numberOfSets * qtyBreak > 0 && _objOM.ProrateDisc != 0)
                                    {
                                        qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                        goto Begin;
                                    }
                                }
                                
                            }
                            else
                            {
                                discAmt = Math.Round(discAmt + discAmtCal * numberOfSets, 0);
                            }
                        }
                    }

                    if (discAmt > 0)
                    {
                        if (objSeq.RequiredType != RequiredTypeQ)
                        {
                            discAmtTotal += discAmt;
                            qtyAmtAvail = 0;
                            if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref discAmt, false, "", string.Empty, ref qtyAmtAvail))
                            {
                                discAmt = 0;
                                discAmtTotal = 0;
                            }
                            qtyDeductUsed = numberOfSets * qtyBreak;
                            if (objSeq.DiscType == "L")
                            {
                                for (int k = 0; k < objTotQtyAmt.ListGroupLineRef.Count; k++)
                                {
                                    UpdateLineDiscAmt(objTotQtyAmt.ListGroupLineRef[k], discPct, discAmt, objSeq, breakLineRef, ref qtyDeductUsed, objTotQtyAmt.Amt, ref iteratedAmt, k == objTotQtyAmt.ListGroupLineRef.Count - 1);
                                }
                            }
                            else
                            {
                                if (lstDiscItem == null) //???????
                                {
                                    for (int k = 0; k < itemClass.Count; k++)
                                    {
                                        UpdateGroupDiscByPriceClassV2(itemClass[k].ClassID, discPct, discAmt, objSeq, breakLineRef, ref qtyDeductUsed, objTotQtyAmt.Amt, ref iteratedAmt);
                                    }
                                }
                                else
                                {
                                    for (int k = 0; k < lstDiscItem.Count; k++)
                                    {
                                        UpdateGroupDiscByInvtIDV2(lstDiscItem[k].InvtID, discPct, discAmt, objSeq, breakLineRef, ref qtyDeductUsed, objTotQtyAmt.Amt, ref iteratedAmt, lstDiscItem[k].UnitDesc);
                                    }
                                }
                            }
                            if (discAmt > 0)
                            {
                                InsertUpdateOrdDisc(objSeq, budgetIDLineRef, discAmt, objTotQtyAmt.Amt, objTotQtyAmt.Qty, budgetIDLineRef, "", 0, _discLineRef, string.Empty, breakLineRef, groupRefLineRef, "", "", cnvFact);
                                IncreaseDiscLineRef();
                            }
                            if (objSeq.BreakBoundType != "L")
                            {
                                qtyAmt = 0;
                            }
                            else
                            {
                                if (objSeq.PctDiscountByLevel && objSeq.DiscFor == "P" || objSeq.DiscFor != "P")
                                {
                                    // Lưu tiền theo mỗi mức khác nhau
                                    if (qtyBreak != 1 && qtyAmt - numberOfSets * qtyBreak > 0 && _objOM.ProrateDisc != 0)
                                    {
                                        qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                        discAmt = 0;
                                        iteratedAmt = 0;
                                        goto Begin;
                                    }
                                }
                            }
                        }
                    } // if(discAmt>0)
                } // if(discAmtCal>0 || discAmt>0)
            }
            #endregion
            qtyBreak = 0;
            breakLineRef = string.Empty;
            double promoAmt = 0.0;
            double origBonusAmt = 0.0;
            discBonusFactor = 0;
            if (objSeq.SubBreakType == "N")
            {
                promoAmt = GetDiscBreakV2(objSeq, qtyAmt, ref qtyBreak, ref breakLineRef, ref discBonusFactor, ref budgetIDLineRef, false);
            }
            else
            {
                promoAmt = GetDiscBreakV2(objSeq, qtyAmt, subQtyAmt, ref qtyBreak, ref breakLineRef, ref discBonusFactor, ref budgetIDLineRef, false);
            }

            var lstFreeItem = _app.OM10100_pdOM_DiscFreeItem(objSeq.DiscID, objSeq.DiscSeq, breakLineRef, Current.UserName, Current.CpnyID, Current.LangID).Where(x => x.FreeItemQty > 0).ToList();
            //List<OM10100_pdOM_DiscFreeItem_Result> lstDiscFreeItem1tmp = new List<OM10100_pdOM_DiscFreeItem_Result>();
            List<OM10100_pdOM_DiscFreeItem_Result> lstDiscFreeItemRemove = new List<OM10100_pdOM_DiscFreeItem_Result>();
            if (objSeq.DonateGroupProduct == true)
            {
                lstFreeItem = lstFreeItem.OrderBy(x => x.GroupItem).ThenBy(x => x.Priority).ToList();
            }
            else if (objSeq.ConvertDiscAmtToFreeItem)
            {
                lstFreeItem = lstFreeItem.Where(x => x.PromoPrice > 0).OrderBy(x => x.PromoPrice).ToList();
            }

            if (objSeq.ProAplForItem == "M")
            {
                string detOfFirstLineRef = objTotQtyAmt.ListGroupLineRef[0];
                string invtID = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).InvtID;
                lstFreeItem = lstFreeItem.Where(x => x.FreeItemID == invtID).ToList();
            }

            numberOfSets = CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, totalLot.ToInt(), objSeq.BreakBoundType);
            if (_objMaxLot != null)
            {
                numberOfSets = _objMaxLot.Qty > numberOfSets ? numberOfSets : (int)_objMaxLot.Qty;
                if (numberOfSets <= 0)
                {
                    if (lstFreeItem.Count > 0)
                    {
                        lstFreeItem.Clear();
                        qtyDeductUsed = numberOfSets * qtyBreak;

                        if (objSeq.BreakBoundType != "L" || numberOfSets == 0)
                        {
                            qtyAmt = 0;
                        }
                        else
                        {
                            if (qtyAmt - numberOfSets * qtyBreak > 0 && _objOM.ProrateDisc != 0)
                            {
                                qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                beginCalc = true;
                            }
                            else
                            {
                                beginCalc = false;
                            }

                            if (beginCalc)
                            {
                                goto Begin;
                            }
                        }
                    }
                }
                SetMaxLot(objSeq.DiscID, objSeq.DiscSeq, breakLineRef, _objMaxLot.Qty.Value, false);
            }

            #region -Freeitem discount-
            if (lstFreeItem.Count > 0)
            {
                GetPromoAmt(ref promoAmt, ref origBonusAmt, objSeq, totalLot.ToInt(), objTotQtyAmt.Amt, qtyAmt, qtyBreak, discBonusFactor);
                int countRow = 0;
                var lstCurrentChoice = new List<DiscountChoice>();
                string choiceID = Guid.NewGuid().ToString();
                string messtmp = string.Empty;
                string messSiteTmp = string.Empty;
                double maxQty = 0;
                List<ErrorQtyAvail> messGroupError = new List<ErrorQtyAvail>();
                qtyDeductUsed = numberOfSets * qtyBreak;
                foreach (var free in lstFreeItem)
                {
                    string freeItemID = string.Empty;
                    siteID = GetFreeItemSite(siteID, free.SiteType);
                    countRow++;
                    budgetIDLineRef = free.FreeItemBudgetID;
                    freeItemQtyCal = free.FreeItemQty;
                    if (!beginCalc)
                    {
                        freeItemQty = 0;
                    }
                    if (discAmtCal > 0 || freeItemQtyCal > 0)
                    {
                        freeItemQty = Math.Round(freeItemQty + freeItemQtyCal * numberOfSets, 0);
                        if (countRow == lstFreeItem.Count && qtyAmt - numberOfSets * qtyBreak > 0 && _objOM.ProrateDisc != 0)
                        {
                            if (objSeq.BreakBoundType != "L")
                            {
                                qtyAmt = 0;
                            }
                            else
                            {
                                qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                beginCalc = true;
                            }
                        }
                    } // if(discAmtCal>0 || freeItemQtyCal>0)
                    maxQty = freeItemQty / free.FreeItemQty;
                    if (freeItemQty > 0 && (int)Math.Floor(freeItemQty / free.FreeItemQty) > 0)
                    {
                        var objData = _lstOM_OrdDiscOld.Where(p => p.DiscID == objSeq.DiscID
                                                                    && p.DiscSeq == objSeq.DiscSeq
                                                                    && p.BudgetID == budgetIDLineRef
                                                                    && p.OrderNbr == _objOrder.OrderNbr
                                                                    && p.BranchID == _objOrder.BranchID
                                                                    && p.FreeItemID == free.FreeItemID
                                                                    && (objSeq.DonateGroupProduct != true && (p.DisctblQty / p.FreeItemQty) == (qtyBreak * (maxQty) / free.FreeItemQty) ||
                                                                        objSeq.DonateGroupProduct == true && (p.DisctblQty / p.FreeItemQty) == (qtyBreak))
                                                                    ).FirstOrDefault();
                        double freeQty = (objData == null ? (int)Math.Floor(freeItemQty / free.FreeItemQty) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ? (int)Math.Floor(freeItemQty / free.FreeItemQty) : (int)Math.Floor(objData.FreeItemQty / free.FreeItemQty))) * free.FreeItemQty;
                        uom = free.UnitDescr;
                        freeItemID = free.FreeItemID;
                        IN_UnitConversion cnv = SetUOM(freeItemID, free.UnitDescr, "", "");
                        if (cnv != null)
                        {
                            cnvFact = cnv.CnvFact;
                            unitMultDiv = cnv.MultDiv;
                        }
                        if (objSeq.DonateGroupProduct == true)
                        {
                            if (!messGroupError.Any(x => x.GroupItem == free.GroupItem))
                            {
                                ErrorQtyAvail error = new ErrorQtyAvail();
                                error.MaxQtyInGroup = maxQty * free.FreeItemQty;
                                error.GroupItem = free.GroupItem;
                                error.IsError = true;
                                messGroupError.Add(error);
                            }
                            if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                            {
                                if (objSeq.DonateGroupProduct == true)
                                {
                                    freeQty = CheckQtyAvailInGroup(freeItemID, siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty);

                                    if (freeQty == 0)
                                    {
                                        if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                        {
                                            messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).MessageError += freeItemID + " - " + siteID + ",";
                                        }
                                        freeItemID = string.Empty;
                                        freeItemQty = 0;
                                        continue;
                                    }
                                }
                                else
                                {
                                    messSiteTmp += freeItemID + " - " + siteID + ",";
                                    freeItemID = string.Empty;
                                    freeItemQty = 0;
                                    freeQty = 0;
                                    continue;
                                }
                            }
                            else
                            {
                                if (objSeq.DonateGroupProduct == true)
                                {
                                    if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                    {
                                        messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).IsError = false;
                                    }
                                }
                            }
                        }
                        else
                        {
                            if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                            {
                                var checkChoice =_lstChoice.FirstOrDefault(p => p.Sel == true) == null ? false : true;

                                var record = _lstChoice.FirstOrDefault(p => p.FreeItemID == freeItemID);
                                if (record == null)
                                {
                                    if (objSeq.ConvertDiscAmtToFreeItem)
                                    {
                                        if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, 1, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                    else
                                    {
                                        messSiteTmp += freeItemID + " - " + siteID + ",";
                                        freeItemID = string.Empty;
                                        freeItemQty = 0;
                                        freeQty = 0;
                                        continue;
                                    }
                                }
                                else if (!_choice && !checkChoice)
                                {                                    
                                    if (objSeq.ConvertDiscAmtToFreeItem)
                                    {
                                        if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, 1, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                    else
                                    {
                                        messSiteTmp += freeItemID + " - " + siteID + ",";
                                        freeItemID = string.Empty;
                                        freeItemQty = 0;
                                        freeQty = 0;
                                        continue;
                                    }                                                                       
                                }
                            }
                        }
                        qtyAmtAvail = 0;
                        if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeItemQty, true, free.FreeItemID, free.UnitDescr, ref qtyAmtAvail))
                        {
                            AddBudgetTemp(ref messtmp, objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + free.FreeItemID + ",");
                            continue;
                        }
                        if (freeItemQty > 0 && (int)Math.Floor(freeItemQty / free.FreeItemQty) > 0 && (_screenNbr == "OM10100" || _screenNbr == "OM20500" && (qtyAmtAvail > 0 || _calcPromoOnly != 0)))
                        {
                            free.FreeITemSiteID = siteID;
                            free.FreeItemBudgetID = budgetIDLineRef;
                            string invtID = string.Empty;
                            string invtDescr = string.Empty;
                            if (objSeq.DiscType == "L" && objTotQtyAmt.ListGroupLineRef.Count > 0)
                            {
                                string detOfFirstLineRef = objTotQtyAmt.ListGroupLineRef[0];
                                invtID = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).InvtID;
                                invtDescr = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).Descr;
                            }
                            if (qtyAmtAvail == double.MaxValue)
                            {
                                qtyAmtAvail = 0;
                            }
                            lstCurrentChoice.Add(
                                AddCurrentChoice(choiceID, objSeq, breakLineRef, promoAmt, origBonusAmt, free, maxQty, freeItemQty, freeQty, qtyBreak
                                , invtDescr, invtID, objData, free.UnitDescr, _lineRef, 0, unitMultDiv, cnvFact, qtyAmtAvail, groupRefLineRef)
                            );
                        }
                    }
                }

                if ((_qtyAvailPopup >= maxQty) && messSiteTmp != "" && objSeq.DonateGroupProduct == false)
                {
                    foreach (var free in lstFreeItem)
                    {
                        var objData = _lstOM_OrdDiscOld.Where(p => p.DiscID == objSeq.DiscID
                                                                    && p.DiscSeq == objSeq.DiscSeq
                                                                    && p.BudgetID == budgetIDLineRef
                                                                    && p.OrderNbr == _objOrder.OrderNbr
                                                                    && p.BranchID == _objOrder.BranchID
                                                                    && p.FreeItemID == free.FreeItemID
                                                                    && (objSeq.DonateGroupProduct != true && (p.DisctblQty / p.FreeItemQty) == (qtyBreak * (maxQty) / free.FreeItemQty) ||
                                                                        objSeq.DonateGroupProduct == true && (p.DisctblQty / p.FreeItemQty) == (qtyBreak))
                                                                    ).FirstOrDefault();
                        double freeQty = (objData == null ? (int)Math.Floor(freeItemQty / free.FreeItemQty) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ? (int)Math.Floor(freeItemQty / free.FreeItemQty) : (int)Math.Floor(objData.FreeItemQty / free.FreeItemQty))) * free.FreeItemQty;

                        var qtyAvail = 0.0;
                        string siteInvtID = siteID + "@@" + free.FreeItemID;
                        if (_lstFreeItemQtyAvailUsed.ContainsKey(siteInvtID))
                        {
                            qtyAvail = _lstFreeItemQtyAvailUsed[siteInvtID];
                        }
                        else
                        {
                            IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == free.FreeItemID);
                            qtyAvail = (objItemSite == null) ? 0 : objItemSite.QtyAvail;
                            _lstFreeItemQtyAvailUsed.Add(siteInvtID, qtyAvail);
                        }                        
                        free.FreeITemSiteID = siteID;
                        free.FreeItemBudgetID = budgetIDLineRef;
                        string invtID = string.Empty;
                        string invtDescr = string.Empty;
                        if (objSeq.DiscType == "L" && objTotQtyAmt.ListGroupLineRef.Count > 0)
                        {
                            string detOfFirstLineRef = objTotQtyAmt.ListGroupLineRef[0];
                            invtID = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).InvtID;
                            invtDescr = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).Descr;
                        }
                        if (qtyAmtAvail == double.MaxValue)
                        {
                            qtyAmtAvail = 0;
                        }
                        bool checkAddCurrentChoice = true;
                        foreach (var item in lstCurrentChoice)
                        {
                            if (item.LineRef == _lineRef && item.InvtID == invtID && item.DiscID == objSeq.DiscID && item.DiscSeq == objSeq.DiscSeq && item.DiscLineRef == breakLineRef && item.FreeItemID == free.FreeItemID)
                            {
                                checkAddCurrentChoice = false;
                            }
                        }

                        if (qtyAvail > 0 && checkAddCurrentChoice)
                        {
                            lstCurrentChoice.Add(
                                AddCurrentChoice(choiceID, objSeq, breakLineRef, promoAmt, origBonusAmt, free, maxQty, qtyAvail, qtyAvail, qtyBreak
                                , invtDescr, invtID, null, free.UnitDescr, _lineRef, 0, unitMultDiv, cnvFact, qtyAmtAvail, groupRefLineRef)
                            );   
                        }
                                             
                    }
                }

                var totalGroupError = 0;
                if (objSeq.DonateGroupProduct == true)
                {
                    totalGroupError = CheckErrorInGroup(messGroupError, ref lstCurrentChoice, maxQty);
                }

                #region truong hop or
                if (lstFreeItem.Count > 1 &&
                    objSeq.AutoFreeItem == false && objSeq.ProAplForItem == "A")
                {
                    var minAmt = lstCurrentChoice.Count > 0 ? lstCurrentChoice.Min(x => x.PromoPrice) : 0;
                    if (objSeq.DonateGroupProduct != true
                        && lstCurrentChoice.Sum(p => p.Qty) < maxQty)
                    {
                        if (lstCurrentChoice.Count == 0 && messSiteTmp.Length > 0)
                        {
                            _messSite += messSiteTmp;
                        }
                        else
                        {
                            AddBudgetToString(messtmp);
                        }
                    }
                    else if (objSeq.DonateGroupProduct != true
                        && objSeq.ConvertDiscAmtToFreeItem
                        && lstCurrentChoice.Sum(p => p.tempLineAmt) < promoAmt
                        && promoAmt - lstCurrentChoice.Sum(p => p.tempLineAmt) >= minAmt)
                    {
                        _messSite += messSiteTmp;
                    }
                    else if (objSeq.DonateGroupProduct != true
                        && objSeq.ConvertDiscAmtToFreeItem
                        && minAmt > promoAmt)
                    {
                        if (!_messMinPrice.Any(x => x == objSeq.DiscID + " - " + objSeq.DiscSeq))
                        {
                            _messMinPrice.Add(objSeq.DiscID + " - " + objSeq.DiscSeq);
                        }
                    }
                   // else 
                    if (objSeq.DonateGroupProduct == true && totalGroupError == messGroupError.Count)
                    {
                        //_messBudget += discID + "-" + discSeq + "-" + budgetID + ',';
                    }
                    else
                    {
                        if (lstCurrentChoice.Count > 0)
                        {
                            DeductQtyAmtDiscount(objSeq, breakLineRef, lstDiscItem == null ? "C" : "I", qtyDeductUsed, lstDiscItem, itemClass);
                            if (!_lstChoice.Any(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == lstCurrentChoice[0].LevelID && p.InvtID == lstCurrentChoice[0].InvtID && p.FreeItemID == lstCurrentChoice[0].FreeItemID && p.MaxQty == lstCurrentChoice[0].MaxQty && p.BudgetID == lstCurrentChoice[0].BudgetID))
                            {
                                if (_qtyAvailPopup == maxQty && objSeq.DonateGroupProduct == false)
                                {
                                    foreach (var objChoice in lstCurrentChoice)//nếu có 1 thằng thì tính luôn, ko hiện popup
                                    {
                                        var choice = _lstChoice.FirstOrDefault(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == objChoice.LevelID && p.InvtID == lstCurrentChoice[0].InvtID && p.FreeItemID == objChoice.FreeItemID && p.MaxQty == objChoice.MaxQty && p.BudgetID == objChoice.BudgetID);
                                        if (choice == null)
                                        {
                                            if (Util.PassNull(objChoice.FreeItemID) != string.Empty)
                                            {
                                                siteID = GetFreeItemSite(objChoice.FreeSiteID, objChoice.SiteType);
                                                uom = objChoice.FreeItemUnit;
                                                //freeItemID = objChoice.FreeItemID;
                                                budgetIDLineRef = objChoice.BudgetID;
                                                double freeQty = Math.Floor(objChoice.FreeItemQty * objChoice.FreeItemQtyBase);//NEU CO 1 THI LAY SO XUAT LON NHAT
                                                if (objSeq.ConvertDiscAmtToFreeItem)
                                                {
                                                    freeQty = (objChoice.PromoAmt / objChoice.PromoPrice).ToInt();
                                                }
                                                OM10100_pdInventoryByID_Result objInvt = GetInventory(objChoice.FreeItemID);

                                                IN_UnitConversion cnv = SetUOM(objChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                if (cnv != null)
                                                {
                                                    cnvFact = cnv.CnvFact;
                                                    unitMultDiv = cnv.MultDiv;
                                                }
                                                qtyAmtAvail = 0;
                                                if (CheckQtyAvail4AddFreeItem(objChoice.FreeItemID, objChoice.DiscID, objChoice.DiscSeq, objChoice.DiscLineRef, objChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, objChoice.SiteType) == 1)
                                                {
                                                    throw new MessageException("1045", "", new[] { objChoice.FreeItemID, siteID });
                                                }
                                                else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, objChoice.FreeItemID, uom, ref qtyAmtAvail))
                                                {
                                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + objChoice.FreeItemID + ',');
                                                }
                                                else
                                                {
                                                    var disctblQty = objSeq.DonateGroupProduct != true && !objSeq.ConvertDiscAmtToFreeItem ? qtyBreak * (freeQty / objChoice.FreeItemQtyBase) : qtyAmt;
                                                    InsertUpdateOrdDisc(objSeq, objChoice.BudgetID, 0, objTotQtyAmt.Amt, disctblQty, objChoice.BudgetID,
                                                        objChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                    AddFreeItem(objChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                    IncreaseDiscLineRef();
                                                }
                                            }
                                        }
                                    }
                                }
                                else
                                {
                                    foreach (var objChoice in lstCurrentChoice)//nếu có 1 thằng thì tính luôn, ko hiện popup
                                    {
                                        var choice = _lstChoice.FirstOrDefault(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == objChoice.LevelID && p.InvtID == lstCurrentChoice[0].InvtID && p.FreeItemID == objChoice.FreeItemID && p.MaxQty == objChoice.MaxQty && p.BudgetID == objChoice.BudgetID);
                                        if (choice == null)
                                        {
                                            AddListChoice(objChoice, breakLineRef);
                                        }
                                    }
                                    if (lstCurrentChoice.Count > 1)
                                    {
                                        _choice = true;
                                    }
                                    else
                                    {
                                        // có 1 SP km thì ko show popup
                                        var objChoice = lstCurrentChoice[0];
                                        if (Util.PassNull(objChoice.FreeItemID) != string.Empty)
                                        {
                                            siteID = GetFreeItemSite(objChoice.FreeSiteID, objChoice.SiteType);
                                            uom = objChoice.FreeItemUnit;
                                            //freeItemID = objChoice.FreeItemID;
                                            budgetIDLineRef = objChoice.BudgetID;
                                            double freeQty = Math.Floor(objChoice.FreeItemQty * objChoice.FreeItemQtyBase);//NEU CO 1 THI LAY SO XUAT LON NHAT
                                            if (objSeq.ConvertDiscAmtToFreeItem)
                                            {
                                                freeQty = (objChoice.PromoAmt / objChoice.PromoPrice).ToInt();
                                            }
                                            OM10100_pdInventoryByID_Result objInvt = GetInventory(objChoice.FreeItemID);

                                            IN_UnitConversion cnv = SetUOM(objChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                            if (cnv != null)
                                            {
                                                cnvFact = cnv.CnvFact;
                                                unitMultDiv = cnv.MultDiv;
                                            }
                                            qtyAmtAvail = 0;
                                            if (CheckQtyAvail4AddFreeItem(objChoice.FreeItemID, objChoice.DiscID, objChoice.DiscSeq, objChoice.DiscLineRef, objChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, objChoice.SiteType) == 1)
                                            {
                                                throw new MessageException("1045", "", new[] { objChoice.FreeItemID, siteID });
                                            }
                                            else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, objChoice.FreeItemID, uom, ref qtyAmtAvail))
                                            {
                                                AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + objChoice.FreeItemID + ',');
                                            }
                                            else
                                            {
                                                var disctblQty = objSeq.DonateGroupProduct != true && !objSeq.ConvertDiscAmtToFreeItem ? qtyBreak * (freeQty / objChoice.FreeItemQtyBase) : qtyAmt;
                                                InsertUpdateOrdDisc(objSeq, objChoice.BudgetID, 0, objTotQtyAmt.Amt, disctblQty, objChoice.BudgetID,
                                                    objChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                AddFreeItem(objChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                IncreaseDiscLineRef();
                                            }
                                        }
                                    }
                                }                                
                            }
                            else // Đã chọn
                            {
                                var objChoice = lstCurrentChoice[0];
                                foreach (var itemChoiced in _lstChoice)
                                {
                                    if (itemChoiced.DiscID == objSeq.DiscID
                                                                && itemChoiced.DiscSeq == objSeq.DiscSeq
                                                                && itemChoiced.MaxQty == objChoice.MaxQty
                                                                && itemChoiced.InvtID == objChoice.InvtID
                                                                && itemChoiced.LevelID == objChoice.LevelID
                                                                && itemChoiced.FreeItemQty > 0
                                                                && itemChoiced.Sel == true
                                        )
                                    {
                                        uom = itemChoiced.FreeItemUnit;
                                        double freeQty = Math.Floor(itemChoiced.FreeItemQty * itemChoiced.FreeItemQtyBase);
                                        budgetIDLineRef = itemChoiced.BudgetID;
                                        // có 1 SP km thì ko show popup
                                        if (Util.PassNull(itemChoiced.FreeItemID) != string.Empty)
                                        {
                                            siteID = GetFreeItemSite(itemChoiced.FreeSiteID, itemChoiced.SiteType);

                                            OM10100_pdInventoryByID_Result objInvt = GetInventory(itemChoiced.FreeItemID);
                                            IN_UnitConversion cnv = SetUOM(itemChoiced.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                            if (cnv != null)
                                            {
                                                cnvFact = cnv.CnvFact;
                                                unitMultDiv = cnv.MultDiv;
                                            }
                                            qtyAmtAvail = 0;
                                            if (CheckQtyAvail4AddFreeItem(itemChoiced.FreeItemID, itemChoiced.DiscID, itemChoiced.DiscSeq, itemChoiced.DiscLineRef, itemChoiced.IsSetPrioritySite
                                                , ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoiced.SiteType) == 1)
                                            {
                                                throw new MessageException("1045", "", new[] { itemChoiced.FreeItemID, siteID });
                                            }
                                            else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, itemChoiced.FreeItemID, uom, ref qtyAmtAvail))
                                            {
                                                AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + itemChoiced.FreeItemID + ',');
                                            }
                                            else
                                            {
                                                var disctblQty = objSeq.DonateGroupProduct != true && !objSeq.ConvertDiscAmtToFreeItem ? qtyBreak * (freeQty / itemChoiced.FreeItemQtyBase) : qtyAmt;
                                                InsertUpdateOrdDisc(objSeq, itemChoiced.BudgetID, 0, objTotQtyAmt.Amt, disctblQty, itemChoiced.BudgetID,
                                                    itemChoiced.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                AddFreeItem(itemChoiced, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                IncreaseDiscLineRef();
                                            }
                                        }
                                        itemChoiced.Sel = false;
                                    }
                                }
                            } //if(freeItemQty1>0)
                        }
                    }
                }
                #endregion
                #region truong hop and
                else
                {
                    if (messtmp != string.Empty)
                    {
                        AddBudgetToString(messtmp);//AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + ',');
                    }
                    else if (messSiteTmp != string.Empty)
                    {
                        _messSite += messSiteTmp;
                    }
                    // Add free item
                    DeductQtyAmtDiscount(objSeq, breakLineRef, lstDiscItem == null ? "C" : "I", qtyDeductUsed, lstDiscItem, itemClass);
                    foreach (var itemChoiced in lstCurrentChoice)
                    {
                        uom = itemChoiced.FreeItemUnit;
                        double freeQty = itemChoiced.FreeItemQty * itemChoiced.FreeItemQtyBase;//TRUONG HOP AND LAY SO SUAT LON NHAT 
                        if (objSeq.ConvertDiscAmtToFreeItem)
                        {
                            freeQty = (itemChoiced.PromoAmt / itemChoiced.PromoPrice).ToInt();
                        }
                        budgetIDLineRef = itemChoiced.BudgetID;
                        // có 1 SP km thì ko show popup
                        if (Util.PassNull(itemChoiced.FreeItemID) != string.Empty)
                        {
                            siteID = GetFreeItemSite(itemChoiced.FreeSiteID, itemChoiced.SiteType);
                            OM10100_pdInventoryByID_Result objInvt = GetInventory(itemChoiced.FreeItemID);
                            IN_UnitConversion cnv = SetUOM(itemChoiced.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                            if (cnv != null)
                            {
                                cnvFact = cnv.CnvFact;
                                unitMultDiv = cnv.MultDiv;
                            }
                            qtyAmtAvail = 0;
                            if (CheckQtyAvail4AddFreeItem(itemChoiced.FreeItemID, itemChoiced.DiscID, itemChoiced.DiscSeq, itemChoiced.DiscLineRef, itemChoiced.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoiced.SiteType) == 1)
                            {
                                throw new MessageException("1045", "", new[] { itemChoiced.FreeItemID, siteID });
                            }
                            else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, itemChoiced.FreeItemID, uom, ref qtyAmtAvail))
                            {
                                AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + itemChoiced.FreeItemID + ',');
                            }
                            else
                            {                                
                                InsertUpdateOrdDisc(objSeq, itemChoiced.BudgetID, 0, objTotQtyAmt.Amt, qtyBreak * (freeQty / itemChoiced.FreeItemQtyBase), itemChoiced.BudgetID,
                                    itemChoiced.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                AddFreeItem(itemChoiced, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                IncreaseDiscLineRef();
                            }
                        }
                        itemChoiced.Sel = false;
                    }
                }
                #endregion

            #endregion
                
                if (beginCalc)
                {
                    goto Begin;
                }
            } //if(lstFreeItem.Count>0)
        }
        //khuyến mãi nhóm BO
        private void CalculateGroupDiscBundle(OM10100_pdGetDiscSeq_Result objSeq, TotalQtyAmt objTotQtyAmt, List<OM10100_pdOM_DiscItem_Result> lstDiscItem, ref double discAmtTotal, ref double[] bundleNbr)
        { 
            string groupRefLineRef = string.Join(",", objTotQtyAmt.ListGroupLineRef);
            int maxGLot = 0;
            double discAmt = 0,
                discAmtCal = 0,
                discPct = 0,
                freeItemQty = 0,
                qtyBreak = 0,
                freeItemQtyCal = 0,
                qtyAmt = 0,
                subBreakQtyAmt = 0,
                cnvFact = 0,
                iterateAmt = 0,
                bndTotAmtQty = 0;

            string siteID = string.Empty,
                uom = string.Empty,                
                unitMultDiv = string.Empty,
                budgetID = string.Empty,
                breakLineRef = string.Empty;

            if (objSeq.ExactQty)
            {
                var checkExactPromo = true;
                for (int i = 0; i < bundleNbr.Count(); i++)
                {
                    if (bundleNbr[i] % 1 != 0 || (i > 0 && bundleNbr[i] != bundleNbr[i - 1]))
                    {
                        checkExactPromo = false;
                        break;
                    }
                }
                if (!checkExactPromo)
                {
                    return;
                }
            }
            Array.Sort(bundleNbr);
            qtyAmt = bundleNbr[0].ToInt();

            if (objSeq.SubBreakType == "A")
            {
                subBreakQtyAmt = objTotQtyAmt.SubAmt;
            }
            else if (objSeq.SubBreakType == "Q")
            {
                subBreakQtyAmt = objTotQtyAmt.SubQty;
            }
            _lstBreakActive = new List<string>();

        Begin:
            bool beginCalc = false;
            double discBonusFactor = 0;
            double qtyAmtAvail = 0;
            _qtyAvailPopup = 0;
            discAmtCal = GetBundleDiscBreak(objSeq, qtyAmt, ref qtyBreak, ref breakLineRef, bundleNbr, subBreakQtyAmt, discBonusFactor, ref budgetID, true);
            if (discAmtCal > 0 || discAmt > 0)
            {
                qtyAmtAvail = 0;
                #region -KM Tiền-
                if (!CheckAvailableDiscBudget(ref budgetID, objSeq.DiscID, objSeq.DiscSeq, ref discAmtCal, false, "", string.Empty, ref qtyAmtAvail))
                {
                    discAmtCal = 0;
                }
                if (objSeq.DiscFor == "P")
                {
                    discAmt = discAmtCal * objTotQtyAmt.Amt / 100;
                    discPct = discAmtCal;
                }
                else
                {
                    int numberOfSets = CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, maxGLot, objSeq.BreakBoundType);
                    if (discAmtCal > 0 || freeItemQtyCal > 0)
                    {
                        discAmt = discAmt + discAmtCal * numberOfSets;
                        if (objSeq.BreakBoundType != "L" || numberOfSets == 0)
                        {
                            qtyAmt = 0;
                        }
                        else
                        {
                            if (qtyAmt - numberOfSets * qtyBreak > 0 && _objOM.ProrateDisc != 0)
                            {
                                qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                goto Begin;
                            }
                        }                        
                    }
                } //if(discFor=="P")

                discAmtTotal += discAmt;
                if (discAmt > 0)
                {
                    bndTotAmtQty = lstDiscItem.Sum(p => p.BundleQty + p.BundleAmt);
                    int k = 0;
                    foreach (OM10100_pdOM_DiscItem_Result omDiscItem in lstDiscItem)
                    {
                        UpdateGroupDiscBundleByInvtIDV2(omDiscItem.InvtID, discPct, discAmt, objSeq, breakLineRef, ref iterateAmt,
                            k == lstDiscItem.Count - 1 ? true : false,
                            lstDiscItem[k].BundleQty + lstDiscItem[k].BundleAmt, bndTotAmtQty, lstDiscItem[k].UnitDesc, objTotQtyAmt.Amt);
                        k++;
                    }
                    InsertUpdateOrdDisc(objSeq, budgetID, discAmt, objTotQtyAmt.Amt, objTotQtyAmt.Qty, budgetID,
                        "", 0, _discLineRef, string.Empty, breakLineRef, groupRefLineRef, "", "", cnvFact);
                    IncreaseDiscLineRef();

                } //if(discAmt>0)
                #endregion
            } //if(discAmtCal>0 || discAmt>0)
            else
            {
                double qtyDeductUsed = 0;
                qtyBreak = 0;
                double promoAmt = 0;
                double origBonusAmt = 0;
                breakLineRef = string.Empty;
                promoAmt = GetBundleDiscBreak(objSeq, qtyAmt, ref qtyBreak, ref breakLineRef, bundleNbr, subBreakQtyAmt, discBonusFactor, ref budgetID, false);
                var lstFreeItem = _app.OM10100_pdOM_DiscFreeItem(objSeq.DiscID, objSeq.DiscSeq, breakLineRef, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                if (objSeq.DonateGroupProduct == true)
                {
                    lstFreeItem = lstFreeItem.OrderBy(x => x.GroupItem).ThenBy(x => x.Priority).ToList();
                }

                int numberOfSets = CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, maxGLot, objSeq.BreakBoundType);
                if (_objMaxLot != null)
                {
                    numberOfSets = _objMaxLot.Qty > numberOfSets ? numberOfSets : (int)_objMaxLot.Qty;
                    if (numberOfSets <= 0)
                    {
                        if (lstFreeItem.Count > 0)
                        {
                            lstFreeItem.Clear();
                            if (qtyAmt - numberOfSets * qtyBreak > 0 &&
                                _objOM.ProrateDisc != 0)
                            {
                                if (objSeq.BreakBoundType != "L")
                                {
                                    qtyAmt = 0;
                                }
                                else
                                {
                                    qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                    beginCalc = true;
                                }
                            }
                            else
                            {
                                beginCalc = false;
                            }
                        }
                        if (beginCalc)
                        {
                            goto Begin;
                        }
                    }
                    SetMaxLot(objSeq.DiscID, objSeq.DiscSeq, breakLineRef, _objMaxLot.Qty.Value, false);
                }
                #region -Free item discount-
                if (lstFreeItem.Count > 0)
                {
                    GetPromoAmt(ref promoAmt, ref origBonusAmt, objSeq, maxGLot.ToInt(), objTotQtyAmt.Amt, qtyAmt, qtyBreak, discBonusFactor);

                    int countRow = 0;
                    var lstCurrentChoice = new List<DiscountChoice>();
                    string choiceID = Guid.NewGuid().ToString();
                    string messtmp = "";
                    string messSiteTmp = string.Empty;
                    double maxQty = 0;
                    List<ErrorQtyAvail> messGroupError = new List<ErrorQtyAvail>();
                    foreach (var free in lstFreeItem)
                    {
                        siteID = GetFreeItemSite(free.FreeITemSiteID, free.SiteType);
                        string freeItemID = string.Empty;
                        countRow++;
                        budgetID = free.FreeItemBudgetID;
                        freeItemQtyCal = free.FreeItemQty;
                        if (!beginCalc)
                        {
                            freeItemQty = 0;
                        }

                        qtyDeductUsed = numberOfSets * qtyBreak;
                        if (freeItemQtyCal > 0)
                        {
                            freeItemQty = Math.Round(freeItemQty + freeItemQtyCal * numberOfSets, 0);
                            if (countRow == lstFreeItem.Count && qtyAmt - numberOfSets * qtyBreak > 0 &&
                                _objOM.ProrateDisc != 0)
                            {
                                if (objSeq.BreakBoundType != "L")
                                {
                                    qtyAmt = 0;
                                }
                                else
                                {
                                    qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                    beginCalc = true;
                                }
                            }
                            else
                            {
                                beginCalc = false;
                            }
                        } // if(freeItemQtyCal>0)
                        maxQty = freeItemQty / free.FreeItemQty;
                        if (freeItemQty > 0)
                        {
                            uom = free.UnitDescr;
                            freeItemID = free.FreeItemID;
                            var objData = _lstOM_OrdDiscOld.Where(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.BudgetID == budgetID && p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID && p.FreeItemID == free.FreeItemID && p.FreeItemQty == freeItemQty).FirstOrDefault();
                            double freeQty = (objData == null ?
                                            (int)Math.Floor(freeItemQty / free.FreeItemQty) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ?
                                                (int)Math.Floor(freeItemQty / free.FreeItemQty) : (int)Math.Floor(objData.FreeItemQty / free.FreeItemQty))) * free.FreeItemQty;

                            IN_UnitConversion cnv = SetUOM(freeItemID, uom, "", "");
                            if (cnv != null)
                            {
                                cnvFact = cnv.CnvFact;
                                unitMultDiv = cnv.MultDiv;
                            }

                            if (!messGroupError.Any(x => x.GroupItem == free.GroupItem))
                            {
                                ErrorQtyAvail error = new ErrorQtyAvail();
                                error.MaxQtyInGroup = maxQty * free.FreeItemQty;
                                error.GroupItem = free.GroupItem;
                                error.IsError = true;
                                messGroupError.Add(error);
                            }
                            if (objSeq.DonateGroupProduct == true)
                            {
                               
                                if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                {
                                    var checkChoice = _lstChoice.FirstOrDefault(p => p.Sel == true) == null ? false : true;
                                    var record = _lstChoice.FirstOrDefault(p => p.FreeItemID == freeItemID && p.Qty > 0);
                                    if (record == null)
                                    {
                                        if (objSeq.DonateGroupProduct == true)
                                        {
                                            freeQty = CheckQtyAvailInGroup(freeItemID, siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty);
                                            if (freeQty == 0)
                                            {
                                                if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                                {
                                                    messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).MessageError += freeItemID + " - " + siteID + ",";
                                                }
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                    else if (!_choice && !checkChoice)
                                    {
                                        if (objSeq.DonateGroupProduct == true)
                                        {
                                            freeQty = CheckQtyAvailInGroup(freeItemID, siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty);
                                            if (freeQty == 0)
                                            {
                                                if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                                {
                                                    messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).MessageError += freeItemID + " - " + siteID + ",";
                                                }
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                }
                                else
                                {
                                    if (objSeq.DonateGroupProduct == true)
                                    {
                                        if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                        {
                                            messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).IsError = false;
                                        }
                                    }
                                }
                            }
                            else
                            {
                                if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                {
                                    var checkChoice = _lstChoice.FirstOrDefault(p => p.Sel == true) == null ? false : true;

                                    var record = _lstChoice.FirstOrDefault(p => p.FreeItemID == freeItemID);
                                    if (record == null)
                                    {
                                        if (objSeq.ConvertDiscAmtToFreeItem)
                                        {
                                            if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, 1, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                            {
                                                messSiteTmp += freeItemID + " - " + siteID + ",";
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                freeQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                    else if (!_choice && !checkChoice)
                                    {
                                        if (objSeq.ConvertDiscAmtToFreeItem)
                                        {
                                            if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, 1, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                            {
                                                messSiteTmp += freeItemID + " - " + siteID + ",";
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                freeQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                }
                            }
                            qtyAmtAvail = 0;
                            if (!CheckAvailableDiscBudget(ref budgetID, objSeq.DiscID, objSeq.DiscSeq, ref freeItemQty, true, free.FreeItemID, free.UnitDescr, ref qtyAmtAvail))
                            {
                                AddBudgetTemp(ref messtmp, objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + "-" + free.FreeItemID + ",");
                                continue;
                            }

                            if (freeItemQty > 0 && (int)Math.Floor(freeItemQty / free.FreeItemQty) > 0 && (_screenNbr == "OM10100" || _screenNbr == "OM20500" && (qtyAmtAvail > 0 || _calcPromoOnly != 0)))
                            {
                                free.FreeITemSiteID = siteID;
                                free.FreeItemBudgetID = budgetID;
                                if (qtyAmtAvail == double.MaxValue)
                                {
                                    qtyAmtAvail = 0;
                                }
                                lstCurrentChoice.Add(
                                    AddCurrentChoice(choiceID, objSeq, breakLineRef, 0, 0, free, maxQty, freeItemQty, freeQty, qtyBreak
                                    , string.Empty, string.Empty, objData, free.UnitDescr, _lineRef, 0, unitMultDiv, cnvFact, qtyAmtAvail, groupRefLineRef)
                                );
                            }
                        }
                    }
                    if ((_qtyAvailPopup >= maxQty) && messSiteTmp != "" && objSeq.DonateGroupProduct == false)
                    {
                        foreach (var free in lstFreeItem)
                        {
                            var objData = _lstOM_OrdDiscOld.Where(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.BudgetID == budgetID && p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID && p.FreeItemID == free.FreeItemID && p.FreeItemQty == freeItemQty).FirstOrDefault();
                            double freeQty = (objData == null ?
                                            (int)Math.Floor(freeItemQty / free.FreeItemQty) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ?
                                                (int)Math.Floor(freeItemQty / free.FreeItemQty) : (int)Math.Floor(objData.FreeItemQty / free.FreeItemQty))) * free.FreeItemQty;

                            var qtyAvail = 0.0;
                            string siteInvtID = siteID + "@@" + free.FreeItemID;
                            if (_lstFreeItemQtyAvailUsed.ContainsKey(siteInvtID))
                            {
                                qtyAvail = _lstFreeItemQtyAvailUsed[siteInvtID];
                            }
                            else
                            {
                                IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == free.FreeItemID);
                                qtyAvail = (objItemSite == null) ? 0 : objItemSite.QtyAvail;
                                _lstFreeItemQtyAvailUsed.Add(siteInvtID, qtyAvail);
                            }
                            free.FreeITemSiteID = siteID;
                            free.FreeItemBudgetID = budgetID;
                            string invtID = string.Empty;
                            string invtDescr = string.Empty;
                            if (objSeq.DiscType == "L" && objTotQtyAmt.ListGroupLineRef.Count > 0)
                            {
                                string detOfFirstLineRef = objTotQtyAmt.ListGroupLineRef[0];
                                invtID = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).InvtID;
                                invtDescr = _lstOldOrdDet.FirstOrDefault(x => x.LineRef == detOfFirstLineRef).Descr;
                            }
                            if (qtyAmtAvail == double.MaxValue)
                            {
                                qtyAmtAvail = 0;
                            }
                            bool checkAddCurrentChoice = true;
                            foreach (var item in lstCurrentChoice)
                            {
                                if (item.LineRef == _lineRef && item.InvtID == invtID && item.DiscID == objSeq.DiscID && item.DiscSeq == objSeq.DiscSeq && item.DiscLineRef == breakLineRef && item.FreeItemID == free.FreeItemID)
                                {
                                    checkAddCurrentChoice = false;
                                }
                            }

                            if (qtyAvail > 0 && checkAddCurrentChoice)
                            {
                                lstCurrentChoice.Add(
                                    AddCurrentChoice(choiceID, objSeq, breakLineRef, promoAmt, origBonusAmt, free, maxQty, qtyAvail, qtyAvail, qtyBreak
                                    , invtDescr, invtID, null, free.UnitDescr, _lineRef, 0, unitMultDiv, cnvFact, qtyAmtAvail, groupRefLineRef)
                                );
                            }
                        }
                    }
                    var totalGroupError = 0;
                    if (objSeq.DonateGroupProduct == true)
                    {
                        totalGroupError = CheckErrorInGroup(messGroupError, ref lstCurrentChoice, maxQty);
                    }
                    #region truong hop or
                    if (lstFreeItem.Count > 1 &&
                    objSeq.AutoFreeItem == false && objSeq.ProAplForItem == "A")
                    {
                        var minAmt = lstCurrentChoice.Count > 0 ? lstCurrentChoice.Min(x => x.PromoPrice) : 0;
                        if (objSeq.DonateGroupProduct != true
                            && lstCurrentChoice.Sum(p => p.Qty) < maxQty)
                        {
                            if (lstCurrentChoice.Count == 0 && messSiteTmp.Length > 0)
                            {
                                _messSite += messSiteTmp;
                            }
                            else
                            {
                                AddBudgetToString(messtmp);
                            }
                        }
                        else if (objSeq.DonateGroupProduct != true
                            && objSeq.ConvertDiscAmtToFreeItem
                            && lstCurrentChoice.Sum(p => p.tempLineAmt) < promoAmt
                            && promoAmt - lstCurrentChoice.Sum(p => p.tempLineAmt) >= minAmt)
                        {
                            _messSite += messSiteTmp;
                        }
                        else if (objSeq.DonateGroupProduct != true
                               && objSeq.ConvertDiscAmtToFreeItem
                               && minAmt > promoAmt)
                        {
                            if (!_messMinPrice.Any(x => x == objSeq.DiscID + " - " + objSeq.DiscSeq))
                            {
                                _messMinPrice.Add(objSeq.DiscID + " - " + objSeq.DiscSeq);
                            }
                        }
                        else if (objSeq.DonateGroupProduct == true && totalGroupError == messGroupError.Count)
                        {
                            //_messBudget += discID + "-" + discSeq + "-" + budgetID + ',';
                        }
                        else
                        {
                            if (lstCurrentChoice.Count > 0)
                            {
                                DeductQtyAmtDiscount(objSeq, breakLineRef, "B", qtyDeductUsed, lstDiscItem, null);

                                if (!_lstChoice.Any(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == lstCurrentChoice[0].LevelID && p.InvtID == "" && p.MaxQty == lstCurrentChoice[0].MaxQty && p.BudgetID == budgetID && p.FreeItemID == lstCurrentChoice[0].FreeItemID))
                                {
                                    if (_qtyAvailPopup == maxQty && objSeq.DonateGroupProduct == false)
                                    {
                                        foreach (var objChoice in lstCurrentChoice)//nếu có 1 thằng thì tính luôn, ko hiện popup
                                        {
                                            var choice = _lstChoice.FirstOrDefault(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == objChoice.LevelID && p.InvtID == lstCurrentChoice[0].InvtID && p.FreeItemID == objChoice.FreeItemID && p.MaxQty == objChoice.MaxQty && p.BudgetID == objChoice.BudgetID);
                                            if (choice == null)
                                            {
                                                if (Util.PassNull(objChoice.FreeItemID) != string.Empty)
                                                {
                                                    siteID = GetFreeItemSite(objChoice.FreeSiteID, objChoice.SiteType);
                                                    uom = objChoice.FreeItemUnit;
                                                    //freeItemID = objChoice.FreeItemID;
                                                    budgetID = objChoice.BudgetID;
                                                    double freeQty = Math.Floor(objChoice.FreeItemQty * objChoice.FreeItemQtyBase);//NEU CO 1 THI LAY SO XUAT LON NHAT
                                                    if (objSeq.ConvertDiscAmtToFreeItem)
                                                    {
                                                        freeQty = (objChoice.PromoAmt / objChoice.PromoPrice).ToInt();
                                                    }
                                                    OM10100_pdInventoryByID_Result objInvt = GetInventory(objChoice.FreeItemID);

                                                    IN_UnitConversion cnv = SetUOM(objChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                    if (cnv != null)
                                                    {
                                                        cnvFact = cnv.CnvFact;
                                                        unitMultDiv = cnv.MultDiv;
                                                    }
                                                    qtyAmtAvail = 0;
                                                    if (CheckQtyAvail4AddFreeItem(objChoice.FreeItemID, objChoice.DiscID, objChoice.DiscSeq, objChoice.DiscLineRef, objChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, objChoice.SiteType) == 1)
                                                    {
                                                        throw new MessageException("1045", "", new[] { objChoice.FreeItemID, siteID });
                                                    }
                                                    else if (!CheckAvailableDiscBudget(ref budgetID, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, objChoice.FreeItemID, objChoice.FreeItemUnit, ref qtyAmtAvail))
                                                    {
                                                        AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + "-" + objChoice.FreeItemID + ',');
                                                    }
                                                    else
                                                    {
                                                        var disctblQty = objSeq.DonateGroupProduct != true && !objSeq.ConvertDiscAmtToFreeItem ? qtyBreak * (freeQty / objChoice.FreeItemQtyBase) : qtyAmt;
                                                        InsertUpdateOrdDisc(objSeq, objChoice.BudgetID, 0, objTotQtyAmt.Amt, disctblQty, objChoice.BudgetID,
                                                            objChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                        AddFreeItem(objChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                        IncreaseDiscLineRef();
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else
                                    {
                                        foreach (var objChoice in lstCurrentChoice)//nếu có 1 thằng thì tính luôn, ko hiện thị popup
                                        {
                                            var choice = _lstChoice.FirstOrDefault(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == objChoice.LevelID && p.InvtID == "" && p.FreeItemID == objChoice.FreeItemID && p.MaxQty == objChoice.MaxQty && p.BudgetID == budgetID);
                                            if (choice == null)
                                            {
                                                AddListChoice(objChoice, breakLineRef);
                                            }
                                        }
                                        if (lstCurrentChoice.Count > 1)
                                        {
                                            _choice = true;
                                        }
                                        else
                                        {
                                            var objChoice = lstCurrentChoice[0];
                                            // có 1 SP km thì ko show popup
                                            if (Util.PassNull(objChoice.FreeItemID) != string.Empty)
                                            {
                                                uom = objChoice.FreeItemUnit;
                                                budgetID = objChoice.BudgetID;
                                                double freeQty = objChoice.FreeItemQty * objChoice.FreeItemQtyBase;
                                                OM10100_pdInventoryByID_Result objInvt = GetInventory(objChoice.FreeItemID);
                                                IN_UnitConversion cnv = SetUOM(objChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                if (cnv != null)
                                                {
                                                    cnvFact = cnv.CnvFact;
                                                    unitMultDiv = cnv.MultDiv;
                                                }
                                                qtyAmtAvail = 0;
                                                if (CheckQtyAvail4AddFreeItem(objChoice.FreeItemID, objChoice.DiscID, objChoice.DiscSeq, objChoice.DiscLineRef, objChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, objChoice.SiteType) == 1)
                                                {
                                                    throw new MessageException("1045", "", new[] { objChoice.FreeItemID, siteID });
                                                }
                                                else if (!CheckAvailableDiscBudget(ref budgetID, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, objChoice.FreeItemID, objChoice.FreeItemUnit, ref qtyAmtAvail))
                                                {
                                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + "-" + objChoice.FreeItemID + ',');
                                                }
                                                else
                                                {
                                                    InsertUpdateOrdDisc(objSeq, objChoice.BudgetID, 0, objTotQtyAmt.Amt, qtyBreak * (freeQty / objChoice.FreeItemQtyBase), objChoice.BudgetID,
                                                        objChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                    AddFreeItem(objChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                    IncreaseDiscLineRef();
                                                }
                                            }
                                        }
                                    }
                                    
                                }
                                else // Đã chọn
                                {
                                    var objChoice = lstCurrentChoice[0];
                                    foreach (var itemChoiced in _lstChoice)
                                    {
                                        if (itemChoiced.DiscID == objSeq.DiscID
                                                                    && itemChoiced.DiscSeq == objSeq.DiscSeq
                                                                    && itemChoiced.MaxQty == objChoice.MaxQty
                                                                    && itemChoiced.InvtID == ""
                                                                    && itemChoiced.LevelID == objChoice.LevelID
                                                                    && itemChoiced.FreeItemQty > 0
                                                                    && itemChoiced.Sel == true
                                            )
                                        {
                                            uom = itemChoiced.FreeItemUnit;
                                            double freeQty = itemChoiced.FreeItemQty * itemChoiced.FreeItemQtyBase;
                                            budgetID = itemChoiced.BudgetID;
                                            // có 1 SP km thì ko show popup
                                            if (Util.PassNull(itemChoiced.FreeItemID) != string.Empty)
                                            {
                                                OM10100_pdInventoryByID_Result objInvt = GetInventory(itemChoiced.FreeItemID);
                                                IN_UnitConversion cnv = SetUOM(itemChoiced.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                if (cnv != null)
                                                {
                                                    cnvFact = cnv.CnvFact;
                                                    unitMultDiv = cnv.MultDiv;
                                                }
                                                qtyAmtAvail = 0;
                                                if (CheckQtyAvail4AddFreeItem(itemChoiced.FreeItemID, itemChoiced.DiscID, itemChoiced.DiscSeq, itemChoiced.DiscLineRef, itemChoiced.IsSetPrioritySite
                                                    , ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoiced.SiteType) == 1)
                                                {
                                                    //throw new MessageException("1045", "", new[] { freeItemID, siteID });???
                                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + "-" + itemChoiced.FreeItemID + ',');
                                                }
                                                else if (!CheckAvailableDiscBudget(ref budgetID, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, itemChoiced.FreeItemID, itemChoiced.FreeItemUnit, ref qtyAmtAvail))
                                                {
                                                    AddBudgetTemp(ref messtmp, objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + "-" + itemChoiced.FreeItemID + ",");
                                                }
                                                else
                                                {
                                                    InsertUpdateOrdDisc(objSeq, itemChoiced.BudgetID, 0, objTotQtyAmt.Amt, qtyBreak * (freeQty / itemChoiced.FreeItemQtyBase), itemChoiced.BudgetID,
                                                        itemChoiced.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);

                                                    AddFreeItem(itemChoiced, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                    IncreaseDiscLineRef();
                                                }
                                            }
                                            itemChoiced.Sel = false;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    #endregion
                    #region truong hop and
                    else
                    {
                        if (messtmp != "")
                        {
                            AddBudgetToString(messtmp);  //_messBudget += objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + ',';
                        }
                        else if (messSiteTmp != string.Empty)
                        {
                            _messSite += messSiteTmp;
                        }
                        // Add free item
                        DeductQtyAmtDiscount(objSeq, breakLineRef, "B", qtyDeductUsed, lstDiscItem, null);
                        foreach (var itemChoice in lstCurrentChoice)
                        {
                            uom = itemChoice.FreeItemUnit;
                            double freeQty = itemChoice.FreeItemQty * itemChoice.FreeItemQtyBase;
                            budgetID = itemChoice.BudgetID;
                            // có 1 SP km thì ko show popup
                            if (Util.PassNull(itemChoice.FreeItemID) != string.Empty)
                            {
                                OM10100_pdInventoryByID_Result objInvt = GetInventory(itemChoice.FreeItemID);

                                IN_UnitConversion cnv = SetUOM(itemChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                if (cnv != null)
                                {
                                    cnvFact = cnv.CnvFact;
                                    unitMultDiv = cnv.MultDiv;
                                }
                                qtyAmtAvail = 0;
                                if (CheckQtyAvail4AddFreeItem(itemChoice.FreeItemID, itemChoice.DiscID, itemChoice.DiscSeq, itemChoice.DiscLineRef, itemChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoice.SiteType) == 1)
                                {
                                    throw new MessageException("1045", "", new[] { itemChoice.FreeItemID, siteID });
                                }
                                else if (!CheckAvailableDiscBudget(ref budgetID, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, itemChoice.FreeItemID, itemChoice.FreeItemUnit, ref qtyAmtAvail))
                                {
                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + "-" + itemChoice.FreeItemID + ',');
                                }
                                else
                                {
                                    InsertUpdateOrdDisc(objSeq, itemChoice.BudgetID, 0, objTotQtyAmt.Amt, qtyBreak * (freeQty / itemChoice.FreeItemQtyBase), itemChoice.BudgetID,
                                        itemChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                    AddFreeItem(itemChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                    IncreaseDiscLineRef();
                                }
                            }

                            itemChoice.Sel = false;
                        }
                    }
                    #endregion

                #endregion
                    if (beginCalc)
                    {
                        goto Begin;
                    }
                } // if(lstFree.Count>0)
            }
        }


        private DiscountChoice AddCurrentChoice(string choiceID, OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, double promoAmt, double origDiscAmt, OM10100_pdOM_DiscFreeItem_Result free
            , double maxQty, double freeItemQty, double freeQty, double qtyBreak, string descr, string invtID, OM_OrdDisc objData, string slsunit, string lineRef, int lstFreeItemCount
            , string feeItemUnitMultDiv, double freeItemCnvFact, double totalBudget, string grouplineRef)
        {
            var tempLineAmt = 0.0;
            GetQtyAvailByInvtSite(free.FreeItemID, free.FreeITemSiteID);
            double cnvFact = 1;
            string unitMultDiv = "M";
            IN_UnitConversion cnv = SetUOM(free.FreeItemID, free.UnitDescr, "", "");
            if (cnv != null)
            {
                cnvFact = cnv.CnvFact;
                unitMultDiv = cnv.MultDiv;
            }
            if (objSeq.ConvertDiscAmtToFreeItem)
            {
                var qtyAvail = _lstFreeQtyAvail[free.FreeItemID + free.FreeITemSiteID];
                
                //IN_UnitConversion cnv = SetUOM(free.FreeItemID, free.UnitDescr, "", "");
                //if (cnv != null)
                //{
                //    cnvFact = cnv.CnvFact;
                //    unitMultDiv = cnv.MultDiv;
                //}
                var tmpQtyAvail = unitMultDiv == "M" ? qtyAvail / cnvFact : qtyAvail * cnvFact;
                var maxLot = (promoAmt / free.PromoPrice).ToInt();
                var maxQtyInGroup = maxLot > tmpQtyAvail ? tmpQtyAvail : maxLot;
                tempLineAmt = maxQtyInGroup * free.PromoPrice;
            }
            UpdateFeeItemQtyAmtUsed(free.FreeItemID, free.FreeITemSiteID, freeItemQty);
            var objCurrentChoice = new DiscountChoice()// add danh sách chọn
            {
                Descr = descr,
                InvtID = invtID,
                DiscDescr = objSeq.Descr,
                DiscID = objSeq.DiscID,
                DiscSeq = objSeq.DiscSeq,
                DiscLineRef = breakLineRef,
                Qty = Math.Round((freeItemQty / free.FreeItemQty),2),
                Unit = slsunit,
                LineRef = lineRef,
                LevelID = qtyBreak,
                FreeItemID = free.FreeItemID,
                FreeSiteID = free.FreeITemSiteID,
                FreeItemUnit = free.UnitDescr,
                FreeItemQty = objSeq.DonateGroupProduct == true ?
                            freeQty : (objData == null || lstFreeItemCount == 1) ?
                            Math.Round((freeItemQty / free.FreeItemQty),1) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ? Math.Round((freeItemQty / free.FreeItemQty),1) : Math.Round((objData.FreeItemQty / free.FreeItemQty),1)),

                FreeItemQtyBase = objSeq.DonateGroupProduct == true || objSeq.ConvertDiscAmtToFreeItem ? 1 : free.FreeItemQty,
                FreeItemDescr = free.FreeItemDescr,
                Index = choiceID,
                MaxQty = maxQty,
                Sel = (objData == null || lstFreeItemCount == 1) ? false : true,
                BudgetID = free.FreeItemBudgetID,
                DonateGroupProduct = objSeq.DonateGroupProduct,
                Priority = free.Priority,
                GroupItem = free.GroupItem,
                MaxQtyInGroup = maxQty * free.FreeItemQty,
                QtyAvail = freeQty < maxQty * free.FreeItemQty ? freeQty : maxQty * free.FreeItemQty,
                PromoPrice = free.PromoPrice,
                SubBreakType = objSeq.SubBreakType,
                BreakBoundType = objSeq.BreakBoundType,
                PromoAmt = promoAmt,
                ConvertDiscAmtToFreeItem = objSeq.ConvertDiscAmtToFreeItem,
                tempLineAmt = tempLineAmt,
                PromoBonusAmt = origDiscAmt,
                SiteType = free.SiteType,
                IsSetPrioritySite = free.IsSetPrioritySite,
                FreeItemCnvFact = freeItemCnvFact,
                FeeItemUnitMultDiv = feeItemUnitMultDiv,
                TotalBudget = totalBudget,
                GroupLineRef = grouplineRef,
                CnvFact = cnvFact
            };
            return objCurrentChoice;
        }

        private void GetQtyAvailByInvtSite(string freeItemID, string siteID)
        {
            if (!_lstFreeQtyAvail.ContainsKey(freeItemID + siteID))
            {
                var itemSite = _app.IN_ItemSite.FirstOrDefault(x => x.SiteID == siteID && x.InvtID == freeItemID);
                double qtyAvail = (itemSite != null) ? qtyAvail = itemSite.QtyAvail : 0;
                _lstFreeQtyAvail.Add(freeItemID + siteID, _calcPromoOnly == 1 ? int.MaxValue : qtyAvail);          //_lstFreeQtyAvail.Add(freeItemID + siteID, qtyAvail); //       
            }
        }
        private void AddListChoice(DiscountChoice objChoice, string breakLineRef)
        {
            _lstChoice.Add(new DiscountChoice()
            {
                Descr = objChoice.Descr,
                InvtID = objChoice.InvtID,
                DiscDescr = objChoice.DiscDescr,
                DiscID = objChoice.DiscID,
                DiscSeq = objChoice.DiscSeq,
                DiscLineRef = breakLineRef,
                Qty = objChoice.Qty,
                Unit = objChoice.Unit,
                LineRef = objChoice.LineRef,
                LevelID = objChoice.LevelID,
                FreeItemID = objChoice.FreeItemID,
                FreeSiteID = objChoice.FreeSiteID,
                FreeItemUnit = objChoice.FreeItemUnit,
                FreeItemQty = objChoice.FreeItemQty,
                FreeItemQtyBase = objChoice.FreeItemQtyBase,
                FreeItemDescr = objChoice.FreeItemDescr,
                Index = objChoice.Index,
                MaxQty = objChoice.MaxQty,
                Sel = objChoice.Sel,
                BudgetID = objChoice.BudgetID,
                DonateGroupProduct = objChoice.DonateGroupProduct,
                Priority = objChoice.Priority,
                GroupItem = objChoice.GroupItem,
                MaxQtyInGroup = objChoice.MaxQtyInGroup,
                QtyAvail = objChoice.QtyAvail,
                PromoPrice = objChoice.PromoPrice,
                SubBreakType = objChoice.SubBreakType,
                BreakBoundType = objChoice.BreakBoundType,
                PromoAmt = objChoice.PromoAmt,
                PromoLineAmt = objChoice.PromoPrice * objChoice.FreeItemQty,
                ConvertDiscAmtToFreeItem = objChoice.ConvertDiscAmtToFreeItem,
                PromoBonusAmt = objChoice.PromoBonusAmt,
                SiteType = objChoice.SiteType,
                FeeItemUnitMultDiv = objChoice.FeeItemUnitMultDiv,
                FreeItemCnvFact = objChoice.FreeItemCnvFact,
                TotalBudget = objChoice.TotalBudget,
                ToTalQtyFreeItem = objChoice.ToTalQtyFreeItem,
                GroupLineRef = objChoice.GroupLineRef,
                CnvFact = objChoice.CnvFact
            });
        }

        private int CheckErrorInGroup(List<ErrorQtyAvail> messGroupError, ref List<DiscountChoice> lstCurrentChoice, double maxQty)
        {
            int totalGroupError = 0;
            foreach (var itError in messGroupError)
            {
                if (itError.IsError)
                {
                    _messSite += itError.MessageError;
                }
                if (lstCurrentChoice.Where(x => x.GroupItem == itError.GroupItem).Sum(p => p.FreeItemQty) < itError.MaxQtyInGroup || lstCurrentChoice.Sum(p => p.Qty) < maxQty)
                {
                    totalGroupError++;
                    for (var idx = lstCurrentChoice.Count - 1; idx >= 0; idx--)
                    {
                        if (lstCurrentChoice[idx].GroupItem == itError.GroupItem)
                        {
                            _messSite += lstCurrentChoice[idx].FreeItemID + " - " + lstCurrentChoice[idx].FreeSiteID + ",";
                            lstCurrentChoice.Remove(lstCurrentChoice[idx]);
                        }
                    }
                }
            }
            return totalGroupError;
        }
        private OM10100_pgOrdDiscDetail_Result AddOrdDiscDetail(OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, string lineRef, string invtID, string unitDescr, double qtyUsed, double amtUsed)
        {
            OM10100_pgOrdDiscDetail_Result objOrdDiscDet = new OM10100_pgOrdDiscDetail_Result();
            if (qtyUsed > 0 || amtUsed > 0)
            {
                objOrdDiscDet.BreakLineRef = breakLineRef;
                objOrdDiscDet.DiscFor = objSeq.DiscFor;
                objOrdDiscDet.DiscID = objSeq.DiscID;
                objOrdDiscDet.DiscSeq = objSeq.DiscSeq;
                objOrdDiscDet.DiscType = objSeq.DiscType;
                objOrdDiscDet.InvtID = invtID;
                objOrdDiscDet.SOLineRef = lineRef;
                objOrdDiscDet.LineRef = _applyDetailLineRef;
                objOrdDiscDet.Qty = qtyUsed;
                objOrdDiscDet.Amt = amtUsed;
                objOrdDiscDet.Unit = unitDescr;
                _lstOrdDiscDetail.Add(objOrdDiscDet);
                if (objSeq.ExcludePromo.PassNull() != string.Empty)
                {
                    _lstExcludeDisccount.AddRange(objSeq.ExcludePromo.Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries));
                }
            }
            return objOrdDiscDet;
        }

        #endregion

        #region -KM Chứng Từ-
        //Khuyến mãi chứng từ
        private void CalculateDocDisc(OM10100_pdGetDiscSeq_Result objSeq, ref double docDiscAmt)
        {
            string budgetIDLineRef = "";
            string groupRefLineRef = string.Empty;
            int maxGLot = 0;
            double discAmt = 0,
                discAmtCal = 0,
                discPct = 0,
                freeItemQty = 0,
                freeItemQtyCal = 0,
                qtyBreak = 0,
                amt = 0,
                qtyAmt = 0,
                cnvFact = 0,
                docAmt = 0;
            string siteID = string.Empty,
                uom = string.Empty,
                unitMultDiv = string.Empty,                
                breakLineRef = string.Empty;

            docAmt = _objOrder.LineAmt - _objOrder.VolDiscAmt;
            amt = docAmt;
            if (_objOM.InlcSOFeeDisc)
            {
                qtyAmt = amt + _objOrder.SOFeeTot;
                amt = amt + _objOrder.SOFeeTot;
            }
            else
            {
                qtyAmt = amt;
            }
        Begin:
            bool beginCalc = false;
            double discBonusFactor = 0;
            double qtyAmtAvail = 0;
            discAmt = 0;
            _qtyAvailPopup = 0;
            discAmtCal = GetDiscBreakV2(objSeq, qtyAmt, ref qtyBreak, ref breakLineRef, ref discBonusFactor, ref budgetIDLineRef, true);
            if (discAmtCal > 0 || discAmt > 0)
            {
                if (objSeq.DiscFor == "P")
                {
                    discAmt = Math.Round(discAmtCal * amt / 100, 0, MidpointRounding.AwayFromZero);
                    discPct = discAmtCal;
                    if (discAmt > 0)
                    {
                        amt = docAmt;
                        docDiscAmt += discAmt;
                        qtyAmtAvail = 0;
                        if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref discAmt, false, "", string.Empty, ref qtyAmtAvail))
                        {
                            discAmt = 0;
                            docDiscAmt = 0;
                        }
                        if (discAmt > 0)
                        {
                            InsertUpdateOrdDisc(objSeq, budgetIDLineRef, discAmt, amt, 0,
                                budgetIDLineRef, "", 0, _discLineRef, string.Empty, breakLineRef, groupRefLineRef, string.Empty, string.Empty, 0);
                            IncreaseDiscLineRef();
                        }


                    }
                } //if(discFor=="P")
                else
                {
                    var discountRate = CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, maxGLot, objSeq.BreakBoundType);
                    if (discAmtCal > 0 || freeItemQtyCal > 0)
                    {
                        discAmt = Math.Round(discAmt + discAmtCal * discountRate, 0);

                        if (qtyBreak != 1 && qtyAmt - discountRate * qtyBreak >= 0 && _objOM.ProrateDisc != 0)
                        {
                            if (discAmt > 0)
                            {
                                amt = docAmt;
                                docDiscAmt += discAmt;
                                qtyAmtAvail = 0;
                                if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref discAmt, false, "", string.Empty, ref qtyAmtAvail))
                                {
                                    discAmt = 0;
                                    docDiscAmt = 0;
                                }
                                if (discAmt > 0)
                                {
                                    InsertUpdateOrdDisc(objSeq, budgetIDLineRef, discAmt, amt, 0,
                                        budgetIDLineRef, "", 0, _discLineRef, string.Empty, breakLineRef, groupRefLineRef, string.Empty, string.Empty, 0);
                                    IncreaseDiscLineRef();
                                }


                            }

                            if (objSeq.BreakBoundType != "L")
                            {
                                qtyAmt = 0;
                            }
                            else
                            {
                                qtyAmt = qtyAmt - discountRate * qtyBreak;
                                goto Begin;
                            }
                            
                        }
                    } //if(discAmtCal>0 || freeItemQtyCal>0)
                }

                
            } //if(discAmtCal>0 || discAmt>0)
            else
            {
                double promoAmt = 0.0;
                var origDiscAmt = 0;
                qtyBreak = 0;
                breakLineRef = string.Empty;
                GetDiscBreakV2(objSeq, qtyAmt, ref qtyBreak, ref breakLineRef, ref discBonusFactor, ref budgetIDLineRef, false);
                var lstFreeItem =
                    _app.OM10100_pdOM_DiscFreeItem(objSeq.DiscID, objSeq.DiscSeq, breakLineRef, Current.UserName, Current.CpnyID, Current.LangID).ToList().ToList();
                if (objSeq.DonateGroupProduct == true)
                {
                    lstFreeItem = lstFreeItem.OrderBy(x => x.GroupItem).ThenBy(x => x.Priority).ToList();
                }
                int numberOfSets = CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, maxGLot, objSeq.BreakBoundType);
                if (_objMaxLot != null)
                {
                    numberOfSets = _objMaxLot.Qty > numberOfSets ? numberOfSets : (int)_objMaxLot.Qty;
                    if (numberOfSets <= 0)
                    {
                        if (lstFreeItem.Count > 0)
                        {
                            lstFreeItem.Clear();
                            if (qtyAmt - numberOfSets * qtyBreak > 0 && _objOM.ProrateDisc != 0)
                            {
                                if (objSeq.BreakBoundType != "L" || numberOfSets == 0)
                                {
                                    qtyAmt = 0;
                                }
                                else
                                {
                                    qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                    beginCalc = true;
                                    goto Begin;
                                }
                            }
                        }
                    }
                    SetMaxLot(objSeq.DiscID, objSeq.DiscSeq, breakLineRef, _objMaxLot.Qty.Value, false);
                }
                if (lstFreeItem.Count > 0)
                {
                    int countRow = 0;
                    var lstCurrentChoice = new List<DiscountChoice>();
                    string choiceID = Guid.NewGuid().ToString();
                    string messtmp = "";
                    string messSiteTmp = string.Empty;
                    double maxQty = 0;
                    List<ErrorQtyAvail> messGroupError = new List<ErrorQtyAvail>();
                    string freeItemID = string.Empty;
                    foreach (var free in lstFreeItem)
                    {
                        freeItemID = string.Empty;
                        countRow++;
                        budgetIDLineRef = free.FreeItemBudgetID;
                        freeItemQtyCal = free.FreeItemQty;
                        if (!beginCalc)
                        {
                            freeItemQty = 0;
                        }
                        if (freeItemQtyCal > 0)
                        {
                            freeItemQty = Math.Round(freeItemQty + freeItemQtyCal * numberOfSets, 0);
                            if (countRow == lstFreeItem.Count && qtyAmt - numberOfSets * qtyBreak > 0 &&
                                _objOM.ProrateDisc != 0)
                            {
                                if (objSeq.BreakBoundType != "L")
                                {
                                    qtyAmt = 0;
                                }
                                else
                                {
                                    qtyAmt = qtyAmt - numberOfSets * qtyBreak;
                                    beginCalc = true;
                                }
                            }
                            else
                            {
                                beginCalc = false;
                            }
                        } // if(freeItemQtyCal>0)
                        maxQty = freeItemQty / free.FreeItemQty;
                        if (freeItemQty > 0)
                        {
                            amt = docAmt;
                            docDiscAmt += discAmt;
                            siteID = GetFreeItemSite(free.FreeITemSiteID, free.SiteType);

                            var objData = _lstOM_OrdDiscOld.Where(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.BudgetID == budgetIDLineRef && p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID && p.FreeItemID == free.FreeItemID && p.DiscBreakLineRef == breakLineRef).FirstOrDefault();
                            double freeQty = (objData == null ? (int)Math.Floor(freeItemQty / free.FreeItemQty) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ? (int)Math.Floor(freeItemQty / free.FreeItemQty) : (int)Math.Floor(objData.FreeItemQty / free.FreeItemQty))) * free.FreeItemQty;

                            uom = free.UnitDescr;
                            freeItemID = free.FreeItemID;
                            IN_UnitConversion cnv = SetUOM(freeItemID, uom, "", "");
                            if (cnv != null)
                            {
                                cnvFact = cnv.CnvFact;
                                unitMultDiv = cnv.MultDiv;
                            }
                            if (!messGroupError.Any(x => x.GroupItem == free.GroupItem))
                            {
                                ErrorQtyAvail error = new ErrorQtyAvail();
                                error.GroupItem = free.GroupItem;
                                error.IsError = true;
                                messGroupError.Add(error);
                            }

                            if (objSeq.DonateGroupProduct == true)
                            {
                                

                                if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                {
                                    var checkChoice = _lstChoice.FirstOrDefault(p => p.Sel == true) == null ? false : true;
                                    var record = _lstChoice.FirstOrDefault(p => p.FreeItemID == freeItemID && p.Qty > 0);
                                    if (record == null)
                                    {
                                        if (objSeq.DonateGroupProduct == true)
                                        {
                                            freeQty = CheckQtyAvailInGroup(freeItemID, siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty);
                                            if (freeQty == 0)
                                            {
                                                if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                                {
                                                    messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).MessageError += freeItemID + " - " + siteID + ",";
                                                }
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                    else if (!_choice && !checkChoice)
                                    {
                                        if (objSeq.DonateGroupProduct == true)
                                        {
                                            freeQty = CheckQtyAvailInGroup(freeItemID, siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty);
                                            if (freeQty == 0)
                                            {
                                                if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                                {
                                                    messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).MessageError += freeItemID + " - " + siteID + ",";
                                                }
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                }
                                else
                                {
                                    if (objSeq.DonateGroupProduct == true)
                                    {
                                        if (!messGroupError.Any(x => x.GroupItem == free.GroupItem) || messGroupError.Any(x => x.GroupItem == free.GroupItem & x.IsError == true))
                                        {
                                            messGroupError.FirstOrDefault(x => x.GroupItem == free.GroupItem).IsError = false;
                                        }
                                    }
                                }
                            }
                            else
                            {
                                if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                {
                                    var checkChoice = _lstChoice.FirstOrDefault(p => p.Sel == true) == null ? false : true;

                                    var record = _lstChoice.FirstOrDefault(p => p.FreeItemID == freeItemID);
                                    if (record == null)
                                    {
                                        if (objSeq.ConvertDiscAmtToFreeItem)
                                        {
                                            if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, 1, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                            {
                                                messSiteTmp += freeItemID + " - " + siteID + ",";
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                freeQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                    else if (!_choice && !checkChoice)
                                    {
                                        if (objSeq.ConvertDiscAmtToFreeItem)
                                        {
                                            if (CheckQtyAvail(freeItemID, free.DiscID, free.DiscSeq, free.LineRef, free.IsSetPrioritySite, ref siteID, unitMultDiv, 1, cnvFact, true, string.Empty, free.SiteType, free.FreeItemQty) == 1)
                                            {
                                                messSiteTmp += freeItemID + " - " + siteID + ",";
                                                freeItemID = string.Empty;
                                                freeItemQty = 0;
                                                freeQty = 0;
                                                continue;
                                            }
                                        }
                                        else
                                        {
                                            messSiteTmp += freeItemID + " - " + siteID + ",";
                                            freeItemID = string.Empty;
                                            freeItemQty = 0;
                                            freeQty = 0;
                                            continue;
                                        }
                                    }
                                }
                            }
                            qtyAmtAvail = 0;
                            if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeItemQty, true, free.FreeItemID, free.UnitDescr, ref qtyAmtAvail))
                            {
                                AddBudgetTemp(ref messtmp, objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + free.FreeItemID + ",");
                                continue;
                            }
                            uom = free.UnitDescr;
                            freeItemID = free.FreeItemID;
                            if (qtyAmtAvail == double.MaxValue)
                            {
                                qtyAmtAvail = 0;
                            }
                            if (freeItemQty > 0 && (int)Math.Floor(freeItemQty / free.FreeItemQty) > 0 && (_screenNbr == "OM10100" || _screenNbr == "OM20500" && (qtyAmtAvail > 0 || _calcPromoOnly != 0)))
                            {
                                free.FreeITemSiteID = siteID;
                                free.FreeItemBudgetID = budgetIDLineRef;
                                lstCurrentChoice.Add(
                                    AddCurrentChoice(choiceID, objSeq, breakLineRef, promoAmt, origDiscAmt, free, maxQty, freeItemQty, freeQty, qtyBreak,
                                    string.Empty, string.Empty, objData, free.UnitDescr, _lineRef, 0, unitMultDiv, cnvFact, qtyAmtAvail, groupRefLineRef)
                                );
                            }
                        }
                    }

                    if ((_qtyAvailPopup >= maxQty) && messSiteTmp != "" && objSeq.DonateGroupProduct == false)
                    {
                        foreach (var free in lstFreeItem)
                        {
                            var objData = _lstOM_OrdDiscOld.Where(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.BudgetID == budgetIDLineRef && p.OrderNbr == _objOrder.OrderNbr && p.BranchID == _objOrder.BranchID && p.FreeItemID == free.FreeItemID && p.FreeItemQty == freeItemQty).FirstOrDefault();
                            double freeQty = (objData == null ?
                                            (int)Math.Floor(freeItemQty / free.FreeItemQty) : ((int)Math.Floor(objData.FreeItemQty / free.FreeItemQty) > (int)Math.Floor(freeItemQty / free.FreeItemQty) ?
                                                (int)Math.Floor(freeItemQty / free.FreeItemQty) : (int)Math.Floor(objData.FreeItemQty / free.FreeItemQty))) * free.FreeItemQty;

                            var qtyAvail = 0.0;
                            string siteInvtID = siteID + "@@" + free.FreeItemID;
                            if (_lstFreeItemQtyAvailUsed.ContainsKey(siteInvtID))
                            {
                                qtyAvail = _lstFreeItemQtyAvailUsed[siteInvtID];
                            }
                            else
                            {
                                IN_ItemSite objItemSite = _app.IN_ItemSite.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == free.FreeItemID);
                                qtyAvail = (objItemSite == null) ? 0 : objItemSite.QtyAvail;
                                _lstFreeItemQtyAvailUsed.Add(siteInvtID, qtyAvail);
                            }
                            qtyAmtAvail = 0;
                            uom = free.UnitDescr;
                            freeItemID = free.FreeItemID;
                            if (qtyAmtAvail == double.MaxValue)
                            {
                                qtyAmtAvail = 0;
                            }

                            free.FreeITemSiteID = siteID;
                            free.FreeItemBudgetID = budgetIDLineRef;
                            bool checkAddCurrentChoice = true;
                            foreach (var item in lstCurrentChoice)
                            {
                                if (item.LineRef == _lineRef && item.DiscID == objSeq.DiscID && item.DiscSeq == objSeq.DiscSeq && item.DiscLineRef == breakLineRef && item.FreeItemID == free.FreeItemID)
                                {
                                    checkAddCurrentChoice = false;
                                }
                            }

                            if (qtyAvail > 0 && checkAddCurrentChoice)
                            {
                                lstCurrentChoice.Add(
                                    AddCurrentChoice(choiceID, objSeq, breakLineRef, promoAmt, origDiscAmt, free, maxQty, qtyAvail, qtyAvail, qtyBreak,
                                    string.Empty, string.Empty, objData, free.UnitDescr, _lineRef, 0, unitMultDiv, cnvFact, qtyAmtAvail, groupRefLineRef)
                                );
                            }
                            
                        }
                    }
                     
                    #region truong hop or
                    if (lstFreeItem.Count > 1 &&
                        objSeq.AutoFreeItem == false && objSeq.ProAplForItem == "A")
                    {
                        var totalGroupError = 0;
                        if (objSeq.DonateGroupProduct == true)
                        {
                            totalGroupError = CheckErrorInGroup(messGroupError, ref lstCurrentChoice, maxQty);
                        }
                        var minAmt = lstCurrentChoice.Count > 0 ? lstCurrentChoice.Min(x => x.PromoPrice) : 0;
                        if (objSeq.DonateGroupProduct != true
                            && lstCurrentChoice.Sum(p => p.Qty) < maxQty)
                        {
                            if (lstCurrentChoice.Count == 0 && messSiteTmp.Length > 0)
                            {
                                _messSite += messSiteTmp;
                            }
                            else
                            {
                                AddBudgetToString(messtmp);
                            }
                        }
                        else if (objSeq.DonateGroupProduct != true
                            && objSeq.ConvertDiscAmtToFreeItem
                            && lstCurrentChoice.Sum(p => p.tempLineAmt) < promoAmt
                            && promoAmt - lstCurrentChoice.Sum(p => p.tempLineAmt) >= minAmt)
                        {
                            _messSite += messSiteTmp;
                        }
                        else if (objSeq.DonateGroupProduct != true
                               && objSeq.ConvertDiscAmtToFreeItem
                               && minAmt > promoAmt)
                        {
                            if (!_messMinPrice.Any(x => x == objSeq.DiscID + " - " + objSeq.DiscSeq))
                            {
                                _messMinPrice.Add(objSeq.DiscID + " - " + objSeq.DiscSeq);
                            }
                        }
                        //else 
                        if (objSeq.DonateGroupProduct == true && totalGroupError == messGroupError.Count)
                        {
                            //_messBudget += discID + "-" + discSeq + "-" + budgetID + ',';
                        }
                        else
                        {
                            if (lstCurrentChoice.Count > 0)
                            {
                                if (!_lstChoice.Any(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == lstCurrentChoice[0].LevelID && p.InvtID == "" && p.MaxQty == lstCurrentChoice[0].MaxQty && p.BudgetID == budgetIDLineRef && p.FreeItemID == lstCurrentChoice[0].FreeItemID))
                                {
                                    if (_qtyAvailPopup == maxQty && objSeq.DonateGroupProduct == false)
                                    {
                                        foreach (var objChoice in lstCurrentChoice)//nếu có 1 thằng thì tính luôn, ko hiện thị popup
                                        {
                                            var choice = _lstChoice.FirstOrDefault(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == objChoice.LevelID && p.InvtID == "" && p.FreeItemID == objChoice.FreeItemID && p.MaxQty == objChoice.MaxQty && p.BudgetID == budgetIDLineRef);
                                            if (choice == null)
                                            {
                                                if (Util.PassNull(objChoice.FreeItemID) != string.Empty)
                                                {
                                                    siteID = GetFreeItemSite(objChoice.FreeSiteID, objChoice.SiteType);

                                                    uom = objChoice.FreeItemUnit;

                                                    double freeQty = objChoice.FreeItemQty * objChoice.FreeItemQtyBase;
                                                    budgetIDLineRef = objChoice.BudgetID;
                                                    OM10100_pdInventoryByID_Result objInvt = GetInventory(objChoice.FreeItemID);

                                                    IN_UnitConversion cnv = SetUOM(objChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                    if (cnv != null)
                                                    {
                                                        cnvFact = cnv.CnvFact;
                                                        unitMultDiv = cnv.MultDiv;
                                                    }
                                                    qtyAmtAvail = 0;
                                                    if (CheckQtyAvail4AddFreeItem(objChoice.FreeItemID, objChoice.DiscID, objChoice.DiscSeq, objChoice.DiscLineRef, objChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, objChoice.SiteType) == 1)
                                                    {
                                                        throw new MessageException("1045", "", new[] { objChoice.FreeItemID, siteID });
                                                    }
                                                    else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, objChoice.FreeItemID, objChoice.FreeItemUnit, ref qtyAmtAvail))
                                                    {
                                                        AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + objChoice.FreeItemID + ',');
                                                    }
                                                    else
                                                    {
                                                        var disctblQty = objSeq.DonateGroupProduct != true ? qtyBreak * (freeQty / objChoice.FreeItemQtyBase) : qtyAmt;
                                                        InsertUpdateOrdDisc(objSeq, objChoice.BudgetID, 0, amt, disctblQty, objChoice.BudgetID,
                                                            objChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                        AddFreeItem(objChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                        IncreaseDiscLineRef();
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else
                                    {
                                        foreach (var objChoice in lstCurrentChoice)//nếu có 1 thằng thì tính luôn, ko hiện thị popup
                                        {
                                            var choice = _lstChoice.FirstOrDefault(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq && p.LevelID == objChoice.LevelID && p.InvtID == "" && p.FreeItemID == objChoice.FreeItemID && p.MaxQty == objChoice.MaxQty && p.BudgetID == budgetIDLineRef);
                                            if (choice == null)
                                            {
                                                AddListChoice(objChoice, breakLineRef);
                                            }
                                        }
                                        if (lstCurrentChoice.Count > 1)
                                        {
                                            _choice = true;
                                        }
                                        else
                                        {
                                            var objChoice = lstCurrentChoice[0];
                                            // có 1 SP km thì ko show popup
                                            if (Util.PassNull(objChoice.FreeItemID) != string.Empty)
                                            {
                                                siteID = GetFreeItemSite(objChoice.FreeSiteID, objChoice.SiteType);

                                                uom = objChoice.FreeItemUnit;

                                                double freeQty = objChoice.FreeItemQty * objChoice.FreeItemQtyBase;
                                                budgetIDLineRef = objChoice.BudgetID;
                                                OM10100_pdInventoryByID_Result objInvt = GetInventory(objChoice.FreeItemID);

                                                IN_UnitConversion cnv = SetUOM(objChoice.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                if (cnv != null)
                                                {
                                                    cnvFact = cnv.CnvFact;
                                                    unitMultDiv = cnv.MultDiv;
                                                }
                                                qtyAmtAvail = 0;
                                                if (CheckQtyAvail4AddFreeItem(objChoice.FreeItemID, objChoice.DiscID, objChoice.DiscSeq, objChoice.DiscLineRef, objChoice.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, objChoice.SiteType) == 1)
                                                {
                                                    throw new MessageException("1045", "", new[] { objChoice.FreeItemID, siteID });
                                                }
                                                else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, objChoice.FreeItemID, objChoice.FreeItemUnit, ref qtyAmtAvail))
                                                {
                                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + objChoice.FreeItemID + ',');
                                                }
                                                else
                                                {
                                                    var disctblQty = objSeq.DonateGroupProduct != true ? qtyBreak * (freeQty / objChoice.FreeItemQtyBase) : qtyAmt;
                                                    InsertUpdateOrdDisc(objSeq, objChoice.BudgetID, 0, amt, disctblQty, objChoice.BudgetID,
                                                        objChoice.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                                    AddFreeItem(objChoice, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                    IncreaseDiscLineRef();
                                                }
                                            }
                                        }
                                    }
                                    
                                }
                                else // Đã chọn
                                {
                                    var objChoice = lstCurrentChoice[0];
                                    foreach (var itemChoiced in _lstChoice)
                                    {
                                        if (itemChoiced.DiscID == objSeq.DiscID
                                                                    && itemChoiced.DiscSeq == objSeq.DiscSeq
                                                                    && itemChoiced.MaxQty == objChoice.MaxQty
                                                                    && itemChoiced.InvtID == ""
                                                                    && itemChoiced.LevelID == objChoice.LevelID
                                                                    && itemChoiced.FreeItemQty > 0
                                                                    && itemChoiced.Sel == true
                                            )
                                        {
                                            uom = itemChoiced.FreeItemUnit;
                                            budgetIDLineRef = itemChoiced.BudgetID;
                                            double freeQty = itemChoiced.FreeItemQty * itemChoiced.FreeItemQtyBase;
                                            // có 1 SP km thì ko show popup
                                            if (Util.PassNull(itemChoiced.FreeItemID) != string.Empty)
                                            {
                                                siteID = GetFreeItemSite(itemChoiced.FreeSiteID, itemChoiced.SiteType);

                                                OM10100_pdInventoryByID_Result objInvt = GetInventory(itemChoiced.FreeItemID);

                                                IN_UnitConversion cnv = SetUOM(itemChoiced.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                                if (cnv != null)
                                                {
                                                    cnvFact = cnv.CnvFact;
                                                    unitMultDiv = cnv.MultDiv;
                                                }
                                                qtyAmtAvail = 0;
                                                if (CheckQtyAvail4AddFreeItem(itemChoiced.FreeItemID, itemChoiced.DiscID, itemChoiced.DiscSeq, itemChoiced.DiscLineRef, itemChoiced.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoiced.SiteType) == 1)
                                                {
                                                    throw new MessageException("1045", "", new[] { itemChoiced.FreeItemID, siteID });
                                                }
                                                else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, itemChoiced.FreeItemID, itemChoiced.FreeItemUnit, ref qtyAmtAvail))
                                                {
                                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + itemChoiced.FreeItemID + ',');
                                                }
                                                else
                                                {
                                                    var disctblQty = objSeq.DonateGroupProduct != true ? qtyBreak * (freeQty / itemChoiced.FreeItemQtyBase) : qtyAmt;
                                                    InsertUpdateOrdDisc(objSeq, itemChoiced.BudgetID, 0, amt, disctblQty, itemChoiced.BudgetID,
                                                        itemChoiced.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);

                                                    AddFreeItem(itemChoiced, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                                    IncreaseDiscLineRef();
                                                }
                                            }
                                            itemChoiced.Sel = false;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    #endregion
                    #region truong hop and
                    else
                    {
                        if (messtmp != "") {
                            AddBudgetToString(messtmp); //AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetID + ','); 
                        }
                        else if (messSiteTmp != string.Empty)
                        {
                            _messSite += messSiteTmp;
                        }
                        // Add free item
                        foreach (var itemChoiced in lstCurrentChoice)
                        {
                            uom = itemChoiced.FreeItemUnit;
                            itemChoiced.FreeItemID = itemChoiced.FreeItemID;
                            double freeQty = itemChoiced.FreeItemQty * itemChoiced.FreeItemQtyBase;
                            budgetIDLineRef = itemChoiced.BudgetID;
                            // có 1 SP km thì ko show popup
                            if (Util.PassNull(itemChoiced.FreeItemID) != string.Empty)
                            {
                                siteID = GetFreeItemSite(itemChoiced.FreeSiteID, itemChoiced.SiteType);
                                OM10100_pdInventoryByID_Result objInvt = GetInventory(itemChoiced.FreeItemID);
                                IN_UnitConversion cnv = SetUOM(itemChoiced.FreeItemID, uom, objInvt.ClassID, objInvt.StkUnit);
                                if (cnv != null)
                                {
                                    cnvFact = cnv.CnvFact;
                                    unitMultDiv = cnv.MultDiv;
                                }
                                qtyAmtAvail = 0;
                                if (CheckQtyAvail4AddFreeItem(itemChoiced.FreeItemID, itemChoiced.DiscID, itemChoiced.DiscSeq, itemChoiced.DiscLineRef, itemChoiced.IsSetPrioritySite, ref siteID, unitMultDiv, freeQty, cnvFact, true, string.Empty, itemChoiced.SiteType) == 1)
                                {
                                    throw new MessageException("1045", "", new[] { itemChoiced.FreeItemID, siteID });
                                }
                                else if (!CheckAvailableDiscBudget(ref budgetIDLineRef, objSeq.DiscID, objSeq.DiscSeq, ref freeQty, true, itemChoiced.FreeItemID, itemChoiced.FreeItemUnit, ref qtyAmtAvail))
                                {
                                    AddBudgetToString(objSeq.DiscID + "-" + objSeq.DiscSeq + "-" + budgetIDLineRef + "-" + itemChoiced.FreeItemID + ',');
                                }
                                else
                                {
                                    var disctblQty = objSeq.DonateGroupProduct != true ? qtyBreak * (freeQty / itemChoiced.FreeItemQtyBase) : qtyAmt;
                                    InsertUpdateOrdDisc(objSeq, itemChoiced.BudgetID, 0, amt, disctblQty, itemChoiced.BudgetID,
                                        itemChoiced.FreeItemID, freeQty, _discLineRef, _lineRef, breakLineRef, groupRefLineRef, "", uom, cnvFact);
                                    AddFreeItem(itemChoiced, objInvt, cnv, freeQty, siteID, uom, _lineRef, string.Empty);
                                    IncreaseDiscLineRef();
                                }
                            }
                            itemChoiced.Sel = false;
                        }
                    }
                    #endregion

                    if (beginCalc)
                    {
                        goto Begin;
                    }
                } //if(lstFreeItem.Count>0)
            }
        }
        //setup chung tu

        private double GetDiscDocSetup(List<OM10100_pdGetDiscSeq_Result> lstDocDisc)
        {
            double discAmtTotal = 0;
            string discID1 = string.Empty;
            List<OM10100_pdDiscDocSetUp_Result> lstSetup = _app.OM10100_pdDiscDocSetUp(_objOrder.BranchID).ToList();

            foreach (OM10100_pdGetDiscSeq_Result objSeq in lstDocDisc)
            {
                if (lstSetup.Any(x => x.DiscID01 == objSeq.DiscID || x.DiscID02 == objSeq.DiscID)
                    && ValidateDisc(objSeq))
                {
                    #region -Check Calc Disc-                                        
                    bool isCalcDisc = false;
                    switch (objSeq.DiscClass)
                    {
                        case "CC":
                            if (GetOM_DiscCust(objSeq.DiscID, objSeq.DiscSeq))
                            {
                                isCalcDisc = true;
                            }
                            break;
                        case "TT":
                            if (GetOM_DiscCustClass(objSeq.DiscID, objSeq.DiscSeq))
                            {
                                isCalcDisc = true;
                            }
                            break;
                        case Channel:
                            if (GetOM_DiscChannel(objSeq.DiscID, objSeq.DiscSeq))// Kênh
                            {
                                isCalcDisc = true;
                            }
                            break;
                        case CustCate:
                            if (GetOM_DiscCustCate(objSeq.DiscID, objSeq.DiscSeq)) // 
                            {
                                isCalcDisc = true;
                            }
                            break;
                        case "C1":
                            if (GetOM_DiscShopType(objSeq.DiscID, objSeq.DiscSeq)) // C1 - Loại Điểm Bán
                            {
                                isCalcDisc = true;
                            }
                            break;
                        case "C2": 
                            if (GetOM_DiscSalesCustClass(objSeq.DiscID, objSeq.DiscSeq)) // C2 - Nhóm Khách Hàng Theo Doanh Số
                            {
                                isCalcDisc = true;
                            }
                            break;
                        case "C3": 
                            if (GetOM_DiscMarket(objSeq.DiscID, objSeq.DiscSeq)) // C3 - Chợ
                            {
                                isCalcDisc = true;
                            }
                            break;
                        default:
                            break;
                    }
                    #endregion
                    if (isCalcDisc)
                    {
                        CalculateDocDisc(objSeq, ref discAmtTotal);
                        //return discAmtTotal;
                    }
                }
            }
            return discAmtTotal;
        }
        #endregion

        #region -Other-
        private void GetQtyAmtDiscItem(OM10100_pdGetDiscSeq_Result objSeq, ref double discAmtTotal)
        {
            TotalQtyAmt objTotQtyAmt = new TotalQtyAmt();
            List<OM10100_pdOM_DiscItem_Result> lstItem = GetOM_DiscItemList(objSeq.DiscID, objSeq.DiscSeq);
            if (lstItem.Count > 0)
            {
                double totLot = 0;
                bool isSetMinVal = false;
                double discItemUnitQty = 0;

                List<OM10100_pdOM_DiscItem_Result> lstItem1 = new List<OM10100_pdOM_DiscItem_Result>();
                foreach (var item in _lstOldOrdDet)
                {
                    foreach (var item1 in lstItem)
                    {
                        if (item1.InvtID == item.InvtID)
                        {
                            if (lstItem1.FirstOrDefault(p => p.InvtID == item1.InvtID) == null)
                            {
                                lstItem1.Add(item1);
                            }                            
                        }
                    }
                }
                if (lstItem1.Count > 0)
                {
                    lstItem = lstItem1;
                }     

                foreach (OM10100_pdOM_DiscItem_Result item in lstItem)
                {
                    if (_lstOldOrdDet.Any(x => x.FreeItem == false && x.InvtID == item.InvtID))
                    {
                        TotalQtyAmt objTemp = TotalInvtV2(item.InvtID, item.SiteID, objSeq.IsDeductQtyAmt);
                        if (objSeq.BreakBy == "W")
                        {
                            discItemUnitQty = objTemp.Qty.ToInt() * item.StkWt / OM_GetCnvFactFromUnit(item.InvtID, item.UnitDesc, string.Empty).ToInt();
                        }
                        else
                        {
                            discItemUnitQty = objTemp.Qty.ToInt() / OM_GetCnvFactFromUnit(item.InvtID, item.UnitDesc, string.Empty).ToInt();
                        }
                        objTotQtyAmt.Qty += discItemUnitQty;
                        objTotQtyAmt.Amt += objTemp.Amt;
                        objTotQtyAmt.ListGroupLineRef.AddRange(objTemp.ListGroupLineRef);
                        totLot = GetMinGroupLot(objSeq.RequiredType, item.RequiredValue, discItemUnitQty, objTemp.Amt, totLot, ref isSetMinVal);
                    }
                }
                GetSubBreakQtyAmt(objSeq, ref objTotQtyAmt);
                CalculateGroupDisc(objSeq, objTotQtyAmt, lstItem, null, ref discAmtTotal, totLot);
            }
        }

        private void GetQtyAmtDiscItemClass(OM10100_pdGetDiscSeq_Result objSeq, ref double discAmtTotal)
        {
            List<OM_DiscItemClass> lstPriceClass = _app.OM_DiscItemClass.Where(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq).ToList();
            if (lstPriceClass.Count > 0)
            {
                TotalQtyAmt objTotQtyAmt = new TotalQtyAmt();
                double totLot = 0;
                foreach (OM_DiscItemClass item in lstPriceClass)
                {
                    var objTmp = TotalItemClassV2(item.ClassID, item.UnitDesc, objSeq.IsDeductQtyAmt);
                    objTotQtyAmt.Qty += objTmp.Qty;
                    objTotQtyAmt.Amt += objTmp.Amt;
                    objTotQtyAmt.ListGroupLineRef.AddRange(objTmp.ListGroupLineRef);
                }
                GetSubBreakQtyAmt(objSeq, ref objTotQtyAmt);
                CalculateGroupDisc(objSeq, objTotQtyAmt, null, lstPriceClass, ref discAmtTotal, totLot);
            }
        }
        private bool GetTotQtyAmtBundle(OM10100_pdGetDiscSeq_Result objSeq, ref double discAmtTotal)
        {
            List<OM10100_pdOM_DiscItem_Result> lstItem = GetOM_DiscItemList(objSeq.DiscID, objSeq.DiscSeq);
            if (lstItem.Count > 0)
            {
                TotalQtyAmt objTotQtyAmt = new TotalQtyAmt();
                var bundleNbr = new double[lstItem.Count];
                int k = 0;
                foreach (OM10100_pdOM_DiscItem_Result item in lstItem)
                {
                    TotalQtyAmt objTem = TotalInvtV2(item.InvtID, item.SiteID, objSeq.IsDeductQtyAmt);
                    if (objTem.Qty == 0)
                    {
                        objTotQtyAmt.Qty = 0;
                        objTotQtyAmt.Amt = 0;
                        return false;
                    }
                    objTotQtyAmt.Amt += objTem.Amt;
                    objTotQtyAmt.Qty += objTem.Qty;
                    objTotQtyAmt.ListGroupLineRef.AddRange(objTem.ListGroupLineRef);
                    bundleNbr[k] = (objSeq.BreakBy == "A") ? objTem.Amt / item.BundleAmt : GetQty(item.InvtID, item.UnitDesc, objTem.Qty) / item.BundleQty;
                    k++;
                }
                GetSubBreakQtyAmt(objSeq, ref objTotQtyAmt);
                CalculateGroupDiscBundle(objSeq, objTotQtyAmt, lstItem, ref discAmtTotal, ref bundleNbr);
            }
            return true;
        }

        private void GetQtyAmtDiscItem4Line(OM10100_pdGetDiscSeq_Result objSeq)
        {
            
            List<OM10100_pdOM_DiscItem_Result> lstItem = GetOM_DiscItemList(objSeq.DiscID, objSeq.DiscSeq);
            if (lstItem.Count > 0)
            {
                List<OM10100_pdOM_DiscItem_Result> lstItem1 = new List<OM10100_pdOM_DiscItem_Result>();
                foreach (var item in _lstOldOrdDet)
                {
                    foreach (var item1 in lstItem)
                    {
                        if (item1.InvtID == item.InvtID)
                        {
                            if (lstItem1.FirstOrDefault(p => p.InvtID == item1.InvtID) == null)
                            {
                                lstItem1.Add(item1);
                            }
                        }
                    }
                }
                if (lstItem1.Count > 0)
                {
                    lstItem = lstItem1;
                }              
                foreach (OM10100_pdOM_DiscItem_Result item in lstItem)
                {
                    if (_lstOldOrdDet.Any(x => x.FreeItem == false && x.InvtID == item.InvtID))
                    {
                        TotalQtyAmt objTotQtyAmt = new TotalQtyAmt();
                        double totLot = 0;
                        bool isSetMinVal = false;
                        double discItemUnitQty = 0;

                        TotalQtyAmt objTemp = TotalInvtV2(item.InvtID, item.SiteID, objSeq.IsDeductQtyAmt);
                        if (objSeq.BreakBy == "W")
                        {
                            discItemUnitQty = objTemp.Qty.ToInt() * item.StkWt / OM_GetCnvFactFromUnit(item.InvtID, item.UnitDesc, string.Empty).ToInt();
                        }
                        else
                        {
                            discItemUnitQty = objTemp.Qty.ToInt() / OM_GetCnvFactFromUnit(item.InvtID, item.UnitDesc, string.Empty).ToInt();
                        }
                        objTotQtyAmt.Qty += discItemUnitQty;
                        objTotQtyAmt.Amt += objTemp.Amt;
                        objTotQtyAmt.ListGroupLineRef.AddRange(objTemp.ListGroupLineRef);
                        totLot = GetMinGroupLot(objSeq.RequiredType, item.RequiredValue, discItemUnitQty, objTemp.Amt, totLot, ref isSetMinVal);
                        GetSubBreakQtyAmt(objSeq, ref objTotQtyAmt);
                        double discAmtTotal = 0;
                        CalculateGroupDisc(objSeq, objTotQtyAmt, new List<OM10100_pdOM_DiscItem_Result>() { item }, null, ref discAmtTotal, totLot);
                    }
                }                
            }
        }

        private void GetQtyAmtDiscItemClass4Line(OM10100_pdGetDiscSeq_Result objSeq)
        {
            List<OM_DiscItemClass> lstPriceClass = _app.OM_DiscItemClass.Where(p => p.DiscID == objSeq.DiscID && p.DiscSeq == objSeq.DiscSeq).ToList();
            if (lstPriceClass.Count > 0)
            {                
                foreach (OM_DiscItemClass item in lstPriceClass)
                {
                    TotalQtyAmt objTotQtyAmt = new TotalQtyAmt();
                    double totLot = 0;
                    var objTmp = TotalItemClassV2(item.ClassID, item.UnitDesc, objSeq.IsDeductQtyAmt);
                    objTotQtyAmt.Qty += objTmp.Qty;
                    objTotQtyAmt.Amt += objTmp.Amt;
                    objTotQtyAmt.ListGroupLineRef.AddRange(objTmp.ListGroupLineRef);

                    GetSubBreakQtyAmt(objSeq, ref objTotQtyAmt);
                    double discAmtTotal = 0;
                    CalculateGroupDisc(objSeq, objTotQtyAmt, null, new List<OM_DiscItemClass>() { item }, ref discAmtTotal, totLot);
                }
                
            }
        }
        private bool GetSubBreakQtyAmt(OM10100_pdGetDiscSeq_Result objSeq, ref TotalQtyAmt objTotQtyAmt)
        {
            if (objSeq.SubBreakType != "N")
            {
                var lstSubItem = _app.OM10100_pdOM_DiscSubBreakItem(objSeq.DiscID, objSeq.DiscSeq, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                foreach (var objSubItem in lstSubItem)
                {
                    if (_lstOldOrdDet.Any(x => x.FreeItem == false && x.InvtID == objSubItem.InvtID))
                    {
                        // Chưa sửa
                        objTotQtyAmt.SubQty += _lstOldOrdDet.Where(p => p.InvtID == objSubItem.InvtID && !p.FreeItem && p.BOType != "R").Sum(p => p.StkQty);
                        objTotQtyAmt.SubAmt += _lstOldOrdDet.Where(p => p.InvtID == objSubItem.InvtID && !p.FreeItem && p.BOType != "R").Sum(p => p.LineAmt);
                    }
                }
            }
            return true;
        }
        private void InsertOrdDiscApplyDetail()
        {
            foreach (var item in _lstOrdDiscDetail)
            {
                OM_OrdDiscItemApply newDisc = new OM_OrdDiscItemApply();
                newDisc.BranchID = _objOrder.BranchID;
                newDisc.OrderNbr = _objOrder.OrderNbr;
                newDisc.SOLineRef = item.SOLineRef;
                newDisc.LineRef = _applyDetailLineRef;
                newDisc.InvtID = item.InvtID;
                newDisc.DiscID = item.DiscID;
                newDisc.DiscSeq = item.DiscSeq;
                newDisc.BreakLineRef = item.BreakLineRef;
                newDisc.Amt = item.Amt;
                newDisc.Qty = item.Qty;
                newDisc.DiscFor = item.DiscFor;
                newDisc.DiscType = item.DiscType;
                newDisc.Unit = item.Unit;
                newDisc.Crtd_DateTime = DateTime.Now;
                newDisc.Crtd_Prog = _screenNbr;
                newDisc.Crtd_User = Current.UserName;
                newDisc.LUpd_DateTime = DateTime.Now;
                newDisc.LUpd_Prog = _screenNbr;
                newDisc.LUpd_User = Current.UserName;
                _applyDetailLineRef = LastLineRef((_applyDetailLineRef.ToInt() + 1).ToString());
                _app.OM_OrdDiscItemApply.AddObject(newDisc);
            }
        }

        private double GetQty(string invtID, string freeUnit, double qty)
        {
            var uom = SetUOM(invtID, freeUnit, "", "");
            if (uom != null)
            {
                var cnvFact = uom.CnvFact != 0 ? uom.CnvFact : 1;
                return (uom.MultDiv == "M" ? qty / cnvFact : qty * cnvFact).ToInt();
            }
            return qty;
        }

        private double GetDiscBreakV2(OM10100_pdGetDiscSeq_Result objSeq, double qtyAmt, double subQtyAmt, ref double tmpqtyBreak, ref string lineRef, ref double discBonusFactor, ref string budgetLineRef, bool isAmt = true)
        {
            double result = 0;
            double qtyBreak = tmpqtyBreak;
            lineRef = string.Empty;
            OM10100_pdOM_DiscBreak_Result objBreak;
            _objMaxLot = null;
            var lstBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();

            if (objSeq.BreakBy == "A")
            {
                if (objSeq.BreakBoundType == "L")
                {
                    if (objSeq.SubBreakType == "A")
                    {
                        objBreak = lstBreak.Where(p => p.BreakAmt <= qtyAmt
                                        && p.SubBreakAmt <= subQtyAmt
                                        && p.BreakAmt > 0
                            ).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                    }
                    else
                    {
                        objBreak = lstBreak.Where(p => p.BreakAmt <= qtyAmt && p.SubBreakQty <= subQtyAmt
                                         && p.BreakAmt > 0
                            ).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                    }
                }
                else
                {
                    if (objSeq.SubBreakType == "A")
                    {
                        objBreak = lstBreak.Where(p => p.BreakAmt <= qtyAmt && (p.BreakAmtUpper >= qtyAmt || p.BreakAmtUpper == 0)
                                        && p.SubBreakAmt <= subQtyAmt && (p.SubBreakAmtUpper >= subQtyAmt || p.SubBreakAmtUpper == 0)
                                        && p.BreakAmt > 0
                            ).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                    }
                    else
                    {
                        objBreak = lstBreak.Where(p => p.BreakAmt <= qtyAmt && (p.BreakAmtUpper >= qtyAmt || p.BreakAmtUpper == 0)
                                        && p.SubBreakQty <= subQtyAmt && (p.SubBreakQtyUpper >= subQtyAmt || p.SubBreakQtyUpper == 0) && p.BreakAmt > 0
                                        && p.BreakAmt > 0
                            ).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                    }
                }
            }
            else
            {
                if (objSeq.BreakBoundType == "L")
                {
                    if (objSeq.SubBreakType == "A")
                    {
                        objBreak = lstBreak.Where(p => p.BreakQty <= qtyAmt
                                        && p.SubBreakAmt <= subQtyAmt
                                        && p.BreakQty > 0
                            ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                    else
                    {
                        objBreak = lstBreak.Where(p => p.BreakQty <= qtyAmt
                                        && p.SubBreakQty <= subQtyAmt
                                        && p.BreakQty > 0
                            ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                }
                else
                {
                    if (objSeq.SubBreakType == "A")
                    {
                        objBreak = lstBreak.Where(p => p.BreakQty <= qtyAmt && (p.BreakQtyUpper >= qtyAmt || p.BreakQtyUpper == 0)
                                        && p.SubBreakAmt <= subQtyAmt && (p.SubBreakAmtUpper >= subQtyAmt || p.SubBreakAmtUpper == 0)
                                        && p.BreakQty > 0
                            ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                    else
                    {
                        objBreak = lstBreak.Where(p => p.BreakQty <= qtyAmt && (p.BreakQtyUpper >= qtyAmt || p.BreakQtyUpper == 0)
                                        && p.SubBreakQty <= subQtyAmt && (p.SubBreakQtyUpper >= subQtyAmt || p.SubBreakQtyUpper == 0) && p.BreakAmt > 0
                                        && p.BreakQty > 0
                            ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                }
            }
            string strLineRef = objSeq.DiscID + "@#" + objSeq.DiscSeq + "@#" + (objBreak != null ? objBreak.LineRef : "");

            if (_lstBreakActive.Where(x => x == strLineRef).ToList().Count() > 2)
            {
                objBreak = null;
            }
            _lstBreakActive.Add(strLineRef);

            if (objBreak != null)
            {
                // Ktra KM theo số suất
                if (objBreak.MaxLot > 0)
                {
                    _objMaxLot = GetMaxLot(objSeq.DiscID, objSeq.DiscSeq, objBreak.LineRef, objBreak.MaxLot);
                    if (_objMaxLot.Qty > 0)
                    {
                        if (objBreak.MaxLot < _objMaxLot.Qty)
                        {
                            _objMaxLot.Qty = objBreak.MaxLot;
                        }
                    }
                }
                if (objSeq.BreakBy == "A")
                {
                    qtyBreak = objBreak.BreakAmt;
                }
                else
                {
                    qtyBreak = objBreak.BreakQty;
                }
                lineRef = objBreak.LineRef;
                result = objBreak.DiscAmt;
                discBonusFactor = objBreak.DiscAmtBonus;
            }
            tmpqtyBreak = qtyBreak;

            return result;
        }

        private double GetDiscBreakV2(OM10100_pdGetDiscSeq_Result objSeq, double qtyAmt, ref double tmpqtyBreak, ref string lineRef, ref double discBonusFactor, ref string budgetLineRef, bool isAmt = true)
        {
            double result = 0;
            double qtyBreak = tmpqtyBreak;
            lineRef = string.Empty;
            OM10100_pdOM_DiscBreak_Result objBreak;
            _objMaxLot = null;
            var lstBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();

            if (objSeq.BreakBy == "A")
            {
                if (objSeq.BreakBoundType == "L")
                {
                    objBreak = lstBreak.Where(p => p.BreakAmt <= qtyAmt && p.BreakAmt > 0 ).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                }
                else
                {
                    objBreak = lstBreak.Where(p => p.BreakAmt <= qtyAmt && (p.BreakAmtUpper >= qtyAmt || p.BreakAmtUpper == 0)  && p.BreakAmt > 0).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                }
            }
            else
            {
                var lstDiscBreak = CheckExistsBreakLineRef(objSeq);
                if (lstDiscBreak.Count > 0)
                {
                    // Với loại KM yêu cầu tối thiểu SP xA yB zC 
                    var lstBreakTem = lstBreak.Where(p => p.BreakQty <= qtyAmt && p.BreakQty > 0 ).ToList();
                    for (int i = lstBreakTem.Count - 1; i > -1; i--)
                    {
                        if (lstDiscBreak.Any(x => x == lstBreakTem[i].LineRef))
                        {
                            lstBreakTem.RemoveAt(i);
                        }
                    }
                    if (objSeq.BreakBoundType == "L")
                    {
                        objBreak = lstBreakTem.Where(p => p.BreakQty <= qtyAmt && p.BreakQty > 0 ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                    else
                    {
                        objBreak = lstBreakTem.Where(p => p.BreakQty <= qtyAmt && (p.BreakQtyUpper >= qtyAmt || p.BreakQtyUpper == 0) && p.BreakQty > 0 ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                }
                else
                {
                    if (objSeq.BreakBoundType == "L")
                    {
                        objBreak = lstBreak.Where(p => p.BreakQty <= qtyAmt && p.BreakQty > 0 ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                    else
                    {
                        objBreak = lstBreak.Where(p => p.BreakQty <= qtyAmt && (p.BreakQtyUpper >= qtyBreak || p.BreakQtyUpper == 0) && p.BreakQty > 0 ).OrderByDescending(p => p.BreakQty).FirstOrDefault();
                    }
                }
            }
            string strLineRef = objSeq.DiscID + "@#" + objSeq.DiscSeq + "@#" + (objBreak != null ? objBreak.LineRef : "");

            if (_lstBreakActive.Where(x => x == strLineRef).ToList().Count() > 2)
            {
                objBreak = null;
            }
            _lstBreakActive.Add(strLineRef);

            if (objBreak != null)
            {
                // Ktra KM theo số suất
                if (objBreak.MaxLot > 0)
                {
                    _objMaxLot = GetMaxLot(objSeq.DiscID, objSeq.DiscSeq, objBreak.LineRef, objBreak.MaxLot);
                    if (_objMaxLot.Qty > 0)
                    {
                        if (objBreak.MaxLot < _objMaxLot.Qty)
                        {
                            _objMaxLot.Qty = objBreak.MaxLot;
                        }
                    }
                }
                if (objSeq.BreakBy == "A")
                {
                    qtyBreak = objBreak.BreakAmt;
                }
                else
                {
                    qtyBreak = objBreak.BreakQty;
                }
                lineRef = objBreak.LineRef;
                result = objBreak.DiscAmt;
                budgetLineRef = objBreak.BudgetID;
                discBonusFactor = objBreak.DiscAmtBonus;
            }
            tmpqtyBreak = qtyBreak;
            

            return result;
        }
        private double GetBundleDiscBreak(OM10100_pdGetDiscSeq_Result objSeq, double bundleNbr, ref double bundleNbrBreak, ref string lineRef, double[] bundles, double subBreakQtyAmt, double discBonusFactor, ref string budgetID, bool isAmt)
        {
            _objMaxLot = null;
            double disAmt = 0;
            OM10100_pdOM_DiscBreak_Result objBreak = null;
            objBreak = GetBundleDiscBreak(objSeq, bundleNbr, subBreakQtyAmt);
            if (objBreak != null)
            {
                if (objBreak.MaxLot > 0)
                {
                    _objMaxLot = GetMaxLot(objSeq.DiscID, objSeq.DiscSeq, objBreak.LineRef, objBreak.MaxLot);
                    if (_objMaxLot.Qty > 0)
                    {
                        if (objBreak.MaxLot < _objMaxLot.Qty)
                        {
                            _objMaxLot.Qty = objBreak.MaxLot;
                        }
                    }
                }
                lineRef = objBreak.LineRef;
                bundleNbrBreak = objBreak.BreakAmt;
                disAmt = objBreak.DiscAmt;
                discBonusFactor = objBreak.DiscAmtBonus;
                budgetID = objBreak.BudgetID;
            }
            return disAmt;
        }
        private OM10100_pdOM_DiscBreak_Result GetBundleDiscBreak(OM10100_pdGetDiscSeq_Result objSeq, double bundleNbr, double subBreakQtyAmt)
        {
            OM10100_pdOM_DiscBreak_Result objBreak = null;
            if (objSeq.ExactQty) // Ktra số bộ chính xác
            {
                objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                        .Where(p => p.BreakAmt == bundleNbr && p.BreakAmt > 0)
                        .OrderByDescending(p => p.BreakAmt)
                        .FirstOrDefault();
            }
            else
            {
                if (objSeq.SubBreakType == "N")// Không có điều kiện 2
                {
                    if (objSeq.BreakBoundType == "L") // Không có cận trên
                    {
                        objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                            .Where(p => p.BreakAmt <= bundleNbr && p.BreakAmt > 0)
                                .OrderByDescending(p => p.BreakAmt)
                                .FirstOrDefault();
                    }
                    else // Có cận trên, ktra trong khoảng
                    {
                        objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                                .Where(p => p.BreakAmt <= bundleNbr && (p.BreakAmtUpper >= bundleNbr || p.BreakAmtUpper == 0) && p.BreakAmt > 0).OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                    }
                }
                else// Có điều kiện 2
                {
                    if (objSeq.SubBreakType == "A") // Đk 2 ktra theo số tiền
                    {
                        if (objSeq.BreakBoundType == "L") // Không có cận trên
                        {
                            objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                                .Where(p => p.BreakAmt <= bundleNbr
                                        && p.SubBreakAmt <= subBreakQtyAmt
                                        && p.BreakAmt > 0)
                                    .OrderByDescending(p => p.BreakAmt)
                                    .FirstOrDefault();
                        }
                        else // Có cận trên, ktra trong khoảng
                        {
                            objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                                    .Where(p => p.BreakAmt <= bundleNbr && (p.BreakAmtUpper >= bundleNbr || p.BreakAmtUpper == 0)
                                        && p.SubBreakAmt <= bundleNbr && (p.SubBreakAmtUpper >= bundleNbr || p.SubBreakAmtUpper == 0)
                                        && p.BreakAmt > 0
                                    )
                                    .OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                        }
                    }
                    else // Đk 2 ktra theo số lượng
                    {
                        if (objSeq.BreakBoundType == "L") // Không có cận trên
                        {
                            objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                                .Where(p => p.BreakAmt <= bundleNbr
                                            && p.SubBreakQty <= subBreakQtyAmt
                                            && p.BreakAmt > 0)
                                    .OrderByDescending(p => p.BreakAmt)
                                    .FirstOrDefault();
                        }
                        else // Có cận trên, ktra trong khoảng
                        {
                            objBreak = _app.OM10100_pdOM_DiscBreak(objSeq.DiscID, objSeq.DiscSeq, "%", Current.UserName, Current.CpnyID, Current.LangID)
                                    .Where(p => p.BreakAmt <= bundleNbr && (p.BreakAmtUpper >= bundleNbr || p.BreakAmtUpper == 0)
                                                && p.SubBreakAmt <= bundleNbr && (p.SubBreakAmtUpper >= bundleNbr || p.SubBreakAmtUpper == 0)
                                                && p.BreakAmt > 0)
                                    .OrderByDescending(p => p.BreakAmt).FirstOrDefault();
                        }
                    }
                }
            }
            return objBreak;
        }

        private double GetMinGroupLot(string RequiredType, double RequiredValue, double qty1, double amt, double totLot, ref bool isSetMinVal)
        {
            if (!string.IsNullOrWhiteSpace(RequiredType) && RequiredValue > 0)
            {
                double qtyAmt = (RequiredType == RequiredTypeA) ? amt : qty1;
                var minLot = Math.Floor(qtyAmt / RequiredValue);
                if (!isSetMinVal)
                {
                    totLot = minLot;
                    isSetMinVal = true;
                }
                else
                {
                    totLot = totLot < minLot ? totLot : minLot;
                }
            }
            return totLot;
        }
        private void AddFreeItem(DiscountChoice objChoice, OM10100_pdInventoryByID_Result objInvt, IN_UnitConversion cnv, double qty, string siteID, string uom, string lineRef, string boType)
        {
            double cnvFact = 0;
            string unitMultDiv = string.Empty;
            double price = 0;
            string chk = string.Empty;
            double soFee = 0;
            double stkQty = 0;
            if (objChoice.FreeItemID != string.Empty && qty > 0)
            {
                if (cnv != null)
                {
                    cnvFact = cnv.CnvFact;
                    unitMultDiv = cnv.MultDiv;
                }
                if (unitMultDiv == "M")
                {
                    stkQty = qty * cnvFact;
                }
                else
                {
                    stkQty = (cnvFact != 0) ? qty / cnvFact : 0;
                }
                soFee = (_objOM.InlcSOFeeProm) ? objInvt.SOFee * stkQty : 0;

                var newdet = new OM10100_pgOrderDet_Result();
                newdet.OrderNbr = _objOrder.OrderNbr;
                newdet.BranchID = _objOrder.BranchID;
                newdet.LineRef = lineRef;
                newdet.BOType = (boType == "O") ? "O" : "S";

                newdet.BudgetID1 = objChoice.BudgetID;
                newdet.Descr = objInvt.Descr;
                newdet.DiscID1 = objChoice.DiscID;
                newdet.DiscSeq1 = objChoice.DiscSeq;
                newdet.FreeItemQty1 = qty;
                newdet.FreeItem = true;
                newdet.InvtID = objChoice.FreeItemID;
                newdet.ItemPriceClass = objInvt.PriceClassID;
                newdet.BarCode = objInvt.BarCode;
                newdet.LineQty = qty;
                newdet.DumyLineQty = qty;
                newdet.StkQty = stkQty;
                newdet.OrderType = _objOrder.OrderType;
                newdet.SiteID = siteID;
                newdet.SOFee = soFee;
                newdet.SlsUnit = uom;
                newdet.TaxCat = objInvt.TaxCat;
                newdet.TaxID = "*";
                newdet.UnitRate = cnvFact;
                newdet.UnitMultDiv = unitMultDiv;

                if (objChoice.PromoPrice > 0)
                {
                    newdet.SlsPrice = objChoice.PromoPrice;
                }
                else if (_objOM.DfltSalesPrice == "I")
                {
                    price = unitMultDiv == "M" ? objInvt.SOPrice * cnvFact : objInvt.SOPrice / cnvFact;
                    newdet.SlsPrice = price;
                }
                else
                {
                    var priceData = _lstPrice.FirstOrDefault(p => p.InvtID == newdet.InvtID && p.Unit == newdet.SlsUnit);
                    newdet.SlsPrice = priceData.Price.ToDouble();
                }
                _lstOldOrdDet.Add(newdet);
                if (objInvt.LotSerTrack.PassNull() != string.Empty && objInvt.LotSerTrack != "N")
                {
                    for (int i = _lstLot.Count - 1; i >= 0; i--)
                    {
                        if (_lstLot[i].OMLineRef == newdet.LineRef)
                        {
                            _lstLot.RemoveAt(i);
                        }
                    }
                    OM10100Entities app = Util.CreateObjectContext<OM10100Entities>(false);
                    var lstItemLot = app.IN_ItemLot.Where(p => p.SiteID == newdet.SiteID && p.InvtID == newdet.InvtID && p.QtyAvail > 0).ToList();
                    if (lstItemLot.Count == 0)
                    {
                        throw new MessageException("20171002", new string[] { newdet.InvtID + " - " + newdet.SiteID });
                    }
                    List<OM_LotTrans> lstLotTrans = app.OM_LotTrans.Where(p => p.BranchID == _objOrder.BranchID && p.OrderNbr == _objOrder.OrderNbr && p.InvtID == newdet.InvtID && p.SiteID == newdet.SiteID).ToList();
                    foreach (var item in lstLotTrans)
                    {
                        var lot = lstItemLot.FirstOrDefault(p => p.LotSerNbr == item.LotSerNbr);
                        if (lot == null)
                        {
                            var lotDB = app.IN_ItemLot.FirstOrDefault(p => p.SiteID == newdet.SiteID && p.InvtID == newdet.InvtID && p.LotSerNbr == item.LotSerNbr);
                            lotDB.QtyAvail = item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact;
                            lstItemLot.Add(lotDB);
                        }
                        else
                        {
                            lot.QtyAvail += item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact;
                        }
                    }
                    lstItemLot = lstItemLot.OrderBy(p => p.ExpDate).ThenBy(p => p.LotSerNbr).ToList();
                    double needQty = needQty = newdet.UnitMultDiv == "M" ? newdet.LineQty * newdet.UnitRate : newdet.LineQty / newdet.UnitRate;

                    foreach (var item in lstItemLot)
                    {
                        double newQty = 0;
                        double curQty = 0;
                        foreach (var item2 in _lstLot)
                        {
                            if (item.SiteID == item2.SiteID && item.InvtID == item2.InvtID && item.LotSerNbr == item2.LotSerNbr)
                            {
                                curQty += item2.UnitMultDiv == "M" ? item2.Qty * item2.CnvFact : item2.Qty * item2.CnvFact;
                            }
                        }

                        if (Math.Round(item.QtyAvail - curQty, 0) == 0)
                        {
                            continue;
                        }

                        if ((item.QtyAvail - curQty) >= needQty)
                        {
                            newQty = needQty;
                            needQty = 0;
                        }
                        else
                        {
                            newQty = (item.QtyAvail - curQty);
                            needQty -= (item.QtyAvail - curQty);
                            item.QtyAvail = 0;
                        }

                        if (newQty != 0)
                        {
                            var newLot = new OM_LotTrans();
                            newLot.ResetET();
                            newLot.BranchID = _objOrder.BranchID;
                            newLot.OrderNbr = _objOrder.OrderNbr;
                            newLot.LotSerNbr = item.LotSerNbr;
                            newLot.ExpDate = item.ExpDate;
                            newLot.OMLineRef = newdet.LineRef;
                            newLot.SiteID = newdet.SiteID;
                            newLot.InvtID = newdet.InvtID;
                            if (_objType.INDocType == "IN" || _objType.INDocType == "DM")
                            {
                                newLot.InvtMult = -1;
                            }
                            else if (_objType.INDocType == "CM")
                            {
                                newLot.InvtMult = 1;
                            }
                            else
                            {
                                newLot.InvtMult = 0;
                            }

                            if ((newdet.UnitMultDiv == "M" ? newQty / newdet.UnitRate : newQty * newdet.UnitRate) % 1 > 0)
                            {
                                newLot.CnvFact = 1;
                                newLot.UnitMultDiv = "M";
                                newLot.Qty = newQty;
                                newLot.UnitDesc = objInvt.StkUnit;
                                if (_objOM.DfltSalesPrice == "I")
                                {
                                    price = Math.Round(newLot.UnitMultDiv == "M" ? objInvt.SOPrice * newLot.CnvFact : objInvt.SOPrice / newLot.CnvFact, 0);
                                    newLot.UnitPrice = price;
                                    newLot.UnitCost = price;
                                }
                                else
                                {
                                    var priceLot = _lstPrice.FirstOrDefault(p => p.InvtID == newLot.InvtID && p.Unit == newLot.UnitDesc);
                                    newLot.UnitPrice = priceLot.Price.Value;
                                    newLot.UnitCost = priceLot.Price.Value;
                                }
                            }
                            else
                            {
                                newLot.Qty = Math.Round(newdet.UnitMultDiv == "M" ? newQty / newdet.UnitRate : newQty * newdet.UnitRate, 0);
                                newLot.CnvFact = newdet.UnitRate;
                                newLot.UnitMultDiv = newdet.UnitMultDiv;
                                newLot.UnitPrice = newdet.SlsPrice;
                                newLot.UnitCost = newdet.SlsPrice;
                                newLot.UnitDesc = newdet.SlsUnit;
                            }
                            _lstLot.Add(newLot);
                        }
                        if (needQty == 0)
                        {
                            break;
                        }
                    }
                }
            }
            IncreaseLineRef();
        }

        private bool ValidateDisc(OM10100_pdGetDiscSeq_Result seq)
        {
            return ((_objType.ARDocType != "CM" && _objType.ARDocType != "CC") ||
                    ((_objType.ARDocType == "CM" || _objType.ARDocType == "CC") && CheckReturnDisc(seq.DiscID, seq.DiscSeq)));
        }

        private OM10100_pdGetDiscSeq_Result GetDiscSeqActive(string discID, string discSeq)
        {
            OM10100_pdGetDiscSeq_Result objSeq = _lstSeqV2.FirstOrDefault(p => p.DiscID == discID && p.DiscSeq == discSeq);
            if (objSeq == null) objSeq = new OM10100_pdGetDiscSeq_Result();
            return objSeq;
        }
        private List<OM10100_pdOM_DiscItem_Result> GetOM_DiscItemList(string discID, string discSeq)
        {
            var lstItem = _app.OM10100_pdOM_DiscItem(discID, discSeq, "", Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return lstItem;
        }

        private bool GetOM_DiscCust(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscCust(discID, discSeq, _objOrder.CustID, _objOrder.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Result;//(null != _app.OM10100_pdOM_DiscCust(discID, discSeq, _objOrder.CustID, _objOrder.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault());
        }

        private bool GetOM_DiscCustClass(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscCustClass(discID, discSeq, _objCust.PriceClassID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Result;//(null !=_app.OM10100_pdOM_DiscCustClass(discID, discSeq, _objCust.PriceClassID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault());
        }

        private bool GetOM_DiscChannel(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscChannel(discID, discSeq, _objCust.Channel, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Result;//(null != _app.OM10100_pdOM_DiscChannel(discID, discSeq, _objCust.Channel, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault());
        }
        private bool GetOM_DiscCustCate(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscCustCate(discID, discSeq, _objCust.ClassId, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Result;//(null != _app.OM10100_pdOM_DiscCustCate(discID, discSeq, _objCust.ClassId, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault());
        }
        private bool GetOM_DiscMarket(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscMarket(discID, discSeq, _objCust.Market, Current.UserName, Current.CpnyID, Current.LangID, _objCust.CustId, _objCust.State, _objCust.District).FirstOrDefault().Result;//(null != _app.OM10100_pdOM_DiscMarket(discID, discSeq, _objCust.Market, Current.UserName, Current.CpnyID, Current.LangID, _objCust.CustId, _objCust.State, _objCust.District).FirstOrDefault());
        }
        private bool GetOM_DiscShopType(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscShopType(discID, discSeq, _objCust.ShopType, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Result;//(null  != _app.OM10100_pdOM_DiscShopType(discID, discSeq, _objCust.ShopType, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault());
        }
        private bool GetOM_DiscSalesCustClass(string discID, string discSeq)
        {
            return _app.OM10100_pdOM_DiscSalesCustClass(discID, discSeq, _objCust.CustId, _objCust.BranchID, _objCust.ClassId, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault().Result;//(null != _app.OM10100_pdOM_DiscSalesCustClass(discID, discSeq, _objCust.CustId, _objCust.BranchID, _objCust.ClassId, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault());
        }

        private void GetSetup()
        {
            _objIN = _app.IN_Setup.FirstOrDefault(p => p.BranchID == _objOrder.BranchID && p.SetupID == "IN");
            if (_objIN == null)
            {
                throw new MessageException("20404", new string[] { "IN_Setup" });
            }
            _objOM = _app.OM_Setup.FirstOrDefault();
            if (_objOM == null)
            {
                throw new MessageException("20404", new string[] { "OM_Setup" });
            }
            _objType = _app.OM_OrderType.FirstOrDefault(p => p.OrderType == _objOrder.OrderType);
            if (_objType == null)
            {
                throw new MessageException("8013", new string[] { _objOrder.OrderType });
            }
            _objCust = _app.AR_Customer.FirstOrDefault(p => p.CustId == _objOrder.CustID && p.BranchID == _objOrder.BranchID);
            if (_objCust == null)
            {
                throw new MessageException("2015032701", new string[] { _objOrder.CustID });
            }
            _objUser = _app.OM10100_pdOM_UserDefault(_objOrder.BranchID, _objOrder.SlsPerID, _objOrder.OrderType, _objOrder.OrderDate, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (_objUser == null)
            {
                throw new MessageException("8006");
            }
        }
        private OM10100_pdGetMaxLotByCustomer_Result GetMaxLot(string discID, string discSeq, string lineRef, double value)
        {
            var obj = _lstMaxLot.Where(x => x.DiscID == discID && x.DiscSeq == discSeq && x.DiscBreakLineRef == lineRef).FirstOrDefault();
            if (obj == null)
            {
                obj = new OM10100_pdGetMaxLotByCustomer_Result()
                {
                    DiscBreakLineRef = lineRef,
                    DiscID = discID,
                    DiscSeq = discSeq,
                    Qty = (int)value
                };
            }
            _lstMaxLot.Add(obj);
            return obj;
        }

        private OM10100_pdGetMaxLotByCustomer_Result SetMaxLot(string discID, string discSeq, string lineRef, double qty, bool setValue)
        {
            var obj = _lstMaxLot.Where(x => x.DiscID == discID && x.DiscSeq == discSeq && x.DiscBreakLineRef == lineRef).FirstOrDefault();
            if (obj != null)
            {
                if (obj.Qty > 0 && !setValue)
                {
                    obj.Qty -= qty;
                }
                else
                {
                    obj.Qty = qty;
                }
            }
            return obj;
        }

        private int CalcDiscountRate(double qtyAmt, double qtyBreak, string reqType, int maxGLot, string breakBoundType)
        {
            if (qtyBreak == 0)
            {
                return 0;
            }
            decimal result = (decimal)(qtyAmt / qtyBreak);
            int numLot = (result).ToInt();
            if (!string.IsNullOrWhiteSpace(reqType))
            {
                if (reqType == RequiredTypeQ)
                {
                    numLot = maxGLot > numLot ? numLot : maxGLot;
                }
                if (_objMaxLot != null)
                {
                    numLot = numLot > _objMaxLot.Qty.Value ? _objMaxLot.Qty.Value.ToInt() : numLot;
                    if (numLot < 0)
                    {
                        numLot = 0;
                    }

                }
            }
            if (breakBoundType != "L" && numLot > 1)
            {
                numLot = 1;
            }
            return numLot;
        }

        public void Insert_IN_ItemSite(ref IN_ItemSite objIN_ItemSite, string SiteID, string invtID, short stkItem)
        {
            try
            {
                objIN_ItemSite = new IN_ItemSite();
                objIN_ItemSite.InvtID = invtID;
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
                objIN_ItemSite.StkItem = stkItem;
                objIN_ItemSite.TotCost = 0;
                objIN_ItemSite.LastPurchaseDate = DateTime.Now;
                objIN_ItemSite.Crtd_DateTime = DateTime.Now;
                objIN_ItemSite.Crtd_Prog = _screenNbr;
                objIN_ItemSite.Crtd_User = Current.UserName;
                objIN_ItemSite.LUpd_DateTime = DateTime.Now;
                objIN_ItemSite.LUpd_Prog = _screenNbr;
                objIN_ItemSite.LUpd_User = Current.UserName;
                objIN_ItemSite.tstamp = new byte[0];
                _app.IN_ItemSite.AddObject(objIN_ItemSite);
            }
            catch (Exception ex)
            {
                throw (ex);
            }
        }

        private string LastLineRef(string lineRef)
        {
            int len = 5 - lineRef.Length;
            for (int i = 0; i < len; i++)
            {
                lineRef = "0" + lineRef;
            }
            return lineRef;
        }        
        private string GetFreeItemSite(string freeSiteID, string siteType)
        {
            if (siteType != string.Empty)
            {
                return siteType;
            }
            return (Util.PassNull(_objUser.DiscSite) != string.Empty) ? _objUser.DiscSite : freeSiteID;
        }
        private bool GetPromoAmt(ref double promoAmt, ref double origBonusAmt, OM10100_pdGetDiscSeq_Result objSeq, int maxLot, double amt, double qtyAmt, double qtyBreak, double discBonusFactor)
        {
            if (objSeq.ConvertDiscAmtToFreeItem)
            {
                if (promoAmt > 0)
                {
                    if (objSeq.DiscFor == "P")
                    {
                        promoAmt = Math.Round(promoAmt * amt / 100, 0);
                    }
                    else
                    {
                        promoAmt = promoAmt * CalcDiscountRate(qtyAmt, qtyBreak, objSeq.RequiredType, maxLot, objSeq.BreakBoundType);
                    }
                    origBonusAmt = promoAmt;
                    promoAmt = promoAmt + Math.Round(promoAmt * (discBonusFactor / 100), 0);
                }
            }
            else
            {
                promoAmt = 0;
            }
            return true;
        }
        #endregion

        #endregion
        
        #region -other method-

        private void GetChoiceDiscount(bool pdaOrder)
        {

            string invtIDSiteID = string.Empty;
            #region -Choice Discount-
            var lstTmp = _lstChoice.Distinct(new DiscountChoiceDistinct()).ToList();
            foreach (var item in lstTmp)
            {
                if (_lstChoice.Count(p => p.Index == item.Index && p.Index == item.Index) == 1)
                {
                    _lstChoice.Remove(_lstChoice.FirstOrDefault(p => p.Index == item.Index));
                }
            }
            Dictionary<string, List<DiscountChoice>> choiceInGroup = new Dictionary<string, List<DiscountChoice>>();
            var lstDisc = _app.OM10100_pdOrdDisc(_objOrder.BranchID, _objOrder.OrderNbr, _objOrder.OrigOrderNbr, pdaOrder, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            var lstProg = new List<PromoProgram>();
            string key = "";
            foreach (var choice in _lstChoice)
            {
                choice.Sel = false;
                GetQtyAvailByInvtSite(choice.FreeItemID, choice.FreeSiteID);                
                var objDisc = lstDisc.FirstOrDefault(item => choice.DiscID == item.DiscID
                    && choice.DiscSeq == item.DiscSeq
                    && choice.FreeItemID == item.FreeItemID
                    && choice.DiscLineRef == item.DiscBreakLineRef
                    && choice.GroupLineRef == item.GroupRefLineRef
                    );//&& choice.LineRef == item.LineRef
                if (_qtyChange) objDisc = null;
                if (objDisc != null)
                {
                    double discQty = GetDiscFreeItemQty(choice.FreeItemID, choice.FreeItemUnit, objDisc.DiscUOM, objDisc.FreeItemQty);
                    if (choice.DonateGroupProduct == true)
                    {
                        if (objDisc.FreeItemQty > 0)
                        {
                            choice.Sel = true;
                            choice.FreeItemQty = discQty;
                        }
                    }
                    else
                    {
                        choice.Sel = true;
                        var maxQty = choice.MaxQty * (objDisc.FreeItemQty / choice.QtyAvail);
                        if (choice.ConvertDiscAmtToFreeItem)
                        {
                            choice.FreeItemQty = discQty;
                        }
                        else
                        {
                            choice.FreeItemQty = maxQty < discQty ? maxQty : discQty;
                        }
                        choice.PromoLineAmt = choice.FreeItemQty * choice.PromoPrice;
                    }
                    if (!lstProg.Any(x => x.DiscID == objDisc.DiscID && x.DiscSeq == objDisc.DiscSeq && x.DiscLineRef == objDisc.DiscBreakLineRef && x.GroupLineRef == objDisc.GroupRefLineRef))
                    {
                        PromoProgram objPromo = new PromoProgram(objDisc.DiscID, objDisc.DiscSeq, objDisc.DiscBreakLineRef, 0, objDisc.GroupRefLineRef);
                        lstProg.Add(objPromo);
                    }
                }
                var qtyAvail = _lstFreeQtyAvail[choice.FreeItemID + choice.FreeSiteID];
                choice.ToTalQtyFreeItem = qtyAvail;
                double cnvFact = 1;
                string unitMultDiv = "M";
                IN_UnitConversion cnv = SetUOM(choice.FreeItemID, choice.FreeItemUnit, "", "");
                if (cnv != null)
                {
                    cnvFact = cnv.CnvFact;
                    unitMultDiv = cnv.MultDiv;
                }
                if (choice.DonateGroupProduct == true)
                {
                    choice.QtyAvail = unitMultDiv == "M" ? qtyAvail / cnvFact : qtyAvail * cnvFact;
                    var maxLot = Math.Floor(choice.MaxQtyInGroup / choice.FreeItemQtyBase).ToInt();
                    //choice.MaxQtyInGroup = maxLot > choice.QtyAvail ? choice.QtyAvail : maxLot;
                    var maxQtyAvail = maxLot > choice.QtyAvail ? choice.QtyAvail : maxLot;
                    if (objDisc != null)
                    {
                        choice.FreeItemQty = objDisc.FreeItemQty > maxQtyAvail ? maxQtyAvail : objDisc.FreeItemQty;
                    }

                    key = choice.DiscID + choice.DiscSeq + choice.LevelID + choice.LineRef + choice.DiscLineRef;
                    if (choiceInGroup.ContainsKey(key))
                    {
                        choiceInGroup[key].Add(choice);
                    }
                    else
                    {
                        List<DiscountChoice> lstChoiceGroup = new List<DiscountChoice>();
                        lstChoiceGroup.Add(choice);
                        choiceInGroup.Add(key, lstChoiceGroup);
                    }
                }
                #region -Get QtyAvail-
                if (choice.ConvertDiscAmtToFreeItem)
                {                    
                    choice.QtyAvail = unitMultDiv == "M" ? qtyAvail / cnvFact : qtyAvail * cnvFact;
                    var maxLot = Math.Floor(choice.PromoAmt / choice.PromoPrice).ToInt();
                    choice.MaxQtyInGroup = maxLot > choice.QtyAvail ? choice.QtyAvail : maxLot;
                    if (objDisc != null)
                    {
                        choice.FreeItemQty = objDisc.FreeItemQty > choice.MaxQtyInGroup ? choice.MaxQtyInGroup : objDisc.FreeItemQty;
                    }
                }
                #endregion
            }
            foreach (var item in lstProg)
            {
                var obj = _lstChoice.FirstOrDefault(x => x.Sel == true && x.DiscID == item.DiscID && x.DiscSeq == item.DiscSeq && x.DiscLineRef == item.DiscLineRef && x.GroupLineRef == item.GroupLineRef);/// 
                if (obj != null)
                {
                    var lstSetValue = _lstChoice.Where(x => x.DiscID == item.DiscID && x.DiscSeq == item.DiscSeq && x.DiscLineRef == item.DiscLineRef && x.FreeItemQty > 0 && x.Sel == false && x.GroupLineRef == item.GroupLineRef);//
                    foreach (var choice in lstSetValue)
                    {
                        choice.FreeItemQty = 0;
                    }
                }
            }
            #endregion

            #region -Set default số suất trong nhóm-
            foreach (var it in choiceInGroup)
            {
                List<string> lstUsed = new List<string>();
                double maxInGroupValue = -1;
                double selQty = 0;
                string groupItem = string.Empty;
                bool isBreak = false;
                if (it.Value.Count > 0)
                {
                    maxInGroupValue = it.Value[0].MaxQtyInGroup;
                    groupItem = it.Value[0].GroupItem;
                }
                var firstCheck = true;
                foreach (var itFree in it.Value)
                {
                    if (groupItem != itFree.GroupItem)
                    {
                        groupItem = itFree.GroupItem;
                        maxInGroupValue = itFree.MaxQtyInGroup;
                        isBreak = false;
                        selQty = 0;
                        firstCheck = true;
                    }
                    if (!isBreak || (!it.Value.Any(x => x.Sel && itFree.GroupItem == x.GroupItem) && !lstUsed.Any(x => x == itFree.GroupItem)))
                    {
                        if (it.Value.Where(x => x.Sel && itFree.GroupItem == x.GroupItem).Sum(x => x.FreeItemQty) == itFree.MaxQtyInGroup)
                        {
                            isBreak = true;
                        }
                        else
                        {
                            if (firstCheck)
                            {
                                // Bỏ check nếu số suất chọn đã thay đổi
                                var lstChoice = it.Value.Where(x => x.Sel && itFree.GroupItem == x.GroupItem);
                                foreach (var itSel in lstChoice)
                                {
                                    itSel.Sel = false;
                                    itSel.FreeItemQty = 0;
                                }
                                firstCheck = false;
                            }
                            itFree.FreeItemQty = itFree.QtyAvail >= itFree.MaxQtyInGroup ? itFree.MaxQtyInGroup : itFree.QtyAvail;

                            #region-checkQtyAvail-
                            double cnvFact = 1;
                            string unitMultDiv = "M";
                            IN_UnitConversion cnv = SetUOM(itFree.FreeItemID, itFree.FreeItemUnit, "", "");
                            if (cnv != null)
                            {
                                cnvFact = cnv.CnvFact;
                                unitMultDiv = cnv.MultDiv;
                            }
                            var qtyCheck = unitMultDiv == "M" ? cnvFact * itFree.FreeItemQty : cnvFact / cnvFact;
                            string keyAvail = itFree.FreeItemID + itFree.FreeSiteID;
                            if (_lstFreeQtyAvail.ContainsKey(keyAvail))
                            {
                                if (_lstFreeQtyAvail[keyAvail] - qtyCheck < 0)
                                {
                                    itFree.FreeItemQty = _lstFreeQtyAvail[keyAvail];
                                    _lstFreeQtyAvail[keyAvail] = 0;
                                }
                                else
                                {
                                    _lstFreeQtyAvail[keyAvail] -= qtyCheck;
                                }
                            }
                            #endregion

                            selQty += itFree.FreeItemQty;

                            if (selQty >= maxInGroupValue)
                            {
                                itFree.FreeItemQty -= selQty - maxInGroupValue;
                                isBreak = true;
                            }
                            itFree.Sel = (itFree.FreeItemQty > 0);
                            if (!lstUsed.Any(x => x == itFree.GroupItem))
                            {
                                lstUsed.Add(itFree.GroupItem);
                            }
                        }
                    }
                    if (!itFree.Sel)
                    {
                        itFree.FreeItemQty = 0;
                    }
                    if (itFree.FreeItemQty == 0)
                    {
                        itFree.Sel = false;
                    }
                }
            }
            #endregion
            _lstChoice = new List<DiscountChoice>(_lstChoice.OrderBy(x => x.Index).ThenBy(x => x.PromoPrice));
            _logMessage = Json(new { choice = _lstChoice, success = true }, JsonRequestBehavior.AllowGet);
            throw new Exception("Choice Discount");
        }
        private double GetDiscFreeItemQty(string freeItemID, string freeUnitDescr, string discUnit, double qty)
        {
            if (freeUnitDescr == discUnit)
            {
                return qty;
            }
            else
            {
                OM10100_pdInventoryByID_Result objInvt = GetInventory(freeItemID);
                IN_UnitConversion cnv = SetUOM(freeItemID, freeUnitDescr, objInvt.ClassID, discUnit);
                if (cnv != null)
                {
                    return qty / cnv.CnvFact;
                }
                return qty;
            }
        }

        /// <summary>
        /// Check Release before sava data
        /// </summary>
        /// <returns></returns>
        private bool HandleReaseBeforeSave()
        {
            DataAccess dal = Util.Dal();
            OMProcess.OM order = new OMProcess.OM(Current.UserName, "OM10100", dal);
            try
            {
                dal.BeginTrans(IsolationLevel.ReadCommitted);
                if (_handle == "V" && _objOrder.Status != "I")
                {
                    if (_calcPromoOnly == 0)
                    {
                        for (int i = 0; i < _lstOldOrdDet.Count(); i++)
                        {
                            if (_lstOldOrdDet[i].FreeItem == true && _lstOldOrdDet[i].DisplayID != "" && _objOrder.OrderType == "IR")
                            {

                                var displayID = _lstOldOrdDet[i].DisplayID;
                                var displayPeriodID = _lstOldOrdDet[i].DisplayPeriodID;
                                var invtID = _lstOldOrdDet[i].InvtID;
                                var newQty = _lstOldOrdDet[i].UnitMultDiv == "D" ? _lstOldOrdDet[i].LineQty / _lstOldOrdDet[i].UnitRate : _lstOldOrdDet[i].LineQty * _lstOldOrdDet[i].UnitRate;
                                var obj = _app.OM_TDisplayReward.FirstOrDefault(p => p.DisplayID == displayID && p.PeriodID == displayPeriodID && p.InvtID == invtID && p.CustID == _objOrder.CustID);
                                if (obj != null)
                                {
                                    obj.QtyAmtAvail = obj.Qty - (obj.QtyAmtUsed + newQty);
                                    obj.QtyAmtUsed = obj.QtyAmtUsed + newQty;
                                    obj.LUpd_DateTime = DateTime.Now;
                                    obj.LUpd_Prog = _screenNbr;
                                    obj.LUpd_User = Current.UserName;
                                    if (obj.QtyAmtAvail < 0)
                                    {
                                        throw new MessageException("2018101060", new string[] { obj.InvtID });//2018101060 (EN) Mã Sản Phẩm @p1 không đủ số lượng trả CTTB có thể trả!</br>
                                    }
                                }
                            }
                        }
                    }
                    if (_objOrder.Status == "C")
                    {
                        order.OM10100_Cancel(_objOrder.BranchID, _objOrder.OrderNbr, string.Empty);
                    }
                    else
                    {
                        order.OM10100_AbortOrder(_objOrder.BranchID, _objOrder.OrderNbr, _objOrder.OrderDate);
                    }
                    dal.CommitTrans();
                    // Save OM_DisplayReward sau khi commit
                    _app.SaveChanges();
                    _app.OM10100_pdUpdatePaid(_objOrder.RewardID, _objOrder.BranchID, _objOrder.SlsPerID, _objOrder.CustID, Current.UserName, Current.CpnyID, Current.LangID, false).FirstOrDefault();
                }
                else if (_handle == "C")
                {
                    if (_calcPromoOnly == 0)
                    {
                        for (int i = 0; i < _lstOldOrdDet.Count(); i++)
                        {
                            if (_lstOldOrdDet[i].FreeItem == true && _lstOldOrdDet[i].DisplayID != "" && _objOrder.OrderType == "IR")
                            {
                                var displayID = _lstOldOrdDet[i].DisplayID;
                                var displayPeriodID = _lstOldOrdDet[i].DisplayPeriodID;
                                var invtID = _lstOldOrdDet[i].InvtID;
                                var newQty = _lstOldOrdDet[i].UnitMultDiv == "D" ? _lstOldOrdDet[i].LineQty / _lstOldOrdDet[i].UnitRate : _lstOldOrdDet[i].LineQty * _lstOldOrdDet[i].UnitRate;
                                var obj = _app.OM_TDisplayReward.FirstOrDefault(p => p.DisplayID == displayID && p.PeriodID == displayPeriodID && p.InvtID == invtID && p.CustID == _objOrder.CustID);
                                if (obj != null)
                                {
                                    obj.QtyAmtUsed = obj.QtyAmtUsed - newQty;
                                    obj.QtyAmtAvail = obj.Qty - obj.QtyAmtUsed;

                                    obj.LUpd_DateTime = DateTime.Now;
                                    obj.LUpd_Prog = _screenNbr;
                                    obj.LUpd_User = Current.UserName;
                                    if (obj.QtyAmtUsed < 0)
                                    {
                                        throw new MessageException("2018101060", new string[] { obj.InvtID });//2018101060 (EN) Mã Sản Phẩm @p1 không đủ số lượng trả CTTB có thể trả!</br>
                                    }
                                }
                            }
                        }
                    }
                    if (!string.IsNullOrWhiteSpace(_objOrder.RewardID) && _objOrder.OrderType == "IN")
                    {
                        var rewardobj = _app.OM10100_pdRewardAmt(_objOrder.RewardID, _objOrder.BranchID, _objOrder.SlsPerID, _objOrder.CustID).FirstOrDefault();

                        if (rewardobj == null || string.IsNullOrWhiteSpace(rewardobj.DisplayID))
                        {
                            throw new MessageException("2016101901", new string[] { _objOrder.RewardID.Trim().TrimEnd(',') });
                        }
                    }
                    if ((_handle == "C" && _objOrder.OrderType == "IR") && _objOrder.DoNotCalDisc == (short)1 && _calcPromoOnly == 0)
                    {
                        CalcBudget();
                    }
                    order.OM10100_InvoiceRelease(_objOrder.BranchID, _objOrder.OrderNbr, "R", _objOrder.OrderDate);
                    dal.CommitTrans();
                    // Save OM_TDisplayReward sau khi commit
                    _app.SaveChanges();
                    // Update Paid
                    _app.OM10100_pdUpdatePaid(_objOrder.RewardID, _objOrder.BranchID, _objOrder.SlsPerID, _objOrder.CustID, Current.UserName, Current.CpnyID, Current.LangID, true).FirstOrDefault();
                }
                else if (_handle == "L")
                {
                    if (_objOrder.OrderType == "IN" && _calcPromoOnly == 0 )
                    {
                        CalcBudget();
                    }
                    order.OM10100_InvoiceRelease(_objOrder.BranchID, _objOrder.OrderNbr, "L", _objOrder.OrderDate);
                    dal.CommitTrans();
                    _app.SaveChanges();
                }
                else if (_handle == "V" && _objOrder.Status == "I")
                {
                    if (_objOrder.OrderType == "IN" && _calcPromoOnly == 0)
                    {
                        CalcBudget();
                    }
                    order.OM10100_InvoiceRelease(_objOrder.BranchID, _objOrder.OrderNbr, "V", _objOrder.OrderDate);
                    dal.CommitTrans();
                    _app.SaveChanges();
                }
                Util.AppendLog(ref _logMessage, "9999");
            }
            catch (Exception)
            {
                dal.RollbackTrans();
                throw;
            }
            finally
            {
                order = null;
            }
            return true;
        }

        private void CalcBudget()
        {
            if (_lstDisc.Count > 0)
            {
                foreach (var newDisc in _lstDisc)
                {
                    string budget = string.IsNullOrWhiteSpace(newDisc.FreeItemID) ? newDisc.BudgetID : newDisc.FreeItemBudgetID;
                    InsertUpdateBudget(newDisc.DiscID, newDisc.DiscSeq, budget, newDisc.DiscAmt, newDisc.FreeItemID, newDisc.FreeItemQty, newDisc.DiscUOM);
                }
            }
            CalcManualBudget();
        }

        private void CalcManualBudget()
        {
            if (_lstManualDisc.Count > 0)
            {
                var isAllFreeItem = false;
                if (_lstOrdDet.Count == _lstOrdDet.Count(x => x.FreeItem))
                {
                    isAllFreeItem = true;
                }
                foreach (var newDisc in _lstManualDisc)
                {
                    if (newDisc.SOLineRef != "")
                    {
                        if (!_lstOrdDet.Any(x => x.LineRef == newDisc.SOLineRef))
                        {
                            continue;
                        }
                    }
                    else if (isAllFreeItem)
                    {
                        continue;
                    }
                    string freeItemUnit = newDisc.FreeItemUnit;
                    if (freeItemUnit == string.Empty)
                    {
                        var objInvt = GetInventory(newDisc.FreeItemID);
                        freeItemUnit = objInvt.StkUnit;
                    }
                    InsertUpdateBudget(newDisc.DiscCode, "", newDisc.BudgetID, newDisc.DiscAmt, newDisc.FreeItemID, newDisc.FreeItemQty, freeItemUnit);
                }
            }
        }
        /// <summary>
        /// Check Release after save data
        /// </summary>
        /// <param name="pdaOrder">true: Đơn hàng từ PDA</param>
        /// <returns></returns>
        private bool HandleReleaseAfterSave(bool pdaOrder)
        {
            if (pdaOrder)
            {
                DataAccess dal = Util.Dal();
                var order = new OMProcess.OM(Current.UserName, "OM10100", dal);
                try
                {
                    dal.BeginTrans(IsolationLevel.ReadCommitted);
                    order.OM10100_PrintInvoice(_objOrder.BranchID, _objOrder.OrderNbr);
                    order.OM10100_InvoiceRelease(_objOrder.BranchID, _objOrder.OrderNbr, "R", _objOrder.OrderDate);
                    dal.CommitTrans();
                    // Update Paid
                    _app.OM10100_pdUpdatePaid(_objOrder.RewardID, _objOrder.BranchID, _objOrder.SlsPerID, _objOrder.CustID, Current.UserName, Current.CpnyID, Current.LangID, true).FirstOrDefault();
                    Util.AppendLog(ref _logMessage, "9999", data: new { orderNbr = _objOrder.OrderNbr });
                }
                catch (Exception ex)
                {
                    dal.RollbackTrans();
                    throw ex;
                }
                finally
                {
                    order = null;
                }
            }
            else
            {
                if (_handle == "I")
                {
                    DataAccess dal = Util.Dal();
                    var order = new OMProcess.OM(Current.UserName, "OM10100", dal);
                    try
                    {
                        if (!string.IsNullOrWhiteSpace(_objOrder.RewardID) && _objOrder.OrderType == "IN")
                        {
                            var rewardobj = _app.OM10100_pdRewardAmt(_objOrder.RewardID, _objOrder.BranchID, _objOrder.SlsPerID, _objOrder.CustID).FirstOrDefault();

                            if (rewardobj == null || string.IsNullOrWhiteSpace(rewardobj.DisplayID))
                            {
                                throw new MessageException("2016101901", new string[] { _objOrder.RewardID.Trim().TrimEnd(',') });
                            }
                        }
                        dal.BeginTrans(IsolationLevel.ReadCommitted);
                        order.OM10100_PrintInvoice(_objOrder.BranchID, _objOrder.OrderNbr); 
                        dal.CommitTrans();
                        Util.AppendLog(ref _logMessage, "9999", data: new { orderNbr = _objOrder.OrderNbr });
                    }
                    catch (Exception)
                    {
                        dal.RollbackTrans();
                        throw;
                    }
                    finally
                    {
                        order = null;
                    }
                }
            }
            return false;
        }        

        private void SavePDAOrd(int outOfBudget)
        {
            if (_calcPromoOnly == 1)
            {
                SaveDataCalcPromo(outOfBudget);
                
                string mess = string.Empty;
                if (_messMinPrice.Count > 0)
                {
                    mess = GetMess(2018070901, new string[] { string.Join(", ", _messMinPrice) });
                }
                _logMessage = Json(new { CalcPromoOnly = true, code = 9999, success = true, errorMsg = mess }, JsonRequestBehavior.AllowGet);
                throw new Exception("Calc Promotion"); 
            }
            else // _calcPromoOnly == 0
            {
                UpdatePDAOrder();
                if (_objOrder.DoNotCalDisc == (short)1 && _calcPromoOnly == 0 && outOfBudget == 0)
                {
                    CalcBudget();
                }
                else if (_objOrder.DoNotCalDisc == (short)0 && _calcPromoOnly == 0 && (_budgetStatus == 2  || outOfBudget == 0))
                {
                    CalcManualBudget();
                }
                
                if (_calcPromoOnly != 0)
                {
                    string mess = string.Empty;
                    if (_messMinPrice.Count > 0)
                    {
                        mess = GetMess(2018070901, new string[] { string.Join(", ", _messMinPrice) });
                    }
                    _logMessage = Json(new { CalcPromoOnly = true, code = 9999, success = true, errorMsg = mess }, JsonRequestBehavior.AllowGet);
                    if (_calcPromoOnly == 3)
                    {
                        throw new Exception("");
                    }
                    throw new Exception("Calc Promotion");
                }
            }
        }

        private void UpdatePDAOrder()
        {
            OM10100Entities db = Util.CreateObjectContext<OM10100Entities>(false);
            // Tính lại KM cho đơn PDA khi chưa release sang C
            //var lstLot = new List<QtyItemLot>();
            var objPDAOrder = db.OM_PDASalesOrd.FirstOrDefault(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr);
            if (objPDAOrder != null)
            {
                if (objPDAOrder.DoNotCalDisc == 1 && _approvalAll)
                {
                    #region -Update OM_OrdDisc-
                    objPDAOrder.OrdAmtApprove = _objOrder.OrdAmt;// -_objOrder.VolDiscAmt - _objOrder.OrdDiscAmt;
                    // Duyệt nguyên đơn hàng => Update OM_PDAOrdDisc qua OM_OrdDisc
                    var lstPDAOrdDisc = db.OM_PDAOrdDisc.Where(x => x.BranchID == objPDAOrder.BranchID && x.OrderNbr == objPDAOrder.OrderNbr).ToList();
                    foreach (var item in lstPDAOrdDisc)
                    {
                        var objOrdDisc = db.OM_OrdDisc.FirstOrDefault(x => x.BranchID == objPDAOrder.BranchID
                                        && x.OrderNbr == _objOrder.OrderNbr
                                        && x.DiscID == item.DiscID
                                        && x.DiscSeq == item.DiscSeq
                                        && x.LineRef == item.LineRef);
                        if (objOrdDisc == null)
                        {
                            objOrdDisc = new OM_OrdDisc();
                            objOrdDisc.BranchID = item.BranchID;
                            objOrdDisc.DiscID = item.DiscID;
                            objOrdDisc.DiscSeq = item.DiscSeq;
                            objOrdDisc.OrderNbr = _objOrder.OrderNbr;
                            objOrdDisc.LineRef = item.LineRef;
                            if (_lstDisc.FirstOrDefault(x => x.BranchID == objPDAOrder.BranchID
                                        && x.OrderNbr == _objOrder.OrderNbr
                                        && x.DiscID == item.DiscID
                                        && x.DiscSeq == item.DiscSeq
                                        && x.LineRef == item.LineRef) == null)
                            {
                                objOrdDisc.Crtd_DateTime = DateTime.Now;
                                objOrdDisc.Crtd_Prog = _screenNbr;
                                objOrdDisc.Crtd_User = Current.UserName;
                                objOrdDisc.tstamp = new byte[1];
                                db.OM_OrdDisc.AddObject(objOrdDisc);
                            }
                        }
                        objOrdDisc.BreakBy = item.BreakBy;
                        objOrdDisc.BudgetID = item.BudgetID;
                        objOrdDisc.DiscAmt = item.DiscAmt;
                        objOrdDisc.DiscFor = item.DiscFor;
                        objOrdDisc.DisctblAmt = item.DisctblAmt;
                        objOrdDisc.DisctblQty = item.DisctblQty;
                        objOrdDisc.DiscType = item.DiscType;
                        objOrdDisc.DiscUOM = item.DiscUOM;
                        objOrdDisc.FreeItemBudgetID = item.FreeItemBudgetID;
                        objOrdDisc.FreeItemID = item.FreeItemID;
                        objOrdDisc.FreeItemQty = item.FreeItemQty;
                        objOrdDisc.OrigFreeItemQty = item.OrigFreeItemQty;
                        objOrdDisc.SlsPerID = item.SlsPerID;
                        objOrdDisc.SOLineRef = item.SOLineRef;
                        objOrdDisc.UserOperationLog = item.UserOperationLog;
                        objOrdDisc.LUpd_DateTime = DateTime.Now;
                        objOrdDisc.LUpd_Prog = _screenNbr;
                        objOrdDisc.LUpd_User = Current.UserName;
                        objOrdDisc.DiscBreakLineRef = item.DiscBreakLineRef;
                        objOrdDisc.RefLineRef = item.RefLineRef.PassNull();
                        objOrdDisc.GroupRefLineRef = item.GroupRefLineRef.PassNull();
                    }
                    #endregion
                }
                else
                {
                    // PDA data
                    var lstPDADet = db.OM_PDASalesOrdDet.Where(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr).ToList();
                    var lstPDAOrdDisc = db.OM_PDAOrdDisc.Where(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr).ToList();

                    if (_lstOrdDet.Count == 0)
                    {
                        // No promo item 
                        foreach (var item in lstPDADet)
                        {
                            if (item.FreeItem && string.IsNullOrWhiteSpace(item.DiscCode) && string.IsNullOrWhiteSpace(item.DisplayID))
                            {
                                db.OM_PDASalesOrdDet.DeleteObject(item);
                            }
                        }
                    }
                    else
                    {
                        // Insert all promo from Cloud to PDA 
                        #region -Insert or Update OM_PDASalesOrdDet-
                        for (int idxOrdDet = 0; idxOrdDet < _lstOrdDet.Count; idxOrdDet++)
                        {
                            var objPDADet = lstPDADet.FirstOrDefault(x =>
                                        x.LineRef == _lstOrdDet[idxOrdDet].LineRef);
                            if (objPDADet == null)
                            {
                                objPDADet = new OM_PDASalesOrdDet();
                                objPDADet.BranchID = _lstOrdDet[idxOrdDet].BranchID;
                                objPDADet.OrderNbr = _objOrder.OrigOrderNbr;
                                objPDADet.LineRef = _lstOrdDet[idxOrdDet].LineRef;
                                objPDADet.Qty = _lstOrdDet[idxOrdDet].FreeItem && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DiscCode) && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DisplayID) ? _lstOrdDet[idxOrdDet].LineQty : 0;// _lstOrdDet[idxOrdDet].LineQty; 
                                objPDADet.QtyApprove = 0;
                                objPDADet.QtyERP = 0;
                                objPDADet.QtyShipD = 0;
                                objPDADet.QtyShip = 0;
                                objPDADet.POSMImg = string.Empty;
                                objPDADet.Crtd_Prog = "OM20500";
                                objPDADet.Crtd_User = Current.UserName;
                                objPDADet.Crtd_Datetime = DateTime.Now;
                                objPDADet.LineQty = _lstOrdDet[idxOrdDet].FreeItem && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DiscCode) && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DisplayID) ? _lstOrdDet[idxOrdDet].LineQty : objPDADet.LineQty;
                                objPDADet.LineAmt = _lstOrdDet[idxOrdDet].LineAmt;
                                db.OM_PDASalesOrdDet.AddObject(objPDADet);
                            }
                            else
                            {
                                if (_lstOrdDet[idxOrdDet].FreeItem && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DiscCode) && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DisplayID))
                                {
                                    objPDADet.LineQty = _lstOrdDet[idxOrdDet].LineQty;
                                    objPDADet.Qty = _lstOrdDet[idxOrdDet].LineQty;
                                    objPDADet.QtyApprove = 0;
                                    objPDADet.QtyERP = 0;
                                    objPDADet.QtyShipD = 0;
                                    objPDADet.QtyShip = 0;
                                }
                            }
                            #region -update-
                            if (_calcPromoOnly == 3)
                            {
                                objPDADet.Qty = objPDADet.LineQty;
                            }
                            objPDADet.BarCode = _lstOrdDet[idxOrdDet].BarCode;
                            objPDADet.BOCustID = _lstOrdDet[idxOrdDet].BOCustID.PassNull();
                            objPDADet.BOType = _lstOrdDet[idxOrdDet].BOType;
                            objPDADet.BudgetID1 = _lstOrdDet[idxOrdDet].BudgetID1.PassNull();
                            objPDADet.BudgetID2 = _lstOrdDet[idxOrdDet].BudgetID2.PassNull();
                            objPDADet.CostID = _lstOrdDet[idxOrdDet].CostID.PassNull();
                            objPDADet.Descr = _lstOrdDet[idxOrdDet].Descr;
                            objPDADet.DiscAmt = _lstOrdDet[idxOrdDet].DiscAmt;
                            objPDADet.DiscAmt1 = _lstOrdDet[idxOrdDet].DiscAmt1;
                            objPDADet.DiscAmt2 = _lstOrdDet[idxOrdDet].DiscAmt2;
                            objPDADet.DiscCode = _lstOrdDet[idxOrdDet].DiscCode.PassNull();
                            objPDADet.DiscID1 = _lstOrdDet[idxOrdDet].DiscID1.PassNull();
                            objPDADet.DiscID2 = _lstOrdDet[idxOrdDet].DiscID2.PassNull();
                            objPDADet.DiscPct = _lstOrdDet[idxOrdDet].DiscPct;
                            objPDADet.DiscPct1 = _lstOrdDet[idxOrdDet].DiscPct1;
                            objPDADet.DiscPct2 = _lstOrdDet[idxOrdDet].DiscPct2;
                            objPDADet.DiscSeq1 = _lstOrdDet[idxOrdDet].DiscSeq1.PassNull();
                            objPDADet.DiscSeq2 = _lstOrdDet[idxOrdDet].DiscSeq2.PassNull();
                            objPDADet.DocDiscAmt = _lstOrdDet[idxOrdDet].DocDiscAmt;
                            objPDADet.FreeItem = _lstOrdDet[idxOrdDet].FreeItem;
                            objPDADet.FreeItemQty1 = _lstOrdDet[idxOrdDet].FreeItemQty1;
                            objPDADet.FreeItemQty2 = _lstOrdDet[idxOrdDet].FreeItemQty2;
                            objPDADet.GroupDiscAmt1 = _lstOrdDet[idxOrdDet].GroupDiscAmt1;
                            objPDADet.GroupDiscAmt2 = _lstOrdDet[idxOrdDet].GroupDiscAmt2;
                            objPDADet.GroupDiscID1 = _lstOrdDet[idxOrdDet].GroupDiscID1.PassNull();
                            objPDADet.GroupDiscID2 = _lstOrdDet[idxOrdDet].GroupDiscID2.PassNull();
                            objPDADet.GroupDiscPct1 = _lstOrdDet[idxOrdDet].GroupDiscPct1;
                            objPDADet.GroupDiscPct2 = _lstOrdDet[idxOrdDet].GroupDiscPct2;
                            objPDADet.GroupDiscSeq1 = _lstOrdDet[idxOrdDet].GroupDiscSeq1.PassNull();
                            objPDADet.GroupDiscSeq2 = _lstOrdDet[idxOrdDet].GroupDiscSeq2.PassNull();
                            objPDADet.InvtID = _lstOrdDet[idxOrdDet].InvtID;
                            objPDADet.ItemPriceClass = _lstOrdDet[idxOrdDet].ItemPriceClass;
                            objPDADet.OrderType = _lstOrdDet[idxOrdDet].OrderType;
                            objPDADet.OrigOrderNbr = objPDAOrder.OrigOrderNbr;
                            objPDADet.QtyBO = _lstOrdDet[idxOrdDet].QtyBO;
                            objPDADet.QtyInvc = _lstOrdDet[idxOrdDet].QtyInvc;
                            objPDADet.QtyOpenShip = _lstOrdDet[idxOrdDet].QtyOpenShip;
                            objPDADet.ShipStatus = _lstOrdDet[idxOrdDet].ShipStatus.PassNull();
                            objPDADet.SiteID = _lstOrdDet[idxOrdDet].SiteID;
                            objPDADet.SlsPrice = _lstOrdDet[idxOrdDet].SlsPrice;
                            objPDADet.SlsUnit = _lstOrdDet[idxOrdDet].SlsUnit;
                            objPDADet.SOFee = _lstOrdDet[idxOrdDet].SOFee;
                            objPDADet.TaxAmt00 = _lstOrdDet[idxOrdDet].TaxAmt00;
                            objPDADet.TaxAmt01 = _lstOrdDet[idxOrdDet].TaxAmt01;
                            objPDADet.TaxAmt02 = _lstOrdDet[idxOrdDet].TaxAmt02;
                            objPDADet.TaxAmt03 = _lstOrdDet[idxOrdDet].TaxAmt03;
                            objPDADet.TaxCat = _lstOrdDet[idxOrdDet].TaxCat;
                            objPDADet.TaxID00 = _lstOrdDet[idxOrdDet].TaxId00;
                            objPDADet.TaxID01 = _lstOrdDet[idxOrdDet].TaxId01.PassNull();
                            objPDADet.TaxID02 = _lstOrdDet[idxOrdDet].TaxId01.PassNull();
                            objPDADet.TaxID03 = _lstOrdDet[idxOrdDet].TaxId03.PassNull();
                            objPDADet.TxblAmt00 = _lstOrdDet[idxOrdDet].TxblAmt00;
                            objPDADet.TxblAmt01 = _lstOrdDet[idxOrdDet].TxblAmt01;
                            objPDADet.TxblAmt02 = _lstOrdDet[idxOrdDet].TxblAmt02;
                            objPDADet.TxblAmt03 = _lstOrdDet[idxOrdDet].TxblAmt03;
                            objPDADet.UnitMultDiv = _lstOrdDet[idxOrdDet].UnitMultDiv;
                            objPDADet.UnitRate = _lstOrdDet[idxOrdDet].UnitRate;
                            objPDADet.UnitWeight = _lstOrdDet[idxOrdDet].UnitWeight;
                            objPDADet.LUpd_Prog = "OM20500";
                            objPDADet.LUpd_User = Current.UserName;
                            objPDADet.LUpd_Datetime = DateTime.Now;
                            objPDADet.tstamp = new byte[1];
                            objPDADet.POSM = _lstOrdDet[idxOrdDet].POSM;
                            objPDADet.Mark = _lstOrdDet[idxOrdDet].Mark ?? 0;
                            objPDADet.DisplayID = _lstOrdDet[idxOrdDet].DisplayID.PassNull();
                            objPDADet.DisplayPeriodID = _lstOrdDet[idxOrdDet].DisplayPeriodID.PassNull();
                            objPDADet.KitLineRef = string.Empty;
                            objPDADet.DiscIDSolomon = string.Empty;
                            objPDADet.Declaration = string.Empty;                           
                            objPDADet.ConsumerPromotionID = string.Empty;
                            objPDADet.GiftPoint = 0;
                            objPDADet.Level = 0;
                            objPDADet.IsBooking = false;
                            objPDADet.AccumulateID = objPDADet.AccumulateID.PassNull();
                            objPDADet.ManuDiscAmt = _lstOrdDet[idxOrdDet].ManuDiscAmt;
                            objPDADet.ManuDiscPct = _lstOrdDet[idxOrdDet].ManuDiscPct;
                            #endregion
                            if (_calcPromoOnly == 3)
                            {
                                var objItemSite = db.IN_ItemSite.FirstOrDefault(p => p.SiteID == objPDADet.SiteID && p.InvtID == objPDADet.InvtID);//SiteID, InvtID, WhseLoc, LotSerNbr;
                                if (objItemSite != null)
                                {
                                    var recordUnit = db.IN_UnitConversion.FirstOrDefault(p => p.InvtID == objItemSite.InvtID && p.FromUnit == objPDADet.SlsUnit);
                                    if (recordUnit != null)
                                    {
                                        double oldQty = 0;
                                        double qty = 0;
                                        double qtyEdit = 0;
                                        qty = recordUnit.MultDiv == "M" ? (objPDADet.Qty.ToDouble() * recordUnit.CnvFact) : (objPDADet.Qty.ToDouble() / recordUnit.CnvFact);
                                        qtyEdit = qty - oldQty;
                                        if ((objItemSite.QtyAvail - objItemSite.QtyAllocPDASO - qtyEdit) < 0)
                                        {
                                            throw new MessageException(MessageType.Message, "2020041560", "", new string[] { objPDAOrder.OrderNbr, objItemSite.InvtID, objItemSite.SiteID });
                                        }
                                        objItemSite.QtyAllocPDASO = objItemSite.QtyAllocPDASO + qtyEdit;
                                        objItemSite.LUpd_DateTime = DateTime.Now;
                                        objItemSite.LUpd_Prog = _screenNbr;
                                        objItemSite.LUpd_User = Current.UserName;


                                        //var lot = new QtyItemLot();
                                        //lot.ResetET();
                                        //lot.InvtID = objItemSite.InvtID;
                                        //lot.SiteID = objItemSite.SiteID;
                                        //lot.Qty = qty;
                                        //lstLot.Add(lot);
                                    }                                   
                                }
                            }
                           

                            
                        }
                        #endregion

                        if (_lstOrdDet.Count != _lstOrdDet.Where(x => x.DisplayID != string.Empty).Count())
                        {
                            // Delete old promotion 
                            foreach (var item in lstPDADet)
                            {
                                if (item.FreeItem && string.IsNullOrWhiteSpace(item.DiscCode) && string.IsNullOrWhiteSpace(item.DisplayID)) // Ko xoá KM tay
                                {
                                    var objDel = _lstOrdDet.FirstOrDefault(x =>
                                        x.LineRef == item.LineRef);
                                    if (objDel == null)
                                    {
                                        db.OM_PDASalesOrdDet.DeleteObject(item);
                                    }
                                }
                            }
                        }
                    }

                    if (_lstDisc.Count == 0)
                    {
                        if (_lstOrdDet.Count != _lstOrdDet.Where(x => x.DisplayID != string.Empty).Count())
                        {
                            foreach (var item in lstPDAOrdDisc)
                            {
                                db.OM_PDAOrdDisc.DeleteObject(item);
                            }
                        }
                    }
                    else
                    {
                        // Add new or update promotion
                        for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                        {
                            #region -Insert or Update OM_PDAOrdDisc-
                            var objDisc = _lstDisc[idxDisc];
                            var objOrdDisc = lstPDAOrdDisc.Where(x =>
                                x.BranchID == objDisc.BranchID
                                && x.OrderNbr == _objOrder.OrigOrderNbr
                                && x.DiscID == objDisc.DiscID
                                && x.DiscSeq == objDisc.DiscSeq
                                && x.LineRef == objDisc.LineRef
                                ).FirstOrDefault();
                            if (objOrdDisc == null)
                            {
                                objOrdDisc = new OM_PDAOrdDisc();
                                objOrdDisc.BranchID = _lstDisc[idxDisc].BranchID;
                                objOrdDisc.DiscID = _lstDisc[idxDisc].DiscID;
                                objOrdDisc.DiscSeq = _lstDisc[idxDisc].DiscSeq;
                                objOrdDisc.OrderNbr = _objOrder.OrigOrderNbr;
                                objOrdDisc.LineRef = _lstDisc[idxDisc].LineRef;
                                objOrdDisc.Crtd_DateTime = DateTime.Now;
                                objOrdDisc.Crtd_Prog = "OM20500";
                                objOrdDisc.Crtd_User = Current.UserName;                                
                                db.OM_PDAOrdDisc.AddObject(objOrdDisc);
                            }
                            objOrdDisc.DiscBreakLineRef = _lstDisc[idxDisc].DiscBreakLineRef;
                            objOrdDisc.BreakBy = _lstDisc[idxDisc].BreakBy;
                            objOrdDisc.BudgetID = _lstDisc[idxDisc].BudgetID;
                            objOrdDisc.DiscAmt = _lstDisc[idxDisc].DiscAmt;
                            objOrdDisc.DiscFor = _lstDisc[idxDisc].DiscFor;
                            objOrdDisc.DisctblAmt = _lstDisc[idxDisc].DisctblAmt;
                            objOrdDisc.DisctblQty = _lstDisc[idxDisc].DisctblQty;
                            objOrdDisc.DiscType = _lstDisc[idxDisc].DiscType;
                            objOrdDisc.DiscUOM = _lstDisc[idxDisc].DiscUOM;
                            objOrdDisc.FreeItemBudgetID = _lstDisc[idxDisc].FreeItemBudgetID;
                            objOrdDisc.FreeItemID = _lstDisc[idxDisc].FreeItemID;
                            objOrdDisc.FreeItemQty = _lstDisc[idxDisc].FreeItemQty;
                            objOrdDisc.OrigFreeItemQty = _lstDisc[idxDisc].OrigFreeItemQty;
                            objOrdDisc.SlsPerID = _lstDisc[idxDisc].SlsPerID;
                            objOrdDisc.SOLineRef = _lstDisc[idxDisc].SOLineRef;
                            objOrdDisc.UserOperationLog = _lstDisc[idxDisc].UserOperationLog;
                            objOrdDisc.RefLineRef = _lstDisc[idxDisc].RefLineRef.PassNull();
                            objOrdDisc.GroupRefLineRef = _lstDisc[idxDisc].GroupRefLineRef.PassNull();
                            objOrdDisc.LUpd_DateTime = DateTime.Now;
                            objOrdDisc.LUpd_Prog = "OM20500";
                            objOrdDisc.LUpd_User = Current.UserName;
                            objOrdDisc.tstamp = new byte[1];
                            #endregion
                        }
                        if (_lstOrdDet.Count != _lstOrdDet.Where(x => x.DisplayID != string.Empty).Count())
                        {
                            // Delete old promotion 
                            foreach (var item in lstPDAOrdDisc)
                            {
                                var objDel = _lstDisc.FirstOrDefault(x =>
                                    x.BranchID == item.BranchID
                                    && x.DiscID == item.DiscID
                                    && x.DiscSeq == item.DiscSeq
                                    && x.LineRef == item.LineRef);
                                if (objDel == null)
                                {
                                    db.OM_PDAOrdDisc.DeleteObject(item);
                                }
                            }
                        }
                    }

                    #region -OM_PDASalesOrd-
                    objPDAOrder.PriceClassID = Util.PassNull(_objOrder.PriceClassID);
                    objPDAOrder.DoNotCalDisc = _objOrder.DoNotCalDisc;
                    objPDAOrder.CreditHold = _objOrder.CreditHold;
                    objPDAOrder.IssueMethod = Util.PassNull(_objOrder.IssueMethod);
                    objPDAOrder.BudgetID1 = Util.PassNull(_objOrder.BudgetID1);
                    objPDAOrder.CmmnPct = _objOrder.CmmnPct;
                    objPDAOrder.CustOrderNbr = Util.PassNull(_objOrder.CustOrderNbr);
                    objPDAOrder.FreightAllocAmt = _objOrder.FreightAllocAmt;
                    objPDAOrder.FreightAmt = _objOrder.FreightAmt;
                    objPDAOrder.FreightCost = _objOrder.FreightCost;
                    objPDAOrder.LineAmt = _objOrder.LineAmt;
                    objPDAOrder.LineDiscAmt = _objOrder.LineDiscAmt;
                    objPDAOrder.MiscAmt = _objOrder.MiscAmt;
                    objPDAOrder.OrdDiscAmt = _objOrder.OrdDiscAmt;
                    objPDAOrder.OrdAmt = _objOrder.OrdAmt;
                    objPDAOrder.PmtAmt = _objOrder.PmtAmt;
                    objPDAOrder.PremFreightAmt = _objOrder.PremFreightAmt;
                    objPDAOrder.VolDiscAmt = _objOrder.VolDiscAmt;
                    objPDAOrder.SOFeeTot = _objOrder.SOFeeTot;
                    objPDAOrder.PromiseDate = DateTime.Now.ToDateShort();
                    objPDAOrder.TaxAmtTot00 = 0;
                    objPDAOrder.TxblAmtTot00 = 0;
                    objPDAOrder.TaxAmtTot00 = 0;
                    objPDAOrder.TxblAmtTot00 = 0;
                    objPDAOrder.TaxID00 = "";
                    objPDAOrder.TaxAmtTot01 = 0;
                    objPDAOrder.TxblAmtTot01 = 0;
                    objPDAOrder.TaxAmtTot01 = 0;
                    objPDAOrder.TxblAmtTot01 = 0;
                    objPDAOrder.TaxID01 = "";
                    objPDAOrder.TaxAmtTot02 = 0;
                    objPDAOrder.TxblAmtTot02 = 0;
                    objPDAOrder.TaxAmtTot02 = 0;
                    objPDAOrder.TxblAmtTot02 = 0;
                    objPDAOrder.TaxID02 = "";
                    objPDAOrder.TaxAmtTot03 = 0;
                    objPDAOrder.TxblAmtTot03 = 0;
                    objPDAOrder.TaxAmtTot03 = 0;
                    objPDAOrder.TxblAmtTot03 = 0;
                    objPDAOrder.TaxID03 = "";
                    objPDAOrder.StationID = _objOrder.StationID.PassNull();
                    for (int i = 0; i < _lstTaxDoc.Count; i++)
                    {
                        if (i == 0)
                        {
                            objPDAOrder.TaxAmtTot00 = _lstTaxDoc[i].TaxAmt;
                            objPDAOrder.TxblAmtTot00 = _lstTaxDoc[i].TxblAmt;
                            objPDAOrder.TaxID00 = Util.PassNull(_lstTaxDoc[i].TaxID);
                        }
                        else if (i == 1)
                        {
                            objPDAOrder.TaxAmtTot01 = _lstTaxDoc[i].TaxAmt;
                            objPDAOrder.TxblAmtTot01 = _lstTaxDoc[i].TxblAmt;
                            objPDAOrder.TaxID01 = Util.PassNull(_lstTaxDoc[i].TaxID);
                        }
                        else if (i == 2)
                        {
                            objPDAOrder.TaxAmtTot02 = _lstTaxDoc[i].TaxAmt;
                            objPDAOrder.TxblAmtTot02 = _lstTaxDoc[i].TxblAmt;
                            objPDAOrder.TaxID02 = Util.PassNull(_lstTaxDoc[i].TaxID);
                        }
                        else if (i == 3)
                        {
                            objPDAOrder.TaxAmtTot03 = _lstTaxDoc[i].TaxAmt;
                            objPDAOrder.TxblAmtTot03 = _lstTaxDoc[i].TxblAmt;
                            objPDAOrder.TaxID03 = Util.PassNull(_lstTaxDoc[i].TaxID);
                        }
                    }
                    objPDAOrder.OrdQty = _objOrder.OrdQty;
                    objPDAOrder.UnitsShipped = _objOrder.UnitsShipped;
                    objPDAOrder.OrderWeight = _objOrder.OrderWeight;
                    objPDAOrder.VolDiscPct = _objOrder.VolDiscPct;
                    objPDAOrder.PaymentID = Util.PassNull(_objOrder.PaymentID);
                    objPDAOrder.PmtDate = _objOrder.PmtDate.PassMin();
                    objPDAOrder.PaymentBatNbr = Util.PassNull(_objOrder.PaymentBatNbr);
                    objPDAOrder.PaymentNbr = Util.PassNull(_objOrder.PaymentNbr);
                    objPDAOrder.IssueNumber = _objOrder.IssueNumber;
                    objPDAOrder.OrderNo = _objOrder.OrderNo;
                    objPDAOrder.DeliveryID = Util.PassNull(_objOrder.DeliveryID);
                    //objPDAOrder.Remark = _objOrder.Remark.PassNull();
                    objPDAOrder.RewardID = _objOrder.RewardID;
                    objPDAOrder.RewardAmt = _objOrder.RewardAmt;
                    objPDAOrder.OrdAmtApprove = _objOrder.OrdAmt;
                    objPDAOrder.ManualDiscAmt = _objOrder.ManualDiscAmt;
                    objPDAOrder.ManualDiscPct = _objOrder.ManualDiscPct;
                    objPDAOrder.RefOrderNbr = _objOrder.OrderNbr; 
                    if (_calcPromoOnly == 3)
                    {
                        objPDAOrder.Status = "W";
                        objPDAOrder.OrdQty = objPDAOrder.OrdQty;
                    }
                    
                    #endregion                  
                }
                
                foreach (var item in _lstLot)
                {
                    var objLot = db.OM_PDALotTrans.FirstOrDefault(p => p.BranchID == item.BranchID && p.OrderNbr == objPDAOrder.OrderNbr && p.LotSerNbr == item.LotSerNbr && p.OMLineRef == item.OMLineRef && p.RefOrderNbr == objPDAOrder.RefOrderNbr);
                    if (_calcPromoOnly == 3)
                    {
                        var objItemLot = db.IN_ItemLot.FirstOrDefault(p => p.SiteID == item.SiteID && p.InvtID == item.InvtID && p.LotSerNbr == item.LotSerNbr);//SiteID, InvtID, WhseLoc, LotSerNbr;
                        if (objItemLot != null)
                        {
                            var recordUnit = db.IN_UnitConversion.FirstOrDefault(p =>p.InvtID == item.InvtID && p.FromUnit == item.UnitDesc);
                            if (recordUnit != null)
                            {
                                double oldQty = 0;
                                double qty = 0;
                                double qtyEdit = 0;
                                if (objLot != null)
                                {
                                    oldQty = recordUnit.MultDiv == "M" ? (objLot.Qty * recordUnit.CnvFact) : (objLot.Qty / recordUnit.CnvFact);
                                }
                                qty = recordUnit.MultDiv == "M" ? (item.Qty * recordUnit.CnvFact) : (item.Qty / recordUnit.CnvFact);
                                qtyEdit = qty - oldQty;
                                if ((objItemLot.QtyAvail - objItemLot.QtyAllocPDASO - qtyEdit) < 0)
                                {
                                    throw new MessageException(MessageType.Message, "2020041560", "", new string[] { objPDAOrder.OrderNbr, objItemLot.InvtID, objItemLot.SiteID });
                                }
                                objItemLot.QtyAllocPDASO = objItemLot.QtyAllocPDASO + qtyEdit;
                                objItemLot.LUpd_DateTime = DateTime.Now;
                                objItemLot.LUpd_Prog = _screenNbr;
                                objItemLot.LUpd_User = Current.UserName;

                               
                            }                            
                        }
                    }
                   
                    
                    if (objLot == null)
                    {
                        objLot = new OM_PDALotTrans();
                        objLot.ResetET();
                        objLot.BranchID = item.BranchID;
                        objLot.OrderNbr = objPDAOrder.OrderNbr;
                        objLot.RefOrderNbr = objPDAOrder.RefOrderNbr.PassNull();
                        objLot.LotSerNbr = item.LotSerNbr;
                        objLot.OMLineRef = item.OMLineRef;
                        objLot.Crtd_DateTime = DateTime.Now;
                        objLot.Crtd_User = Current.UserName;
                        objLot.Crtd_Prog = _screenNbr;
                        db.OM_PDALotTrans.AddObject(objLot);
                    }
                    objLot.SiteID = item.SiteID.PassNull();
                    objLot.WhseLoc = item.WhseLoc;
                    objLot.CnvFact = item.CnvFact;
                    objLot.ExpDate = item.ExpDate;
                    objLot.INDocType = item.INDocType;
                    objLot.InvtID = item.InvtID;
                    objLot.InvtMult = item.InvtMult;
                    objLot.MfgrLotSerNbr = item.MfgrLotSerNbr;
                    objLot.Qty = item.Qty;
                    objLot.TranDate = item.TranDate;
                    objLot.UnitDesc = item.UnitDesc;
                    objLot.UnitMultDiv = item.UnitMultDiv;
                    objLot.UnitPrice = item.UnitPrice;
                    objLot.WarrantyDate = item.WarrantyDate;
                   
                    objLot.LUpd_DateTime = DateTime.Now;
                    objLot.LUpd_Prog = _screenNbr;
                    objLot.LUpd_User = Current.UserName;
                }

                //var lstGroup = lstLot.GroupBy(p => new { p.InvtID, p.SiteID }).Select(g => g.First()).ToList();
                //foreach (var item in lstGroup)
                //{
                //    double qty = lstLot.Where(p => p.InvtID == item.InvtID && p.SiteID == item.SiteID).Sum(p => p.Qty);
                //    var objSite = db.IN_ItemSite.FirstOrDefault(p => p.InvtID == item.InvtID && p.SiteID == item.SiteID);
                //    if (objSite != null)
                //    {
                //        objSite.QtyAllocPDASO += qty;
                //        objSite.LUpd_DateTime = DateTime.Now;
                //        objSite.LUpd_Prog = _screenNbr;
                //        objSite.LUpd_User = Current.UserName;
                //    }
                //}

                db.SaveChanges();
            }
        }

        private void SaveDataCalcPromo(int outOfBudget)
        {
            OM10100Entities db = Util.CreateObjectContext<OM10100Entities>(false);
            // Tính lại KM cho đơn PDA khi chưa release sang C
            int id = 1;
            var objPDAOrder = db.OM_PDASalesOrdCalcPromo.Where(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr).OrderByDescending(x => x.ID).FirstOrDefault();
            if (objPDAOrder != null)
            {
                id = objPDAOrder.ID + 1;
            }
            // PDA data
            var lstPDADet = db.OM_PDASalesOrdDet.Where(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr).ToList();
            var lstPDAOrdDisc = db.OM_PDAOrdDisc.Where(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr).ToList();

            if (_lstOrdDet.Count > 0)
            {
                // Insert all promo from Cloud to PDA                     
                for (int idxOrdDet = 0; idxOrdDet < _lstOrdDet.Count; idxOrdDet++)
                {
                    var objPDADetOrig = lstPDADet.FirstOrDefault(x =>
                                x.LineRef == _lstOrdDet[idxOrdDet].LineRef);

                    #region -Update OM_PDASalesOrdDetCalcPromo-
                    var objPDADetCalcPromo = new OM_PDASalesOrdDetCalcPromo();
                    objPDADetCalcPromo.ID = id;
                    objPDADetCalcPromo.BranchID = _lstOrdDet[idxOrdDet].BranchID;
                    objPDADetCalcPromo.OrderNbr = _objOrder.OrigOrderNbr;
                    objPDADetCalcPromo.LineRef = _lstOrdDet[idxOrdDet].LineRef;
                    objPDADetCalcPromo.Qty = _lstOrdDet[idxOrdDet].FreeItem && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DiscCode) && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DisplayID) ? _lstOrdDet[idxOrdDet].LineQty : 0;// _lstOrdDet[idxOrdDet].LineQty; 
                    objPDADetCalcPromo.QtyApprove = 0;
                    objPDADetCalcPromo.QtyERP = 0;
                    objPDADetCalcPromo.QtyShipD = 0;
                    objPDADetCalcPromo.QtyShip = 0;
                    objPDADetCalcPromo.POSMImg = string.Empty;
                    //objPDADet.Cumulative = lstOrderDet[i].
                    objPDADetCalcPromo.Crtd_Prog = "OM20500";
                    objPDADetCalcPromo.Crtd_User = Current.UserName;
                    objPDADetCalcPromo.Crtd_Datetime = DateTime.Now;
                    objPDADetCalcPromo.LineQty = _lstOrdDet[idxOrdDet].LineQty;
                    objPDADetCalcPromo.LineAmt = _lstOrdDet[idxOrdDet].LineAmt;
                    db.OM_PDASalesOrdDetCalcPromo.AddObject(objPDADetCalcPromo);

                    #region -update-

                    objPDADetCalcPromo.BarCode = _lstOrdDet[idxOrdDet].BarCode;
                    objPDADetCalcPromo.BOCustID = _lstOrdDet[idxOrdDet].BOCustID.PassNull();
                    objPDADetCalcPromo.BOType = _lstOrdDet[idxOrdDet].BOType;
                    objPDADetCalcPromo.BudgetID1 = _lstOrdDet[idxOrdDet].BudgetID1.PassNull();
                    objPDADetCalcPromo.BudgetID2 = _lstOrdDet[idxOrdDet].BudgetID2.PassNull();
                    objPDADetCalcPromo.CostID = _lstOrdDet[idxOrdDet].CostID.PassNull();
                    objPDADetCalcPromo.Descr = _lstOrdDet[idxOrdDet].Descr;
                    objPDADetCalcPromo.DiscAmt = _lstOrdDet[idxOrdDet].DiscAmt;
                    objPDADetCalcPromo.DiscAmt1 = _lstOrdDet[idxOrdDet].DiscAmt1;
                    objPDADetCalcPromo.DiscAmt2 = _lstOrdDet[idxOrdDet].DiscAmt2;
                    objPDADetCalcPromo.DiscCode = _lstOrdDet[idxOrdDet].DiscCode.PassNull();
                    objPDADetCalcPromo.DiscID1 = _lstOrdDet[idxOrdDet].DiscID1.PassNull();
                    objPDADetCalcPromo.DiscID2 = _lstOrdDet[idxOrdDet].DiscID2.PassNull();
                    objPDADetCalcPromo.DiscPct = _lstOrdDet[idxOrdDet].DiscPct;
                    objPDADetCalcPromo.DiscPct1 = _lstOrdDet[idxOrdDet].DiscPct1;
                    objPDADetCalcPromo.DiscPct2 = _lstOrdDet[idxOrdDet].DiscPct2;
                    objPDADetCalcPromo.DiscSeq1 = _lstOrdDet[idxOrdDet].DiscSeq1.PassNull();
                    objPDADetCalcPromo.DiscSeq2 = _lstOrdDet[idxOrdDet].DiscSeq2.PassNull();
                    objPDADetCalcPromo.DocDiscAmt = _lstOrdDet[idxOrdDet].DocDiscAmt;
                    objPDADetCalcPromo.FreeItem = _lstOrdDet[idxOrdDet].FreeItem;
                    objPDADetCalcPromo.FreeItemQty1 = _lstOrdDet[idxOrdDet].FreeItemQty1;
                    objPDADetCalcPromo.FreeItemQty2 = _lstOrdDet[idxOrdDet].FreeItemQty2;
                    objPDADetCalcPromo.GroupDiscAmt1 = _lstOrdDet[idxOrdDet].GroupDiscAmt1;
                    objPDADetCalcPromo.GroupDiscAmt2 = _lstOrdDet[idxOrdDet].GroupDiscAmt2;
                    objPDADetCalcPromo.GroupDiscID1 = _lstOrdDet[idxOrdDet].GroupDiscID1.PassNull();
                    objPDADetCalcPromo.GroupDiscID2 = _lstOrdDet[idxOrdDet].GroupDiscID2.PassNull();
                    objPDADetCalcPromo.GroupDiscPct1 = _lstOrdDet[idxOrdDet].GroupDiscPct1;
                    objPDADetCalcPromo.GroupDiscPct2 = _lstOrdDet[idxOrdDet].GroupDiscPct2;
                    objPDADetCalcPromo.GroupDiscSeq1 = _lstOrdDet[idxOrdDet].GroupDiscSeq1.PassNull();
                    objPDADetCalcPromo.GroupDiscSeq2 = _lstOrdDet[idxOrdDet].GroupDiscSeq2.PassNull();
                    objPDADetCalcPromo.InvtID = _lstOrdDet[idxOrdDet].InvtID;
                    objPDADetCalcPromo.ItemPriceClass = _lstOrdDet[idxOrdDet].ItemPriceClass;
                    objPDADetCalcPromo.OrderType = _lstOrdDet[idxOrdDet].OrderType;
                    objPDADetCalcPromo.OrigOrderNbr = _lstOrdDet[idxOrdDet].OrigOrderNbr;
                    objPDADetCalcPromo.QtyBO = _lstOrdDet[idxOrdDet].QtyBO;
                    objPDADetCalcPromo.QtyInvc = _lstOrdDet[idxOrdDet].QtyInvc;
                    objPDADetCalcPromo.QtyOpenShip = _lstOrdDet[idxOrdDet].QtyOpenShip;
                    objPDADetCalcPromo.ShipStatus = _lstOrdDet[idxOrdDet].ShipStatus.PassNull();
                    objPDADetCalcPromo.SiteID = _lstOrdDet[idxOrdDet].SiteID;
                    objPDADetCalcPromo.SlsPrice = _lstOrdDet[idxOrdDet].SlsPrice;
                    objPDADetCalcPromo.SlsUnit = _lstOrdDet[idxOrdDet].SlsUnit;
                    objPDADetCalcPromo.SOFee = _lstOrdDet[idxOrdDet].SOFee;
                    objPDADetCalcPromo.TaxAmt00 = _lstOrdDet[idxOrdDet].TaxAmt00;
                    objPDADetCalcPromo.TaxAmt01 = _lstOrdDet[idxOrdDet].TaxAmt01;
                    objPDADetCalcPromo.TaxAmt02 = _lstOrdDet[idxOrdDet].TaxAmt02;
                    objPDADetCalcPromo.TaxAmt03 = _lstOrdDet[idxOrdDet].TaxAmt03;
                    objPDADetCalcPromo.TaxCat = _lstOrdDet[idxOrdDet].TaxCat;
                    objPDADetCalcPromo.TaxID00 = _lstOrdDet[idxOrdDet].TaxId00;
                    objPDADetCalcPromo.TaxID01 = _lstOrdDet[idxOrdDet].TaxId01.PassNull();
                    objPDADetCalcPromo.TaxID02 = _lstOrdDet[idxOrdDet].TaxId01.PassNull();
                    objPDADetCalcPromo.TaxID03 = _lstOrdDet[idxOrdDet].TaxId03.PassNull();
                    objPDADetCalcPromo.TxblAmt00 = _lstOrdDet[idxOrdDet].TxblAmt00;
                    objPDADetCalcPromo.TxblAmt01 = _lstOrdDet[idxOrdDet].TxblAmt01;
                    objPDADetCalcPromo.TxblAmt02 = _lstOrdDet[idxOrdDet].TxblAmt02;
                    objPDADetCalcPromo.TxblAmt03 = _lstOrdDet[idxOrdDet].TxblAmt03;
                    objPDADetCalcPromo.UnitMultDiv = _lstOrdDet[idxOrdDet].UnitMultDiv;
                    objPDADetCalcPromo.UnitRate = _lstOrdDet[idxOrdDet].UnitRate;
                    objPDADetCalcPromo.UnitWeight = _lstOrdDet[idxOrdDet].UnitWeight;
                    objPDADetCalcPromo.LUpd_Prog = "OM20500";
                    objPDADetCalcPromo.LUpd_User = Current.UserName;
                    objPDADetCalcPromo.LUpd_Datetime = DateTime.Now;
                    objPDADetCalcPromo.tstamp = new byte[1];                    
                    objPDADetCalcPromo.POSM = _lstOrdDet[idxOrdDet].POSM;
                    objPDADetCalcPromo.Mark = _lstOrdDet[idxOrdDet].Mark ?? 0;
                    objPDADetCalcPromo.DisplayID = _lstOrdDet[idxOrdDet].DisplayID.PassNull();
                    objPDADetCalcPromo.DisplayPeriodID = _lstOrdDet[idxOrdDet].DisplayPeriodID.PassNull();
                    objPDADetCalcPromo.ManuDiscAmt = _lstOrdDet[idxOrdDet].ManuDiscAmt;
                    objPDADetCalcPromo.ManuDiscPct = _lstOrdDet[idxOrdDet].ManuDiscPct;
                    #endregion

                    #endregion
                }
            }

            if (_lstDisc.Count > 0)
            {
                // Add new or update promotion
                for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                {
                    #region -Insert or Update OM_PDAOrdDiscCalcPromo-
                    var objDisc = _lstDisc[idxDisc];
                    var objOrdDiscCalcPromo = new OM_PDAOrdDiscCalcPromo();
                    objOrdDiscCalcPromo.ID = id;
                    objOrdDiscCalcPromo.BranchID = _lstDisc[idxDisc].BranchID;
                    objOrdDiscCalcPromo.DiscID = _lstDisc[idxDisc].DiscID;
                    objOrdDiscCalcPromo.DiscSeq = _lstDisc[idxDisc].DiscSeq;
                    objOrdDiscCalcPromo.OrderNbr = _objOrder.OrigOrderNbr;
                    objOrdDiscCalcPromo.LineRef = _lstDisc[idxDisc].LineRef.PassNull();
                    objOrdDiscCalcPromo.Crtd_DateTime = DateTime.Now;
                    objOrdDiscCalcPromo.Crtd_Prog = "OM20500";
                    objOrdDiscCalcPromo.Crtd_User = Current.UserName;
                    objOrdDiscCalcPromo.DiscBreakLineRef = _lstDisc[idxDisc].DiscBreakLineRef;
                    db.OM_PDAOrdDiscCalcPromo.AddObject(objOrdDiscCalcPromo);
                    objOrdDiscCalcPromo.BreakBy = _lstDisc[idxDisc].BreakBy;
                    objOrdDiscCalcPromo.BudgetID = _lstDisc[idxDisc].BudgetID;
                    objOrdDiscCalcPromo.DiscAmt = _lstDisc[idxDisc].DiscAmt;
                    objOrdDiscCalcPromo.DiscFor = _lstDisc[idxDisc].DiscFor;
                    objOrdDiscCalcPromo.DisctblAmt = _lstDisc[idxDisc].DisctblAmt;
                    objOrdDiscCalcPromo.DisctblQty = _lstDisc[idxDisc].DisctblQty;
                    objOrdDiscCalcPromo.DiscType = _lstDisc[idxDisc].DiscType;
                    objOrdDiscCalcPromo.DiscUOM = _lstDisc[idxDisc].DiscUOM;
                    objOrdDiscCalcPromo.FreeItemBudgetID = _lstDisc[idxDisc].FreeItemBudgetID;
                    objOrdDiscCalcPromo.FreeItemID = _lstDisc[idxDisc].FreeItemID;
                    objOrdDiscCalcPromo.FreeItemQty = _lstDisc[idxDisc].FreeItemQty;
                    objOrdDiscCalcPromo.OrigFreeItemQty = _lstDisc[idxDisc].OrigFreeItemQty;
                    objOrdDiscCalcPromo.SlsperID = _lstDisc[idxDisc].SlsPerID;
                    objOrdDiscCalcPromo.SOLineRef = _lstDisc[idxDisc].SOLineRef;
                    objOrdDiscCalcPromo.UserOperationLog = _lstDisc[idxDisc].UserOperationLog;
                    objOrdDiscCalcPromo.RefLineRef = _lstDisc[idxDisc].RefLineRef.PassNull();
                    objOrdDiscCalcPromo.GroupRefLineRef = _lstDisc[idxDisc].GroupRefLineRef.PassNull();
                    objOrdDiscCalcPromo.LUpd_DateTime = DateTime.Now;
                    objOrdDiscCalcPromo.LUpd_Prog = "OM20500";
                    objOrdDiscCalcPromo.LUpd_User = Current.UserName;
                    objOrdDiscCalcPromo.tstamp = new byte[1];
                    #endregion

                }
            }


            #region -OM_PDASalesOrdCalcPromo-
            var objOrderOrig = db.OM_PDASalesOrd.FirstOrDefault(x => x.BranchID == _objOrder.BranchID && x.OrderNbr == _objOrder.OrigOrderNbr);
            if (objOrderOrig == null)
            {
                objOrderOrig = new OM_PDASalesOrd();
            }
            objPDAOrder = new OM_PDASalesOrdCalcPromo();
            db.OM_PDASalesOrdCalcPromo.AddObject(objPDAOrder);
            objPDAOrder.OrderNbr = _objOrder.OrigOrderNbr;
            objPDAOrder.BranchID = _objOrder.BranchID;
            objPDAOrder.ID = id;
            objPDAOrder.ARDocDate = objOrderOrig.ARDocDate.PassMin();
            objPDAOrder.BillToID = objOrderOrig.BillToID.PassNull();
            objPDAOrder.PriceClassID = Util.PassNull(_objOrder.PriceClassID);
            objPDAOrder.DoNotCalDisc = _objOrder.DoNotCalDisc;
            objPDAOrder.CreditHold = _objOrder.CreditHold;
            objPDAOrder.IssueMethod = Util.PassNull(_objOrder.IssueMethod);
            objPDAOrder.OrigOrderNbr = Util.PassNull(objOrderOrig.OrigOrderNbr);
            objPDAOrder.ReasonCode = Util.PassNull(objOrderOrig.ReasonCode);
            objPDAOrder.ARDocDate = objOrderOrig.ARDocDate;
            objPDAOrder.ARRefNbr = Util.PassNull(objOrderOrig.ARRefNbr);
            objPDAOrder.InvcNbr = Util.PassNull(objOrderOrig.InvcNbr);
            objPDAOrder.InvcNote = Util.PassNull(objOrderOrig.InvcNote);
            objPDAOrder.BudgetID1 = Util.PassNull(_objOrder.BudgetID1);
            objPDAOrder.CmmnPct = _objOrder.CmmnPct;
            objPDAOrder.CustOrderNbr = Util.PassNull(_objOrder.CustOrderNbr);
            objPDAOrder.FreightAllocAmt = _objOrder.FreightAllocAmt;
            objPDAOrder.FreightAmt = _objOrder.FreightAmt;
            objPDAOrder.FreightCost = _objOrder.FreightCost;
            objPDAOrder.LineAmt = _objOrder.LineAmt;
            objPDAOrder.LineDiscAmt = _objOrder.LineDiscAmt;
            objPDAOrder.MiscAmt = _objOrder.MiscAmt;
            objPDAOrder.OrdDiscAmt = _objOrder.OrdDiscAmt;
            objPDAOrder.OrdAmt = _objOrder.OrdAmt;
            objPDAOrder.PmtAmt = _objOrder.PmtAmt;
            objPDAOrder.PremFreightAmt = _objOrder.PremFreightAmt;
            objPDAOrder.VolDiscAmt = _objOrder.VolDiscAmt;
            objPDAOrder.SOFeeTot = _objOrder.SOFeeTot;
            objPDAOrder.PromiseDate = DateTime.Now.ToDateShort();
            objPDAOrder.TaxAmtTot00 = 0;
            objPDAOrder.TxblAmtTot00 = 0;
            objPDAOrder.TaxAmtTot00 = 0;
            objPDAOrder.TxblAmtTot00 = 0;
            objPDAOrder.TaxID00 = "";
            objPDAOrder.TaxAmtTot01 = 0;
            objPDAOrder.TxblAmtTot01 = 0;
            objPDAOrder.TaxAmtTot01 = 0;
            objPDAOrder.TxblAmtTot01 = 0;
            objPDAOrder.TaxID01 = "";
            objPDAOrder.TaxAmtTot02 = 0;
            objPDAOrder.TxblAmtTot02 = 0;
            objPDAOrder.TaxAmtTot02 = 0;
            objPDAOrder.TxblAmtTot02 = 0;
            objPDAOrder.TaxID02 = "";
            objPDAOrder.TaxAmtTot03 = 0;
            objPDAOrder.TxblAmtTot03 = 0;
            objPDAOrder.TaxAmtTot03 = 0;
            objPDAOrder.TxblAmtTot03 = 0;
            objPDAOrder.TaxID03 = "";
            objPDAOrder.StationID = _objOrder.StationID.PassNull();
            for (int i = 0; i < _lstTaxDoc.Count; i++)
            {
                if (i == 0)
                {
                    objPDAOrder.TaxAmtTot00 = _lstTaxDoc[i].TaxAmt;
                    objPDAOrder.TxblAmtTot00 = _lstTaxDoc[i].TxblAmt;
                    objPDAOrder.TaxID00 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
                else if (i == 1)
                {
                    objPDAOrder.TaxAmtTot01 = _lstTaxDoc[i].TaxAmt;
                    objPDAOrder.TxblAmtTot01 = _lstTaxDoc[i].TxblAmt;
                    objPDAOrder.TaxID01 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
                else if (i == 2)
                {
                    objPDAOrder.TaxAmtTot02 = _lstTaxDoc[i].TaxAmt;
                    objPDAOrder.TxblAmtTot02 = _lstTaxDoc[i].TxblAmt;
                    objPDAOrder.TaxID02 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
                else if (i == 3)
                {
                    objPDAOrder.TaxAmtTot03 = _lstTaxDoc[i].TaxAmt;
                    objPDAOrder.TxblAmtTot03 = _lstTaxDoc[i].TxblAmt;
                    objPDAOrder.TaxID03 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
            }

            objPDAOrder.CustID = Util.PassNull(objOrderOrig.CustID);
            objPDAOrder.ExpiryDate = objOrderOrig.ExpiryDate;
            objPDAOrder.OrderDate = objOrderOrig.OrderDate;
            objPDAOrder.OrderType = Util.PassNull(objOrderOrig.OrderType);
            objPDAOrder.OrdQty = _objOrder.OrdQty;
            objPDAOrder.ShipPriority = Util.PassNull(objOrderOrig.ShipPriority);
            objPDAOrder.ShipViaId = Util.PassNull(objOrderOrig.ShipViaId);
            objPDAOrder.ShipDate = objOrderOrig.ShipDate.PassMin();
            objPDAOrder.SlsPerID = Util.PassNull(objOrderOrig.SlsPerID);
            objPDAOrder.Status = Util.PassNull(objOrderOrig.Status);
            objPDAOrder.Terms = Util.PassNull(objOrderOrig.Terms);
            objPDAOrder.ToSiteID = Util.PassNull(objOrderOrig.ToSiteID);
            objPDAOrder.UnitsShipped = _objOrder.UnitsShipped;
            objPDAOrder.OrderWeight = _objOrder.OrderWeight;
            objPDAOrder.VolDiscPct = _objOrder.VolDiscPct;
            objPDAOrder.PaymentID = Util.PassNull(_objOrder.PaymentID);
            objPDAOrder.PmtDate = _objOrder.PmtDate.PassMin();
            objPDAOrder.PaymentBatNbr = Util.PassNull(_objOrder.PaymentBatNbr);
            objPDAOrder.PaymentNbr = Util.PassNull(_objOrder.PaymentNbr);
            objPDAOrder.IssueNumber = _objOrder.IssueNumber;
            objPDAOrder.OrderNo = _objOrder.OrderNo;
            objPDAOrder.DeliveryID = Util.PassNull(_objOrder.DeliveryID);
            objPDAOrder.Remark = objOrderOrig.Remark.PassNull();
            objPDAOrder.RewardID = _objOrder.RewardID;
            objPDAOrder.RewardAmt = _objOrder.RewardAmt;
            objPDAOrder.OrdAmtApprove = _objOrder.OrdAmt;
            objPDAOrder.LUpd_DateTime = DateTime.Now;
            objPDAOrder.LUpd_Prog = "OM20500";
            objPDAOrder.LUpd_User = Current.UserName;
            objPDAOrder.Crtd_DateTime = DateTime.Now;
            objPDAOrder.Crtd_Prog = "OM20500";
            objPDAOrder.Crtd_User = Current.UserName;
            objPDAOrder.ImpExp = objOrderOrig.ImpExp;
            objPDAOrder.FreightTermsID = objOrderOrig.FreightTermsID;
            objPDAOrder.INBatNbr = objOrderOrig.INBatNbr;
            objPDAOrder.INRefNbr = objOrderOrig.INRefNbr;
            objPDAOrder.InsertFrom = objOrderOrig.InsertFrom;
            objPDAOrder.OrigBranchID = objOrderOrig.BranchID;
            objPDAOrder.OrigPDAOrderNbr = objOrderOrig.OrigPDAOrderNbr;
            objPDAOrder.PONbr = objOrderOrig.PONbr;
            objPDAOrder.RemarkKM = objOrderOrig.RemarkKM;
            objPDAOrder.SalesID = objOrderOrig.SalesID;
            objPDAOrder.ShiftID = objOrderOrig.ShiftID;
            objPDAOrder.ApprovalDate = objOrderOrig.ApprovalDate;
            objPDAOrder.ARBatNbr = objOrderOrig.ARBatNbr;
            objPDAOrder.SyncDate = objOrderOrig.SyncDate.PassMin();
            objPDAOrder.DeliveryUnit = objOrderOrig.DeliveryUnit;
            objPDAOrder.OutOfStockBudget = outOfBudget;
            objPDAOrder.ManualDiscAmt = _objOrder.ManualDiscAmt;
            objPDAOrder.ManualDiscPct = _objOrder.ManualDiscPct;
            objPDAOrder.DeliveryID = objOrderOrig.DeliveryID;
            objPDAOrder.ClassID = objOrderOrig.ClassID;
            objPDAOrder.BudgetID2 = objOrderOrig.BudgetID2;
            objPDAOrder.CreditMgrID = objOrderOrig.CreditMgrID;
            objPDAOrder.CustomerPurchase = objOrderOrig.CustomerPurchase;
            objPDAOrder.IsAddStock = objOrderOrig.IsAddStock;
            objPDAOrder.ToWhseLoc = objOrderOrig.ToWhseLoc;
            #endregion
            db.SaveChanges();
        }
        private OM10100_pdInventoryByID_Result GetInventory(string invtID)
        {
            var objInvt = _app.OM10100_pdInventoryByID(invtID, _objOrder.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (objInvt == null)
            {
                objInvt = new OM10100_pdInventoryByID_Result();
            }
            return objInvt;
        }
        private bool IsStkItem(string invtID)
        {
            var objInvt = _app.OM10100_pdInventoryByID(invtID, _objOrder.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            return (objInvt != null && objInvt.StkItem == (short)1);
        }

        private string GetMess(int code, string[] parm)
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
        private string GetMessError()
        {
            string mess = string.Empty;// 
            if (_messBudget.Length > 0)
            {
                var msgBudget = _messBudget.Split(',');
                mess = GetMess(2017032201, new string[] {  string.Join(",", msgBudget.Distinct()) });
            }
            if (_messSite.Length > 0)
            {
                var messSite = _messSite.Split(',');
                mess += "<br />" + GetMess(20171002, new string[] { string.Join(",", messSite.Distinct()) });
            } if (_messMinPrice.Count > 0)
            {
                mess += "<br />" + GetMess(2018070901, new string[] { string.Join(", ", _messMinPrice) });
            }
            return mess;
        }

        // -Check Close date-
        private void CheckCloseDate(string from, string to, bool pdaOrder)
        {
            string fromStatus = from, toStatus = to;
            if (string.IsNullOrWhiteSpace(from))
            {
                fromStatus = "N";
            }
            if (string.IsNullOrWhiteSpace(to) || to == "L")
            {
                to = "N";
            }
            else if (to == "R" || pdaOrder)
            {
                to = "C";
            }
            var objCheck = _app.OM10100_ppCheckCloseDate(_objOrder.BranchID, _objOrder.OrderDate, _objOrder.OrderNbr, fromStatus, toStatus, Current.UserName, Current.CpnyID, Current.LangID, _objOrder.SlsPerID).FirstOrDefault();
            if (objCheck.PassNull() != "1")
            {
                throw new MessageException(MessageType.Message, "301");
            }
        }

        private OM_PPAlloc GetAlloc(string objID, string budgetID, string freeItemID)
        {
            var objAlloc = _lstAlloc.FirstOrDefault(p => p.CpnyID == _objUser.BranchRouteID && p.BudgetID == budgetID && p.FreeItemID == freeItemID && p.ObjID == objID);
            if (objAlloc == null)
            {
                objAlloc = _app.OM_PPAlloc.FirstOrDefault(p => p.CpnyID == _objUser.BranchRouteID && p.BudgetID == budgetID && p.FreeItemID == freeItemID && p.ObjID == objID);
                if (objAlloc != null)
                {
                    _lstAlloc.Add(objAlloc);
                }
            }
            return objAlloc;
        }
        private OM_PPCpny GetCpnyID(string branchRouteID, string budgetID, string freeItemID)
        {
            var objCpnyID = _lstCpnyID.FirstOrDefault(p => p.CpnyID == branchRouteID && p.BudgetID == budgetID && p.FreeItemID == freeItemID);
            if (objCpnyID == null)
            {
                objCpnyID = _app.OM_PPCpny.FirstOrDefault(p => p.CpnyID == branchRouteID && p.BudgetID == budgetID && p.FreeItemID == freeItemID);
                if (objCpnyID != null)
                {
                    _lstCpnyID.Add(objCpnyID);
                }
            }
            return objCpnyID;
        }
        #endregion
    }
}