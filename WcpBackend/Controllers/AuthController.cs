using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WcpBackend.Data;
using WcpBackend.Models;

namespace WcpBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AuthController(AppDbContext db)
        {
            _db = db;
        }

        // 1. ENDPOINT LOGIN
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.Password == req.Password);
            
            if (user == null) 
                return Unauthorized(new { status = "error", message = "Username atau Password salah!" });
                
            if (user.Status == "pending") 
                return StatusCode(403, new { status = "error", message = "Akun Anda masih berstatus PENDING. Hubungi SPV HSE." });

            return Ok(new { status = "success", data = user });
        }

        // 2. ENDPOINT REGISTER
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] User newUser)
        {
            // Cek apakah username sudah dipakai
            var isExist = await _db.Users.AnyAsync(u => u.Username == newUser.Username);
            if (isExist)
                return BadRequest(new { status = "error", message = "Username tersebut sudah terdaftar!" });

            // Paksa akun baru menjadi crew dan pending
            newUser.Role = "crew";
            newUser.Status = "pending";

            _db.Users.Add(newUser);
            await _db.SaveChangesAsync();

            return Ok(new { status = "success", message = "Registrasi berhasil! Silakan tunggu persetujuan dari SPV." });
        }

        // 3. ENDPOINT FORGOT PASSWORD (Ambil Pertanyaan Keamanan)
        [HttpPost("forgot-password/question")]
        public async Task<IActionResult> GetSecurityQuestion([FromBody] ForgotRequest req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
            if (user == null)
                return NotFound(new { status = "error", message = "Username tidak ditemukan di sistem." });

            return Ok(new { status = "success", question = user.SecurityQuestion });
        }

        // 4. ENDPOINT FORGOT PASSWORD (Reset dengan Jawaban)
        [HttpPost("forgot-password/reset")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetRequest req)
        {
            // Cari user berdasarkan username dan jawaban keamanan yang cocok
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.SecurityAnswer == req.Answer);
            if (user == null)
                return BadRequest(new { status = "error", message = "Jawaban keamanan salah!" });

            // Update password baru
            user.Password = req.NewPassword;
            await _db.SaveChangesAsync();

            return Ok(new { status = "success", message = "Password berhasil diubah. Silakan login dengan sandi baru." });
        }
    }

    // --- DTOs (Data Transfer Objects) untuk menangkap JSON dari React ---
    public class LoginRequest { public string Username { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; }
    public class ForgotRequest { public string Username { get; set; } = string.Empty; }
    public class ResetRequest { public string Username { get; set; } = string.Empty; public string Answer { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}