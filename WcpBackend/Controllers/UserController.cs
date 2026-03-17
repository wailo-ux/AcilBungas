using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WcpBackend.Data;

namespace WcpBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        // 1. AMBIL SEMUA USER (Kecuali SPV)
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            // Ambil semua user yang role-nya bukan SPV agar SPV tidak terhapus sendiri
            var users = await _db.Users
                                 .Where(u => u.Role != "spv")
                                 .Select(u => new { 
                                     id = u.Id, 
                                     full_name = u.FullName, 
                                     username = u.Username, 
                                     status = u.Status, 
                                     role = u.Role 
                                 })
                                 .ToListAsync();
            
            return Ok(users);
        }

        // 2. APPROVE AKUN CREW
        [HttpPost("approve")]
        public async Task<IActionResult> ApproveUser([FromBody] UserIdRequest req)
        {
            var user = await _db.Users.FindAsync(req.Id);
            if (user == null) return NotFound(new { status = "error", message = "User tidak ditemukan" });

            user.Status = "active";
            await _db.SaveChangesAsync();

            return Ok(new { status = "success", message = "Akun berhasil diaktifkan" });
        }

        // 3. HAPUS AKUN CREW
        [HttpPost("delete")]
        public async Task<IActionResult> DeleteUser([FromBody] UserIdRequest req)
        {
            var user = await _db.Users.FindAsync(req.Id);
            if (user == null) return NotFound(new { status = "error", message = "User tidak ditemukan" });

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            return Ok(new { status = "success", message = "Akun berhasil dihapus permanen" });
        }

        // 4. RESET PASSWORD CREW (Oleh SPV)
        [HttpPost("reset")]
        public async Task<IActionResult> ResetPassword([FromBody] UserIdRequest req)
        {
            var user = await _db.Users.FindAsync(req.Id);
            if (user == null) return NotFound(new { status = "error", message = "User tidak ditemukan" });

            // Sesuai alur Anda, password di-reset menjadi default
            user.Password = "top12345";
            await _db.SaveChangesAsync();

            return Ok(new { status = "success", message = "top12345" });
        }
    }

    public class UserIdRequest 
    { 
        public int Id { get; set; } 
    }
}