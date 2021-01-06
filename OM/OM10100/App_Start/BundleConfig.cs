using System.Web;
using System.Web.Optimization;

namespace OM10100
{
    public class BundleConfig
    {
        // For more information on Bundling, visit http://go.microsoft.com/fwlink/?LinkId=254725
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/extjs").Include(
                  "~/extjs.js",
                  "~/extnet.js",
                  "~/gridfilter.js",
                  "~/ProgressBarPager.js",
                  "~/Scripts/hq.common.js"
                  ));

            bundles.Add(new StyleBundle("~/extcss").Include(
               "~/Content/extjs.css",
               "~/Content/extnet.css",
               "~/Content/gridfilter-embedded.css",
               "~/Content/hq-theme.min.css"
               ));

            bundles.Add(new ScriptBundle("~/language0").Include(
                       "~/Scripts/hq.language0.js"
                       ));

            bundles.Add(new ScriptBundle("~/language1").Include(
                       "~/Scripts/hq.language1.js"
                       ));

            bundles.Add(new ScriptBundle("~/language2").Include(
                       "~/Scripts/hq.language2.js"
                       ));

            bundles.Add(new ScriptBundle("~/language3").Include(
                       "~/Scripts/hq.language3.js"
                       ));

            bundles.Add(new ScriptBundle("~/language4").Include(
                              "~/Scripts/hq.language4.js"
                              ));

            var myType = typeof(BundleConfig);
            bundles.Add(new ScriptBundle("~/" + myType.Namespace + "JS").Include(
                       "~/Scripts/Screen/" + myType.Namespace + ".js",
                       "~/Scripts/Screen/" + myType.Namespace + "body.js"
                       ));
            BundleTable.EnableOptimizations = true; 

        }
    }
}