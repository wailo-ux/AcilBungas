namespace WcpBackend.Models
{
    public class RainLog
    {
        public int Id { get; set; }
        public string? WaktuMulai { get; set; }
        public string? WaktuSelesai { get; set; }
        public int DurasiMenit { get; set; }
        public double TotalHujan { get; set; }
    }
}