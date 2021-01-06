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

namespace OM10100.Controllers
{
    public partial class OM10100Controller : Controller
    {
        public class DiscountChoiceDistinct : IEqualityComparer<DiscountChoice>
        {
            public bool Equals(DiscountChoice x, DiscountChoice y)
            {
                return x.Index.Equals(y.Index);
            }
            public int GetHashCode(DiscountChoice obj)
            {
                return obj.Index.GetHashCode();
            }
        }
        public class DiscountChoiceHeader
        {
            public string Index { get; set; }
            public string DiscID { get; set; }
            public string DiscSeq { get; set; }
            public string DiscLineRef { get; set; }
            public string Descr { get; set; }
            public string DiscDescr { get; set; }            
            public double Qty { get; set; }
            public double MaxQty { get; set; }
            public string InvtID { get; set; }
            public bool? DonateGroupProduct { get; set; } // True: tặng theo nhóm
            public string LineRef { get; set; }
            public string SubBreakType { get; set; }
            public string BreakBoundType { get; set; }
            public double LevelID { get; set; }            
            public double PromoAmt { get; set; } // Số tiền được KM
            public bool ConvertDiscAmtToFreeItem { get; set; }
            public double PromoBonusAmt { get; set; } // Số tiền bonus + Số tiền được KM
            public double PromoLineAmt { get; set; } // Thành tiền trên dòng  
            public string GroupLineRef { get; set; }    
        }

        public class DiscountChoice : DiscountChoiceHeader
        {            
            public bool Sel { get; set; }
            public string Unit { get; set; }                        
            // FreeItem Info            
            public string FreeItemID { get; set; }
            public string FreeSiteID { get; set; }
            public string FreeItemUnit { get; set; }
            public double FreeItemQty { get; set; }
            public string FreeItemDescr { get; set; }           
            public double FreeItemQtyBase { get; set; }
            public string BudgetID { get; set; }            
            public string GroupItem { get; set; }
            public int Priority { get; set; } // Thứ tự ưu tiên chọn sp KM
            public double MaxQtyInGroup { get; set; } // SL tối đa được nhập trong nhóm
            public double QtyAvail { get; set; }
            public double PromoPrice { get; set; } // Giá KM                  
            public double tempLineAmt { get; set; }
            public string SiteType { get; set; }
            public bool IsSetPrioritySite { get; set; }
            public double FreeItemCnvFact { get; set; }
            public string FeeItemUnitMultDiv { get; set; }
            public double TotalBudget { get; set; }
            public double ToTalQtyFreeItem { get; set; }
            public double CnvFact { get; set; }
        }
        
        public class PromoProgram
        {
            public string DiscID { get; set; }
            public string DiscSeq { get; set; }
            public string DiscLineRef { get; set; }
            // FreeItem Info
            public double LevelID { get; set; }

            public string GroupLineRef { get; set; }    
            public PromoProgram(string discID, string discSeq, string discLineRef, double levelID = 0, string groupLineRef = "")
            {
                DiscID = discID;
                DiscSeq = discSeq;
                DiscLineRef = discLineRef;
                LevelID = levelID;
                GroupLineRef = groupLineRef;
            }
        }

        public class TotalQtyAmt
        {
            public double Qty { get; set; }
            public double Amt { get; set; }
            public double TotalLot { get; set; }
            public double SubAmt { get; set; }
            public double SubQty { get; set; }
            public List<string> ListGroupLineRef { get; set; }
            public TotalQtyAmt()
            {
                ListGroupLineRef = new List<string>();
            }
            public TotalQtyAmt(double qty, double amt, List<string> lstGroupLineRef, double subQty = 0, double subAmt = 0)
            {
                Qty = qty;
                Amt = amt;
                ListGroupLineRef = lstGroupLineRef;
                SubQty = subQty;
                SubAmt = SubAmt;
            }
            public static string TotalQtyAmtJoin(List<string> lstGroupLineRef)
            {
                return string.Join(",", lstGroupLineRef);
            }
        }

        public class ErrorQtyAvail
        {
            public double MaxQtyInGroup { get; set; }
            public string GroupItem { get; set; }
            public bool IsError { get; set; }
            public string MessageError { get; set; }
        }

        public class DiscountItemUsed
        {
            public string DiscID { get; set; }
            public string DiscSeq { get; set; }
            public string LineRef { get; set; }
            public string InvtID { get; set; }
            public double Qty { get; set; }
            public string Unit { get; set; }
            public double Amt { get; set; }
            public double StkPrice { get; set; }
            public DiscountItemUsed() { }
            public DiscountItemUsed(string discID, string discSeq, string lineRef, string invtID, double qty, double amt, string unit)
            {
                this.DiscID = discID;
                this.DiscSeq = DiscSeq;
                this.LineRef = lineRef;
                this.InvtID = invtID;
                this.Qty = qty;
                this.Amt = amt;
                this.Unit = unit;
            }
        }

        public class QtyItemLot
        {
            public string InvtID { get; set; }
            public string SiteID { get; set; }
            public double Qty { get; set; }
        }

        #region Source
        public ActionResult GetOrder(string branchID, string orderType, string query, int start, int limit, int page)
        {
            query = query ?? string.Empty;
            if (page != 1) query = string.Empty;
            _app.CommandTimeout = int.MaxValue;
            var lstOrder = _app.OM10100_pcOrder(branchID, orderType, query, start, start + limit, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            var paging = new Paging<OM10100_pcOrder_Result>(lstOrder, lstOrder.Count > 0 ? lstOrder[0].TotalRecords.Value : 0);
            return this.Store(paging.Data, paging.TotalRecords);
        }
        public ActionResult GetUnitConversion(string branchID)
        {
            var lstUnit = _app.OM10100_pcUnitConversion(branchID).ToList();
            return this.Store(lstUnit);
        }
        public ActionResult GetPrice(string branchID, string custID, DateTime? orderDate)
        {
            List<OM10100_pdSOPrice_Result> lstPrice = _app.OM10100_pdSOPrice(branchID, custID, ""
                , orderDate.HasValue ? orderDate.Value.ToString("yyyy-MM-dd") : DateTime.Now.ToString("yyyy-MM-dd")).ToList();
            return this.Store(lstPrice, lstPrice.Count);
        }
        public ActionResult GetTax(string branchID)
        {
            List<OM10100_pcTax_Result> lstTax = _app.OM10100_pcTax(branchID).ToList();
            return this.Store(lstTax, lstTax.Count);
        }
        public ActionResult GetCustomer(string branchID, string custID)
        {
            var objCust = _app.AR_Customer.FirstOrDefault(p => p.BranchID == branchID && p.CustId == custID);
            return this.Store(objCust);
        }
        public ActionResult GetShipToID(string branchID, string custID)
        {
            List<OM10100_pcShipToId_Result> lstShip = _app.OM10100_pcShipToId(custID, branchID).ToList();
            return this.Store(lstShip, lstShip.Count);
        }
        public ActionResult GetInvt(string branchID)
        {
            List<OM10100_pcInvt_Result> lstInvt = _app.OM10100_pcInvt(branchID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lstInvt, lstInvt.Count);
        }
        public ActionResult GetSOAddress(string branchID, string custID, string shipToID)
        {
            List<AR_SOAddress> lstAddress = _app.AR_SOAddress.Where(p => p.BranchID == branchID && p.CustId == custID && p.ShipToId == shipToID).ToList();
            return this.Store(lstAddress, lstAddress.Count);
        }
        public ActionResult GetOrdDet(string branchID, string orderNbr)
        {
            List<OM10100_pgOrderDet_Result> lstDet = _app.OM10100_pgOrderDet(branchID, orderNbr, "%", Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lstDet, lstDet.Count);
        }
        public ActionResult GetOrdGift(string branchID, string orderNbr)
        {
            List<OM10100_pgGift_Result> lstGift = _app.OM10100_pgGift(branchID, orderNbr).ToList();
            return this.Store(lstGift, lstGift.Count);
        }
        public ActionResult GetTaxTrans(string branchID, string orderNbr)
        {
            List<OM10100_pgTaxTrans_Result> lstTax = _app.OM10100_pgTaxTrans(branchID, orderNbr).ToList();
            return this.Store(lstTax, lstTax.Count);
        }
        public ActionResult GetOrdDisc(string branchID, string orderNbr)
        {
            List<OM_OrdDisc> lstDisc = _app.OM_OrdDisc.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();
            lstDisc = new List<OM_OrdDisc>(lstDisc.OrderBy(x => x.LineRef));
            return this.Store(lstDisc, lstDisc.Count);
        }
        public ActionResult GetOrdAddr(string branchID, string orderNbr)
        {
            List<OM_OrdAddr> lstOrdAddr = _app.OM_OrdAddr.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();
            return this.Store(lstOrdAddr, lstOrdAddr.Count);
        }
        public ActionResult GetINSetup(string branchID)
        {
            var objSetup = _app.IN_Setup.FirstOrDefault(p => p.SetupID == "IN" && p.BranchID == branchID);
            return this.Store(objSetup);
        }
        public ActionResult GetOMSetup()
        {
            var objSetup = _app.OM_Setup.FirstOrDefault(p => p.SetupID == "OM");
            return this.Store(objSetup);
        }
        public ActionResult GetUserDefault(string branchID, string slsperID, string orderType, DateTime? orderDate)
        {
            string userName = Current.UserName;
            var objUser = _app.OM10100_pdOM_UserDefault(branchID, slsperID, orderType, orderDate, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault(); //_app.OM_UserDefault.FirstOrDefault(p => p.UserID == userName && p.DfltBranchID == branchID);
            return this.Store(objUser);
        }
        public ActionResult GetItemSite(string siteID, string whseLoc, string invtID, string branchID, string slsperID)
        {
            List<OM10100_pdItemSite_Result> lstSite = _app.OM10100_pdItemSite(branchID, invtID, siteID, slsperID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lstSite);
        }
        public ActionResult GetDiscCode(string branchID, string orderNbr, DateTime orderDate)
        {
            List<OM10100_pcDiscCode_Result> lstDisc = _app.OM10100_pcDiscCode(orderDate, orderNbr, branchID).ToList();
            return this.Store(lstDisc, lstDisc.Count);
        }
        public ActionResult GetLot(string invtID, string siteID, string orderNbr, string branchID, bool all, double? cnvFact, string unitDesc, string unitMultDiv)
        {
            //List<IN_ItemLot> lstLot = new List<IN_ItemLot>();
            //if (all)
            //{
            //    List<IN_ItemLot> lstLotDB = _app.IN_ItemLot.Where(p => p.SiteID == siteID && p.InvtID == invtID).ToList();
            //    foreach (var item in lstLotDB)
            //    {
            //        lstLot.Add(item);
            //    }
            //}
            //else
            //{
            //    List<IN_ItemLot> lstLotDB = _app.IN_ItemLot.Where(p => p.SiteID == siteID && p.InvtID == invtID && p.QtyAvail > 0).ToList();
            //    foreach (var item in lstLotDB)
            //    {
            //        lstLot.Add(item);
            //    }
            //    List<OM_LotTrans> lstLotTrans = _app.OM_LotTrans.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr && p.InvtID == invtID && p.SiteID == siteID).ToList();
            //    foreach (var item in lstLotTrans)
            //    {
            //        var lot = lstLot.FirstOrDefault(p => p.LotSerNbr == item.LotSerNbr);
            //        if (lot == null)
            //        {
            //            var lotDB = _app.IN_ItemLot.FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID && p.LotSerNbr == item.LotSerNbr);
            //            lotDB.QtyAvail = item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact;
            //            lstLot.Add(lotDB);
            //        }
            //        else
            //        {
            //            lot.QtyAvail += item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact;
            //        }
            //    }
            //    lstLot = lstLot.OrderBy(p => p.ExpDate).ThenBy(p => p.LotSerNbr).ToList();
            //}
            //return this.Store(lstLot.OrderBy(p => p.ExpDate).ThenBy(p => p.LotSerNbr).ToList(), lstLot.Count);
            List<OM10100_pcLotSerNbr_Result> lstLot = new List<OM10100_pcLotSerNbr_Result>();
            if (all)
            {
                List<OM10100_pcLotSerNbr_Result> lstLotDB = _app.OM10100_pcLotSerNbr(Current.UserName,Current.CpnyID,Current.LangID,invtID,siteID,orderNbr,branchID,cnvFact,unitDesc,unitMultDiv).Where(p => p.SiteID == siteID && p.InvtID == invtID).ToList();
                foreach (var item in lstLotDB)
                {
                    lstLot.Add(item);
                }
            }
            else
            {
                List<OM10100_pcLotSerNbr_Result> lstLotDB = _app.OM10100_pcLotSerNbr(Current.UserName, Current.CpnyID, Current.LangID, invtID, siteID, orderNbr, branchID, cnvFact, unitDesc, unitMultDiv).Where(p => p.SiteID == siteID && p.InvtID == invtID && p.QtyAvail > 0).ToList();
                foreach (var item in lstLotDB)
                {
                    lstLot.Add(item);
                }
                List<OM_LotTrans> lstLotTrans = _app.OM_LotTrans.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr && p.InvtID == invtID && p.SiteID == siteID).ToList();
                foreach (var item in lstLotTrans)
                {
                    var lot = lstLot.FirstOrDefault(p => p.LotSerNbr == item.LotSerNbr);
                    if (lot == null)
                    {
                        var lotDB = _app.OM10100_pcLotSerNbr(Current.UserName, Current.CpnyID, Current.LangID, invtID, siteID, orderNbr, branchID, cnvFact, unitDesc, unitMultDiv).FirstOrDefault(p => p.SiteID == siteID && p.InvtID == invtID && p.LotSerNbr == item.LotSerNbr);
                        lotDB.QtyAvail = item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact;
                        lotDB.QtyCnvFact = item.Qty;
                        lstLot.Add(lotDB);
                    }
                    else
                    {
                        lot.QtyAvail += item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact;
                        lot.QtyCnvFact += item.Qty;
                    }
                }
                lstLot = lstLot.OrderBy(p => p.ExpDate).ThenBy(p => p.LotSerNbr).ToList();
            }
            return this.Store(lstLot.OrderBy(p => p.ExpDate).ThenBy(p => p.LotSerNbr).ToList(), lstLot.Count);
        }
        public ActionResult GetLotTrans(string branchID, string orderNbr)
        {
            List<OM_LotTrans> lstLotTrans = _app.OM_LotTrans.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr).ToList();
            return this.Store(lstLotTrans.OrderBy(p => p.LotSerNbr).ToList(), lstLotTrans.Count);
        }
        public ActionResult GetItemLot(string invtID, string siteID, string lotSerNbr, string branchID, string orderNbr)
        {
            var lot = _app.IN_ItemLot.FirstOrDefault(p => p.InvtID == invtID && p.SiteID == siteID && p.LotSerNbr == lotSerNbr);
            if (lot == null) lot = new IN_ItemLot()
            {
                InvtID = invtID,
                SiteID = siteID,
                LotSerNbr = lotSerNbr
            };

            var lotTrans = _app.OM_LotTrans.Where(p => p.BranchID == branchID && p.OrderNbr == orderNbr && p.InvtID == invtID && p.SiteID == siteID && p.LotSerNbr == lotSerNbr).ToList();
            foreach (var item in lotTrans)
            {
                lot.QtyAvail += (item.UnitMultDiv == "M" ? item.Qty * item.CnvFact : item.Qty / item.CnvFact);
            }
            List<IN_ItemLot> lstLot = new List<IN_ItemLot>() { lot };
            return this.Store(lstLot, lstLot.Count);
        }

        public ActionResult GetRewardAmt(string branchID, string slsperID, string custID, string displayIDs)
        {
            var lstReward = _app.OM10100_pgRewardAmt(branchID, slsperID, custID, displayIDs, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            if (!string.IsNullOrWhiteSpace(displayIDs))
            {
                string[] lstDisplay = displayIDs.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                for (int i = 0; i < lstReward.Count; i++)
                {
                    if (lstDisplay.Any(x => x == lstReward[i].DisplayID))
                    {
                        lstReward[i].Selected = true;
                    }
                }
            }
            return this.Store(lstReward);
        }
        public ActionResult GetRewardAmtReturn(string branchID, string orderNbr)
        {
            var reward = _app.OM10100_pdRewardAmt4Return(branchID, orderNbr, Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            return this.Store(reward);
        }

        public ActionResult GetSearchBackOrder(string branchID, string orderType, string slsperID, string custID, DateTime fromDate, DateTime toDate)
        {
            var lstData = _app.OM10100_pgSearchBackOrder(branchID, "IN", fromDate, toDate, slsperID, custID, Current.UserName, Current.CpnyID, Current.LangID).ToList();
            return this.Store(lstData);
        }

        public ActionResult GetOM_OrdManualDisc(string branchID, string order)
        {
            var lstData =_app.OM_OrdManualDisc.Where(x => x.BranchID == branchID && x.OrderNbr == order).ToList();
            return this.Store(lstData);
        }

        public ActionResult GetManualPromo(string branchID, string slsperID, string custID, DateTime? orderDate, float totalAmt, string orderNbr)
        {
            var data = _app.OM10100_pgManualPromo(Current.CpnyID, Current.UserName, Current.LangID, branchID, slsperID, custID, orderDate, totalAmt, orderNbr).ToList();
            return this.Store(data);
        }

        #endregion

        private bool Update_Gift(OM_SalesOrdGift t, OM10100_pgGift_Result s, OM_SalesOrd ord, bool isNew)
        {
            if (isNew)
            {
                t.ResetET();
                t.OrderNbr = ord.OrderNbr;
                t.BranchID = ord.BranchID;
                t.Type = "02";
                t.InvtID = "";
                t.Code = s.Code;
                t.DiscType = s.DiscType;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
            }
            t.Qty = s.Qty;
            t.GiftName = s.Descr;
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
            return true;
        }

        private void Update_Ord(OM_SalesOrd t, bool isNew)
        {
            if (isNew)
            {
                t.ResetET();
                t.NoteId = 0.ToShort();
                t.OrderNbr = _objOrder.OrderNbr;
                t.BranchID = _objOrder.BranchID;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
            }

            t.PriceClassID = Util.PassNull(_objOrder.PriceClassID);
            t.DoNotCalDisc = _objOrder.DoNotCalDisc;
            t.CreditHold = _objOrder.CreditHold;
            t.IssueMethod = Util.PassNull(_objOrder.IssueMethod);
            t.OrigOrderNbr = Util.PassNull(_objOrder.OrigOrderNbr);
            t.ReasonCode = Util.PassNull(_objOrder.ReasonCode);
            t.ARDocDate = _objOrder.ARDocDate;
            t.ARRefNbr = Util.PassNull(_objOrder.ARRefNbr);
            t.InvcNbr = Util.PassNull(_objOrder.InvcNbr);
            t.InvcNote = Util.PassNull(_objOrder.InvcNote);
            t.BudgetID1 = Util.PassNull(_objOrder.BudgetID1);
            t.CmmnPct = _objOrder.CmmnPct;
            t.CustOrderNbr = Util.PassNull(_objOrder.CustOrderNbr);
            t.FreightAllocAmt = _objOrder.FreightAllocAmt;
            t.FreightAmt = _objOrder.FreightAmt;
            t.FreightCost = _objOrder.FreightCost;
            t.LineAmt = _objOrder.LineAmt;
            t.LineDiscAmt = _objOrder.LineDiscAmt;
            t.MiscAmt = _objOrder.MiscAmt;
            t.OrdDiscAmt = _objOrder.OrdDiscAmt;
            t.OrdAmt = _objOrder.OrdAmt;
            t.PmtAmt = _objOrder.PmtAmt;
            t.PremFreightAmt = _objOrder.PremFreightAmt;
            t.VolDiscAmt = _objOrder.VolDiscAmt;
            t.SOFeeTot = _objOrder.SOFeeTot;
            t.PromiseDate = DateTime.Now.ToDateShort();
            t.TaxAmtTot00 = 0;
            t.TxblAmtTot00 = 0;
            t.TaxAmtTot00 = 0;
            t.TxblAmtTot00 = 0;
            t.TaxID00 = "";
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
            t.StationID = _objOrder.StationID.PassNull();
            for (int i = 0; i < _lstTaxDoc.Count; i++)
            {
                if (i == 0)
                {
                    t.TaxAmtTot00 = _lstTaxDoc[i].TaxAmt;
                    t.TxblAmtTot00 = _lstTaxDoc[i].TxblAmt;
                    t.TaxID00 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
                else if (i == 1)
                {
                    t.TaxAmtTot01 = _lstTaxDoc[i].TaxAmt;
                    t.TxblAmtTot01 = _lstTaxDoc[i].TxblAmt;
                    t.TaxID01 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
                else if (i == 2)
                {
                    t.TaxAmtTot02 = _lstTaxDoc[i].TaxAmt;
                    t.TxblAmtTot02 = _lstTaxDoc[i].TxblAmt;
                    t.TaxID02 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
                else if (i == 3)
                {
                    t.TaxAmtTot03 = _lstTaxDoc[i].TaxAmt;
                    t.TxblAmtTot03 = _lstTaxDoc[i].TxblAmt;
                    t.TaxID03 = Util.PassNull(_lstTaxDoc[i].TaxID);
                }
            }

            t.CustID = Util.PassNull(_objOrder.CustID);
            t.ExpiryDate = _objOrder.ExpiryDate;
            t.OrderDate = _objOrder.OrderDate;
            t.OrderType = Util.PassNull(_objOrder.OrderType);
            t.OrdQty = _objOrder.OrdQty;
            t.ShipPriority = Util.PassNull(_objOrder.ShipPriority);
            t.ShipViaId = Util.PassNull(_objOrder.ShipViaId);
            t.ShipDate = _objOrder.ShipDate.PassMin();
            t.SlsPerID = Util.PassNull(_objOrder.SlsPerID);
            t.Status = Util.PassNull(_objOrder.Status);
            t.Terms = Util.PassNull(_objOrder.Terms);
            t.ToSiteID = Util.PassNull(_objOrder.ToSiteID);
            t.UnitsShipped = _objOrder.UnitsShipped;
            t.OrderWeight = _objOrder.OrderWeight;
            t.VolDiscPct = _objOrder.VolDiscPct;
            t.PaymentID = Util.PassNull(_objOrder.PaymentID);
            t.PmtDate = _objOrder.PmtDate.PassMin();
            t.PaymentBatNbr = Util.PassNull(_objOrder.PaymentBatNbr);
            t.PaymentNbr = Util.PassNull(_objOrder.PaymentNbr);
            t.IssueNumber = _objOrder.IssueNumber;
            t.OrderNo = _objOrder.OrderNo;
            t.DeliveryID = Util.PassNull(_objOrder.DeliveryID);
            t.Remark = _objOrder.Remark.PassNull();
            t.RewardID = _objOrder.RewardID;
            t.RewardAmt = _objOrder.RewardAmt;
            t.ReturnFrom = _objOrder.ReturnFrom.PassNull();
            t.ManualDiscAmt = _objOrder.ManualDiscAmt;
            t.ManualDiscPct = _objOrder.ManualDiscPct;
            t.ManualDiscount = _objOrder.ManualDiscount;
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
        }

        private void Update_Debit(OM_SalesOrdDebit t, bool isNew)
        {
            if (isNew)
            {
                t.ResetET();
                t.OrderNbr = _objOrder.OrderNbr;
                t.BranchID = _objOrder.BranchID;
                t.CustID = _objOrder.CustID;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
            }
            t.IsSFA = false;
            t.OrderDate = _objOrder.OrderDate;
            double totMarkSales = _lstOrdDet.Where(p => p.DiscCode.PassNull() == string.Empty).Sum(p => p.Mark ?? 0);
            double totMarkDisc = _lstOrdDet.Where(p => p.DiscCode.PassNull() != string.Empty).Sum(p => p.Mark ?? 0);
            t.OrigDebtPoint = t.RemainDebtPoint = totMarkSales - totMarkDisc;
            t.SlsPerID = _objOrder.SlsPerID;
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
        }

        private void Update_Addr(OM_OrdAddr t, OM_SalesOrd ord, bool isNew)
        {
            if (isNew)
            {
                t.OrderClass = string.Empty;
                t.OrderNbr = ord.OrderNbr;
                t.BranchID = ord.BranchID;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
            }
            if (_screenNbr == "OM20500")
            {
                t.BillName = _objCust.BillName;
                t.BillAttn = _objCust.BillAttn;
                t.BillAddrLine1 = _objCust.BillAddr1;
                t.BillAddrLine2 = _objCust.BillAddr2;
                t.BillCity = _objCust.BillCity;
                t.BillStateID = _objCust.BillState;
                t.BillCntryID = _objCust.BillCountry;
                t.BillZip = _objCust.BillZip;
                t.BillPhone = _objCust.BillPhone;
                t.BillFax = _objCust.BillFax;
                t.ShiptoID = _objCust.DfltShipToId;
                t.ShipName = _objAddress.SOName;
                t.ShipAttn = _objAddress.Attn;
                t.ShipAddrLine1 = _objAddress.Addr1;
                t.ShipAddrLine2 = _objAddress.Addr2;
                t.ShipCity = _objAddress.City;
                t.ShipStateID = _objAddress.State;
                t.ShipCntryID = _objAddress.Country;
                t.ShipZip = _objAddress.Zip;
                t.ShipPhone = _objAddress.Phone;
                t.ShipFax = _objAddress.Fax;
                t.CheckNbr = "";
                t.CardNbr = "";
                t.CardName = "";
                t.CardExpDate = DateTime.Now;
                t.AuthCode = "";
                t.TaxRegNbr = _objCust.TaxRegNbr;
            }
            else
            {
                t.BillName = Util.PassNull(_form["BillName"]);
                t.BillAttn = Util.PassNull(_form["BillAttn"]);
                t.BillAddrLine1 = Util.PassNull(_form["BillAddrLine1"]);
                t.BillAddrLine2 = Util.PassNull(_form["BillAddrLine2"]);
                t.BillCity = Util.PassNull(_form["BillCity"]);
                t.BillStateID = Util.PassNull(_form["BillStateID"]);
                t.BillCntryID = Util.PassNull(_form["BillCntryID"]);
                t.BillZip = Util.PassNull(_form["BillZip"]);
                t.BillPhone = Util.PassNull(_form["BillPhone"]);
                t.BillFax = Util.PassNull(_form["BillFax"]);
                t.ShiptoID = Util.PassNull(_form["ShiptoID"]);
                t.ShipName = Util.PassNull(_form["ShipName"]);
                t.ShipAttn = Util.PassNull(_form["ShipAttn"]);
                t.ShipAddrLine1 = Util.PassNull(_form["ShipAddrLine1"]);
                t.ShipAddrLine2 = Util.PassNull(_form["ShipAddrLine2"]);
                t.ShipCity = Util.PassNull(_form["ShipCity"]);
                t.ShipStateID = Util.PassNull(_form["ShipStateID"]);
                t.ShipCntryID = Util.PassNull(_form["ShipCntryID"]);
                t.ShipZip = Util.PassNull(_form["ShipZip"]);
                t.ShipPhone = Util.PassNull(_form["ShipPhone"]);
                t.ShipFax = Util.PassNull(_form["ShipFax"]);
                t.CheckNbr = Util.PassNull(_form["CheckNbr"]);
                t.CardNbr = Util.PassNull(_form["CardNbr"]);
                t.CardName = Util.PassNull(_form["CardName"]);
                t.CardExpDate = Util.PassNull(_form["CardExpDate"]) == string.Empty
                    ? DateTime.Now
                    : _form["CardExpDate"].ToDateTime();
                t.AuthCode = Util.PassNull(_form["AuthCode"]);
                t.TaxRegNbr = Util.PassNull(_form["TaxRegNbr"]);
            }
            t.ShipCustID = _objOrder.CustID;
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
        }

        private void Update_Disc(OM_OrdDisc t, OM_OrdDisc s, OM_SalesOrd ord, bool isNew)
        {
            if (isNew)
            {
                t.OrderNbr = ord.OrderNbr;
                t.BranchID = ord.BranchID;
                t.LineRef = s.LineRef;
                t.DiscID = s.DiscID;
                t.DiscSeq = s.DiscSeq;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
            }

            t.BreakBy = Util.PassNull(s.BreakBy);
            t.BudgetID = Util.PassNull(s.BudgetID);
            t.DiscAmt = s.DiscAmt;
            t.DiscFor = Util.PassNull(s.DiscFor);
            t.DisctblAmt = s.DisctblAmt;
            t.DisctblQty = s.DisctblQty;
            t.DiscType = Util.PassNull(s.DiscType);
            t.DiscUOM = Util.PassNull(s.DiscUOM);
            t.FreeItemBudgetID = Util.PassNull(s.FreeItemBudgetID);
            t.FreeItemID = Util.PassNull(s.FreeItemID);
            t.FreeItemQty = s.FreeItemQty;
            t.OrigFreeItemQty = s.OrigFreeItemQty;
            t.SlsPerID = Util.PassNull(s.SlsPerID);
            t.SOLineRef = Util.PassNull(s.SOLineRef);
            t.UserOperationLog = Util.PassNull(s.UserOperationLog);
            t.DiscBreakLineRef = Util.PassNull(s.DiscBreakLineRef);
            t.RefLineRef = s.RefLineRef.PassNull();
            t.GroupRefLineRef = s.GroupRefLineRef.PassNull();
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
        }


        private bool Update_Det(OM_SalesOrdDet t, OM10100_pgOrderDet_Result s, OM_SalesOrd ord, bool isNew)
        {
            double oldQty = 0;
            double newQty = 0;
            if (s.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" &&
                _objType.INDocType != "NA" && _objType.INDocType != "RC")
            {
                oldQty = (isNew) ? 0 : t.UnitMultDiv == "D" ? t.LineQty / t.UnitRate : t.LineQty * t.UnitRate;
                newQty = s.UnitMultDiv == "D" ? s.LineQty / s.UnitRate : s.LineQty * s.UnitRate;                
                UpdateAllocSO(t.InvtID, t.SiteID, oldQty, 0, 0);               
                if (!UpdateAllocSO(s.InvtID, s.SiteID, 0, newQty, 0))
                {
                    throw new MessageException("1043", new[] { s.InvtID, s.SiteID });
                }
            }
            //  if(s.BOType!="B" && _objType.INDocType!="CM" && _objType.INDocType!="DM" && _objType.INDocType!="NA" && _objType.INDocType!="RC")
            else if (_objOrder.OrderType == "BL" || _objOrder.OrderType == "OC" ||
                     _objOrder.OrderType == "SR")
            {
                oldQty = isNew ? 0 : t.UnitMultDiv == "D" ? t.LineQty / t.UnitRate : t.LineQty * t.UnitRate;
                newQty = s.UnitMultDiv == "D" ? s.LineQty / s.UnitRate : s.LineQty * s.UnitRate;
                if (newQty > oldQty + SlspersonStock(s.InvtID))
                {
                    throw new MessageException(MessageType.Message, "1044", parm: new[] { s.InvtID, _objOrder.SlsPerID });
                }
            }
            //Kiểm tra Qty chương trình trưng bày
            if (s.FreeItem == true && s.DisplayID != "" && s.OrderType == "IN")
            {
                double QtyCheck = 0;
                var obj = _app.OM_TDisplayReward.FirstOrDefault(p => p.DisplayID == s.DisplayID && p.PeriodID == s.DisplayPeriodID && p.InvtID == s.InvtID && p.CustID == _objOrder.CustID);
                if (obj != null)
                {
                    QtyCheck = obj.Qty.ToDouble() - obj.QtyAmtUsed.ToDouble();
                    if (newQty > QtyCheck)
                    {
                        _messDisplayID = "2018101060";
                        throw new MessageException(MessageType.Message, "2018101060",
                        parm: new[] { s.InvtID });
                    }
                    else
                    {
                        obj.QtyAmtAvail = obj.Qty - (obj.QtyAmtUsed + newQty);
                        obj.QtyAmtUsed = obj.QtyAmtUsed + newQty;
                        obj.LUpd_DateTime = DateTime.Now;
                        obj.LUpd_Prog = _screenNbr;
                        obj.LUpd_User = Current.UserName;
                    }
                }
            }
            if (isNew)
            {
                t.ResetET();
                t.OrderNbr = ord.OrderNbr;
                t.BranchID = ord.BranchID;
                t.LineRef = s.LineRef;
                t.Crtd_Datetime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
            }
            t.BudgetID1 = Util.PassNull(s.BudgetID1);
            t.BudgetID2 = Util.PassNull(s.BudgetID2);
            t.CostID = Util.PassNull(s.CostID);
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
            t.POSM = s.POSM.PassNull();
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
            t.BarCode = Util.PassNull(s.BarCode);
            t.ItemPriceClass = s.ItemPriceClass;
            t.LineQty = s.LineQty;
            t.OrderType = _objOrder.OrderType;
            t.QtyInvc = s.QtyInvc;
            t.QtyOpenShip = s.QtyOpenShip;
            t.QtyShip = s.QtyShip;
            t.BOType = Util.PassNull(s.BOType);
            t.QtyBO = s.QtyBO;
            t.BOCustID = (t.BOType == "O" && Util.PassNull(s.BOCustID) == string.Empty) ? _objOrder.CustID : Util.PassNull(s.BOCustID);
            t.SiteID = Util.PassNull(s.SiteID);
            t.SlsUnit = Util.PassNull(s.SlsUnit);
            t.ShipStatus = Util.PassNull(s.ShipStatus);
            t.TaxCat = Util.PassNull(s.TaxCat);
            t.TaxID00 = Util.PassNull(s.TaxId00);
            t.TaxID01 = Util.PassNull(s.TaxId01);
            t.TaxID02 = Util.PassNull(s.TaxId02);
            t.TaxID03 = Util.PassNull(s.TaxId03);
            t.TaxAmt00 = s.TaxAmt00;
            t.TaxAmt01 = s.TaxAmt01;
            t.TaxAmt02 = s.TaxAmt02;
            t.TaxAmt03 = s.TaxAmt03;
            t.TxblAmt00 = s.TxblAmt00;
            t.TxblAmt01 = s.TxblAmt01;
            t.TxblAmt02 = s.TxblAmt02;
            t.TxblAmt03 = s.TxblAmt03;
            t.Mark = s.Mark ?? 0;
            t.UnitRate = s.UnitRate;
            t.UnitMultDiv = s.UnitMultDiv;
            t.UnitWeight = s.UnitWeight;
            t.OrigOrderNbr = ord.OrigOrderNbr;
            t.LUpd_Datetime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
            t.DisplayID = s.DisplayID.PassNull();
            t.DisplayPeriodID = s.DisplayPeriodID.PassNull();
            t.POPrice = _app.OM10100_pdPOPrice(ord.BranchID, ord.CustID, t.SiteID, t.InvtID, t.SlsUnit, ord.OrderDate).FirstOrDefault().Value;
            t.KitLineRef = string.Empty;
            t.ConsumerPromotionID = string.Empty;
            t.GiftPoint = 0;
            t.Level = 0;
            t.IsBooking = false;
            t.ManuDiscAmt = s.ManuDiscAmt;
            t.ManuDiscPct = s.ManuDiscPct;
            t.Cumulative = 0;
            t.MaxReturnQty = 0;
            return true;
        }

        private bool Update_Lot(OM_LotTrans t, OM_LotTrans s, OM_SalesOrd ord, OM_SalesOrdDet det, bool isNew)
        {
            if (isNew)
            {
                t.ResetET();
                t.OrderNbr = ord.OrderNbr;
                t.BranchID = ord.BranchID;
                t.OMLineRef = s.OMLineRef;
                t.LotSerNbr = s.LotSerNbr;
                t.UnitDesc = s.UnitDesc;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = Current.UserName;
                t.WarrantyDate = DateTime.Now.ToDateShort();
            }
            double oldQty = 0;
            double newQty = 0;
            if (det.BOType != "B" && _objType.INDocType != "CM" && _objType.INDocType != "DM" && _objType.INDocType != "NA" && _objType.INDocType != "RC")
            {
                oldQty = isNew ? 0 : s.UnitMultDiv == "D" ? t.Qty / t.CnvFact : t.Qty * t.CnvFact;
                newQty = s.UnitMultDiv == "D" ? s.Qty / s.CnvFact : s.Qty * s.CnvFact;
                UpdateAllocLotSO(t.InvtID, t.SiteID, t.LotSerNbr, oldQty, 0, 0);

                if (!UpdateAllocLotSO(s.InvtID, s.SiteID, t.LotSerNbr, 0, newQty, 0))
                {
                    throw new MessageException("1043", new string[] { s.InvtID + " " + s.LotSerNbr, s.SiteID });
                }
            }
            t.ExpDate = s.ExpDate;
            t.InvtID = s.InvtID;
            if (_objType.INDocType == "IN" || _objType.INDocType == "DM")
            {
                t.InvtMult = -1;
            }
            else if (_objType.INDocType == "CM")
            {
                t.InvtMult = 1;
            }
            else
            {
                t.InvtMult = 0;
            }
            
            t.Qty = s.Qty;
            t.SiteID = s.SiteID;
            t.MfgrLotSerNbr = s.MfgrLotSerNbr.PassNull();
            t.INDocType = _objType.INDocType.PassNull();
            t.TranDate = ord.OrderDate;
            t.CnvFact = s.CnvFact;
            t.UnitCost = s.UnitCost;
            t.UnitPrice = s.UnitPrice;
            t.UnitMultDiv = s.UnitMultDiv;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = Current.UserName;
            t.LUpd_DateTime = DateTime.Now;
            return true;
        }

        #region -Update FreeItem-        

        private void UpdateLineDiscAmt(string invtLineRef, double discPct, double discAmt, OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, ref double qtyAmtDeduct, double amtTot, ref double iteratedAmt, bool isLastItem)
        {
            foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
            {
                if (amtTot != 0 && !det.FreeItem && det.LineRef == invtLineRef)
                {
                    det.DiscID1 = objSeq.DiscID;
                    det.DiscSeq1 = objSeq.DiscSeq;
                    
                    var allocAmt = isLastItem ? discAmt - iteratedAmt : Math.Round((discAmt * (det.LineQty * det.SlsPrice)) / amtTot);
                    det.DiscAmt1 += allocAmt;

                    det.DiscPct1 = Math.Round(det.DiscAmt1 * 100 / (det.LineQty * det.SlsPrice), 2);
                    det.DiscPct = det.DiscPct1;
                    det.DiscAmt = det.DiscAmt1;
                    if (det.BOType == "O")
                    {
                        det.LineAmt = Math.Round((det.LineQty + det.QtyBO) * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                    }
                    else
                    {
                        det.LineAmt = Math.Round(det.LineQty * det.SlsPrice - det.DiscAmt - det.ManuDiscAmt);
                    }
                    iteratedAmt += allocAmt;                    
                    #region -Deduct-
                    var qtyDeduct = 0.0;
                    var amtDeduct = 0.0;
                    if (objSeq.BreakBy == "A")
                    {
                        if (det.DumyLineAmt > 0)
                        {
                            if (det.DumyLineAmt >= qtyAmtDeduct)
                            {
                                amtDeduct = qtyAmtDeduct;
                                det.DumyLineAmt -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                amtDeduct = det.DumyLineAmt;
                                amtDeduct -= det.DumyLineAmt;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    else
                    {
                        if (det.DumyLineQty > 0)
                        {
                            if (det.DumyLineQty >= qtyAmtDeduct)
                            {
                                qtyDeduct = qtyAmtDeduct;
                                det.DumyLineQty -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                qtyDeduct = det.DumyLineQty;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                    #endregion
                }
            }
        }
        
        private void UpdateGroupDiscByInvtIDV2(string invtID, double discPct, double discAmt, OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, ref double qtyAmtDeduct, double amtTot, ref double iterateAmt, string unitDesc)
        {
            foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
            {
                if (amtTot != 0 && !det.FreeItem && det.InvtID == invtID)
                {                    
                    det.GroupDiscID1 = objSeq.DiscID;
                    det.GroupDiscSeq1 = objSeq.DiscSeq;
                    det.GroupDiscPct1 = Math.Round(discPct, 2);
                    det.GroupDiscAmt1 += Math.Round((discAmt * det.LineAmt) / amtTot, 0);
                    iterateAmt += det.GroupDiscAmt1;
                    #region -Deduct-
                    var qtyDeduct = 0.0;
                    var amtDeduct = 0.0;
                    if (objSeq.BreakBy == "A")
                    {
                        if (det.DumyLineAmt > 0)
                        {
                            if (det.DumyLineAmt >= qtyAmtDeduct)
                            {
                                amtDeduct = qtyAmtDeduct;
                                det.DumyLineAmt -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                amtDeduct = det.DumyLineAmt;
                                qtyAmtDeduct -= det.DumyLineAmt;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    else
                    {
                        if (det.DumyLineQty > 0)
                        {
                            if (det.DumyLineQty >= qtyAmtDeduct)
                            {
                                qtyDeduct = qtyAmtDeduct;
                                det.DumyLineQty -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                qtyDeduct = det.DumyLineQty;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                    #endregion
                }
            }
        }

        private void UpdateGroupDiscByPriceClassV2(string classID, double discPct, double discAmt, OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, ref double qtyAmtDeduct, double amtTot, ref double iteratedAmt)
        {
            foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
            {
                if (amtTot != 0 && !det.FreeItem && det.ItemPriceClass == classID)
                {                                        
                    det.GroupDiscID1 = objSeq.DiscID;
                    det.GroupDiscSeq1 = objSeq.DiscSeq;
                    det.GroupDiscPct1 = Math.Round(discPct, 2);
                    det.GroupDiscAmt1 += Math.Round((discAmt * det.LineAmt) / amtTot, 0);
                    iteratedAmt += det.GroupDiscAmt1;
                    #region -Deduct-
                    var qtyDeduct = 0.0;
                    var amtDeduct = 0.0;
                    if (objSeq.BreakBy == "A")
                    {
                        if (det.DumyLineAmt > 0)
                        {
                            if (det.DumyLineAmt >= qtyAmtDeduct)
                            {
                                amtDeduct = qtyAmtDeduct;
                                det.DumyLineAmt -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                amtDeduct = det.DumyLineAmt;
                                amtDeduct -= det.DumyLineAmt;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    else
                    {
                        if (det.DumyLineQty > 0)
                        {
                            if (det.DumyLineQty >= qtyAmtDeduct)
                            {
                                qtyDeduct = qtyAmtDeduct;
                                det.DumyLineQty -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                qtyDeduct = det.DumyLineQty;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                    #endregion                    
                }
            }
        }
        private bool DeductQtyAmtDiscount(OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, string type, double qtyAmtDeduct, List<OM10100_pdOM_DiscItem_Result> lstDiscItem, List<OM_DiscItemClass> lstDiscItemClass)
        {
            if (qtyAmtDeduct == 0)
            {
                return true;
            }
            var qtyDeduct = 0.0;
            var amtDeduct = 0.0;
            switch (type)
            {
                case "I":
                    for (int k = 0; k < lstDiscItem.Count; k++)
                    {
                        foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
                        {
                            qtyDeduct = 0.0;
                            amtDeduct = 0.0;
                            if (!det.FreeItem && det.InvtID == lstDiscItem[k].InvtID)
                            {
                                #region -Deduct-
                                if (objSeq.BreakBy == "A")
                                {
                                    if (det.DumyLineAmt > 0)
                                    {
                                        if (det.DumyLineAmt >= qtyAmtDeduct)
                                        {
                                            amtDeduct = qtyAmtDeduct;
                                            det.DumyLineAmt -= qtyAmtDeduct;
                                            qtyAmtDeduct = 0;
                                        }
                                        else
                                        {
                                            amtDeduct = det.DumyLineAmt;
                                            qtyAmtDeduct -= det.DumyLineAmt;
                                            det.DumyLineAmt = 0;
                                        }
                                    }
                                }
                                else
                                {
                                    if (det.DumyLineQty > 0)
                                    {
                                        qtyAmtDeduct = qtyAmtDeduct * OM_GetCnvFactFromUnit(det.InvtID, lstDiscItem[k].UnitDesc, det.StkUnit);
                                        if (det.DumyLineQty >= qtyAmtDeduct)
                                        {
                                            qtyDeduct = qtyAmtDeduct;
                                            det.DumyLineQty -= qtyAmtDeduct;
                                            qtyAmtDeduct = 0;
                                        }
                                        else
                                        {
                                            qtyDeduct = det.DumyLineQty;
                                            qtyAmtDeduct -= det.DumyLineQty;
                                            det.DumyLineQty = 0;
                                        }
                                    }
                                }
                                #endregion
                                AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                            }
                        }
                    }
                    break;

                case "C":
                    for (int k = 0; k < lstDiscItemClass.Count; k++)
                    {
                        foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
                        {
                            qtyDeduct = 0.0;
                            amtDeduct = 0.0;
                            if (!det.FreeItem && det.ItemPriceClass == lstDiscItemClass[k].ClassID)
                            {
                                #region -Deduct-
                                if (objSeq.BreakBy == "A")
                                {
                                    if (det.DumyLineAmt > 0)
                                    {
                                        if (det.DumyLineAmt >= qtyAmtDeduct)
                                        {
                                            amtDeduct = qtyAmtDeduct;
                                            det.DumyLineAmt -= qtyAmtDeduct;
                                            qtyAmtDeduct = 0;
                                        }
                                        else
                                        {
                                            amtDeduct = det.DumyLineAmt;
                                            qtyAmtDeduct -= det.DumyLineAmt;
                                            det.DumyLineAmt = 0;
                                        }
                                    }
                                }
                                else
                                {
                                    if (det.DumyLineQty > 0)
                                    {
                                        qtyAmtDeduct = qtyAmtDeduct * OM_GetCnvFactFromUnit(det.InvtID, lstDiscItem[k].UnitDesc, det.StkUnit);
                                        if (det.DumyLineQty >= qtyAmtDeduct)
                                        {
                                            qtyDeduct = qtyAmtDeduct;
                                            det.DumyLineQty -= qtyAmtDeduct;
                                            qtyAmtDeduct = 0;
                                        }
                                        else
                                        {
                                            qtyAmtDeduct = det.DumyLineQty;
                                            qtyAmtDeduct -= det.DumyLineQty;
                                            det.DumyLineQty = 0;
                                        }
                                    }
                                }
                                AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                                #endregion
                            }
                        }
                    }
                    break;
                case "B":

                    for (int k = 0; k < lstDiscItem.Count; k++)
                    {
                        foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
                        {
                            qtyDeduct = 0.0;
                            amtDeduct = 0.0;
                            if (!det.FreeItem && det.InvtID == lstDiscItem[k].InvtID)
                            {
                                #region -Deduct-
                                if (objSeq.BreakBy == "A")
                                {
                                    if (det.DumyLineAmt > 0)
                                    {
                                        if (det.DumyLineAmt >= qtyAmtDeduct)
                                        {
                                            amtDeduct = qtyAmtDeduct;
                                            det.DumyLineAmt -= qtyAmtDeduct;
                                        }
                                        else
                                        {
                                            amtDeduct = det.DumyLineAmt;
                                            qtyAmtDeduct -= det.DumyLineAmt;
                                            det.DumyLineAmt = 0;
                                        }
                                    }
                                }
                                else
                                {
                                    if (det.DumyLineQty > 0)
                                    {
                                        var tempQtyDeduct = qtyAmtDeduct * OM_GetCnvFactFromUnit(det.InvtID, lstDiscItem[k].UnitDesc, det.StkUnit);
                                        if (det.DumyLineQty >= qtyAmtDeduct)
                                        {
                                            qtyDeduct = tempQtyDeduct;
                                            det.DumyLineQty -= tempQtyDeduct;
                                        }
                                        else
                                        {
                                            qtyDeduct = det.DumyLineQty;
                                            det.DumyLineQty = 0;
                                        }
                                    }
                                }
                                #endregion
                                AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                            }
                        }
                    }
                    break;
            }
            return true;
        }

        private void UpdateGroupDiscBundleByInvtIDV2(string invtID, double discPct, double discAmt, OM10100_pdGetDiscSeq_Result objSeq, string breakLineRef, ref double iterateAmt, bool isLastItem, double bndAmtQty, double bndTotAmtQty, string unitDesc, double lineAmt)
        {
            var qtyDeduct = 0.0;
            var amtDeduct = 0.0;
            foreach (OM10100_pgOrderDet_Result det in _lstOldOrdDet)
            {
                if (bndTotAmtQty != 0 && !det.FreeItem && det.InvtID == invtID)
                {                    
                    det.GroupDiscID1 = objSeq.DiscID;
                    det.GroupDiscSeq1 = objSeq.DiscSeq;
                    det.GroupDiscPct1 = Math.Round(discPct, 2);
                    det.GroupDiscAmt1 = isLastItem
                        ? discAmt - iterateAmt
                        : Math.Round(discAmt * det.LineAmt / lineAmt, 0);// Math.Round(discAmt * bndAmtQty / bndTotAmtQty, 0);
                    iterateAmt += det.GroupDiscAmt1;

                    #region -Deduct-
                    var qtyAmtDeduct = Math.Round(discAmt * bndAmtQty / bndTotAmtQty, 0);
                    if (objSeq.BreakBy == "A")
                    {
                        if (det.DumyLineAmt > 0)
                        {
                            if (det.DumyLineAmt >= qtyAmtDeduct)
                            {
                                amtDeduct = qtyAmtDeduct;
                                det.DumyLineAmt -= amtDeduct;
                            }
                            else
                            {
                                amtDeduct = det.DumyLineAmt;
                                qtyAmtDeduct -= det.DumyLineAmt;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    else
                    {
                        if (det.DumyLineQty > 0)
                        {
                            qtyAmtDeduct = bndAmtQty * OM_GetCnvFactFromUnit(det.InvtID, unitDesc, det.StkUnit);
                            if (det.DumyLineQty >= qtyAmtDeduct)
                            {
                                qtyDeduct = qtyAmtDeduct;
                                det.DumyLineQty -= qtyAmtDeduct;
                                qtyAmtDeduct = 0;
                            }
                            else
                            {
                                qtyDeduct = det.DumyLineQty;
                                qtyAmtDeduct -= det.DumyLineQty;
                                det.DumyLineAmt = 0;
                            }
                        }
                    }
                    AddOrdDiscDetail(objSeq, breakLineRef, det.LineRef, det.InvtID, det.StkUnit, qtyDeduct, amtDeduct);
                    #endregion                    
                }
            }
        }

        private void InsertUpdateOrdDisc(OM10100_pdGetDiscSeq_Result objSeq, string budgetID, double discAmt, double amt, double qty, string freeItemBudgetID, string freeItemID, double freeItemQty,
         string discLineRef, string soLineRef, string discBreakLineRef, string groupRefLineRef, string refLineRef, string uom = "", double cnvFact = 0)
        {
            var newDisc = new OM_OrdDisc();
            newDisc.BranchID = _objOrder.BranchID;
            newDisc.OrderNbr = _objOrder.OrderNbr;
            newDisc.DiscID = objSeq.DiscID;
            newDisc.DiscSeq = objSeq.DiscSeq;
            newDisc.LineRef = discLineRef;
            newDisc.DiscBreakLineRef = discBreakLineRef;
            newDisc.BreakBy = objSeq.BreakBy;
            newDisc.BudgetID = budgetID;
            newDisc.DiscAmt = discAmt;
            newDisc.DisctblAmt = amt;
            newDisc.DiscFor = objSeq.DiscFor;
            newDisc.DisctblQty = qty;
            newDisc.DiscType = objSeq.DiscType;
            newDisc.DiscUOM = uom;
            newDisc.FreeItemBudgetID = freeItemBudgetID;
            newDisc.FreeItemID = freeItemID;
            newDisc.FreeItemQty = freeItemQty;
            newDisc.SlsPerID = _objOrder.SlsPerID;
            newDisc.OrigFreeItemQty = freeItemQty;
            newDisc.SOLineRef = soLineRef;
            newDisc.RefLineRef = refLineRef.PassNull();
            newDisc.GroupRefLineRef = groupRefLineRef;
            newDisc.UserOperationLog = "Promotion is automatic inserted by system";
            newDisc.Crtd_DateTime = newDisc.LUpd_DateTime = DateTime.Now;
            newDisc.Crtd_Prog = newDisc.LUpd_Prog = _screenNbr;
            newDisc.Crtd_User = newDisc.LUpd_User = Current.UserName;
            newDisc.tstamp = new byte[1];
            _lstDisc.Add(newDisc);
            string budget = string.IsNullOrWhiteSpace(newDisc.FreeItemID) ? newDisc.BudgetID : newDisc.FreeItemBudgetID;
            InsertUpdateBudget(newDisc.DiscID, newDisc.DiscSeq, budget, newDisc.DiscAmt, newDisc.FreeItemID, newDisc.FreeItemQty, newDisc.DiscUOM);
        }

        private bool InsertUpdateBudget(string discID, string discSeq, string budgetID, double discAmt, string freeItemID, double freeItemQty, string discUOM)
        {
            if (_calcPromoOnly == 0)
            {
                OM_PPBudget objBudget = _app.OM_PPBudget.FirstOrDefault(p => p.BudgetID == budgetID);
                if (_objType.ARDocType != "NA" && objBudget != null && objBudget.Active)
                {
                    int rtrn = (_objType.ARDocType == "CM" || _objType.ARDocType == "CC") ? -1 : 1;
                    if (_handle == "V" && _objOrder.Status == "C")
                    {
                        rtrn = -1 * rtrn;
                    }
                    else if (_handle == "C" && _objOrder.OrderType == "IR" || _handle == "L" && _objOrder.OrderType == "IN")
                    {
                        rtrn = -1;
                    }
                    string objID = objBudget.AllocType == "1" ? _objUser.SalesRouteID : _objCust.CustId;
                    if (objBudget.ApplyTo == "A")
                    {
                        if (objBudget.AllocType == "1")
                        {
                            var objAlloc = _app.OM_PPAlloc.FirstOrDefault(p => p.CpnyID == _objUser.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == "" && p.ObjID == objID);

                            if (objAlloc != null)
                            {
                                objAlloc.QtyAmtSpent = objAlloc.QtyAmtSpent + discAmt * rtrn;
                                objAlloc.QtyAmtAvail = objAlloc.QtyAmtAlloc - objAlloc.QtyAmtSpent;
                                if (_screenNbr == "OM20500")
                                {
                                    objAlloc.QtyOnPDA = objAlloc.QtyOnPDA - discAmt * rtrn;
                                }
                                objAlloc.LUpd_DateTime = DateTime.Now;
                                objAlloc.LUpd_Prog = _screenNbr;
                                objAlloc.LUpd_User = Current.UserName;
                                if (objAlloc.QtyAmtAvail < 0)
                                {
                                    if (IsCalcPromo())
                                    {
                                        AddBudgetToString(discID + "-" + (discSeq != string.Empty ? discSeq + "-" : "") + objBudget.BudgetID + ",");
                                        return false;
                                    }
                                    else
                                    {
                                        throw new MessageException("2018102361");
                                    }
                                }
                            }
                            else
                            {
                                throw new MessageException("2018102360", new string[] { _objOrder.SlsPerID });
                            }
                        }
                        else if (objBudget.AllocType == "0")
                        {
                            var objbranchRoute = _app.OM10100_pdBranchRoute(Current.CpnyID, Current.UserName, Current.LangID, _objOrder.BranchID).FirstOrDefault();
                            if (objbranchRoute != null)
                            {
                                var objBranch = _app.OM_PPCpny.FirstOrDefault(p => p.CpnyID == objbranchRoute.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == "");
                                if (objBranch != null)
                                {
                                    objBranch.QtyAmtSpent = objBranch.QtyAmtSpent + discAmt * rtrn;
                                    objBranch.QtyAmtAvail = objBranch.QtyAmtAlloc - objBranch.QtyAmtSpent;
                                    if (_screenNbr == "OM20500")
                                    {
                                        objBranch.QtyOnPDA = objBranch.QtyOnPDA - discAmt * rtrn;
                                    }
                                    objBranch.LUpd_DateTime = DateTime.Now;
                                    objBranch.LUpd_Prog = _screenNbr;
                                    objBranch.LUpd_User = Current.UserName;
                                    if (objBranch.QtyAmtAvail < 0)
                                    {
                                        if (IsCalcPromo())
                                        {
                                            AddBudgetToString(discID + "-" + (discSeq != string.Empty ? discSeq + "-" : "") + objBudget.BudgetID + ",");
                                            return false;
                                        }
                                        else
                                        {
                                            throw new MessageException("2018102361");
                                        }
                                    }
                                }
                                else
                                {
                                    throw new MessageException("2019111260", new string[] { objbranchRoute.BranchRouteID });
                                }
                            }
                            else
                            {
                                throw new MessageException("2019111261", new string[] { _objOrder.BranchID });
                            }

                            
                        }
                        
                    }
                    else
                    {
                        OM_PPFreeItem objPPInvt = _app.OM_PPFreeItem.FirstOrDefault(p => p.BudgetID == objBudget.BudgetID && p.FreeItemID == freeItemID);
                        IN_UnitConversion uomFrom = SetUOM(freeItemID, discUOM, "", "");
                        if (uomFrom != null)
                        {
                            IN_UnitConversion uomTo = SetUOM(freeItemID, objPPInvt.UnitDesc, "", "");
                            double rate = (uomFrom.MultDiv == "M") ? uomFrom.CnvFact : 1 / uomFrom.CnvFact;
                            double rate2 = (uomTo.MultDiv == "M") ? uomTo.CnvFact : 1 / uomTo.CnvFact;
                            rate = Math.Round(rate / rate2, 2);
                            if (objPPInvt != null)
                            {
                                if (objBudget.AllocType != "0")
                                {
                                    OM_PPAlloc objAlloc = _app.OM_PPAlloc.FirstOrDefault(p => p.CpnyID == _objUser.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == freeItemID && p.ObjID == objID); //GetAlloc(objID, objBudget.BudgetID, newDisc.FreeItemID);
                                    if (objAlloc != null)
                                    {
                                        objAlloc.QtyAmtSpent = objAlloc.QtyAmtSpent + freeItemQty * rate * rtrn;
                                        objAlloc.QtyAmtAvail = objAlloc.QtyAmtAlloc - objAlloc.QtyAmtSpent;
                                        if (_screenNbr == "OM20500")
                                        {
                                            objAlloc.QtyOnPDA = objAlloc.QtyOnPDA - freeItemQty * rate * rtrn;
                                        }
                                        objAlloc.LUpd_DateTime = DateTime.Now;
                                        objAlloc.LUpd_Prog = _screenNbr;
                                        objAlloc.LUpd_User = Current.UserName;
                                        if (objAlloc.QtyAmtAvail < 0)
                                        {
                                            if (IsCalcPromo())
                                            {
                                                AddBudgetToString(discID + "-" + (discSeq != string.Empty ? discSeq + "-" : "") + objBudget.BudgetID + "-" + freeItemID + ",");
                                                return false;
                                            }
                                            else
                                            {
                                                throw new MessageException("2018102361");
                                            }
                                        }
                                    }
                                    else
                                    {
                                        throw new MessageException("2018102360", new string[] { _objOrder.SlsPerID });
                                    }
                                }
                                else if (objBudget.AllocType == "0")
                                {
                                    var objbranchRoute = _app.OM10100_pdBranchRoute(Current.CpnyID, Current.UserName, Current.LangID, _objOrder.BranchID).FirstOrDefault();
                                    if (objbranchRoute != null)
                                    {
                                        OM_PPCpny objBranchRoute = _app.OM_PPCpny.FirstOrDefault(p => p.CpnyID == objbranchRoute.BranchRouteID && p.BudgetID == objBudget.BudgetID && p.FreeItemID == freeItemID); //GetAlloc(objID, objBudget.BudgetID, newDisc.FreeItemID);
                                        if (objBranchRoute != null)
                                        {
                                            objBranchRoute.QtyAmtSpent = objBranchRoute.QtyAmtSpent + freeItemQty * rate * rtrn;
                                            objBranchRoute.QtyAmtAvail = objBranchRoute.QtyAmtAlloc - objBranchRoute.QtyAmtSpent;
                                            if (_screenNbr == "OM20500")
                                            { 
                                                objBranchRoute.QtyOnPDA = objBranchRoute.QtyOnPDA - freeItemQty * rate * rtrn;
                                            }
                                            objBranchRoute.LUpd_DateTime = DateTime.Now;
                                            objBranchRoute.LUpd_Prog = _screenNbr;
                                            objBranchRoute.LUpd_User = Current.UserName;
                                            if (objBranchRoute.QtyAmtAvail < 0)
                                            {
                                                if (IsCalcPromo())
                                                {
                                                    AddBudgetToString(discID + "-" + (discSeq != string.Empty ? discSeq + "-" : "") + objBudget.BudgetID + "-" + freeItemID + ",");
                                                    return false;
                                                }
                                                else
                                                {
                                                    throw new MessageException("2018102361");
                                                }
                                            }
                                        }
                                        else
                                        {
                                            throw new MessageException("2018102360", new string[] { _objOrder.SlsPerID });
                                        }
                                    }
                                    else
                                    {
                                        throw new MessageException("2019111261", new string[] { _objOrder.BranchID });
                                    }

                                }
                            }
                        }
                    }
                }
            }
            return true;
        }
        #endregion
        private void IncreaseDiscLineRef()
        {
            _discLineRef = LastLineRef((_discLineRef.ToInt() + 1).ToString());
        }
        private void IncreaseLineRef()
        {
            _lineRef = LastLineRef((_lineRef.ToInt() + 1).ToString());
        }

        private double CalcHeaderManulDisc()
        {
            var totalManuDiscAmt = _lstManualDisc.Sum(x => x.DiscAmt).ToDouble();
            if (totalManuDiscAmt != _objOrder.ManualDiscAmt)
            {
                double manualAmt = 0;
                double origOrderAmt = _lstOrdDet.Where(x => x.FreeItem == false).Sum(x => x.LineQty * x.SlsPrice).ToDouble();
                foreach (var objDisc in _lstManualDisc)
                {
                    if (objDisc.PromoType == "A")
                    {
                        manualAmt += objDisc.DiscAmt;
                    }
                    else if (objDisc.PromoType == "P")
                    {
                        manualAmt += (objDisc.DiscPct * origOrderAmt) / 100;
                    }
                } 
                _objOrder.ManualDiscAmt = manualAmt;
                _objOrder.ManualDiscPct = origOrderAmt == 0 ? 0 : (manualAmt * 100) / origOrderAmt;
            }
            return _objOrder.ManualDiscAmt;
        }

        private void AddBudgetToString(string value)
        {
            if (!_messBudget.Contains(value))
            {
                _messBudget += value;
            }
        }
        private string AddBudgetTemp(ref string messBudget, string value)
        {
            if (!messBudget.Contains(value))
            {
                messBudget += value;
            }
            return messBudget;
        }
    }
}
