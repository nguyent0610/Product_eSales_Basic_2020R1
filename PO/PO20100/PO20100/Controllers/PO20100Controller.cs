using HQ.eSkyFramework;
using Ext.Net;
using Ext.Net.MVC;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using PartialViewResult = System.Web.Mvc.PartialViewResult;
using System.IO;
using System.Text;
using Aspose.Cells;
using System.Drawing;
using HQFramework.DAL;
using System.Text.RegularExpressions;

namespace PO20100.Controllers
{
    [DirectController]
    [CustomAuthorize]
    [CheckSessionOut]
    public class PO20100Controller : Controller
    {
        private string _screenNbr = "PO20100";
        private string _userName = Current.UserName;

        PO20100Entities _db = Util.CreateObjectContext<PO20100Entities>(false);
        List<PO20100_ptTreeNode_Result> lstAllNode = new List<PO20100_ptTreeNode_Result>();
        private JsonResult _logMessage;
        public ActionResult Index()
        {
            LicenseHelper.ModifyInMemory.ActivateMemoryPatching();
            Util.InitRight(_screenNbr);
            bool noPriceCalculation = false;
            bool hideChkPublic = false;
            bool hideCpnyType = false;
            string decimalPrecision = "0,000";
            int decimalInput = 0;
            var objConfig = _db.PO20100_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
            if (objConfig != null)
            {
                noPriceCalculation = objConfig.NoPriceCalculation.HasValue && objConfig.NoPriceCalculation.Value;
                hideChkPublic = objConfig.hideChkPublic.HasValue && objConfig.hideChkPublic.Value;
                hideCpnyType = objConfig.hideCpnyType.HasValue && objConfig.hideCpnyType.Value;
                decimalPrecision = objConfig.DecimalPrecision;
                decimalInput = objConfig.DecimalInput ?? 0;
            }
            ViewBag.noPriceCalculation = noPriceCalculation;
            ViewBag.hideChkPublic = hideChkPublic;
            ViewBag.hideCpnyType = hideCpnyType;
            ViewBag.DecimalPrecision = decimalPrecision;
            ViewBag.DecimalInput = decimalInput;
            return View();
        }

        //[OutputCache(Duration = 1000000, VaryByParam = "lang")]
        public PartialViewResult Body()
        {
            return PartialView();
        }
        public PartialViewResult BodyCurrent()
        {
            return PartialView();
        }
        public ActionResult GetPO_Price(string PriceID)
        {
            return this.Store(_db.PO20100_pgGetPOPrice(PriceID).ToList());
        }

        public ActionResult GetPO_PriceCpny(string PriceID)
        {
            return this.Store(_db.PO20100_pgGetPOPriceCpny(Current.CpnyID, Current.UserName, Current.LangID, PriceID).ToList());
        }

        public ActionResult GetPOPriceHeader(string PriceID)
        {
            return this.Store(_db.PO_PriceHeader.Where(p => p.PriceID == PriceID));
        }
        public ActionResult GetPriceIDCopy()
        {
            return this.Store(_db.PO20100_pcPriceIDCopy(Current.UserName, Current.CpnyID, Current.LangID).ToList());
        }

        [HttpPost]
        public ActionResult GetPOPriceCopy(string priceID)
        {
            var data = _db.PO20100_pgGetPOPriceCopy(Current.UserName, Current.CpnyID, Current.LangID, priceID).ToList();
            return this.Store(data);
        }

        public ActionResult GetPOPriceCpnyCopy(string priceID)
        {
            var data = _db.PO20100_pgGetPOPriceCpnyCopy(Current.UserName, Current.CpnyID, Current.LangID, priceID).ToList();
            return this.Store(data);
        }
        public ActionResult GetPriceHeader(string priceID)
        {
            var data = _db.PO20100_pgPriceHeader(Current.UserName, Current.CpnyID, Current.LangID, priceID).ToList();
            return this.Store(data);
        }

        [HttpPost]
        public ActionResult Save(FormCollection data, bool copy)
        {
            //string PriceID = data["cboPriceID"];
            try
            {
                string PriceID = data["cboPriceID"];
                string handle = data["cboHandle"].PassNull();

                //var discInfoHandler = new StoreDataHandler(data["lstDiscInfo"]);
                //var inputDisc = discInfoHandler.ObjectData<OM_Discount>()
                //            .FirstOrDefault(p => p.DiscID == discID);
                bool noPriceCalculation = false;
                var objconfig = _db.PO20100_pdConfig(Current.UserName, Current.CpnyID, Current.LangID).FirstOrDefault();
                if (objconfig != null)
                {
                    noPriceCalculation = objconfig.NoPriceCalculation.HasValue && objconfig.NoPriceCalculation.Value;
                }

                StoreDataHandler dataHandler = new StoreDataHandler(data["lstPOPriceHeader"]);
                var curHeader = dataHandler.ObjectData<PO_PriceHeader>().FirstOrDefault();

                StoreDataHandler dataHandler1 = new StoreDataHandler(data["lstPO_Price"]);
                ChangeRecords<PO20100_pgGetPOPrice_Result> lstPO_Price = dataHandler1.BatchObjectData<PO20100_pgGetPOPrice_Result>();

                StoreDataHandler dataHandler2 = new StoreDataHandler(data["lstPO_PriceCpny"]);
                ChangeRecords<PO20100_pgGetPOPriceCpny_Result> lstPO_PriceCpny = dataHandler2.BatchObjectData<PO20100_pgGetPOPriceCpny_Result>();

                StoreDataHandler dataHandler3 = new StoreDataHandler(data["lstPO_PriceCopy"]);
                List<PO20100_pgGetPOPrice_Result> lstPO_PriceCopy = dataHandler3.ObjectData<PO20100_pgGetPOPrice_Result>();

                StoreDataHandler dataHandler4 = new StoreDataHandler(data["lstPO_PriceCpnyCopy"]);
                List<PO20100_pgGetPOPriceCpny_Result> lstPO_PriceCpnyCopy = dataHandler4.ObjectData<PO20100_pgGetPOPriceCpny_Result>();
                #region Save header
                // lstPOPriceHeader.Created.AddRange(lstPOPriceHeader.Updated);

                //foreach (PO_PriceHeader curHeader in lstPOPriceHeader.Created)
                //{
                //  if (PriceID.PassNull() == "") continue;

                var header = _db.PO_PriceHeader.FirstOrDefault(p => p.PriceID == PriceID);
                bool isNew = false;
                if (header != null)
                {
                    if (header.tstamp.ToHex() == curHeader.tstamp.ToHex())
                    {
                        isNew = false;
                        //UpdatingHeader(header, curHeader, false);
                    }
                    else
                    {
                        throw new MessageException(MessageType.Message, "19");
                    }
                }
                else
                {
                    header = new PO_PriceHeader();
                    header.PriceID = PriceID;
                    isNew = true;

                    _db.PO_PriceHeader.AddObject(header);
                }
                UpdatingHeader(header, curHeader, isNew, handle);
                #region Save PO_PriceCpny
                if (header.Public)
                {
                    var lstDelCpny = _db.PO_PriceCpny.Where(p => p.PriceID == PriceID).ToList();
                    foreach (var objDelete in lstDelCpny)
                    {
                        if (objDelete != null)
                        {
                            _db.PO_PriceCpny.DeleteObject(objDelete);
                        }
                    }
                }
                else
                {
                    lstPO_PriceCpny.Created.AddRange(lstPO_PriceCpny.Updated);
                    foreach (var deleted in lstPO_PriceCpny.Deleted)
                    {
                        //neu danh sach them co chua danh sach xoa thi khong xoa thằng đó cập nhật lại tstamp của thằng đã xóa xem nhu trường hợp xóa thêm mới là trường hợp update
                        if (lstPO_PriceCpny.Created.Where(p => p.CpnyID == deleted.CpnyID).Count() > 0)
                        {
                            // lstPO_PriceCpny.Created.Where(p => p.CpnyID == deleted.CpnyID).FirstOrDefault().tt = del.tstamp;
                        }
                        else
                        {
                            var objDelete = _db.PO_PriceCpny.Where(p => p.PriceID == header.PriceID && p.CpnyID == deleted.CpnyID).FirstOrDefault();
                            if (objDelete != null)
                            {
                                _db.PO_PriceCpny.DeleteObject(objDelete);
                            }
                        }
                    }

                    if (copy)
                    {
                        foreach (PO20100_pgGetPOPriceCpny_Result item in lstPO_PriceCpnyCopy)
                        {
                            if (item.CpnyID.PassNull() == "" || PriceID.ToLower() != header.PriceID.ToLower()) continue;
                            var lang = _db.PO_PriceCpny.FirstOrDefault(p => p.PriceID.ToLower() == header.PriceID.ToLower() && p.CpnyID.ToLower() == item.CpnyID.ToLower());

                            if (lang != null)
                            {
                                lang.CpnyID = item.CpnyID;
                            }
                            else
                            {
                                lang = new PO_PriceCpny();
                                lang.PriceID = PriceID;
                                lang.CpnyID = item.CpnyID;
                                _db.PO_PriceCpny.AddObject(lang);
                            }
                        }
                    }
                    else
                    {
                        foreach (PO20100_pgGetPOPriceCpny_Result curLang in lstPO_PriceCpny.Created)
                        {
                            if (curLang.CpnyID.PassNull() == "" || PriceID.ToLower() != header.PriceID.ToLower()) continue;

                            var lang = _db.PO_PriceCpny.FirstOrDefault(p => p.PriceID.ToLower() == header.PriceID.ToLower() && p.CpnyID.ToLower() == curLang.CpnyID.ToLower());

                            if (lang != null)
                            {
                                lang.CpnyID = curLang.CpnyID;
                            }
                            else
                            {
                                lang = new PO_PriceCpny();
                                lang.PriceID = PriceID;
                                lang.CpnyID = curLang.CpnyID;
                                _db.PO_PriceCpny.AddObject(lang);
                            }
                        }
                    }


                }
                #endregion

                #endregion

                #region Save PO_Price
                foreach (PO20100_pgGetPOPrice_Result deleted in lstPO_Price.Deleted)
                {
                    var del = _db.PO_Price.Where(p => p.PriceID == PriceID && p.InvtID == deleted.InvtID && p.UOM == deleted.UOM).FirstOrDefault();
                    if (del != null)
                    {
                        _db.PO_Price.DeleteObject(del);
                    }
                }

                lstPO_Price.Created.AddRange(lstPO_Price.Updated);

                if (copy)
                {
                    foreach (PO20100_pgGetPOPrice_Result item in lstPO_PriceCopy)
                    {
                        if (item.InvtID.PassNull() == "" || PriceID.PassNull() == "" || item.UOM.PassNull() == "") continue;

                        var lang = _db.PO_Price.FirstOrDefault(p => p.PriceID.ToLower() == PriceID.ToLower() && p.InvtID.ToLower() == item.InvtID.ToLower() && p.UOM.ToLower() == item.UOM.ToLower());

                        if (lang != null)
                        {
                            if (lang.tstamp.ToHex() == item.tstamp.ToHex())
                            {
                                Update_PO_Price(lang, item, noPriceCalculation, false);
                            }
                            else
                            {
                                throw new MessageException(MessageType.Message, "19");
                            }
                        }
                        else
                        {
                            lang = new PO_Price();
                            lang.PriceID = PriceID;
                            Update_PO_Price(lang, item, noPriceCalculation, true);
                            _db.PO_Price.AddObject(lang);
                        }
                    }
                }
                else
                {
                    foreach (PO20100_pgGetPOPrice_Result curLang in lstPO_Price.Created)
                    {
                        if (curLang.InvtID.PassNull() == "" || PriceID.PassNull() == "" || curLang.UOM.PassNull() == "") continue;

                        var lang = _db.PO_Price.FirstOrDefault(p => p.PriceID.ToLower() == PriceID.ToLower() && p.InvtID.ToLower() == curLang.InvtID.ToLower() && p.UOM.ToLower() == curLang.UOM.ToLower());

                        if (lang != null)
                        {
                            if (lang.tstamp.ToHex() == curLang.tstamp.ToHex())
                            {
                                Update_PO_Price(lang, curLang, noPriceCalculation, false);
                            }
                            else
                            {
                                throw new MessageException(MessageType.Message, "19");
                            }
                        }
                        else
                        {
                            lang = new PO_Price();
                            lang.PriceID = PriceID;
                            Update_PO_Price(lang, curLang, noPriceCalculation, true);
                            _db.PO_Price.AddObject(lang);
                        }
                    }
                }

                #endregion

                _db.SaveChanges();
                return Json(new { success = true, priceID = PriceID });
            }
            catch (Exception ex)
            {
                if (ex is MessageException) return (ex as MessageException).ToMessage();
                return Json(new { success = false, type = "error", errorMsg = ex.ToString() });
            }
        }

        private void UpdatingHeader(PO_PriceHeader t, PO_PriceHeader s, bool isNew, string handle)
        {
            if (isNew)
            {
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = _userName;
                t.StatusApprove = "H";
            }
            if (handle == "" || handle == "N")
            {
                //t.StatusApprove = "H";
            }
            else
            {
                t.StatusApprove = handle;
            }
            t.Descr = s.Descr;
            t.Disc = s.Disc;
            t.EffDate = s.EffDate;
            t.HOCreate = s.HOCreate;
            t.Public = s.Public;
            t.Status = s.Status;
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = _userName;
        }

        private void Update_PO_Price(PO_Price t, PO20100_pgGetPOPrice_Result s, bool noPriceCalculation, bool isNew)
        {
            if (isNew)
            {
                t.VendID = "*";
                t.InvtID = s.InvtID;
                t.UOM = s.UOM;
                t.Crtd_DateTime = DateTime.Now;
                t.Crtd_Prog = _screenNbr;
                t.Crtd_User = _userName;
            }
            t.Descr = s.Descr;
            t.QtyBreak = s.QtyBreak;
            t.Disc = s.Disc;
            if (noPriceCalculation)
            {
                t.Price = s.Price;
            }
            else
            {
                t.Price = s.Price + ((s.Price * s.Disc.ToDouble()) / 100);
            }
            t.LUpd_DateTime = DateTime.Now;
            t.LUpd_Prog = _screenNbr;
            t.LUpd_User = _userName;
        }

        [HttpPost]
        public ActionResult DeleteAll(FormCollection data)
        {
            try
            {
                string PriceID = data["cboPriceID"];
                var obj = _db.PO_PriceHeader.FirstOrDefault(p => p.PriceID == PriceID);
                if (obj != null)
                {
                    _db.PO_PriceHeader.DeleteObject(obj);
                }
                var lstPO_Price = _db.PO_Price.Where(p => p.PriceID == PriceID).ToList();
                foreach (var item in lstPO_Price)
                {
                    _db.PO_Price.DeleteObject(item);
                }
                var lstPO_PriceCpny = _db.PO_PriceCpny.Where(p => p.PriceID == PriceID).ToList();
                foreach (var item in lstPO_PriceCpny)
                {
                    _db.PO_PriceCpny.DeleteObject(item);
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
        [DirectMethod]
        public ActionResult PO20100GetTreeBranch(string panelID)
        {
            TreePanel tree = new TreePanel();
            tree.ID = "treePanelBranch";
            tree.ItemID = "treePanelBranch";

            tree.Fields.Add(new ModelField("RecID", ModelFieldType.String));
            tree.Fields.Add(new ModelField("Type", ModelFieldType.String));
            tree.Fields.Add(new ModelField("CpnyType", ModelFieldType.String));

            tree.Border = false;
            tree.RootVisible = true;
            tree.Animate = true;

            Node node = new Node();
            node.NodeID = "Root";
            node.Checked = false;

            lstAllNode = _db.PO20100_ptTreeNode(Current.UserName, Current.CpnyID, Current.LangID).ToList();


            var maxLevel = lstAllNode.Max(x => x.LevelID);
            var lstFirst = lstAllNode.Where(x => x.LevelID == maxLevel).ToList();
            var crrLevel = maxLevel - 1;
            if (lstFirst.Count > 0)
            {
                string crrParent = string.Empty;
                Node parentNode = null;
                bool isAddChild = false;// lstFirst.Where(x => x.ParentID != string.Empty).Count() > 0;
                foreach (var it in lstFirst)
                {
                    var childNode = SetNodeValue(it, Ext.Net.Icon.UserHome);
                    GetChildNode(ref childNode, (int)crrLevel, it.Code);

                    if (it.ParentID != crrParent)
                    {
                        crrParent = it.ParentID;
                        parentNode.Children.Add(childNode);
                        isAddChild = true;
                        node.Children.Add(parentNode);
                    }
                    else
                    {
                        if (it.ParentID != string.Empty)
                        {
                            parentNode.Children.Add(childNode);
                        }
                    }
                    if (!isAddChild)
                    {
                        node.Children.Add(childNode);
                    }
                }
            }

            node.Icon = Ext.Net.Icon.FolderHome;

            tree.Root.Add(node);

            var treeBranch = X.GetCmp<Panel>(panelID);

            //tree.Listeners.ItemClick.Fn = "DiscDefintion.nodeClick";
            tree.Listeners.CheckChange.Fn = "treePanelBranch_checkChange";
            tree.Listeners.ItemCollapse.Fn = "tree_ItemCollapse";
            tree.AddTo(treeBranch);

            return this.Direct();

        }

        private Node SetNodeValue(PO20100_ptTreeNode_Result objNode, Ext.Net.Icon icon)
        {
            Node node = new Node();

            Random rand = new Random();
            node.NodeID = objNode.Code + objNode.ParentID + (rand.Next(999, 9999) + objNode.LevelID).ToString();
            node.Checked = false;
            node.Text = objNode.Descr;
            node.CustomAttributes.Add(new ConfigItem() { Name = "Type", Value = objNode.Type, Mode = Ext.Net.ParameterMode.Value });
            node.CustomAttributes.Add(new ConfigItem() { Name = "RecID", Value = objNode.Code, Mode = Ext.Net.ParameterMode.Value });
            node.CustomAttributes.Add(new ConfigItem() { Name = "CpnyType", Value = objNode.CpnyType, Mode = Ext.Net.ParameterMode.Value });
            node.Icon = objNode.LevelID != 0 ? icon : Ext.Net.Icon.Folder;
            node.Leaf = objNode.LevelID == 0;// true;
            node.IconCls = "tree-node-noicon";
            return node;
        }
        private void GetChildNode(ref Node crrNode, int level, string parrentID)
        {
            if (level >= 0)
            {
                var lstSub = lstAllNode.Where(x => x.ParentID == parrentID && x.LevelID == level).ToList();

                if (lstSub.Count > 0)
                {
                    var crrLevel = level - 1;
                    string crrParent = string.Empty;
                    foreach (var it in lstSub)
                    {
                        var childNode = SetNodeValue(it, Ext.Net.Icon.FolderGo);
                        GetChildNode(ref childNode, crrLevel, it.Code);
                        crrNode.Children.Add(childNode);
                    }
                }
                else
                {
                    crrNode.Leaf = true;
                }
            }
            else
            {
                crrNode.Leaf = true;
            }
        }
        //Import và Export 
        //Import & Export
        private string Getcell(int column)
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
                if (column % 26 == 0)
                {
                    //if (flag)
                    //{
                    cell += ABC.Substring(0, 1);
                }
            }

            return cell;
        }
        [HttpPost]
        public ActionResult Export(FormCollection data)
        {
            try
            {
                Cell cell;
                Stream stream = new MemoryStream();
                Workbook workbook = new Workbook();
                Worksheet SheetData = workbook.Worksheets[0];


                SheetData.Name = Util.GetLang("PO20100SheetName");

                DataAccess dal = Util.Dal();
                Style style = workbook.GetStyleInPool(0);
                StyleFlag flag = new StyleFlag();
                Range range;
                var ColTexts = new string[] { "InvtID", "Unit", "Price" };
                for (int i = 0; i < ColTexts.Length; i++)
                {
                    var colIdx = i;
                    SetCellValue(SheetData.Cells[0, colIdx], Util.GetLang(ColTexts[i]), TextAlignmentType.Center, TextAlignmentType.Center, true, 10, false);
                }
                var allColumns = new List<string>();
                allColumns.AddRange(ColTexts);

                SheetData.AutoFitRow(0);
                //SheetData.Cells.SetRowHeight(0, 60);

                SheetData.Cells.Columns[allColumns.IndexOf("InvtID")].Width = 20;
                SheetData.Cells.Columns[allColumns.IndexOf("Unit")].Width = 40;
                SheetData.Cells.Columns[allColumns.IndexOf("Price")].Width = 20;

                StyleFlag flag1 = new StyleFlag();
                Style colStyleCrush = SheetData.Cells[allColumns.IndexOf("InvtID")].GetStyle();
                colStyleCrush.Font.Color = Color.Black;
                colStyleCrush.IsLocked = false;
                colStyleCrush.Number = 49;
                flag1.FontColor = true;
                flag1.NumberFormat = true;
                flag1.Locked = true;
                range = SheetData.Cells.CreateRange(Getcell(allColumns.IndexOf("InvtID")) + 2, Getcell(allColumns.IndexOf("InvtID")) + 10000);
                range.ApplyStyle(colStyleCrush, flag1);


                flag1 = new StyleFlag();
                colStyleCrush = SheetData.Cells[allColumns.IndexOf("Unit")].GetStyle();
                colStyleCrush.Font.Color = Color.Black;
                colStyleCrush.IsLocked = false;
                flag1.FontColor = true;
                flag1.NumberFormat = true;
                flag1.Locked = true;
                range = SheetData.Cells.CreateRange(Getcell(allColumns.IndexOf("Unit")) + 2, Getcell(allColumns.IndexOf("Unit")) + 10000);
                range.ApplyStyle(colStyleCrush, flag1);


                flag1 = new StyleFlag();
                colStyleCrush = SheetData.Cells[allColumns.IndexOf("Price")].GetStyle();
                colStyleCrush.Font.Color = Color.Black;
                colStyleCrush.IsLocked = false;
                flag1.FontColor = true;
                flag1.NumberFormat = true;
                colStyleCrush.Custom = "#,##0.000";
                flag1.Locked = true;
                range = SheetData.Cells.CreateRange(Getcell(allColumns.IndexOf("Price")) + 2, Getcell(allColumns.IndexOf("Price")) + 10000);
                range.ApplyStyle(colStyleCrush, flag1);

                SheetData.Protection.AllowFiltering = true;
                SheetData.Protection.AllowDeletingRow = true;
                SheetData.Protection.Password = "HQS0ftw@re2017";

                workbook.Worksheets[0].Protect(ProtectionType.All, "HQS0ftw@re2017", "HQS0ftw@re2017");
                workbook.Protect(ProtectionType.All, "HQS0ftw@re2017");
                SheetData.Protect(ProtectionType.All);

                var fileName = Util.GetLang("PO20100SheetName") + DateTime.Now.ToString("yyyyMMddHHmm") + ".xlsx";
                string fullPath = Path.Combine(Server.MapPath("~/temp"), fileName);

                workbook.Settings.AutoRecover = true;

                workbook.Save(fullPath, SaveFormat.Xlsx);
                return Json(new { success = true, fileName = fileName, errorMessage = "" });
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
        [HttpGet]
        [DeleteFileAttribute] //Action Filter, it will auto delete the file after download,I will explain it later
        public ActionResult DownloadAndDelete(string file)
        {
            //get the temp folder and file path in server
            string fullPath = Path.Combine(Server.MapPath("~/temp"), file);
            return File(fullPath, "application/vnd.ms-excel", file);
        }
        private void SetCellValueGrid(Cell c, string lang, TextAlignmentType alignV, TextAlignmentType alignH)
        {
            c.PutValue(" " + lang);
            var style = c.GetStyle();
            style.Number = 49;
            style.Font.Name = "Times New Roman";
            style.Font.IsBold = true;
            style.Font.Size = 11;

            style.Font.Color = Color.Black;
            style.HorizontalAlignment = alignH;
            style.VerticalAlignment = alignV;
            c.SetStyle(style);
        }
        private void SetCellValue(Cell c, string lang, TextAlignmentType alignV, TextAlignmentType alignH, bool isBold, int size, bool isTitle, bool isBackground = false)
        {
            c.PutValue(" " + lang);
            var style = c.GetStyle();
            style.Font.IsBold = isBold;
            style.Font.Size = size;
            style.HorizontalAlignment = alignH;
            style.VerticalAlignment = alignV;
            style.IsTextWrapped = true;
            //style.ForegroundColor = Color.Red;
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

        public class DeleteFileAttribute : ActionFilterAttribute
        {
            public override void OnResultExecuted(ResultExecutedContext filterContext)
            {
                filterContext.HttpContext.Response.Flush();

                //convert the current filter context to file and get the file path
                string filePath = (filterContext.Result as FilePathResult).FileName;

                //delete the file after download
                System.IO.File.Delete(filePath);
            }
        }
        public ActionResult Import(FormCollection data)
        {
            try
            {
                var access = Session["OM21500"] as AccessRight;
                //var regex = new System.Text.RegularExpressions.Regex(@"^(\w*(\d|[a-zA-Z]))[\_]*$");

                FileUploadField fileUploadField = X.GetCmp<FileUploadField>("btnImport");
                HttpPostedFile file = fileUploadField.PostedFile;
                FileInfo fileInfo = new FileInfo(file.FileName);
                var obj = string.Empty;
                //List<KE_ItemTrans> lstKE_ItemTrans = new List<KE_ItemTrans>();
                string message = string.Empty;
                //SheetInformation
                string errorInvtIDNull = string.Empty;
                string errorUnitNull = string.Empty;
                string errorPriceNull = string.Empty;

                string errorInvtID = string.Empty;
                string errorUnit = string.Empty;
                string errorPrice = string.Empty;
                string errorPriceNegative = string.Empty;

                string errorSave = string.Empty;

                var ColTexts = new List<string> { "InvtID", "Unit", "Price" };

                if (fileInfo.Extension == ".xls" || fileInfo.Extension == ".xlsx")
                {
                    Workbook workbook = new Workbook(fileUploadField.PostedFile.InputStream);
                    if (workbook.Worksheets.Count > 0)
                    {
                        Worksheet SheetInfomation = workbook.Worksheets[0];
                        List<PO_Price> lstPO_Price = new List<PO_Price>();
                        if (SheetInfomation.Cells[1, ColTexts.IndexOf("InvtID")].StringValue.PassNull().ToUpper() == "")
                        {
                            throw new MessageException(MessageType.Message, "2018102463", "", new string[] { });
                        }
                        string regex = "!$^&=:;><?*%\"#{}[]\\/,";
                        for (int i = 1; i <= SheetInfomation.Cells.MaxDataRow; i++)
                        {
                            string ClassID = string.Empty;
                            bool flagCheck = false;
                            string InvtID = SheetInfomation.Cells[i, ColTexts.IndexOf("InvtID")].StringValue.PassNull();
                            string Unit = SheetInfomation.Cells[i, ColTexts.IndexOf("Unit")].StringValue.PassNull();
                            string Price = SheetInfomation.Cells[i, ColTexts.IndexOf("Price")].StringValue.PassNull();

                            if (InvtID.PassNull() == "") continue;

                            bool errorInvt = false;
                            if (InvtID.PassNull() == "")
                            {
                                errorInvtIDNull += (i + 1).ToString() + ", ";
                                flagCheck = true;
                            }

                            else if (_db.PO20100_piInventoryActive(Current.UserName, Current.CpnyID, Current.LangID, InvtID != null ? InvtID : "").FirstOrDefault() == null)
                            {
                                errorInvtID += (i + 1).ToString() + ", ";
                                flagCheck = true;
                                errorInvt = true;
                            }
                            else
                            {
                                ClassID = _db.PO20100_piInventoryActive(Current.UserName, Current.CpnyID, Current.LangID, InvtID != null ? InvtID : "").FirstOrDefault().ClassID;
                            }
                            if (!errorInvt)
                            {
                                if (Unit.PassNull() == "")
                                {
                                    errorUnitNull += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    var lstUOM = _db.PO20100_piUOM_InvtID(InvtID, Unit).ToList();
                                    if (!lstUOM.Any())
                                    {
                                        errorUnit += (i + 1).ToString() + ", ";
                                        flagCheck = true;
                                    }

                                }


                                if (Price.PassNull() == "")
                                {
                                    errorPriceNull += (i + 1).ToString() + ", ";
                                    flagCheck = true;
                                }
                                else
                                {
                                    try
                                    {
                                        var dou = Price.ToDouble();
                                        if (dou < 0)
                                        {
                                            errorPriceNegative += (i + 1).ToString() + ", ";
                                            flagCheck = true;
                                        }
                                    }
                                    catch
                                    {
                                        errorPrice += (i + 1).ToString() + ", ";
                                        flagCheck = true;
                                    }
                                }
                            }
                            

                            if (flagCheck == true) continue;


                            var record = lstPO_Price.Where(p => p.InvtID == InvtID).FirstOrDefault();
                            if (record == null)
                            {
                                record = new PO_Price();
                                record.ResetET();
                                record.InvtID = InvtID;
                            }
                            record.UOM = Unit.ToUpper();
                            record.Price = Math.Round(Price.ToDouble(), 3);

                            lstPO_Price.Add(record);

                        }




                        if (errorSave != null && errorSave != "")
                        {
                            message = errorSave == "" ? "" : string.Format(Message.GetString("2018042060", null), errorSave);
                            throw new MessageException(MessageType.Message, "20410", "", new string[] { message });
                        }





                        message += errorInvtIDNull == "" ? "" : string.Format(Message.GetString("2018101660", null), Util.GetLang("InvtID"), errorInvtIDNull);
                        message += errorUnitNull == "" ? "" : string.Format(Message.GetString("2018101660", null), Util.GetLang("Unit"), errorUnitNull);
                        message += errorPriceNull == "" ? "" : string.Format(Message.GetString("2018101660", null), Util.GetLang("Price"), errorPriceNull);

                        message += errorInvtID == "" ? "" : string.Format(Message.GetString("2018101662", null), Util.GetLang("InvtID"), errorInvtID);
                        message += errorUnit == "" ? "" : string.Format(Message.GetString("2018101661", null), Util.GetLang("InvtID"), errorUnit);                        
                        message += errorPrice == "" ? "" : string.Format(Message.GetString("2018101663", null), Util.GetLang("Price"), errorPrice);
                        message += errorPriceNegative == "" ? "" : string.Format(Message.GetString("2018103161", null), Util.GetLang("Price"), errorPriceNegative);


                        if (message == "" || message == string.Empty)
                        {
                            Util.AppendLog(ref _logMessage, "20121418", "", data: new { message, lstPO_Price });
                        }
                        else
                        {
                            Util.AppendLog(ref _logMessage, "20121418", "", data: new { message });
                        }

                    }

                }

            }
            catch (Exception ex)
            {
                if (ex is MessageException) return (ex as MessageException).ToMessage();
                return Json(new { success = false, messid = 9991, errorMsg = ex.ToString(), type = "error", fn = "", parm = "" });
            }
            return _logMessage;
        }
        public bool IsNumber(string pText)
        {
            Regex regex = new Regex(@"^[-+]?[0-9]*\.?[0-9]+$");
            return regex.IsMatch(pText);
        }
    }
}
