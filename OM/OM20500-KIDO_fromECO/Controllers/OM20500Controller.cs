using System.Web.Mvc;
using Ext.Net;
using Ext.Net.MVC;
using HQ.eSkyFramework;
using HQ.eSkySys;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System;
using System.Data.Metadata.Edm;
using System.Security.Cryptography;
using System.Text;
using PartialViewResult = System.Web.Mvc.PartialViewResult;
using System.IO;
using OMProcess;
using HQFramework.DAL;
using System.Data;
using OM10100;
using Newtonsoft.Json;
using System.Web.Script.Serialization;
using System.Reflection;
using System.Web;
using Aspose.Cells;
using System.Globalization;

namespace OM20500.Controllers
{
    static class Extensions
    {
        public static IList<T> Clone<T>(this IList<T> listToClone) where T : ICloneable
        {
            return listToClone.Select(item => (T)item.Clone()).ToList();
        }
    }
    public class clsOM_PPAlloc
    {
        public double QtyAmtAvail { get; set; }
        public double QtyAmtSpent { get; set; }
        public clsOM_PPAlloc() { }
        public clsOM_PPAlloc(double qtyAvail, double qtySpent)
        {
            QtyAmtAvail = qtyAvail;
            QtyAmtSpent = qtySpent;
        }
    }

    [DirectController]
    [CustomAuthorize]
    [CheckSessionOut]
    public class OM20500Controller : Controller
    {
        private string _screenNbr = "OM20500";
        OM20500Entities _db = Util.CreateObjectContext<OM20500Entities>(false);
        eSkySysEntities _sys = Util.CreateObjectContext<eSkySysEntities>(true);
        Dictionary<string, clsOM_PPAlloc> _lstBudget = new Dictionary<string, clsOM_PPAlloc>();
        Dictionary<string, double> _lstItemSite = new Dictionary<string, double>();
        List<OM_PDASalesOrdDet> _lstPDADet = new List<OM_PDASalesOrdDet>();
        List<OM_PDAOrdDisc> _lstPDAOrdDisc = new List<OM_PDAOrdDisc>();
        OM_PDASalesOrd _objOrd = new OM_PDASalesOrd();
        private List<OM_PDASalesOrd> _lstOrderImp = new List<OM_PDASalesOrd>();
        private List<OM_PDASalesOrdDet> _lstOrderDetImp = new List<OM_PDASalesOrdDet>();
        private List<OM_PDAOrdManualDisc> _lstOrderManualImp = new List<OM_PDAOrdManualDisc>();
        private OM_Setup _objOM;
        private IN_Setup _objIN;
        private OM20500_pdLoadUserDefault_Result _objUser;
        private OM_OrderType _objType;
        private JsonResult _logMessage;
        public bool isPrice = false;
        public double _sumAmoutManual = 0;
        // GET: /OM20500/
        public ActionResult Index()
        {
            LicenseHelper.ModifyInMemory.ActivateMemoryPatching();

            Util.InitRight(_screenNbr);
            return View();
        }
        //[OutputCache(Duration = 1000000, VaryByParam = "lang")]
        public PartialViewResult Body(string lang)
        {
            return PartialView();
        }

        #region -Get Data-
        public ActionResult GetOrder(string branchID,
            string slsperID, string custID, string status,
            DateTime startDate, DateTime endDate, string remark, DateTime? startTime, DateTime? endTime, string channel, string dateFilterBy,
            string territory, string state, string district,
            int start = 0, int limit = int.MaxValue, int page = 1)
        {
            _db.CommandTimeout = int.MaxValue;
            if (startTime != null)
            {
                startDate = startDate.AddHours(startTime.Value.Hour).AddMinutes(startTime.Value.Minute);
            }
            if (endTime != null)
            {
                endDate = endDate.AddHours(endTime.Value.Hour).AddMinutes(endTime.Value.Minute);
            }
            var orders = _db.OM20500_pgOrder(Current.UserName, Current.CpnyID, Current.LangID,
                branchID, slsperID, custID, status, startDate, endDate, remark, channel, dateFilterBy, territory, state, district).ToList();

            var orderNbrs = string.Empty;
            foreach (var item in orders)
            {
                orderNbrs += item.OrderNbr + ",";
            }
            var lstDet = new List<OM20500_pdDet4CheckStock_Result>();
            if (orderNbrs != string.Empty)
            {
                lstDet = _db.OM20500_pdDet4CheckStock(Current.UserName, Current.CpnyID, Current.LangID, branchID, orderNbrs).ToList();
            }
            var lstAllInvtSite = new List<OM20500_pdGetSiteBySiteType_Result>();
            string key = string.Empty;
            Dictionary<string, double> lstItemSite = new Dictionary<string, double>();
            double dfSOUnit = 0;
            double stkUnit = 0;
            foreach (var item in orders)
            {
                dfSOUnit = 0;
                stkUnit = 0;
                var lstSel = lstDet.Where(x => x.OrderNbr == item.OrderNbr).ToList();
                foreach (var it in lstSel)
                {
                    #region -SUM Qty-
                    double cnvFact = 1;
                    string multDiv = "M";
                    if (it.SlsUnit == it.DfltSOUnit)
                    {
                        if (it.UnitRate > 1)
                        {
                            dfSOUnit += it.LineQty;
                        }
                        else
                        {
                            stkUnit += it.LineQty;
                        }
                    }
                    else
                    {
                        var unit = SetUOM(it.InvtID, it.ClassID, it.SlsUnit, it.DfltSOUnit);
                        if (unit != null && unit.CnvFact != 0)
                        {
                            cnvFact = unit.CnvFact;
                            multDiv = unit.MultDiv;
                        }
                        dfSOUnit += it.LineQty >= cnvFact ? (multDiv == "M" ? (it.LineQty / cnvFact).ToInt() : (it.LineQty * cnvFact)) : 0.0;
                        stkUnit += it.LineQty >= cnvFact ? it.LineQty % cnvFact : it.LineQty;
                    }
                    #endregion
                    #region -Check stock-
                    if (item.Status == "H" || item.Status == "O" || item.Status == "W")
                    {
                        key = it.InvtID + it.SiteID;
                        if (lstItemSite.ContainsKey(key) == false)
                        {
                            var objSite = _db.IN_ItemSite.FirstOrDefault(x => x.InvtID == it.InvtID && x.SiteID == it.SiteID);
                            lstItemSite.Add(key, objSite == null ? 0 : objSite.QtyAvail);
                        }
                        var qty = item.EditColumn.Split(',').Length > 0 && item.EditColumn.Split(',')[0] == "Qty" ? it.Qty : it.QtyShip;
                        qty = it.UnitMultDiv == "M" ? qty * it.UnitRate : qty / it.UnitRate;
                        if (lstItemSite[key] < qty)
                        {
                            item.OutOfStockLineRef += it.LineRef + ",";
                        }
                        lstItemSite[key] -= qty;
                    }
                    #endregion
                    //#region -Check stock-
                    //if (item.Status == "H" || item.Status == "O" || item.Status == "W")
                    //{
                    //    if (!lstAllInvtSite.Any(x => x.InvtID == it.InvtID && x.SiteType == it.SiteID))
                    //    {
                    //        var lstSiteNew = _db.OM20500_pdGetSiteBySiteType(it.SiteID, branchID, it.InvtID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                    //        lstAllInvtSite.AddRange(lstSiteNew);
                    //    }
                    //    var qty = item.EditColumn.Split(',').Length > 0 && item.EditColumn.Split(',')[0] == "Qty" ? it.Qty : it.QtyShip;
                    //    qty = it.UnitMultDiv == "M" ? qty * it.UnitRate : qty / it.UnitRate;
                    //    bool isOutOffStock = true;
                    //    foreach (var site in lstAllInvtSite)
                    //    {
                    //        if (site.InvtID == it.InvtID && site.SiteType == it.SiteID && site.QtyAvail >= qty)
                    //        {
                    //            site.QtyAvail = site.QtyAvail - qty;
                    //            isOutOffStock = false;
                    //        }
                    //    }
                    //    if (isOutOffStock)
                    //    {
                    //        item.OutOfStockLineRef += it.LineRef + ",";
                    //    }
                    //}
                    //#endregion
                }
                item.OrdQty1 = dfSOUnit;
                item.OrdQty2 = stkUnit;
                item.OutOfStockLineRef = item.OutOfStockLineRef.TrimEnd(',');
            }
            return this.Store(orders);
        }
        public ActionResult GetDet(string branchID, string orderNbr, int start = 0, int limit = int.MaxValue, int page = 1)
        {
            _db.CommandTimeout = int.MaxValue;
            var dets = _db.OM20500_pgDet(Current.UserName, Current.CpnyID, Current.LangID, branchID, orderNbr).ToList();

            foreach (var it in dets)
            {
                double cnvFact = 1;
                string multDiv = "M";
                if (it.SlsUnit == it.DfltSOUnit)
                {
                    if (it.UnitRate1 > 1)
                    {
                        it.LineQty2 = 0.0;
                        it.LineQty1 = it.LineQty;
                        it.Qty2 = 0.0;
                        it.Qty1 = it.Qty;
                        it.QtyERP2 = 0.0;
                        it.QtyERP1 = it.QtyERP;
                        it.QtyShip2 = 0.0;
                        it.QtyShip1 = it.QtyShip;
                        it.QtyShipD2 = 0.0;
                        it.QtyShipD1 = it.QtyShipD;
                        it.QtyShipped2 = 0.0;
                        it.QtyShipped1 = it.QtyShipped;
                    }
                    else
                    {
                        it.LineQty1 = 0.0;
                        it.LineQty2 = it.LineQty;
                        it.Qty1 = 0.0;
                        it.Qty2 = it.Qty;
                        it.QtyERP1 = 0.0;
                        it.QtyERP2 = it.QtyERP;
                        it.QtyShip1 = 0.0;
                        it.QtyShip2 = it.QtyShip;
                        it.QtyShipD1 = 0.0;
                        it.QtyShipD2 = it.QtyShipD;
                        it.QtyShipped1 = 0.0;
                        it.QtyShipped2 = it.QtyShipped;
                    }
                }
                else
                {
                    var unit = SetUOM(it.InvtID, it.ClassID, it.SlsUnit, it.DfltSOUnit);
                    if (unit != null && unit.CnvFact != 0)
                    {
                        cnvFact = unit.CnvFact;
                        multDiv = unit.MultDiv;
                    }

                    it.LineQty1 = it.LineQty >= cnvFact ? (multDiv == "M" ? (it.LineQty / cnvFact).ToInt() : (it.LineQty * cnvFact)) : 0.0;
                    it.LineQty2 = it.LineQty >= cnvFact ? it.LineQty % cnvFact : it.LineQty;

                    it.Qty1 = it.Qty >= cnvFact ? (it.Qty / cnvFact).ToInt() : 0.0;
                    it.Qty2 = it.Qty >= cnvFact ? it.Qty % cnvFact : it.Qty;

                    it.QtyERP1 = it.QtyERP >= cnvFact ? (it.QtyERP / cnvFact).ToInt() : 0.0;
                    it.QtyERP2 = it.QtyERP >= cnvFact ? it.QtyERP % cnvFact : it.QtyERP;

                    it.QtyShip1 = it.QtyShip >= cnvFact ? (it.QtyShip / cnvFact).ToInt() : 0.0;
                    it.QtyShip2 = it.QtyShip >= cnvFact ? it.QtyShip % cnvFact : it.QtyShip;

                    it.QtyShipD1 = it.QtyShipD >= cnvFact ? (it.QtyShipD / cnvFact).ToInt() : 0.0;
                    it.QtyShipD2 = it.QtyShipD >= cnvFact ? it.QtyShipD % cnvFact : it.QtyShipD;

                    it.QtyShipped1 = it.QtyShipped >= cnvFact ? (it.QtyShipped / cnvFact).ToInt() : 0.0;
                    it.QtyShipped2 = it.QtyShipped >= cnvFact ? it.QtyShipped % cnvFact : it.QtyShipped;
                }
                it.UnitMultDiv1 = multDiv;
                it.UnitRate1 = cnvFact;
            }
            return this.Store(dets);
        }

        public ActionResult GetDoc(string branchID,
           string slsperID, string custID, string status,
           DateTime? startDate, DateTime? endDate)
        {
            var docs = _db.OM20500_pgDoc(Current.UserName, Current.CpnyID, Current.LangID, branchID, slsperID, custID, status, startDate, endDate).ToList();
            return this.Store(docs);
        }

        public ActionResult GetHisOrd(string branchID, string orderNbr)
        {
            var hisOrders = _db.OM20500_pgHistoryOrd(branchID, orderNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            var orderNbrs = string.Empty;
            foreach (var item in hisOrders)
            {
                orderNbrs += item.OrderNbr + ",";
            }
            var lstDet = _db.OM20500_pgHisDet4CalcHeader(branchID, orderNbrs, Current.UserName, Current.CpnyID, Current.LangID).ToList();

            double dfSOUnit = 0;
            double stkUnit = 0;
            foreach (var item in hisOrders)
            {
                dfSOUnit = 0;
                stkUnit = 0;
                var lstSel = lstDet.Where(x => x.OrderNbr == item.OrderNbr).ToList();
                foreach (var it in lstSel)
                {
                    #region -SUM Qty-
                    double cnvFact = 1;
                    string multDiv = "M";
                    if (it.SlsUnit == it.DfltSOUnit)
                    {
                        if (it.UnitRate1 > 1)
                        {
                            dfSOUnit += it.LineQty;
                        }
                        else
                        {
                            stkUnit += it.LineQty;
                        }
                    }
                    else
                    {
                        var unit = SetUOM(it.InvtID, it.ClassID, it.SlsUnit, it.DfltSOUnit);
                        if (unit != null && unit.CnvFact != 0)
                        {
                            cnvFact = unit.CnvFact;
                            multDiv = unit.MultDiv;
                        }
                        dfSOUnit += it.LineQty >= cnvFact ? (multDiv == "M" ? (it.LineQty / cnvFact).ToInt() : (it.LineQty * cnvFact)) : 0.0;
                        stkUnit += it.LineQty >= cnvFact ? it.LineQty % cnvFact : it.LineQty;
                    }
                    #endregion
                }
                item.OrdQty1 = dfSOUnit;
                item.OrdQty2 = stkUnit;
            }
            return this.Store(hisOrders);
        }
        public ActionResult GetHisDet(string branchID, string orderNbr)
        {
            var hisDets = _db.OM20500_pgHisDet(branchID, orderNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();

            foreach (var it in hisDets)
            {
                double cnvFact = 1;
                string multDiv = "M";
                if (it.SlsUnit == it.DfltSOUnit)
                {
                    if (it.UnitRate1 > 1)
                    {
                        it.LineQty1 = it.LineQty;
                        it.LineQty2 = 0.0;
                    }
                    else
                    {
                        it.LineQty1 = 0.0;
                        it.LineQty2 = it.LineQty;
                    }
                }
                else
                {
                    var unit = SetUOM(it.InvtID, it.ClassID, it.SlsUnit, it.DfltSOUnit);
                    if (unit != null && unit.CnvFact != 0)
                    {
                        cnvFact = unit.CnvFact;
                        multDiv = unit.MultDiv;
                    }

                    it.LineQty1 = it.LineQty >= cnvFact ? (multDiv == "M" ? (it.LineQty / cnvFact).ToInt() : (it.LineQty * cnvFact)) : 0.0;
                    it.LineQty2 = it.LineQty >= cnvFact ? it.LineQty % cnvFact : it.LineQty;
                }
                it.UnitMultDiv1 = multDiv;
                it.UnitRate1 = cnvFact;
            }
            return this.Store(hisDets);
        }

        public ActionResult GetHisOrdCalcPromo(string branchID, string orderNbr)
        {
            var hisOrders = _db.OM20500_pgHistoryOrdCalcPromo(branchID, orderNbr, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            var orderNbrs = string.Empty;
            foreach (var item in hisOrders)
            {
                orderNbrs += item.OrderNbr + ",";
            }
            var lstDet = _db.OM20500_pgHisDetCalcPromoHeader(branchID, orderNbrs, 0, Current.UserName, Current.CpnyID, Current.LangID).ToList();

            double dfSOUnit = 0;
            double stkUnit = 0;
            foreach (var item in hisOrders)
            {
                dfSOUnit = 0;
                stkUnit = 0;
                var lstSel = lstDet.Where(x => x.OrderNbr == item.OrderNbr && x.ID == item.ID).ToList();
                foreach (var it in lstSel)
                {
                    #region -SUM Qty-
                    double cnvFact = 1;
                    string multDiv = "M";
                    if (it.SlsUnit == it.DfltSOUnit)
                    {
                        if (it.UnitRate1 > 1)
                        {
                            dfSOUnit += it.LineQty;
                        }
                        else
                        {
                            stkUnit += it.LineQty;
                        }
                    }
                    else
                    {
                        var unit = SetUOM(it.InvtID, it.ClassID, it.SlsUnit, it.DfltSOUnit);
                        if (unit != null && unit.CnvFact != 0)
                        {
                            cnvFact = unit.CnvFact;
                            multDiv = unit.MultDiv;
                        }
                        dfSOUnit += it.LineQty >= cnvFact ? (multDiv == "M" ? (it.LineQty / cnvFact).ToInt() : (it.LineQty * cnvFact)) : 0.0;
                        stkUnit += it.LineQty >= cnvFact ? it.LineQty % cnvFact : it.LineQty;
                    }
                    #endregion
                }
                item.OrdQty1 = dfSOUnit;
                item.OrdQty2 = stkUnit;
            }
            return this.Store(hisOrders);
        }

        public ActionResult GetHisDetCalcPromo(string branchID, string orderNbr, int id)
        {
            var hisDets = _db.OM20500_pgHisDetCalcPromo(branchID, orderNbr, id, Current.UserName, Current.CpnyID, Current.LangID).ToList();

            foreach (var it in hisDets)
            {
                double cnvFact = 1;
                string multDiv = "M";
                if (it.SlsUnit == it.DfltSOUnit)
                {
                    if (it.UnitRate1 > 1)
                    {
                        it.LineQty1 = it.LineQty;
                        it.LineQty2 = 0.0;
                    }
                    else
                    {
                        it.LineQty1 = 0.0;
                        it.LineQty2 = it.LineQty;
                    }
                }
                else
                {
                    var unit = SetUOM(it.InvtID, it.ClassID, it.SlsUnit, it.DfltSOUnit);
                    if (unit != null && unit.CnvFact != 0)
                    {
                        cnvFact = unit.CnvFact;
                        multDiv = unit.MultDiv;
                    }

                    it.LineQty1 = it.LineQty >= cnvFact ? (multDiv == "M" ? (it.LineQty / cnvFact).ToInt() : (it.LineQty * cnvFact)) : 0.0;
                    it.LineQty2 = it.LineQty >= cnvFact ? it.LineQty % cnvFact : it.LineQty;
                }
                it.UnitMultDiv1 = multDiv;
                it.UnitRate1 = cnvFact;
            }
            return this.Store(hisDets);
        }
        public ActionResult GetItemSite(string invtID, string siteID)
        {
            var objSite = _db.IN_ItemSite.FirstOrDefault(p => p.InvtID == invtID && p.SiteID == siteID);
            return this.Store(objSite);
        }

        public ActionResult GetImage(string branchID, string orderNbr, string custID, string slsperID, string imgType, int width = 0, int height = 0)
        {
            var imgs = _db.OM20500_pgViewImage(branchID, orderNbr, custID, slsperID, imgType, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            for (int i = 0; i < imgs.Count; i++)
            {
                try
                {
                    imgs[i].ImageSrc = string.Format("<img src=" + "\"" + imgs[i].ImageName + "\" width= \"" + width + "\"" + "height=\"" + height + "\" />");
                }
                catch
                {
                    imgs[i].ImageSrc = "";
                }
            }
            return this.Store(imgs);
        }
        public ActionResult GetSalesPerson(string branchID, string territory)
        {
            var hisOrders = _db.OM20500_pgSalesPerson(Current.UserName, Current.CpnyID, Current.LangID, branchID, territory).ToList();
            return this.Store(hisOrders);
        }
        public ActionResult GetManualPromo(string branchID, string slsperID, string custID, DateTime? orderDate, float totalAmt, string orderNbr)
        {
            var data = _db.OM20500_pgManualPromo(Current.CpnyID, Current.UserName, Current.LangID, branchID, slsperID, custID, orderDate, totalAmt, orderNbr).ToList();
            return this.Store(data);
        }
        #endregion
        // DataProcess
        [HttpPost]
        public ActionResult Save(FormCollection data, bool calcPromoOnly, bool confirmed, int calcID, bool isAllManualPromoOrDisplay, int budgetStatus, bool isApproveAll, bool qtyChange = false)
        {
            DataAccess dal = Util.Dal();
            try
            {
                #region -Head-
                var detHeader = new StoreDataHandler(data["lstOrder"]);
                var objHeader = detHeader.ObjectData<OM20500_pgOrder_Result>().Where(p => p.Selected == true).FirstOrDefault();
                var detHandler = new StoreDataHandler(data["lstDet"]);
                var messMinPrice = string.Empty;
                var branchID = objHeader.BranchID;
                var docHandler = new StoreDataHandler(data["lstDoc"]);
                var lstDoc = docHandler.ObjectData<OM20500_pgDoc_Result>().Where(x => x.DocBranchID == branchID).ToList();
                var choiceHandler = new StoreDataHandler(data["lstChoice"]);
                var lstChoice = choiceHandler.ObjectData<OM10100.Controllers.OM10100Controller.DiscountChoice>().ToList();
                var objBranchDelivery = _db.OM20500_pdBranchDelivery(Current.UserName, branchID, Current.LangID).FirstOrDefault();
                string objApproveConfig = _db.OM20500_pdApproveConfig(Current.UserName, branchID, Current.LangID).FirstOrDefault();
                var isHO = objBranchDelivery != null && objBranchDelivery.IsHO == true;
                string Delivery = string.Empty;
                DateTime dteShipDate = DateTime.Now.ToDateShort();
                DateTime dteARDocDate = DateTime.Now.ToDateShort();
                bool isAddStock = data["isAddStock"].ToBool();
                List<OM20500_pgDet_Result> lstAllDet = new List<OM20500_pgDet_Result>();
                if (Util.PassNull(objHeader.DeliveryIDTmp) != "")
                {
                    Delivery = objHeader.DeliveryIDTmp;
                }
                if (Util.PassNull(objHeader.ARDocDateTmp) != "")
                {
                    dteARDocDate = objHeader.ARDocDateTmp.ToDateShort();
                }
                if (Util.PassNull(objHeader.ARDocDateTmp) != "")
                {
                    dteShipDate = objHeader.ARDocDateTmp.ToDateShort();
                }

                if (objHeader.IsSelected == true)
                {
                    lstAllDet = detHandler.ObjectData<OM20500_pgDet_Result>().ToList();
                }
                if (calcPromoOnly)
                {
                    objHeader.ToStatus = objHeader.Status;
                }
                var objHeaderDB = _db.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == objHeader.OrderNbr);
                _objOrd = objHeaderDB;
                if (budgetStatus != 2 && (objHeaderDB == null || objHeader.tstamp.ToHex() != objHeaderDB.tstamp.ToHex()) && lstChoice.Count == 0)//lstChoice.Count > 0 &&
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " dữ liệu đã bị thay đổi một chương trình khác!" });
                }

                #region -data-
                // Nếu detail chưa đc load thì lấy ở db            
                if (lstAllDet.Count == 0 || objHeader.IsSelected == false)
                {
                    lstAllDet = GetDetNotSelect(branchID, objHeader);
                }
                var lstDet = lstAllDet.Where(p => p.Selected == true).ToList();

                var error = true;
                foreach (var item in lstAllDet)
                {
                    if (item.Selected == true && (item.FreeItem == false || !string.IsNullOrWhiteSpace(item.DiscCode) || !string.IsNullOrWhiteSpace(item.DisplayID)))
                    {
                        error = false;
                        break;
                    }
                }
                if (error)
                {
                    throw new MessageException(MessageType.Error, "2018012403", parm: new[] { objHeader.OrderNbr });
                }
                #endregion

                var lstFreeDet = lstAllDet.Where(p => p.FreeItem == true && string.IsNullOrWhiteSpace(p.DisplayID)).ToList();
                string OMOrderNbr = "";
                Dictionary<string, double> dicRef = new Dictionary<string, double>();
                bool calcDisc = false;
                CheckConfig(objHeader);

                var _objIN = _db.IN_Setup.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.SetupID == "IN");
                if (_objIN == null)
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(20404, new string[] { "IN_Setup" }) + "</br>" });
                }

                var objCust = _db.AR_Customer.FirstOrDefault(p => p.CustId == objHeader.CustID && p.BranchID == objHeader.BranchID);
                if (objCust == null)
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(2015032701, new string[] { objHeader.CustID }) + "</br>" });
                }
                string primarySiteID = string.Empty;
                string promoSiteID = string.Empty;
                var objOrd = _db.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == objHeader.OrderNbr);
                if (objOrd != null)
                {
                    UpdateOM_PDASalesOrd(objHeader, ref objOrd);
                    UpdatePrimarySitePromoSite(objHeader, branchID, lstDet, ref primarySiteID, ref promoSiteID, objOrd.OrderType);
                }
                else
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(8012, new string[] { objHeader.OrderNbr }) + "</br>" });
                }
                string oldStatus = objOrd.Status;
                #endregion

                if (objHeader.ToStatus == "C")
                {
                    // Save History
                    _db.OM20500_ppSaveHistory(objHeader.BranchID, objHeader.OrderNbr, objHeader.ForceCalcPromo, calcPromoOnly, confirmed, Current.UserName, Current.CpnyID, Current.LangID);

                    if (_db.OM20500_ppCheckCloseDate(objHeader.BranchID, objHeader.OrderDate.ToDateShort(), objHeader.OrderNbr, objHeader.Status, objHeader.ToStatus, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault() == "1")
                    {
                        // Save AR_PDADoc-
                        UpdateAR_PDADoc(objHeader.OrderNbr, objHeader.BranchID, lstDoc);
                        UpdateAR_Customer(objHeader.CodeHT, ref objCust);

                        UpdateAR_NewCustomerInfo(objHeader.BranchID, objHeader.CustID, objHeader.CodeHT);
                        #region  -Check calc Disc & Calc Mark-
                        // var lstDetOrNbr = lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr).ToList();
                        if (objHeader.ForceCalcPromo == true && confirmed && !calcPromoOnly)
                        {
                            objHeader.ForceCalcPromo = false;
                        }
                        if (objHeader.ForceCalcPromo == false && (confirmed || calcID > 0))
                        {
                            for (int i = 0; i < lstDet.Count; i++)
                            {
                                if (lstDet[i].FreeItem == false || lstDet[i].DiscCode != string.Empty || lstDet[i].DisplayID != string.Empty)
                                {
                                    if (lstDet[i].QtyShip > 0)
                                    {
                                        lstDet[i].LineRef = lstDet[i].LineRef.Split(',').Length > 1 ? lstDet[i].LineRef + "," + lstDet[i].SiteID : lstDet[i].LineRef;
                                        if (!dicRef.Any(x => x.Key == lstDet[i].LineRef))
                                        {
                                            dicRef.Add(lstDet[i].LineRef, lstDet[i].QtyShip);
                                        }
                                    }
                                    var objGDet = lstDet[i];
                                    var objDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p =>
                                        p.BranchID == objHeader.BranchID &&
                                        p.OrderNbr == objHeader.OrderNbr &&
                                        p.InvtID == objGDet.InvtID &&
                                        p.LineRef == objGDet.LineRef);

                                    if (objDet != null)
                                    {
                                        double qty = objHeader.EditColumn.Split(',')[0] == "QtyShip" ? lstDet[i].QtyShip : lstDet[i].Qty;
                                        var mmax = objGDet.MMark.HasValue ? objGDet.MMark.Value : 0;
                                        objDet.Mark = mmax * objGDet.QtyShip;
                                        objDet.DiscID1 = objGDet.DiscID;
                                    }
                                }
                            }
                            var lstPDADet = _db.OM_PDASalesOrdDet.Where(x => x.BranchID == objHeader.BranchID && x.OrderNbr == objHeader.OrderNbr).ToList();
                            var lstPDAOrdDisc = _db.OM_PDAOrdDisc.Where(x => x.BranchID == objHeader.BranchID && x.OrderNbr == objHeader.OrderNbr).ToList();
                            foreach (var it in lstPDADet)
                            {
                                _lstPDADet.Add(it);
                            }
                            foreach (var it in lstPDAOrdDisc)
                            {
                                var objPDA = new OM_PDAOrdDisc
                                {
                                    BranchID = it.BranchID,
                                    DiscID = it.DiscID,
                                    DiscSeq = it.DiscSeq,
                                    OrderNbr = it.OrderNbr,
                                    LineRef = it.LineRef,
                                    BreakBy = it.BreakBy,
                                    BudgetID = it.BudgetID,
                                    DiscAmt = it.DiscAmt,
                                    DiscFor = it.DiscFor,
                                    DisctblAmt = it.DisctblAmt,
                                    DisctblQty = it.DisctblQty,
                                    DiscType = it.DiscType,
                                    DiscUOM = it.DiscUOM,
                                    FreeItemBudgetID = it.FreeItemBudgetID,
                                    FreeItemID = it.FreeItemID,
                                    FreeItemQty = it.FreeItemQty,
                                    OrigFreeItemQty = it.OrigFreeItemQty,
                                    SlsPerID = it.SlsPerID,
                                    SOLineRef = it.SOLineRef,
                                    UserOperationLog = it.UserOperationLog,
                                    Crtd_DateTime = it.Crtd_DateTime,
                                    Crtd_Prog = it.Crtd_Prog,
                                    Crtd_User = it.Crtd_User,
                                    LUpd_DateTime = it.LUpd_DateTime,
                                    LUpd_Prog = it.LUpd_Prog,
                                    LUpd_User = it.LUpd_User,
                                    DiscBreakLineRef = it.DiscBreakLineRef,
                                    RefLineRef = it.RefLineRef,
                                    GroupRefLineRef = it.GroupRefLineRef
                                };
                                _lstPDAOrdDisc.Add(objPDA);
                            }
                            if (calcID == 0)
                            {
                                foreach (var it in lstPDADet)
                                {
                                    _lstPDADet.Add(it);
                                    if (it.FreeItem && string.IsNullOrWhiteSpace(it.DiscCode) && string.IsNullOrWhiteSpace(it.DisplayID))
                                    {
                                        _db.OM_PDASalesOrdDet.DeleteObject(it);
                                    }
                                }
                                foreach (var it in lstPDAOrdDisc)
                                {
                                    _db.OM_PDAOrdDisc.DeleteObject(it);
                                }
                            }
                            else if (calcID > 0)
                            {
                                var _lstOrdDet = _db.OM_PDASalesOrdDetCalcPromo.Where(x => x.BranchID == branchID
                                                                                            && x.OrderNbr == objHeader.OrderNbr
                                                                                            && x.ID == calcID
                                                                                            ).ToList();
                                var _lstDisc = _db.OM_PDAOrdDiscCalcPromo.Where(x => x.BranchID == branchID
                                                                                            && x.OrderNbr == objHeader.OrderNbr
                                                                                            && x.ID == calcID
                                                                                            ).ToList();

                                #region -Save OM_PDASalesOrdDet-
                                if (_lstOrdDet.Count == 0)
                                {
                                    // No promo item 
                                    foreach (var item in lstPDADet)
                                    {
                                        if (item.FreeItem && string.IsNullOrWhiteSpace(item.DiscCode) && string.IsNullOrWhiteSpace(item.DisplayID))
                                        {
                                            _db.OM_PDASalesOrdDet.DeleteObject(item);
                                        }
                                    }
                                }
                                else
                                {
                                    // Insert all promo from Cloud to PDA 
                                    #region -Insert or Update OM_PDASalesOrdDet-
                                    for (int idxOrdDet = 0; idxOrdDet < _lstOrdDet.Count; idxOrdDet++)
                                    {
                                        if (_lstOrdDet[idxOrdDet].LineQty > 0)
                                        {
                                            if (_lstOrdDet[idxOrdDet].FreeItem && _lstOrdDet[idxOrdDet].DiscCode != "")
                                            {
                                                if (lstDet.Any(x => x.LineRef == _lstOrdDet[idxOrdDet].LineRef))
                                                {
                                                    if (!dicRef.Any(x => x.Key == _lstOrdDet[idxOrdDet].LineRef))
                                                    {
                                                        dicRef.Add(_lstOrdDet[idxOrdDet].LineRef, _lstOrdDet[idxOrdDet].LineQty);
                                                    }
                                                }
                                            }
                                            else
                                            {
                                                if (!dicRef.Any(x => x.Key == _lstOrdDet[idxOrdDet].LineRef))
                                                {
                                                    dicRef.Add(_lstOrdDet[idxOrdDet].LineRef, _lstOrdDet[idxOrdDet].LineQty);
                                                }
                                            }
                                        }

                                        var objPDADetOrig = lstPDADet.FirstOrDefault(x => x.LineRef == _lstOrdDet[idxOrdDet].LineRef);

                                        var objPDADet = lstPDADet.FirstOrDefault(x =>
                                                           x.LineRef == _lstOrdDet[idxOrdDet].LineRef);
                                        if (objPDADet == null)
                                        {
                                            objPDADet = new OM_PDASalesOrdDet();
                                            objPDADet.BranchID = _lstOrdDet[idxOrdDet].BranchID;
                                            objPDADet.OrderNbr = objHeader.OrderNbr;
                                            objPDADet.LineRef = _lstOrdDet[idxOrdDet].LineRef;
                                            objPDADet.Qty = 0;// _lstOrdDet[idxOrdDet].Qty;
                                            objPDADet.QtyApprove = 0;
                                            objPDADet.QtyERP = 0;
                                            objPDADet.QtyShipD = 0;
                                            objPDADet.QtyShip = 0;// _lstOrdDet[idxOrdDet].LineQty;
                                            objPDADet.POSMImg = string.Empty;
                                            objPDADet.Crtd_Prog = "OM20500";
                                            objPDADet.Crtd_User = Current.UserName;
                                            objPDADet.Crtd_Datetime = DateTime.Now;

                                            objPDADet.LineQty = _lstOrdDet[idxOrdDet].LineQty;
                                            objPDADet.LineAmt = _lstOrdDet[idxOrdDet].LineAmt;
                                            _db.OM_PDASalesOrdDet.AddObject(objPDADet);
                                        }
                                        else
                                        {
                                            if (_lstOrdDet[idxOrdDet].FreeItem && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DiscCode) && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DisplayID))
                                            {
                                                objPDADet.LineQty = _lstOrdDet[idxOrdDet].LineQty;
                                                objPDADet.Qty = 0;// _lstOrdDet[idxOrdDet].LineQty;
                                                objPDADet.QtyApprove = 0;
                                                objPDADet.QtyERP = 0;
                                                objPDADet.QtyShipD = 0;
                                                objPDADet.QtyShip = 0;
                                            }
                                        }
                                        #region -update-

                                        objPDADet.BarCode = _lstOrdDet[idxOrdDet].BarCode;
                                        objPDADet.BOCustID = Util.PassNull(_lstOrdDet[idxOrdDet].BOCustID);
                                        objPDADet.BOType = _lstOrdDet[idxOrdDet].BOType;
                                        objPDADet.BudgetID1 = Util.PassNull(_lstOrdDet[idxOrdDet].BudgetID1);
                                        objPDADet.BudgetID2 = Util.PassNull(_lstOrdDet[idxOrdDet].BudgetID2);
                                        objPDADet.CostID = Util.PassNull(_lstOrdDet[idxOrdDet].CostID);
                                        objPDADet.Descr = _lstOrdDet[idxOrdDet].Descr;
                                        objPDADet.DiscAmt = _lstOrdDet[idxOrdDet].DiscAmt;
                                        objPDADet.DiscAmt1 = _lstOrdDet[idxOrdDet].DiscAmt1;
                                        objPDADet.DiscAmt2 = _lstOrdDet[idxOrdDet].DiscAmt2;
                                        objPDADet.DiscCode = Util.PassNull(_lstOrdDet[idxOrdDet].DiscCode);
                                        objPDADet.DiscID1 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscID1);
                                        objPDADet.DiscID2 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscID2);
                                        objPDADet.DiscPct = _lstOrdDet[idxOrdDet].DiscPct;
                                        objPDADet.DiscPct1 = _lstOrdDet[idxOrdDet].DiscPct1;
                                        objPDADet.DiscPct2 = _lstOrdDet[idxOrdDet].DiscPct2;
                                        objPDADet.DiscSeq1 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscSeq1);
                                        objPDADet.DiscSeq2 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscSeq2);
                                        objPDADet.DocDiscAmt = _lstOrdDet[idxOrdDet].DocDiscAmt;
                                        objPDADet.FreeItem = _lstOrdDet[idxOrdDet].FreeItem;
                                        objPDADet.FreeItemQty1 = _lstOrdDet[idxOrdDet].FreeItemQty1;
                                        objPDADet.FreeItemQty2 = _lstOrdDet[idxOrdDet].FreeItemQty2;
                                        objPDADet.GroupDiscAmt1 = _lstOrdDet[idxOrdDet].GroupDiscAmt1;
                                        objPDADet.GroupDiscAmt2 = _lstOrdDet[idxOrdDet].GroupDiscAmt2;
                                        objPDADet.GroupDiscID1 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscID1);
                                        objPDADet.GroupDiscID2 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscID2);
                                        objPDADet.GroupDiscPct1 = _lstOrdDet[idxOrdDet].GroupDiscPct1;
                                        objPDADet.GroupDiscPct2 = _lstOrdDet[idxOrdDet].GroupDiscPct2;
                                        objPDADet.GroupDiscSeq1 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscSeq1);
                                        objPDADet.GroupDiscSeq2 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscSeq2);
                                        objPDADet.InvtID = _lstOrdDet[idxOrdDet].InvtID;
                                        objPDADet.ItemPriceClass = _lstOrdDet[idxOrdDet].ItemPriceClass;
                                        objPDADet.OrderType = _lstOrdDet[idxOrdDet].OrderType;
                                        objPDADet.OrigOrderNbr = _lstOrdDet[idxOrdDet].OrigOrderNbr;
                                        objPDADet.QtyBO = _lstOrdDet[idxOrdDet].QtyBO;
                                        objPDADet.QtyInvc = _lstOrdDet[idxOrdDet].QtyInvc;
                                        objPDADet.QtyOpenShip = _lstOrdDet[idxOrdDet].QtyOpenShip;
                                        objPDADet.ShipStatus = Util.PassNull(_lstOrdDet[idxOrdDet].ShipStatus);
                                        objPDADet.SiteID = _lstOrdDet[idxOrdDet].SiteID;
                                        objPDADet.SlsPrice = _lstOrdDet[idxOrdDet].SlsPrice;
                                        objPDADet.SlsUnit = _lstOrdDet[idxOrdDet].SlsUnit;
                                        objPDADet.SOFee = _lstOrdDet[idxOrdDet].SOFee;
                                        objPDADet.TaxAmt00 = _lstOrdDet[idxOrdDet].TaxAmt00;
                                        objPDADet.TaxAmt01 = _lstOrdDet[idxOrdDet].TaxAmt01;
                                        objPDADet.TaxAmt02 = _lstOrdDet[idxOrdDet].TaxAmt02;
                                        objPDADet.TaxAmt03 = _lstOrdDet[idxOrdDet].TaxAmt03;
                                        objPDADet.TaxCat = _lstOrdDet[idxOrdDet].TaxCat;
                                        objPDADet.TaxID00 = _lstOrdDet[idxOrdDet].TaxID00;
                                        objPDADet.TaxID01 = Util.PassNull(_lstOrdDet[idxOrdDet].TaxID01);
                                        objPDADet.TaxID02 = Util.PassNull(_lstOrdDet[idxOrdDet].TaxID01);
                                        objPDADet.TaxID03 = Util.PassNull(_lstOrdDet[idxOrdDet].TaxID03);
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
                                        objPDADet.ManuDiscAmt = _lstOrdDet[idxOrdDet].ManuDiscAmt;
                                        objPDADet.POSM = _lstOrdDet[idxOrdDet].POSM;
                                        objPDADet.Mark = _lstOrdDet[idxOrdDet].Mark;
                                        objPDADet.DisplayID = _lstOrdDet[idxOrdDet].DisplayID;
                                        objPDADet.DisplayPeriodID = Util.PassNull(_lstOrdDet[idxOrdDet].DisplayPeriodID);
                                        objPDADet.KitLineRef = string.Empty;
                                        objPDADet.DiscIDSolomon = string.Empty;
                                        objPDADet.Declaration = string.Empty;
                                        objPDADet.ConsumerPromotionID = string.Empty;
                                        objPDADet.AccumulateID = string.Empty;
                                        objPDADet.ManuDiscAmt = _lstOrdDet[idxOrdDet].ManuDiscAmt;
                                        objPDADet.ManuDiscPct = _lstOrdDet[idxOrdDet].ManuDiscPct;
                                        #endregion
                                        // }
                                    }
                                    #endregion

                                    //    // Delete old promotion 
                                    foreach (var item in lstPDADet)
                                    {
                                        if (item.FreeItem && string.IsNullOrWhiteSpace(item.DiscCode) && string.IsNullOrWhiteSpace(item.DisplayID)) // Ko xoá KM tay
                                        {
                                            var objDel = _lstOrdDet.FirstOrDefault(x =>
                                                x.LineRef == item.LineRef);
                                            if (objDel == null)
                                            {
                                                _db.OM_PDASalesOrdDet.DeleteObject(item);
                                            }
                                        }
                                    }
                                }
                                #endregion

                                #region -Save OM_PDAOrdDisc-
                                if (_lstDisc.Count == 0)
                                {
                                    foreach (var item in lstPDAOrdDisc)
                                    {
                                        _db.OM_PDAOrdDisc.DeleteObject(item);
                                    }
                                }
                                else
                                {
                                    // Add new or update promotion
                                    for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                                    {
                                        var objDisc = _lstDisc[idxDisc];

                                        #region -Insert or Update OM_PDAOrdDisc-
                                        var objPDAOrdDisc = lstPDAOrdDisc.Where(x =>
                                            x.BranchID == objDisc.BranchID
                                            && x.OrderNbr == objHeader.OrderNbr
                                            && x.DiscID == objDisc.DiscID
                                            && x.DiscSeq == objDisc.DiscSeq
                                            && x.LineRef == objDisc.LineRef
                                            ).FirstOrDefault();
                                        if (objPDAOrdDisc == null)
                                        {
                                            objPDAOrdDisc = new OM_PDAOrdDisc();
                                            objPDAOrdDisc.BranchID = _lstDisc[idxDisc].BranchID;
                                            objPDAOrdDisc.DiscID = _lstDisc[idxDisc].DiscID;
                                            objPDAOrdDisc.DiscSeq = _lstDisc[idxDisc].DiscSeq;
                                            objPDAOrdDisc.OrderNbr = objHeader.OrderNbr;
                                            objPDAOrdDisc.LineRef = _lstDisc[idxDisc].LineRef;
                                            objPDAOrdDisc.Crtd_DateTime = DateTime.Now;
                                            objPDAOrdDisc.Crtd_Prog = "OM20500";
                                            objPDAOrdDisc.Crtd_User = Current.UserName;
                                            _db.OM_PDAOrdDisc.AddObject(objPDAOrdDisc);
                                        }
                                        objPDAOrdDisc.BreakBy = _lstDisc[idxDisc].BreakBy;
                                        objPDAOrdDisc.BudgetID = _lstDisc[idxDisc].BudgetID;
                                        objPDAOrdDisc.DiscAmt = _lstDisc[idxDisc].DiscAmt;
                                        objPDAOrdDisc.DiscFor = _lstDisc[idxDisc].DiscFor;
                                        objPDAOrdDisc.DisctblAmt = _lstDisc[idxDisc].DisctblAmt;
                                        objPDAOrdDisc.DisctblQty = _lstDisc[idxDisc].DisctblQty;
                                        objPDAOrdDisc.DiscType = _lstDisc[idxDisc].DiscType;
                                        objPDAOrdDisc.DiscUOM = _lstDisc[idxDisc].DiscUOM;
                                        objPDAOrdDisc.FreeItemBudgetID = _lstDisc[idxDisc].FreeItemBudgetID;
                                        objPDAOrdDisc.FreeItemID = _lstDisc[idxDisc].FreeItemID;
                                        objPDAOrdDisc.FreeItemQty = _lstDisc[idxDisc].FreeItemQty;
                                        objPDAOrdDisc.OrigFreeItemQty = _lstDisc[idxDisc].OrigFreeItemQty;
                                        objPDAOrdDisc.SlsPerID = _lstDisc[idxDisc].SlsperID;
                                        objPDAOrdDisc.SOLineRef = _lstDisc[idxDisc].SOLineRef;
                                        objPDAOrdDisc.UserOperationLog = _lstDisc[idxDisc].UserOperationLog;
                                        objPDAOrdDisc.DiscBreakLineRef = _lstDisc[idxDisc].DiscBreakLineRef;
                                        objPDAOrdDisc.RefLineRef = Util.PassNull(_lstDisc[idxDisc].RefLineRef);
                                        objPDAOrdDisc.GroupRefLineRef = Util.PassNull(_lstDisc[idxDisc].GroupRefLineRef);
                                        objPDAOrdDisc.LUpd_DateTime = DateTime.Now;
                                        objPDAOrdDisc.LUpd_Prog = "OM20500";
                                        objPDAOrdDisc.LUpd_User = Current.UserName;
                                        objPDAOrdDisc.tstamp = new byte[1];
                                        #endregion
                                    }
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
                                            _db.OM_PDAOrdDisc.DeleteObject(item);
                                        }
                                    }
                                }
                                #endregion

                                #region -Update Header-
                                var _objOrder = _db.OM_PDASalesOrdCalcPromo.FirstOrDefault(x => x.ID == calcID && x.BranchID == branchID && x.OrderNbr == objHeader.OrderNbr);

                                objHeaderDB.PriceClassID = Util.PassNull(_objOrder.PriceClassID);
                                objHeaderDB.DoNotCalDisc = _objOrder.DoNotCalDisc;
                                objHeaderDB.CreditHold = _objOrder.CreditHold;
                                objHeaderDB.IssueMethod = Util.PassNull(_objOrder.IssueMethod);
                                objHeaderDB.BudgetID1 = Util.PassNull(_objOrder.BudgetID1);
                                objHeaderDB.CmmnPct = _objOrder.CmmnPct;
                                objHeaderDB.CustOrderNbr = Util.PassNull(_objOrder.CustOrderNbr);
                                objHeaderDB.FreightAllocAmt = _objOrder.FreightAllocAmt;
                                objHeaderDB.FreightAmt = _objOrder.FreightAmt;
                                objHeaderDB.FreightCost = _objOrder.FreightCost;
                                objHeaderDB.LineAmt = _objOrder.LineAmt;
                                objHeaderDB.LineDiscAmt = _objOrder.LineDiscAmt;
                                objHeaderDB.MiscAmt = _objOrder.MiscAmt;
                                objHeaderDB.OrdDiscAmt = _objOrder.OrdDiscAmt;
                                objHeaderDB.OrdAmt = _objOrder.OrdAmt;
                                objHeaderDB.PmtAmt = _objOrder.PmtAmt;
                                objHeaderDB.PremFreightAmt = _objOrder.PremFreightAmt;
                                objHeaderDB.VolDiscAmt = _objOrder.VolDiscAmt;
                                objHeaderDB.SOFeeTot = _objOrder.SOFeeTot;
                                objHeaderDB.PromiseDate = DateTime.Now.ToDateShort();
                                objHeaderDB.StationID = Util.PassNull(_objOrder.StationID);
                                objHeaderDB.TaxAmtTot00 = _objOrder.TaxAmtTot00;
                                objHeaderDB.TxblAmtTot00 = _objOrder.TxblAmtTot00;
                                objHeaderDB.TaxID00 = Util.PassNull(_objOrder.TaxID00);
                                objHeaderDB.TaxAmtTot01 = _objOrder.TaxAmtTot01;
                                objHeaderDB.TxblAmtTot01 = _objOrder.TxblAmtTot01;
                                objHeaderDB.TaxID01 = Util.PassNull(_objOrder.TaxID01);
                                objHeaderDB.TaxAmtTot02 = _objOrder.TaxAmtTot02;
                                objHeaderDB.TxblAmtTot02 = _objOrder.TxblAmtTot02;
                                objHeaderDB.TaxID02 = Util.PassNull(_objOrder.TaxID02);
                                objHeaderDB.TaxAmtTot03 = _objOrder.TaxAmtTot03;
                                objHeaderDB.TxblAmtTot03 = _objOrder.TxblAmtTot03;
                                objHeaderDB.TaxID03 = Util.PassNull(_objOrder.TaxID03);
                                objHeaderDB.OrdQty = _objOrder.OrdQty;
                                objHeaderDB.UnitsShipped = _objOrder.UnitsShipped;
                                objHeaderDB.OrderWeight = _objOrder.OrderWeight;
                                objHeaderDB.VolDiscPct = _objOrder.VolDiscPct;
                                objHeaderDB.PaymentID = Util.PassNull(_objOrder.PaymentID);
                                objHeaderDB.PmtDate = _objOrder.PmtDate.PassMin();
                                objHeaderDB.PaymentBatNbr = Util.PassNull(_objOrder.PaymentBatNbr);
                                objHeaderDB.PaymentNbr = Util.PassNull(_objOrder.PaymentNbr);
                                objHeaderDB.IssueNumber = _objOrder.IssueNumber;
                                objHeaderDB.OrderNo = _objOrder.OrderNo;
                                objHeaderDB.DeliveryID = Util.PassNull(_objOrder.DeliveryID);
                                objHeaderDB.Remark = Util.PassNull(objHeader.Remark);
                                objHeaderDB.RewardID = _objOrder.RewardID;
                                objHeaderDB.RewardAmt = _objOrder.RewardAmt;
                                objHeaderDB.OrdAmtApprove = _objOrder.OrdAmt;
                                objHeaderDB.ManualDiscAmt = _objOrder.ManualDiscAmt;
                                objHeaderDB.ManualDiscPct = _objOrder.ManualDiscPct;
                                #endregion

                                var hasDelivery = _db.OM20500_pdHasDelivery(Current.CpnyID, Current.UserName, Current.LangID, objHeader.BranchID).FirstOrDefault();
                                if (hasDelivery != null)
                                {
                                    if (hasDelivery.HasDelivery == true)
                                    {
                                        _objOrder.Status = "W";
                                    }
                                    else
                                    {
                                        _objOrder.Status = "C";
                                    }
                                }

                            }
                            objOrd.DoNotCalDisc = "1".ToShort();
                        }
                        else
                        {
                            string siteError = string.Empty;
                            for (int i = 0; i < lstDet.Count; i++)
                            {
                                if (lstDet[i].QtyShip > 0)
                                {
                                    lstDet[i].LineRef = lstDet[i].LineRef.Split(',').Length > 1 ? lstDet[i].LineRef + "," + lstDet[i].SiteID : lstDet[i].LineRef;
                                    if (!dicRef.Any(x => x.Key == lstDet[i].LineRef))
                                    {
                                        dicRef.Add(lstDet[i].LineRef, lstDet[i].QtyShip);
                                    }
                                }
                                else if (!lstDet[i].FreeItem && lstDet[i].Qty > 0)
                                {
                                    calcDisc = true;
                                }
                                var objGDet = lstDet[i];

                                var objDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p =>
                                    p.BranchID == objHeader.BranchID &&
                                    p.OrderNbr == objHeader.OrderNbr &&
                                    p.InvtID == objGDet.InvtID &&
                                    p.LineRef == objGDet.LineRef);

                                if (objDet != null)
                                {
                                    double qty = objHeader.EditColumn.Split(',')[0] == "QtyShip" ? lstDet[i].QtyShip : lstDet[i].Qty;
                                    if (qty != lstDet[i].LineQty)
                                    {
                                        calcDisc = true;
                                    }
                                    var mmax = objGDet.MMark.HasValue ? objGDet.MMark.Value : 0;
                                    objDet.Mark = mmax * objGDet.QtyShip;
                                    objDet.DiscID1 = objGDet.DiscID;

                                    string key = objDet.InvtID + objDet.SiteID;
                                    if (!_lstItemSite.ContainsKey(key))
                                    {
                                        GetIN_ItemSite(objDet.InvtID, objDet.SiteID);
                                    }
                                    _lstItemSite[key] -= objDet.LineQty * objDet.UnitRate;
                                    if (_lstItemSite[key] < 0)
                                    {
                                        siteError += objDet.InvtID + "-" + objDet.SiteID + ", ";
                                    }

                                }
                            }
                            if (siteError != string.Empty)
                            {
                                throw new MessageException(MessageType.Message, "2019082860", "", new[] { objHeader.OrderNbr, siteError });
                            }
                            if (lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count() != lstAllDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count())
                            {
                                foreach (var item in lstDet)
                                {
                                    if (item.FreeItem == false)
                                    {
                                        calcDisc = true;
                                        break;
                                    }
                                }
                            }
                            objOrd.DoNotCalDisc = objHeader.ForceCalcPromo == true ? "0".ToShort() : "1".ToShort();
                            if (objOrd.DoNotCalDisc == 1)
                            {
                                if (lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count() > 0)
                                {
                                    foreach (var item in lstFreeDet)
                                    {
                                        if (item.QtyShip > 0 && item.DiscCode == "" && item.DisplayID == "")
                                        {
                                            item.LineRef = item.LineRef.Split(',').Length > 1 ? item.LineRef + "," + item.SiteID : item.LineRef;
                                            if (!dicRef.Any(x => x.Key == item.LineRef))
                                            {
                                                dicRef.Add(item.LineRef, item.QtyShip);
                                            }
                                            lstDet.Add(item);
                                        }
                                    }
                                }
                            }
                        }
                        #endregion
                        string isValidItem = string.Empty;
                        string outOfManualbudget = string.Empty;
                        string outOfManualSite = string.Empty;
                        int manualDisc = CheckOrdManual(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, dicRef, false, isAllManualPromoOrDisplay, out outOfManualbudget, out outOfManualSite, out isValidItem);

                        if (manualDisc > 0 && isApproveAll == false)
                        {
                            throw new MessageException("2019033007", parm: new[] { objHeader.OrderNbr });
                        }
                        if (outOfManualbudget != string.Empty || outOfManualSite != string.Empty)
                        {
                            if (outOfManualbudget != string.Empty)
                            {
                                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(2019033005, new string[] { outOfManualbudget }) + "</br>" });
                            }
                            else if (outOfManualSite != string.Empty)
                            {
                                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(2019033006, new string[] { outOfManualSite }) + "</br>" });
                            }
                        }
                        // Save all change before release
                        _db.SaveChanges();

                        #region -Release-
                        try
                        {
                            string outOfSite = string.Empty;
                            string outOfBudget = string.Empty;
                            OM om = new OM(Current.UserName, _screenNbr, dal);
                            om.IsAllManualPromoOrDisplay = isAllManualPromoOrDisplay;
                            dal.BeginTrans(IsolationLevel.ReadCommitted);
                            if (om.OM20500_ReleaseNew(objHeader.BranchID, objHeader.OrderNbr, dicRef, Delivery, dteShipDate, dteARDocDate, isAddStock, objHeader.RemarkOrd, true, out OMOrderNbr, false))
                            {
                                dal.CommitTrans();
                                // Save reward amount
                                SaveRewardAmt(objHeader, OMOrderNbr);

                                if (!isAllManualPromoOrDisplay && objOrd.DoNotCalDisc == (Int16)1)
                                {
                                    if (budgetStatus == 0)
                                    {
                                        budgetStatus = SaveOrdDisc(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, OMOrderNbr, om.freeItemUsed, ref outOfSite, ref outOfBudget);
                                    }
                                    else if (budgetStatus == 2)
                                    {
                                        SaveOrdDisc(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, OMOrderNbr, om.freeItemUsed, ref outOfSite, ref outOfBudget);
                                    }
                                    if (budgetStatus > 0 && budgetStatus != 2)
                                    {
                                        var objOMOrder = _db.OM_SalesOrd.FirstOrDefault(x => x.BranchID == objHeader.BranchID && x.OrderNbr == OMOrderNbr);
                                        if (objOMOrder != null)
                                        {
                                            objOMOrder.DoNotCalDisc = (short)0;
                                            _db.SaveChanges();
                                        }
                                    }
                                    var enoughtManualDisc = SaveOrdManual(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, OMOrderNbr, dicRef, false, isAllManualPromoOrDisplay, out outOfManualbudget, out outOfManualSite);
                                }
                                else if (objOrd.DoNotCalDisc == (Int16)1)
                                {
                                    var enoughtManualDisc = SaveOrdManual(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, OMOrderNbr, dicRef, false, isAllManualPromoOrDisplay, out outOfManualbudget, out outOfManualSite);
                                }
                                if (outOfManualbudget != string.Empty || outOfManualSite != string.Empty)
                                {
                                    DeleteOM20500(objHeader.BranchID, OMOrderNbr, 0, "", true, objHeader.OrderType);
                                    if (outOfManualbudget != string.Empty)
                                    {
                                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(2019033005, new string[] { outOfManualbudget }) + "</br>" });
                                    }
                                    else if (outOfManualSite != string.Empty)
                                    {
                                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(2019033006, new string[] { outOfManualSite }) + "</br>" });
                                    }
                                }
                                #region - // Goi OM10100 tinh khuyen mai SAVE DATA -
                                int calcPromo = 0;
                                OM10100.Controllers.OM10100Controller ObjOM10100 = new OM10100.Controllers.OM10100Controller();
                                try
                                {
                                    ObjOM10100._budgetStatus = budgetStatus;
                                    ObjOM10100._outOfManualFreeItemSite = outOfManualSite;
                                    ObjOM10100._outOfFreeBudget = outOfBudget;
                                    ObjOM10100._outOfFreeItemSite = outOfSite;
                                    var objResult = ObjOM10100.SaveOM20500(objHeader.BranchID, OMOrderNbr, lstChoice, calcPromo, false, objHeader.OrderType, qtyChange) as JsonResult;
                                    if (objResult.Data.GetType().GetProperty("choice") != null || objResult.Data.GetType().GetProperty("Budget") != null)
                                    {
                                        eBiz4DApp.clsOM_PDASalesOrd pdaOrd = new eBiz4DApp.clsOM_PDASalesOrd(dal);
                                        pdaOrd.GetByKey(objHeader.BranchID, objHeader.OrderNbr);
                                        if (pdaOrd.Status != oldStatus)
                                        {
                                            pdaOrd.Status = oldStatus;
                                            pdaOrd.Update();
                                        }
                                        RollbackOrder(_lstPDADet, _lstPDAOrdDisc);
                                        DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromo, "", true, objHeader.OrderType);
                                        return objResult;
                                    }

                                    var json = JsonConvert.SerializeObject(objResult.Data);

                                    var saveResult = JsonConvert.DeserializeObject<RootObject>(json);
                                    if (saveResult.code != "9999" && budgetStatus != 2)
                                    {
                                        eBiz4DApp.clsOM_PDASalesOrd pdaOrd = new eBiz4DApp.clsOM_PDASalesOrd(dal);
                                        eBiz4DApp.clsOM_PDASalesOrdDet pdaOrdDet = new eBiz4DApp.clsOM_PDASalesOrdDet(dal);
                                        pdaOrd.GetByKey(objHeader.BranchID, objHeader.OrderNbr);
                                        if (pdaOrd.Status != oldStatus)
                                        {
                                            pdaOrd.Status = oldStatus;
                                            pdaOrd.LUpd_Prog = _screenNbr;
                                            pdaOrd.LUpd_DateTime = DateTime.Now;
                                            pdaOrd.LUpd_User = Current.UserName;
                                            pdaOrd.Update();

                                            DataTable lstPDDet = pdaOrdDet.GetAll(branchID, objHeader.OrderNbr, "%");
                                            for (int i = 0; i < lstPDDet.Rows.Count; i++)
                                            {
                                                pdaOrdDet.GetByKey(objHeader.BranchID, objHeader.OrderNbr, lstPDDet.Rows[i]["LineRef"].PassNull());
                                                if (pdaOrdDet.LineRef != "" && pdaOrdDet.Qty != 0)
                                                {
                                                    pdaOrdDet.Qty = 0;
                                                    if (pdaOrdDet.FreeItem)
                                                    {
                                                        pdaOrdDet.QtyShip = 0;
                                                    }
                                                    pdaOrdDet.Update();
                                                }
                                            }
                                            foreach (var obj in lstAllDet)
                                            {
                                                pdaOrdDet.GetByKey(objHeader.BranchID, obj.OrderNbr, obj.LineRef);
                                                if (pdaOrdDet.LineRef != "")
                                                {
                                                    pdaOrdDet.Qty = 0;
                                                    pdaOrdDet.SiteID = obj.SiteID;
                                                    if (pdaOrdDet.FreeItem)
                                                    {
                                                        pdaOrdDet.QtyShip = 0;
                                                    }
                                                    pdaOrdDet.Update();
                                                }
                                            }
                                        }
                                        DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromo, saveResult.code, saveResult.code == "2019033001", objHeader.OrderType);
                                        if (saveResult.code == "2019033001")
                                        {
                                            throw new MessageException("2019033001", parm: new[] { objHeader.OrderNbr, saveResult.errorMsg });
                                        }
                                        else if (saveResult.errorMsg != "")
                                        {
                                            throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + saveResult.errorMsg });
                                        }
                                        else if (saveResult.code != "")
                                        {
                                            throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMessage(saveResult) });
                                        }
                                    }
                                    if (!string.IsNullOrWhiteSpace(saveResult.errorMsg))
                                    {
                                        messMinPrice = "Đơn hàng " + objHeader.OrderNbr + ": " + Util.PassNull(saveResult.errorMsg);
                                    }
                                }
                                catch (Exception ex1)
                                {

                                    eBiz4DApp.clsOM_PDASalesOrd pdaOrd = new eBiz4DApp.clsOM_PDASalesOrd(dal);
                                    eBiz4DApp.clsOM_PDASalesOrdDet pdaOrdDet = new eBiz4DApp.clsOM_PDASalesOrdDet(dal);
                                    pdaOrd.GetByKey(objHeader.BranchID, objHeader.OrderNbr);
                                    if (pdaOrd.Status != oldStatus)
                                    {
                                        pdaOrd.Status = oldStatus;
                                        pdaOrd.LUpd_Prog = _screenNbr;
                                        pdaOrd.LUpd_DateTime = DateTime.Now;
                                        pdaOrd.LUpd_User = Current.UserName;
                                        pdaOrd.Update();
                                        foreach (var obj in lstAllDet)
                                        {
                                            pdaOrdDet.GetByKey(objHeader.BranchID, obj.OrderNbr, obj.LineRef);
                                            if (pdaOrdDet.LineRef != "")
                                            {
                                                pdaOrdDet.Qty = 0;
                                                pdaOrdDet.SiteID = obj.SiteID;
                                                if (pdaOrdDet.FreeItem)
                                                {
                                                    pdaOrdDet.QtyShip = 0;
                                                }
                                                pdaOrdDet.Update();
                                            }
                                        }
                                    }
                                    MessageException msg = ex1 as MessageException;
                                    DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromo, "", msg != null && msg.Code == "2019033001", objHeader.OrderType);
                                    throw ex1;
                                }
                                #endregion
                            }
                            else
                            {
                                dal.RollbackTrans();
                                RollbackOrder(_lstPDADet, _lstPDAOrdDisc);
                            }
                        }
                        catch (Exception ex)
                        {
                            dal.RollbackTrans();
                            RollbackOrder(_lstPDADet, _lstPDAOrdDisc);
                            if (ex is MessageException)
                            {
                                throw ex;
                            }
                            else
                            {
                                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + ex.ToString() });
                            }
                        }
                        #endregion
                    }
                    else
                    {
                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " " + GetMess(301, null) });
                    }
                }
                else
                {
                    #region -Lưu tạm để tính KM-
                    var totalDetLineAmt = 0.0;
                    string siteError = string.Empty;
                    //status don hang trước khi update           

                    //var lstDetOrNbr = lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr).ToList();
                    foreach (var obj in lstDet)
                    {
                        if (obj.LineRef.Split(',').Length > 1)
                        {
                            string Code = obj.LineRef.Split(',')[0];
                            var objOM_PDASalesOrdDisc = _db.OM_PDASalesOrdDisc.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == obj.OrderNbr && p.Type == "02" && p.Code == Code && p.InvtID == "");
                            if (objOM_PDASalesOrdDisc != null)
                            {
                                objOM_PDASalesOrdDisc.QtyHist = objOM_PDASalesOrdDisc.QtyHist == 0 ? objOM_PDASalesOrdDisc.Qty : objOM_PDASalesOrdDisc.QtyHist;
                                objOM_PDASalesOrdDisc.Qty = obj.Qty;
                                objOM_PDASalesOrdDisc.OrdQty = obj.Qty;
                                objOM_PDASalesOrdDisc.LUpd_DateTime = DateTime.Now;
                                objOM_PDASalesOrdDisc.LUpd_Prog = "OM20500";
                                objOM_PDASalesOrdDisc.LUpd_User = Current.UserName;
                            }
                        }
                        else
                        {
                            var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == obj.OrderNbr && p.LineRef == obj.LineRef);
                            objOrdDet.Qty = obj.Qty;
                            // Điểm thưởng
                            objOrdDet.Mark = obj.Mark.HasValue ? obj.Mark.Value : 0;
                            objOrdDet.LUpd_Datetime = DateTime.Now;
                            objOrdDet.LUpd_Prog = "OM20500";
                            objOrdDet.LUpd_User = Current.UserName;

                            objOrdDet.DiscID1 = obj.DiscID;
                            if (primarySiteID != string.Empty)
                            {
                                if (objOrdDet.SiteID != primarySiteID && objOrdDet.SiteID != promoSiteID)
                                {
                                    objOrdDet.SiteID = objOrdDet.FreeItem == true ? promoSiteID : primarySiteID;
                                }
                            }
                            if (objOrdDet != null)
                            {
                                string key = obj.InvtID + objOrdDet.SiteID;
                                if (!_lstItemSite.ContainsKey(key))
                                {
                                    GetIN_ItemSite(obj.InvtID, objOrdDet.SiteID);
                                }
                                _lstItemSite[key] -= objOrdDet.LineQty * objOrdDet.UnitRate;
                                if (_lstItemSite[key] < 0)
                                {
                                    siteError += obj.InvtID + "-" + objOrdDet.SiteID + ", ";
                                }
                            }
                        }
                        double qty = objHeader.EditColumn.Split(',')[0] == "QtyShip" ? obj.QtyShip : obj.Qty;
                        if (qty > 0)
                        {
                            if (obj.FreeItem && objApproveConfig == "1") continue;

                            obj.LineRef = obj.LineRef.Split(',').Length > 1 ? obj.LineRef + "," + obj.SiteID : obj.LineRef;
                            if (!dicRef.Any(x => x.Key == obj.LineRef))
                            {
                                dicRef.Add(obj.LineRef, qty);
                            }
                        }
                        else if (obj.LineQty > 0)
                        {
                            calcDisc = true;
                        }
                        if (obj.LineQty != qty)
                        {
                            calcDisc = true;
                        }
                        totalDetLineAmt += obj.LineAmt;
                    }

                    if (siteError != string.Empty)
                    {
                        throw new MessageException(MessageType.Message, "2019082860", "", new[] { objHeader.OrderNbr, siteError });
                    }

                    if ((string.IsNullOrWhiteSpace(objOrd.CustOrderNbr) && string.IsNullOrWhiteSpace(objOrd.PONbr) && objOrd.DoNotCalDisc == 1) && objOrd.VolDiscAmt + objOrd.OrdDiscAmt > totalDetLineAmt) // Giá trị đơn hàng nhỏ hơn tiền KM nên ko đc duyệt
                    {
                        string messString = GetMess(2016011802, null);
                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " " + messString });
                    }
                    if (lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count() != lstAllDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count())
                    {
                        foreach (var item in lstDet)
                        {
                            if (item.FreeItem == false)
                            {
                                calcDisc = true;
                                break;
                            }
                        }
                    }
                    // (objOrd.DoNotCalDisc == 1 && objOrd.Crtd_Prog == "OM10100"): Nếu import từ OM10100 thì ko tính lại KM
                    // Nếu đơn từ PO10200 thì tính lại KM
                    objOrd.DoNotCalDisc = objOrd.DoNotCalDisc = objHeader.ForceCalcPromo == true ? "0".ToShort() : "1".ToShort();
                    if (objOrd.DoNotCalDisc == 1)
                    {
                        foreach (var item in lstFreeDet)
                        {
                            if (item.QtyShip > 0 && item.DiscCode == "" && item.DisplayID == "")
                            {
                                item.LineRef = item.LineRef.Split(',').Length > 1 ? item.LineRef + "," + item.SiteID : item.LineRef;
                                if (!dicRef.Any(x => x.Key == item.LineRef))
                                {
                                    dicRef.Add(item.LineRef, item.QtyShip);
                                }
                                lstDet.Add(item);
                            }
                            var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == item.OrderNbr && p.LineRef == item.LineRef);
                            objOrdDet.Qty = item.Qty;
                            objOrdDet.LUpd_Datetime = DateTime.Now;
                            objOrdDet.LUpd_Prog = "OM20500";
                            objOrdDet.LUpd_User = Current.UserName;
                        }
                    }
                    _db.SaveChanges();
                    #endregion

                    #region -Calc Promo Only-

                    try
                    {
                        OM om = new OM(Current.UserName, _screenNbr, dal);
                        om.IsAllManualPromoOrDisplay = isAllManualPromoOrDisplay;
                        dal.BeginTrans(IsolationLevel.ReadCommitted);
                        if (om.OM20500_ReleaseNew(objHeader.BranchID, objHeader.OrderNbr, dicRef, Delivery, dteShipDate, dteARDocDate, isAddStock, objHeader.RemarkOrd, false, out OMOrderNbr, calcPromoOnly))
                        {
                            dal.CommitTrans();
                            SaveRewardAmt(objHeader, OMOrderNbr);
                            string outOfbudget = string.Empty;
                            string outOfSite = string.Empty;
                            var enoughtManualDisc = SaveOrdManual(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, OMOrderNbr, dicRef, true, isAllManualPromoOrDisplay, out outOfbudget, out outOfSite);
                            #region - // Goi OM10100 tinh khuyen mai -
                            int calcPromoOny = 0;
                            OM10100.Controllers.OM10100Controller ObjOM10100 = new OM10100.Controllers.OM10100Controller();
                            try
                            {
                                var objResult = ObjOM10100.SaveOM20500(objHeader.BranchID, OMOrderNbr, lstChoice, 1, false, objHeader.OrderType, qtyChange) as JsonResult;
                                if (objResult.Data.GetType().GetProperty("choice") != null)
                                {
                                    DeleteOM20500(objHeader.BranchID, OMOrderNbr, 1, "", false, objHeader.OrderType);
                                    return objResult;
                                }
                                else if (objResult.Data.GetType().GetProperty("CalcPromoOnly") != null)
                                {
                                    calcPromoOny = 1;
                                }
                                var json = JsonConvert.SerializeObject(objResult.Data);
                                var saveResult = JsonConvert.DeserializeObject<RootObject>(json);
                                if (saveResult.code != "9999")
                                {
                                    DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromoOny, saveResult.code, false, objHeader.OrderType);
                                    if (saveResult.errorMsg != "")
                                    {
                                        _db.OM20500_ppUpdateAfterError(objHeader.BranchID, objHeader.OrderNbr, oldStatus, Current.UserName, Current.CpnyID, Current.LangID);
                                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + saveResult.errorMsg });
                                    }
                                    else if (saveResult.code != "")
                                    {
                                        _db.OM20500_ppUpdateAfterError(objHeader.BranchID, objHeader.OrderNbr, oldStatus, Current.UserName, Current.CpnyID, Current.LangID);
                                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMessage(saveResult) });
                                    }
                                }
                                else
                                {
                                    if (calcPromoOny == 1)
                                    {
                                        eBiz4DApp.clsOM_PDASalesOrdDet pdaOrdDet = new eBiz4DApp.clsOM_PDASalesOrdDet(dal);
                                        DataTable lstPDDet = pdaOrdDet.GetAll(branchID, objHeader.OrderNbr, "%");
                                        for (int idx = 0; idx < lstPDDet.Rows.Count; idx++)
                                        {
                                            pdaOrdDet.GetByKey(objHeader.BranchID, objHeader.OrderNbr, lstPDDet.Rows[idx]["LineRef"].PassNull());
                                            if (pdaOrdDet.LineRef != "" && pdaOrdDet.Qty != 0)
                                            {
                                                pdaOrdDet.Qty = 0;
                                                if (pdaOrdDet.FreeItem)
                                                {
                                                    pdaOrdDet.QtyShip = 0;
                                                }
                                                pdaOrdDet.Update();
                                            }
                                        }
                                        InsertPO(objOrd, OMOrderNbr, objHeader, totalDetLineAmt);
                                        DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromoOny, saveResult.code, false, objHeader.OrderType);
                                        // Handle save data
                                    }
                                }
                                if (!string.IsNullOrWhiteSpace(saveResult.errorMsg))
                                {
                                    messMinPrice = "Đơn hàng " + objHeader.OrderNbr + ": " + Util.PassNull(saveResult.errorMsg);
                                }
                            }
                            catch (Exception ex1)
                            {
                                DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromoOny, "", false, objHeader.OrderType);
                                throw ex1;
                            }
                            #endregion
                        }
                        else
                        {
                            dal.RollbackTrans();
                        }
                    }
                    catch (Exception ex)
                    {
                        _db.OM20500_ppUpdateAfterError(objHeader.BranchID, objHeader.OrderNbr, oldStatus, Current.UserName, Current.CpnyID, Current.LangID);
                        dal.RollbackTrans();
                        if (ex is MessageException)
                        {
                            throw ex;
                        }
                        else
                        {
                            throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + ex.ToString() });
                        }
                    }
                    #endregion
                }
                return Json(new { success = true, message = "", messMinPrice = messMinPrice }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    MessageException msg = ex as MessageException;
                    if (msg.Code == "2019033001" && budgetStatus != 2)
                    {
                        RollbackOrder(_lstPDADet, _lstPDAOrdDisc);
                        if (msg.Parm[1].Contains("@@"))
                        {
                            string[] lstParam = msg.Parm[1].Split(new string[] { "@@" }, StringSplitOptions.None);
                            if (lstParam[0] == "")
                            {
                                if (lstParam[1] != "")
                                {
                                    msg.Parm[1] = lstParam[1];
                                    return Json(new { success = true, messageCode = "2019033001", askOrderNbr = msg.Parm[0], message = GetMess(2019033004, msg.Parm) });
                                }
                            }
                            else
                            {
                                msg.Parm[1] = lstParam[0] + ", " + GetMess(2019033003, new string[] { lstParam[1] });
                            }
                        }
                        return Json(new { success = true, messageCode = "2019033001", askOrderNbr = msg.Parm[0], message = GetMess(Convert.ToInt32(msg.Code), msg.Parm) });
                    }
                    else
                    {
                        return Json(new { success = true, message = GetMess(Convert.ToInt32(msg.Code), msg.Parm) });
                    }
                }
                else if (ex is System.Data.SqlClient.SqlException || ex.ToString().Contains("deadlocked on lock resources"))
                {
                    return Json(new { success = true, message = GetMess(2017110301, null) });
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }

        }

        [HttpPost]
        public ActionResult SaveToW(FormCollection data, bool calcPromoOnly, bool confirmed, int calcID, bool isAllManualPromoOrDisplay, int budgetStatus, bool isApproveAll, bool qtyChange = false)
        {
            DataAccess dal = Util.Dal();
            try
            {
                #region -Head-
                var detHeader = new StoreDataHandler(data["lstOrder"]);
                var objHeader = detHeader.ObjectData<OM20500_pgOrder_Result>().Where(p => p.Selected == true).FirstOrDefault();
                var detHandler = new StoreDataHandler(data["lstDet"]);
                var messMinPrice = string.Empty;
                var branchID = objHeader.BranchID;
                var docHandler = new StoreDataHandler(data["lstDoc"]);
                var lstDoc = docHandler.ObjectData<OM20500_pgDoc_Result>().Where(x => x.DocBranchID == branchID).ToList();
                var choiceHandler = new StoreDataHandler(data["lstChoice"]);
                var lstChoice = choiceHandler.ObjectData<OM10100.Controllers.OM10100Controller.DiscountChoice>().ToList();
                var objBranchDelivery = _db.OM20500_pdBranchDelivery(Current.UserName, branchID, Current.LangID).FirstOrDefault();
                string objApproveConfig = _db.OM20500_pdApproveConfig(Current.UserName, branchID, Current.LangID).FirstOrDefault();
                var isHO = objBranchDelivery != null && objBranchDelivery.IsHO == true;
                string Delivery = data["delivery"];
                DateTime dteShipDate = data["shipDate"].ToDateShort();
                DateTime dteARDocDate = data["aRDocDate"].ToDateShort();
                bool isAddStock = data["isAddStock"].ToBool();
                List<OM20500_pgDet_Result> lstAllDet = new List<OM20500_pgDet_Result>();
                if (objHeader.IsSelected == true)
                {
                    lstAllDet = detHandler.ObjectData<OM20500_pgDet_Result>().ToList();
                }
                if (calcPromoOnly)
                {
                    objHeader.ToStatus = objHeader.Status;
                }
                var objHeaderDB = _db.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == objHeader.OrderNbr);
                _objOrd = objHeaderDB;
                if (budgetStatus != 2 && (objHeaderDB == null || objHeader.tstamp.ToHex() != objHeaderDB.tstamp.ToHex()) && lstChoice.Count == 0)//lstChoice.Count > 0 &&
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " dữ liệu đã bị thay đổi một chương trình khác!" });
                }

                #region -data-
                // Nếu detail chưa đc load thì lấy ở db            
                if (lstAllDet.Count == 0 || objHeader.IsSelected == false)
                {
                    lstAllDet = GetDetNotSelect(branchID, objHeader);
                }
                var lstDet = lstAllDet.Where(p => p.Selected == true).ToList();
                //ConvertPDADet(lstDet, objHeader);
                var lstDetOM10100 = ConvertPDADet(lstDet, objHeader);
                var error = true;
                foreach (var item in lstAllDet)
                {
                    if (item.Selected == true && (item.FreeItem == false || !string.IsNullOrWhiteSpace(item.DiscCode) || !string.IsNullOrWhiteSpace(item.DisplayID)))
                    {
                        error = false;
                        break;
                    }
                }
                if (error)
                {
                    throw new MessageException(MessageType.Error, "2018012403", parm: new[] { objHeader.OrderNbr });
                }
                #endregion

                var lstFreeDet = lstAllDet.Where(p => p.FreeItem == true && string.IsNullOrWhiteSpace(p.DisplayID)).ToList();
                string OMOrderNbr = "";
                Dictionary<string, double> dicRef = new Dictionary<string, double>();
                bool calcDisc = false;
                CheckConfig(objHeader);

                var _objIN = _db.IN_Setup.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.SetupID == "IN");
                if (_objIN == null)
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(20404, new string[] { "IN_Setup" }) + "</br>" });
                }

                var objCust = _db.AR_Customer.FirstOrDefault(p => p.CustId == objHeader.CustID && p.BranchID == objHeader.BranchID);
                if (objCust == null)
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(2015032701, new string[] { objHeader.CustID }) + "</br>" });
                }
                string primarySiteID = string.Empty;
                string promoSiteID = string.Empty;
                var objOrd = _db.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == objHeader.OrderNbr);
                if (objOrd != null)
                {
                    UpdateOM_PDASalesOrd(objHeader, ref objOrd);
                    UpdatePrimarySitePromoSite(objHeader, branchID, lstDet, ref primarySiteID, ref promoSiteID, objOrd.OrderType);
                }
                else
                {
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(8012, new string[] { objHeader.OrderNbr }) + "</br>" });
                }
                string oldStatus = objOrd.Status;
                #endregion



                #region -Lưu tạm để tính KM-
                var totalDetLineAmt = 0.0;
                string siteError = string.Empty;
                //status don hang trước khi update           

                //var lstDetOrNbr = lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr).ToList();
                foreach (var obj in lstDet)
                {
                    if (obj.LineRef.Split(',').Length > 1)
                    {
                        string Code = obj.LineRef.Split(',')[0];
                        var objOM_PDASalesOrdDisc = _db.OM_PDASalesOrdDisc.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == obj.OrderNbr && p.Type == "02" && p.Code == Code && p.InvtID == "");
                        if (objOM_PDASalesOrdDisc != null)
                        {
                            objOM_PDASalesOrdDisc.QtyHist = objOM_PDASalesOrdDisc.QtyHist == 0 ? objOM_PDASalesOrdDisc.Qty : objOM_PDASalesOrdDisc.QtyHist;
                            objOM_PDASalesOrdDisc.Qty = obj.Qty;
                            objOM_PDASalesOrdDisc.OrdQty = obj.Qty;
                            objOM_PDASalesOrdDisc.LUpd_DateTime = DateTime.Now;
                            objOM_PDASalesOrdDisc.LUpd_Prog = "OM20500";
                            objOM_PDASalesOrdDisc.LUpd_User = Current.UserName;
                        }
                    }
                    else
                    {
                        var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == obj.OrderNbr && p.LineRef == obj.LineRef);
                        objOrdDet.Qty = obj.Qty;
                        // Điểm thưởng
                        objOrdDet.Mark = obj.Mark.HasValue ? obj.Mark.Value : 0;
                        objOrdDet.LUpd_Datetime = DateTime.Now;
                        objOrdDet.LUpd_Prog = "OM20500";
                        objOrdDet.LUpd_User = Current.UserName;

                        objOrdDet.DiscID1 = obj.DiscID;
                        if (primarySiteID != string.Empty)
                        {
                            if (objOrdDet.SiteID != primarySiteID && objOrdDet.SiteID != promoSiteID)
                            {
                                objOrdDet.SiteID = objOrdDet.FreeItem == true ? promoSiteID : primarySiteID;
                            }
                        }

                        if (objOrdDet != null)
                        {
                            string key = obj.InvtID + objOrdDet.SiteID;
                            if (!_lstItemSite.ContainsKey(key))
                            {
                                GetIN_ItemSite(obj.InvtID, objOrdDet.SiteID);
                            }
                            _lstItemSite[key] -= objOrdDet.LineQty * objOrdDet.UnitRate;
                            if (_lstItemSite[key] < 0)
                            {
                                siteError += obj.InvtID + "-" + objOrdDet.SiteID + ", ";
                            }
                        }
                    }
                    double qty = objHeader.EditColumn.Split(',')[0] == "QtyShip" ? obj.QtyShip : obj.Qty;
                    if (qty > 0)
                    {
                        if (obj.FreeItem && objApproveConfig == "1") continue;

                        obj.LineRef = obj.LineRef.Split(',').Length > 1 ? obj.LineRef + "," + obj.SiteID : obj.LineRef;
                        if (!dicRef.Any(x => x.Key == obj.LineRef))
                        {
                            dicRef.Add(obj.LineRef, qty);
                        }
                    }
                    else if (obj.LineQty > 0)
                    {
                        calcDisc = true;
                    }
                    if (obj.LineQty != qty)
                    {
                        calcDisc = true;
                    }
                    totalDetLineAmt += obj.LineAmt;
                }
                if (siteError != string.Empty)
                {
                    throw new MessageException(MessageType.Message, "2019082860", "", new[] { objHeader.OrderNbr, siteError });
                }

                if ((string.IsNullOrWhiteSpace(objOrd.CustOrderNbr) && string.IsNullOrWhiteSpace(objOrd.PONbr) && objOrd.DoNotCalDisc == 1) && objOrd.VolDiscAmt + objOrd.OrdDiscAmt > totalDetLineAmt) // Giá trị đơn hàng nhỏ hơn tiền KM nên ko đc duyệt
                {
                    string messString = GetMess(2016011802, null);
                    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " " + messString });
                }
                if (lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count() != lstAllDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count())
                {
                    foreach (var item in lstDet)
                    {
                        if (item.FreeItem == false)
                        {
                            calcDisc = true;
                            break;
                        }
                    }
                }
                // (objOrd.DoNotCalDisc == 1 && objOrd.Crtd_Prog == "OM10100"): Nếu import từ OM10100 thì ko tính lại KM
                // Nếu đơn từ PO10200 thì tính lại KM
                objOrd.DoNotCalDisc = objOrd.DoNotCalDisc = objHeader.ForceCalcPromo == true ? "0".ToShort() : "1".ToShort();
                if (objOrd.DoNotCalDisc == 1)
                {
                    foreach (var item in lstFreeDet)
                    {
                        if (item.QtyShip > 0 && item.DiscCode == "" && item.DisplayID == "")
                        {
                            item.LineRef = item.LineRef.Split(',').Length > 1 ? item.LineRef + "," + item.SiteID : item.LineRef;
                            if (!dicRef.Any(x => x.Key == item.LineRef))
                            {
                                dicRef.Add(item.LineRef, item.QtyShip);
                            }
                            lstDet.Add(item);
                        }
                        var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.OrderNbr == item.OrderNbr && p.LineRef == item.LineRef);
                        objOrdDet.Qty = item.Qty;
                        objOrdDet.LUpd_Datetime = DateTime.Now;
                        objOrdDet.LUpd_Prog = "OM20500";
                        objOrdDet.LUpd_User = Current.UserName;
                    }
                }
                _db.SaveChanges();
                #endregion

                #region -Calc Promo Only-

                try
                {
                    SaveRewardAmt(objHeader, OMOrderNbr);
                    string outOfbudget = string.Empty;
                    string outOfSite = string.Empty;
                    var enoughtManualDisc = SaveOrdManual(objHeader.BranchID, objHeader.OrderNbr, objHeader.SlsPerID, OMOrderNbr, dicRef, true, isAllManualPromoOrDisplay, out outOfbudget, out outOfSite);
                    #region - // Goi OM10100 tinh khuyen mai -
                    int calcPromoOny = 0;
                    if (objHeader.ForceCalcPromo == true)
                    {
                        calcPromoOny = 1;
                    }
                    else
                    {
                        calcPromoOny = 3;
                    }
                    OM10100.Controllers.OM10100Controller ObjOM10100 = new OM10100.Controllers.OM10100Controller();
                    try
                    {

                        var objHeaderOM10100 = ConvertPDAOrder(objHeader);

                        var objResult = ObjOM10100.SaveOM20500ToW(objHeaderOM10100, lstDetOM10100, lstChoice, calcPromoOny, false, qtyChange) as JsonResult;
                        if (objResult.Data.GetType().GetProperty("choice") != null)
                        {
                            DeleteOM20500(objHeader.BranchID, OMOrderNbr, 1, "", false, objHeader.OrderType);
                            return objResult;
                        }
                        else if (objResult.Data.GetType().GetProperty("CalcPromoOnly") != null)
                        {
                            calcPromoOny = 1;
                        }
                        var json = JsonConvert.SerializeObject(objResult.Data);
                        var saveResult = JsonConvert.DeserializeObject<RootObject>(json);
                        if (saveResult.code != "9999")
                        {
                            DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromoOny, saveResult.code, false, objHeader.OrderType);
                            if (saveResult.errorMsg != "")
                            {
                                _db.OM20500_ppUpdateAfterError(objHeader.BranchID, objHeader.OrderNbr, oldStatus, Current.UserName, Current.CpnyID, Current.LangID);
                                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + saveResult.errorMsg });
                            }
                            else if (saveResult.code != "")
                            {
                                _db.OM20500_ppUpdateAfterError(objHeader.BranchID, objHeader.OrderNbr, oldStatus, Current.UserName, Current.CpnyID, Current.LangID);
                                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMessage(saveResult) });
                            }
                        }
                        else
                        {
                            if (calcPromoOny == 1)
                            {
                                eBiz4DApp.clsOM_PDASalesOrdDet pdaOrdDet = new eBiz4DApp.clsOM_PDASalesOrdDet(dal);
                                DataTable lstPDDet = pdaOrdDet.GetAll(branchID, objHeader.OrderNbr, "%");
                                for (int idx = 0; idx < lstPDDet.Rows.Count; idx++)
                                {
                                    pdaOrdDet.GetByKey(objHeader.BranchID, objHeader.OrderNbr, lstPDDet.Rows[idx]["LineRef"].PassNull());
                                    if (pdaOrdDet.LineRef != "" && pdaOrdDet.Qty != 0)
                                    {
                                        if (pdaOrdDet.FreeItem)
                                        {
                                            pdaOrdDet.QtyShip = 0;
                                        }
                                        pdaOrdDet.Update();
                                    }
                                }
                                InsertPO(objOrd, OMOrderNbr, objHeader, totalDetLineAmt);
                                DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromoOny, saveResult.code, false, objHeader.OrderType);
                                // Handle save data
                            }
                        }
                        if (!string.IsNullOrWhiteSpace(saveResult.errorMsg))
                        {
                            messMinPrice = "Đơn hàng " + objHeader.OrderNbr + ": " + Util.PassNull(saveResult.errorMsg);
                        }
                    }
                    catch (Exception ex1)
                    {
                        DeleteOM20500(objHeader.BranchID, OMOrderNbr, calcPromoOny, "", false, objHeader.OrderType);
                        throw ex1;
                    }
                    #endregion
                }
                catch (Exception ex)
                {
                    _db.OM20500_ppUpdateAfterError(objHeader.BranchID, objHeader.OrderNbr, oldStatus, Current.UserName, Current.CpnyID, Current.LangID);
                    dal.RollbackTrans();
                    if (ex is MessageException)
                    {
                        throw ex;
                    }
                    else
                    {
                        throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + ex.ToString() });
                    }
                }
                #endregion

                return Json(new { success = true, message = "", messMinPrice = messMinPrice }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    MessageException msg = ex as MessageException;
                    if (msg.Code == "2019033001" && budgetStatus != 2)
                    {
                        RollbackOrder(_lstPDADet, _lstPDAOrdDisc);
                        if (msg.Parm[1].Contains("@@"))
                        {
                            string[] lstParam = msg.Parm[1].Split(new string[] { "@@" }, StringSplitOptions.None);
                            if (lstParam[0] == "")
                            {
                                if (lstParam[1] != "")
                                {
                                    msg.Parm[1] = lstParam[1];
                                    return Json(new { success = true, messageCode = "2019033001", askOrderNbr = msg.Parm[0], message = GetMess(2019033004, msg.Parm) });
                                }
                            }
                            else
                            {
                                msg.Parm[1] = lstParam[0] + ", " + GetMess(2019033003, new string[] { lstParam[1] });
                            }
                        }
                        return Json(new { success = true, messageCode = "2019033001", askOrderNbr = msg.Parm[0], message = GetMess(Convert.ToInt32(msg.Code), msg.Parm) });
                    }
                    else
                    {
                        return Json(new { success = true, message = GetMess(Convert.ToInt32(msg.Code), msg.Parm) });
                    }
                }
                else if (ex is System.Data.SqlClient.SqlException || ex.ToString().Contains("deadlocked on lock resources"))
                {
                    return Json(new { success = true, message = GetMess(2017110301, null) });
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }

        }

        private List<OM10100_pgOrderDet_Result> ConvertPDADet(List<OM20500_pgDet_Result> lstPDADet, OM20500_pgOrder_Result obj)
        {


            var lstOM = new List<OM10100_pgOrderDet_Result>();
            foreach (var item in lstPDADet)
            {
                if (item.FreeItem == false)
                {
                    var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == obj.BranchID && p.OrderNbr == obj.OrderNbr && p.LineRef == item.LineRef);
                    var record = new OM10100_pgOrderDet_Result();
                    record.ResetET();
                    //Common.Update(record, item, false, null);
                    record.BranchID = obj.BranchID;
                    record.OrderNbr = "";
                    record.BOType = "S";
                    record.OrigOrderNbr = item.OrderNbr;
                    record.OrderType = obj.OrderType;
                    record.LineQty = item.QtyShip;
                    record.LineRef = item.LineRef;
                    record.BOCustID = "";
                    record.BarCode = "";
                    record.CostID = "";
                    record.ShipStatus = "";
                    record.InvtID = item.InvtID;
                    record.SiteID = item.SiteID;
                    record.ItemPriceClass = "";
                    record.TaxCat = item.TaxCat;
                    record.TaxAmt00 = item.TaxAmt00;
                    record.TaxAmt01 = item.TaxAmt01;
                    record.TaxAmt02 = item.TaxAmt02;
                    record.TaxAmt03 = item.TaxAmt03;
                    record.TxblAmt00 = item.TxblAmt00;
                    record.TxblAmt01 = item.TxblAmt01;
                    record.TxblAmt02 = item.TxblAmt02;
                    record.TxblAmt03 = item.TxblAmt03;
                    record.DumyLineQty = item.LineQty;
                    record.DumyLineAmt = item.LineAmt;
                    record.TaxID = item.TaxID;
                    record.TaxId00 = item.TaxID00;
                    record.TaxId01 = item.TaxID01;
                    record.TaxId02 = item.TaxID02;
                    record.TaxId03 = item.TaxID03;
                    record.FreeItem = item.FreeItem;
                    record.FreeItemQty1 = item.FreeItem == true ? record.LineQty : 0;
                    record.FreeItemQty2 = item.FreeItem == true ? record.LineQty : 0;
                    record.QtyOpenShip = 0;
                    record.QtyShip = item.QtyShip;
                    record.QtyInvc = 0;
                    record.QtyBO = 0;
                    record.SlsUnit = item.SlsUnit;


                    record.UnitWeight = item.UnitWeight;
                    record.SlsPrice = item.SlsPrice;
                    record.LineAmt = item.LineAmt;
                    record.SOFee = item.SOFee;
                    record.Descr = item.Descr;
                    record.BudgetID1 = item.BudgetID1;
                    record.BudgetID2 = item.BudgetID2;
                    record.DiscPct = item.DiscPct;
                    record.DiscPct1 = item.DiscPct1;
                    record.DiscPct2 = item.DiscPct2;
                    record.DiscCode = item.DiscCode;
                    record.DiscID1 = item.DiscID1;
                    record.DiscID2 = item.DiscID2;
                    record.DiscSeq1 = item.DiscSeq1;
                    record.DiscSeq2 = item.DiscSeq2;
                    record.DiscAmt = item.DiscAmt;
                    record.DiscAmt1 = item.DiscAmt1;
                    record.DiscAmt2 = item.DiscAmt2;
                    record.DocDiscAmt = item.DocDiscAmt;
                    record.GroupDiscPct1 = item.GroupDiscPct1;
                    record.GroupDiscPct2 = item.GroupDiscPct2;
                    record.GroupDiscID1 = item.GroupDiscID1;
                    record.GroupDiscID2 = item.GroupDiscID2;
                    record.GroupDiscSeq1 = item.GroupDiscSeq1;
                    record.GroupDiscSeq2 = item.GroupDiscSeq2;
                    record.GroupDiscAmt1 = item.GroupDiscAmt1;
                    record.GroupDiscAmt2 = item.GroupDiscAmt2;
                    record.Mark = item.Mark;
                    record.MMark = item.MMark.ToDouble();
                    record.POSM = item.POSM;
                    record.ClassID = item.ClassID;
                    record.DisplayID = item.DisplayID;
                    record.DisplayPeriodID = item.DisplayPeriodID;
                    record.WhseLoc = "";
                    if (objOrdDet != null)
                    {
                        record.StkQty = objOrdDet.UnitMultDiv == "D" ? item.QtyShip / objOrdDet.UnitRate : item.QtyShip * objOrdDet.UnitRate;
                        record.UnitMultDiv = objOrdDet.UnitMultDiv;
                        record.UnitRate = objOrdDet.UnitRate;
                        record.StkPrice = objOrdDet.UnitMultDiv == "D" ? item.SlsPrice / objOrdDet.UnitRate : item.SlsPrice * objOrdDet.UnitRate;
                    }
                    record.StkItem = item.StkItem;
                    record.StkWt = item.StkWt;
                    record.StkUnit = item.StkUnit;
                    record.ManuDiscAmt = item.ManuDiscAmt;
                    record.ManuDiscPct = item.ManuDiscPct;
                    lstOM.Add(record);
                }
            }
            return lstOM;
        }
        private OM10100_pcOrder_Result ConvertPDAOrder(OM20500_pgOrder_Result obj)
        {
            var objOrder = new OM10100_pcOrder_Result();
            objOrder.ResetET();

            objOrder.Remark = obj.Remark;
            objOrder.BranchID = obj.BranchID;
            objOrder.OrderNbr = "";
            objOrder.CmmnPct = 0;
            objOrder.CustID = obj.CustID;
            objOrder.DoNotCalDisc = 0;
            objOrder.ExpiryDate = obj.OrderDate;
            objOrder.FreightAllocAmt = 0;
            objOrder.FreightAmt = 0;
            objOrder.FreightCost = 0;
            objOrder.InvcNbr = obj.InvcNbr;
            objOrder.InvcNote = obj.InvcNote;
            objOrder.IssueNumber = 0;
            objOrder.LineAmt = 0;
            objOrder.LineDiscAmt = 0;
            objOrder.MiscAmt = 0;
            objOrder.NoteId = 0;
            objOrder.OrdAmt = obj.OrdAmt;
            objOrder.OrdDiscAmt = obj.OrdDiscAmt;
            objOrder.OrderDate = obj.OrderDate;
            objOrder.OrderType = "IN";
            objOrder.OrderWeight = 0;
            objOrder.OrdQty = obj.OrdQty;
            objOrder.OrigOrderNbr = obj.OrderNbr;
            objOrder.ShiftID = obj.ShiftID;
            objOrder.ShipDate = obj.ShipDate;
            objOrder.ShipPriority = "A";
            objOrder.SlsPerID = obj.SlsPerID;
            objOrder.Status = obj.Status;
            objOrder.StatusDescr = "";

            objOrder.TaxAmtTot00 = 0;
            objOrder.TaxAmtTot01 = 0;
            objOrder.TaxAmtTot02 = 0;
            objOrder.TaxAmtTot03 = 0;
            objOrder.Terms = "07";
            objOrder.TxblAmtTot00 = 0;
            objOrder.TxblAmtTot01 = 0;
            objOrder.TxblAmtTot02 = 0;
            objOrder.TxblAmtTot03 = 0;
            objOrder.UnitsShipped = 0;
            objOrder.VolDiscAmt = obj.VolDiscAmt;
            objOrder.VolDiscPct = 0;
            objOrder.CreditHold = false;
            objOrder.OrderNo = 0;
            objOrder.PriceClassID = obj.PriceClassID;
            objOrder.LTTContractNbr = "";
            objOrder.Addr1 = obj.Addr1;
            objOrder.CustName = "";
            objOrder.RewardID = "";
            //objOrder.RewardAmt = "";
            objOrder.SalesMark = 0;
            objOrder.PromoMark = 0;
            objOrder.RowNum = 1;
            objOrder.TotalRecords = 1;
            objOrder.OrigOrderDate = obj.OrderDate;
            objOrder.ReturnFrom = "";
            objOrder.ManualDiscAmt = 0;
            objOrder.ManualDiscount = false;
            objOrder.ManualDiscPct = 0;

            return objOrder;
        }

        #region -Update data-
        private void UpdateAR_PDADoc(string orderNbr, string branchID, List<OM20500_pgDoc_Result> lstDoc)
        {
            var lstDocByOrdNbr = lstDoc.Where(x => x.OrdNbr == orderNbr && x.DocBranchID == branchID).ToList();
            foreach (var item in lstDocByOrdNbr)
            {
                var objPDADoc = _db.AR_PDADoc.FirstOrDefault(x => x.BranchID == item.DocBranchID
                        && x.BatNbr == item.BatNbr
                        && x.RefNbr == item.RefNbr
                        && x.OrdNbr == item.OrdNbr);
                if (objPDADoc != null)
                {
                    objPDADoc.DocBalApproved = item.DocBalApproved;
                    objPDADoc.LUpd_DateTime = DateTime.Now;
                    objPDADoc.LUpd_Prog = _screenNbr;
                    objPDADoc.LUpd_User = Current.UserName;
                }
            }
        }

        private void UpdateAR_Customer(string codeHT, ref AR_Customer objCust)
        {
            if (objCust != null && objCust.LTTContractNbr != codeHT)
            {
                objCust.LTTContractNbr = codeHT;
                objCust.LUpd_Datetime = DateTime.Now;
                objCust.LUpd_Prog = _screenNbr;
                objCust.LUpd_User = Current.UserName;
            }
        }

        private void UpdatePrimarySitePromoSite(OM20500_pgOrder_Result objHeader, string branchID, List<OM20500_pgDet_Result> lstDet, ref string primarySiteID, ref string promoSiteID, string orderType)
        {
            var lstDeliveryUnit = _db.OM20500_pcDeliveryUnit(Current.UserName, Current.CpnyID, Current.LangID).ToList();
            var deliUnit = lstDeliveryUnit.FirstOrDefault(x => x.Code == objHeader.DeliveryUnit);
            if (deliUnit != null && deliUnit.IsChangeSiteID == true)
            {
                if (deliUnit.CheckStock != branchID)
                {
                    var objUserDefault = _db.OM20500_pdOM_UserDefault(objHeader.BranchID, objHeader.SlsPerID, orderType, objHeader.OrderDate, deliUnit.CheckStock, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                    if (objUserDefault != null)
                    {
                        primarySiteID = objUserDefault.OMSite;
                        promoSiteID = objUserDefault.DiscSite;
                    }
                }
                else
                {
                    var objUserDefault = _db.OM20500_pdOM_UserDefault(objHeader.BranchID, objHeader.SlsPerID, orderType, objHeader.OrderDate, deliUnit.CheckStock, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                    if (objUserDefault != null)
                    {
                        var primarySite = objUserDefault.OMSite;
                        var promoSite = objUserDefault.DiscSite;
                        if (!lstDet.Any(p => p.OrderNbr == objHeader.OrderNbr && p.SiteID != primarySite && p.SiteID != promoSite))
                        {
                            primarySiteID = string.Empty;
                            promoSiteID = string.Empty;
                        }
                    }
                }
            }
        }

        private void UpdateOM_PDASalesOrd(OM20500_pgOrder_Result objHeader, ref OM_PDASalesOrd objOrd)
        {
            objOrd.RewardAmt = objHeader.RewardAmt.HasValue ? objHeader.RewardAmt.Value : 0; ;
            objOrd.InvcNbr = objHeader.InvcNbr;
            objOrd.InvcNote = objHeader.InvcNote;
            objOrd.DeliveryUnit = objHeader.DeliveryUnit;
            objOrd.InvcNbr = objHeader.InvcNbr;
            objOrd.InvcNote = objHeader.InvcNote;
            objOrd.RewardAmt = objHeader.RewardAmt.HasValue ? objHeader.RewardAmt.Value : 0;
            objOrd.ShipDate = objHeader.ShipDate;
            objOrd.ShiftID = objHeader.ShiftID;
            objOrd.PayMethod = objHeader.PayMethod;
            objOrd.PayType = objHeader.PayType;
            objOrd.LUpd_DateTime = DateTime.Now;
            objOrd.LUpd_Prog = _screenNbr;
            objOrd.LUpd_User = Current.UserName;
        }
        #endregion

        private void GetOM_PPAlloc(string budgetID, string freeItemID, string branchRouteID, string slsRouteID, string key)
        {
            if (!_lstBudget.ContainsKey(key))
            {
                var objBudget = _db.OM_PPAlloc.FirstOrDefault(x => x.BudgetID == budgetID && x.FreeItemID == freeItemID && x.CpnyID == branchRouteID && x.ObjID == slsRouteID);
                if (objBudget == null)
                {
                    objBudget = new OM_PPAlloc();
                }
                _lstBudget.Add(key, new clsOM_PPAlloc(objBudget.QtyAmtAvail, objBudget.QtyAmtSpent));
            }
        }
        private void GetOM_PPCpnyID(string budgetID, string freeItemID, string branchRouteID, string slsRouteID, string key)
        {
            if (!_lstBudget.ContainsKey(key))
            {
                var objBudget = _db.OM_PPCpny.FirstOrDefault(x => x.BudgetID == budgetID && x.FreeItemID == freeItemID && x.CpnyID == branchRouteID);
                if (objBudget == null)
                {
                    objBudget = new OM_PPCpny();
                }
                _lstBudget.Add(key, new clsOM_PPAlloc(objBudget.QtyAmtAvail, objBudget.QtyAmtSpent));
            }
        }
        private void DeleteOM20500(string branchID, string OMOrderNbr, int calcPromo, string messDisplayID, bool isNotEnoughBudgetOrSite, string orderType)
        {
            var ObjOM10100 = new OM10100.Controllers.OM10100Controller();
            ObjOM10100.DeleteOM20500(branchID, OMOrderNbr, calcPromo, messDisplayID, isNotEnoughBudgetOrSite, orderType);
        }

        [ValidateInput(false)]
        public ActionResult ClosePO(FormCollection data, string ReasonCode)
        {
            var lstOrderChangeHandler = new StoreDataHandler(data["lstOrderChange"]);
            var lstOrderChange = lstOrderChangeHandler.BatchObjectData<OM20500_pgOrder_Result>();
            var lstOrderNbrError = new List<string>();
            foreach (var orderChange in lstOrderChange.Updated)
            {
                if (orderChange.Selected == true)
                {
                    var order = _db.OM_PDASalesOrd.FirstOrDefault(x => x.OrderNbr == orderChange.OrderNbr
                        && x.BranchID == orderChange.BranchID
                        && (x.Status != "C"));
                    if (order != null)
                    {
                        var objRoute = _db.OM20500_pdGetBranchSalesRoute(orderChange.BranchID, orderChange.SlsPerID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                        if (objRoute != null)
                        {
                            // Lấy ngân sách đã dùng
                            var lstBudget = _db.OM20500_pdBudgetUsed(orderChange.BranchID, orderChange.OrderNbr, orderChange.Status, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                            // Tăng QtyOnPDA
                            foreach (var objOrdBudget in lstBudget)
                            {
                                if (objOrdBudget.BudgetID != string.Empty)
                                {
                                    var objBudget = _db.OM_PPAlloc.FirstOrDefault(x => x.BudgetID == objOrdBudget.BudgetID && x.FreeItemID == objOrdBudget.FreeItemID && x.CpnyID == objRoute.BranchRouteID && x.ObjID == objRoute.SalesRouteID);
                                    if (objBudget != null)
                                    {
                                        objBudget.QtyOnPDA = objBudget.QtyOnPDA - objOrdBudget.QtyAmt.Value;
                                        objBudget.LUpd_DateTime = DateTime.Now;
                                        objBudget.LUpd_Prog = _screenNbr;
                                        objBudget.LUpd_User = Current.UserName;
                                    }
                                }
                            }
                        }
                        order.RewardAmt = orderChange.RewardAmt.HasValue ? orderChange.RewardAmt.Value : 0;
                        order.Status = "E";
                        order.ReasonCode = ReasonCode;
                        order.LUpd_DateTime = DateTime.Now;
                        order.LUpd_Prog = _screenNbr;
                        order.LUpd_User = Current.UserName;
                        var lstPDADoc = _db.AR_PDADoc.Where(x => x.BranchID == orderChange.BranchID && x.OrdNbr == orderChange.OrderNbr).ToList();
                        if (lstPDADoc.Count > 0)
                        {
                            foreach (var objPDADoc in lstPDADoc)
                            {
                                objPDADoc.Rlsed = -1;
                            }
                        }
                    }
                    else
                    {
                        lstOrderNbrError.Add(orderChange.OrderNbr);
                    }
                }
            }
            _db.SaveChanges();

            if (lstOrderNbrError.Count() > 0)
            {
                return Json(new
                {
                    success = true,
                    msgCode = 20150320,
                    msgParam = new string[] { string.Join(",", lstOrderNbrError) }
                });
            }
            else
            {
                return Json(new
                {
                    success = true,
                    msgCode = 201405071
                });
            }
        }

        public ActionResult DelOrdNbrImp(FormCollection data)
        {
            var lstOrderChangeHandler = new StoreDataHandler(data["lstOrderChange"]);
            var lstOrderChange = lstOrderChangeHandler.BatchObjectData<OM20500_pgOrder_Result>();
            var lstOrderNbrError = new List<string>();
            foreach (var orderChange in lstOrderChange.Updated)
            {
                if (orderChange.Selected == true)
                {
                    var order = _db.OM_PDASalesOrd.FirstOrDefault(p => p.OrderNbr == orderChange.OrderNbr && p.BranchID == orderChange.BranchID && p.Status == "H" && p.Crtd_Prog == "Import");
                    if (order != null)
                    {
                        if (orderChange.tstamp.ToHex() == order.tstamp.ToHex())
                        {
                            _db.OM_PDASalesOrd.DeleteObject(order);
                            var lstDet = _db.OM_PDASalesOrdDet.Where(p => p.OrderNbr == order.OrderNbr && p.BranchID == order.BranchID);
                            foreach (var item in lstDet)
                            {
                                _db.OM_PDASalesOrdDet.DeleteObject(item);
                            }
                            var lstManual = _db.OM_PDAOrdManualDisc.Where(p => p.OrderNbr == order.OrderNbr && p.BranchID == order.BranchID);
                            foreach (var item in lstManual)
                            {
                                _db.OM_PDAOrdManualDisc.DeleteObject(item);
                            }
                        }
                        else
                        {
                            throw new MessageException(MessageType.Message, "19");
                        }
                    }
                }
            }
            _db.SaveChanges();

            if (lstOrderNbrError.Count() > 0)
            {
                return Json(new
                {
                    success = true,
                    msgCode = 2020050602,
                    msgParam = new string[] { string.Join(",", lstOrderNbrError) }
                });
            }
            else
            {
                return Json(new
                {
                    success = true,
                    msgCode = 201405071
                });
            }
        }

        [HttpPost]
        public ActionResult CheckCalcPromo(FormCollection data, bool isSaveWithOutBudget)
        {
            try
            {
                var detHeader = new StoreDataHandler(data["lstOrder"]);
                var objHeader = detHeader.ObjectData<OM20500_pgOrder_Result>().Where(p => p.Selected == true).FirstOrDefault();
                var branchID = objHeader.BranchID;
                var detHandler = new StoreDataHandler(data["lstDet"]);
                var isAllManualPromoOrDisplay = false;
                List<OM20500_pgDet_Result> lstAllDet = new List<OM20500_pgDet_Result>();
                if (objHeader.IsSelected == true)
                {
                    lstAllDet = detHandler.ObjectData<OM20500_pgDet_Result>().ToList();
                }
                // Nếu detail chưa đc load thì lấy từ db
                if (lstAllDet.Count == 0 || objHeader.IsSelected == false)
                {
                    lstAllDet = GetDetNotSelect(branchID, objHeader);
                }
                var lstDetOrNbr = lstAllDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.Selected == true && !p.FreeItem).ToList();
                var lstHis = _db.OM20500_pgHisDet4CheckBeforeSave(branchID, objHeader.OrderNbr, objHeader.Status, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                var maxID = lstHis.Count > 0 ? lstHis.Max(x => x.ID) : 0;
                var lstHeader = lstHis.Where(x => x.ID == maxID).GroupBy(x => x.ID).ToList();

                var calcID = 0;
                int rowSel = 0;
                foreach (var item in lstHeader)
                {
                    rowSel = 0;
                    var lstHisDet = item.ToList();

                    foreach (var it in lstHisDet)
                    {
                        var obj = lstDetOrNbr.Where(x => x.LineRef == it.LineRef && x.InvtID == it.InvtID && x.QtyShip == it.LineQty).FirstOrDefault();
                        if (obj != null)
                        {
                            rowSel++;
                        }
                        else
                        {
                            break;
                        }
                    }
                    if (rowSel > 0 && rowSel == lstHisDet.Count && lstDetOrNbr.Count == rowSel)
                    {
                        calcID = lstHisDet[0].ID;
                        break;
                    }
                }
                //if (objHeader.OrdDiscAmt > 0)
                //{
                //    foreach (var item in lstAllDet)
                //    {
                //        if (item.Selected == false)
                //        {
                //            throw new MessageException("2019120560", parm: new[] { objHeader.OrderNbr});
                //        }
                //    }
                //}


                var approveAll = true;
                int totalManualPromoOrDisplayItem = 0;
                for (int i = 0; i < lstDetOrNbr.Count; i++)
                {
                    var objGDet = lstDetOrNbr[i];
                    var objDet = _db.OM_PDASalesOrdDet.FirstOrDefault(p =>
                        p.BranchID == objHeader.BranchID &&
                        p.OrderNbr == objHeader.OrderNbr &&
                        p.InvtID == objGDet.InvtID &&
                        p.LineRef == objGDet.LineRef);

                    if (objDet != null)
                    {
                        double qty = objHeader.EditColumn.Split(',')[0] == "QtyShip" ? lstDetOrNbr[i].QtyShip : lstDetOrNbr[i].Qty;
                        if (qty != lstDetOrNbr[i].LineQty)
                        {
                            approveAll = false;
                            break;
                        }
                    }
                }

                if (approveAll == true)
                {
                    var lstDet = lstAllDet.Where(p => p.Selected == true).ToList();
                    if (lstDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count() != lstAllDet.Where(p => p.OrderNbr == objHeader.OrderNbr && p.FreeItem == false).Count())
                    {
                        foreach (var item in lstDet)
                        {
                            if (item.FreeItem == false)
                            {
                                approveAll = false;
                                break;
                            }
                            else if (item.FreeItem && !string.IsNullOrWhiteSpace(item.DiscCode) || !string.IsNullOrWhiteSpace(item.DisplayID))
                            {
                                totalManualPromoOrDisplayItem++;
                            }
                        }
                    }
                    if (totalManualPromoOrDisplayItem > 0 && totalManualPromoOrDisplayItem == lstDet.Count)
                    {
                        isAllManualPromoOrDisplay = true;
                    }
                }
                int outOfStock = 0;
                if (calcID > 0 && !isSaveWithOutBudget)
                {
                    var objOrdCalcPromo = _db.OM_PDASalesOrdCalcPromo.FirstOrDefault(x => x.ID == calcID && x.OrderNbr == objHeader.OrderNbr && x.BranchID == objHeader.BranchID);
                    if (objOrdCalcPromo != null && objOrdCalcPromo.OutOfStockBudget > 0)
                    {
                        outOfStock = objOrdCalcPromo.OutOfStockBudget;
                    }
                }
                return Json(new { success = true, calcID = calcID, calcDisc = approveAll, isAllManualPromoOrDisplay = isAllManualPromoOrDisplay, totalHisRow = lstHis.Count, outOfStock = outOfStock }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                if (ex is MessageException)
                {
                    MessageException msg = ex as MessageException;
                    return Json(new { success = true, message = GetMess(Convert.ToInt32(msg.Code), msg.Parm) });
                }
                else if (ex is System.Data.SqlClient.SqlException || ex.ToString().Contains("deadlocked on lock resources"))
                {
                    return Json(new { success = true, message = GetMess(2017110301, null) });
                }
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }

        private List<OM20500_pgDet_Result> GetDetNotSelect(string branchID, OM20500_pgOrder_Result objHeader)
        {
            var lstAllDet = _db.OM20500_pgDet(Current.UserName, Current.CpnyID, Current.LangID, branchID, objHeader.OrderNbr).ToList();
            foreach (var itDet in lstAllDet)
            {
                var qtyShip = 0d;
                if (objHeader.EditColumn.Split(',')[0] == "QtyShip")
                {
                    if (!string.IsNullOrWhiteSpace(objHeader.CheckQty))
                    {
                        if (objHeader.CheckQty == "LineQty")
                        {
                            qtyShip = itDet.LineQty;
                        }
                        else if (objHeader.CheckQty == "QtyShipD")
                        {
                            qtyShip = itDet.QtyShipD;
                        }
                        else if (objHeader.CheckQty == "Qty")
                        {
                            qtyShip = itDet.Qty;
                        }
                    }
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(objHeader.CheckQty))
                    {
                        if (objHeader.CheckQty == "LineQty")
                        {
                            qtyShip = itDet.LineQty;
                        }
                        else if (objHeader.CheckQty == "QtyShipD")
                        {
                            qtyShip = itDet.QtyShipD;
                        }
                        else if (objHeader.CheckQty == "Qty")
                        {
                            qtyShip = itDet.Qty;
                        }
                    }

                    qtyShip = qtyShip - itDet.QtyShipped;
                }
                string EditColumn = objHeader.EditColumn.Split(',')[0];
                System.Reflection.PropertyInfo propertyInfo = itDet.GetType().GetProperty(EditColumn);
                if (propertyInfo != null)
                {
                    propertyInfo.SetValue(itDet, qtyShip, null);
                }
                itDet.Selected = qtyShip > 0;
            }
            return lstAllDet;
        }

        //Other
        private void UpdateAR_NewCustomerInfo(string branchID, string custID, string codeHT)
        {
            var objAR_NewCustomerInfor = _db.AR_NewCustomerInfor.FirstOrDefault(p => p.BranchID == branchID && p.NewCustID == custID);
            if (objAR_NewCustomerInfor != null && objAR_NewCustomerInfor.CodeHT != codeHT)
            {
                objAR_NewCustomerInfor.CodeHT = codeHT;
                objAR_NewCustomerInfor.LUpd_Datetime = DateTime.Now;
                objAR_NewCustomerInfor.LUpd_User = Current.UserName;
                objAR_NewCustomerInfor.LUpd_Prog = _screenNbr;
            }
        }
        private IN_UnitConversion SetUOM(string invtID, string classID, string stkUnit, string fromUnit)
        {
            if (!string.IsNullOrEmpty(fromUnit))
            {
                var data = _db.IN_UnitConversion.FirstOrDefault(p =>
                        p.UnitType == "3" && p.ClassID == "*" && p.InvtID == invtID && p.FromUnit == fromUnit && p.ToUnit == stkUnit);
                if (data != null)
                {
                    return data;
                }
                data = _db.IN_UnitConversion.FirstOrDefault(p =>
                        p.UnitType == "2" && p.ClassID == classID && p.InvtID == "*" && p.FromUnit == fromUnit && p.ToUnit == stkUnit);
                if (data != null)
                {
                    return data;
                }
                data = _db.IN_UnitConversion.FirstOrDefault(p =>
                        p.UnitType == "1" && p.ClassID == "*" && p.InvtID == "*" && p.FromUnit == fromUnit && p.ToUnit == stkUnit);
                if (data == null)
                {
                    data = new IN_UnitConversion();
                }
                else
                {
                    return data;
                }
            }
            return null;
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
        private string GetMessage(RootObject saveResult)
        {
            var msg = _sys.psys_LoadMessage(Current.LangID, int.Parse(saveResult.code)).FirstOrDefault();
            if (msg != null)
            {
                if (saveResult.parm != null)
                {
                    for (int i = 0; i < saveResult.parm.Count; i++)
                    {
                        msg.Message = msg.Message.Replace("@p" + (i + 1).ToString(), saveResult.parm[i]);
                    }
                }
            }
            return msg == null ? "" : msg.Message;
        }

        private bool CheckConfig(OM20500_pgOrder_Result objHeader)
        {
            //var _objIN = _db.IN_Setup.FirstOrDefault(p => p.BranchID == objHeader.BranchID && p.SetupID == "IN");
            //if (_objIN == null)
            //{
            //    throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(20404, new string[] { "IN_Setup" }) + "</br>" });
            //}

            var _objOM = _db.OM_Setup.FirstOrDefault();
            if (_objOM == null)
            {
                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(20404, new string[] { "OM_Setup" }) + "</br>" });
            }
            var _objUser = _db.OM_UserDefault.FirstOrDefault(p => p.UserID == Current.UserName && p.DfltBranchID == objHeader.BranchID);
            if (_objUser == null)
            {
                throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " bị lỗi: " + GetMess(8006, new string[] { "OM_UserDefault" }) + "</br>" });
            }
            return false;
        }

        private bool SaveRewardAmt(OM20500_pgOrder_Result objHeader, string OMOrderNbr)
        {
            var objH = _db.OM_SalesOrd.FirstOrDefault(x => x.BranchID == objHeader.BranchID && x.OrderNbr == OMOrderNbr);
            if (objH != null)
            {
                string rewardIDs = Util.PassNull(objHeader.RewardID);
                var rwdAmt = _db.OM20500_pdRewardAmt(rewardIDs, objHeader.BranchID, objHeader.SlsPerID, objHeader.CustID).FirstOrDefault();
                if (rwdAmt != null)
                {
                    objH.RewardAmt = rwdAmt.RewardAmt.HasValue ? rwdAmt.RewardAmt.Value : 0;
                    objH.RewardID = Util.PassNull(rwdAmt.DisplayID);
                }
                else
                {
                    objH.RewardAmt = 0;
                    objH.RewardID = "";
                }
            }
            _db.SaveChanges();
            return true;
        }

        private int SaveOrdDisc(string branchID, string pdaOrderNbr, string slsperID, string OMOrderNbr, Dictionary<string, double> freeItemUsed, ref string outOfSite, ref string outOfBudget)
        {
            int isCalcDisc = 0;
            var _lstDisc = _db.OM_PDAOrdDisc.Where(x => x.BranchID == branchID && x.OrderNbr == pdaOrderNbr).ToList();
            if (_lstDisc.Count > 0)
            {
                for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                {
                    var objDisc = _lstDisc[idxDisc];
                    string budgetID = (objDisc.BudgetID != string.Empty) ? objDisc.BudgetID : objDisc.FreeItemBudgetID;

                    if (!string.IsNullOrWhiteSpace(budgetID))
                    {
                        var objRoute = _db.OM20500_pdGetBranchSalesRoute(branchID, slsperID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                        if (objRoute != null)
                        {
                            var objBudget = _db.OM_PPBudget.FirstOrDefault(p => p.BudgetID == budgetID);
                            if (objBudget != null)
                            {
                                string key = budgetID + objDisc.FreeItemID + objRoute.BranchRouteID + objRoute.SalesRouteID;
                                if (objBudget.AllocType == "1")
                                {
                                    GetOM_PPAlloc(budgetID, objDisc.FreeItemID, objRoute.BranchRouteID, objRoute.SalesRouteID, key);
                                }
                                else if (objBudget.AllocType == "0")
                                {
                                    GetOM_PPCpnyID(budgetID, objDisc.FreeItemID, objRoute.BranchRouteID, objRoute.SalesRouteID, key);
                                }

                                if (objDisc.DiscAmt > 0)
                                {
                                    _lstBudget[key].QtyAmtAvail -= objDisc.DiscAmt;
                                    _lstBudget[key].QtyAmtSpent += objDisc.DiscAmt;
                                }
                                else
                                {
                                    var objDet = _db.OM_PDASalesOrdDet.Where(x => x.BranchID == objDisc.BranchID && x.OrderNbr == objDisc.OrderNbr && x.LineRef == objDisc.SOLineRef).FirstOrDefault();
                                    if (objDet != null)
                                    {
                                        var qty = objDet.LineQty * objDet.UnitRate;
                                        _lstBudget[key].QtyAmtAvail -= qty;
                                        _lstBudget[key].QtyAmtSpent += qty;
                                    }
                                }
                                if (_lstBudget[key].QtyAmtAvail < 0)
                                {
                                    outOfBudget += objDisc.DiscID + "-" + objDisc.DiscSeq + "-" + budgetID + (objDisc.FreeItemID != "" ? "-" + objDisc.FreeItemID : "") + ",";
                                    isCalcDisc = 1;
                                }
                            }


                        }
                    }
                    if (objDisc.FreeItemID != "")
                    {
                        var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(x => x.OrderNbr == objDisc.OrderNbr && x.BranchID == objDisc.BranchID && x.LineRef == objDisc.SOLineRef);
                        if (objOrdDet != null)
                        {
                            string key = objDisc.FreeItemID + objOrdDet.SiteID;
                            if (!_lstItemSite.ContainsKey(key))
                            {
                                GetIN_ItemSite(objDisc.FreeItemID, objOrdDet.SiteID);
                                if (freeItemUsed.ContainsKey(key))
                                {
                                    _lstItemSite[key] += freeItemUsed[key];
                                }
                            }
                            _lstItemSite[key] -= objOrdDet.LineQty * objOrdDet.UnitRate;
                            if (_lstItemSite[key] < 0)
                            {
                                isCalcDisc = 1;
                                outOfSite += objDisc.FreeItemID + " - " + objOrdDet.SiteID;
                            }
                        }
                        else
                        {
                            continue;
                        }
                    }

                    #region -Insert or Update OM_PDAOrdDisc-
                    string discID = _lstDisc[idxDisc].DiscID;
                    string discSeq = _lstDisc[idxDisc].DiscSeq;
                    string lineRef = _lstDisc[idxDisc].LineRef;
                    var objOrdDisc = _db.OM_OrdDisc.Where(x =>
                        x.BranchID == branchID
                        && x.OrderNbr == OMOrderNbr
                        && x.DiscID == discID
                        && x.DiscSeq == discSeq
                        && x.LineRef == lineRef
                        ).FirstOrDefault();
                    if (objOrdDisc == null)
                    {
                        objOrdDisc = new OM_OrdDisc();
                        objOrdDisc.BranchID = _lstDisc[idxDisc].BranchID;
                        objOrdDisc.DiscID = _lstDisc[idxDisc].DiscID;
                        objOrdDisc.DiscSeq = _lstDisc[idxDisc].DiscSeq;
                        objOrdDisc.OrderNbr = OMOrderNbr;
                        objOrdDisc.LineRef = _lstDisc[idxDisc].LineRef;
                        objOrdDisc.Crtd_DateTime = DateTime.Now;
                        objOrdDisc.Crtd_Prog = "OM20500";
                        objOrdDisc.Crtd_User = Current.UserName;
                        _db.OM_OrdDisc.AddObject(objOrdDisc);
                    }
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
                    objOrdDisc.DiscBreakLineRef = _lstDisc[idxDisc].DiscBreakLineRef;
                    objOrdDisc.RefLineRef = Util.PassNull(_lstDisc[idxDisc].RefLineRef);
                    objOrdDisc.GroupRefLineRef = Util.PassNull(_lstDisc[idxDisc].GroupRefLineRef);
                    objOrdDisc.LUpd_DateTime = DateTime.Now;
                    objOrdDisc.LUpd_Prog = "OM20500";
                    objOrdDisc.LUpd_User = Current.UserName;
                    objOrdDisc.tstamp = new byte[1];
                    #endregion
                }
            }
            _db.SaveChanges();
            return isCalcDisc;
        }
        private int SaveOrdManual(string branchID, string pdaOrderNbr, string slsperID, string OMOrderNbr, Dictionary<string, double> dicRef, bool isCalcOnly, bool isAllManualOrDisplay, out string outOfbudget, out string outOfSite)
        {
            int isCalcDisc = 0;
            outOfbudget = string.Empty;
            outOfSite = string.Empty;
            var _lstDisc = _db.OM_PDAOrdManualDisc.Where(x => x.BranchID == branchID && x.OrderNbr == pdaOrderNbr).ToList();
            if (_lstDisc.Count > 0)
            {
                for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                {
                    var objDisc = _lstDisc[idxDisc];
                    if (objDisc.SOLineRef != "" && dicRef.ContainsKey(objDisc.SOLineRef) == false || isAllManualOrDisplay && objDisc.DiscAmt > 0)
                    {
                        continue;
                    }
                    if (objDisc.ObjApply == "S")
                    {
                        string budgetID = objDisc.BudgetID;
                        if (!string.IsNullOrWhiteSpace(budgetID))
                        {
                            var objRoute = _db.OM20500_pdGetBranchSalesRoute(branchID, slsperID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                            if (objRoute != null)
                            {
                                string key = budgetID + objDisc.FreeItemID + objRoute.BranchRouteID + objRoute.SalesRouteID;
                                GetOM_PPAlloc(budgetID, objDisc.FreeItemID, objRoute.BranchRouteID, objRoute.SalesRouteID, key);
                                if (objDisc.DiscAmt > 0)
                                {
                                    _lstBudget[key].QtyAmtAvail -= objDisc.DiscAmt;
                                    _lstBudget[key].QtyAmtSpent += objDisc.DiscAmt;
                                }
                                else
                                {
                                    var objDet = _db.OM_PDASalesOrdDet.Where(x => x.BranchID == objDisc.BranchID && x.OrderNbr == objDisc.OrderNbr && x.LineRef == objDisc.SOLineRef).FirstOrDefault();
                                    if (objDet != null)
                                    {
                                        var qty = objDet.LineQty * objDet.UnitRate;
                                        _lstBudget[key].QtyAmtAvail -= qty;
                                        _lstBudget[key].QtyAmtSpent += qty;
                                    }
                                }
                                if (_lstBudget[key].QtyAmtAvail < 0 && isCalcOnly == false)
                                {
                                    outOfbudget += objDisc.DiscCode + "-" + budgetID + (objDisc.FreeItemID != "" ? "-" + objDisc.FreeItemID : "") + ",";
                                    isCalcDisc = 3;
                                    continue;
                                }
                            }
                        }
                        if (objDisc.FreeItemID != "")
                        {
                            var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(x => x.OrderNbr == objDisc.OrderNbr && x.BranchID == objDisc.BranchID && x.LineRef == objDisc.SOLineRef);
                            if (objOrdDet != null)
                            {


                                string key = objDisc.FreeItemID + objOrdDet.SiteID;
                                if (!_lstItemSite.ContainsKey(key))
                                {
                                    GetIN_ItemSite(objDisc.FreeItemID, objOrdDet.SiteID);
                                }
                                _lstItemSite[key] -= objOrdDet.LineQty * objOrdDet.UnitRate;
                                if (_lstItemSite[key] < 0 && isCalcOnly == false)
                                {
                                    outOfSite += objDisc.FreeItemID + "-" + objOrdDet.SiteID + ", ";
                                    continue;
                                }
                            }
                            else
                            {
                                continue;
                            }
                        }
                    }
                    string discCode = _lstDisc[idxDisc].DiscCode;
                    string lineRef = _lstDisc[idxDisc].LineRef;
                    var objOrdDisc = _db.OM_OrdManualDisc.Where(x =>
                        x.BranchID == branchID
                        && x.OrderNbr == OMOrderNbr
                        && x.DiscCode == discCode
                        && x.LineRef == lineRef
                        ).FirstOrDefault();
                    if (objOrdDisc == null)
                    {
                        objOrdDisc = new OM_OrdManualDisc();
                        objOrdDisc.BranchID = _lstDisc[idxDisc].BranchID;
                        objOrdDisc.DiscCode = _lstDisc[idxDisc].DiscCode;
                        objOrdDisc.OrderNbr = OMOrderNbr;
                        objOrdDisc.LineRef = _lstDisc[idxDisc].LineRef;
                        objOrdDisc.Crtd_DateTime = DateTime.Now;
                        objOrdDisc.Crtd_Prog = _screenNbr;
                        objOrdDisc.Crtd_User = Current.UserName;
                        _db.OM_OrdManualDisc.AddObject(objOrdDisc);
                    }
                    objOrdDisc.ObjApply = _lstDisc[idxDisc].ObjApply;
                    objOrdDisc.PromoType = _lstDisc[idxDisc].PromoType;
                    objOrdDisc.DiscAmt = _lstDisc[idxDisc].DiscAmt;
                    objOrdDisc.DisctblAmt = _lstDisc[idxDisc].DisctblAmt;
                    objOrdDisc.DiscPct = _lstDisc[idxDisc].DiscPct;
                    objOrdDisc.FreeItemID = _lstDisc[idxDisc].FreeItemID;
                    objOrdDisc.FreeItemUnit = _lstDisc[idxDisc].FreeItemUnit;
                    objOrdDisc.FreeItemQty = _lstDisc[idxDisc].FreeItemQty;

                    objOrdDisc.SlsperID = _lstDisc[idxDisc].SlsperID;
                    objOrdDisc.SOLineRef = _lstDisc[idxDisc].SOLineRef;
                    objOrdDisc.BudgetID = _lstDisc[idxDisc].BudgetID;
                    objOrdDisc.LUpd_DateTime = DateTime.Now;
                    objOrdDisc.LUpd_Prog = _screenNbr;
                    objOrdDisc.LUpd_User = Current.UserName;
                }
                _db.SaveChanges();
            }
            return isCalcDisc;
        }
        [HttpPost]
        public ActionResult SaveDate(FormCollection data)
        {
            try
            {

                StoreDataHandler dataHandler = new StoreDataHandler(data["lstDet"]);
                var lstOrder = dataHandler.ObjectData<OM20500_pgOrder_Result>().ToList();
                string deliveryID = data["deliveryID"];
                DateTime shipDate = data["shipDate"].ToDateShort();
                DateTime ARDocDate = data["ARDocDate"].ToDateShort();

                foreach (var item in lstOrder)
                {
                    if (item.Selected == true)
                    {
                        var objOrd = _db.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == item.BranchID && p.OrderNbr == item.OrderNbr);
                        if (objOrd != null)
                        {
                            objOrd.DeliveryIDTmp = deliveryID;
                            objOrd.ShipDateTmp = shipDate;
                            objOrd.ARDocDateTmp = ARDocDate;
                            objOrd.LUpd_DateTime = DateTime.Now;
                            objOrd.LUpd_Prog = _screenNbr;
                            objOrd.LUpd_User = Current.UserName;
                        }
                        var lstCal = _db.OM_PDASalesOrdCalcPromo.Where(p => p.BranchID == item.BranchID && p.OrderNbr == item.OrderNbr).ToList();
                        foreach (var itemCal in lstCal)
                        {
                            var obj = _db.OM_PDASalesOrdCalcPromo.FirstOrDefault(p => p.BranchID == item.BranchID && p.OrderNbr == item.OrderNbr && p.ID == itemCal.ID);
                            if (obj != null)
                            {
                                obj.ARDocDate = ARDocDate;
                                obj.LUpd_DateTime = DateTime.Now;
                                obj.LUpd_Prog = _screenNbr;
                                obj.LUpd_User = Current.UserName;
                            }
                        }
                    }
                }

                _db.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                if (ex is MessageException) return (ex as MessageException).ToMessage();
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }
        private int CheckOrdManual(string branchID, string pdaOrderNbr, string slsperID, Dictionary<string, double> dicRef, bool isCalcOnly, bool isAllManualOrDisplay, out string outOfbudget, out string outOfSite, out string isValidItem)
        {
            outOfbudget = string.Empty;
            outOfSite = string.Empty;
            isValidItem = string.Empty;
            var _lstDisc = _db.OM_PDAOrdManualDisc.Where(x => x.BranchID == branchID && x.OrderNbr == pdaOrderNbr).ToList();
            if (_lstDisc.Count > 0)
            {
                for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                {
                    var objDisc = _lstDisc[idxDisc];
                    if (objDisc.SOLineRef != "" && dicRef.ContainsKey(objDisc.SOLineRef) == false || isAllManualOrDisplay && objDisc.DiscAmt > 0)
                    {
                        continue;
                    }
                    if (objDisc.ObjApply == "S")
                    {
                        string budgetID = objDisc.BudgetID;
                        if (!string.IsNullOrWhiteSpace(budgetID))
                        {
                            var objRoute = _db.OM20500_pdGetBranchSalesRoute(branchID, slsperID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                            if (objRoute != null)
                            {
                                string key = budgetID + objDisc.FreeItemID + objRoute.BranchRouteID + objRoute.SalesRouteID;
                                GetOM_PPAlloc(budgetID, objDisc.FreeItemID, objRoute.BranchRouteID, objRoute.SalesRouteID, key);
                                if (objDisc.DiscAmt > 0)
                                {
                                    _lstBudget[key].QtyAmtAvail -= objDisc.DiscAmt;
                                    _lstBudget[key].QtyAmtSpent += objDisc.DiscAmt;
                                }
                                else
                                {
                                    var objDet = _db.OM_PDASalesOrdDet.Where(x => x.BranchID == objDisc.BranchID && x.OrderNbr == objDisc.OrderNbr && x.LineRef == objDisc.SOLineRef).FirstOrDefault();
                                    if (objDet != null)
                                    {
                                        var qty = objDet.LineQty * objDet.UnitRate;
                                        _lstBudget[key].QtyAmtAvail -= qty;
                                        _lstBudget[key].QtyAmtSpent += qty;
                                    }
                                }
                                if (_lstBudget[key].QtyAmtAvail < 0 && isCalcOnly == false)
                                {
                                    outOfbudget += objDisc.DiscCode + "-" + budgetID + (objDisc.FreeItemID != "" ? "-" + objDisc.FreeItemID : "") + ",";
                                    continue;
                                }
                            }
                        }
                        if (objDisc.FreeItemID != "")
                        {
                            var objOrdDet = _db.OM_PDASalesOrdDet.FirstOrDefault(x => x.OrderNbr == objDisc.OrderNbr && x.BranchID == objDisc.BranchID && x.LineRef == objDisc.SOLineRef);
                            if (objOrdDet != null)
                            {
                                string key = objDisc.FreeItemID + objOrdDet.SiteID;
                                if (!_lstItemSite.ContainsKey(key))
                                {
                                    GetIN_ItemSite(objDisc.FreeItemID, objOrdDet.SiteID);
                                }
                                _lstItemSite[key] -= objOrdDet.LineQty * objOrdDet.UnitRate;
                                if (_lstItemSite[key] < 0 && isCalcOnly == false)
                                {
                                    outOfSite += objDisc.FreeItemID + "-" + objOrdDet.SiteID + ", ";
                                    continue;
                                }
                            }
                        }
                    }
                    if (objDisc.FreeItemID != string.Empty)
                    {
                        isValidItem += objDisc.BudgetID + "-" + objDisc.FreeItemID + ",";
                    }

                }
            }
            return _lstDisc.Count;
        }
        private bool InsertPO(OM_PDASalesOrd objOrd, string OMOrderNbr, OM20500_pgOrder_Result objHeader, double totalDetLineAmt)
        {
            // OM20500: thêm yêu cầu duyệt đơn hàng từ O,H sang W
            // => cần đẩy thêm lô nhập hàng PO10200 nếu CustID có tồn tại trong sys_Company
            bool addDiscAmt = true;
            bool addOneTime = false;
            if (_db.OM20500_ppCheckCustomer(objHeader.CustID, objHeader.BranchID, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault() == true)
            {
                PO10200.Controllers.PO10200Controller objPO = new PO10200.Controllers.PO10200Controller();
                if (objOrd.PODiscAmtInserted == true)
                {
                    addDiscAmt = false; // Đã thêm từ PDA
                }
                else
                {
                    // KTra đơn Import từ OM10100
                    if (string.IsNullOrWhiteSpace(objOrd.CustOrderNbr) && string.IsNullOrWhiteSpace(objOrd.PONbr) && objOrd.DoNotCalDisc == 1)
                    {
                        addOneTime = true;
                        addDiscAmt = objOrd.VolDiscAmt + objOrd.OrdDiscAmt < totalDetLineAmt;
                        if (!addDiscAmt) // Giá trị đơn hàng nhỏ hơn tiền KM nên ko đc duyệt
                        {
                            string messString = GetMess(2016011802, null);
                            throw new MessageException("20410", parm: new[] { Util.GetLang("OrderNbr") + ": " + objHeader.OrderNbr + " " + messString });
                        }
                    }
                    else // Ktra đơn từ PDA và PO10100
                    {
                        var objOMSales = _db.OM_SalesOrd.FirstOrDefault(x => x.BranchID == objHeader.BranchID && x.OrderNbr == OMOrderNbr);
                        if (objOMSales != null & objOMSales.VolDiscAmt + objOMSales.OrdDiscAmt > 0)
                        {
                            addDiscAmt = true;
                        }
                        else
                        {
                            addDiscAmt = false;
                        }
                    }
                }
                string branchMapID = objHeader.CustID;
                objPO.SaveOM20500(objHeader.BranchID, objHeader.CustID, branchMapID, OMOrderNbr, objHeader.OrderNbr, addDiscAmt);
            }

            objOrd.Status = objHeader.ToStatus;
            objOrd.ApprovalDate = DateTime.Now;
            if (addOneTime)
            {
                if (objOrd.PODiscAmtInserted == false && addDiscAmt) // Chỉ update 1 lần
                {
                    objOrd.PODiscAmtInserted = true;
                }
            }

            objOrd.LUpd_DateTime = DateTime.Now;
            _db.SaveChanges();
            return true;
        }

        private void GetIN_ItemSite(string invtID, string siteID)
        {
            var objSite = _db.IN_ItemSite.FirstOrDefault(p => p.InvtID == invtID && p.SiteID == siteID);
            if (objSite == null)
            {
                objSite = new IN_ItemSite();
            }
            _lstItemSite.Add(invtID + siteID, objSite.QtyAvail);
        }

        private void RollbackOrder(List<OM_PDASalesOrdDet> _lstOrdDet, List<OM_PDAOrdDisc> _lstDisc)
        {
            if (_lstOrdDet.Count == 0)
            {
                return;
            }
            var lstPDADet = _db.OM_PDASalesOrdDet.Where(x => x.BranchID == _objOrd.BranchID && x.OrderNbr == _objOrd.OrderNbr).ToList();
            var lstPDAOrdDisc = _db.OM_PDAOrdDisc.Where(x => x.BranchID == _objOrd.BranchID && x.OrderNbr == _objOrd.OrderNbr).ToList();
            #region -Save OM_PDASalesOrdDet-
            if (_lstOrdDet.Count == 0)
            {
                // No promo item 
                foreach (var item in lstPDADet)
                {
                    if (item.FreeItem && string.IsNullOrWhiteSpace(item.DiscCode) && string.IsNullOrWhiteSpace(item.DisplayID))
                    {
                        _db.OM_PDASalesOrdDet.DeleteObject(item);
                    }
                }
            }
            else
            {
                // Insert all promo from Cloud to PDA 
                #region -Insert or Update OM_PDASalesOrdDet-
                for (int idxOrdDet = 0; idxOrdDet < _lstOrdDet.Count; idxOrdDet++)
                {
                    var objPDADetOrig = lstPDADet.FirstOrDefault(x => x.LineRef == _lstOrdDet[idxOrdDet].LineRef);

                    var objPDADet = lstPDADet.FirstOrDefault(x =>
                                       x.LineRef == _lstOrdDet[idxOrdDet].LineRef);
                    if (objPDADet == null)
                    {
                        objPDADet = new OM_PDASalesOrdDet();
                        objPDADet.BranchID = _objOrd.BranchID;
                        objPDADet.OrderNbr = _objOrd.OrderNbr;
                        objPDADet.LineRef = _lstOrdDet[idxOrdDet].LineRef;
                        objPDADet.Qty = 0;// _lstOrdDet[idxOrdDet].Qty;
                        objPDADet.QtyApprove = 0;
                        objPDADet.QtyERP = 0;
                        objPDADet.QtyShipD = 0;
                        objPDADet.QtyShip = 0;// _lstOrdDet[idxOrdDet].LineQty;
                        objPDADet.POSMImg = string.Empty;
                        objPDADet.Crtd_Prog = "OM20500";
                        objPDADet.Crtd_User = Current.UserName;
                        objPDADet.Crtd_Datetime = DateTime.Now;

                        objPDADet.LineQty = _lstOrdDet[idxOrdDet].LineQty;
                        objPDADet.LineAmt = _lstOrdDet[idxOrdDet].LineAmt;
                        _db.OM_PDASalesOrdDet.AddObject(objPDADet);
                    }
                    else
                    {
                        if (_lstOrdDet[idxOrdDet].FreeItem && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DiscCode) && string.IsNullOrWhiteSpace(_lstOrdDet[idxOrdDet].DisplayID))
                        {
                            objPDADet.LineQty = _lstOrdDet[idxOrdDet].LineQty;
                            objPDADet.Qty = 0;// _lstOrdDet[idxOrdDet].LineQty;
                            objPDADet.QtyApprove = 0;
                            objPDADet.QtyERP = 0;
                            objPDADet.QtyShipD = 0;
                            objPDADet.QtyShip = 0;
                        }
                    }
                    #region -update-

                    objPDADet.BarCode = _lstOrdDet[idxOrdDet].BarCode;
                    objPDADet.BOCustID = Util.PassNull(_lstOrdDet[idxOrdDet].BOCustID);
                    objPDADet.BOType = _lstOrdDet[idxOrdDet].BOType;
                    objPDADet.BudgetID1 = Util.PassNull(_lstOrdDet[idxOrdDet].BudgetID1);
                    objPDADet.BudgetID2 = Util.PassNull(_lstOrdDet[idxOrdDet].BudgetID2);
                    objPDADet.CostID = Util.PassNull(_lstOrdDet[idxOrdDet].CostID);
                    objPDADet.Descr = _lstOrdDet[idxOrdDet].Descr;
                    objPDADet.DiscAmt = _lstOrdDet[idxOrdDet].DiscAmt;
                    objPDADet.DiscAmt1 = _lstOrdDet[idxOrdDet].DiscAmt1;
                    objPDADet.DiscAmt2 = _lstOrdDet[idxOrdDet].DiscAmt2;
                    objPDADet.DiscCode = Util.PassNull(_lstOrdDet[idxOrdDet].DiscCode);
                    objPDADet.DiscID1 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscID1);
                    objPDADet.DiscID2 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscID2);
                    objPDADet.DiscPct = _lstOrdDet[idxOrdDet].DiscPct;
                    objPDADet.DiscPct1 = _lstOrdDet[idxOrdDet].DiscPct1;
                    objPDADet.DiscPct2 = _lstOrdDet[idxOrdDet].DiscPct2;
                    objPDADet.DiscSeq1 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscSeq1);
                    objPDADet.DiscSeq2 = Util.PassNull(_lstOrdDet[idxOrdDet].DiscSeq2);
                    objPDADet.DocDiscAmt = _lstOrdDet[idxOrdDet].DocDiscAmt;
                    objPDADet.FreeItem = _lstOrdDet[idxOrdDet].FreeItem;
                    objPDADet.FreeItemQty1 = _lstOrdDet[idxOrdDet].FreeItemQty1;
                    objPDADet.FreeItemQty2 = _lstOrdDet[idxOrdDet].FreeItemQty2;
                    objPDADet.GroupDiscAmt1 = _lstOrdDet[idxOrdDet].GroupDiscAmt1;
                    objPDADet.GroupDiscAmt2 = _lstOrdDet[idxOrdDet].GroupDiscAmt2;
                    objPDADet.GroupDiscID1 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscID1);
                    objPDADet.GroupDiscID2 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscID2);
                    objPDADet.GroupDiscPct1 = _lstOrdDet[idxOrdDet].GroupDiscPct1;
                    objPDADet.GroupDiscPct2 = _lstOrdDet[idxOrdDet].GroupDiscPct2;
                    objPDADet.GroupDiscSeq1 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscSeq1);
                    objPDADet.GroupDiscSeq2 = Util.PassNull(_lstOrdDet[idxOrdDet].GroupDiscSeq2);
                    objPDADet.InvtID = _lstOrdDet[idxOrdDet].InvtID;
                    objPDADet.ItemPriceClass = _lstOrdDet[idxOrdDet].ItemPriceClass;
                    objPDADet.OrderType = _lstOrdDet[idxOrdDet].OrderType;
                    objPDADet.OrigOrderNbr = _lstOrdDet[idxOrdDet].OrigOrderNbr;
                    objPDADet.QtyBO = _lstOrdDet[idxOrdDet].QtyBO;
                    objPDADet.QtyInvc = _lstOrdDet[idxOrdDet].QtyInvc;
                    objPDADet.QtyOpenShip = _lstOrdDet[idxOrdDet].QtyOpenShip;
                    objPDADet.ShipStatus = Util.PassNull(_lstOrdDet[idxOrdDet].ShipStatus);
                    objPDADet.SiteID = _lstOrdDet[idxOrdDet].SiteID;
                    objPDADet.SlsPrice = _lstOrdDet[idxOrdDet].SlsPrice;
                    objPDADet.SlsUnit = _lstOrdDet[idxOrdDet].SlsUnit;
                    objPDADet.SOFee = _lstOrdDet[idxOrdDet].SOFee;
                    objPDADet.TaxAmt00 = _lstOrdDet[idxOrdDet].TaxAmt00;
                    objPDADet.TaxAmt01 = _lstOrdDet[idxOrdDet].TaxAmt01;
                    objPDADet.TaxAmt02 = _lstOrdDet[idxOrdDet].TaxAmt02;
                    objPDADet.TaxAmt03 = _lstOrdDet[idxOrdDet].TaxAmt03;
                    objPDADet.TaxCat = _lstOrdDet[idxOrdDet].TaxCat;
                    objPDADet.TaxID00 = _lstOrdDet[idxOrdDet].TaxID00;
                    objPDADet.TaxID01 = Util.PassNull(_lstOrdDet[idxOrdDet].TaxID01);
                    objPDADet.TaxID02 = Util.PassNull(_lstOrdDet[idxOrdDet].TaxID01);
                    objPDADet.TaxID03 = Util.PassNull(_lstOrdDet[idxOrdDet].TaxID03);
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
                    objPDADet.ManuDiscAmt = _lstOrdDet[idxOrdDet].ManuDiscAmt;
                    objPDADet.POSM = _lstOrdDet[idxOrdDet].POSM;
                    objPDADet.Mark = _lstOrdDet[idxOrdDet].Mark;
                    objPDADet.DisplayID = _lstOrdDet[idxOrdDet].DisplayID;
                    objPDADet.DisplayPeriodID = Util.PassNull(_lstOrdDet[idxOrdDet].DisplayPeriodID);
                    objPDADet.KitLineRef = string.Empty;
                    objPDADet.DiscIDSolomon = string.Empty;
                    objPDADet.Declaration = string.Empty;
                    objPDADet.ConsumerPromotionID = string.Empty;
                    objPDADet.AccumulateID = string.Empty;
                    objPDADet.ManuDiscAmt = _lstOrdDet[idxOrdDet].ManuDiscAmt;
                    objPDADet.ManuDiscPct = _lstOrdDet[idxOrdDet].ManuDiscPct;
                    #endregion
                    // }
                }
                #endregion

                //    // Delete old promotion 
                foreach (var item in lstPDADet)
                {
                    if (item.FreeItem && string.IsNullOrWhiteSpace(item.DiscCode) && string.IsNullOrWhiteSpace(item.DisplayID)) // Ko xoá KM tay
                    {
                        var objDel = _lstOrdDet.FirstOrDefault(x =>
                            x.LineRef == item.LineRef);
                        if (objDel == null)
                        {
                            _db.OM_PDASalesOrdDet.DeleteObject(item);
                        }
                    }
                }
            }
            #endregion

            #region -Save OM_PDAOrdDisc-
            if (_lstDisc.Count == 0)
            {
                foreach (var item in lstPDAOrdDisc)
                {
                    _db.OM_PDAOrdDisc.DeleteObject(item);
                }
            }
            else
            {
                // Add new or update promotion
                for (int idxDisc = 0; idxDisc < _lstDisc.Count; idxDisc++)
                {
                    var objDisc = _lstDisc[idxDisc];

                    #region -Insert or Update OM_PDAOrdDisc-
                    var objPDAOrdDisc = lstPDAOrdDisc.Where(x =>
                        x.BranchID == objDisc.BranchID
                        && x.OrderNbr == _objOrd.OrderNbr
                        && x.DiscID == objDisc.DiscID
                        && x.DiscSeq == objDisc.DiscSeq
                        && x.LineRef == objDisc.LineRef
                        ).FirstOrDefault();
                    if (objPDAOrdDisc == null)
                    {
                        objPDAOrdDisc = new OM_PDAOrdDisc();
                        objPDAOrdDisc.BranchID = _lstDisc[idxDisc].BranchID;
                        objPDAOrdDisc.DiscID = _lstDisc[idxDisc].DiscID;
                        objPDAOrdDisc.DiscSeq = _lstDisc[idxDisc].DiscSeq;
                        objPDAOrdDisc.OrderNbr = _objOrd.OrderNbr;
                        objPDAOrdDisc.LineRef = _lstDisc[idxDisc].LineRef;
                        objPDAOrdDisc.Crtd_DateTime = DateTime.Now;
                        objPDAOrdDisc.Crtd_Prog = "OM20500";
                        objPDAOrdDisc.Crtd_User = Current.UserName;
                        _db.OM_PDAOrdDisc.AddObject(objPDAOrdDisc);
                    }
                    objPDAOrdDisc.BreakBy = _lstDisc[idxDisc].BreakBy;
                    objPDAOrdDisc.BudgetID = _lstDisc[idxDisc].BudgetID;
                    objPDAOrdDisc.DiscAmt = _lstDisc[idxDisc].DiscAmt;
                    objPDAOrdDisc.DiscFor = _lstDisc[idxDisc].DiscFor;
                    objPDAOrdDisc.DisctblAmt = _lstDisc[idxDisc].DisctblAmt;
                    objPDAOrdDisc.DisctblQty = _lstDisc[idxDisc].DisctblQty;
                    objPDAOrdDisc.DiscType = _lstDisc[idxDisc].DiscType;
                    objPDAOrdDisc.DiscUOM = _lstDisc[idxDisc].DiscUOM;
                    objPDAOrdDisc.FreeItemBudgetID = _lstDisc[idxDisc].FreeItemBudgetID;
                    objPDAOrdDisc.FreeItemID = _lstDisc[idxDisc].FreeItemID;
                    objPDAOrdDisc.FreeItemQty = _lstDisc[idxDisc].FreeItemQty;
                    objPDAOrdDisc.OrigFreeItemQty = _lstDisc[idxDisc].OrigFreeItemQty;
                    objPDAOrdDisc.SlsPerID = _lstDisc[idxDisc].SlsPerID;
                    objPDAOrdDisc.SOLineRef = _lstDisc[idxDisc].SOLineRef;
                    objPDAOrdDisc.UserOperationLog = _lstDisc[idxDisc].UserOperationLog;
                    objPDAOrdDisc.DiscBreakLineRef = _lstDisc[idxDisc].DiscBreakLineRef;
                    objPDAOrdDisc.RefLineRef = Util.PassNull(_lstDisc[idxDisc].RefLineRef);
                    objPDAOrdDisc.GroupRefLineRef = Util.PassNull(_lstDisc[idxDisc].GroupRefLineRef);
                    objPDAOrdDisc.LUpd_DateTime = DateTime.Now;
                    objPDAOrdDisc.LUpd_Prog = "OM20500";
                    objPDAOrdDisc.LUpd_User = Current.UserName;
                    objPDAOrdDisc.tstamp = new byte[1];
                    #endregion
                }
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
                        _db.OM_PDAOrdDisc.DeleteObject(item);
                    }
                }
            }
            #endregion

            _db.SaveChanges();
        }

        private string GetCodeFromExcel(string codeDescr)
        {
            int index = codeDescr.IndexOf(" - ");
            if (index > 0)
            {
                return codeDescr.Substring(0, index);
            }
            return codeDescr;// string.Empty;
        }
        #region -Import-
        [HttpPost]
        public ActionResult Import(FormCollection data)
        {
            try
            {
                FileUploadField fileUploadField = X.GetCmp<FileUploadField>("btnImport");
                HttpPostedFile file = fileUploadField.PostedFile;
                FileInfo fileInfo = new FileInfo(file.FileName);

                var objConfig = _db.OM20500_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (objConfig != null)
                {
                    isPrice = objConfig.PriceSystem ?? false;
                }


                if (fileInfo.Extension == ".xls" || fileInfo.Extension == ".xlsx")
                {
                    Workbook workbook = new Workbook(fileUploadField.PostedFile.InputStream);
                    if (workbook.Worksheets.Count > 0)
                    {
                        Worksheet workSheet = workbook.Worksheets[0];

                        #region Define
                        string message = string.Empty;
                        string branchID = string.Empty;
                        string slsperID = string.Empty;
                        string orderNbr = string.Empty;
                        string custID = string.Empty;
                        string orderDate = string.Empty;
                        string invtID = string.Empty;
                        string qty = string.Empty;
                        string unit = string.Empty;
                        string price = string.Empty;
                        string taxCat = string.Empty;
                        string taxID = string.Empty;
                        string terms = string.Empty;
                        string shipPriority = string.Empty;
                        string discType = string.Empty;
                        string amoutDiscAmt = string.Empty;
                        string discCode = string.Empty;
                        string errorBanchIDNotEx = string.Empty;
                        string errorBanchID = string.Empty;
                        string errorSlsperIDNotEx = string.Empty;
                        string errorSlsperID = string.Empty;
                        string errorOrderNbr = string.Empty;
                        string errorOrdMaxLength = string.Empty;
                        string errorCustIDNotEx = string.Empty;
                        string errorCustID = string.Empty;
                        string errorInvtIDNotEx = string.Empty;
                        string errorInvtID = string.Empty;
                        string errorFormatQty = string.Empty;
                        string errorQtyValue = string.Empty;
                        string errorFormatPrice = string.Empty;
                        string errorPriceValue = string.Empty;
                        string errorTaxCatNotEx = string.Empty;
                        string errorTaxCat = string.Empty;
                        string errorUnitNotEx = string.Empty;
                        string errorUnit = string.Empty;
                        string errorFormatOrderDate = string.Empty;
                        string errorOrderDate = string.Empty;
                        string errorQty = string.Empty;
                        string errorPrice = string.Empty;
                        string errorDuplicateOrdNbr = string.Empty;
                        string errorDuplicateInvtID = string.Empty;
                        string errorDiscTypeNull = string.Empty;
                        string errorDiscType = string.Empty;
                        string errorFormatAmoutDiscAmt = string.Empty;
                        string errorAmoutDiscAmtValue = string.Empty;
                        string errorAmoutDiscAmt = string.Empty;
                        string errorDiscCode = string.Empty;
                        string errorDiscCodeNull = string.Empty;
                        #endregion

                        _lstOrderDetImp = new List<OM_PDASalesOrdDet>();
                        _lstOrderImp = new List<OM_PDASalesOrd>();
                        var lstOrderImport = new List<OrderImport>();
                        var lstBranch = _db.OM20500_piBranchID(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                        var lstCust = _db.OM20500_piCustomer(Current.CpnyID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                        var lstSls = _db.OM20500_piSalesperson(Current.CpnyID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                        var lstInventory = _db.OM20500_piInventory(Current.CpnyID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
                        //var lstTaxCat = _db.OM20500_piTaxCat(Current.UserName, Current.CpnyID, Current.LangID).ToList();
                        // Default value 
                        var objDefault = _db.OM20500_piDefaultValue(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                        if (objDefault != null)
                        {
                            taxCat = objDefault.TaxCat;
                            taxID = objDefault.TaxID00;
                            terms = objDefault.Terms;
                            shipPriority = objDefault.ShipPriority;
                        }

                        bool flagCheck = false;
                        for (int i = 1; i <= workSheet.Cells.MaxDataRow; i++)
                        {
                            string stkUnit = string.Empty;
                            string dfltSOUnit = string.Empty;
                            string invtDescr = string.Empty;
                            double unitRate = 1;
                            string classID = string.Empty;
                            string priceClassID = string.Empty;
                            string classIDCust = string.Empty;

                            branchID = Util.PassNull(workSheet.Cells[i, 0].StringValue);
                            slsperID = Util.PassNull(workSheet.Cells[i, 1].StringValue);
                            orderNbr = Util.PassNull(workSheet.Cells[i, 2].StringValue);
                            custID = Util.PassNull(workSheet.Cells[i, 3].StringValue);
                            orderDate = Util.PassNull(workSheet.Cells[i, 4].StringValue);
                            discType = GetCodeFromExcel(Util.PassNull(workSheet.Cells[i, 5].StringValue));
                            invtID = Util.PassNull(workSheet.Cells[i, 6].StringValue);
                            qty = Util.PassNull(workSheet.Cells[i, 7].StringValue);
                            price = Util.PassNull(workSheet.Cells[i, 8].StringValue);
                            amoutDiscAmt = Util.PassNull(workSheet.Cells[i, 9].StringValue);
                            discCode = Util.PassNull(workSheet.Cells[i, 10].StringValue);

                            if (branchID == "" && orderNbr == "")
                            {
                                continue;
                            }
                            #region -Validate Data-
                            if (branchID != "")
                            {
                                var objBanchID = lstBranch.FirstOrDefault(p => p.BranchID == branchID.ToUpper());
                                if (objBanchID == null)
                                {
                                    errorBanchIDNotEx += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    branchID = objBanchID.BranchID;
                                }
                            }
                            else
                            {
                                errorBanchID += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }

                            if (slsperID != "")
                            {
                                var objSlsperID = lstSls.FirstOrDefault(p => p.SlsperID == slsperID.ToUpper() && p.BranchID == branchID.ToUpper());
                                if (objSlsperID == null)
                                {
                                    errorSlsperIDNotEx += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    slsperID = objSlsperID.SlsperID;
                                }
                            }
                            else
                            {
                                errorSlsperID += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }

                            if (orderNbr == "")
                            {
                                errorOrderNbr += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }
                            else
                            {
                                if (orderNbr.Length > 15)
                                {
                                    errorOrdMaxLength += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    orderNbr.ToUpper();
                                }
                            }

                            if (custID != "")
                            {
                                var objCust = lstCust.FirstOrDefault(p => p.CustID == custID.ToUpper() && p.BranchID == branchID.ToUpper());
                                if (objCust == null)
                                {
                                    errorCustIDNotEx += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    custID = objCust.CustID;
                                    priceClassID = objCust.PriceClassID;
                                    classIDCust = objCust.ClassID;
                                }
                            }
                            else
                            {
                                errorCustID += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }

                            DateTime parsed = DateTime.Now;
                            if (orderDate != "")
                            {

                                bool valid = DateTime.TryParseExact(orderDate, "dd-MM-yyyy",
                                                                    CultureInfo.InvariantCulture,
                                                                    DateTimeStyles.None,
                                                                    out parsed);
                                if (valid == false)
                                {
                                    errorFormatOrderDate += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                            }
                            else
                            {
                                errorOrderDate += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }

                            if (invtID != "")
                            {
                                var objInvtID = lstInventory.FirstOrDefault(p => p.InvtID == invtID);
                                if (objInvtID == null)
                                {
                                    errorInvtIDNotEx += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    invtID = objInvtID.InvtID;
                                    stkUnit = objInvtID.Unit;
                                    dfltSOUnit = objInvtID.DfltSOUnit;
                                    invtDescr = objInvtID.Descr;
                                    classID = objInvtID.ClassID;
                                    var objUnit = SetUOM(invtID, classID, stkUnit, dfltSOUnit);
                                    if (objUnit != null)
                                    {
                                        unitRate = objUnit.CnvFact;
                                    }

                                }
                            }
                            else
                            {
                                if (discType != "D")
                                {
                                    errorInvtID += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }

                            }


                            if (qty != "")
                            {
                                double qtyValue = 0;
                                if (!double.TryParse(qty, out qtyValue))
                                {
                                    errorFormatQty += (i + 1).ToString() + ",";
                                    flagCheck = true;
                                }
                                else
                                {
                                    if (qtyValue < 0 || (qtyValue % 1) != 0)
                                    {
                                        errorQtyValue += (i + 1).ToString() + ",";
                                        flagCheck = true;
                                    }
                                }
                            }
                            else
                            {
                                if (discType != "D")
                                {
                                    errorQty += (i + 1).ToString() + ",";
                                    flagCheck = true;
                                }
                            }
                            if (!isPrice)
                            {
                                if (price != "")
                                {
                                    double priceValue = 0;
                                    if (!double.TryParse(price, out priceValue))
                                    {
                                        errorFormatPrice += (i + 1).ToString() + ",";
                                        flagCheck = true;
                                    }
                                    else
                                    {
                                        if (priceValue < 0 || (priceValue % 1) != 0)
                                        {
                                            errorPriceValue += (i + 1).ToString() + ",";
                                            flagCheck = true;
                                        }
                                    }
                                }
                                else
                                {
                                    if (discType != "D")
                                    {
                                        errorPrice += (i + 1).ToString() + ",";
                                        flagCheck = true;
                                    }
                                }
                            }

                            if (discType == "")
                            {
                                errorDiscTypeNull += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }
                            else if (discType != "S" && discType != "F" && discType == "S")
                            {
                                errorDiscType += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }

                            if (amoutDiscAmt != "")
                            {
                                double amountValue = 0;
                                if (!double.TryParse(amoutDiscAmt, out amountValue))
                                {
                                    errorFormatAmoutDiscAmt += (i + 1).ToString() + ",";
                                    flagCheck = true;
                                }
                                else
                                {
                                    if (amountValue < 0 || (amountValue % 1) != 0)
                                    {
                                        errorAmoutDiscAmtValue += (i + 1).ToString() + ",";
                                        flagCheck = true;
                                    }
                                }
                            }
                            else
                            {
                                if (discType == "D")
                                {
                                    errorAmoutDiscAmt += (i + 1).ToString() + ",";
                                    flagCheck = true;
                                }

                            }
                            if (discType == "F" || discType == "D")
                            {
                                if (discCode == "")
                                {
                                    errorDiscCodeNull = (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    if (discType == "D")
                                    {
                                        var objDiscCode = _db.OM20500_pdDiscCode(Current.UserName, Current.CpnyID, Current.LangID, branchID, discCode).FirstOrDefault(p => p.PromoType == "A");
                                        if (objDiscCode == null)
                                        {
                                            errorDiscCode = (i + 1).ToString() + ", ";
                                            flagCheck = true;
                                        }
                                    }
                                    if (discType == "F")
                                    {
                                        var objDiscCode = _db.OM20500_pdDiscCode(Current.UserName, Current.CpnyID, Current.LangID, branchID, discCode).FirstOrDefault(p => p.PromoType == "I");
                                        if (objDiscCode == null)
                                        {
                                            errorDiscCode = (i + 1).ToString() + ", ";
                                            flagCheck = true;
                                        }
                                    }

                                }
                            }



                            //string discCode = string.Empty;


                            if (flagCheck == true)
                            {
                                continue;
                            }
                            #endregion

                            #region -Get data to List-
                            if (!_lstOrderImp.Any(x => x.OrderNbr == orderNbr && x.BranchID == branchID))
                            {
                                var obj = new OM_PDASalesOrd();
                                obj.OrderNbr = orderNbr;
                                obj.BranchID = branchID;
                                obj.OrderDate = parsed;
                                obj.CustID = custID;
                                obj.SlsPerID = slsperID;
                                obj.DeliveryID = "";
                                obj.DoNotCalDisc = 0;
                                obj.ExpiryDate = DateTime.Now;
                                obj.ClassID = classIDCust;
                                obj.PriceClassID = priceClassID;

                                obj.OrderType = "IN";

                                obj.ARDocDate = DateTime.Now;

                                obj.ImpExp = "";
                                obj.Status = "H";
                                obj.Terms = terms;
                                obj.TaxID00 = taxID;
                                obj.ShipPriority = shipPriority;
                                _lstOrderImp.Add(obj);
                                OrderImport objOrderImp = new OrderImport();
                                objOrderImp.BranchID = branchID;
                                objOrderImp.OrderNbr = orderNbr;
                                objOrderImp.CustID = custID;
                                lstOrderImport.Add(objOrderImp);
                            }
                            else
                            {
                                if (!lstOrderImport.Any(p => p.BranchID == branchID && p.OrderNbr == orderNbr && p.CustID == custID))
                                {
                                    errorDuplicateOrdNbr += (i + 1).ToString() + ",";
                                }
                            }
                            if (!_lstOrderDetImp.Any(x => x.OrderNbr == orderNbr && x.BranchID == branchID && x.InvtID == invtID && x.DiscCode != ""))
                            {
                                if (discType == "S")
                                {
                                    var objDet = new OM_PDASalesOrdDet();
                                    objDet.OrderNbr = orderNbr;
                                    objDet.InvtID = invtID;
                                    objDet.BranchID = branchID;


                                    objDet.Descr = invtDescr;
                                    objDet.BOType = objDefault.BOType;
                                    objDet.FreeItem = false;

                                    objDet.LineQty = Math.Abs(qty.ToDouble());
                                    objDet.DiscAmt = 0;
                                    objDet.DiscPct = 0;
                                    objDet.DiscCode = "";
                                    if (isPrice)
                                    {
                                        var lstPrice = _db.OM20500_pdSOPrice(objDet.BranchID, custID, "", DateTime.Now.ToString("yyyy-MM-dd")).ToList();
                                        if (lstPrice != null)
                                        {
                                            var priceData = lstPrice.FirstOrDefault(p => p.InvtID == objDet.InvtID && p.Unit == dfltSOUnit);
                                            if (priceData != null)
                                            {
                                                objDet.SlsPrice = priceData.Price.ToDouble();

                                            }
                                            else
                                            {
                                                objDet.SlsPrice = 0;
                                            }
                                        }
                                        else
                                        {
                                            objDet.SlsPrice = 0;
                                        }
                                    }
                                    else
                                    {
                                        objDet.SlsPrice = price.ToDouble();
                                    }



                                    objDet.LineAmt = Math.Round(objDet.LineQty * objDet.SlsPrice, 0);
                                    objDet.UnitMultDiv = "M";

                                    objDet.TaxCat = taxCat;
                                    objDet.TaxID00 = objDefault.TaxID00;
                                    objDet.UnitRate = unitRate;
                                    objDet.SlsUnit = dfltSOUnit;
                                    objDet.BarCode = "";
                                    _lstOrderDetImp.Add(objDet);
                                }
                                else if (discType == "F")
                                {
                                    var objDet = new OM_PDASalesOrdDet();
                                    objDet.OrderNbr = orderNbr;
                                    objDet.InvtID = invtID;
                                    objDet.BranchID = branchID;


                                    objDet.Descr = invtDescr;
                                    objDet.BOType = objDefault.BOType;
                                    objDet.FreeItem = true;

                                    objDet.LineQty = Math.Abs(qty.ToDouble());
                                    objDet.DiscAmt = 0;
                                    objDet.DiscPct = 0;
                                    objDet.DiscCode = "";

                                    objDet.SlsPrice = 0;

                                    objDet.LineAmt = 0;
                                    objDet.UnitMultDiv = "M";

                                    objDet.TaxCat = taxCat;
                                    objDet.TaxID00 = objDefault.TaxID00;
                                    objDet.UnitRate = unitRate;
                                    objDet.SlsUnit = dfltSOUnit;
                                    objDet.BarCode = "";
                                    objDet.DiscCode = discCode;
                                    _lstOrderDetImp.Add(objDet);
                                }

                            }
                            else
                            {
                                errorDuplicateInvtID += (i + 1).ToString() + ",";
                            }
                            if (!_lstOrderManualImp.Any(x => x.OrderNbr == orderNbr && x.BranchID == branchID && x.FreeItemID == invtID))
                            {
                                if (discType == "F")
                                {
                                    var objManual = new OM_PDAOrdManualDisc();
                                    objManual.FreeItemID = invtID;
                                    objManual.DiscCode = discCode;
                                    objManual.PromoType = "I";
                                    objManual.OrderNbr = orderNbr;
                                    objManual.BranchID = branchID;
                                    objManual.FreeItemQty = Math.Abs(qty.ToDouble());
                                    objManual.FreeItemUnit = dfltSOUnit;
                                    _lstOrderManualImp.Add(objManual);
                                }
                            }
                            if (discType == "D")
                            {
                                if (!_lstOrderManualImp.Any(x => x.OrderNbr == orderNbr && x.BranchID == branchID && x.DiscAmt == amoutDiscAmt.ToDouble()))
                                {

                                    var objManual = new OM_PDAOrdManualDisc();
                                    objManual.FreeItemID = "";
                                    objManual.DiscCode = discCode;
                                    objManual.PromoType = "A";
                                    objManual.OrderNbr = orderNbr;
                                    objManual.BranchID = branchID;
                                    objManual.FreeItemQty = 0;
                                    objManual.FreeItemUnit = "";
                                    objManual.DiscAmt = amoutDiscAmt.ToDouble();
                                    _lstOrderManualImp.Add(objManual);
                                }
                            }
                            #endregion
                        }
                        #region -Get message content-
                        message = errorBanchIDNotEx == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("BranchID"), errorBanchIDNotEx);
                        message += errorBanchID == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("BranchID"), errorBanchID);
                        message += errorSlsperIDNotEx == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("SlsperID"), errorSlsperIDNotEx);
                        message += errorSlsperID == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("SlsperID"), errorSlsperID);

                        message += errorOrderNbr == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("OrderNbr"), errorOrderNbr);
                        message += errorOrdMaxLength == "" ? "" : string.Format(Message.GetString("2020050614", null), Util.GetLang("OrderNbr"), errorOrdMaxLength, 15);

                        message += errorCustIDNotEx == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("CustID"), errorCustIDNotEx);
                        message += errorCustID == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("CustID"), errorCustID);

                        message += errorFormatOrderDate == "" ? "" : string.Format(Message.GetString("2020050615", null), Util.GetLang("OrderDate"), errorFormatOrderDate);
                        message += errorOrderDate == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("OrderDate"), errorOrderDate);

                        message += errorInvtIDNotEx == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("InvtID"), errorInvtIDNotEx);
                        message += errorInvtID == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("InvtID"), errorInvtID);
                        message += errorFormatQty == "" ? "" : string.Format(Message.GetString("2020050612", null), Util.GetLang("Qty"), errorFormatQty);
                        message += errorQtyValue == "" ? "" : string.Format(Message.GetString("2020050613", null), Util.GetLang("Qty"), errorQtyValue);
                        message += errorQty == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("Qty"), errorQty);

                        message += errorUnitNotEx == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("Unit"), errorUnitNotEx);
                        message += errorUnit == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("Unit"), errorUnit);
                        message += errorFormatPrice == "" ? "" : string.Format(Message.GetString("2020050612", null), Util.GetLang("Price"), errorFormatPrice);
                        message += errorPriceValue == "" ? "" : string.Format(Message.GetString("2020050613", null), Util.GetLang("Price"), errorPriceValue);
                        message += errorPrice == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("Price"), errorPrice);

                        message += errorTaxCatNotEx == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("Tax"), errorTaxCatNotEx);
                        message += errorTaxCat == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("Tax"), errorTaxCat);

                        message += errorDuplicateOrdNbr == "" ? "" : string.Format(Message.GetString("2020051210", null), Util.GetLang("OrderNbr"), errorDuplicateOrdNbr);
                        message += errorDuplicateInvtID == "" ? "" : string.Format(Message.GetString("2020051210", null), Util.GetLang("InvtID"), errorDuplicateInvtID);

                        message += errorDiscTypeNull == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("Loaihang"), errorDiscTypeNull);
                        message += errorDiscType == "" ? "" : string.Format(Message.GetString("2018052962", null), Util.GetLang("Loaihang"), errorDiscType);


                        message += errorFormatAmoutDiscAmt == "" ? "" : string.Format(Message.GetString("2018052962", null), Util.GetLang("DiscCountDiscManual"), errorFormatAmoutDiscAmt);
                        message += errorAmoutDiscAmtValue == "" ? "" : string.Format(Message.GetString("2020050612", null), Util.GetLang("DiscCountDiscManual"), errorAmoutDiscAmtValue);
                        message += errorAmoutDiscAmt == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("DiscCountDiscManual"), errorAmoutDiscAmt);

                        message += errorDiscCodeNull == "" ? "" : string.Format(Message.GetString("2020050611", null), Util.GetLang("DiscID"), errorDiscCodeNull);
                        message += errorDiscCode == "" ? "" : string.Format(Message.GetString("2020050610", null), Util.GetLang("DiscID"), errorDiscCode);



                        #endregion
                        if (message == "" || message == string.Empty)
                        {
                            if (_lstOrderImp.Count == 0)
                            {
                                Util.AppendLog(ref _logMessage, "704", "", data: new { message });
                            }
                            else
                            {

                                var lstOrder = _lstOrderImp.GroupBy(p => new { p.OrderNbr }).Select(g => g.First()).ToList();
                                foreach (var item1 in lstOrder)
                                {
                                    string order = item1.OrderNbr;
                                    var objOrder = _db.OMPDANumbering(item1.BranchID, "OrderNbr", item1.OrderType).FirstOrDefault();
                                    if (objOrder != null)
                                    {
                                        var recordOrd = _lstOrderImp.FirstOrDefault(p => p.OrderNbr == item1.OrderNbr && p.BranchID == item1.BranchID);
                                        if (recordOrd != null)
                                        {
                                            recordOrd.OrderNbr = objOrder;
                                            recordOrd.Remark = order;
                                        }
                                        var lstDet = _lstOrderDetImp.Where(p => p.OrderNbr == order).ToList();
                                        foreach (var itemDet in lstDet)
                                        {
                                            var recordDet = _lstOrderDetImp.FirstOrDefault(p => p.OrderNbr == itemDet.OrderNbr && p.BranchID == itemDet.BranchID && p.InvtID == itemDet.InvtID && p.DiscCode == itemDet.DiscCode);
                                            if (recordDet != null)
                                            {
                                                recordDet.OrderNbr = objOrder;
                                            }
                                        }
                                        var lstManual = _lstOrderManualImp.Where(p => p.OrderNbr == order).ToList();
                                        foreach (var itemManual in lstManual)
                                        {
                                            var recordManual = _lstOrderManualImp.FirstOrDefault(p => p.OrderNbr == itemManual.OrderNbr && p.BranchID == itemManual.BranchID && p.FreeItemID == itemManual.FreeItemID && p.DiscCode == itemManual.DiscCode && p.PromoType == itemManual.PromoType);
                                            if (recordManual != null)
                                            {
                                                recordManual.OrderNbr = objOrder;
                                            }
                                        }

                                    }
                                }
                                Save_OrdImp();
                            }
                        }
                        Util.AppendLog(ref _logMessage, "20121418", "", data: new { message });
                    }
                    return _logMessage;
                }
                else
                {
                    Util.AppendLog(ref _logMessage, "2014070701", parm: new[] { fileInfo.Extension.Replace(".", "") });
                }
            }
            catch (Exception ex)
            {
                if (ex is MessageException) return (ex as MessageException).ToMessage();
                return Json(new { success = false, messid = 9991, errorMsg = ex.ToString(), type = "error", fn = "", parm = "" });
            }
            return _logMessage;

        }
        #endregion -Import-
        [HttpPost]
        public ActionResult ExportExcel(FormCollection data)
        {
            string FileName = Util.GetLang("OM20500_Template");
            string filePath = "";
            try
            {
                filePath = string.Format("ExportTemplate/{0}{1}.xlsx", "OM20500_Template", Current.LangID.ToString("00"));
                string serverPath = Server.MapPath("~/" + filePath);

                if (!System.IO.File.Exists(serverPath))
                {
                    throw new MessageException("9", "", new string[] { filePath });
                }

                Stream stream = new MemoryStream();
                Workbook workbook = new Workbook(serverPath);


                workbook.Save(stream, SaveFormat.Xlsx);
                stream.Flush();
                stream.Position = 0;
                return new FileStreamResult(stream, "application/vnd.ms-excel") { FileDownloadName = FileName + ".xlsx" };
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
        public ActionResult SaveManual(FormCollection data, string branchID, string orderNbr, string slsperID)
        {
            var lstManualHandler = new StoreDataHandler(data["lstManual"]);
            var lstManual = lstManualHandler.ObjectData<OM20500_pgManualPromo_Result>().ToList();

            var objOrder = _db.OM_PDASalesOrd.FirstOrDefault(p => p.BranchID == branchID && p.OrderNbr == orderNbr);
            double totalDiscAmt = 0;
            List<OM_PDAOrdManualDisc> lstManualLineRef = new List<OM_PDAOrdManualDisc>();
            lstManualLineRef = _db.OM_PDAOrdManualDisc.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();
            List<OM_PDASalesOrdDet> lstSalesOrdDet = new List<OM_PDASalesOrdDet>();
            lstSalesOrdDet = _db.OM_PDASalesOrdDet.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();

            List<OM_PDAOrdManualDisc> lstPDAOrdManualRemove = new List<OM_PDAOrdManualDisc>();
            lstPDAOrdManualRemove = _db.OM_PDAOrdManualDisc.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();

            foreach (var item in lstManual)
            {
                if (item.Selected == false) continue;
                string lineRef = "";
                if (item.PromoType == "I")
                {
                    var record = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == branchID && p.OrderNbr == orderNbr && p.LineRef == item.SOLineRef);
                    if (record == null)
                    {
                        record = new OM_PDASalesOrdDet();
                        record.ResetET();
                        record.BranchID = branchID;
                        record.OrderNbr = orderNbr;
                        var objLineRef = lstSalesOrdDet.OrderByDescending(p => p.LineRef).FirstOrDefault();
                        if (objLineRef != null)
                        {
                            int num = objLineRef.LineRef.ToInt() + 1;
                            lineRef = record.LineRef = LastLineRef(num.ToString());
                        }
                        else
                        {
                            lineRef = record.LineRef = "00001";
                        }
                        record.Crtd_Datetime = DateTime.Now;
                        record.Crtd_Prog = _screenNbr;
                        record.Crtd_User = Current.UserName;
                        _db.OM_PDASalesOrdDet.AddObject(record);
                        lstSalesOrdDet.Add(record);
                    }
                    else
                    {
                        lineRef = record.LineRef;
                    }
                    record.BarCode = "";
                    record.BOCustID = "";
                    record.BOType = "S";
                    record.BudgetID1 = "";
                    record.BudgetID2 = "";
                    record.CostID = "";
                    record.Descr = _db.IN_Inventory.FirstOrDefault(p => p.InvtID == item.FreeItemID).Descr;
                    record.DiscAmt = 0;
                    record.DiscAmt1 = 0;
                    record.DiscAmt2 = 0;
                    record.DiscCode = item.DiscCode;
                    record.DiscID1 = "";
                    record.DiscID2 = "";
                    record.DiscPct = 0;
                    record.DiscPct1 = 0;
                    record.DiscPct2 = 0;
                    record.DiscSeq1 = "";
                    record.DiscSeq2 = "";
                    record.DocDiscAmt = 0;
                    record.FreeItem = true;
                    record.FreeItemQty1 = 0;
                    record.FreeItemQty2 = 0;
                    record.GroupDiscAmt1 = 0;
                    record.GroupDiscAmt2 = 0;
                    record.GroupDiscID1 = "";
                    record.GroupDiscID2 = "";
                    record.GroupDiscPct1 = 0;
                    record.GroupDiscPct2 = 0;
                    record.GroupDiscSeq1 = "";
                    record.GroupDiscSeq2 = "";
                    record.InvtID = item.FreeItemID;
                    record.ItemPriceClass = "";
                    record.LineAmt = 0;
                    record.LineQty = item.FreeItemQty;
                    record.OrderType = "IN";
                    record.OrigOrderNbr = "";
                    record.QtyBO = 0;
                    record.QtyInvc = 0;
                    record.QtyOpenShip = 0;
                    record.QtyShip = 0;
                    record.ShipStatus = "";
                    record.SiteID = item.SiteType;
                    record.SlsPrice = 0;
                    record.SlsUnit = item.UnitDescr;
                    record.SOFee = 0;
                    record.TaxAmt00 = 0;
                    record.TaxAmt01 = 0;
                    record.TaxAmt02 = 0;
                    record.TaxAmt03 = 0;
                    record.TaxCat = _db.IN_Inventory.FirstOrDefault(p => p.InvtID == item.FreeItemID).TaxCat;
                    record.TaxID00 = "*";
                    record.TaxID01 = "";
                    record.TaxID02 = "";
                    record.TaxID03 = "";
                    record.TxblAmt00 = 0;
                    record.TxblAmt01 = 0;
                    record.TxblAmt02 = 0;
                    record.TxblAmt03 = 0;
                    record.UnitMultDiv = "M";
                    record.UnitRate = _db.IN_UnitConversion.FirstOrDefault(p => p.InvtID == item.FreeItemID && p.FromUnit == item.UnitDescr && p.ToUnit == item.StkUnit).CnvFact;
                    record.UnitWeight = 0;
                    record.LUpd_Datetime = DateTime.Now;
                    record.LUpd_Prog = _screenNbr;
                    record.LUpd_User = Current.UserName;
                    record.ManuDiscAmt = 0;
                    record.POSM = "";
                    record.POSMImg = "";
                    record.Qty = 0;
                    record.Cumulative = 0;
                    record.Mark = 0;
                    record.QtyApprove = 0;
                    record.QtyERP = 0;
                    record.QtyShipD = 0;
                    record.POLineRef = "";
                    record.POPrice = 0;
                    record.DisplayID = "";
                    record.DisplayPeriodID = "";
                    record.WhseLoc = "";
                    record.KitLineRef = "";
                    record.ManuDiscPct = 0;
                    record.DiscIDSolomon = "";
                    record.Declaration = "";
                    record.Bonus = 0;
                    record.ConsumerPromotionID = "";
                    record.GiftPoint = 0;
                    record.Level = 0;
                    record.IsBooking = false;
                    record.AccumulateID = "";
                }


                var recordManual = _db.OM_PDAOrdManualDisc.FirstOrDefault(p => p.BranchID == branchID && p.DiscCode == item.DiscCode && p.OrderNbr == orderNbr && p.LineRef == item.LineRef);
                if (recordManual == null)
                {
                    recordManual = new OM_PDAOrdManualDisc();
                    recordManual.ResetET();
                    recordManual.BranchID = branchID;
                    recordManual.DiscCode = item.DiscCode;
                    recordManual.OrderNbr = orderNbr;
                    var objLineRef = lstManualLineRef.OrderByDescending(p => p.LineRef).FirstOrDefault();
                    if (objLineRef != null)
                    {
                        int num = objLineRef.LineRef.ToInt() + 1;
                        recordManual.LineRef = LastLineRef(num.ToString());
                    }
                    else
                    {
                        recordManual.LineRef = "00001";
                    }
                    recordManual.Crtd_DateTime = DateTime.Now;
                    recordManual.Crtd_Prog = _screenNbr;
                    recordManual.Crtd_User = Current.UserName;
                    lstManualLineRef.Add(recordManual);
                    _db.OM_PDAOrdManualDisc.AddObject(recordManual);
                }
                recordManual.SlsperID = slsperID;
                recordManual.ObjApply = "";
                recordManual.PromoType = item.PromoType;
                if (item.PromoType == "I")
                {
                    recordManual.DiscAmt = 0;
                    recordManual.DisctblAmt = 0;
                    recordManual.DiscPct = 0;
                    recordManual.FreeItemID = item.FreeItemID;
                    recordManual.FreeItemQty = item.FreeItemQty;
                    recordManual.FreeItemUnit = item.UnitDescr;
                }
                else
                {
                    recordManual.DiscAmt = item.TotalDiscout;
                    totalDiscAmt += item.TotalDiscout;
                    recordManual.DisctblAmt = objOrder.LineAmt;
                    recordManual.DiscPct = 0;
                    recordManual.FreeItemID = "";
                    recordManual.FreeItemQty = 0;
                    recordManual.FreeItemUnit = "";
                }

                recordManual.SOLineRef = lineRef;
                recordManual.BudgetID = "";
                recordManual.LUpd_DateTime = DateTime.Now;
                recordManual.LUpd_Prog = _screenNbr;
                recordManual.LUpd_User = Current.UserName;

                var recordRemoveMaual = lstPDAOrdManualRemove.FirstOrDefault(p => p.BranchID == branchID && p.DiscCode == item.DiscCode && p.OrderNbr == orderNbr && p.LineRef == item.LineRef);
                if (recordRemoveMaual != null)
                {
                    lstPDAOrdManualRemove.Remove(recordRemoveMaual);
                }
            }


            foreach (var item in lstPDAOrdManualRemove)
            {
                var record = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == item.BranchID && p.OrderNbr == item.OrderNbr && p.LineRef == item.SOLineRef);
                if (record != null)
                {
                    _db.OM_PDASalesOrdDet.DeleteObject(record);
                }
                _db.OM_PDAOrdManualDisc.DeleteObject(item);
                totalDiscAmt += item.DiscAmt;
            }
            objOrder.ManualDiscAmt = totalDiscAmt;
            objOrder.OrdAmt = objOrder.OrdAmt - totalDiscAmt;
            objOrder.LUpd_DateTime = DateTime.Now;
            objOrder.LUpd_Prog = _screenNbr;
            objOrder.LUpd_User = Current.UserName;
            _db.SaveChanges();

            return Json(new
            {
                success = true,
                msgCode = 8009
            });
        }
        private void Save_OrdImp()
        {
            var totalOrder = _lstOrderImp.Count;
            for (int idx = 0; idx < totalOrder; idx++)
            {
                var item = _lstOrderImp[idx];
                _db = Util.CreateObjectContext<OM20500Entities>(false);
                _objType = _db.OM_OrderType.FirstOrDefault(p => p.OrderType == item.OrderType);
                if (_objType == null)
                {
                    throw new MessageException("8013", "", new string[] { item.OrderType });
                }
                _objIN = _db.IN_Setup.FirstOrDefault(p => p.BranchID == item.BranchID && p.SetupID == "IN");
                if (_objIN == null)
                {
                    throw new MessageException("20404", new string[] { "IN_Setup" });
                }
                _objUser = _db.OM20500_pdLoadUserDefault(Current.UserName, Current.CpnyID, Current.LangID, item.BranchID, item.OrderType, item.SlsPerID).FirstOrDefault();

                if (_objUser == null)
                {
                    throw new MessageException("8006");
                }
                if (item.OrderType == "IN")
                {
                    var ord = _db.OM_PDASalesOrd.FirstOrDefault(p => p.OrderNbr == item.OrderNbr && p.BranchID == item.BranchID);
                    if (ord != null)
                    {
                        throw new MessageException("2000", "", new string[] { Util.GetLang("OrderNbr"), item.OrderNbr });
                    }
                    else
                    {
                        ord = new OM_PDASalesOrd();
                        ord.OrderNbr = item.OrderNbr;
                        ord.OrderNo = (short)(_db.OM20500_pdGetOrderNo(item.BranchID, item.SlsPerID, item.OrderDate, item.ShipDate.PassMin().ToDateShort()).FirstOrDefault().Value + 1);
                        Update_PDAOrdImp(ord, item, true);
                        _db.OM_PDASalesOrd.AddObject(ord);
                    }
                    Save_PDADetImp(ref ord, item);
                    Save_PDAManual(ref ord, item);
                    ord.ManualDiscAmt = _sumAmoutManual;
                    ord.OrdAmt = ord.OrdAmt - _sumAmoutManual;
                    _db.SaveChanges();
                }

            }
        }
        private void Save_PDAManual(ref OM_PDASalesOrd ord, OM_PDASalesOrd objOrd)
        {
            _sumAmoutManual = 0;
            List<OM_PDAOrdManualDisc> lstManualDisc = new List<OM_PDAOrdManualDisc>();
            lstManualDisc = _db.OM_PDAOrdManualDisc.Where(p => p.BranchID == objOrd.BranchID && p.OrderNbr == objOrd.OrderNbr).ToList();
            var lstOrdManual = _lstOrderManualImp.Where(p => p.BranchID == objOrd.BranchID && p.OrderNbr == objOrd.OrderNbr).ToList();
            foreach (var item in lstOrdManual)
            {
                var recordManual = lstManualDisc.FirstOrDefault(p => p.BranchID == objOrd.BranchID && p.OrderNbr == objOrd.OrderNbr && p.DiscCode == item.DiscCode && p.LineRef == item.LineRef);
                if (recordManual == null)
                {
                    recordManual = new OM_PDAOrdManualDisc();
                    recordManual.ResetET();
                    recordManual.BranchID = objOrd.BranchID;
                    recordManual.DiscCode = item.DiscCode;
                    recordManual.OrderNbr = objOrd.OrderNbr;
                    var objLineRef = lstManualDisc.OrderByDescending(p => p.LineRef).FirstOrDefault();
                    if (objLineRef != null)
                    {
                        int num = objLineRef.LineRef.ToInt() + 1;
                        recordManual.LineRef = LastLineRef(num.ToString());
                    }
                    else
                    {
                        recordManual.LineRef = "00001";
                    }
                    recordManual.Crtd_DateTime = DateTime.Now;
                    recordManual.Crtd_Prog = _screenNbr;
                    recordManual.Crtd_User = Current.UserName;
                    lstManualDisc.Add(recordManual);
                    _db.OM_PDAOrdManualDisc.AddObject(recordManual);
                }
                recordManual.SlsperID = objOrd.SlsPerID;
                recordManual.ObjApply = "";
                recordManual.PromoType = item.PromoType;
                if (item.PromoType == "I")
                {
                    recordManual.DiscAmt = 0;
                    recordManual.DisctblAmt = 0;
                    recordManual.DiscPct = 0;
                    recordManual.FreeItemID = item.FreeItemID;
                    recordManual.FreeItemQty = item.FreeItemQty;
                    recordManual.FreeItemUnit = item.FreeItemUnit;
                    var objRef = _lstOrderDetImp.FirstOrDefault(x => x.BranchID == objOrd.BranchID && x.OrderNbr == objOrd.OrderNbr && x.InvtID == item.FreeItemID && x.DiscCode != "");
                    recordManual.SOLineRef = objRef != null ? objRef.LineRef : "";
                }
                else
                {
                    recordManual.DiscAmt = item.DiscAmt;
                    _sumAmoutManual += item.DiscAmt;
                    recordManual.DisctblAmt = objOrd.LineAmt;
                    recordManual.DiscPct = 0;
                    recordManual.FreeItemID = "";
                    recordManual.FreeItemQty = 0;
                    recordManual.FreeItemUnit = "";
                }
                recordManual.BudgetID = "";
                recordManual.LUpd_DateTime = DateTime.Now;
                recordManual.LUpd_Prog = _screenNbr;
                recordManual.LUpd_User = Current.UserName;
            }
        }
        private void Save_PDADetImp(ref OM_PDASalesOrd ord, OM_PDASalesOrd objOrd)
        {
            var lstOrDet = _lstOrderDetImp.Where(x => x.BranchID == objOrd.BranchID && x.OrderNbr == objOrd.OrderNbr).ToList();
            var currLineReft = 0;
            var objOrder = ord;
            var lstItemSiteTmp = new List<IN_ItemSite>();
            double totalQty = 0;
            double totalAmt = 0;
            double taxAmtTot = 0;
            double txblAmtTot = 0;
            double totalDiscount = 0;
            foreach (var currentDet in lstOrDet)
            {
                currLineReft++;
                currentDet.LineRef = LastLineRef(currLineReft.ToString());

                OM_PDASalesOrdDet det = _db.OM_PDASalesOrdDet.FirstOrDefault(p => p.BranchID == objOrder.BranchID && p.OrderNbr == objOrder.OrderNbr && p.LineRef == currentDet.LineRef);
                if (det != null && det.EntityState != EntityState.Deleted && det.EntityState != EntityState.Detached)
                {
                    Update_PDADetTmp(det, currentDet, ord, false);
                    det.SiteID = det.FreeItem ? _objUser.DiscSite : _objUser.OMSite;
                    currentDet.SiteID = det.SiteID;

                }
                else
                {
                    det = new OM_PDASalesOrdDet();
                    Update_PDADetTmp(det, currentDet, ord, true);
                    det.SiteID = det.FreeItem ? _objUser.DiscSite : _objUser.OMSite;
                    currentDet.SiteID = det.SiteID;

                    det.Mark = currentDet.Mark;

                    _db.OM_PDASalesOrdDet.AddObject(det);
                }

                totalDiscount += det.DiscAmt;
                totalAmt += det.LineAmt;
                totalQty += det.LineQty;
                taxAmtTot += det.TaxAmt00;
                txblAmtTot += det.TxblAmt00;
                // Thêm Invt nếu chưa có trong In_ItemSite
                if (_db.IN_ItemSite.FirstOrDefault(x => x.InvtID == det.InvtID && x.SiteID == det.SiteID) == null)
                {
                    if (lstItemSiteTmp.FirstOrDefault(x => x.InvtID == det.InvtID && x.SiteID == det.SiteID) == null)
                    {
                        var objInvtID = _db.IN_Inventory.FirstOrDefault(x => x.InvtID == det.InvtID);
                        var in_ItemSite = new IN_ItemSite();
                        Insert_IN_ItemSite(ref in_ItemSite, det.SiteID, objInvtID.InvtID, objInvtID.StkItem);
                        lstItemSiteTmp.Add(in_ItemSite);
                    }
                }
            }
            ord.LineAmt = totalAmt;
            ord.LineDiscAmt = totalDiscount;
            ord.OrdAmt = totalAmt;

            ord.OrdAmtApprove = totalAmt;
            ord.OrdQty = totalQty;
            ord.TaxAmtTot00 = taxAmtTot;
            ord.TxblAmtTot00 = txblAmtTot;

        }
        private void Update_PDAOrdImp(OM_PDASalesOrd t, OM_PDASalesOrd item, bool isNew)
        {
            if (isNew)
            {
                t.ResetET();
                t.NoteId = 0.ToShort();
                t.OrderNbr = item.OrderNbr;
                t.BranchID = item.BranchID;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = "Import";
                t.Crtd_User = Current.UserName;
            }
            t.ImpExp = item.ImpExp;
            t.PriceClassID = string.Empty;
            t.DoNotCalDisc = item.DoNotCalDisc;
            t.CreditHold = false;
            t.IssueMethod = Util.PassNull(item.IssueMethod);
            t.OrigOrderNbr = Util.PassNull(item.OrigOrderNbr);
            t.ReasonCode = Util.PassNull(item.ReasonCode);
            t.ARDocDate = item.ARDocDate;
            t.ARRefNbr = Util.PassNull(item.ARRefNbr);
            t.InvcNbr = Util.PassNull(item.InvcNbr);
            t.InvcNote = Util.PassNull(item.InvcNote);
            t.BudgetID1 = Util.PassNull(item.BudgetID1);
            t.CmmnPct = item.CmmnPct;
            t.CustOrderNbr = Util.PassNull(item.CustOrderNbr);
            t.FreightAllocAmt = item.FreightAllocAmt;
            t.FreightAmt = item.FreightAmt;
            t.FreightCost = item.FreightCost;
            t.LineAmt = item.LineAmt;
            t.LineDiscAmt = item.LineDiscAmt;
            t.MiscAmt = item.MiscAmt;
            t.OrdDiscAmt = item.OrdDiscAmt;
            // t.OrdAmt = item.OrdAmt;
            t.PmtAmt = item.PmtAmt;
            t.PremFreightAmt = item.PremFreightAmt;
            t.VolDiscAmt = item.VolDiscAmt;
            t.SOFeeTot = item.SOFeeTot;
            t.PromiseDate = DateTime.Now.ToDateShort();
            t.TaxAmtTot00 = 0;
            t.TxblAmtTot00 = 0;
            t.TaxAmtTot00 = 0;
            t.TxblAmtTot00 = 0;
            t.TaxID00 = item.TaxID00;
            t.TaxAmtTot01 = 0;
            t.TxblAmtTot01 = 0;
            t.TaxAmtTot01 = 0;
            t.TxblAmtTot01 = 0;
            t.TaxID01 = "";
            t.TaxAmtTot02 = 0;
            t.TxblAmtTot02 = 0;
            t.TaxAmtTot02 = 0;
            t.TxblAmtTot02 = 0;
            t.TaxID02 = "";
            t.TaxAmtTot03 = 0;
            t.TxblAmtTot03 = 0;
            t.TaxAmtTot03 = 0;
            t.TxblAmtTot03 = 0;
            t.TaxID03 = "";
            t.StationID = "";

            t.CustID = Util.PassNull(item.CustID);
            t.ExpiryDate = item.OrderDate;
            t.OrderDate = item.OrderDate;

            t.OrderType = Util.PassNull(item.OrderType);

            t.ShipPriority = Util.PassNull(item.ShipPriority);
            t.ShipViaId = Util.PassNull(item.ShipViaId);
            t.ShipDate = item.ShipDate.PassMin().ToDateShort();
            t.SlsPerID = Util.PassNull(item.SlsPerID);
            t.Status = Util.PassNull(item.Status);
            t.Terms = Util.PassNull(item.Terms);
            t.ToSiteID = Util.PassNull(item.ToSiteID);
            t.UnitsShipped = item.UnitsShipped;
            t.OrderWeight = item.OrderWeight;
            t.VolDiscPct = item.VolDiscPct;

            t.PaymentID = Util.PassNull(item.PaymentID);
            t.PmtDate = item.PmtDate.PassMin();
            t.PaymentBatNbr = Util.PassNull(item.PaymentBatNbr);
            t.PaymentNbr = Util.PassNull(item.PaymentNbr);
            t.IssueNumber = item.IssueNumber;
            t.OrderNo = item.OrderNo;
            t.DeliveryID = Util.PassNull(item.DeliveryID);
            t.Remark = item.Remark;

            t.RewardID = "";
            t.RewardAmt = item.RewardAmt;


            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = "Import";
            t.LUpd_User = Current.UserName;
        }

        private bool Update_PDADetTmp(OM_PDASalesOrdDet t, OM_PDASalesOrdDet s, OM_PDASalesOrd ord, bool isNew)
        {
            if (isNew)
            {
                t.ResetET();
                t.OrderNbr = ord.OrderNbr;
                t.BranchID = ord.BranchID;
                t.LineRef = s.LineRef;

                t.Crtd_Datetime = DateTime.Now;
                t.Crtd_Prog = "Import";
                t.Crtd_User = Current.UserName;
            }

            t.BudgetID1 = Util.PassNull(s.BudgetID1);
            t.BudgetID2 = Util.PassNull(s.BudgetID2);
            t.CostID = Util.PassNull(s.CostID);

            t.ManuDiscAmt = s.ManuDiscAmt;
            t.DiscAmt = s.DiscAmt;
            t.DocDiscAmt = s.DocDiscAmt;
            t.DiscAmt1 = s.DiscAmt1;
            t.DiscAmt2 = s.DiscAmt2;
            t.GroupDiscAmt1 = s.GroupDiscAmt1;
            t.GroupDiscAmt2 = s.GroupDiscAmt2;
            t.LineAmt = s.LineAmt;
            t.SlsPrice = s.SlsPrice;
            t.SOFee = s.SOFee;

            t.Descr = Util.PassNull(s.Descr);
            t.DiscCode = Util.PassNull(s.DiscCode);
            t.POSM = "";

            t.DiscPct = s.DiscPct;
            t.DiscPct1 = s.DiscPct1;
            t.DiscPct2 = s.DiscPct2;
            t.DiscID1 = Util.PassNull(s.DiscID1);
            t.DiscID2 = Util.PassNull(s.DiscID2);
            t.DiscSeq1 = Util.PassNull(s.DiscSeq1);
            t.DiscSeq2 = Util.PassNull(s.DiscSeq2);

            t.GroupDiscPct1 = s.GroupDiscPct1;
            t.GroupDiscPct2 = s.GroupDiscPct2;
            t.GroupDiscID1 = Util.PassNull(s.GroupDiscID1);
            t.GroupDiscID2 = Util.PassNull(s.GroupDiscID2);
            t.GroupDiscSeq1 = Util.PassNull(s.GroupDiscSeq1);
            t.GroupDiscSeq2 = Util.PassNull(s.GroupDiscSeq2);

            t.FreeItem = s.FreeItem;
            t.FreeItemQty1 = s.FreeItemQty1;
            t.FreeItemQty2 = s.FreeItemQty2;
            t.InvtID = Util.PassNull(s.InvtID);
            t.BarCode = "";
            t.ItemPriceClass = "";

            t.LineQty = s.LineQty;
            t.OrderType = ord.OrderType;
            t.QtyInvc = s.QtyInvc;
            t.QtyOpenShip = s.QtyOpenShip;
            t.QtyShip = 0;
            t.QtyApprove = 0;
            t.QtyShipD = 0;
            t.QtyERP = 0;
            t.Qty = 0;

            t.BOType = Util.PassNull(s.BOType);
            t.QtyBO = s.QtyBO;
            if (t.BOType == "O" && Util.PassNull(s.BOCustID) == string.Empty)
                t.BOCustID = ord.CustID;
            else
                t.BOCustID = Util.PassNull(s.BOCustID);

            t.SlsUnit = Util.PassNull(s.SlsUnit);
            t.ShipStatus = Util.PassNull(s.ShipStatus);
            t.TaxCat = Util.PassNull(s.TaxCat);
            t.TaxID00 = Util.PassNull(s.TaxID00);
            t.TaxID01 = Util.PassNull(s.TaxID01);
            t.TaxID02 = Util.PassNull(s.TaxID02);
            t.TaxID03 = Util.PassNull(s.TaxID03);

            t.TaxAmt00 = s.TaxAmt00;
            t.TaxAmt01 = s.TaxAmt01;
            t.TaxAmt02 = s.TaxAmt02;
            t.TaxAmt03 = s.TaxAmt03;

            t.TxblAmt00 = s.TxblAmt00;
            t.TxblAmt01 = s.TxblAmt01;
            t.TxblAmt02 = s.TxblAmt02;
            t.TxblAmt03 = s.TxblAmt03;
            t.Mark = s.Mark;
            t.UnitRate = s.UnitRate;
            t.UnitMultDiv = s.UnitMultDiv;
            t.UnitWeight = s.UnitWeight;
            t.OrigOrderNbr = "";
            t.Cumulative = 0;
            t.LUpd_Datetime = DateTime.Now;
            t.LUpd_Prog = "Import";
            t.LUpd_User = Current.UserName;

            t.TxblAmt00 = Math.Round(t.LineAmt / 1.1, 0);
            t.TaxAmt00 = Math.Round(t.LineAmt - t.TxblAmt00);
            return true;
        }
        #region -Other-
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

                _db.IN_ItemSite.AddObject(objIN_ItemSite);


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
        #endregion
    }

    #region -RootObject-
    public class RootObject
    {
        public string code { get; set; }
        public string fn { get; set; }
        public List<string> parm { get; set; }
        public string errorMsg { get; set; }
        public object data { get; set; }
        public bool success { get; set; }
        public string type { get; set; }
    }
    public class OrderImport
    {
        public string BranchID { get; set; }
        public string OrderNbr { get; set; }
        public string CustID { get; set; }
    }
    #endregion
}
