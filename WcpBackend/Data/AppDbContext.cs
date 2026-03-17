using Microsoft.EntityFrameworkCore;
using WcpBackend.Models;

namespace WcpBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<RainLog> RainLogs { get; set; }
    }
}