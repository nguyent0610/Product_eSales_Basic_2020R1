using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;
using HQ.eSkyFramework;
using System.Configuration;

namespace OM10100
{
    // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801

    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            WebApiConfig.Register(GlobalConfiguration.Configuration);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }
        protected void Session_Start(object sender, EventArgs e)
        {            
            Current.FormatDate = "MM-dd-yyyy";
            Current.FormatDateJS = "Y-m-d";
            Current.Authorize = false;
            Current.Server = ConfigurationManager.AppSettings["Server"].ToString(); 
            Current.DBSys = ConfigurationManager.AppSettings["DBSys"].ToString();
            AccessRight acc = new AccessRight();
            acc.Delete = true;
            acc.Insert = true;
            acc.Update = true;
            Session["OM10100"] = acc;
            Session["DBApp"] = Current.DBApp = ConfigurationManager.AppSettings["DBApp"].ToString();
            Session["UserName"] = Current.UserName = "HQSOFT"; // TrangHOdn  admin
            Session["CpnyID"] = Current.CpnyID = "HQSOFT";
            Session["Language"] = Current.Language = "vi";
            Session["LangID"] = 0;
            Current.Debug = false;
        }
    }
}