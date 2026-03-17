using Microsoft.AspNetCore.Mvc;

namespace WcpBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LogsController : ControllerBase
    {
        // Menyimpan log secara in-memory untuk simulasi (Laci Kosong)
        private static List<LogEntry> _logs = new List<LogEntry>();
        private static int _nextId = 1;

        // ENDPOINT: Minta Data Log (Digunakan oleh React Web)
        [HttpGet]
        public IActionResult GetLogs()
        {
            // Mengirimkan laci yang berisi data terbaru
            return Ok(_logs);
        }

        // ENDPOINT: Terima Data Log Baru (Digunakan oleh Injector ESP32)
        [HttpPost]
        public IActionResult AddLog([FromBody] LogEntry newLog)
        {
            newLog.Id = _nextId++;
            _logs.Add(newLog);
            
            // Simpan paling atas (Terbaru)
            _logs = _logs.OrderByDescending(l => l.Id).ToList(); 

            return Ok(new { status = "success", message = "Log berhasil disimpan ke server!" });
        }
    }

    // Model struktur data tabel hujan
    public class LogEntry
    {
        public int Id { get; set; }
        public string WaktuMulai { get; set; } = string.Empty;
        public string WaktuSelesai { get; set; } = string.Empty;
        public int DurasiMenit { get; set; }
        public double TotalHujan { get; set; }
    }
}