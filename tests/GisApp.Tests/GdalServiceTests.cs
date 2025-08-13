using GisApp.Services;
using Xunit;

namespace GisApp.Tests
{
    public class GdalServiceTests
    {
        [Fact]
        public void WktToEpsg()
        {
            GdalService.ConfigureGdal();
            var wkt = GdalService.GetWktFromEpsg(4326)!;
            var epsg = GdalService.GetEpsgFromWkt(wkt);
            Assert.Equal("EPSG:4326", epsg);
        }
    }
}
