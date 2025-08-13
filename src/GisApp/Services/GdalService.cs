using OSGeo.GDAL;
using OSGeo.OGR;
using OSGeo.OSR;

namespace GisApp.Services
{
    /// <summary>GDAL関連のユーティリティ</summary>
    public static class GdalService
    {
        private static bool _configured = false;

        public static void ConfigureGdal()
        {
            if (_configured) return;
            GdalBase.ConfigureAll();
            Gdal.AllRegister();
            Ogr.RegisterAll();
            _configured = true;
        }

        /// <summary>EPSGコードからWKTを生成</summary>
        public static string? GetWktFromEpsg(int epsg)
        {
            var srs = new SpatialReference("");
            srs.ImportFromEPSG(epsg);
            srs.AutoIdentifyEPSG();
            srs.ExportToWkt(out string? wkt, null);
            return wkt;
        }

        /// <summary>DatasetからEPSGコードを取得</summary>
        public static string? GetEpsgFromDataset(Dataset ds)
        {
            var wkt = ds.GetProjectionRef();
            if (string.IsNullOrEmpty(wkt)) return null;
            return GetEpsgFromWkt(wkt);
        }

        /// <summary>WKTからEPSGコードを推定</summary>
        public static string? GetEpsgFromWkt(string wkt)
        {
            var srs = new SpatialReference(wkt);
            srs.AutoIdentifyEPSG();
            var auth = srs.GetAuthorityCode(null);
            if (!string.IsNullOrEmpty(auth)) return $"EPSG:{auth}";
            return null;
        }
    }
}
